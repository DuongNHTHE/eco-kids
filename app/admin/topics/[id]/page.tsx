'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAPI } from '../../../../lib/hooks/useAPI';

type Word = { id: string; english: string; vietnamese: string; phonetic?: string; prompt?: string; shape?: string; color?: string; modelUrl?: string };
type Topic = { id: string; title: string; vietnamese: string; icon: string; color: string; description?: string; words: Word[] };
type WordDraft = { id: string; english: string; vietnamese: string; phonetic: string; prompt: string; shape: string; modelUrl: string };

const icons: Record<string, string> = { fox: '🦊', whale: '🐋', turtle: '🐢', apple: '🍎', orange: '🍊', pear: '🍐', car: '🚗', bus: '🚌' };

export default function TopicDetailPage() {
    const { API } = useAPI();
    const params = useParams<{ id: string }>();
    const [topic, setTopic] = useState<Topic | null>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWordId, setEditingWordId] = useState<string | null>(null);
    const [draft, setDraft] = useState<WordDraft>({ id: '', english: '', vietnamese: '', phonetic: '', prompt: '', shape: 'rocket', modelUrl: '' });
    const [saving, setSaving] = useState(false);
    const [sampling, setSampling] = useState(false);
    const [message, setMessage] = useState('');

    async function loadTopic() {
        if (!params.id) return;
        const result = await API.get(`topics/${encodeURIComponent(params.id)}`, false, false, true);
        if (result?.id) setTopic(result);
        setLoading(false);
    }

    useEffect(() => {
        loadTopic();
    }, [API, params.id]);

    function openCreateModal() {
        setEditingWordId(null);
        setDraft({ id: '', english: '', vietnamese: '', phonetic: '', prompt: '', shape: '', modelUrl: '' });
        setMessage('');
        setIsModalOpen(true);
    }

    function openEditModal(word: Word) {
        setEditingWordId(word.id);
        setDraft({ id: word.id, english: word.english, vietnamese: word.vietnamese, phonetic: word.phonetic || '', prompt: word.prompt || '', shape: word.shape || 'rocket', modelUrl: word.modelUrl || '' });
        setMessage('');
        setIsModalOpen(true);
    }

    async function submitWord(event: { preventDefault: () => void }) {
        event.preventDefault();
        if (!topic) return;
        setSaving(true);
        setMessage('');
        const result = await API.put(`topics/${encodeURIComponent(topic.id)}`, { action: editingWordId ? 'update' : 'create', wordId: editingWordId, word: draft }, false, false, true);
        if (result.success) {
            setTopic(result.topic);
            setIsModalOpen(false);
        } else {
            setMessage(result.message || 'Không thể lưu bài học.');
        }
        setSaving(false);
    }

    async function sampleWord() {
        const english = draft.english.trim();
        if (!english) {
            setMessage('Hãy nhập từ tiếng Anh trước khi lấy mẫu.');
            return;
        }

        setSampling(true);
        setMessage('');
        try {
            const response = await fetch(`/api/dictionary/${encodeURIComponent(english)}`, { cache: 'no-store' });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.message || 'Không thể lấy dữ liệu từ điển.');

            const entry = payload?.[0];
            const phonetic = entry?.phonetics?.find((item: { text?: string }) => item.text)?.text || entry?.phonetic || '';
            const example = entry?.meanings?.flatMap((meaning: { definitions?: { example?: string }[] }) => meaning.definitions || [])
                .map((definition: { example?: string }) => definition.example)
                .find(Boolean) || '';
            setDraft(current => ({ ...current, phonetic: phonetic || current.phonetic, prompt: example || current.prompt }));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Không thể lấy dữ liệu mẫu.');
        } finally {
            setSampling(false);
        }
    }

    async function deleteWord(word: Word) {
        if (!topic || !window.confirm(`Xóa bài học "${word.english}"?`)) return;
        const result = await API.put(`topics/${encodeURIComponent(topic.id)}`, { action: 'delete', wordId: word.id }, true, false, true);
        if (result.success) setTopic(result.topic);
    }

    if (loading) return <div className="grid min-h-screen place-items-center text-lg font-bold text-[#71867c]">Đang tải chủ đề...</div>;
    if (!topic) return <div className="grid min-h-screen place-items-center"><div className="text-center"><p className="text-lg font-bold">Không tìm thấy chủ đề</p><Link href="/admin/topics" className="mt-4 inline-block font-bold text-[#f47d52]">← Về danh sách</Link></div></div>;

    return (
        <main className="min-h-screen">
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10">
                    <Link href="/admin/topics" className="text-sm font-bold text-[#6eaa83]">← Tất cả chủ đề</Link>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                            <span className="grid h-16 w-16 place-items-center rounded-2xl text-4xl" style={{ backgroundColor: `${topic.color || '#6eaa83'}22` }}>{topic.icon}</span>
                            <div>
                                <h1 className="text-3xl font-extrabold sm:text-4xl">{topic.vietnamese}</h1>
                                <p className="mt-1 font-bold text-[#6eaa83]">{topic.title}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="rounded-full bg-[#eef8ef] px-4 py-2 text-sm font-bold text-[#2d6358]">{topic.words?.length || 0} bài tập</span>
                            <button type="button" onClick={openCreateModal} className="rounded-full bg-[#f47d52] px-4 py-2 text-sm font-bold text-white shadow-sm">＋ Thêm bài</button>
                        </div>
                    </div>
                    {topic.description &&
                        <p className="mt-5 max-w-2xl text-[#71867c]">{topic.description}</p>
                    }
                </div>
            </header>
            <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
                <div className="mb-5">
                    <span className="text-sm font-bold text-[#ef7d32]">Nội dung chủ đề</span>
                    <h2 className="mt-2 text-2xl font-extrabold">Các bài tập trong chủ đề</h2>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{topic.words?.map((word, index) =>
                    <article key={word.id || index} className="rounded-[1.5rem] bg-white p-5 shadow-soft">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-[#83968c]">Bài tập {index + 1}</span>
                                <h3 className="mt-2 text-2xl font-extrabold">{word.english}</h3>
                                <p className="mt-1 font-bold text-[#f47d52]">{word.vietnamese}</p>
                            </div>
                            <span className="text-4xl">{word.shape || '🚀'}</span>
                        </div>
                        <div className="mt-5 rounded-xl bg-[#f4faf4] p-3">
                            <p className="text-sm text-[#637970]">{word.prompt || 'Chưa có câu ví dụ.'}</p>
                            {word.phonetic &&
                                <small className="mt-2 block font-bold text-[#83968c]">{word.phonetic}</small>
                            }
                        </div>
                        <div className="mt-4 flex justify-end gap-3 text-sm font-bold">
                            <button type="button" onClick={() => openEditModal(word)} className="text-[#2d6358] hover:underline">Sửa</button>
                            <button type="button" onClick={() => deleteWord(word)} className="text-[#d45e45] hover:underline">Xóa</button>
                        </div>
                    </article>
                )}
                </div>
            </div>
            {isModalOpen &&
                <dialog open aria-labelledby="lesson-modal-title" className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none overflow-y-auto border-0 bg-[#203b35]/60 p-4 sm:p-8">
                    <div className="mx-auto max-w-2xl rounded-[2rem] bg-[#f8fcf8] shadow-2xl">
                        <div className="flex items-start justify-between gap-4 rounded-t-[2rem] border-b border-[#dceadd] bg-white p-6">
                            <div>
                                <span className="text-sm font-bold text-[#ef7d32]">{topic.title}</span>
                                <h2 id="lesson-modal-title" className="mt-1 text-2xl font-extrabold">{editingWordId ? 'Chỉnh sửa bài học' : 'Thêm bài học'}</h2>
                            </div>
                            <button type="button" aria-label="Đóng" onClick={() => !saving && setIsModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#f4faf4] text-2xl">×</button>
                        </div>
                        <form onSubmit={submitWord} className="space-y-5 p-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {([['english', 'Tiếng Anh', 'Forest'], ['vietnamese', 'Tiếng Việt', 'Khu rừng'], ['phonetic', 'Phiên âm', '/ˈfɒr.ɪst/'], ['shape', 'Mô hình', 'tree'], ['modelUrl', 'URL mô hình 3D', 'https://example.com/model.glb']] as const).map(([field, label, placeholder]) =>
                                    <label key={field} className="text-sm font-bold">{label}
                                        <input required={field === 'english' || field === 'vietnamese'} value={draft[field]} onChange={event => setDraft(current => ({ ...current, [field]: event.target.value }))} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-[#dceadd] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#6eaa83]" />
                                    </label>
                                )}
                            </div>
                            <button type="button" onClick={sampleWord} disabled={sampling} className="rounded-full bg-[#eef8ef] px-4 py-2 text-sm font-bold text-[#2d6358] disabled:opacity-60">
                                {sampling ? 'Đang lấy mẫu...' : '✦ Sample phiên âm & ví dụ'}
                            </button>
                            <div className="block text-sm font-bold">
                                <label htmlFor="lesson-prompt">Câu ví dụ</label>
                                <textarea id="lesson-prompt" required value={draft.prompt} onChange={event => setDraft(current => ({ ...current, prompt: event.target.value }))} placeholder="The forest is green." rows={3} className="mt-2 w-full resize-y rounded-xl border border-[#dceadd] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#6eaa83]" />
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-3">
                                <span className="mr-auto text-sm font-bold text-[#d45e45]">{message}</span>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-full border border-[#c8d9cb] px-5 py-3 font-bold">Hủy</button>
                                <button type="submit" disabled={saving} className="rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Đang lưu...' : 'Lưu bài học'}</button>
                            </div>
                        </form>
                    </div>
                </dialog>
            }
        </main>
    );
}
