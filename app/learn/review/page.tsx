'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';
import { getSelectedChildId, saveSelectedChild } from '../../../lib/child-session';

type Child = { id: string; name: string; avatar: string };
type Exercise = { id: string; topicId: string; type: 'PRONUNCIATION' | 'FILL_BLANK'; title: string; prompt: string; answer: string; hint: string; word?: string; vietnamese?: string; phonetic?: string; shape?: string; modelUrl?: string };

declare global { interface Window { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any } }

function normalize(value: string) {
    return value.trim().toLowerCase().replace(/[.!?,]/g, '');
}

export default function ReviewPage() {
    const { API } = useAPI();
    const [children, setChildren] = useState<Child[]>([]);
    const [selectedChildId, setSelectedChildId] = useState('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(true);
    const [recording, setRecording] = useState(false);

    async function loadExercises(childId: string) {
        setLoading(true);
        const result = await API.get(`review-exercises?childId=${encodeURIComponent(childId)}`, false, false, true);
        setExercises(Array.isArray(result?.exercises) ? result.exercises : []);
        setIndex(0);
        setAnswer('');
        setFeedback(result?.exercises?.length ? '' : 'Bé hãy hoàn thành toàn bộ từ vựng trong một chủ đề để mở bài ôn luyện nhé.');
        setLoading(false);
    }

    useEffect(() => {
        API.get('children', false, false, true).then(nextChildren => {
            if (!Array.isArray(nextChildren) || !nextChildren.length) {
                setLoading(false);
                return;
            }
            const savedId = getSelectedChildId();
            const selected = nextChildren.find(child => child.id === savedId) || nextChildren[0];
            setChildren(nextChildren);
            setSelectedChildId(selected.id);
            saveSelectedChild(selected);
            loadExercises(selected.id);
        });
    }, [API]);

    const exercise = exercises[index];

    function checkFillBlank() {
        if (!exercise || !answer.trim()) return;
        setFeedback(normalize(answer) === normalize(exercise.answer) ? 'Chính xác! Bé làm rất tốt.' : `Gần đúng rồi. Đáp án là: ${exercise.answer}`);
    }

    function startPronunciation() {
        if (!exercise) return;
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) {
            setFeedback('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bé hãy đọc to theo câu mẫu nhé.');
            return;
        }
        const recognition = new Recognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        setRecording(true);
        setFeedback('Mình đang lắng nghe bé...');
        recognition.onresult = (event: any) => {
            const spoken = event.results?.[0]?.[0]?.transcript || '';
            setFeedback(normalize(spoken) === normalize(exercise.answer) ? 'Phát âm rất tốt!' : `Bé đã nói: “${spoken}”. Thử đọc lại nhé!`);
        };
        recognition.onerror = () => setFeedback('Mình chưa nghe rõ. Bé thử lại nhé!');
        recognition.onend = () => setRecording(false);
        recognition.start();
    }

    function nextExercise() {
        setIndex(current => Math.min(current + 1, exercises.length - 1));
        setAnswer('');
        setFeedback('');
    }

    return (
        <main className="min-h-screen bg-[#f4faf4] px-5 py-8 text-[#203b35] lg:px-10">
            <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
                <Link href="/learn" className="flex items-center gap-2"><span className="text-3xl font-extrabold text-[#f47d52]">e<span className="text-[#6eaa83]">c</span>o</span><span className="border-l pl-2 text-xs font-black tracking-widest">KIDS<br /><small>ÔN LUYỆN</small></span></Link>
                <div className="flex items-center gap-3 text-sm font-bold"><span>Bé đang học</span><select value={selectedChildId} onChange={event => { const selected = children.find(child => child.id === event.target.value); if (!selected) return; setSelectedChildId(selected.id); saveSelectedChild(selected); loadExercises(selected.id); }} className="rounded-xl border border-[#dceadd] bg-white px-3 py-2"><option value="">Chọn bé</option>{children.map(child => <option key={child.id} value={child.id}>{child.avatar} {child.name}</option>)}</select></div>
            </header>
            <section className="mx-auto max-w-3xl py-12">
                <span className="font-bold text-[#ef7d32]">
                    Củng cố kiến thức
                </span>

                <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
                    Bài tập ôn luyện
                </h1>

                {loading ? (
                    <div className="mt-8 rounded-[2rem] bg-white p-8 text-center shadow-soft">
                        Đang tải bài ôn luyện...
                    </div>
                ) : !exercise ? (
                    <div className="mt-8 rounded-[2rem] bg-white p-8 text-center shadow-soft">
                        <p className="text-lg font-bold">
                            Chưa có bài ôn luyện mở khóa
                        </p>

                        <p className="mt-3 text-[#71867c]">
                            {feedback}
                        </p>

                        <Link
                            href="/learn"
                            className="mt-6 inline-block rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white"
                        >
                            Về danh sách bài học
                        </Link>
                    </div>
                ) : (
                    <article className="mt-8 rounded-[2rem] bg-white p-6 shadow-soft sm:p-10">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <span className="text-sm font-bold text-[#ef7d32]">
                                    Bài {index + 1} / {exercises.length}
                                </span>

                                <h2 className="mt-2 text-3xl font-extrabold">
                                    {exercise.title}
                                </h2>
                            </div>

                            <span className="rounded-full bg-[#eef8ef] px-3 py-2 text-xs font-black text-[#2d6358]">
                                {exercise.type === "PRONUNCIATION"
                                    ? "PHÁT ÂM"
                                    : "ĐIỀN TỪ"}
                            </span>
                        </div>

                        <p className="mt-8 rounded-2xl bg-[#fff6e8] p-5 text-xl font-bold leading-8">
                            {exercise.prompt}
                        </p>

                        {exercise.type === 'FILL_BLANK' && (
                            <div className="relative mt-6 overflow-hidden rounded-2xl bg-[#dceff0]">
                                {exercise.modelUrl ? (
                                    <iframe
                                        className="h-72 w-full"
                                        title={`Mô hình ${exercise.word || 'từ vựng'}`}
                                        src={exercise.modelUrl}
                                        frameBorder="0"
                                        allow="autoplay; fullscreen; xr-spatial-tracking"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className="grid h-72 place-items-center text-8xl">{exercise.shape || '🧩'}</div>
                                )}
                                <div className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-sm font-bold">
                                    {exercise.vietnamese || 'Nhìn mô hình và điền từ tiếng Anh'}
                                </div>
                            </div>
                        )}

                        {exercise.hint && (
                            <p className="mt-4 text-sm text-[#71867c]">
                                💡 Gợi ý: {exercise.hint}
                            </p>
                        )}

                        {exercise.type === "FILL_BLANK" ? (
                            <div className="mt-6 flex gap-3">
                                <input
                                    value={answer}
                                    onChange={(event) =>
                                        setAnswer(event.target.value)
                                    }
                                    onKeyDown={(event) =>
                                        event.key === "Enter" && checkFillBlank()
                                    }
                                    placeholder="Nhập đáp án của bé"
                                    className="min-w-0 flex-1 rounded-xl border border-[#dceadd] px-4 py-3 outline-none focus:border-[#2d6358]"
                                />

                                <button
                                    type="button"
                                    onClick={checkFillBlank}
                                    className="rounded-xl bg-[#2d6358] px-4 py-3 font-bold text-white"
                                >
                                    Kiểm tra
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={startPronunciation}
                                disabled={recording}
                                className="mt-6 w-full rounded-2xl bg-[#eef8ef] p-5 text-left font-bold disabled:opacity-60"
                            >
                                🎙️{" "}
                                {recording
                                    ? "Đang lắng nghe..."
                                    : "Chạm để đọc câu"}
                            </button>
                        )}

                        {feedback && (
                            <p className="mt-5 rounded-xl bg-[#f4faf4] p-4 font-bold text-[#2d6358]">
                                {feedback}
                            </p>
                        )}

                        <div className="mt-8 flex justify-end">
                            <button
                                type="button"
                                onClick={nextExercise}
                                disabled={index === exercises.length - 1}
                                className="rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white disabled:opacity-40"
                            >
                                Bài tiếp theo →
                            </button>
                        </div>
                    </article>
                )}
            </section>
        </main>
    );
}