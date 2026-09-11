export type AgentProvider = 'openai' | 'gemini';
export type AgentRole = 'system' | 'user' | 'assistant';

export type AgentMessage = {
    role: AgentRole;
    content: string;
};

export type CallAgentOptions = {
    provider?: AgentProvider;
    model?: string;
    messages?: AgentMessage[];
    prompt?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    apiKey?: string;
};

export type AgentResponse = {
    text: string;
    provider: AgentProvider;
    model: string;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export class AgentError extends Error {
    readonly provider?: AgentProvider;
    readonly status?: number;

    constructor(message: string, options: { provider?: AgentProvider; status?: number } = {}) {
        super(message);
        this.name = 'AgentError';
        this.provider = options.provider;
        this.status = options.status;
    }
}

function resolveProvider(provider?: AgentProvider): AgentProvider {
    if (provider) return provider;

    const configuredProvider = process.env.AI_PROVIDER?.toLowerCase();
    if (configuredProvider === 'openai' || configuredProvider === 'gemini') return configuredProvider;
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.GEMINI_API_KEY) return 'gemini';

    throw new AgentError('Chưa cấu hình AI_PROVIDER và API key cho OpenAI hoặc Gemini.');
}

function resolveMessages(options: CallAgentOptions): AgentMessage[] {
    const messages = options.messages || (options.prompt ? [{ role: 'user' as const, content: options.prompt }] : []);
    if (!messages.length || messages.some(message => !message.content?.trim())) {
        throw new AgentError('Cần truyền prompt hoặc messages có nội dung.');
    }
    return messages;
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });

    return {
        signal: controller.signal,
        cleanup: () => {
            clearTimeout(timeout);
            signal?.removeEventListener('abort', abort);
        },
    };
}

async function readError(response: Response) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string }; message?: string } | null;
    return payload?.error?.message || payload?.message || `AI provider trả về HTTP ${response.status}.`;
}

function extractOpenAIText(payload: any) {
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(part => part?.text || '').join('');
    return '';
}

function extractGeminiText(payload: any) {
    return (payload?.candidates?.[0]?.content?.parts || [])
        .map((part: { text?: string }) => part.text || '')
        .join('');
}

async function callOpenAI(options: CallAgentOptions, messages: AgentMessage[], signal: AbortSignal): Promise<AgentResponse> {
    const provider: AgentProvider = 'openai';
    const model = options.model || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AgentError('Thiếu OPENAI_API_KEY.', { provider });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature,
            max_tokens: options.maxTokens,
        }),
    });
    if (!response.ok) throw new AgentError(await readError(response), { provider, status: response.status });

    const text = extractOpenAIText(await response.json());
    if (!text) throw new AgentError('OpenAI không trả về nội dung.', { provider });
    return { text, provider, model };
}

async function callGemini(options: CallAgentOptions, messages: AgentMessage[], signal: AbortSignal): Promise<AgentResponse> {
    const provider: AgentProvider = 'gemini';
    const model = options.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AgentError('Thiếu GEMINI_API_KEY.', { provider });

    const systemInstruction = messages.find(message => message.role === 'system')?.content;
    const contents = messages
        .filter(message => message.role !== 'system')
        .map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
            contents,
            generationConfig: {
                temperature: options.temperature,
                maxOutputTokens: options.maxTokens,
            },
        }),
    });
    if (!response.ok) throw new AgentError(await readError(response), { provider, status: response.status });

    const text = extractGeminiText(await response.json());
    if (!text) throw new AgentError('Gemini không trả về nội dung.', { provider });
    return { text, provider, model };
}

export async function callAgent(options: CallAgentOptions): Promise<AgentResponse>;
export async function callAgent(prompt: string, options?: Omit<CallAgentOptions, 'prompt' | 'messages'>): Promise<AgentResponse>;
export async function callAgent(input: string | CallAgentOptions, inputOptions: Omit<CallAgentOptions, 'prompt' | 'messages'> = {}): Promise<AgentResponse> {
    const options: CallAgentOptions = typeof input === 'string' ? { ...inputOptions, prompt: input } : input;
    const provider = resolveProvider(options.provider);
    const messages = resolveMessages(options);
    const configuredTimeout = Number(process.env.AI_TIMEOUT_MS);
    const timeoutMs = options.timeoutMs || (Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : DEFAULT_TIMEOUT_MS);
    const request = withTimeout(options.signal, timeoutMs);

    try {
        return provider === 'openai'
            ? await callOpenAI(options, messages, request.signal)
            : await callGemini(options, messages, request.signal);
    } catch (error) {
        if (error instanceof AgentError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new AgentError(`Yêu cầu ${provider} đã hết thời gian chờ.`, { provider });
        }
        throw new AgentError(error instanceof Error ? error.message : `Không thể gọi ${provider}.`, { provider });
    } finally {
        request.cleanup();
    }
}