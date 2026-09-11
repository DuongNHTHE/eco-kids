import { callAgent, type AgentMessage, type AgentProvider } from '../../../lib/agent';

function normalizeProvider(provider?: string): AgentProvider | undefined {
    const value = provider?.trim().toLowerCase();
    if (!value) return undefined;
    if (value === 'openai' || value === 'gemini') return value;
    return undefined;
}

function normalizeMessages(payload: any): AgentMessage[] | undefined {
    if (!payload) return undefined;

    const rawMessages = Array.isArray(payload) ? payload : payload.messages;
    if (!Array.isArray(rawMessages)) return undefined;

    const messages = rawMessages
        .map((entry: any) => ({
            role: entry?.role === 'system' || entry?.role === 'assistant' || entry?.role === 'user' ? entry.role : 'user',
            content: String(entry?.content ?? '').trim(),
        }))
        .filter((entry) => entry.content.length > 0);

    return messages.length ? messages : undefined;
}

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const provider = normalizeProvider(body?.provider ?? process.env.AI_PROVIDER ?? undefined);
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
        const messages = normalizeMessages(body) ?? (prompt ? [{ role: 'user' as const, content: prompt }] : undefined);

        if (!messages || messages.length === 0) {
            return Response.json({ ok: false, message: 'Thiếu prompt hoặc messages.' }, { status: 400 });
        }

        const result = await callAgent({
            provider,
            model: body?.model,
            messages,
            temperature: typeof body?.temperature === 'number' ? body.temperature : undefined, // use 0.4
            maxTokens: typeof body?.maxTokens === 'number' ? body.maxTokens : undefined,
            timeoutMs: typeof body?.timeoutMs === 'number' ? body.timeoutMs : undefined,
            apiKey: body?.apiKey,
        });

        return Response.json({
            ok: true,
            provider: result.provider,
            model: result.model,
            text: result.text,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể gọi AI agent.';
        return Response.json({ ok: false, message }, { status: 500 });
    }
}
