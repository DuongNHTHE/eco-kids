const stats = [
    { label: 'Tổng doanh thu', value: '₫1.42T', delta: '+22.7%', accent: '#f47d52', icon: '💸' },
    { label: 'Khách hàng active', value: '24.8K', delta: '+14.3%', accent: '#6eaa83', icon: '👥' },
    { label: 'Dự án đang vận hành', value: '128', delta: '+9.1%', accent: '#f5b83d', icon: '🚀' },
    { label: 'Tỷ lệ giữ chân', value: '87.4%', delta: '+4.8%', accent: '#2d6358', icon: '📈' },
];

const network = [
    { name: 'HCM Center', status: 'Online', clients: 432, revenue: '₫220M', color: '#f47d52' },
    { name: 'Hà Nội Hub', status: 'Online', clients: 386, revenue: '₫196M', color: '#6eaa83' },
    { name: 'Đà Nẵng Lab', status: 'Maintenance', clients: 184, revenue: '₫88M', color: '#f5b83d' },
    { name: 'Cần Thơ School', status: 'Online', clients: 271, revenue: '₫144M', color: '#2d6358' },
];

const approvals = [
    { title: 'Bài học New Animals Pack', school: 'Mầm non Mặt Trời', owner: 'Lan Anh', priority: 'Cao' },
    { title: 'Tài liệu Food Journey', school: 'Tiểu học Thăng Long', owner: 'Minh', priority: 'Trung bình' },
    { title: 'Phương án onboarding', school: 'ECO Learning Lab', owner: 'Huy', priority: 'Thấp' },
];

const audit = [
    { time: '08:15', detail: 'Cập nhật role cho 12 admin mới' },
    { time: '10:35', detail: 'Triển khai bộ đề xuất học tập mới' },
    { time: '13:20', detail: 'Báo cáo tài chính được đồng bộ' },
    { time: '16:10', detail: 'Backup dữ liệu hệ thống hoàn tất' },
];

const quickActions = ['Quản lý vai trò', 'Cấp quyền', 'Xuất báo cáo', 'Backup hệ thống'];

export default function SuperAdminPage() {
    return (
        <main>
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 lg:px-10">
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#80938a]">SuperAdmin</span>
                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Bảng điều khiển hệ thống</h1>
                    </div>

                    <div className="hidden items-center gap-3 rounded-full bg-[#f4faf4] px-4 py-2 shadow-sm sm:flex">
                        <span className="text-2xl">👑</span>
                        <div>
                            <b className="block">Vũ Minh</b>
                            <small className="text-[#71867c]">Super Administrator</small>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 pb-10 pt-8 lg:px-10">
                <section className="flex flex-wrap items-center justify-between gap-5 rounded-[2rem] bg-[#203b35] p-7 text-white shadow-soft">
                    <div>
                        <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#d9f1de]">
                            Hệ thống quốc gia
                        </span>
                        <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">Cơ sở hạ tầng đang hoạt động mạnh mẽ</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {quickActions.map(action => (
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

                <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
                    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <span className="text-sm font-bold text-[#83968c]">Mạng lưới</span>
                                <h3 className="mt-2 text-2xl font-extrabold">Hiệu suất cơ sở trên toàn quốc</h3>
                            </div>
                            <button className="rounded-full bg-[#f4faf4] px-4 py-2 text-sm font-bold text-[#203b35]">Xem chi tiết</button>
                        </div>

                        <div className="mt-6 space-y-4">
                            {network.map(item => (
                                <div key={item.name} className="flex items-center justify-between gap-4 rounded-2xl bg-[#f4faf4] p-4">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl" style={{ backgroundColor: `${item.color}22`, color: item.color }}>
                                            {item.name.charAt(0)}
                                        </span>
                                        <div>
                                            <b>{item.name}</b>
                                            <small className="block text-[#71867c]">{item.status}</small>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <small className="block text-[#71867c]">Khách hàng</small>
                                        <b>{item.clients}</b>
                                    </div>
                                    <div className="text-right">
                                        <small className="block text-[#71867c]">Doanh thu</small>
                                        <b>{item.revenue}</b>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-[#fff6e8] p-6 shadow-soft">
                        <span className="text-sm font-bold text-[#ef7d32]">Phê duyệt</span>
                        <h3 className="mt-2 text-2xl font-extrabold">Yêu cầu chờ xử lý</h3>

                        <div className="mt-5 space-y-3">
                            {approvals.map(item => (
                                <div key={item.title} className="rounded-2xl bg-white p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <b className="text-sm">{item.title}</b>
                                        <span className="rounded-full bg-[#eef8ef] px-2 py-1 text-[11px] font-bold text-[#2d6358]">{item.priority}</span>
                                    </div>
                                    <p className="mt-2 text-sm text-[#71867c]">{item.school} · {item.owner}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                        <span className="text-sm font-bold text-[#83968c]">Biểu đồ</span>
                        <h3 className="mt-2 text-2xl font-extrabold">Xu hướng tăng trưởng toàn hệ thống</h3>

                        <div className="mt-6 flex h-52 items-end gap-3">
                            {[32, 44, 38, 58, 66, 80, 92, 88].map((value, index) => (
                                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                                    <div className="w-full rounded-t-2xl bg-[#dfeff0]" style={{ height: `${value}%` }}>
                                        <div className="h-full rounded-t-2xl bg-gradient-to-t from-[#2d6358] to-[#6eaa83]" />
                                    </div>
                                    <span className="text-xs font-bold text-[#7f928d]">M{index + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                        <span className="text-sm font-bold text-[#83968c]">Audit log</span>
                        <h3 className="mt-2 text-2xl font-extrabold">Hoạt động gần đây</h3>

                        <div className="mt-5 space-y-4">
                            {audit.map(item => (
                                <div key={item.time} className="flex gap-3 rounded-2xl bg-[#f4faf4] p-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f4fb] text-lg">⏱</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <b className="text-sm">{item.detail}</b>
                                            <span className="text-[11px] font-bold text-[#71867c]">{item.time}</span>
                                        </div>
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
