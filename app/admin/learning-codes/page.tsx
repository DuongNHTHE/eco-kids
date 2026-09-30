'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';

type Topic = { id: string; title: string; vietnamese: string; icon?: string };
type ManagedCode = {
    id: string;
    code: string;
    qrUrl: string;
    qrImage: string;
    topicIds: string[];
    topics: { id: string; title: string; vietnamese: string }[];
    maxUses: number;
    usedCount: number;
    isActive: boolean;
    createdAt: string;
};

export default function LearningCodesAdminPage() {
    const { API } = useAPI();
    const [topics, setTopics] = useState<Topic[]>([]);
    const [codes, setCodes] = useState<ManagedCode[]>([]);
    const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
    const [maxUses, setMaxUses] = useState('1');
    const [createdCode, setCreatedCode] = useState('');
    const [createdQrImage, setCreatedQrImage] = useState('');
    const [createdQrUrl, setCreatedQrUrl] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);

    async function loadData() {
        const [topicResult, codeResult] = await Promise.all([
            API.get('topics', false, false, false),
            API.get('admin/learning-codes', false, false, false),
        ]);
        if (Array.isArray(topicResult)) setTopics(topicResult);
        if (Array.isArray(codeResult)) setCodes(codeResult);
        setHasAccess(Array.isArray(codeResult));
        if (!Array.isArray(codeResult) && codeResult?.message) setMessage(codeResult.message);
        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, [API]);

    function toggleTopic(topicId: string) {
        setSelectedTopicIds(current => current.includes(topicId)
            ? current.filter(id => id !== topicId)
            : [...current, topicId]);
    }

    async function createCode(event: { preventDefault: () => void }) {
        event.preventDefault();
        setMessage('');
        setCreatedCode('');
        setCreatedQrImage('');
        setCreatedQrUrl('');
        setSaving(true);
        const result = await API.post('admin/learning-codes', { topicIds: selectedTopicIds, maxUses: Number(maxUses) }, false, false, false);
        setSaving(false);
        if (!result.success) {
            setMessage(result.message || 'Không thể tạo mã.');
            return;
        }

        setCreatedCode(result.code);
        setCreatedQrImage(result.qrImage || '');
        setCreatedQrUrl(result.qrUrl || '');
        setSelectedTopicIds([]);
        setMaxUses('1');
        setMessage(result.message || 'Đã tạo mã mở khóa.');
        await loadData();
    }

    async function toggleCode(code: ManagedCode) {
        const result = await API.patch('admin/learning-codes', { id: code.id, isActive: !code.isActive }, false, false, false);
        if (!result.success) {
            setMessage(result.message || 'Không thể cập nhật trạng thái mã.');
            return;
        }
        setCodes(current => current.map(item => item.id === code.id ? { ...item, isActive: result.isActive } : item));
    }

    async function copyCode(value: string) {
        try {
            await navigator.clipboard.writeText(value);
            setMessage('Đã sao chép mã.');
        } catch {
            setMessage('Không thể sao chép tự động. Hãy chọn và sao chép mã.');
        }
    }

    return (
        <main className="min-h-screen">
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto max-w-6xl px-5 py-6 lg:px-10">
                    <Link href="/admin/dashboard" className="text-sm font-bold text-[#6eaa83]">← Về dashboard</Link>
                    <div className="mt-4 flex items-center gap-4">
                        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#fff2d5] text-3xl">🔑</span>
                        <div>
                            <h1 className="text-3xl font-extrabold sm:text-4xl">Mã mở khóa</h1>
                            <p className="mt-1 text-[#71867c]">Tạo mã cho nhiều topic và giới hạn lượt sử dụng theo tài khoản phụ huynh.</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10">
                {hasAccess === false ? (
                    <p role="alert" className="rounded-xl border border-[#edb9ae] bg-white p-4 font-bold text-[#c44f38]">{message || 'Bạn không có quyền quản lý mã mở khóa.'}</p>
                ) : hasAccess === null ? (
                    <p className="py-8 text-center font-bold text-[#71867c]">Đang kiểm tra quyền truy cập...</p>
                ) : <>
                <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
                    <form onSubmit={createCode} className="rounded-2xl border border-[#dceadd] bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-extrabold">Tạo mã mới</h2>
                        <p className="mt-1 text-sm text-[#71867c]">Một lượt được tính cho một tài khoản phụ huynh; các bé trong tài khoản cùng được mở.</p>

                        <fieldset className="mt-6">
                            <legend className="text-sm font-bold">Topic được mở khóa</legend>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {topics.map(topic => (
                                    <label key={topic.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm font-bold transition ${selectedTopicIds.includes(topic.id) ? 'border-[#6eaa83] bg-[#eef8ef] text-[#203b35]' : 'border-[#dceadd] bg-white text-[#71867c]'}`}>
                                        <input type="checkbox" checked={selectedTopicIds.includes(topic.id)} onChange={() => toggleTopic(topic.id)} className="h-4 w-4 accent-[#2d6358]" />
                                        <span aria-hidden className="text-xl">{topic.icon || '📚'}</span>
                                        <span>{topic.vietnamese || topic.title}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <label className="mt-6 block max-w-xs text-sm font-bold">
                            Số tài khoản được redeem
                            <input type="number" required min={1} max={100000} step={1} value={maxUses} onChange={event => setMaxUses(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#dceadd] bg-white px-4 text-base outline-none focus:border-[#6eaa83]" />
                        </label>

                        {message && <p role="status" className="mt-4 text-sm font-bold text-[#2d6358]">{message}</p>}
                        <button type="submit" disabled={saving || selectedTopicIds.length === 0} className="mt-6 min-h-12 rounded-full bg-[#f47d52] px-6 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">
                            {saving ? 'Đang tạo mã...' : `Tạo mã${selectedTopicIds.length ? ` cho ${selectedTopicIds.length} topic` : ''}`}
                        </button>
                    </form>

                    <aside className="rounded-2xl border border-[#f2ddb1] bg-[#fff8e6] p-6">
                        <span className="text-sm font-extrabold text-[#a45b17]">MÃ MỚI</span>
                        {createdCode ? (
                            <>
                                <p className="mt-3 break-all font-mono text-2xl font-black tracking-wider text-[#203b35]">{createdCode}</p>
                                {createdQrImage && <img src={createdQrImage} alt={`QR của mã ${createdCode}`} className="mt-4 h-40 w-40 rounded-lg border border-[#dceadd] bg-white p-2" />}
                                <button type="button" onClick={() => copyCode(createdCode)} className="mt-4 min-h-10 rounded-full bg-white px-4 text-sm font-bold text-[#2d6358] shadow-sm">Sao chép mã</button>
                                {createdQrUrl && <a href={createdQrUrl} target="_blank" rel="noreferrer" className="ml-3 text-sm font-bold text-[#2d6358] underline">Mở link QR</a>}
                            </>
                        ) : (
                            <p className="mt-3 text-[#71867c]">Mã sẽ hiện ở đây sau khi tạo.</p>
                        )}
                    </aside>
                </section>

                <section className="mt-10">
                    <div className="flex items-end justify-between gap-4 border-b border-[#dceadd] pb-3">
                        <div>
                            <span className="text-sm font-bold text-[#ef7d32]">QUẢN LÝ</span>
                            <h2 className="mt-1 text-2xl font-extrabold">Mã đã tạo</h2>
                        </div>
                        <span className="text-sm font-bold text-[#71867c]">{codes.length} mã</span>
                    </div>
                    {loading ? (
                        <p className="py-8 text-center font-bold text-[#71867c]">Đang tải mã...</p>
                    ) : codes.length === 0 ? (
                        <p className="py-8 text-center text-[#71867c]">Chưa có mã combo nào.</p>
                    ) : (
                        <div className="divide-y divide-[#dceadd]">
                            {codes.map(code => (
                                <article key={code.id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <code className="break-all rounded-lg bg-white px-3 py-2 font-mono text-base font-extrabold text-[#203b35]">{code.code}</code>
                                            <button type="button" onClick={() => copyCode(code.code)} aria-label={`Sao chép mã ${code.code}`} className="min-h-9 rounded-full border border-[#c8d9cb] px-3 text-xs font-bold text-[#2d6358]">Sao chép</button>
                                            {code.qrUrl && <a href={code.qrUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#2d6358] underline">Mở QR</a>}
                                            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${code.isActive ? 'bg-[#e8f4e9] text-[#2d6358]' : 'bg-[#f1eeee] text-[#71867c]'}`}>{code.isActive ? 'Đang hoạt động' : 'Đã tắt'}</span>
                                        </div>
                                        <p className="mt-2 text-sm text-[#71867c]">{code.topics.map(topic => topic.vietnamese || topic.title).join(', ')}</p>
                                        <p className="mt-1 text-sm font-bold text-[#203b35]">Đã dùng {code.usedCount} / {code.maxUses} lượt</p>
                                        {code.qrImage && <img src={code.qrImage} alt={`QR của mã ${code.code}`} className="mt-3 h-24 w-24 rounded-md border border-[#dceadd] bg-white p-1" />}
                                    </div>
                                    <button type="button" onClick={() => toggleCode(code)} className={`min-h-10 rounded-full px-4 text-sm font-bold ${code.isActive ? 'border border-[#edb9ae] text-[#c44f38]' : 'bg-[#2d6358] text-white'}`}>
                                        {code.isActive ? 'Tắt mã' : 'Bật lại'}
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
                </>}
            </div>
        </main>
    );
}
