'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAPI } from '../../../lib/hooks/useAPI';
import { resolveRoleHome } from '../../../lib/auth';
import { MEMORY_MATCH_ID } from '../../../src/game-config';

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
    return <span aria-hidden className="select-none text-5xl sm:text-6xl">{item.emoji || '✨'}</span>;
}

export default function MemoryMatchPage() {
    const { API } = useAPI();
    const router = useRouter();
    const { data: session, status } = useSession();
    const role = (session?.user as { role?: string } | undefined)?.role;
    const [config, setConfig] = useState<GameConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [mode, setMode] = useState<'themes' | 'playing' | 'complete'>('themes');
    const [selectedTheme, setSelectedTheme] = useState<GameTheme | null>(null);
    const [cards, setCards] = useState<GameCard[]>([]);
    const [matchedItemIds, setMatchedItemIds] = useState<Set<string>>(new Set());
    const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
    const [feedback, setFeedback] = useState('');
    const [roundCount, setRoundCount] = useState(0);
    const locked = useRef(false);
    const mismatchTimer = useRef<number | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.replace('/login');
        if (status === 'authenticated' && role !== 'PARENT') router.replace(resolveRoleHome(role || ''));
    }, [role, router, status]);

    useEffect(() => {
        if (status !== 'authenticated' || role !== 'PARENT') return;
        let current = true;
        API.get(`games?gameId=${MEMORY_MATCH_ID}`, false, false, false).then(result => {
            if (!current) return;
            const game = result?.game as GameConfig | undefined;
            if (game?.gameId === MEMORY_MATCH_ID && game.isActive) setConfig(game);
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

    useEffect(() => () => {
        if (mismatchTimer.current !== null) window.clearTimeout(mismatchTimer.current);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }, []);

    function startTheme(theme: GameTheme) {
        const playableItems = shuffle(theme.items.filter(item => item.name.trim())).slice(0, 3);
        if (playableItems.length < 3) {
            setFeedback('Chủ đề này cần ít nhất 3 từ để bắt đầu.');
            return;
        }
        if (mismatchTimer.current !== null) window.clearTimeout(mismatchTimer.current);
        locked.current = false;
        setSelectedTheme(theme);
        setCards(shuffle(playableItems.flatMap(item => [
            { cardId: `${item.id}-1`, item },
            { cardId: `${item.id}-2`, item },
        ])));
        setMatchedItemIds(new Set());
        setSelectedCardIds([]);
        setRoundCount(0);
        setFeedback('Lật hai thẻ mỗi lượt để tìm cặp hình giống nhau nhé!');
        setMode('playing');
    }

    function chooseCard(card: GameCard) {
        if (mode !== 'playing' || locked.current || matchedItemIds.has(card.item.id)) return;
        if (selectedCardIds.includes(card.cardId)) return;

        if (selectedCardIds.length === 0) {
            setSelectedCardIds([card.cardId]);
            setFeedback('Đã lật thẻ đầu tiên. Bé hãy chọn thêm một thẻ nhé!');
            return;
        }

        const firstCard = cards.find(current => current.cardId === selectedCardIds[0]);
        if (!firstCard) return;

        locked.current = true;
        setSelectedCardIds([selectedCardIds[0], card.cardId]);
        if (firstCard.item.id === card.item.id) {
            const nextMatched = new Set(matchedItemIds).add(card.item.id);
            setMatchedItemIds(nextMatched);
            setRoundCount(nextMatched.size);
            speak(card.item.name);
            setFeedback(`Tìm được cặp ${card.item.name}${card.item.translation ? ` · ${card.item.translation}` : ''}! 🌟`);
            setSelectedCardIds([]);
            if (nextMatched.size === 3) {
                setMode('complete');
                setFeedback('Tuyệt vời! Bé đã tìm được cả 3 cặp! 🎉');
            }
            locked.current = false;
            return;
        }

        setFeedback('Hai thẻ chưa giống nhau. Thử nhớ vị trí rồi tìm lại nhé!');
        mismatchTimer.current = window.setTimeout(() => {
            setSelectedCardIds([]);
            locked.current = false;
            mismatchTimer.current = null;
        }, 850);
    }

    if (status !== 'authenticated' || role !== 'PARENT') {
        return <div className="grid min-h-screen place-items-center text-xl">Đang tải trò chơi...</div>;
    }

    return (
        <main
            className="min-h-screen select-none bg-gradient-to-b from-[#efeaff] via-[#f2fbea] to-[#fff6d9] px-4 py-5 text-[#2b4a43] sm:px-8 sm:py-8"
            style={{ fontFamily: '"Baloo 2", "Nunito", ui-rounded, "Comic Sans MS", system-ui, sans-serif' }}
        >
            <div className="mx-auto max-w-4xl">
                <Link
                    href="/games"
                    aria-label="Về danh sách trò chơi"
                    className="inline-flex min-h-14 touch-manipulation items-center gap-2 rounded-full bg-white px-5 text-lg font-extrabold text-[#2d6358] shadow-md transition active:scale-95 hover:bg-[#fff6d9] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#9278df]"
                >
                    <span className="text-3xl" aria-hidden>🏠</span>
                    <span className="hidden sm:inline">Trò chơi</span>
                </Link>

                <header className="mt-5 flex items-center gap-4 rounded-[2.5rem] border-4 border-white bg-gradient-to-br from-[#e7ddff] via-[#ffd9b0] to-[#ffc9d8] p-5 shadow-md sm:gap-6 sm:p-7">
                    <span className="text-6xl sm:text-7xl" aria-hidden>{config?.icon || '🧠'}</span>
                    <div>
                        <h1 className="text-3xl font-black leading-tight sm:text-5xl">{config?.title || 'Memory Match'}</h1>
                        <p className="mt-1 text-base font-bold text-[#655584] sm:text-xl">Lật thẻ tìm cặp hình giống nhau 🃏🃏</p>
                    </div>
                </header>

                {loading ? (
                    <section className="mt-10 flex flex-col items-center gap-4 rounded-[2.5rem] bg-white p-10 text-center shadow-md" role="status">
                        <span className="text-7xl" aria-hidden>🐥</span>
                        <p className="text-2xl font-extrabold text-[#587367]">Chờ bé một chút nhé...</p>
                    </section>
                ) : !config ? (
                    <section className="mt-10 rounded-[2.5rem] bg-white p-8 text-center shadow-md sm:p-12">
                        <span className="text-7xl" aria-hidden>🙈</span>
                        <p className="mt-4 text-2xl font-extrabold">{loadError || 'Trò chơi hiện chưa được mở.'}</p>
                        <Link href="/games" className="mt-7 inline-flex min-h-16 items-center gap-3 rounded-full bg-[#2d6358] px-8 text-xl font-black text-white shadow-lg">
                            <span className="text-3xl" aria-hidden>🏠</span> Quay lại
                        </Link>
                    </section>
                ) : mode === 'themes' ? (
                    <section className="mt-8">
                        <h2 className="text-center text-3xl font-black sm:text-4xl">Bé chọn chủ đề nhé! 👇</h2>
                        <div className="mt-6 grid gap-5 sm:grid-cols-2">
                            {config.themes.map((theme, index) => (
                                <button
                                    key={theme.id}
                                    type="button"
                                    onClick={() => startTheme(theme)}
                                    aria-label={`Chơi chủ đề ${theme.title}`}
                                    className={`flex min-h-40 touch-manipulation items-center gap-5 rounded-[2.5rem] border-4 border-white bg-gradient-to-br ${index % 2 === 0 ? 'from-[#ffe3a3] to-[#ffc46b]' : 'from-[#c9f0d4] to-[#8fdba6]'} p-6 text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl active:scale-95 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#9278df]`}
                                >
                                    <span className="text-7xl sm:text-8xl" aria-hidden>{index % 2 === 0 ? '🐾' : '🧸'}</span>
                                    <span className="min-w-0 flex-1">
                                        <b className="block text-2xl font-black leading-tight sm:text-3xl">{theme.title}</b>
                                        <small className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-base font-extrabold text-[#587367]">
                                            🃏 {Math.min(theme.items.length, 20)} từ
                                        </small>
                                    </span>
                                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-3xl shadow-md" aria-hidden>▶️</span>
                                </button>
                            ))}
                        </div>
                        {config.themes.length === 0 && (
                            <p className="mt-6 rounded-3xl bg-white p-6 text-center font-bold text-[#71867c]">
                                Chưa có chủ đề nào. Hãy nhờ phụ huynh hoặc giáo viên thêm bộ từ nhé!
                            </p>
                        )}
                    </section>
                ) : mode === 'complete' ? (
                    <section className="mt-8 rounded-[2.5rem] border-4 border-white bg-gradient-to-b from-[#fff6c8] to-[#ffe0ef] p-8 text-center shadow-xl sm:p-12">
                        <span className="inline-block text-8xl sm:text-9xl" aria-hidden>🏆</span>
                        <h2 className="mt-4 text-4xl font-black sm:text-5xl">Giỏi quá! 🎉</h2>
                        <p className="mt-3 text-xl font-bold text-[#7a5a2e] sm:text-2xl">
                            Bé đã ghép đúng {roundCount} cặp · {selectedTheme?.title}
                        </p>
                        <div className="mt-5 flex justify-center gap-2" aria-label="Đã tìm được 3 cặp">
                            {Array.from({ length: 3 }).map((_, index) => <span key={index} className="text-5xl" aria-hidden>⭐</span>)}
                        </div>
                        <div className="mt-8 flex flex-wrap justify-center gap-4">
                            <button
                                type="button"
                                onClick={() => selectedTheme && startTheme(selectedTheme)}
                                className="inline-flex min-h-16 items-center gap-3 rounded-full bg-[#9278df] px-8 text-xl font-black text-white shadow-lg transition active:scale-95"
                            >
                                🔄 Chơi lại
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMode('themes'); setFeedback(''); }}
                                className="inline-flex min-h-16 items-center gap-3 rounded-full bg-[#2d6358] px-8 text-xl font-black text-white shadow-lg transition active:scale-95"
                            >
                                🎨 Chủ đề khác
                            </button>
                        </div>
                    </section>
                ) : (
                    <section className="mt-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] bg-white/90 p-4 shadow-sm">
                            <div>
                                <p className="text-lg font-extrabold text-[#71867c]">{selectedTheme?.title}</p>
                                <p className="text-sm font-bold text-[#9278df]">Đã tìm được {roundCount} / 3 cặp</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMode('themes')}
                                className="rounded-full bg-[#f3efff] px-5 py-3 font-bold text-[#604caa] hover:bg-[#e7ddff]"
                            >
                                Chọn chủ đề khác
                            </button>
                        </div>

                        <p className="mt-5 text-center text-xl font-extrabold text-[#655584] sm:text-2xl">
                            Lật hai thẻ và tìm hình giống nhau nhé!
                        </p>
                        <div className="mt-4 min-h-16">
                            {feedback && (
                                <p role="status" aria-live="polite" className="mx-auto max-w-xl rounded-[2rem] border-4 border-[#d5c9ff] bg-white p-4 text-center text-lg font-black text-[#604caa] shadow-md sm:text-xl">
                                    {feedback}
                                </p>
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
                            {cards.map((card, index) => {
                                const isMatched = matchedItemIds.has(card.item.id);
                                const isRevealed = isMatched || selectedCardIds.includes(card.cardId);
                                return (
                                    <button
                                        key={card.cardId}
                                        type="button"
                                        onClick={() => chooseCard(card)}
                                        aria-label={isRevealed
                                            ? `Thẻ ${index + 1}: ${card.item.name}${isMatched ? ', đã ghép cặp' : ''}`
                                            : `Thẻ ${index + 1}, đang úp`}
                                        aria-pressed={isRevealed}
                                        disabled={isMatched}
                                        className={`relative grid aspect-square min-h-32 touch-manipulation grid-rows-[1fr_auto] place-items-center overflow-hidden rounded-[2rem] border-[6px] p-3 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2d6358] active:scale-95 sm:min-h-40 ${isMatched
                                            ? 'border-[#6fca8a] bg-[#edfff0] ring-4 ring-[#bcebc8]'
                                            : isRevealed
                                                ? 'rotate-0 border-[#9278df] bg-white'
                                                : 'border-white bg-gradient-to-br from-[#9278df] to-[#b8a6f2] hover:border-[#d5c9ff]'}`}
                                    >
                                        {isRevealed ? (
                                            <>
                                                <span className="grid h-full w-full place-items-center">
                                                    <Picture item={card.item} />
                                                </span>
                                                <span className="max-w-full truncate text-base font-black text-[#604caa] sm:text-lg">{card.item.name}</span>
                                                {isMatched && <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-[#59b978] text-lg text-white shadow">✓</span>}
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-6xl sm:text-7xl" aria-hidden>❔</span>
                                                <span className="text-sm font-black text-white">LẬT THẺ</span>
                                            </>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
