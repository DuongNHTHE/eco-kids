'use client';

import { useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';

type OrderItem = { productId?: string; packageId?: string; name: string; price: number; quantity: number };
type Order = {
    id: string;
    customer: { name?: string; phone?: string; address?: string };
    items: OrderItem[];
    total: number;
    status: string;
    createdAt: string;
};

const statuses = [
    { value: 'new', label: 'Mới' },
    { value: 'processing', label: 'Đang chuẩn bị' },
    { value: 'shipped', label: 'Đang giao' },
    { value: 'completed', label: 'Hoàn tất' },
    { value: 'cancelled', label: 'Đã hủy' },
];

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function AdminOrdersPage() {
    const { API } = useAPI();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function loadOrders() {
        setLoading(true);
        const query = filter === 'all' ? '' : `?status=${filter}`;
        const result = await API.get(`admin/orders${query}`, false, true, true);
        if (Array.isArray(result)) setOrders(result);
        else setError(result?.message || 'Không thể tải đơn hàng.');
        setLoading(false);
    }

    useEffect(() => { loadOrders(); }, [filter]);

    async function updateStatus(orderId: string, status: string) {
        const result = await API.put('admin/orders', { orderId, status }, true, true, true);
        if (result?.order) setOrders(current => current.map(order => order.id === orderId ? result.order : order));
    }

    return (
        <main>
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 lg:px-10">
                    <div><span className="text-sm font-bold uppercase tracking-[0.2em] text-[#80938a]">Vận hành bán hàng</span><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Chốt đơn hàng</h1><p className="mt-1 text-[#71867c]">Theo dõi khách hàng, sản phẩm và trạng thái giao hàng.</p></div>
                    <button type="button" onClick={loadOrders} className="rounded-full bg-[#203b35] px-5 py-3 text-sm font-bold text-white">Làm mới</button>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 pb-10 pt-8 lg:px-10">
                <div className="mb-6 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setFilter('all')} className={`rounded-full px-4 py-2 text-sm font-bold ${filter === 'all' ? 'bg-[#203b35] text-white' : 'bg-white text-[#527067]'}`}>Tất cả</button>
                    {statuses.map(status => <button key={status.value} type="button" onClick={() => setFilter(status.value)} className={`rounded-full px-4 py-2 text-sm font-bold ${filter === status.value ? 'bg-[#203b35] text-white' : 'bg-white text-[#527067]'}`}>{status.label}</button>)}
                </div>

                {error && <p className="mb-5 rounded-2xl bg-[#fff0e8] p-4 font-bold text-[#d45e45]">{error}</p>}
                {loading ? <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#71867c]">Đang tải đơn hàng...</div> : orders.length === 0 ? <div className="rounded-[2rem] bg-white p-10 text-center text-[#71867c]">Chưa có đơn hàng trong bộ lọc này.</div> : <div className="space-y-5">{orders.map(order => <article key={order.id} className="rounded-[2rem] bg-white p-6 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf3ed] pb-5"><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-extrabold">Đơn #{order.id.slice(-8).toUpperCase()}</h2><span className="rounded-full bg-[#fff2d5] px-3 py-1 text-xs font-bold text-[#9a7d3a]">{statuses.find(item => item.value === order.status)?.label || order.status}</span></div><p className="mt-1 text-sm text-[#71867c]">{dateTime(order.createdAt)}</p></div><strong className="text-2xl">{money(order.total)}</strong></div><div className="grid gap-6 py-5 lg:grid-cols-[.8fr_1.2fr]"><div className="rounded-2xl bg-[#f4faf4] p-4"><span className="text-xs font-bold uppercase tracking-[0.15em] text-[#83968c]">Khách hàng</span><h3 className="mt-2 text-lg font-extrabold">{order.customer.name || 'Chưa có tên'}</h3><p className="mt-1 text-sm">{order.customer.phone || 'Chưa có số điện thoại'}</p><p className="mt-2 text-sm text-[#60766e]">{order.customer.address || 'Chưa có địa chỉ'}</p></div><div><span className="text-xs font-bold uppercase tracking-[0.15em] text-[#83968c]">Sản phẩm</span><div className="mt-2 space-y-2">{order.items.map((item, index) => <div key={`${item.productId || item.packageId}-${index}`} className="flex items-center justify-between gap-4 rounded-xl border border-[#edf3ed] p-3"><div><b>{item.name}</b><small className="ml-2 text-[#71867c]">{item.packageId ? 'Package' : 'Mô hình'} · SL {item.quantity}</small></div><strong>{money(item.price * item.quantity)}</strong></div>)}</div></div></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3ed] pt-4"><span className="text-sm text-[#71867c]">Cập nhật trạng thái chốt đơn:</span><select value={order.status} onChange={event => updateStatus(order.id, event.target.value)} className="rounded-xl border border-[#dceadd] bg-white px-4 py-2 text-sm font-bold outline-none focus:border-[#6eaa83]">{statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></div></article>)}</div>}
            </div>
        </main>
    );
}
