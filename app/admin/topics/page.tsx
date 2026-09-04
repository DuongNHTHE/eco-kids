'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAPI } from '../../../lib/hooks/useAPI';

type WordDraft = { id: string; english: string; vietnamese: string; phonetic: string; prompt: string; shape: string; modelUrl: string };
type Topic = { id: string; title: string; vietnamese: string; icon: string; color: string; description?: string; words: WordDraft[] };

let wordsCounter = 0;
const createWord = (): WordDraft => ({ id: `draft-${Date.now()}-${wordsCounter++}`, english: '', vietnamese: '', phonetic: '', prompt: '', shape: 'rocket', modelUrl: '' });
const emptyWord: WordDraft = { id: 'draft-template', english: '', vietnamese: '', phonetic: '', prompt: '', shape: 'rocket', modelUrl: '' };
const emptyForm = { slug: '', title: '', vietnamese: '', icon: '📚', color: '#6eaa83', description: '' };

// function modelIcon(shape: string) {
//     return ({ fox: '🦊', whale: '🐋', turtle: '🐢', apple: '🍎', orange: '🍊', pear: '🍐', car: '🚗', bus: '🚌' } as Record<string, string>)[shape] || '🚀';
// }

export default function TopicsListPage() {
    const { API } = useAPI();
    const router = useRouter();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [words, setWords] = useState<WordDraft[]>([createWord()]);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    async function loadTopics() {
        const result = await API.get('topics', false, false, true);
        if (Array.isArray(result)) setTopics(result);
    }

    useEffect(() => { loadTopics(); }, [API]);

    const updateForm = (field: keyof typeof emptyForm, value: string) => setForm(current => ({ ...current, [field]: value }));
    const updateWord = (index: number, field: keyof WordDraft, value: string) => setWords(current => current.map((word, wordIndex) => wordIndex === index ? { ...word, [field]: value } : word));

    function closeModal() {
        if (saving) return;
        setIsModalOpen(false);
        setMessage('');
        setForm({ ...emptyForm });
        setWords([createWord()]);
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        const result = await API.post('topics', { ...form, words }, false, false, true);
        if (result.success) {
            await loadTopics();
            closeModal();
        } else {
            setMessage(result.message || 'Không thể thêm chủ đề.');
        }
        setSaving(false);
    }

    return (
        <main className="min-h-screen">
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 lg:px-10">
                    <div>
                        <Link href="/admin/dashboard" className="text-sm font-bold text-[#6eaa83]">← Về dashboard</Link>
                        <div className="mt-3 flex items-center gap-3"><span className="text-4xl">🗂️</span><div><h1 className="text-3xl font-extrabold sm:text-4xl">Chủ đề học tập</h1><p className="mt-1 text-[#71867c]">Quản lý chủ đề và các bài tập cho bé.</p></div></div>
                    </div>
                    <button type="button" onClick={() => setIsModalOpen(true)} className="rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white shadow-lg shadow-[#f47d52]/20">＋ Thêm chủ đề</button>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        <span className="text-sm font-bold text-[#ef7d32]">Kho nội dung</span>
                        <h2 className="mt-2 text-2xl font-extrabold">Tất cả chủ đề</h2>
                    </div>
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#71867c] shadow-sm">{topics.length} chủ đề</span>
                </div>
                {topics.length === 0 ?
                    <div className="rounded-[2rem] bg-white p-12 text-center shadow-soft">
                        <p className="text-lg font-bold">Chưa có chủ đề nào</p>
                        <p className="mt-2 text-[#71867c]">Hãy thêm chủ đề đầu tiên cho thư viện học tập.</p>
                        <button type="button" onClick={() => setIsModalOpen(true)} className="mt-5 rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white">＋ Thêm chủ đề</button>
                    </div>
                    :
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {topics.map(topic =>
                            <button type="button" key={topic.id} onClick={() => router.push(`/admin/topics/${topic.id}`)} className="group rounded-[2rem] bg-white p-6 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-lg">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="grid h-16 w-16 place-items-center rounded-2xl text-4xl" style={{ backgroundColor: `${topic.color || '#6eaa83'}22` }}>{topic.icon}</span>
                                    <span className="rounded-full bg-[#eef8ef] px-3 py-1 text-xs font-bold text-[#2d6358]">{topic.words?.length || 0} bài tập</span>
                                </div>
                                <h3 className="mt-5 text-2xl font-extrabold">{topic.vietnamese}</h3>
                                <p className="mt-1 font-bold text-[#6eaa83]">{topic.title}</p>
                                <p className="mt-4 line-clamp-2 min-h-10 text-sm text-[#71867c]">{topic.description || 'Khám phá bài học và luyện tập từ vựng.'}</p>
                                <span className="mt-5 block font-bold text-[#f47d52] group-hover:underline">Mở chủ đề →</span>
                            </button>
                        )}
                    </div>
                }
            </div>

            {isModalOpen &&
                <div role="dialog" aria-modal="true" aria-labelledby="add-topic-title" className="fixed inset-0 z-50 overflow-y-auto bg-[#203b35]/60 p-4 sm:p-8">
                    <div className="mx-auto max-w-3xl rounded-[2rem] bg-[#f8fcf8] shadow-2xl">
                        <div className="top-0 z-10 flex items-start justify-between gap-4 rounded-t-[2rem] border-b border-[#dceadd] bg-white p-6">
                            <div>
                                <span className="text-sm font-bold text-[#ef7d32]">Thư viện nội dung</span>
                                <h2 id="add-topic-title" className="mt-1 text-2xl font-extrabold">Thêm chủ đề mới</h2>
                            </div>
                            <button type="button" aria-label="Đóng" onClick={closeModal} className="grid h-10 w-10 place-items-center rounded-full bg-[#f4faf4] text-2xl">×</button>
                        </div>
                        <form onSubmit={submit} className="space-y-5 p-6">
                            <section className="rounded-2xl bg-white p-5">
                                <h3 className="font-extrabold">Thông tin chung</h3>
                                <div className="mt-4 grid gap-4 sm:grid-cols-2">{([['title', 'Tên tiếng Anh', 'Amazing Nature'], ['vietnamese', 'Tên tiếng Việt', 'Thiên nhiên kỳ thú'], ['slug', 'Slug', 'amazing-nature'], ['icon', 'Biểu tượng', '🌿']] as const).map(([field, label, placeholder]) =>
                                    <label key={field} className="text-sm font-bold">{label}
                                        <input required value={form[field]} onChange={event => updateForm(field, event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-[#dceadd] bg-[#f8fcf8] px-3 py-2.5 font-normal outline-none focus:border-[#6eaa83]" />
                                    </label>
                                )}
                                    <label className="text-sm font-bold">Màu chủ đề
                                        <input aria-label="Màu chủ đề" type="color" value={form.color} onChange={event => updateForm('color', event.target.value)} className="mt-2 block h-11 w-16 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                                    </label>
                                </div>
                                <label className="mt-4 block text-sm font-bold">Mô tả
                                    <textarea value={form.description} onChange={event => updateForm('description', event.target.value)} rows={2} className="mt-2 w-full resize-y rounded-xl border border-[#dceadd] bg-[#f8fcf8] px-3 py-2.5 font-normal outline-none focus:border-[#6eaa83]" />
                                </label>
                            </section>
                            <section className="rounded-2xl bg-white p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="font-extrabold">Bài tập ({words.length})</h3>
                                    <button type="button" onClick={() => setWords(current => [...current, { ...emptyWord }])} className="rounded-full bg-[#eef8ef] px-3 py-2 text-sm font-bold text-[#2d6358]">＋ Thêm bài</button>
                                </div>
                                <div className="mt-4 space-y-4">
                                    {words.map((word, index) =>
                                        <div key={index} className="rounded-xl bg-[#f4faf4] p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <b>Bài tập {index + 1}</b>
                                                {words.length > 1 &&
                                                    <button type="button" onClick={() => setWords(current => current.filter((_, wordIndex) => wordIndex !== index))} className="text-sm font-bold text-[#d45e45]">Xóa</button>
                                                }
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {([['english', 'Tiếng Anh', 'Forest'], ['vietnamese', 'Tiếng Việt', 'Khu rừng'], ['phonetic', 'Phiên âm', '/ˈfɒr.ɪst/'], ['shape', 'Mô hình', 'tree'], ['modelUrl', 'URL mô hình 3D', 'https://example.com/model.glb'], ['prompt', 'Câu ví dụ', 'The forest is green.']] as const).map(([field, label, placeholder]) =>
                                                <label key={field} className="text-sm font-bold">{label}
                                                    <input required={field === 'english' || field === 'vietnamese' || field === 'prompt'} value={word[field]} onChange={event => updateWord(index, field, event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-lg border border-[#dceadd] bg-white px-3 py-2 font-normal outline-none focus:border-[#6eaa83]" />
                                                </label>
                                            )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                            <div className="flex flex-wrap items-center justify-end gap-3">
                                <span className="mr-auto text-sm font-bold text-[#d45e45]">{message}</span>
                                <button type="button" onClick={closeModal} className="rounded-full border border-[#c8d9cb] px-5 py-3 font-bold">Hủy</button>
                                <button disabled={saving} className="rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Đang lưu...' : 'Lưu chủ đề'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            }
        </main>
    );
}
