'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAPI } from '../../../lib/hooks/useAPI';

type DashboardData = {
    stats: { label: string; value: string; delta: string; accent: string; icon: string }[];
    lessons: { title: string; progress: number; lessons: number; color: string }[];
    trend: { label: string; value: number }[];
    orders: { id: string; customer: string; total: string; status: string }[];
    activities: { id: string; time: string; title: string; detail: string }[];
};

export default function AdminDashboardPage() {
    const { API } = useAPI();
    const { data: session } = useSession();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        API.get('admin/dashboard', false, false, true).then(result => {
            if (result?.stats) setDashboard(result);
            else setError(result?.message || 'Không thể tải dữ liệu dashboard.');
        });
    }, [API]);

    if (error) return <div className="grid min-h-screen place-items-center p-6 text-center font-bold text-[#d45e45]">{error}</div>;
    if (!dashboard) return <div className="grid min-h-screen place-items-center p-6 text-lg font-bold text-[#71867c]">Đang tải dữ liệu dashboard...</div>;

    const userName = session?.user?.name || 'Quản trị viên';
    const userRole = (session?.user as { role?: string } | undefined)?.role || 'Admin';

    return (
        <main>
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 lg:px-10">
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#80938a]">Admin dashboard</span>
                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Bảng điều khiển vận hành</h1>
                    </div>

                    <div className="hidden items-center gap-3 rounded-full bg-[#f4faf4] px-4 py-2 shadow-sm sm:flex">
                        <span className="text-2xl">🧑‍💼</span>
                        <div>
                            <b className="block">{userName}</b>
                            <small className="text-[#71867c]">{userRole}</small>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 pb-10 pt-8 lg:px-10">
                <section className="flex flex-wrap items-center justify-between gap-5 rounded-[2rem] bg-[#203b35] p-7 text-white shadow-soft">
                    <div>
                        <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#d9f1de]">
                            Tổng quan vận hành
                        </span>
                        <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">Dữ liệu vận hành cập nhật từ hệ thống</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/admin/topics" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#203b35]">Thêm chủ đề</Link>
                        <Link href="/admin/reports" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#203b35]">Xem báo cáo</Link>
                    </div>
                </section>

                <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {dashboard.stats.map(item => (
                        <div key={item.label} className="rounded-[1.75rem] bg-white p-5 shadow-soft">
                            <div className="flex items-center justify-between">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm" style={{ backgroundColor: item.accent }}>
                                    {item.icon}
                                </span>
                                <span className="rounded-full bg-[#eef8ef] px-2.5 py-1 text-xs font-bold text-[#2d6358]">{item.delta}</span>
                            </div>
                            <div className="mt-6">
                                <p className="text-sm font-bold text-[#7f928d]">{item.label}</p>
                                <h3 className="mt-2 text-3xl font-extrabold">{item.value}</h3>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
                    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <span className="text-sm font-bold text-[#83968c]">Độ tiến bộ</span>
                                <h3 className="mt-2 text-2xl font-extrabold">Tổng quan khóa học</h3>
                            </div>
                            <button className="rounded-full bg-[#f4faf4] px-4 py-2 text-sm font-bold text-[#203b35]">Xuất báo cáo</button>
                        </div>

                        <div className="mt-6 flex h-52 items-end gap-3">
                            {dashboard.trend.map(item => (
                                <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                                    <div className="w-full rounded-t-2xl bg-[#dfeff0]" style={{ height: `${Math.max(item.value, 4)}%` }}>
                                        <div className="h-full rounded-t-2xl bg-gradient-to-t from-[#f47d52] to-[#f7b15e]" />
                                    </div>
                                    <span className="text-xs font-bold text-[#7f928d]">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-[#fff6e8] p-6 shadow-soft">
                        <span className="text-sm font-bold text-[#ef7d32]">Đặt hàng mới</span>
                        <h3 className="mt-2 text-2xl font-extrabold">Giao dịch gần đây</h3>

                        <div className="mt-5 space-y-3">
                            {dashboard.orders.map(order => (
                                <div key={order.id} className="rounded-2xl bg-white p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <b className="block text-sm">{order.id}</b>
                                            <small className="text-[#70857e]">{order.customer}</small>
                                        </div>
                                        <span className="rounded-full bg-[#eef8ef] px-2 py-1 text-[11px] font-bold text-[#2d6358]">{order.status}</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-sm text-[#70857e]">Tổng tiền</span>
                                        <b className="text-[#203b35]">{order.total}</b>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <span className="text-sm font-bold text-[#83968c]">Top khóa học</span>
                                <h3 className="mt-2 text-2xl font-extrabold">Mức độ hoàn thành theo chủ đề</h3>
                            </div>
                        </div>

                        <div className="mt-6 space-y-5">
                            {dashboard.lessons.map(item => (
                                <div key={item.title} className="rounded-2xl bg-[#f4faf4] p-4">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <div>
                                            <b>{item.title}</b>
                                            <small className="block text-[#71867c]">{item.lessons} buổi học</small>
                                        </div>
                                        <span className="font-bold text-[#203b35]">{item.progress}%</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-white">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${item.progress}%`, backgroundColor: item.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                        <span className="text-sm font-bold text-[#83968c]">Hoạt động mới</span>
                        <h3 className="mt-2 text-2xl font-extrabold">Sự kiện gần đây</h3>

                        <div className="mt-5 space-y-4">
                            {dashboard.activities.map(item => (
                                <div key={item.time} className="flex gap-3 rounded-2xl bg-[#f4faf4] p-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f4fb] text-lg">⏱</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <b className="text-sm">{item.title}</b>
                                            <span className="text-[11px] font-bold text-[#71867c]">{item.time}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-[#60766e]">{item.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
