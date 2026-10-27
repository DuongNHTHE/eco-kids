'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';
import { LISTEN_AND_MATCH_ID } from '../../../src/game-config';

type ThemeDraft = {
    id: string;
    title: string;
    itemsText: string;
};

type GameConfig = {
    gameId: string;
    title: string;
    description: string;
    icon: string;
    isActive: boolean;
    themes: ThemeDraft[];
};

const emptyConfig: GameConfig = {
    gameId: LISTEN_AND_MATCH_ID,
    title: 'Listen and Match',
    description: 'Lắng nghe tên tiếng Anh và tìm đúng hình ảnh.',
    icon: '🎧',
    isActive: true,
    themes: [],
};

function slugify(value: string) {
    return value.trim().toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function toDraft(game: any): GameConfig {
    return {
        gameId: game.gameId,
        title: game.title,
        description: game.description || '',
        icon: game.icon || '🎧',
        isActive: game.isActive !== false,
        themes: (game.themes || []).map((theme: any) => ({
            id: theme.id,
            title: theme.title,
            itemsText: (theme.items || [])
                .map((item: any) => [item.emoji || '', item.name || '', item.translation || '', item.imageUrl || ''].join(' | '))
                .join('\n'),
        })),
    };
}

function toPayload(config: GameConfig) {
    return {
        ...config,
        themes: config.themes.map(theme => ({
            id: theme.id,
            title: theme.title.trim(),
            items: theme.itemsText.split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean)
                .map((line, index) => {
                    const [emoji = '', name = '', translation = '', imageUrl = ''] = line.split('|').map(part => part.trim());
                    return {
                        id: `${theme.id}-item-${index + 1}`,
                        emoji,
                        name,
                        translation,
                        imageUrl,
                    };
                }),
        })),
    };
}

