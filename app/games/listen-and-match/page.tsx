'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAPI } from '../../../lib/hooks/useAPI';
import { resolveRoleHome } from '../../../lib/auth';
import { LISTEN_AND_MATCH_ID } from '../../../src/game-config';

type GameItem = {
    id: string;
    name: string;
    translation: string;
    emoji: string;
    imageUrl: string;
};

type GameCard = {
    cardId: string;
    item: GameItem;
};

type GameTheme = {
    id: string;
    title: string;
    items: GameItem[];
};

type GameConfig = {
    gameId: string;
    title: string;
    description: string;
    icon: string;
    isActive: boolean;
    themes: GameTheme[];
};

function shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const otherIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[otherIndex]] = [result[otherIndex], result[index]];
    }
    return result;
}

function Picture({ item }: { item: GameItem }) {
    const [imageFailed, setImageFailed] = useState(false);
    if (item.imageUrl && !imageFailed) {
        return (
            <img
                src={item.imageUrl}
                alt=""
                onError={() => setImageFailed(true)}
                className="h-full w-full object-contain"
            />
        );
    }
    return <span aria-hidden className="select-none text-6xl sm:text-7xl">{item.emoji || '✨'}</span>;
}

export default function ListenAndMatchPage() {
    const { API } = useAPI();
    const router = useRouter();
    const { data: session, status } = useSession();
    const role = (session?.user as { role?: string } | undefined)?.role;
    const [config, setConfig] = useState<GameConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [mode, setMode] = useState<'themes' | 'playing' | 'complete'>('themes');
    const [selectedTheme, setSelectedTheme] = useState<GameTheme | null>(null);
    const [remaining, setRemaining] = useState<GameItem[]>([]);
    const [cards, setCards] = useState<GameCard[]>([]);
    const [matchedItemIds, setMatchedItemIds] = useState<Set<string>>(new Set());
    const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
    const [target, setTarget] = useState<GameItem | null>(null);
    const [feedback, setFeedback] = useState('');
    const [roundCount, setRoundCount] = useState(0);
    const soundContext = useRef<AudioContext | null>(null);

    const THEME_EMOJIS = ['🐾', '🧸', '🍎', '🚗', '🌈', '🦋'];
    const THEME_COLORS = [
        'from-[#ffe3a3] to-[#ffc46b]',
        'from-[#c9f0d4] to-[#8fdba6]',
        'from-[#ffd3e0] to-[#ffa6c1]',
        'from-[#cfe6ff] to-[#9fcbff]',
    ];

    useEffect(() => {
        if (status === 'unauthenticated') router.replace('/login');
        if (status === 'authenticated' && role !== 'PARENT') router.replace(resolveRoleHome(role || ''));
    }, [role, router, status]);

    useEffect(() => {
        if (status !== 'authenticated' || role !== 'PARENT') return;
        let current = true;
        API.get('games', false, false, false).then(result => {
            if (!current) return;
            const game = result?.game as GameConfig | undefined;
            if (game?.gameId === LISTEN_AND_MATCH_ID && game.isActive) setConfig(game);
            else setLoadError(result?.message || 'Trò chơi hiện chưa được mở.');
        }).finally(() => {
            if (current) setLoading(false);
        });
        return () => { current = false; };
    }, [API, role, status]);

    const speak = useCallback((word: string) => {
        if (!('speechSynthesis' in window)) {
            setFeedback('Trình duyệt chưa hỗ trợ đọc từ. Hãy thử mở trò chơi bằng Chrome hoặc Edge.');
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.78;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }, []);

    const playFeedbackSound = useCallback((result: 'correct' | 'incorrect' | 'complete') => {
        if (typeof window.AudioContext === 'undefined') return;

        const context = soundContext.current ?? new window.AudioContext();
        soundContext.current = context;
        if (context.state === 'suspended') void context.resume();

        const notes = result === 'incorrect'
            ? [{ frequency: 392, delay: 0 }, { frequency: 330, delay: 0.13 }]
            : result === 'complete'
                ? [
                    { frequency: 523, delay: 0 },
                    { frequency: 659, delay: 0.11 },
                    { frequency: 784, delay: 0.22 },
                    { frequency: 1047, delay: 0.36 },
                ]
                : [
                    { frequency: 587, delay: 0 },
                    { frequency: 740, delay: 0.11 },
                    { frequency: 880, delay: 0.22 },
                ];
        const startAt = context.currentTime;

        notes.forEach(({ frequency, delay }) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const noteStart = startAt + delay;
            const noteEnd = noteStart + 0.16;

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, noteStart);
            gain.gain.setValueAtTime(0.0001, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.07, noteStart + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(noteStart);
            oscillator.stop(noteEnd);
        });
    }, []);

    useEffect(() => () => {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (soundContext.current && soundContext.current.state !== 'closed') {
            void soundContext.current.close();
        }
    }, []);

    useEffect(() => {
        if (mode !== 'playing' || !target) return;
        const timer = window.setTimeout(() => speak(target.name), 350);
        return () => window.clearTimeout(timer);
    }, [mode, speak, target]);

    function startTheme(theme: GameTheme) {
        const playableItems = theme.items.filter(item => item.name.trim());
        if (playableItems.length < 2) {
            setFeedback('Chủ đề này chưa có đủ hình ảnh để chơi.');
            return;
        }
        setSelectedTheme(theme);
        setRemaining(playableItems);
        setCards(shuffle(playableItems.flatMap(item => [
            { cardId: `${item.id}-1`, item },
            { cardId: `${item.id}-2`, item },
        ])));
        setMatchedItemIds(new Set());
        setSelectedCard(null);
        setTarget(shuffle(playableItems)[0]);
        setRoundCount(0);
        setFeedback('');
        setMode('playing');
    }

    function chooseCard(card: GameCard) {
        if (!target || mode !== 'playing') return;
        if (matchedItemIds.has(card.item.id)) return;
        if (!selectedCard) {
            setSelectedCard(card);
            setFeedback('Đã chọn thẻ đầu tiên. Hãy chọn thẻ giống hệt để ghép cặp nhé!');
            return;
        }
        if (card.cardId === selectedCard.cardId) return;

        const firstItem = selectedCard.item;
        setSelectedCard(null);
        if (firstItem.id !== card.item.id) {
            playFeedbackSound('incorrect');
            setFeedback('Hai thẻ chưa giống nhau. Hãy chọn hai thẻ có cùng hình nhé!');
            return;
        }
        if (card.item.id !== target.id) {
            playFeedbackSound('incorrect');
            setFeedback(`Hai thẻ ${card.item.name} giống nhau rồi, nhưng chưa phải từ cần tìm. Hãy nghe lại nhé!`);
            return;
        }

        playFeedbackSound(remaining.length === 1 ? 'complete' : 'correct');
        const nextRemaining = remaining.filter(current => current.id !== card.item.id);
        setRemaining(nextRemaining);
        setMatchedItemIds(current => new Set(current).add(card.item.id));
        setRoundCount(current => current + 1);
        if (nextRemaining.length === 0) {
            setTarget(null);
            setFeedback('Tuyệt vời! Bé đã tìm được tất cả hình ảnh! 🎉');
            setMode('complete');
            return;
        }

        const nextTarget = shuffle(nextRemaining)[0];
        setTarget(nextTarget);
        setFeedback(`Chính xác! Đã ghép đôi ${target.name} (${target.translation || 'giỏi lắm'}). 🌟`);
    }

    if (status !== 'authenticated' || role !== 'PARENT') {
        return <div className="grid min-h-screen place-items-center text-xl">Đang tải trò chơi...</div>;
    }

    return (
        <main
            className="min-h-screen select-none bg-gradient-to-b from-[#e3f6ff] via-[#f1fbea] to-[#fff6d9] px-4 py-5 text-[#2b4a43] sm:px-8 sm:py-8"
            style={{ fontFamily: '"Baloo 2", "Nunito", ui-rounded, "Comic Sans MS", system-ui, sans-serif' }}
        >
            <style>{`
            @keyframes lm-wiggle { 0%,100% { transform: rotate(-3deg) scale(1.06); } 50% { transform: rotate(3deg) scale(1.1); } }
            @keyframes lm-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
            @keyframes lm-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            @keyframes lm-ring { 0% { box-shadow: 0 0 0 0 rgba(255,154,60,0.55); } 100% { box-shadow: 0 0 0 22px rgba(255,154,60,0); } }
            @keyframes lm-fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotate(360deg); opacity: 0.9; } }
            @keyframes lm-star { 0% { transform: scale(0.3) rotate(-30deg); } 70% { transform: scale(1.35) rotate(10deg); } 100% { transform: scale(1) rotate(0); } }
            .lm-wiggle { animation: lm-wiggle 0.7s ease-in-out infinite; }
            .lm-pop { animation: lm-pop 0.4s ease-out both; }
            .lm-float { animation: lm-float 2.6s ease-in-out infinite; }
            .lm-ring { animation: lm-ring 1.6s ease-out infinite; }
            .lm-fall { animation: lm-fall 4.5s linear infinite; }
            .lm-star { animation: lm-star 0.5s ease-out both; }
            @media (prefers-reduced-motion: reduce) {
                .lm-wiggle, .lm-pop, .lm-float, .lm-ring, .lm-fall, .lm-star { animation: none !important; }
            }
        `}</style>

            <div className="mx-auto max-w-5xl">
                {/* Nút về nhà: to, có biểu tượng, bé chưa đọc cũng hiểu */}
                <Link
                    href="/games"
                    aria-label="Về danh sách trò chơi"
                    className="inline-flex min-h-14 touch-manipulation items-center gap-2 rounded-full bg-white px-5 text-lg font-extrabold text-[#2d6358] shadow-md transition active:scale-95 hover:bg-[#fff6d9] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff9a3c]"
                >
                    <span className="text-3xl" aria-hidden>🏠</span>
                    <span className="hidden sm:inline">Trò chơi</span>
                </Link>

                <header className="mt-5 flex items-center gap-4 rounded-[2.5rem] border-4 border-white bg-gradient-to-br from-[#ffe9a8] via-[#ffd9b0] to-[#ffc9d8] p-5 shadow-md sm:gap-6 sm:p-7">
                    <span className="lm-float text-6xl sm:text-7xl" aria-hidden>{config?.icon || '🎧'}</span>
                    <div>
                        <h1 className="text-3xl font-black leading-tight sm:text-5xl">{config?.title || 'Listen and Match'}</h1>
                        <p className="mt-1 text-base font-bold text-[#7a5a2e] sm:text-xl">Nghe 👂 và ghép hình giống nhau 🖼️🖼️</p>
                    </div>
                </header>

                {loading ? (
                    <section className="mt-10 flex flex-col items-center gap-4 rounded-[2.5rem] bg-white p-10 text-center shadow-md" role="status" aria-live="polite">
                        <span className="lm-float text-7xl" aria-hidden>🐥</span>
                        <p className="text-2xl font-extrabold text-[#587367]">Chờ bé một chút nhé...</p>
                    </section>
                ) : !config ? (
                    <section className="mt-10 rounded-[2.5rem] bg-white p-8 text-center shadow-md sm:p-12">
                        <span className="text-7xl" aria-hidden>🙈</span>
                        <p className="mt-4 text-2xl font-extrabold">{loadError || 'Trò chơi hiện chưa được mở.'}</p>
                        <Link
                            href="/games"
                            className="mt-7 inline-flex min-h-16 touch-manipulation items-center gap-3 rounded-full bg-[#2d6358] px-8 text-xl font-black text-white shadow-lg transition active:scale-95 hover:bg-[#234e46]"
                        >
                            <span className="text-3xl" aria-hidden>🏠</span> Quay lại
                        </Link>
                    </section>
                ) : mode === 'themes' ? (
                    <section className="mt-8">
                        <h2 className="text-center text-3xl font-black sm:text-4xl">
                            <span aria-hidden>👉 </span>Bé chọn nhé!
                        </h2>
                        <div className="mt-6 grid gap-5 sm:grid-cols-2">
                            {config.themes.map((theme, index) => (
                                <button
                                    key={theme.id}
                                    type="button"
                                    onClick={() => startTheme(theme)}
                                    aria-label={`Chơi chủ đề ${theme.title}`}
                                    className={`group flex min-h-40 touch-manipulation items-center gap-5 rounded-[2.5rem] border-4 border-white bg-gradient-to-br ${THEME_COLORS[index % THEME_COLORS.length]} p-6 text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl active:scale-95 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff9a3c]`}
                                >
                                    <span className="lm-float text-7xl sm:text-8xl" aria-hidden>
                                        {THEME_EMOJIS[index % THEME_EMOJIS.length]}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <b className="block text-2xl font-black leading-tight sm:text-3xl">{theme.title}</b>
                                        <small className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-base font-extrabold text-[#587367]">
                                            <span aria-hidden>🖼️</span> {theme.items.length}
                                        </small>
                                    </span>
                                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-4xl shadow-md transition group-hover:scale-110" aria-hidden>▶️</span>
                                </button>
                            ))}
                        </div>
                    </section>
                ) : mode === 'complete' ? (
                    <section className="relative mt-8 overflow-hidden rounded-[2.5rem] border-4 border-white bg-gradient-to-b from-[#fff6c8] to-[#ffe0ef] p-8 text-center shadow-xl sm:p-12">
                        {/* Pháo giấy rơi */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                            {['🎉', '⭐', '🎈', '✨', '🌟', '🎊', '🎈', '⭐'].map((emoji, i) => (
                                <span
                                    key={i}
                                    className="lm-fall absolute text-3xl sm:text-4xl"
                                    style={{ left: `${6 + i * 12}%`, animationDelay: `${i * 0.55}s`, animationDuration: `${3.8 + (i % 3)}s` }}
                                >
                                    {emoji}
                                </span>
                            ))}
                        </div>
                        <div className="relative">
                            <span className="lm-float inline-block text-8xl sm:text-9xl" aria-hidden>🏆</span>
                            <h2 className="mt-4 text-4xl font-black sm:text-5xl">Giỏi quá! 🎉</h2>
                            <p className="mt-3 text-xl font-bold text-[#7a5a2e] sm:text-2xl">
                                Bé ghép đúng {roundCount} cặp
                                {selectedTheme?.title ? ` · ${selectedTheme.title}` : ''}
                            </p>
                            <div className="mt-5 flex flex-wrap justify-center gap-2" aria-hidden>
                                {Array.from({ length: roundCount || 0 }).map((_, i) => (
                                    <span key={i} className="lm-star text-4xl sm:text-5xl" style={{ animationDelay: `${i * 0.12}s` }}>⭐</span>
                                ))}
                            </div>
                            <div className="mt-8 flex flex-wrap justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => selectedTheme && startTheme(selectedTheme)}
                                    className="inline-flex min-h-20 touch-manipulation items-center gap-3 rounded-full bg-[#ff9a3c] px-9 text-2xl font-black text-white shadow-lg transition active:scale-95 hover:bg-[#f58a24] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2d6358]"
                                >
                                    <span className="text-4xl" aria-hidden>🔄</span> Chơi lại
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode('themes'); setFeedback(''); }}
                                    className="inline-flex min-h-20 touch-manipulation items-center gap-3 rounded-full bg-[#2d6358] px-9 text-2xl font-black text-white shadow-lg transition active:scale-95 hover:bg-[#234e46] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff9a3c]"
                                >
                                    <span className="text-4xl" aria-hidden>🎨</span> Chủ đề khác
                                </button>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="mt-6">
                        {/* Hàng trạng thái: tiến độ bằng ngôi sao thay cho chữ "Còn N cặp" */}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] bg-white/90 p-4 shadow-sm">
                            <div className="min-w-0">
                                <p className="text-base font-extrabold text-[#71867c] sm:text-lg">{selectedTheme?.title}</p>
                                <div
                                    className="mt-1 flex flex-wrap gap-1"
                                    role="img"
                                    aria-label={`Còn ${remaining.length} cặp hình`}
                                >
                                    {Array.from({ length: Math.max(roundCount || 0, remaining.length) }).map((_, i) => {
                                        const done = Math.max(roundCount || 0, remaining.length) - remaining.length;
                                        return (
                                            <span
                                                key={i}
                                                aria-hidden
                                                className={`text-3xl transition sm:text-4xl ${i < done ? 'lm-star' : 'opacity-30 grayscale'}`}
                                            >
                                                ⭐
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Nút nghe: to nhất màn hình, có vòng sóng thu hút */}
                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={() => target && speak(target.name)}
                                aria-label="Nghe lại tên tiếng Anh"
                                className="lm-ring inline-flex min-h-24 touch-manipulation items-center gap-4 rounded-full bg-[#ff9a3c] px-10 text-3xl font-black text-white shadow-xl transition active:scale-95 hover:bg-[#f58a24] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2d6358] sm:min-h-28 sm:px-14 sm:text-4xl"
                            >
                                <span className="text-5xl sm:text-6xl" aria-hidden>🔊</span> Nghe
                            </button>
                        </div>

                        {/* Hướng dẫn bằng hình, chữ rất ngắn */}
                        <p className="mt-5 flex flex-wrap items-center justify-center gap-2 text-center text-xl font-extrabold text-[#7a5a2e] sm:text-2xl">
                            <span aria-hidden>👂</span> Nghe
                            <span aria-hidden>➜</span> Chọn 2 hình giống nhau
                            <span aria-hidden>🖼️🖼️</span>
                        </p>

                        {/* Phản hồi: bong bóng lớn có linh vật, bật lại hiệu ứng mỗi lần đổi nội dung */}
                        <div className="mt-4 min-h-[5.5rem]">
                            {feedback && (
                                <p
                                    key={feedback}
                                    role="status"
                                    aria-live="polite"
                                    className="lm-pop mx-auto flex max-w-xl items-center justify-center gap-3 rounded-[2rem] border-4 border-[#bfe8c6] bg-white p-4 text-center text-2xl font-black text-[#2d6358] shadow-md sm:text-3xl"
                                >
                                    <span className="text-5xl" aria-hidden>🐥</span>
                                    <span>{feedback}</span>
                                </p>
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 md:grid-cols-4">
                            {cards.map((card, index) => matchedItemIds.has(card.item.id) ? (
                                // Giữ chỗ cho thẻ đã ghép để các thẻ còn lại không bị xô lệch
                                <div
                                    key={card.cardId}
                                    aria-hidden="true"
                                    className="grid aspect-square min-h-36 place-items-center rounded-[2rem] border-4 border-dashed border-[#cfe3d2] bg-white/40"
                                >
                                    <span className="text-5xl opacity-60">✨</span>
                                </div>
                            ) : (
                                <button
                                    key={card.cardId}
                                    type="button"
                                    onClick={() => chooseCard(card)}
                                    aria-label={`Chọn thẻ ${card.item.name}, thẻ ${index + 1}`}
                                    aria-pressed={selectedCard?.cardId === card.cardId}
                                    className={`group relative grid aspect-square min-h-36 touch-manipulation place-items-center overflow-hidden rounded-[2rem] border-[6px] p-3 shadow-lg transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2d6358] active:scale-90 ${selectedCard?.cardId === card.cardId
                                        ? 'lm-wiggle z-10 border-[#ff9a3c] bg-[#fff4dc] ring-8 ring-[#ffd9a3]'
                                        : 'border-white bg-white hover:border-[#ffd9a3]'}`}
                                >
                                    <Picture item={card.item} />
                                    {selectedCard?.cardId === card.cardId && (
                                        <span className="lm-pop absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-[#ff9a3c] text-2xl text-white shadow-md" aria-hidden>✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
