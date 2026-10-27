'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAPI } from '../../lib/hooks/useAPI';
import { resolveRoleHome } from '../../lib/auth';
import { LISTEN_AND_MATCH_ID, MEMORY_MATCH_ID, SAY_IT_WITH_AI_ID } from '../../src/game-config';

type Game = {
    gameId: string;
    title: string;
    description: string;
    icon: string;
    isActive: boolean;
    themes: { id: string; title: string }[];
};

export default function GamesPage() {
    const { API } = useAPI();
    const router = useRouter();
    const { data: session, status } = useSession();
    const [game, setGame] = useState<Game | null>(null);
    const [memoryGame, setMemoryGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [memoryLoadError, setMemoryLoadError] = useState('');
    const role = (session?.user as { role?: string } | undefined)?.role;

    useEffect(() => {
        if (status === 'unauthenticated') router.replace('/login');
        if (status === 'authenticated' && role !== 'PARENT') router.replace(resolveRoleHome(role || ''));
    }, [role, router, status]);

    useEffect(() => {
        if (status !== 'authenticated' || role !== 'PARENT') return;
        let current = true;
        Promise.all([
            API.get('games', false, false, false),
            API.get(`games?gameId=${MEMORY_MATCH_ID}`, false, false, false),
        ]).then(([result, memoryResult]) => {
            if (!current) return;
            if (result?.game) setGame(result.game);
            else setLoadError(result?.message || 'Trò chơi hiện chưa được mở.');
            if (memoryResult?.game) setMemoryGame(memoryResult.game);
            else setMemoryLoadError(memoryResult?.message || 'Trò chơi hiện chưa được mở.');
        }).finally(() => {
            if (current) setLoading(false);
        });
        return () => { current = false; };
    }, [API, role, status]);

    if (status !== 'authenticated' || role !== 'PARENT') {
        return <div className="grid min-h-screen place-items-center text-xl">Đang tải trò chơi...</div>;
    }

    return (
        <main className="min-h-screen bg-[#f4faf4] px-5 py-8 text-[#203b35] lg:px-10">
            <div className="mx-auto max-w-6xl">
                <Link href="/dashboard" className="font-bold text-[#2d6358]">← Góc phụ huynh</Link>
                <header className="mt-8">
                    <span className="rounded-full bg-[#e8f4e9] px-4 py-2 text-sm font-bold text-[#2d6358]">GÓC VUI HỌC</span>
                    <h1 className="mt-4 text-4xl font-black sm:text-5xl">Chọn trò chơi 🎮</h1>
                    <p className="mt-3 max-w-2xl text-lg text-[#71867c]">
                        Cùng bé vừa chơi vừa luyện nghe tiếng Anh. Chọn một trò chơi để bắt đầu nhé!
                    </p>
                </header>

                {loading ? (
                    <div className="mt-8 rounded-3xl bg-white p-8 text-[#71867c] shadow-sm">Đang tải danh sách trò chơi...</div>
                ) : (
                    <section aria-label="Danh sách trò chơi" className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        <article className="overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-soft">
                            <div className="grid min-h-48 place-items-center bg-gradient-to-br from-[#c9f1d7] to-[#ffebad]">
                                <span aria-hidden className="text-8xl drop-shadow-sm">{game?.icon || '🎧'}</span>
                            </div>
                            <div className="p-6">
                                <span className="text-xs font-black tracking-widest text-[#ef7d32]">LUYỆN NGHE · 3-8 TUỔI</span>
                                <h2 className="mt-2 text-2xl font-extrabold">{game?.title || 'Listen and Match'}</h2>
                                <p className="mt-2 min-h-12 text-[#71867c]">
                                    {game?.description || 'Nghe tên tiếng Anh và tìm đúng hình ảnh.'}
                                </p>
                                {game?.themes?.length ? (
                                    <p className="mt-4 text-sm font-bold text-[#2d6358]">
                                        {game.themes.length} chủ đề: {game.themes.slice(0, 2).map(theme => theme.title).join(' · ')}
                                    </p>
                                ) : null}
                                {game ? (
                                    <Link
                                        href={`/games/${LISTEN_AND_MATCH_ID}`}
                                        className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-b-4 border-[#e0742a] bg-[#ff9a3c] px-6 font-black text-white transition hover:brightness-105 active:translate-y-1 active:border-b-0"
                                    >
                                        Chơi ngay <span aria-hidden>▶</span>
                                    </Link>
                                ) : (
                                    <p role="status" className="mt-5 rounded-2xl bg-[#fff2d5] p-4 text-sm font-bold text-[#80683c]">
                                        {loadError || 'Trò chơi hiện chưa được mở.'}
                                    </p>
                                )}
                            </div>
                        </article>
                        <article className="overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-soft">
                            <div className="grid min-h-48 place-items-center bg-gradient-to-br from-[#d7e8ff] to-[#ffe0e9]">
                                <span aria-hidden className="text-8xl drop-shadow-sm">🎙️</span>
                            </div>
                            <div className="p-6">
                                <span className="text-xs font-black tracking-widest text-[#ef7d32]">LUYỆN NÓI · 3-8 TUỔI</span>
                                <h2 className="mt-2 text-2xl font-extrabold">Say It with AI</h2>
                                <p className="mt-2 min-h-12 text-[#71867c]">
                                    Bé nhìn hình, trả lời bằng tiếng Anh và nhận lời động viên từ AI.
                                </p>
                                {game ? (
                                    <Link
                                        href={`/games/${SAY_IT_WITH_AI_ID}`}
                                        className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-b-4 border-[#397ad7] bg-[#5795ef] px-6 font-black text-white transition hover:brightness-105 active:translate-y-1 active:border-b-0"
                                    >
                                        Chơi ngay <span aria-hidden>🎤</span>
                                    </Link>
                                ) : (
                                    <p role="status" className="mt-5 rounded-2xl bg-[#fff2d5] p-4 text-sm font-bold text-[#80683c]">
                                        {loadError || 'Trò chơi hiện chưa được mở.'}
                                    </p>
                                )}
                            </div>
                        </article>
                        <article className="overflow-hidden rounded-[2rem] border-4 border-white bg-white shadow-soft">
                            <div className="grid min-h-48 place-items-center bg-gradient-to-br from-[#ffe5b5] to-[#e9dcff]">
                                <span aria-hidden className="text-8xl drop-shadow-sm">{memoryGame?.icon || '🧠'}</span>
                            </div>
                            <div className="p-6">
                                <span className="text-xs font-black tracking-widest text-[#ef7d32]">TRÍ NHỚ · 3-8 TUỔI</span>
                                <h2 className="mt-2 text-2xl font-extrabold">{memoryGame?.title || 'Memory Match'}</h2>
                                <p className="mt-2 min-h-12 text-[#71867c]">
                                    {memoryGame?.description || 'Lật thẻ tìm cặp hình giống nhau và học từ tiếng Anh.'}
                                </p>
                                {memoryGame?.themes?.length ? (
                                    <p className="mt-4 text-sm font-bold text-[#2d6358]">
                                        {memoryGame.themes.length} chủ đề: {memoryGame.themes.slice(0, 2).map(theme => theme.title).join(' · ')}
                                    </p>
                                ) : null}
                                {memoryGame ? (
                                    <Link
                                        href={`/games/${MEMORY_MATCH_ID}`}
                                        className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-b-4 border-[#7a61c7] bg-[#9278df] px-6 font-black text-white transition hover:brightness-105 active:translate-y-1 active:border-b-0"
                                    >
                                        Chơi ngay <span aria-hidden>🧠</span>
                                    </Link>
                                ) : (
                                    <p role="status" className="mt-5 rounded-2xl bg-[#fff2d5] p-4 text-sm font-bold text-[#80683c]">
                                        {memoryLoadError || 'Trò chơi hiện chưa được mở.'}
                                    </p>
                                )}
                            </div>
                        </article>
                    </section>
                )}
            </div>
        </main>
    );
}
