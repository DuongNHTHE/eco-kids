'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';

type Topic = { id: string; title: string; vietnamese: string; words: { id: string; english: string }[] };
type Exercise = { id: string; topicId: string; type: 'PRONUNCIATION' | 'FILL_BLANK'; title: string; prompt: string; answer: string; hint: string; wordId: string; isActive: boolean };

const emptyForm = { topicId: '', type: 'PRONUNCIATION', title: '', prompt: '', answer: '', hint: '', wordId: '' };

export default function ExercisesAdminPage() {
    const { API } = useAPI();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);

    async function load() {
        const [nextTopics, nextExercises] = await Promise.all([
            API.get('topics', false, false, true),
            API.get('review-exercises', false, false, true),
        ]);
        if (Array.isArray(nextTopics)) setTopics(nextTopics);
        if (Array.isArray(nextExercises)) setExercises(nextExercises);
    }

    useEffect(() => { load(); }, [API]);

    const selectedTopic = topics.find(topic => topic.id === form.topicId);

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        const result = await API.post('review-exercises', form, false, false, true);
        if (result.success) {
            setForm({ ...emptyForm });
            setMessage('Đã thêm bài ôn luyện.');
            await load();
        } else {
            setMessage(result.message || 'Không thể lưu bài ôn luyện.');
        }
        setSaving(false);
    }

    async function removeExercise(id: string) {
        if (!window.confirm('Xóa bài ôn luyện này?')) return;
        const result = await API.put('review-exercises', { id, action: 'delete' }, false, false, true);
        if (result.success) setExercises(current => current.filter(exercise => exercise.id !== id));
    }

    return (
        <main className="min-h-screen">
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-5 py-6 lg:px-10">
                    <Link href="/admin/dashboard" className="text-sm font-bold text-[#6eaa83]">← Về dashboard</Link>
                    <div className="mt-4 flex items-center gap-3"><span className="text-4xl">📝</span><div><h1 className="text-3xl font-extrabold">Bài tập ôn luyện</h1><p className="mt-1 text-[#71867c]">Tạo bài phát âm và điền từ cho bé sau khi hoàn thành chủ đề.</p></div></div>
                </div>
            </header>
            <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[380px_1fr] lg:px-10">
                <form onSubmit={submit} className="h-fit rounded-[2rem] bg-white p-6 shadow-soft">
                    <h2 className="text-xl font-extrabold">Thêm bài ôn luyện</h2>
                    <label className="mt-5 block text-sm font-bold">Chủ đề
                        <select required value={form.topicId} onChange={event => setForm(current => ({ ...current, topicId: event.target.value, wordId: '' }))} className="mt-2 w-full rounded-xl border border-[#dceadd] bg-white px-3 py-3 font-normal">
                            <option value="">Chọn chủ đề</option>
                            {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.vietnamese} · {topic.title}</option>)}
                        </select>
                    </label>
                    <label className="mt-4 block text-sm font-bold">Loại bài
                        <select value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#dceadd] bg-white px-3 py-3 font-normal">
                            <option value="PRONUNCIATION">Luyện phát âm</option>
                            <option value="FILL_BLANK">Điền từ</option>
                        </select>
                    </label>
                    {selectedTopic && <label className="mt-4 block text-sm font-bold">Từ liên quan
                        <select value={form.wordId} onChange={event => setForm(current => ({ ...current, wordId: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#dceadd] bg-white px-3 py-3 font-normal">
                            <option value="">Không chọn từ cụ thể</option>
                            {selectedTopic.words?.map(word => <option key={word.id} value={word.id}>{word.english}</option>)}
                        </select>
                    </label>}
                    <label className="mt-4 block text-sm font-bold">Tên bài
                        <input required value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Nói về khu rừng" className="mt-2 w-full rounded-xl border border-[#dceadd] px-3 py-3 font-normal" />
                    </label>
                    <label className="mt-4 block text-sm font-bold">Yêu cầu bài tập
                        <textarea required value={form.prompt} onChange={event => setForm(current => ({ ...current, prompt: event.target.value }))} placeholder={form.type === 'PRONUNCIATION' ? 'Hãy đọc câu: The forest is green.' : 'Điền từ còn thiếu: The ___ is green.'} rows={3} className="mt-2 w-full resize-y rounded-xl border border-[#dceadd] px-3 py-3 font-normal" />
                    </label>
                    <label className="mt-4 block text-sm font-bold">Đáp án
                        <input required value={form.answer} onChange={event => setForm(current => ({ ...current, answer: event.target.value }))} placeholder={form.type === 'PRONUNCIATION' ? 'The forest is green.' : 'forest'} className="mt-2 w-full rounded-xl border border-[#dceadd] px-3 py-3 font-normal" />
                    </label>
                    <label className="mt-4 block text-sm font-bold">Gợi ý <span className="font-normal text-[#83968c]">(không bắt buộc)</span>
                        <input value={form.hint} onChange={event => setForm(current => ({ ...current, hint: event.target.value }))} placeholder="Gợi ý cho bé" className="mt-2 w-full rounded-xl border border-[#dceadd] px-3 py-3 font-normal" />
                    </label>
                    <button disabled={saving} className="mt-6 w-full rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Đang lưu...' : 'Thêm bài ôn luyện'}</button>
                    {message && <p className="mt-3 text-sm font-bold text-[#2d6358]">{message}</p>}
                </form>

                <section>
                    <div className="mb-5 flex items-end justify-between gap-4"><div><span className="text-sm font-bold text-[#ef7d32]">Kho bài tập</span><h2 className="mt-2 text-2xl font-extrabold">Bài đã tạo</h2></div><span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#71867c] shadow-sm">{exercises.length} bài</span></div>
                    {exercises.length === 0 ? <div className="rounded-[2rem] bg-white p-10 text-center text-[#71867c] shadow-soft">Chưa có bài ôn luyện nào.</div> : <div className="space-y-3">{exercises.map(exercise => {
                        const topic = topics.find(item => item.id === exercise.topicId);
                        return <article key={exercise.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-bold text-[#ef7d32]">{exercise.type === 'PRONUNCIATION' ? 'LUYỆN PHÁT ÂM' : 'ĐIỀN TỪ'}</span><h3 className="mt-1 text-lg font-extrabold">{exercise.title}</h3><p className="mt-1 text-sm text-[#71867c]">{topic?.vietnamese || exercise.topicId}</p></div><button type="button" onClick={() => removeExercise(exercise.id)} className="font-bold text-[#d45e45]">Xóa</button></div><p className="mt-4 rounded-xl bg-[#f4faf4] p-3 text-sm">{exercise.prompt}</p><small className="mt-2 block font-bold text-[#83968c]">Đáp án: {exercise.answer}</small></article>;
                    })}</div>}
                </section>
            </div>
        </main>
    );
}