export default function AdminGamesPage() {
    const { API } = useAPI();
    const [config, setConfig] = useState<GameConfig>(emptyConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        let current = true;
        API.get('games', false, false, true).then(result => {
            if (!current) return;
            if (result?.game) setConfig(toDraft(result.game));
            else if (result?.message) setMessage(result.message);
        }).finally(() => {
            if (current) setLoading(false);
        });
        return () => { current = false; };
    }, [API]);

    function updateTheme(index: number, update: Partial<ThemeDraft>) {
        setConfig(current => ({
            ...current,
            themes: current.themes.map((theme, themeIndex) => themeIndex === index ? { ...theme, ...update } : theme),
        }));
    }

    function addTheme() {
        const title = 'Chủ đề mới';
        setConfig(current => ({
            ...current,
            themes: [...current.themes, { id: `${slugify(title)}-${Date.now()}`, title, itemsText: '' }],
        }));
    }

    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        const result = await API.put('games', toPayload(config), false, false, false);
        setMessage(result.success ? 'Đã lưu cấu hình trò chơi.' : result.message || 'Không thể lưu cấu hình trò chơi.');
        if (result.success && result.game) setConfig(toDraft(result.game));
        setSaving(false);
    }

    return (
        <main className="min-h-screen">
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto max-w-5xl px-5 py-6 lg:px-10">
                    <Link href="/admin/dashboard" className="text-sm font-bold text-[#6eaa83]">
                        ← Về dashboard
                    </Link>
                    <div className="mt-4 flex items-center gap-3">
                        <span className="text-4xl">🎮</span>
                        <div>
                            <h1 className="text-3xl font-extrabold">Cấu hình trò chơi</h1>
                            <p className="mt-1 text-[#71867c]">Quản lý trò chơi và các chủ đề hình ảnh dành cho bé.</p>
                        </div>
                    </div>
                    <Link
                        href="/admin/games/memory-match"
                        className="mt-5 inline-flex rounded-full bg-[#eee9ff] px-5 py-3 font-bold text-[#604caa] hover:bg-[#e2d9ff]"
                    >
                        🧠 Cấu hình trò chơi Memory Match
                    </Link>
                </div>
            </header>

            <form onSubmit={save} className="mx-auto max-w-5xl space-y-6 px-5 py-8 lg:px-10">
                <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <span className="text-sm font-bold text-[#ef7d32]">TRÒ CHƠI ĐẦU TIÊN</span>
                            <h2 className="mt-1 text-2xl font-extrabold">Listen and Match</h2>
                        </div>
                        <label className="flex items-center gap-3 rounded-full bg-[#f4faf4] px-4 py-3 text-sm font-bold">
                            <input
                                type="checkbox"
                                checked={config.isActive}
                                onChange={event => setConfig(current => ({ ...current, isActive: event.target.checked }))}
                                className="h-5 w-5 accent-[#2d6358]"
                            />
                            Hiển thị cho phụ huynh
                        </label>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-[100px_1fr]">
                        <label className="text-sm font-bold">
                            Biểu tượng
                            <input
                                value={config.icon}
                                maxLength={12}
                                onChange={event => setConfig(current => ({ ...current, icon: event.target.value }))}
                                className="mt-2 w-full rounded-xl border border-[#dceadd] px-3 py-3 text-center text-2xl"
                            />
                        </label>
                        <label className="text-sm font-bold">
                            Tên trò chơi
                            <input
                                required
                                value={config.title}
                                maxLength={100}
                                onChange={event => setConfig(current => ({ ...current, title: event.target.value }))}
                                className="mt-2 w-full rounded-xl border border-[#dceadd] px-3 py-3 font-normal"
                            />
                        </label>
                    </div>
                    <label className="mt-4 block text-sm font-bold">
                        Mô tả
                        <textarea
                            value={config.description}
                            maxLength={300}
                            onChange={event => setConfig(current => ({ ...current, description: event.target.value }))}
                            rows={2}
                            className="mt-2 w-full rounded-xl border border-[#dceadd] px-3 py-3 font-normal"
                        />
                    </label>
                </section>

                <section className="rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-extrabold">Chủ đề và hình ảnh</h2>
                            <p className="mt-1 text-sm text-[#71867c]">
                                Mỗi chủ đề cần ít nhất 2 từ. Mỗi dòng nhập theo mẫu: emoji | English | nghĩa tiếng Việt | URL hình (không bắt buộc).
                            </p>
                        </div>
                        <button type="button" onClick={addTheme} className="rounded-full bg-[#e8f4e9] px-5 py-3 font-bold text-[#2d6358]">
                            + Thêm chủ đề
                        </button>
                    </div>

                    {loading ? (
                        <p className="mt-6 text-[#71867c]">Đang tải cấu hình...</p>
                    ) : config.themes.length === 0 ? (
                        <div className="mt-6 rounded-2xl border-2 border-dashed border-[#dceadd] p-8 text-center text-[#71867c]">
                            Chưa có chủ đề nào. Hãy thêm chủ đề trước khi lưu.
                        </div>
                    ) : (
                        <div className="mt-6 space-y-4">
                            {config.themes.map((theme, index) => (
                                <article key={theme.id} className="rounded-2xl border border-[#dceadd] p-5">
                                    <div className="flex items-center gap-3">
                                        <label className="flex-1 text-sm font-bold">
                                            Tên chủ đề
                                            <input
                                                required
                                                value={theme.title}
                                                maxLength={80}
                                                onChange={event => updateTheme(index, { title: event.target.value })}
                                                className="mt-2 w-full rounded-xl border border-[#dceadd] px-3 py-3 font-normal"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            aria-label={`Xóa chủ đề ${theme.title}`}
                                            onClick={() => setConfig(current => ({ ...current, themes: current.themes.filter((_, themeIndex) => themeIndex !== index) }))}
                                            className="mt-6 rounded-full px-4 py-3 font-bold text-[#d45e45] hover:bg-[#fff2ed]"
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                    <label className="mt-4 block text-sm font-bold">
                                        Danh sách từ và hình ảnh
                                        <textarea
                                            required
                                            value={theme.itemsText}
                                            onChange={event => updateTheme(index, { itemsText: event.target.value })}
                                            rows={6}
                                            placeholder={'🐶 | dog | chó | /img/dog.png\n🐱 | cat | mèo |'}
                                            className="mt-2 w-full rounded-xl border border-[#dceadd] px-3 py-3 font-mono text-sm font-normal"
                                        />
                                    </label>
                                </article>
                            ))}
                        </div>
                    )}

                    <p className="mt-5 text-xs leading-5 text-[#71867c]">
                        Nếu không có URL hình, trò chơi sẽ dùng emoji làm hình minh họa. Tên tiếng Anh sẽ được đọc bằng giọng nói của trình duyệt.
                    </p>
                </section>

                <div className="flex flex-wrap items-center gap-4">
                    <button
                        disabled={saving || loading}
                        className="rounded-full bg-[#f47d52] px-8 py-3 font-bold text-white disabled:opacity-60"
                    >
                        {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </button>
                    {message && <p role="status" className="text-sm font-bold text-[#2d6358]">{message}</p>}
                </div>
            </form>
        </main>
    );
}
