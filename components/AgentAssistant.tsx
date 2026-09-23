'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { getSelectedChildId, saveSelectedChild } from '../lib/child-session';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
    id: string;
    role: ChatRole;
    text: string;
};

type ChildProfile = {
    id: string;
    name: string;
};

const initialMessages: ChatMessage[] = [
    {
        id: 'welcome',
        role: 'assistant',
        text: 'Xin chào! Mình là Lupinh trợ lý học tập của bé. Mình có thể giải thích từ mới, đưa ví dụ, hoặc gợi ý cách học dễ nhớ cho bé.',
    },
];

export default function AgentAssistant() {
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [childId, setChildId] = useState<string | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const dragState = useRef<{ pointerId: number; startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
    const dragMovedRef = useRef(false);

    const clampPosition = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        dragState.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startPosX: position.x,
            startPosY: position.y,
        };
        dragMovedRef.current = false;

        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!dragState.current || dragState.current.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - dragState.current.startX;
        const deltaY = event.clientY - dragState.current.startY;

        if (Math.abs(deltaX) + Math.abs(deltaY) > 6) {
            dragMovedRef.current = true;
        }

        const maxX = 220;
        const minX = -Math.max(window.innerWidth - 120, 120);
        const maxY = 260;
        const minY = -Math.max(window.innerHeight - 170, 140);

        setPosition({
            x: clampPosition(dragState.current.startPosX + deltaX, minX, maxX),
            y: clampPosition(dragState.current.startPosY + deltaY, minY, maxY),
        });
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (dragState.current?.pointerId === event.pointerId) {
            dragState.current = null;
        }
    };

    const handleToggleOpen = () => {
        if (dragMovedRef.current) {
            dragMovedRef.current = false;
            return;
        }

        setOpen((current) => !current);
    };

    useEffect(() => {
        fetch('/api/children')
            .then((response) => response.ok ? response.json() : [])
            .then((children: ChildProfile[]) => {
                if (!Array.isArray(children) || children.length === 0) return;
                const selectedId = getSelectedChildId();
                const selectedChild = children.find((child) => child.id === selectedId) || children[0];
                saveSelectedChild(selectedChild);
                setChildId(selectedChild.id);
            })
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        if (!childId) return;

        let cancelled = false;

        fetch(`/api/agent?childId=${encodeURIComponent(childId)}`)
            .then((response) => response.ok ? response.json() : null)
            .then((payload) => {
                if (cancelled || !payload?.ok || !Array.isArray(payload.conversations)) return;

                const latestConversation = payload.conversations[0];
                const loadedMessages = latestConversation?.messages
                    ?.filter((message: { role?: string; content?: string }) => (
                        (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string'
                    ))
                    .map((message: { id?: string; role: ChatRole; content: string }) => ({
                        id: message.id || `history-${Date.now()}-${Math.random()}`,
                        role: message.role,
                        text: message.content,
                    })) || [];

                if (loadedMessages.length > 0) {
                    setMessages(loadedMessages);
                    setConversationId(latestConversation.id || null);
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [childId]);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const trimmed = question.trim();
        if (!trimmed || loading) return;

        const history = messages
            .slice(-8)
            .filter((message) => message.text.trim().length > 0)
            .map((message) => ({
                role: message.role,
                content: message.text,
            }));

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
                    history,
                    childId,
                    provider: 'gemini',
                    temperature: 0.4,
                    maxTokens: 220,
                }),
            });

            const payload = await response.json().catch(() => null);
            const reply = payload?.ok && payload?.text ? payload.text : payload?.message || 'Mình chưa thể trả lời lúc này, hãy thử lại sau.';

            if (payload?.conversationId) {
                setConversationId(payload.conversationId);
            }

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
        <>
            <div
                className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
                style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            >
                {open && (
                    <div className="w-[min(92vw,22rem)] overflow-hidden rounded-[1.5rem] border border-[#dfe9e1] bg-white shadow-[0_20px_50px_rgba(31,62,55,0.18)]">
                        <div className="flex items-center justify-between bg-[#2d6358] px-4 py-3 text-white">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d9f0de]">Assistant</p>
                                <h3 className="text-base font-extrabold">ECO-KIDS Assistant</h3>
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
                                    Lupinh đang suy nghĩ...
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
                    onClick={handleToggleOpen}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    aria-label="Mở trợ lý AI"
                    style={{ touchAction: 'none' }}
                    className="grid h-16 w-16 place-items-center rounded-full bg-[#f47d52] text-3xl shadow-[0_16px_32px_rgba(244,125,82,0.35)] transition hover:-translate-y-0.5 cursor-grab active:cursor-grabbing"
                >
                    <img
                        src="/img/agent/agent-icon.png"
                        alt="Trợ lý AI"
                        className="pointer-events-none h-14 w-14 object-contain drop-shadow-[0_25px_35px_rgba(32,59,53,0.15)]"
                    />
                </button>
            </div>
        </>
    );
}
