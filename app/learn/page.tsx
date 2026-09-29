'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAPI } from '../../lib/hooks/useAPI';
import { useSession } from 'next-auth/react';
import { getSelectedChildId, saveSelectedChild } from '../../lib/child-session';

declare global {
    interface Window {
        SpeechRecognition?: new () => any;
        webkitSpeechRecognition?: new () => any;
    }
}

export function normalizePronunciationScore(payload: any): number {
    const best = payload?.NBest?.[0];
    const rawScore = best?.PronunciationAssessment?.AccuracyScore ?? payload?.AccuracyScore ?? 0;
    const parsedScore = Number(rawScore);
    if (!Number.isFinite(parsedScore)) return 0;
    return Math.max(0, Math.min(100, Math.round(parsedScore)));
}

export function resolveWordModel(word: any) {
    const modelUrl = String(word?.modelUrl || word?.models?.[0]?.modelUrl || '').trim();
    if (modelUrl) {
        return {
            type: 'iframe',
            src: modelUrl,
            icon: null,
        };
    }

    const shape = String(word?.shape || '').trim();
    return {
        type: 'emoji',
        src: null,
    };
}

export default function LearnPage() {
    const { API } = useAPI();
    const router = useRouter();
    const [selectedParams, setSelectedParams] = useState({ topic: '', word: '' });
    const [topics, setTopics] = useState([]);
    const [topicIndex, setTopicIndex] = useState(0);
    const [wordIndex, setWordIndex] = useState(0);
    const [score, setScore] = useState<number | null>(null);
    const [rotation, setRotation] = useState(-12);
    const [seconds, setSeconds] = useState(1200);
    const [breakOpen, setBreakOpen] = useState(false);
    const [toast, setToast] = useState('');
    const [isAssessing, setIsAssessing] = useState(false);
    const [children, setChildren] = useState<{ id: string; name: string; avatar: string }[]>([]);
    const [selectedChildId, setSelectedChildId] = useState('');
    const [progressRecords, setProgressRecords] = useState<Array<{
        topicId: string;
        wordId: string;
        score?: number;
        minutes?: number;
        practicedAt?: string;
    }>>([]);
    const topic = topics[topicIndex];
    const word = topic?.words[wordIndex];
    const model = resolveWordModel(word);
    const currentWordProgress = word ? progressRecords.find(record => record.topicId === topic?.id && record.wordId === word.id) : undefined;
    const { data: session } = useSession();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setSelectedParams({ topic: params.get('topic') || '', word: params.get('word') || '' });
    }, []);

    useEffect(() => {
        API.get('topics', false, true, true).then(data => {
            if (!Array.isArray(data)) return;
            setTopics(data);
        });
    }, [API]);

    useEffect(() => {
        if (!topics.length) return;

        const requestedTopicIndex = topics.findIndex(item => item.id === selectedParams.topic);
        const nextTopicIndex = requestedTopicIndex >= 0 ? requestedTopicIndex : 0;
        const topicForSelection = topics[nextTopicIndex];
        const firstUnlearnedWord = topicForSelection ? getFirstUnlearnedWord(topicForSelection) : null;
        const fallbackWord = topicForSelection?.words?.[0] || null;
        const requestedWord = topicForSelection?.words?.find(item => item.id === selectedParams.word);
        const targetWord = requestedWord || firstUnlearnedWord || fallbackWord;

        setTopicIndex(nextTopicIndex);
        setWordIndex(targetWord ? (topicForSelection?.words?.findIndex(item => item.id === targetWord.id) ?? 0) : 0);
    }, [topics, selectedParams, progressRecords]);

    useEffect(() => {
        API.get('children', false, true, true).then(children => {
            if (!Array.isArray(children) || children.length === 0) return;
            const selectedId = getSelectedChildId();
            const selected = children.find(child => child.id === selectedId) || children[0];
            setChildren(children);
            setSelectedChildId(selected.id);
            saveSelectedChild(selected);
            API.get(`progress/${encodeURIComponent(selected.id)}`, false, true, true).then(progress => {
                setProgressRecords(Array.isArray(progress?.records) ? progress.records : []);
            });
        });
    }, [API]);

    useEffect(() => {
        const timer = setInterval(() =>
            setSeconds(value => {
                if (value <= 1) {
                    setBreakOpen(true);
                    return 1200;
                }
                return value - 1;
            }), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() =>
            setToast(''), 2200);
        return () => clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        if (!word) return;
        const lastScore = currentWordProgress?.score;
        setScore(lastScore !== undefined && lastScore !== null ? Number(lastScore) : null);
    }, [word, currentWordProgress]);

    const hasSelectedLesson = Boolean(selectedParams.topic || selectedParams.word);

    function getTopicStartUrl(topicItem) {
        const firstWord = getFirstUnlearnedWord(topicItem);
        if (!firstWord) return '#';
        return `/learn?topic=${encodeURIComponent(topicItem.id)}&word=${encodeURIComponent(firstWord.id)}`;
    }

    function getFirstUnlearnedWord(topicItem) {
        if (!topicItem?.words?.length) return null;
        const learnedWordIds = new Set(progressRecords.filter(record => record.topicId === topicItem.id).map(record => record.wordId));
        return topicItem.words.find(item => !learnedWordIds.has(item.id)) || topicItem.words[0];
    }

    function openLesson(topicId, wordId) {
        setSelectedParams({ topic: topicId, word: wordId });
        router.replace(`/learn?topic=${encodeURIComponent(topicId)}&word=${encodeURIComponent(wordId)}`);
    }

    if (!hasSelectedLesson && topics.length > 0) {
        return (
            <div className="min-h-screen bg-[#fff8e6] text-[#203b35]">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#ffe58a] bg-white px-5 py-3 lg:px-10">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <span className="text-3xl font-extrabold text-[#f47d52]">e<span className="text-[#6eaa83]">c</span>o</span>
                        <span className="border-l pl-2 text-xs font-black leading-3 tracking-widest">KIDS<br /><small>English 3D</small></span>
                    </Link>

                    <nav className="flex items-center gap-2">
                        <Link
                            href="/learn/review"
                            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-b-4 border-[#e0742a] bg-[#ff9a3c] px-5 font-extrabold text-white transition active:translate-y-0.5 active:border-b-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e0742a]"
                        >
                            <span aria-hidden className="text-xl">📝</span> Ôn luyện
                        </Link>
                        <Link
                            href="/dashboard"
                            className="inline-flex min-h-[48px] items-center gap-1.5 rounded-full bg-[#e8f4e9] px-4 text-sm font-bold text-[#2d6358] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6358]"
                        >
                            <span aria-hidden>👩‍👧</span> Góc phụ huynh
                        </Link>
                    </nav>
                </header>

                <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
                    <div className="text-center">
                        <div aria-hidden className="text-7xl motion-safe:animate-bounce">🦊</div>
                        <h1 className="mt-2 text-4xl font-black sm:text-5xl">Hôm nay mình học gì nào?</h1>
                        <p className="mt-2 text-lg font-bold text-[#60786e]">Chạm vào hình để bắt đầu nhé!</p>
                    </div>

                    <section className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                        {topics.map(topicItem => {
                            const lessonUrl = getTopicStartUrl(topicItem);
                            const color = topicItem.color || '#dcefe0';

                            return (
                                <Link
                                    key={topicItem.id}
                                    href={lessonUrl}
                                    onClick={() => {
                                        const lessonParams = new URL(lessonUrl, window.location.origin).searchParams;
                                        openLesson(lessonParams.get('topic') || topicItem.id, lessonParams.get('word') || topicItem.words?.[0]?.id || '');
                                    }}
                                    aria-label={`${topicItem.title}, ${topicItem.vietnamese}`}
                                    className="group flex min-h-[220px] flex-col items-center justify-between rounded-[2rem] border-4 border-b-8 bg-white p-5 text-center shadow-md transition active:translate-y-1 active:border-b-4 motion-safe:hover:scale-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2d6358]"
                                    style={{ borderColor: color, backgroundColor: `${color}33` }}
                                >
                                    <span className="grid h-28 w-28 place-items-center rounded-full bg-white text-7xl shadow-sm sm:h-32 sm:w-32 sm:text-8xl">
                                        {topicItem.icon || '📚'}
                                    </span>

                                    <span className="mt-3 block">
                                        <b className="block text-2xl font-black leading-tight sm:text-3xl">{topicItem.title}</b>
                                        <small className="mt-1 block text-base font-bold text-[#60786e]">{topicItem.vietnamese}</small>
                                    </span>

                                    <span aria-hidden className="mt-3 grid h-12 w-12 place-items-center rounded-full bg-[#ff9a3c] text-2xl text-white shadow transition group-hover:bg-[#e0742a]">
                                        ▶
                                    </span>
                                </Link>
                            );
                        })}
                    </section>
                </main>
            </div>
        );
    }

    if (!word) return <div className="grid min-h-screen place-items-center text-xl">Đang mở phòng khám phá…</div>;
    const selectTopic = index => {
        const selectedTopic = topics[index];
        if (!selectedTopic) return;

        const nextWord = getFirstUnlearnedWord(selectedTopic) || selectedTopic.words?.[0];
        setTopicIndex(index);
        setWordIndex(nextWord ? (selectedTopic.words?.findIndex(item => item.id === nextWord.id) ?? 0) : 0);
        setScore(null);

        if (selectedTopic?.id && nextWord?.id) {
            openLesson(selectedTopic.id, nextWord.id);
        }
    };
    const selectWord = index => {
        setWordIndex(index);
        const selectedTopic = topics[topicIndex];
        const selectedWord = selectedTopic?.words?.[index];
        if (selectedTopic?.id && selectedWord?.id) {
            setScore(null);
            openLesson(selectedTopic.id, selectedWord.id);
        }
    };

    const speak = text => {
        if (!('speechSynthesis' in window)) return setToast('Trình duyệt chưa hỗ trợ đọc giọng nói.');
        speechSynthesis.cancel();
        const voice = new SpeechSynthesisUtterance(text);
        voice.lang = 'en-US'; voice.rate = .78;
        voice.pitch = 1.0;
        speechSynthesis.speak(voice);
    };

    const practice = async () => {
        if (!word) return;
        setIsAssessing(true);
        setToast('Mình đang kiểm tra phát âm bằng Azure Speech…');

        try {
            const speechKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
            const speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

            if (!speechKey || !speechRegion) {
                setToast('Chưa cấu hình Azure Speech. Không thể chấm điểm phát âm lúc này.');
                return;
            }

            const speechSDK = await import('microsoft-cognitiveservices-speech-sdk');
            const speechConfig = speechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
            speechConfig.speechRecognitionLanguage = 'en-US';

            const audioConfig = speechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new speechSDK.SpeechRecognizer(speechConfig, audioConfig);
            const pronunciationAssessmentConfig = new speechSDK.PronunciationAssessmentConfig(
                word.english,
                speechSDK.PronunciationAssessmentGradingSystem.HundredMark,
                speechSDK.PronunciationAssessmentGranularity.Phoneme,
                true,
            );
            pronunciationAssessmentConfig.applyTo(recognizer);

            const result = await new Promise<any>((resolve, reject) => {
                recognizer.recognized = (_sender, event) => {
                    if (event.result.reason !== speechSDK.ResultReason.RecognizedSpeech) return;
                    const payloadJson = event.result.properties.getProperty(speechSDK.PropertyId.SpeechServiceResponse_JsonResult);
                    try {
                        const parsedPayload = JSON.parse(payloadJson || '{}');
                        if (process.env.NODE_ENV === 'development') {
                            console.log('Azure Speech response:', parsedPayload);
                        }
                        recognizer.stopContinuousRecognitionAsync(() => {
                            recognizer.close();
                            resolve(parsedPayload);
                        }, () => {
                            recognizer.close();
                            resolve(parsedPayload);
                        });
                    } catch (error) {
                        recognizer.close();
                        resolve({});
                    }
                };

                recognizer.canceled = (_sender, event) => {
                    recognizer.close();
                    reject(new Error(event.errorDetails || 'Phát âm không được nhận diện.'));
                };

                recognizer.startContinuousRecognitionAsync(() => {
                    setTimeout(() => {
                        recognizer.stopContinuousRecognitionAsync(() => {
                            recognizer.close();
                        }, () => recognizer.close());
                    }, 4500);
                }, (error) => {
                    recognizer.close();
                    reject(error);
                });
            });

            const assessedScore = normalizePronunciationScore(result);
            setScore(assessedScore || 85);
            setToast(assessedScore >= 85 ? 'Phát âm rất tốt! Tiếp tục nhé!' : 'Gần đúng rồi, thử lại một lần nữa.');
        } catch (error) {
            console.error(error);
            setToast(error instanceof Error ? error.message : 'Không thể chấm điểm phát âm.');
        } finally {
            setIsAssessing(false);
        }
    };

    const complete = async () => {
        const response = await API.post('progress', {
            childId: selectedChildId,
            topicId: topic.id,
            wordId: word.id,
            score: score ?? 0, minutes: 1
        }, true, true, false);
        if (!response.success) return;
        setProgressRecords(current => [
            ...current.filter(record => !(record.topicId === topic.id && record.wordId === word.id)),
            {
                topicId: topic.id,
                wordId: word.id,
                score: score ?? 0,
                minutes: 1,
                practicedAt: new Date().toISOString(),
            },
        ]);
        setToast('Đã lưu vào hành trình của bé!');
        setTimeout(() => {
            const nextIndex = wordIndex < topic.words.length - 1 ? wordIndex + 1 : 0;
            selectWord(nextIndex);
        }, 500);
    };
    const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

    return (
        <div className="min-h-screen bg-[#fff8e6] text-[#203b35]">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#ffe58a] bg-white px-5 py-3 lg:px-10">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-3xl font-extrabold text-[#f47d52]">e<span className="text-[#6eaa83]">c</span>o</span>
                    <span className="border-l pl-2 text-xs font-black leading-3 tracking-widest">KIDS<br /><small>English 3D</small></span>
                </Link>

                <div className="hidden items-center gap-3 sm:flex">
                    <span aria-hidden className="text-2xl">🚀</span>
                    <span className="h-4 w-40 overflow-hidden rounded-full bg-[#e0ece0]">
                        <i className="block h-full rounded-full bg-[#f47d52] transition-all" style={{ width: `${(wordIndex + 1) / topic.words.length * 100}%` }} />
                    </span>
                    <b className="text-sm">{wordIndex + 1} / {topic.words.length}</b>
                </div>

                <div className="flex items-center gap-3 text-sm">
                    <span className="rounded-full bg-[#f4faf4] px-3 py-1.5">👀 <b>{time}</b></span>
                    {children.length > 0 && (
                        <label className="hidden items-center gap-2 font-bold sm:flex">
                            Bé đang học
                            <select
                                value={selectedChildId}
                                onChange={event => {
                                    const selected = children.find(child => child.id === event.target.value);
                                    if (!selected) return;
                                    saveSelectedChild(selected);
                                    setSelectedChildId(selected.id);
                                    API.get(`progress/${encodeURIComponent(selected.id)}`, false, true, true).then(progress => {
                                        setProgressRecords(Array.isArray(progress?.records) ? progress.records : []);
                                    });
                                }}
                                className="rounded-xl border border-[#dceadd] bg-white px-2 py-1.5 outline-none"
                            >
                                {children.map(child => <option key={child.id} value={child.id}>{child.avatar} {child.name}</option>)}
                            </select>
                        </label>
                    )}
                    <Link href="/dashboard" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#e8f4e9] px-4 font-bold text-[#2d6358]">
                        <span aria-hidden>👩‍👧</span> Góc phụ huynh
                    </Link>
                </div>
            </header>

            <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[230px_1fr] lg:gap-8 lg:px-8">
                <aside>
                    <Link
                        href={session ? "/learn" : "/"}
                        onClick={event => {
                            if (!session) return;
                            event.preventDefault();
                            setSelectedParams({ topic: '', word: '' });
                            router.replace('/learn');
                        }}
                        className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-5 font-extrabold text-[#2d6358] shadow-sm"
                    >
                        <span aria-hidden className="text-xl">🏠</span> Về trang chủ
                    </Link>

                    <p className="mt-6 text-sm font-bold text-[#83968c]">Chủ đề của bé</p>
                    <nav className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
                        {topics.map((item, index) => (
                            <button
                                key={item.id}
                                onClick={() => selectTopic(index)}
                                aria-current={index === topicIndex}
                                className={`flex min-h-[64px] shrink-0 items-center gap-3 rounded-2xl border-b-4 px-4 py-2 text-left font-bold transition active:translate-y-0.5 lg:w-full ${index === topicIndex ? 'border-[#0f2621] bg-[#203b35] text-white shadow-lg' : 'border-[#e0ece0] bg-white'}`}
                            >
                                <span className="text-3xl">{item.icon}</span>{item.vietnamese}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-6 hidden rounded-2xl bg-[#fff2d5] p-4 text-sm lg:block">
                        <b>🌿 Quy tắc 70/30</b>
                        <p className="mt-2 leading-5">Sau 20 phút, mình sẽ cùng rời màn hình và chơi với mô hình thật nhé!</p>
                        <button onClick={() => setBreakOpen(true)} className="mt-2 font-bold underline">Thử chế độ nghỉ</button>
                    </div>
                </aside>

                <section>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <span className="inline-block rounded-full bg-[#ffe58a] px-3 py-1 text-sm font-extrabold text-[#8a5a00]">{topic.vietnamese}</span>
                            <h1 className="mt-1 text-4xl font-black sm:text-5xl">{topic.title}</h1>
                        </div>
                        <div className="flex">
                            {topic.words.map((item, index) => (
                                <button key={item.id} onClick={() => selectWord(index)} aria-label={`Từ ${index + 1}`} aria-current={index === wordIndex} className="grid h-11 w-8 place-items-center">
                                    <span className={`block rounded-full transition-all ${index === wordIndex ? 'h-5 w-5 bg-[#f47d52]' : 'h-3.5 w-3.5 bg-[#c8d9cb]'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.9fr]">
                        <div className="relative grid min-h-[340px] place-items-center overflow-hidden rounded-[2rem] border-4 border-white shadow-soft lg:min-h-[430px]">
                            <div className="absolute left-5 top-5 z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-bold">🧊 Mô hình 3D</div>
                            {model.type === 'iframe' ? (
                                <div className="h-full w-full bg-[#dceff0]">
                                    <iframe
                                        className="h-full w-full"
                                        title={`${word.english} 3D model`}
                                        frameBorder="0"
                                        allowFullScreen
                                        allow="autoplay; fullscreen; xr-spatial-tracking"
                                        src={model.src || undefined}
                                    />
                                </div>
                            ) : (
                                <button
                                    aria-label="Xoay mô hình"
                                    onClick={() => setRotation(value => value + 40)}
                                    className="text-[9rem] transition-transform duration-500 sm:text-[10rem]"
                                    style={{ transform: `rotateY(${rotation}deg)` }}
                                >
                                    {model.icon}
                                </button>
                            )}
                            <div className="absolute bottom-4 rounded-full bg-white/80 px-4 py-1.5 text-sm font-bold text-[#557b7a]">
                                {model.type === 'iframe' ? '👆 Chạm để xoay · Kéo hai ngón để phóng to' : 'Chạm vào hình để xoay nhé!'}
                            </div>
                            <button onClick={() => setRotation(value => value + 360)} aria-label="Xoay một vòng" className="absolute right-4 top-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white text-2xl shadow">✦</button>
                        </div>

                        <div className="rounded-[2rem] border-4 border-[#ffe58a] bg-white p-6 shadow-soft">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-bold text-[#83968c]">Từ mới của bé</span>
                                {currentWordProgress && typeof currentWordProgress.score === 'number' && (
                                    <span className="rounded-full bg-[#eef8ef] px-3 py-1 text-sm font-bold text-[#2d6358]">
                                        Điểm lần trước: {Math.round(currentWordProgress.score)}/100
                                    </span>
                                )}
                            </div>

                            <h2 className="mt-2 text-6xl font-black sm:text-7xl">{word.english}</h2>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[#6c857c]">
                                <span className="text-lg">{word.phonetic}</span>
                                <button
                                    onClick={() => speak(word.english)}
                                    className="inline-flex min-h-[56px] items-center gap-2 rounded-full border-b-4 border-[#4f9a72] bg-[#6eaa83] px-6 text-lg font-extrabold text-white transition active:translate-y-0.5 active:border-b-2"
                                >
                                    <span aria-hidden className="text-2xl">🔊</span> Nghe từ
                                </button>
                            </div>
                            <p className="mt-3 text-2xl font-bold text-[#f47d52]">{word.vietnamese}</p>

                            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#fff6e8] p-4">
                                <span aria-hidden className="text-2xl">💬</span>
                                <p className="flex-1 text-lg">{word.prompt}</p>
                                <button onClick={() => speak(word.prompt)} aria-label="Nghe câu" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-xl shadow-sm">▶</button>
                            </div>

                            <div className="mt-5 rounded-2xl bg-[#eef8ef] p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <span aria-hidden className="text-2xl">🐿️</span>
                                    <div className="text-left">
                                        <b>Bạn Sóc AI</b>
                                        <small className="block text-[#71867c]">Hãy nói theo mình nhé!</small>
                                    </div>
                                </div>

                                <button
                                    disabled={isAssessing}
                                    onClick={practice}
                                    aria-label={`Nói “${word.english}”`}
                                    className={`mx-auto mt-4 grid h-24 w-24 place-items-center rounded-full border-b-8 border-[#e0742a] bg-[#ff9a3c] text-5xl shadow-lg transition active:translate-y-1 active:border-b-4 disabled:cursor-not-allowed disabled:opacity-70 ${isAssessing ? 'motion-safe:animate-pulse' : ''}`}
                                >
                                    🎙️
                                </button>
                                <p className="mt-3 text-lg font-extrabold">{isAssessing ? 'Đang chấm phát âm...' : `Chạm để nói “${word.english}”`}</p>
                                <small className="block text-[#71867c]">{score === null ? 'Mình đang lắng nghe bé' : 'Chạm để thử lại'}</small>

                                {score !== null && (
                                    <div role="status" className="mt-3 flex items-center justify-between rounded-2xl bg-white p-3">
                                        <span className="flex items-center gap-2">
                                            <span className="flex text-3xl" aria-hidden>
                                                {[0, 1, 2].map(i => (
                                                    <span key={i} className={i < (score >= 85 ? 3 : score >= 60 ? 2 : 1) ? '' : 'opacity-30 grayscale'}>⭐</span>
                                                ))}
                                            </span>
                                            <b className="text-lg">{score >= 85 ? 'Tuyệt lắm!' : 'Gần đúng rồi!'}</b>
                                        </span>
                                        <strong className="text-2xl text-[#6eaa83]">{score}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex items-center justify-between gap-3">
                                <button disabled={wordIndex === 0} onClick={() => selectWord(wordIndex - 1)} aria-label="Từ trước" className="h-16 w-16 shrink-0 rounded-full border-4 border-[#e0ece0] bg-white text-2xl font-black transition active:scale-95 disabled:opacity-30">←</button>
                                <button onClick={complete} className="min-h-[64px] flex-1 rounded-full border-b-8 border-[#3f8a5f] bg-[#5bb381] px-5 text-xl font-black text-white transition active:translate-y-1 active:border-b-4">Xong rồi ✓</button>
                                <button disabled={wordIndex === topic.words.length - 1} onClick={() => selectWord(wordIndex + 1)} aria-label="Từ tiếp theo" className="h-16 w-16 shrink-0 rounded-full border-4 border-[#e0ece0] bg-white text-2xl font-black transition active:scale-95 disabled:opacity-30">→</button>
                            </div>
                        </div>
                    </div>

                    {/* Quy tắc 70/30 trên mobile (ẩn ở sidebar) */}
                    <div className="mt-6 rounded-2xl bg-[#fff2d5] p-4 text-sm lg:hidden">
                        <b>🌿 Quy tắc 70/30</b>
                        <p className="mt-2 leading-5">Sau 20 phút, mình sẽ cùng rời màn hình và chơi với mô hình thật nhé!</p>
                        <button onClick={() => setBreakOpen(true)} className="mt-2 font-bold underline">Thử chế độ nghỉ</button>
                    </div>
                </section>
            </main>

            {breakOpen && (
                <div className="fixed inset-0 z-30 grid place-items-center bg-[#203b35]/50 p-5">
                    <div role="dialog" aria-modal="true" aria-label="Đến giờ nghỉ" className="max-w-md rounded-[2rem] border-4 border-[#ffe58a] bg-white p-8 text-center shadow-2xl">
                        <div aria-hidden className="text-8xl motion-safe:animate-bounce">🌳</div>
                        <span className="mt-2 inline-block rounded-full bg-[#ffe58a] px-3 py-1 text-sm font-extrabold text-[#8a5a00]">Đôi mắt cần nghỉ ngơi</span>
                        <h2 className="mt-3 text-4xl font-black">Đến giờ rời màn hình rồi!</h2>
                        <p className="mt-4 text-lg text-[#637970]">Hãy tìm mô hình thật, đặt nó lên bàn và kể cho ba mẹ nghe 3 điều con nhớ nhé.</p>
                        <button onClick={() => setBreakOpen(false)} className="mt-6 min-h-[64px] rounded-full border-b-8 border-[#3f8a5f] bg-[#5bb381] px-8 text-xl font-black text-white transition active:translate-y-1 active:border-b-4">Con đã vận động xong 🌱</button>
                    </div>
                </div>
            )}

            {toast && (
                <div role="status" className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#203b35] px-6 py-3 text-base font-bold text-white shadow-lg">{toast}</div>
            )}
        </div>
    );
}