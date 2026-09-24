'use client';

import { useEffect, useState } from 'react';
import type { SubmitEvent as ReactSubmitEvent } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';

type Consultation = {
    id: string;
    organization: string;
    contactName: string;
    phone: string;
    email: string;
    studentCount: number | null;
    note: string;
    status: 'new' | 'contacted' | 'qualified' | 'closed';
    createdAt?: string;
};

type Counts = Record<Consultation['status'], number>;

const statusLabels: Record<Consultation['status'], string> = {
    new: 'Mới',
    contacted: 'Đã liên hệ',
    qualified: 'Đang tư vấn',
    closed: 'Đã hoàn tất',
};

function formatDate(value?: string) {
    if (!value) return 'Chưa có thời gian';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function ConsultationsPage() {
    const { API } = useAPI();
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [filter, setFilter] = useState<'all' | Consultation['status']>('all');
    const [counts, setCounts] = useState<Counts>({ new: 0, contacted: 0, qualified: 0, closed: 0 });
    const [loading, setLoading] = useState(true);
    const [emailTarget, setEmailTarget] = useState<Consultation | null>(null);
    const [subject, setSubject] = useState('ECO-KIDS hỗ trợ tư vấn');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    async function loadConsultations() {
        setLoading(true);
        const query = filter === 'all' ? '' : `?status=${filter}`;
        const result = await API.get(`admin/consultations${query}`, false, true, true);
        if (Array.isArray(result?.consultations)) setConsultations(result.consultations);
        if (result?.counts) setCounts(result.counts);
        setLoading(false);
    }

    useEffect(() => { loadConsultations(); }, [API, filter]);

    async function updateStatus(consultationId: string, status: Consultation['status']) {
        const result = await API.patch('admin/consultations', { consultationId, status }, false, true, true);
        if (result?.consultation) {
            setConsultations(current => current.map(item => item.id === consultationId ? result.consultation : item));
            setCounts(current => {
                const previous = consultations.find(item => item.id === consultationId)?.status;
                if (!previous || previous === status) return current;
                return { ...current, [previous]: Math.max(0, current[previous] - 1), [status]: current[status] + 1 };
            });
        }
    }

    function openEmailForm(consultation: Consultation) {
        setEmailTarget(consultation);
        setSubject(`ECO-KIDS hỗ trợ tư vấn cho ${consultation.organization}`);
        setMessage(`Chào ${consultation.contactName},\n\nCảm ơn anh/chị đã liên hệ ECO-KIDS. Đội ngũ tư vấn của chúng tôi sẽ hỗ trợ anh/chị về nhu cầu học tập của các bé.\n\nTrân trọng,\nECO-KIDS`);
    }

    async function sendEmail(event: ReactSubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!emailTarget) return;
        setSending(true);
        const result = await API.post('admin/consultations/email', {
            consultationId: emailTarget.id,
            subject,
            message,
        }, true, true, true);
        setSending(false);
        if (result?.success) setEmailTarget(null);
    }

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return (
        <main className="min-h-screen px-5 py-8 lg:px-10">
            <div className="mx-auto max-w-7xl">
                <header className="flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#ef7d32]">Hỗ trợ tư vấn</span>
                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Danh sách người cần tư vấn</h1>
                        <p className="mt-2 text-[#71867c]">Xem thông tin liên hệ và kết nối trực tiếp với từng khách hàng.</p>
                    </div>
                    <div className="rounded-2xl bg-white px-5 py-4 text-right shadow-soft">
                        <strong className="block text-3xl text-[#f47d52]">{counts.new}</strong>
                        <span className="text-sm font-bold text-[#71867c]">yêu cầu mới / {total} yêu cầu</span>
                    </div>
                </header>

                <div className="mt-8 flex flex-wrap gap-2">
                    {(['all', 'new', 'contacted', 'qualified', 'closed'] as const).map(value => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setFilter(value)}
                            className={`rounded-full px-4 py-2 text-sm font-bold ${filter === value ? 'bg-[#203b35] text-white' : 'bg-white text-[#637970] hover:bg-[#eef8ef]'}`}
                        >
                            {value === 'all' ? `Tất cả (${total})` : `${statusLabels[value]} (${counts[value]})`}
                        </button>
                    ))}
                </div>

                <section className="mt-5 space-y-4">
                    {loading && <div className="rounded-2xl bg-white p-10 text-center font-bold text-[#71867c]">Đang tải yêu cầu tư vấn...</div>}
                    {!loading && consultations.length === 0 && <div className="rounded-2xl bg-white p-12 text-center shadow-soft">
                        <p className="font-bold">Chưa có yêu cầu tư vấn phù hợp</p>
                        <p className="mt-2 text-sm text-[#71867c]">Các yêu cầu mới sẽ xuất hiện tại đây.</p>
                    </div>}
                    {!loading && consultations.length > 0 && consultations.map(consultation => (
                        <article key={consultation.id} className="rounded-[2rem] bg-white p-6 shadow-soft">
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf3ed] pb-5">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-2xl font-extrabold">{consultation.organization}</h2>
                                        <span className="rounded-full bg-[#eef8ef] px-3 py-1 text-xs font-bold text-[#2d6358]">{statusLabels[consultation.status]}</span>
                                    </div>
                                    <p className="mt-1 text-sm text-[#71867c]">Gửi lúc {formatDate(consultation.createdAt)}</p>
                                </div>
                                <select
                                    value={consultation.status}
                                    onChange={event => updateStatus(consultation.id, event.target.value as Consultation['status'])}
                                    className="rounded-xl border border-[#dceadd] bg-white px-4 py-2 text-sm font-bold outline-none focus:border-[#6eaa83]"
                                >
                                    {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </div>

                            <div className="grid gap-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
                                <div><span className="block text-sm text-[#83968c]">Người liên hệ</span><strong className="mt-1 block">{consultation.contactName}</strong></div>
                                <div><span className="block text-sm text-[#83968c]">Số điện thoại</span><a href={`tel:${consultation.phone}`} className="mt-1 block font-bold text-[#f47d52]">{consultation.phone}</a></div>
                                <div><span className="block text-sm text-[#83968c]">Email</span>{consultation.email ? <a href={`mailto:${consultation.email}`} className="mt-1 block break-all font-bold text-[#2d6358]">{consultation.email}</a> : <strong className="mt-1 block">Chưa cung cấp</strong>}</div>
                                <div><span className="block text-sm text-[#83968c]">Số học sinh</span><strong className="mt-1 block">{consultation.studentCount || 'Chưa cung cấp'}</strong></div>
                            </div>

                            {consultation.note && <div className="rounded-2xl bg-[#f4faf4] p-4"><span className="block text-sm font-bold text-[#83968c]">Nội dung cần tư vấn</span><p className="mt-1 text-[#526d64]">{consultation.note}</p></div>}

                            <div className="mt-5 flex flex-wrap gap-3">
                                <a href={`tel:${consultation.phone}`} className="rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white">☎ Gọi điện</a>
                                {consultation.email && <button type="button" onClick={() => openEmailForm(consultation)} className="rounded-full bg-[#203b35] px-5 py-3 font-bold text-white">✉ Soạn email</button>}
                            </div>
                        </article>
                    ))}
                </section>
            </div>

            {emailTarget && (
                <div className="fixed inset-0 z-40 grid place-items-center p-4">
                    <button type="button" aria-label="Đóng form gửi email" className="absolute inset-0 bg-[#203b35]/40" onClick={() => setEmailTarget(null)} />
                    <form onSubmit={sendEmail} className="relative z-10 w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <span className="text-sm font-bold text-[#ef7d32]">Gửi email trực tiếp</span>
                                <h2 className="mt-1 text-2xl font-extrabold">{emailTarget.contactName}</h2>
                                <p className="mt-1 text-sm text-[#71867c]">Đến: {emailTarget.email}</p>
                            </div>
                            <button type="button" aria-label="Đóng" onClick={() => setEmailTarget(null)} className="text-2xl font-bold text-[#71867c]">×</button>
                        </div>
                        <div className="mt-6 block text-sm font-bold text-[#526d64]"><span>Tiêu đề</span>
                            <span className="mt-2 block"><input required maxLength={180} value={subject} onChange={event => setSubject(event.target.value)} className="w-full rounded-xl border border-[#dceadd] px-4 py-3 outline-none focus:border-[#6eaa83]" /></span>
                        </div>
                        <div className="mt-4 block text-sm font-bold text-[#526d64]"><span>Nội dung</span>
                            <span className="mt-2 block"><textarea required maxLength={10000} rows={9} value={message} onChange={event => setMessage(event.target.value)} className="w-full resize-y rounded-xl border border-[#dceadd] px-4 py-3 outline-none focus:border-[#6eaa83]" /></span>
                        </div>
                        <div className="mt-5 flex justify-end gap-3">
                            <button type="button" onClick={() => setEmailTarget(null)} className="rounded-full border border-[#dceadd] px-5 py-3 font-bold text-[#526d64]">Hủy</button>
                            <button type="submit" disabled={sending} className="rounded-full bg-[#203b35] px-5 py-3 font-bold text-white disabled:opacity-60">{sending ? 'Đang gửi...' : 'Gửi email'}</button>
                        </div>
                    </form>
                </div>
            )}
        </main>
    );
}
