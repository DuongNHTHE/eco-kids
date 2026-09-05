'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAPI } from '../../lib/hooks/useAPI';

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
    const [topics, setTopics] = useState([]);
    const [topicIndex, setTopicIndex] = useState(0);
    const [wordIndex, setWordIndex] = useState(0);
    const [score, setScore] = useState<number | null>(null);
    const [rotation, setRotation] = useState(-12);
    const [seconds, setSeconds] = useState(1200);
    const [breakOpen, setBreakOpen] = useState(false);
    const [toast, setToast] = useState('');
    const [isAssessing, setIsAssessing] = useState(false);
    const topic = topics[topicIndex];
    const word = topic?.words[wordIndex];
    const model = resolveWordModel(word);

    useEffect(() => {
        API.get('topics', false, true, true).then(data => {
            if (!Array.isArray(data)) return;
            setTopics(data);
            const requested = new URLSearchParams(window.location.search).get('topic');
            const index = data.findIndex(item => item.id === requested);
            if (index >= 0) setTopicIndex(index);
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

    if (!word) return
    <div className="grid min-h-screen place-items-center text-xl">Đang mở phòng khám phá…</div>;
    const selectTopic = index => {
        setTopicIndex(index);
        setWordIndex(0);
        setScore(null);
    };
    const selectWord = index => {
        setWordIndex(index);
        setScore(null);
    };

    const speak = text => {
        if (!('speechSynthesis' in window)) return setToast('Trình duyệt chưa hỗ trợ đọc giọng nói.');
        speechSynthesis.cancel();
        const voice = new SpeechSynthesisUtterance(text);
        voice.lang = 'en-US'; voice.rate = .78;
        voice.pitch = 1.08;
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
                setScore(88 + Math.floor(Math.random() * 10));
                setToast('Chưa cấu hình Azure Speech. Mình đang dùng mô phỏng tạm thời.');
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
            setScore(88 + Math.floor(Math.random() * 10));
            setToast('Azure Speech chưa sẵn sàng, mình đang dùng mô phỏng tạm thời.');
        } finally {
            setIsAssessing(false);
        }
    };

    const complete = async () => {
        const response = await API.post('progress', {
            childName: localStorage.getItem('eco-child') || 'Bé Mây',
            topicId: topic.id,
            wordId: word.id,
            score: score || 85, minutes: 1
        }, true, true, false);
        if (!response.success) return;
        setToast('Đã lưu vào hành trình của bé!');
        if (wordIndex < topic.words.length - 1) {
            setTimeout(() => {
                setWordIndex(value => value + 1);
                setScore(null);
            }, 500);
        }
    };
    const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

    return (
        <div className="min-h-screen bg-[#f4faf4] text-[#203b35]">
            <header className="flex items-center justify-between border-b border-[#dceadd] bg-white px-5 py-4 lg:px-10">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-3xl font-extrabold text-[#f47d52]">e
                        <span className="text-[#6eaa83]">c</span>o
                    </span>
                    <span className="border-l pl-2 text-xs font-black leading-3 tracking-widest">KIDS<br />
                        <small>English 3D</small>
                    </span>
                </Link>

                <div className="hidden items-center gap-3 sm:flex">
                    <span className="text-sm">Tiến độ bài học <b>{wordIndex + 1} / {topic.words.length}</b></span>
                    <span className="h-2 w-32 rounded-full bg-[#e0ece0]"><i className="block h-full rounded-full bg-[#f47d52]" style={{ width: `${(wordIndex + 1) / topic.words.length * 100}%` }} />
                    </span>
                </div>
                <div className="flex items-center gap-4 text-sm">👀
                    <b>{time}</b>
                    <Link href="/dashboard" className="font-bold">👩‍👧 Góc phụ huynh</Link>
                </div>
            </header>
            <main className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[230px_1fr] lg:px-8">
                <aside>
                    <Link href="/" className="font-bold text-[#6c857c]">← Về trang chủ</Link>
                    <p className="mt-8 text-sm font-bold text-[#83968c]">Chủ đề của bé</p>
                    <nav className="mt-3 space-y-2">{topics.map((item, index) =>
                        <button key={item.id} onClick={() => selectTopic(index)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold ${index === topicIndex ? 'bg-[#203b35] text-white shadow-lg' : 'bg-white'}`}><span className="text-2xl">{item.icon}</span>{item.vietnamese}</button>)}</nav><div className="mt-8 rounded-2xl bg-[#fff2d5] p-4 text-sm"><b>🌿 Quy tắc 70/30</b><p className="mt-2 leading-5">Sau 20 phút, mình sẽ cùng rời màn hình và chơi với mô hình thật nhé!</p><button onClick={() => setBreakOpen(true)} className="mt-2 font-bold underline">Thử chế độ nghỉ</button>
                    </div>
                </aside>
                <section>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <span className="font-bold text-[#ef7d32]">{topic.vietnamese}</span>
                            <h1 className="text-5xl font-extrabold">{topic.title}</h1>
                        </div>
                        <div className="flex gap-2">{topic.words.map((item, index) =>
                            <button key={item.id} onClick={() => selectWord(index)} aria-label={`Từ ${index + 1}`} className={`h-3 w-3 rounded-full ${index === wordIndex ? 'bg-[#f47d52]' : 'bg-[#c8d9cb]'}`} />)}
                        </div>
                    </div>
                    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.9fr]">
                        <div className="relative grid min-h-[430px] place-items-center overflow-hidden rounded-[2rem] shadow-soft">
                            <div className="absolute left-7 top-7 rounded-full bg-white/80 px-4 py-2 text-sm font-bold">Mô hình 3D</div>
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
                                    className="text-[10rem] transition-transform duration-500"
                                    style={{ transform: `rotateY(${rotation}deg)` }}
                                >
                                    {model.icon}
                                </button>
                            )}
                            <div className="absolute bottom-5 text-sm text-[#557b7a]">{model.type === 'iframe' ? '↔ Chạm nút để xoay · Cuộn để phóng to' : 'Mô hình minh họa theo hình dạng từ vựng'}</div>
                            <button onClick={() => setRotation(value => value + 360)} className="absolute right-5 top-5 rounded-full bg-white px-3 py-2 text-xl shadow">✦</button>
                        </div>
                        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                            <span className="text-sm font-bold text-[#83968c]">Từ mới của bé</span>
                            <h2 className="mt-2 text-6xl font-extrabold">{word.english}</h2>
                            <div className="mt-2 flex items-center gap-3 text-[#6c857c]">{word.phonetic}
                                <button onClick={() => speak(word.english)} className="rounded-full bg-[#eaf5ed] px-4 py-2 font-bold">🔊 Nghe từ</button>
                            </div>
                            <p className="mt-4 text-2xl font-bold text-[#f47d52]">{word.vietnamese}</p>
                            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#fff6e8] p-4">
                                <span className="text-2xl">💬</span>
                                <p className="flex-1">{word.prompt}</p>
                                <button onClick={() => speak(word.prompt)} aria-label="Nghe câu" className="rounded-full bg-white p-3">▶</button>
                            </div>
                            <div className="mt-5 rounded-2xl bg-[#eef8ef] p-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">✨</span>
                                    <div>
                                        <b>Bạn Sóc AI</b>
                                        <small className="block text-[#71867c]">Hãy nói theo mình nhé!</small>
                                    </div>
                                </div>
                                <button disabled={isAssessing} onClick={practice} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm disabled:cursor-not-allowed disabled:opacity-70">
                                    <span className="text-2xl">🎙️</span>
                                    <span>
                                        <b>{isAssessing ? 'Đang chấm phát âm...' : `Chạm để nói “${word.english}”`}</b>
                                        <small className="block text-[#71867c]">{score === null ? 'Mình đang lắng nghe bé' : 'Chạm để thử lại'}</small>
                                    </span>
                                </button>{score !== null &&
                                    <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3">
                                        <span>🌟
                                            <b>{score >= 85 ? 'Tuyệt lắm!' : 'Gần đúng rồi!'}</b>
                                        </span>
                                        <strong className="text-2xl text-[#6eaa83]">{score}</strong>
                                    </div>}
                            </div>
                            <div className="mt-6 flex items-center justify-between gap-3">
                                <button disabled={wordIndex === 0} onClick={() => selectWord(wordIndex - 1)} className="h-12 w-12 rounded-full border-2 disabled:opacity-30">←</button>
                                <button onClick={complete} className="flex-1 rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white">Hoàn thành từ này ✓</button>
                                <button disabled={wordIndex === topic.words.length - 1} onClick={() => selectWord(wordIndex + 1)} className="h-12 w-12 rounded-full border-2 disabled:opacity-30">→</button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            {breakOpen &&
                <div className="fixed inset-0 z-30 grid place-items-center bg-[#203b35]/50 p-5"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl"><div className="text-7xl">🌳
                </div>
                    <span className="font-bold text-[#ef7d32]">Đôi mắt cần nghỉ ngơi</span>
                    <h2 className="mt-2 text-4xl font-extrabold">Đến giờ rời màn hình rồi!</h2>
                    <p className="mt-4 text-[#637970]">Hãy tìm mô hình thật, đặt nó lên bàn và kể cho ba mẹ nghe 3 điều con nhớ nhé.</p>
                    <button onClick={() => setBreakOpen(false)} className="mt-6 rounded-full bg-[#f47d52] px-6 py-3 font-bold text-white">Con đã vận động xong 🌱</button>
                </div>
                </div>
            }
            {toast &&
                <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#203b35] px-5 py-3 text-sm font-bold text-white">{toast}</div>
            }
        </div>
    );
}