'use client';

import { useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';

type Notification = {
    id: string;
    type: string;
    title: string;
    message: string;
    resourceId: string;
    organization: string;
    contactName: string;
    phone: string;
    email: string;
    studentCount: number | null;
    note: string;
    status: 'new' | 'contacted' | 'qualified' | 'closed';
    isRead: boolean;
    createdAt?: string;
};

type NotificationCounts = Record<Notification['status'], number>;

const statusLabels: Record<Notification['status'], string> = {
    new: 'Mới',
    contacted: 'Đã liên hệ',
    qualified: 'Đang tư vấn',
    closed: 'Đã hoàn tất',
};

function formatDate(value?: string) {
    if (!value) return 'Vừa nhận';
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function NotificationsPage() {
    const { API } = useAPI();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | Notification['status']>('all');
    const [counts, setCounts] = useState<NotificationCounts>({ new: 0, contacted: 0, qualified: 0, closed: 0 });
    const [loading, setLoading] = useState(true);

    async function loadNotifications() {
        setLoading(true);
        const query = filter === 'all' ? '' : `?status=${filter}`;
        const result = await API.get(`admin/notifications${query}`, false, false, true);
        if (Array.isArray(result?.notifications)) setNotifications(result.notifications);
        if (result?.counts) setCounts(result.counts);
        setLoading(false);
    }

    useEffect(() => { loadNotifications(); }, [API, filter]);

    useEffect(() => {
        const source = new EventSource('/api/admin/notifications/stream');
        source.addEventListener('notification', event => {
            const notification = JSON.parse((event as MessageEvent).data) as Notification;
            if (filter !== 'all' && notification.status !== filter) return;
            setNotifications(current => [notification, ...current.filter(item => item.id !== notification.id)]);
        });
        return () => source.close();
    }, [filter]);

    async function updateStatus(notificationId: string, status: Notification['status']) {
        const result = await API.patch?.('admin/notifications', { notificationId, status }, false, true, true);
        if (result?.success) {
            setNotifications(current => current.map(item => item.id === notificationId ? result.notification : item));
            setCounts(current => {
                const previousStatus = notifications.find(item => item.id === notificationId)?.status;
                if (!previousStatus || previousStatus === status) return current;
                return { ...current, [previousStatus]: current[previousStatus] - 1, [status]: current[status] + 1 };
            });
        }
    }

    async function markAsViewed(notificationId: string) {
        const notification = notifications.find(item => item.id === notificationId);
        if (!notification || notification.isRead) return;
        const result = await API.patch?.('admin/notifications', { notificationId, isRead: true }, false, false, false);
        if (result?.success) setNotifications(current => current.map(item => item.id === notificationId ? result.notification : item));
    }

    let notificationContent;
    if (loading) {
        notificationContent = <div className="rounded-2xl bg-white p-8 text-center font-bold text-[#71867c]">Đang tải thông báo...</div>;
    } else if (notifications.length === 0) {
        notificationContent = <div className="rounded-2xl bg-white p-12 text-center shadow-soft"><p className="font-bold">Chưa có thông báo phù hợp</p><p className="mt-2 text-sm text-[#71867c]">Các đăng ký tư vấn mới sẽ xuất hiện tại đây.</p></div>;
    } else {
        notificationContent = notifications.map(notification =>
            <article key={notification.id} onClick={() => markAsViewed(notification.id)} className={`cursor-pointer rounded-2xl bg-white p-5 shadow-soft ${!notification.isRead ? 'border-l-4 border-[#f47d52]' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.15em] text-[#ef7d32]">{notification.title}</span>
                        <div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">{notification.organization || notification.message}</h2><span className="rounded-full bg-[#eef8ef] px-3 py-1 text-xs font-bold text-[#2d6358]">{statusLabels[notification.status]}</span></div>
                        <p className="mt-1 text-sm text-[#71867c]">{formatDate(notification.createdAt)}</p>
                    </div>
                    <select value={notification.status} onChange={event => updateStatus(notification.id, event.target.value as Notification['status'])} className="rounded-xl border border-[#dceadd] bg-[#f8fcf8] px-3 py-2 text-sm font-bold outline-none">
                        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </div>
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                    <div><span className="block text-[#83968c]">Người liên hệ</span><strong>{notification.contactName}</strong></div>
                    <div><span className="block text-[#83968c]">Điện thoại</span><a href={`tel:${notification.phone}`} className="font-bold text-[#f47d52]">{notification.phone}</a></div>
                    <div><span className="block text-[#83968c]">Email</span><a href={`mailto:${notification.email}`} className="font-bold text-[#2d6358]">{notification.email || 'Chưa cung cấp'}</a></div>
                </div>
                {Boolean(notification.studentCount || notification.note) && <div className="mt-4 rounded-xl bg-[#f4faf4] p-3 text-sm text-[#637970]">{Boolean(notification.studentCount) && <span className="font-bold">{notification.studentCount} học sinh</span>}{notification.studentCount && notification.note ? ' · ' : ''}{notification.note}</div>}
            </article>
        );
    }

    return (
        <main className="min-h-screen px-5 py-8 lg:px-10">
            <div className="mx-auto max-w-6xl">
                <div className="flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <span className="text-sm font-bold text-[#ef7d32]">Trung tâm quản trị</span>
                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Thông báo</h1>
                        <p className="mt-2 text-[#71867c]">Theo dõi các khách hàng vừa đăng ký tư vấn.</p>
                    </div>
                    <div className="rounded-2xl bg-white px-5 py-4 text-right shadow-soft">
                        <strong className="block text-3xl text-[#f47d52]">{counts.new}</strong>
                        <span className="text-sm font-bold text-[#71867c]">thông báo mới</span>
                    </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                    {(['all', 'new', 'contacted', 'qualified', 'closed'] as const).map(value =>
                        <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${filter === value ? 'bg-[#203b35] text-white' : 'bg-white text-[#637970] hover:bg-[#eef8ef]'}`}>
                            {value === 'all' ? `Tất cả (${Object.values(counts).reduce((total, count) => total + count, 0)})` : `${statusLabels[value]} (${counts[value]})`}
                        </button>
                    )}
                </div>

                <section className="mt-5 space-y-4">{notificationContent}</section>
            </div>
        </main>
    );
}