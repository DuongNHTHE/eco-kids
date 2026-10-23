'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAPI } from '../../../lib/hooks/useAPI';
import { getSelectedChildId, saveSelectedChild } from '../../../lib/child-session';
import { resolveRoleHome } from '../../../lib/auth';
import { LISTEN_AND_MATCH_ID } from '../../../src/game-config';

type GameItem = {
    id: string;
    name: string;
    translation: string;
    emoji: string;
    imageUrl: string;
};

type GameTheme = {
    id: string;
    title: string;
    items: GameItem[];
};

type GameConfig = {
    gameId: string;
    isActive: boolean;
    themes: GameTheme[];
};

type ChildProfile = {
    id: string;
    name: string;
    avatar: string;
    birthDate?: string | null;
};

type SpeechAssessment = {
    NBest?: Array<{
        Display?: string;
        PronunciationAssessment?: { AccuracyScore?: number };
    }>;
};

const BADGE_KEY = 'eco-badge-little-speaker';
const PASSING_SCORE = 55;

function getAge(birthDate?: string | null) {
    if (!birthDate) return null;
    const birthday = new Date(birthDate);
    if (Number.isNaN(birthday.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    if (
        today.getMonth() < birthday.getMonth()
        || (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate())
    ) {
        age -= 1;
    }
    return age >= 0 ? age : null;
}

function getExpectedResponse(item: GameItem, isSentenceLevel: boolean) {
    if (!isSentenceLevel) return item.name;
    const article = /^[aeiou]/i.test(item.name.trim()) ? 'an' : 'a';
    return `It's ${article} ${item.name}.`;
}

function shuffle<T>(items: T[]) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    return shuffled;
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
    return <span aria-hidden className="select-none text-8xl sm:text-9xl">{item.emoji || '✨'}</span>;
}

export default function SayItWithAIPage() {
    const { API } = useAPI();
    const router = useRouter();
    const { data: session, status } = useSession();
    const role = (session?.user as { role?: string } | undefined)?.role;
    const [config, setConfig] = useState<GameConfig | null>(null);
    const [gameLoading, setGameLoading] = useState(true);
    const [gameError, setGameError] = useState('');
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [childrenLoading, setChildrenLoading] = useState(true);
    const [childError, setChildError] = useState('');
    const [selectedChildId, setSelectedChildId] = useState('');
    const [mode, setMode] = useState<'themes' | 'playing' | 'complete'>('themes');
    const [selectedTheme, setSelectedTheme] = useState<GameTheme | null>(null);
    const [roundItems, setRoundItems] = useState<GameItem[]>([]);
    const [roundIndex, setRoundIndex] = useState(0);
    const [score, setScore] = useState<number | null>(null);
    const [recognizedText, setRecognizedText] = useState('');
    const [coachMessage, setCoachMessage] = useState('');
    const [message, setMessage] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
    const [badgeEarned, setBadgeEarned] = useState(false);
    const [badgeSaved, setBadgeSaved] = useState(false);
    const [badgeStorageError, setBadgeStorageError] = useState('');
    const requestId = useRef(0);
    const activeRecognizer = useRef<{ close: () => void } | null>(null);

    const selectedChild = children.find(child => child.id === selectedChildId);
    const age = getAge(selectedChild?.birthDate);
    const isSentenceLevel = age !== null && age >= 6;
    const currentItem = roundItems[roundIndex];
    const expectedResponse = currentItem ? getExpectedResponse(currentItem, isSentenceLevel) : '';
    const badgeStorageKey = `${BADGE_KEY}:${selectedChildId || 'guest'}`;

    const speak = useCallback((text: string) => {
        if (!('speechSynthesis' in window)) {
            setMessage('Trình duyệt chưa hỗ trợ đọc giọng nói. Bé vẫn có thể chơi bằng cách nhìn hình và trả lời.');
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }, []);

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
            else setGameError(result?.message || 'Trò chơi hiện chưa được mở.');
        }).finally(() => {
            if (current) setGameLoading(false);
        });

        API.get('children', false, false, false).then(result => {
            if (!current) return;
            if (!Array.isArray(result)) {
                setChildError(result?.message || 'Không thể tải hồ sơ của bé.');
                return;
            }
            const profiles = result as ChildProfile[];
            setChildren(profiles);
            const savedId = getSelectedChildId();
            const child = profiles.find(profile => profile.id === savedId) || profiles[0];
            if (child) {
                setSelectedChildId(child.id);
                saveSelectedChild(child);
            }
        }).finally(() => {
            if (current) setChildrenLoading(false);
        });

        return () => { current = false; };
    }, [API, role, status]);

    useEffect(() => {
        try {
            const earned = window.localStorage.getItem(`${BADGE_KEY}:${selectedChildId || 'guest'}`) === 'true';
            setBadgeEarned(earned);
            setBadgeSaved(earned);
        } catch (error) {
            console.error('[say-it-with-ai] Could not read badge storage:', error);
            setBadgeEarned(false);
            setBadgeSaved(false);
            setBadgeStorageError('Thiết bị chưa cho phép kiểm tra huy hiệu đã lưu.');
        }
    }, [selectedChildId]);

    useEffect(() => {
        if (mode !== 'playing' || !currentItem) return;
        const timer = window.setTimeout(() => speak('What is this?'), 300);
        return () => window.clearTimeout(timer);
    }, [currentItem, mode, speak]);

    useEffect(() => () => {
        requestId.current += 1;
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        activeRecognizer.current?.close();
        activeRecognizer.current = null;
    }, []);

    const themes = useMemo(() => config?.themes || [], [config]);

    function selectChild(childId: string) {
        const child = children.find(profile => profile.id === childId);
        cancelSpeechAssessment();
        setSelectedChildId(childId);
        setMode('themes');
        setSelectedTheme(null);
        setRoundItems([]);
        setScore(null);
        setCoachMessage('');
        setMessage('');
        if (child) saveSelectedChild(child);
    }

    function startTheme(theme: GameTheme) {
        const availableItems = theme.items.filter(item => item.name.trim());
        const roundLimit = isSentenceLevel ? 5 : 3;
        const selectedItems = shuffle(availableItems).slice(0, roundLimit);
        if (selectedItems.length === 0) {
            setMessage('Chủ đề này chưa có từ vựng để luyện nói.');
            return;
        }
        setSelectedTheme(theme);
        setRoundItems(selectedItems);
        setRoundIndex(0);
        setScore(null);
        setRecognizedText('');
        setCoachMessage('');
        setMessage('');
        setMode('playing');
    }

    function cancelSpeechAssessment() {
        requestId.current += 1;
        activeRecognizer.current?.close();
        activeRecognizer.current = null;
        setIsListening(false);
        setIsGeneratingAdvice(false);
    }

    async function assessSpeech() {
        if (!currentItem || isListening) return;
        const currentRequestId = ++requestId.current;
        setIsListening(true);
        setScore(null);
        setRecognizedText('');
        setCoachMessage('');
        setMessage('Bé nói câu trả lời bằng tiếng Anh vào micro nhé…');

        try {
            const speechKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
            const speechRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;
            if (!speechKey || !speechRegion) {
                throw new Error('Trò chơi chưa được cấu hình Azure Speech. Vui lòng thử lại sau.');
            }

            const speechSDK = await import('microsoft-cognitiveservices-speech-sdk');
            if (currentRequestId !== requestId.current) return;
            const speechConfig = speechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
            speechConfig.speechRecognitionLanguage = 'en-US';
            speechConfig.setProperty(speechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, '10000');
            speechConfig.setProperty(speechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, '3000');
            const audioConfig = speechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new speechSDK.SpeechRecognizer(speechConfig, audioConfig);

            const assessmentConfig = new speechSDK.PronunciationAssessmentConfig(
                expectedResponse,
                speechSDK.PronunciationAssessmentGradingSystem.HundredMark,
                speechSDK.PronunciationAssessmentGranularity.Phoneme,
                true,
            );
            assessmentConfig.applyTo(recognizer);

            const result = await new Promise<SpeechAssessment | null>((resolve, reject) => {
                let isClosed = false;
                let activeRecognition: { close: () => void };
                const closeRecognizer = () => {
                    if (isClosed) return;
                    isClosed = true;
                    recognizer.close();
                    if (activeRecognizer.current === activeRecognition) activeRecognizer.current = null;
                };
                activeRecognition = { close: closeRecognizer };
                activeRecognizer.current = activeRecognition;
                recognizer.recognizeOnceAsync(recognitionResult => {
                    try {
                        if (recognitionResult.reason !== speechSDK.ResultReason.RecognizedSpeech) {
                            resolve(null);
                            return;
                        }
                        const payload = recognitionResult.properties.getProperty(
                            speechSDK.PropertyId.SpeechServiceResponse_JsonResult,
                        );
                        resolve(JSON.parse(payload || '{}') as SpeechAssessment);
                    } catch (error) {
                        reject(error);
                    } finally {
                        closeRecognizer();
                    }
                }, error => {
                    closeRecognizer();
                    reject(new Error(String(error)));
                });
            });

            if (currentRequestId !== requestId.current) return;
            const best = result?.NBest?.[0];
            const accuracy = Number(best?.PronunciationAssessment?.AccuracyScore);
            if (!Number.isFinite(accuracy)) {
                setMessage('Mình chưa nghe rõ câu trả lời. Bé thử đưa micro gần hơn, nói chậm rồi chạm ghi âm lại nhé!');
                return;
            }

            const roundedScore = Math.max(0, Math.min(100, Math.round(accuracy)));
            setScore(roundedScore);
            setRecognizedText(best?.Display || '');
            setIsGeneratingAdvice(true);
            const feedback = await API.post('pronunciation-feedback', {
                targetWord: expectedResponse,
                azureResponse: result,
            }, false, false, false);
            if (currentRequestId !== requestId.current) return;
            if (feedback.success && typeof feedback.text === 'string' && feedback.text.trim()) {
                setCoachMessage(feedback.text);
            } else {
                setCoachMessage(`AI chưa gửi được lời động viên${feedback.message ? `: ${feedback.message}` : '.'} Bé vẫn rất cố gắng! Hãy nghe mẫu rồi thử nói lại thật chậm nhé.`);
            }
            setMessage(roundedScore >= PASSING_SCORE
                ? 'Tuyệt lắm! Bé đã trả lời rất rõ. 🌟'
                : 'Bé thử lại nhé! Mình cùng nói chậm từng từ nào. 💛');
        } catch (error) {
            console.error('[say-it-with-ai] Speech assessment failed:', error);
            setMessage(error instanceof Error ? error.message : 'Không thể nhận diện giọng nói. Bé thử lại nhé.');
        } finally {
            if (currentRequestId === requestId.current) {
                setIsListening(false);
                setIsGeneratingAdvice(false);
            }
        }
    }

    function continueGame() {
        if (score === null || score < PASSING_SCORE) return;
        if (roundIndex + 1 < roundItems.length) {
            setRoundIndex(index => index + 1);
            setScore(null);
            setRecognizedText('');
            setCoachMessage('');
            setMessage('');
            return;
        }

        setMode('complete');
        setBadgeEarned(true);
        try {
            window.localStorage.setItem(badgeStorageKey, 'true');
            setBadgeSaved(true);
            setBadgeStorageError('');
        } catch (error) {
            console.error('[say-it-with-ai] Could not save badge:', error);
            setBadgeSaved(false);
            setBadgeStorageError('Thiết bị chưa lưu được huy hiệu.');
            setMessage('Bé đã nhận huy hiệu trong lượt chơi này, nhưng thiết bị chưa lưu được huy hiệu.');
        }
    }

    if (status !== 'authenticated' || role !== 'PARENT') {
        return <div className="grid min-h-screen place-items-center text-xl">Đang tải trò chơi...</div>;
    }

    const loading = gameLoading || childrenLoading;
    const noGame = !loading && !config;

    return (
        <main className="min-h-screen bg-gradient-to-b from-[#e9f2ff] via-[#f4fbf4] to-[#fff5e9] px-4 py-5 text-[#2b4a43] sm:px-8 sm:py-8">
            <div className="mx-auto max-w-5xl">
                <Link
                    href="/games"
                    aria-label="Về danh sách trò chơi"
                    className="inline-flex min-h-14 items-center gap-2 rounded-full bg-white px-5 text-lg font-extrabold text-[#2d6358] shadow-md"
                >
                    <span className="text-3xl" aria-hidden>🏠</span>
                    <span className="hidden sm:inline">Trò chơi</span>
                </Link>

                <header className="mt-5 flex items-center gap-4 rounded-[2.5rem] border-4 border-white bg-gradient-to-br from-[#d9e8ff] via-[#e5dcff] to-[#ffd6e0] p-5 shadow-md sm:gap-6 sm:p-7">
                    <span className="text-6xl sm:text-7xl" aria-hidden>🎙️</span>
                    <div>
                        <h1 className="text-3xl font-black leading-tight sm:text-5xl">Say It with AI</h1>
                        <p className="mt-1 text-base font-bold text-[#5e6688] sm:text-xl">Nhìn hình 👀 · Nói tiếng Anh 🗣️ · Nhận lời khen ⭐</p>
                    </div>
                </header>

                {children.length > 0 && (
                    <label className="mt-5 flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 font-bold shadow-sm">
                        <span>👧 Chọn bé luyện nói:</span>
                        <select
                            value={selectedChildId}
                            onChange={event => selectChild(event.target.value)}
                            className="min-h-12 min-w-48 rounded-2xl border-2 border-[#dceadd] bg-[#f8fbf7] px-4"
                        >
                            {children.map(child => (
                                <option key={child.id} value={child.id}>{child.avatar} {child.name}</option>
                            ))}
                        </select>
                        <span className="text-sm text-[#71867c]">
                            {age === null ? 'Cấp độ từ vựng cơ bản' : age < 6 ? `Cấp độ từ vựng · ${age} tuổi` : `Cấp độ câu ngắn · ${age} tuổi`}
                        </span>
                    </label>
                )}
                {childError && <p role="status" className="mt-3 rounded-2xl bg-[#fff2d5] p-4 text-sm font-bold text-[#80683c]">{childError}</p>}
                {!childrenLoading && children.length === 0 && (
                    <p className="mt-3 rounded-2xl bg-white/80 p-4 text-sm font-bold text-[#71867c]">
                        Chưa có hồ sơ ngày sinh; trò chơi đang dùng cấp độ từ vựng cơ bản.
                    </p>
                )}

                {loading ? (
                    <section className="mt-8 rounded-[2rem] bg-white p-8 text-center text-xl font-bold shadow-sm" role="status">
                        Bé chờ một chút nhé… 🐣
                    </section>
                ) : noGame ? (
                    <section className="mt-8 rounded-[2rem] bg-white p-8 text-center shadow-sm">
                        <span className="text-7xl" aria-hidden>🙈</span>
                        <p className="mt-4 text-2xl font-extrabold">{gameError || 'Trò chơi hiện chưa được mở.'}</p>
                        <Link href="/games" className="mt-6 inline-flex min-h-14 items-center rounded-full bg-[#2d6358] px-7 font-black text-white">
                            Quay lại danh sách
                        </Link>
                    </section>
                ) : mode === 'themes' ? (
                    <section className="mt-8">
                        <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm sm:p-8">
                            <p className="text-2xl font-black sm:text-3xl">Nhân vật hỏi: “What is this?”</p>
                            <p className="mt-2 text-lg font-bold text-[#71867c]">
                                {isSentenceLevel
                                    ? 'Bé hãy trả lời bằng một câu tiếng Anh ngắn nhé!'
                                    : 'Bé hãy nói tên hình bằng tiếng Anh nhé!'}
                            </p>
                        </div>
                        <h2 className="mt-8 text-center text-3xl font-black">Bé chọn chủ đề nhé! 👇</h2>
                        {themes.length ? (
                            <div className="mt-5 grid gap-5 sm:grid-cols-2">
                                {themes.map((theme, index) => (
                                    <button
                                        key={theme.id}
                                        type="button"
                                        onClick={() => startTheme(theme)}
                                        className={`flex min-h-36 items-center gap-5 rounded-[2rem] border-4 border-white p-6 text-left shadow-md transition hover:-translate-y-1 ${
                                            index % 2 === 0 ? 'bg-gradient-to-br from-[#ffedb8] to-[#ffd8a7]' : 'bg-gradient-to-br from-[#d9f2e0] to-[#b7defa]'
                                        }`}
                                    >
                                        <span className="text-6xl" aria-hidden>{index % 2 === 0 ? '🐘' : '🧸'}</span>
                                        <span className="flex-1">
                                            <b className="block text-2xl font-black">{theme.title}</b>
                                            <small className="mt-2 block text-base font-bold text-[#71867c]">{theme.items.length} từ để luyện nói</small>
                                        </span>
                                        <span className="text-3xl" aria-hidden>▶️</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p role="status" className="mt-5 rounded-2xl bg-white p-5 text-center font-bold text-[#71867c]">
                                Chưa có chủ đề từ vựng để luyện nói.
                            </p>
                        )}
                    </section>
                ) : mode === 'complete' ? (
                    <section className="mt-8 rounded-[2.5rem] border-4 border-white bg-gradient-to-br from-[#fff5c9] to-[#ffe0ed] p-8 text-center shadow-xl sm:p-12">
                        <span className="inline-block text-8xl" aria-hidden>🏆</span>
                        <h2 className="mt-4 text-4xl font-black">Bé nói tiếng Anh giỏi quá! 🎉</h2>
                        <p className="mt-3 text-xl font-bold text-[#7a5a2e]">
                            Hoàn thành {roundItems.length} lượt nói{selectedTheme ? ` · ${selectedTheme.title}` : ''}
                        </p>
                        <div className="mx-auto mt-7 max-w-sm rounded-[2rem] border-4 border-white bg-white p-6 shadow-md">
                            <span className="text-6xl" aria-hidden>🎖️</span>
                            <h3 className="mt-2 text-2xl font-black">Little Speaker</h3>
                            <p className="mt-1 font-bold text-[#71867c]">
                                {badgeEarned && badgeSaved
                                    ? 'Huy hiệu đã được lưu trên thiết bị này!'
                                    : 'Huy hiệu đã mở khóa trong lượt chơi này!'}
                            </p>
                            {!badgeSaved && (message || badgeStorageError) && (
                                <p role="status" className="mt-2 text-sm font-bold text-[#80683c]">{badgeStorageError || message}</p>
                            )}
                        </div>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => selectedTheme && startTheme(selectedTheme)}
                                className="min-h-14 rounded-full bg-[#5795ef] px-7 font-black text-white"
                            >
                                Chơi lại 🔁
                            </button>
                            <Link href="/games" className="inline-flex min-h-14 items-center rounded-full bg-[#2d6358] px-7 font-black text-white">
                                Về trò chơi 🏠
                            </Link>
                        </div>
                    </section>
                ) : currentItem ? (
                    <section className="mt-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white px-5 py-4 shadow-sm">
                            <p className="font-black text-[#2d6358]">{selectedTheme?.title}</p>
                            <p className="font-bold text-[#71867c]">Lượt {roundIndex + 1} / {roundItems.length}</p>
                            <p className="rounded-full bg-[#f0eaff] px-4 py-2 text-sm font-black text-[#6754a3]">
                                {isSentenceLevel ? 'Nói câu ngắn' : 'Nói từ vựng'}
                            </p>
                        </div>

                        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
                            <div className="grid min-h-72 place-items-center rounded-[2.5rem] border-4 border-white bg-gradient-to-br from-[#fff1c2] to-[#ffe1e9] p-8 shadow-md">
                                <Picture key={currentItem.id} item={currentItem} />
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-[2.5rem] bg-white p-6 text-center shadow-md sm:p-8">
                                <span className="text-5xl" aria-hidden>🐿️</span>
                                <h2 className="mt-3 text-3xl font-black">What is this?</h2>
                                <p className="mt-2 text-lg font-bold text-[#71867c]">
                                    {isSentenceLevel ? 'Hãy nói: “It’s a…” hoặc “It’s an…”' : 'Bé nói tên hình bằng tiếng Anh nhé!'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => speak(expectedResponse)}
                                    className="mt-5 min-h-12 rounded-full bg-[#f0eaff] px-5 font-extrabold text-[#6754a3]"
                                >
                                    🔊 Nghe câu trả lời mẫu
                                </button>
                                <button
                                    type="button"
                                    onClick={assessSpeech}
                                    disabled={isListening}
                                    className={`mt-5 grid h-28 w-28 place-items-center rounded-full border-b-8 border-[#397ad7] bg-[#5795ef] text-5xl text-white shadow-lg transition active:translate-y-1 active:border-b-0 disabled:cursor-wait disabled:opacity-60 ${isListening ? 'animate-pulse' : ''}`}
                                    aria-label={isListening ? 'Đang nghe bé nói' : 'Chạm để nói vào micro'}
                                >
                                    {isListening ? '👂' : '🎤'}
                                </button>
                                <p className="mt-3 font-black text-[#397ad7]">{isListening ? 'Bé nói đi, mình đang nghe…' : 'Chạm micro để nói'}</p>
                                {score !== null && (
                                    <p className={`mt-4 rounded-full px-5 py-2 font-black ${score >= PASSING_SCORE ? 'bg-[#e3f7e8] text-[#2d8050]' : 'bg-[#fff2d5] text-[#80683c]'}`}>
                                        Bé đạt {score}% {score >= PASSING_SCORE ? '🌟' : '💛'}
                                    </p>
                                )}
                            </div>
                        </div>

                        {(message || recognizedText || coachMessage || isGeneratingAdvice) && (
                            <div className="mt-5 rounded-[2rem] bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
                                {message && <p className="font-extrabold text-[#2d6358]">{message}</p>}
                                {recognizedText && <p className="mt-2 text-sm font-bold text-[#71867c]">AI nghe được: “{recognizedText}”</p>}
                                {isGeneratingAdvice && <p className="mt-3 font-bold text-[#6754a3]">Bạn Sóc đang nghĩ lời động viên cho bé…</p>}
                                {coachMessage && <p className="mt-3 text-lg font-bold text-[#6754a3]">💬 {coachMessage}</p>}
                            </div>
                        )}

                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    cancelSpeechAssessment();
                                    setMode('themes');
                                }}
                                className="min-h-14 rounded-full bg-white px-6 font-black text-[#2d6358] shadow-sm"
                            >
                                Đổi chủ đề
                            </button>
                            {score !== null && score < PASSING_SCORE && (
                                <button
                                    type="button"
                                    onClick={assessSpeech}
                                    disabled={isListening}
                                    className="min-h-14 rounded-full bg-[#ffb54d] px-7 font-black text-white shadow-sm disabled:opacity-60"
                                >
                                    Thử nói lại 🎤
                                </button>
                            )}
                            {score !== null && score >= PASSING_SCORE && (
                                <button
                                    type="button"
                                    onClick={continueGame}
                                    disabled={isGeneratingAdvice}
                                    className="min-h-14 rounded-full bg-[#2d9c67] px-7 font-black text-white shadow-sm disabled:opacity-60"
                                >
                                    {roundIndex + 1 === roundItems.length ? 'Nhận huy hiệu 🎖️' : 'Lượt tiếp theo ➜'}
                                </button>
                            )}
                        </div>
                    </section>
                ) : null}
            </div>
        </main>
    );
}
