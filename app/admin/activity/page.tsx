'use client';

import { FormEvent, useEffect, useState } from 'react';

type ActivityRecord = {
    id: string;
    userId: string;
    actorEmail: string | null;
    actorRole: string | null;
    eventType: 'PAGE_VIEW' | 'INTERACTION';
    path: string;
    targetType: 'LINK' | 'BUTTON' | 'OTHER' | null;
    targetLabel: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
};

type ActivityResponse = {
    items: ActivityRecord[];
    pagination: { page: number; total: number; totalPages: number };
};

export default function AdminActivityPage() {
    const [result, setResult] = useState<ActivityResponse | null>(null);
    const [search, setSearch] = useState('');
    const [eventType, setEventType] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [filters, setFilters] = useState({ q: '', eventType: '', from: '', to: '' });
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams({ page: String(page), limit: '25' });
        if (filters.q) params.set('q', filters.q);
        if (filters.eventType) params.set('eventType', filters.eventType);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);

        async function loadActivities() {
            setLoading(true);
            try {
                const response = await fetch(`/api/admin/user-activity?${params}`, {
                    cache: 'no-store',
                    signal: controller.signal,
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data?.message || 'Không thể tải lịch sử hoạt động.');
                setResult(data as ActivityResponse);
                setError('');
            } catch (loadError) {
                if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
                setError(loadError instanceof Error ? loadError.message : 'Không thể tải lịch sử hoạt động.');
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        void loadActivities();
        return () => controller.abort();
    }, [filters, page, refreshKey]);

    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setPage(1);
        setFilters({ q: search.trim(), eventType, from, to });
    }

    return (
        <main className="min-h-screen bg-[#f4faf4] text-[#203b35]">
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 lg:px-10">
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#80938a]">Quản trị</span>
                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Lịch sử truy cập &amp; tương tác</h1>
                    </div>
                    <button
                        type="button"
                        onClick={() => setRefreshKey(current => current + 1)}
                        className="rounded-full bg-[#203b35] px-5 py-3 text-sm font-bold text-white"
                    >
                        Làm mới
                    </button>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 pb-10 pt-8 lg:px-10">
                <p className="mb-6 rounded-2xl border border-[#dceadd] bg-white p-4 text-sm text-[#557168]">
                    Hệ thống ghi lại trang đã truy cập, loại phần tử được nhấp, thời điểm, IP và trình duyệt. Nội dung người dùng nhập vào biểu mẫu không được thu thập.
                </p>

                <form onSubmit={applyFilters} className="mb-6 grid gap-4 rounded-2xl bg-white p-4 shadow-soft sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#7a8f87]">
                        Tìm người dùng, trang, thao tác
                        <input
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder="Email hoặc đường dẫn..."
                            className="mt-2 w-full rounded-xl border border-[#dfe9e1] bg-[#f6faf7] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#234036] outline-none focus:border-[#6eaa83]"
                        />
                    </label>
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#7a8f87]">
                        Hoạt động
                        <select
                            value={eventType}
                            onChange={event => setEventType(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-[#dfe9e1] bg-[#f6faf7] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#234036]"
                        >
                            <option value="">Tất cả</option>
                            <option value="PAGE_VIEW">Truy cập trang</option>
                            <option value="INTERACTION">Tương tác</option>
                        </select>
                    </label>
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#7a8f87]">
                        Từ ngày
                        <input type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe9e1] bg-[#f6faf7] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#234036]" />
                    </label>
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#7a8f87]">
                        Đến ngày
                        <input type="date" value={to} onChange={event => setTo(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe9e1] bg-[#f6faf7] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#234036]" />
                    </label>
                    <button type="submit" className="self-end rounded-xl bg-[#6eaa83] px-5 py-3 text-sm font-bold text-white">
                        Lọc dữ liệu
                    </button>
                </form>

                {error && <p className="mb-5 rounded-2xl bg-[#fff0e8] p-4 font-bold text-[#d45e45]">{error}</p>}

                <section className="overflow-hidden rounded-2xl border border-[#dfe9e1] bg-white shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf3ed] px-5 py-4">
                        <h2 className="font-extrabold">Sự kiện người dùng</h2>
                        <span className="text-sm text-[#71867c]">{result?.pagination.total ?? 0} sự kiện</span>
                    </div>
                    {loading ? (
                        <div className="p-10 text-center font-bold text-[#71867c]">Đang tải lịch sử hoạt động...</div>
                    ) : !result?.items.length ? (
                        <div className="p-10 text-center text-[#71867c]">Chưa có hoạt động phù hợp với bộ lọc.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-[#f4faf4] text-[#557168]">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-bold">Thời điểm</th>
                                        <th className="px-4 py-3 font-bold">Người dùng</th>
                                        <th className="px-4 py-3 font-bold">Hoạt động</th>
                                        <th className="px-4 py-3 font-bold">Trang truy cập</th>
                                        <th className="px-4 py-3 font-bold">Chi tiết tương tác</th>
                                        <th className="px-4 py-3 font-bold">IP / trình duyệt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.items.map(item => (
                                        <tr key={item.id} className="border-t border-[#edf3ed] align-top">
                                            <td className="whitespace-nowrap px-4 py-4 text-[#557168]">
                                                {new Date(item.createdAt).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-[#203b35]">{item.actorEmail || 'Tài khoản không còn tồn tại'}</div>
                                                <div className="mt-1 text-xs text-[#71867c]">{item.actorRole || 'Không rõ vai trò'}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${item.eventType === 'PAGE_VIEW' ? 'bg-[#e7f2e9] text-[#2d6358]' : 'bg-[#fff0e8] text-[#bf603f]'}`}>
                                                    {item.eventType === 'PAGE_VIEW' ? 'Truy cập trang' : 'Tương tác'}
                                                </span>
                                            </td>
                                            <td className="max-w-[260px] break-all px-4 py-4 font-mono text-xs text-[#3d554d]">{item.path}</td>
                                            <td className="px-4 py-4 text-[#557168]">
                                                {item.targetType ? `${item.targetType === 'LINK' ? 'Liên kết' : item.targetType === 'BUTTON' ? 'Nút' : 'Khác'}${item.targetLabel ? ` · ${item.targetLabel}` : ''}` : '—'}
                                            </td>
                                            <td className="px-4 py-4 text-xs text-[#71867c]">
                                                <div>{item.ipAddress || 'Không rõ IP'}</div>
                                                <div className="mt-1 max-w-[220px] truncate" title={item.userAgent || undefined}>{item.userAgent || 'Không rõ trình duyệt'}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="flex items-center justify-between border-t border-[#edf3ed] px-5 py-4">
                        <span className="text-sm text-[#71867c]">Trang {result?.pagination.page ?? page} / {Math.max(result?.pagination.totalPages ?? 0, 1)}</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={page <= 1 || loading}
                                onClick={() => setPage(current => Math.max(1, current - 1))}
                                className="rounded-lg border border-[#dfe9e1] px-4 py-2 text-sm font-bold disabled:opacity-40"
                            >
                                Trước
                            </button>
                            <button
                                type="button"
                                disabled={loading || page >= (result?.pagination.totalPages ?? 0)}
                                onClick={() => setPage(current => current + 1)}
                                className="rounded-lg border border-[#dfe9e1] px-4 py-2 text-sm font-bold disabled:opacity-40"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
