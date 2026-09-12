'use client';

import { FormEvent, useState } from 'react';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
    id: string;
    role: ChatRole;
    text: string;
};

const initialMessages: ChatMessage[] = [
    {
        id: 'welcome',
        role: 'assistant',
        text: 'Xin chào! Mình là trợ lý học tập ECO-KIDS. Mình có thể giải thích từ mới, đưa ví dụ, hoặc gợi ý cách học dễ nhớ cho bé.',
    },
];

export default function AgentAssistant() {
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const trimmed = question.trim();
        if (!trimmed || loading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: trimmed,
        };

        setMessages((current) => [...current, userMessage]);
        setQuestion('');
        setLoading(true);

        try {
            const response = await fetch('/api/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: trimmed,
                    provider: 'gemini',
                    temperature: 0.4,
                    maxTokens: 220,
                }),
            });

            const payload = await response.json().catch(() => null);
            const reply = payload?.ok && payload?.text ? payload.text : payload?.message || 'Mình chưa thể trả lời lúc này, hãy thử lại sau.';

            setMessages((current) => [
                ...current,
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    text: reply,
                },
            ]);
        } catch (error) {
            setMessages((current) => [
                ...current,
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    text: error instanceof Error ? error.message : 'Không thể kết nối trợ lý AI.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
            {open && (
                <div className="w-[min(92vw,22rem)] overflow-hidden rounded-[1.5rem] border border-[#dfe9e1] bg-white shadow-[0_20px_50px_rgba(31,62,55,0.18)]">
                    <div className="flex items-center justify-between bg-[#2d6358] px-4 py-3 text-white">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d9f0de]">Assistant</p>
                            <h3 className="text-base font-extrabold">ECO-KIDS AI</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Đóng trợ lý"
                            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-lg font-bold transition hover:bg-white/20"
                        >
                            ×
                        </button>
                    </div>

                    <div className="flex max-h-[22rem] min-h-[16rem] flex-col gap-3 overflow-y-auto bg-[#f6faf7] p-3">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'user'
                                    ? 'ml-auto bg-[#f47d52] text-white'
                                    : 'bg-white text-[#2c433c] shadow-sm'
                                    }`}
                            >
                                {message.text}
                            </div>
                        ))}
                        {loading && (
                            <div className="max-w-[85%] rounded-2xl bg-white px-3 py-2 text-sm text-[#537267] shadow-sm">
                                Đang suy nghĩ...
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="border-t border-[#dfe9e1] bg-white p-3">
                        <div className="flex items-center gap-2">
                            <input
                                value={question}
                                onChange={(event) => setQuestion(event.target.value)}
                                placeholder="Hỏi mình về từ vựng..."
                                className="w-full rounded-full border border-[#dfe9e1] bg-[#f8fbf9] px-3 py-2.5 text-sm text-[#234036] outline-none transition focus:border-[#6eaa83]"
                            />
                            <button
                                type="submit"
                                disabled={loading || !question.trim()}
                                className="rounded-full bg-[#f47d52] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Gửi
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-label="Mở trợ lý AI"
                className="grid h-16 w-16 place-items-center rounded-full bg-[#f47d52] text-3xl shadow-[0_16px_32px_rgba(244,125,82,0.35)] transition hover:-translate-y-0.5"
            >
                🤖
            </button>
        </div>
    );
}
