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
        <main className="min-h-screen bg-[#f4faf4] px-4 py-6 text-[#203b35] sm:px-8 sm:py-10">
            <div className="mx-auto max-w-5xl">
                <Link href="/games" className="font-bold text-[#2d6358]">← Danh sách trò chơi</Link>
                <header className="mt-6 rounded-[2rem] bg-gradient-to-br from-[#d8f5e0] via-[#e8f4e9] to-[#ffefc2] p-6 sm:p-8">
                    <span className="text-5xl" aria-hidden>{config?.icon || '🎧'}</span>
                    <h1 className="mt-3 text-3xl font-black sm:text-4xl">{config?.title || 'Listen and Match'}</h1>
                    <p className="mt-2 text-[#587367]">Nghe tên tiếng Anh, chọn hình đúng và ghép các cặp hình giống nhau.</p>
                </header>

                {loading ? (
                    <p className="mt-8 rounded-2xl bg-white p-6 text-[#71867c]">Đang tải trò chơi...</p>
                ) : !config ? (
                    <section className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm">
                        <p className="text-lg font-bold">{loadError || 'Trò chơi hiện chưa được mở.'}</p>
                        <Link href="/games" className="mt-5 inline-block rounded-full bg-[#2d6358] px-6 py-3 font-bold text-white">Quay lại danh sách</Link>
                    </section>
                ) : mode === 'themes' ? (
                    <section className="mt-8">
                        <h2 className="text-2xl font-extrabold">Bé muốn chơi chủ đề nào?</h2>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            {config.themes.map((theme, index) => (
                                <button
                                    key={theme.id}
                                    type="button"
                                    onClick={() => startTheme(theme)}
                                    className="flex min-h-32 items-center gap-5 rounded-3xl border-4 border-white bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#6eaa83]"
                                >
                                    <span className="text-5xl" aria-hidden>{index % 2 === 0 ? '🐾' : '🧸'}</span>
                                    <span>
                                        <b className="block text-xl">{theme.title}</b>
                                        <small className="mt-1 block text-[#71867c]">{theme.items.length} hình ảnh · nghe và ghép cặp</small>
                                    </span>
                                    <span className="ml-auto text-2xl" aria-hidden>→</span>
                                </button>
                            ))}
                        </div>
                    </section>
                ) : mode === 'complete' ? (
                    <section className="mt-8 rounded-[2rem] bg-white p-8 text-center shadow-soft sm:p-12">
                        <span className="text-7xl" aria-hidden>🏆</span>
                        <h2 className="mt-4 text-3xl font-black">Hoàn thành xuất sắc!</h2>
                        <p className="mt-2 text-lg text-[#71867c]">Bé đã ghép đúng {roundCount} cặp trong chủ đề {selectedTheme?.title}.</p>
                        <div className="mt-7 flex flex-wrap justify-center gap-3">
                            <button type="button" onClick={() => selectedTheme && startTheme(selectedTheme)} className="rounded-full bg-[#ff9a3c] px-6 py-3 font-black text-white">Chơi lại 🔄</button>
                            <button type="button" onClick={() => { setMode('themes'); setFeedback(''); }} className="rounded-full bg-[#2d6358] px-6 py-3 font-black text-white">Chọn chủ đề khác</button>
                        </div>
                    </section>
                ) : (
                    <section className="mt-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold text-[#71867c]">{selectedTheme?.title}</p>
                                <h2 className="text-2xl font-extrabold">Còn {remaining.length} cặp hình</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => target && speak(target.name)}
                                className="inline-flex min-h-14 items-center gap-3 rounded-full bg-[#2d6358] px-6 font-black text-white shadow-md transition hover:bg-[#234e46]"
                            >
                                <span className="text-2xl" aria-hidden>🔊</span> Nghe lại
                            </button>
                        </div>

                        <p className="mt-4 rounded-2xl bg-[#fff2d5] p-4 font-bold text-[#80683c]">
                            Hãy nghe tên tiếng Anh, sau đó chọn hai thẻ có cùng hình để ghép thành một cặp.
                        </p>
                        {feedback && <p role="status" aria-live="polite" className="mt-4 rounded-2xl bg-white p-4 text-center text-lg font-extrabold text-[#2d6358]">{feedback}</p>}

                        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4">
                            {cards.map((card, index) => matchedItemIds.has(card.item.id) ? (
                                <div
                                    key={card.cardId}
                                    aria-hidden="true"
                                    className="aspect-square min-h-32 rounded-3xl"
                                />
                            ) : (
                                <button
                                    key={card.cardId}
                                    type="button"
                                    onClick={() => chooseCard(card)}
                                    aria-label={`Chọn thẻ ${card.item.name}, thẻ ${index + 1}`}
                                    aria-pressed={selectedCard?.cardId === card.cardId}
                                    className={`group grid aspect-square min-h-32 place-items-center overflow-hidden rounded-3xl border-4 p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#6eaa83] active:scale-95 ${selectedCard?.cardId === card.cardId ? 'border-[#6eaa83] bg-[#e8f4e9] ring-4 ring-[#bfe8c6]' : 'border-white bg-white hover:border-[#a9dfba]'}`}
                                >
                                    <Picture item={card.item} />
                                </button>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
