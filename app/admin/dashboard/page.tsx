'use client';

import Link from 'next/link';

const stats = [
    { label: 'Học sinh đang học', value: '1,284', delta: '+12.4%', accent: 'bg-[#f47d52]', icon: '👧' },
    { label: 'Bài học hoàn tất', value: '8,430', delta: '+8.1%', accent: 'bg-[#6eaa83]', icon: '✅' },
    { label: 'Doanh thu tháng', value: '₫86.4M', delta: '+18.2%', accent: 'bg-[#f5b83d]', icon: '💰' },
    { label: 'Trường hợp tác', value: '42', delta: '+6', accent: 'bg-[#2d6358]', icon: '🏫' },
];

const lessons = [
    { title: 'Animals Adventure', progress: 82, lessons: 14, color: '#f47d52' },
    { title: 'Daily Routine', progress: 74, lessons: 11, color: '#6eaa83' },
    { title: 'Food & Fruits', progress: 68, lessons: 9, color: '#f5b83d' },
    { title: 'Travel & Transport', progress: 91, lessons: 18, color: '#2d6358' },
];

const trend = [42, 58, 48, 64, 71, 84, 92];

const orders = [
    { id: '#ECO-1042', customer: 'Nguyễn Thu Hà', total: '₫3.490.000', status: 'Đã thanh toán' },
    { id: '#ECO-1038', customer: 'Trần Minh An', total: '₫2.180.000', status: 'Đang xử lý' },
    { id: '#ECO-1035', customer: 'Lê Bảo Quỳnh', total: '₫5.200.000', status: 'Đã giao' },
    { id: '#ECO-1029', customer: 'Hoàng Gia Hân', total: '₫1.890.000', status: 'Chờ xác nhận' },
];

const activities = [
    { time: '09:40', title: 'Mẫu bài học mới được xuất bản', detail: 'Animals Adventure · 3 module mới' },
    { time: '11:05', title: 'Khách hàng đăng ký tư vấn', detail: 'Mầm non Mặt Trời · 4 lớp' },
    { time: '13:20', title: 'Cập nhật tiến độ học tập', detail: '82 học sinh hoàn thành bài 5' },
    { time: '15:50', title: 'Đơn hàng mới được tạo', detail: '2 đơn trong 1 giờ qua' },
];

const quickActions = ['Xuất báo cáo', 'Thêm chủ đề', 'Duyệt bài học', 'Quản lý trường'];

export default function AdminDashboardPage() {
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
                            <b className="block">Nguyễn Huy</b>
                            <small className="text-[#71867c]">Quản trị viên</small>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 pb-10 pt-8 lg:px-10">
                <section className="flex flex-wrap items-center justify-between gap-5 rounded-[2rem] bg-[#203b35] p-7 text-white shadow-soft">
                    <div>
                        <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#d9f1de]">
                            Tổng quan tháng 8
                        </span>
                        <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">Tăng 24% tỷ lệ hoàn thành khóa học</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {quickActions.map(action => action === 'Thêm chủ đề' ? (
                            <Link key={action} href="/admin/topics" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#203b35]">
                                {action}
                            </Link>
                        ) : (
                            <button key={action} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#203b35]">
                                {action}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map(item => (
                        <div key={item.label} className="rounded-[1.75rem] bg-white p-5 shadow-soft">
                            <div className="flex items-center justify-between">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm" style={{ backgroundColor: `${item.accent.replace('bg-', '').replace(/\[|\]/g, '')}` }}>
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
                            {trend.map((value, index) => (
                                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                                    <div className="w-full rounded-t-2xl bg-[#dfeff0]" style={{ height: `${value}%` }}>
                                        <div className="h-full rounded-t-2xl bg-gradient-to-t from-[#f47d52] to-[#f7b15e]" />
                                    </div>
                                    <span className="text-xs font-bold text-[#7f928d]">T{index + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-[#fff6e8] p-6 shadow-soft">
                        <span className="text-sm font-bold text-[#ef7d32]">Đặt hàng mới</span>
                        <h3 className="mt-2 text-2xl font-extrabold">Giao dịch gần đây</h3>

                        <div className="mt-5 space-y-3">
                            {orders.map(order => (
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
                            {lessons.map(item => (
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
                            {activities.map(item => (
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
