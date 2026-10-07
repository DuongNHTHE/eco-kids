'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAPI } from '../../lib/hooks/useAPI';

export default function SettingsPage() {
    const { API } = useAPI();
    const router = useRouter();
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [useParentCode, setUseParentCode] = useState(false);
    const [hasParentCode, setHasParentCode] = useState(false);
    const [parentCode, setParentCode] = useState('');
    const [parentSettingsMessage, setParentSettingsMessage] = useState('');
    const [parentSettingsError, setParentSettingsError] = useState(false);
    const [parentSettingsLoaded, setParentSettingsLoaded] = useState(false);
    const [isSavingParentSettings, setIsSavingParentSettings] = useState(false);

    useEffect(() => {
        let mounted = true;
        API.get('parent-settings', false, false, false).then(settings => {
            if (!mounted) return;
            if (!settings.success) {
                setParentSettingsError(true);
                setParentSettingsMessage(settings.message || 'Không thể tải cài đặt phụ huynh.');
                setParentSettingsLoaded(true);
                return;
            }
            setUseParentCode(Boolean(settings.useParentCode));
            setHasParentCode(Boolean(settings.hasParentCode));
            setParentSettingsLoaded(true);
        });
        return () => {
            mounted = false;
        };
    }, [API]);

    async function redeemCode(event: { preventDefault: () => void }) {
        event.preventDefault();
        setMessage('');

        setIsSubmitting(true);
        const result = await API.post('learning-codes', { code }, false, false, false);
        setIsSubmitting(false);
        if (!result.success) {
            setMessage(result.message || 'Không thể sử dụng mã này.');
            return;
        }

        const firstTopicId = result.topicId || result.topicIds?.[0];
        router.push(firstTopicId
            ? `/learn?topic=${encodeURIComponent(firstTopicId)}${result.wordId && result.wordId !== '*' ? `&word=${encodeURIComponent(result.wordId)}` : ''}`
            : '/learn');
    }

    async function saveParentSettings(event: { preventDefault: () => void }) {
        event.preventDefault();
        setParentSettingsMessage('');
        setParentSettingsError(false);
        setIsSavingParentSettings(true);

        const result = await API.patch('parent-settings', {
            useParentCode,
            ...(parentCode ? { code: parentCode } : {}),
        }, false, false, false);
        setIsSavingParentSettings(false);

        if (!result.success) {
            setParentSettingsError(true);
            setParentSettingsMessage(result.message || 'Không thể lưu cài đặt phụ huynh.');
            return;
        }

        setUseParentCode(Boolean(result.useParentCode));
        setHasParentCode(Boolean(result.hasParentCode));
        setParentCode('');
        setParentSettingsMessage('Đã lưu cài đặt vào tài khoản của bạn.');
    }

    return (
        <main className="min-h-screen bg-[#f4faf4] px-5 py-8 text-[#203b35] lg:px-10">
            <div className="mx-auto max-w-3xl">
                <Link href="/dashboard" className="font-bold text-[#2d6358]">← Góc phụ huynh</Link>
                <p className="mt-6 font-bold text-[#80938a]">Tài khoản</p>
                <h1 className="mt-1 text-4xl font-extrabold">Cài đặt</h1>
                <section className="mt-8 rounded-3xl border border-[#dceadd] bg-white p-6 shadow-sm sm:p-8">
                    <span className="text-sm font-extrabold text-[#ef7d32]">BÀI HỌC</span>
                    <h2 className="mt-2 text-2xl font-extrabold">Mở khóa bằng mã</h2>
                    <p className="mt-2 text-[#71867c]">Mã sẽ mở bài tương ứng cho tất cả hồ sơ bé trong tài khoản này.</p>
                    <form onSubmit={redeemCode} className="mt-6 space-y-4">
                            <label className="block text-sm font-bold">
                                Mã mở khóa
                                <input
                                    required
                                    autoComplete="off"
                                    maxLength={64}
                                    value={code}
                                    onChange={event => setCode(event.target.value)}
                                    placeholder="Nhập mã hoặc mở liên kết QR"
                                    className="mt-2 min-h-12 w-full rounded-xl border border-[#dceadd] bg-white px-4 text-lg uppercase outline-none focus:border-[#6eaa83]"
                                />
                            </label>
                            {message && <p role="alert" className="text-sm font-bold text-[#c44f38]">{message}</p>}
                            <button disabled={isSubmitting} className="min-h-12 rounded-full bg-[#f47d52] px-6 font-extrabold text-white disabled:opacity-60">
                                {isSubmitting ? 'Đang kiểm tra...' : 'Mở bài học'}
                            </button>
                    </form>
                </section>
                <section className="mt-8 rounded-3xl border border-[#dceadd] bg-white p-6 shadow-sm sm:p-8">
                    <span className="text-sm font-extrabold text-[#ef7d32]">GIỜ NGHỈ</span>
                    <h2 className="mt-2 text-2xl font-extrabold">Mã phụ huynh</h2>
                    <p className="mt-2 text-[#71867c]">
                        Dùng mã để hoãn nhắc nghỉ 10 phút hoặc bỏ qua lần nhắc kế tiếp. Mã được lưu an toàn trong cài đặt tài khoản.
                    </p>
                    <form onSubmit={saveParentSettings} className="mt-5 space-y-4">
                        <label className="flex items-center justify-between gap-4 rounded-2xl bg-[#f4faf4] p-4">
                            <span>
                                <b className="block">Yêu cầu mã khi điều chỉnh nhắc nghỉ</b>
                                <small className="text-[#80938a]">Có thể bật hoặc tắt bất cứ lúc nào.</small>
                            </span>
                            <input
                                type="checkbox"
                                checked={useParentCode}
                                onChange={event => setUseParentCode(event.target.checked)}
                                disabled={!parentSettingsLoaded || isSavingParentSettings}
                                className="h-5 w-5 accent-[#2d6358]"
                            />
                        </label>
                        <label className="block text-sm font-bold">
                            {hasParentCode ? 'Đổi mã phụ huynh (không bắt buộc)' : 'Tạo mã phụ huynh'}
                            <input
                                type="password"
                                inputMode="numeric"
                                autoComplete="new-password"
                                pattern="[0-9]{6,12}"
                                minLength={6}
                                maxLength={12}
                                value={parentCode}
                                onChange={event => setParentCode(event.target.value)}
                                placeholder="Nhập mã gồm 6–12 chữ số"
                                className="mt-2 min-h-12 w-full rounded-xl border border-[#dceadd] bg-white px-4 text-lg tracking-[0.3em] outline-none focus:border-[#6eaa83]"
                            />
                        </label>
                        {parentSettingsMessage && (
                            <p role={parentSettingsError ? 'alert' : 'status'} className={`text-sm font-bold ${parentSettingsError ? 'text-[#c44f38]' : 'text-[#2d6358]'}`}>
                                {parentSettingsMessage}
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={!parentSettingsLoaded || isSavingParentSettings}
                            className="min-h-12 rounded-full bg-[#2d6358] px-6 font-extrabold text-white disabled:opacity-60"
                        >
                            {isSavingParentSettings ? 'Đang lưu...' : 'Lưu cài đặt'}
                        </button>
                    </form>
                </section>
                <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <label className="flex items-center justify-between gap-4 border-b border-[#edf2ed] py-4">
                        <span><b className="block">Thông báo hoạt động</b><small className="text-[#80938a]">Nhận cập nhật về tiến độ học của bé.</small></span>
                        <input type="checkbox" defaultChecked className="h-5 w-5 accent-[#2d6358]" />
                    </label>
                    <label className="flex items-center justify-between gap-4 py-4">
                        <span><b className="block">Ngôn ngữ</b><small className="text-[#80938a]">Ngôn ngữ hiển thị của tài khoản.</small></span>
                        <select defaultValue="vi" className="rounded-xl border border-[#d9eadc] bg-white px-3 py-2 font-bold text-[#203b35]">
                            <option value="vi">Tiếng Việt</option>
                            <option value="en">English</option>
                        </select>
                    </label>
                </section>
            </div>
        </main>
    );
}