'use client';

import { useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';

type OrderItem = { productId?: string; packageId?: string; name: string; price: number; quantity: number };
type OrderInvoice = {
    number: string;
    issuedAt: string;
    orderId: string;
    customer: { name: string; phone: string; address: string };
    items: (OrderItem & { lineTotal: number })[];
    subtotal: number;
    total: number;
    seller: { name: string };
};
type Order = {
    id: string;
    customer: { name?: string; phone?: string; address?: string };
    items: OrderItem[];
    total: number;
    status: string;
    isRead: boolean;
    paymentReceiptUploaded: boolean;
    invoice: OrderInvoice | null;
    createdAt: string;
};

type OrderCounts = Record<string, number>;
type SalesStats = {
    orderCount: number;
    revenue: number;
    averageOrder: number;
    pendingCount: number;
    invoiceCount: number;
    dailySales: { _id: string; revenue: number; orderCount: number }[];
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
const emptyStats: SalesStats = { orderCount: 0, revenue: 0, averageOrder: 0, pendingCount: 0, invoiceCount: 0, dailySales: [] };

export default function AdminOrdersPage() {
    const { API } = useAPI();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filter, setFilter] = useState('all');
    const [range, setRange] = useState('30');
    const [counts, setCounts] = useState<OrderCounts>({});
    const [stats, setStats] = useState<SalesStats>(emptyStats);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [invoiceView, setInvoiceView] = useState<OrderInvoice | null>(null);
    const [paymentReceiptView, setPaymentReceiptView] = useState<{ dataUrl: string; uploadedAt?: string } | null>(null);
    const [issuingInvoiceId, setIssuingInvoiceId] = useState('');

    async function loadOrders() {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ range });
        if (filter !== 'all') params.set('status', filter);
        const query = `?${params.toString()}`;
        const result = await API.get(`admin/orders${query}`, false, true, true);
        if (Array.isArray(result?.orders)) setOrders(result.orders);
        else if (Array.isArray(result)) setOrders(result);
        if (result?.counts) setCounts(result.counts);
        if (result?.stats) setStats(result.stats);
        if (!result?.counts) setError(result?.message || 'Không thể tải đơn hàng.');
        setLoading(false);
    }

    useEffect(() => { loadOrders(); }, [filter, range]);

    async function updateStatus(orderId: string, status: string) {
        const result = await API.put('admin/orders', { orderId, status }, true, true, true);
        if (result?.order) {
            const previousOrder = orders.find(order => order.id === orderId);
            setOrders(current => current.map(order => order.id === orderId ? result.order : order));
            if (previousOrder && previousOrder.status !== status) {
                setCounts(current => ({
                    ...current,
                    [previousOrder.status]: Math.max(0, (current[previousOrder.status] || 0) - 1),
                    [status]: (current[status] || 0) + 1,
                }));
            }
        }
    }

    async function saveInvoice(order: Order) {
        if (order.invoice) {
            setInvoiceView(order.invoice);
            return;
        }
        setIssuingInvoiceId(order.id);
        const result = await API.patch('admin/orders', { orderId: order.id, action: 'issue-invoice' }, false, true, true);
        setIssuingInvoiceId('');
        if (result?.order?.invoice) {
            setOrders(current => current.map(item => item.id === order.id ? result.order : item));
            setInvoiceView(result.order.invoice);
            if (result.message === 'Đã lưu hóa đơn bán hàng.') {
                setStats(current => ({ ...current, invoiceCount: current.invoiceCount + 1 }));
            }
        }
    }

    async function viewPaymentReceipt(orderId: string) {
        const result = await API.get(`orders/${orderId}/payment-receipt`, false, true, true);
        if (result?.dataUrl) {
            setPaymentReceiptView({ dataUrl: result.dataUrl, uploadedAt: result.uploadedAt });
        }
    }

    function printInvoice() {
        if (!invoiceView) return;
        const removePrintMode = () => document.body.classList.remove('invoice-printing');
        document.body.classList.add('invoice-printing');
        window.addEventListener('afterprint', removePrintMode, { once: true });
        window.print();
        window.setTimeout(removePrintMode, 1000);
    }

    const maxDailyRevenue = Math.max(...stats.dailySales.map(day => day.revenue), 1);

    return (
        <main className="admin-orders-page">
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 lg:px-10">
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#80938a]">
                            Vận hành bán hàng
                        </span>

                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
                            Bán hàng & đơn hàng
                        </h1>

                        <p className="mt-1 text-[#71867c]">
                            Theo dõi doanh số, đơn hàng và hóa đơn bán hàng.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm font-bold text-[#60766e]">
                            Thống kê
                            <select value={range} onChange={event => setRange(event.target.value)} className="ml-2 rounded-xl border border-[#dceadd] bg-white px-3 py-2">
                                <option value="7">7 ngày</option>
                                <option value="30">30 ngày</option>
                                <option value="90">90 ngày</option>
                                <option value="all">Toàn thời gian</option>
                            </select>
                        </label>
                        <button
                            type="button"
                            onClick={loadOrders}
                            className="rounded-full bg-[#203b35] px-5 py-3 text-sm font-bold text-white"
                        >
                            Làm mới
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 pb-10 pt-8 lg:px-10">
                <section aria-label="Thống kê bán hàng" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Giá trị đơn không huỷ', value: money(stats.revenue), hint: `Trong ${range === 'all' ? 'toàn thời gian' : `${range} ngày gần đây`}`, icon: '💰', color: 'bg-[#e9f3eb]' },
                        { label: 'Số đơn hàng', value: String(stats.orderCount), hint: 'Bao gồm đơn đã huỷ', icon: '🧾', color: 'bg-[#eaf1ff]' },
                        { label: 'Đơn mới cần xử lý', value: String(stats.pendingCount), hint: 'Đang chờ xác nhận', icon: '📦', color: 'bg-[#fff2d5]' },
                        { label: 'Hóa đơn đã lưu', value: String(stats.invoiceCount), hint: `Giá trị TB: ${money(stats.averageOrder)}`, icon: '📄', color: 'bg-[#f4eefe]' },
                    ].map(card => (
                        <article key={card.label} className="rounded-3xl bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-[#71867c]">{card.label}</p>
                                    <p className="mt-2 text-2xl font-extrabold text-[#203b35]">{card.value}</p>
                                    <p className="mt-1 text-xs text-[#80938a]">{card.hint}</p>
                                </div>
                                <span className={`grid h-11 w-11 place-items-center rounded-2xl text-xl ${card.color}`} aria-hidden>{card.icon}</span>
                            </div>
                        </article>
                    ))}
                </section>

                <section aria-label="Doanh số 7 ngày gần đây" className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h2 className="text-xl font-extrabold">Doanh số 7 ngày gần đây</h2>
                            <p className="mt-1 text-sm text-[#71867c]">Không tính các đơn đã huỷ.</p>
                        </div>
                        <div className="text-right">
                            <strong className="text-lg text-[#2d6358]">{money(stats.dailySales.reduce((sum, day) => sum + day.revenue, 0))}</strong>
                            <p className="text-xs text-[#80938a]">Theo giá trị đơn, chưa đối soát thanh toán</p>
                        </div>
                    </div>
                    <div className="mt-5 flex h-40 items-end gap-2 sm:gap-4">
                        {stats.dailySales.length ? stats.dailySales.map(day => {
                            const height = Math.max(8, (day.revenue / maxDailyRevenue) * 100);
                            return (
                                <div key={day._id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                                    <span className="text-center text-[10px] font-bold text-[#71867c] sm:text-xs">{money(day.revenue)}</span>
                                    <div className="flex h-24 w-full items-end rounded-t-lg bg-[#eef8ef]">
                                        <div title={`${day.orderCount} đơn · ${money(day.revenue)}`} className="w-full rounded-t-lg bg-[#6eaa83]" style={{ height: `${height}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-[#71867c]">{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${day._id}T12:00:00+07:00`))}</span>
                                </div>
                            );
                        }) : <p className="self-center text-sm text-[#80938a]">Chưa có doanh số trong 7 ngày gần đây.</p>}
                    </div>
                </section>

                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setFilter("all")}
                        className={`rounded-full px-4 py-2 text-sm font-bold ${filter === "all"
                            ? "bg-[#203b35] text-white"
                            : "bg-white text-[#527067]"
                            }`}
                    >
                        Tất cả ({Object.values(counts).reduce((total, count) => total + count, 0)})
                    </button>

                    {statuses.map((status) => (
                        <button
                            key={status.value}
                            type="button"
                            onClick={() => setFilter(status.value)}
                            className={`rounded-full px-4 py-2 text-sm font-bold ${filter === status.value
                                ? "bg-[#203b35] text-white"
                                : "bg-white text-[#527067]"
                                }`}
                        >
                            {status.label} ({counts[status.value] || 0})
                        </button>
                    ))}
                </div>

                {error && (
                    <p className="mb-5 rounded-2xl bg-[#fff0e8] p-4 font-bold text-[#d45e45]">
                        {error}
                    </p>
                )}

                {loading ? (
                    <div className="rounded-[2rem] bg-white p-10 text-center font-bold text-[#71867c]">
                        Đang tải đơn hàng...
                    </div>
                ) : orders.length === 0 ? (
                    <div className="rounded-[2rem] bg-white p-10 text-center text-[#71867c]">
                        Chưa có đơn hàng trong bộ lọc này.
                    </div>
                ) : (
                    <div className="space-y-5">
                        {orders.map((order) => (
                            <article
                                key={order.id}
                                className={`cursor-pointer rounded-[2rem] bg-white p-6 shadow-soft ${!order.isRead ? 'border-l-4 border-[#f47d52]' : ''}`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf3ed] pb-5">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 className="text-xl font-extrabold">
                                                Đơn #{order.id.slice(-8).toUpperCase()}
                                            </h2>

                                            <span className="rounded-full bg-[#fff2d5] px-3 py-1 text-xs font-bold text-[#9a7d3a]">
                                                {statuses.find(
                                                    (item) => item.value === order.status
                                                )?.label || order.status}
                                            </span>
                                        </div>

                                        <p className="mt-1 text-sm text-[#71867c]">
                                            {dateTime(order.createdAt)}
                                        </p>
                                    </div>

                                    <strong className="text-2xl">
                                        {money(order.total)}
                                    </strong>
                                </div>

                                <div className="grid gap-6 py-5 lg:grid-cols-[.8fr_1.2fr]">
                                    <div className="rounded-2xl bg-[#f4faf4] p-4">
                                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#83968c]">
                                            Khách hàng
                                        </span>

                                        <h3 className="mt-2 text-lg font-extrabold">
                                            {order.customer.name || "Chưa có tên"}
                                        </h3>

                                        <p className="mt-1 text-sm">
                                            {order.customer.phone ||
                                                "Chưa có số điện thoại"}
                                        </p>

                                        <p className="mt-2 text-sm text-[#60766e]">
                                            {order.customer.address || "Chưa có địa chỉ"}
                                        </p>
                                    </div>

                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#83968c]">
                                            Sản phẩm
                                        </span>

                                        <div className="mt-2 space-y-2">
                                            {order.items.map((item, index) => (
                                                <div
                                                    key={`${item.productId || item.packageId}-${index}`}
                                                    className="flex items-center justify-between gap-4 rounded-xl border border-[#edf3ed] p-3"
                                                >
                                                    <div>
                                                        <b>{item.name}</b>

                                                        <small className="ml-2 text-[#71867c]">
                                                            {item.packageId
                                                                ? "Package"
                                                                : "Mô hình"}{" "}
                                                            · SL {item.quantity}
                                                        </small>
                                                    </div>

                                                    <strong>
                                                        {money(
                                                            item.price * item.quantity
                                                        )}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {order.paymentReceiptUploaded && (
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#e9f3eb] px-4 py-3">
                                        <span className="text-sm font-bold text-[#2d6358]">Đã nhận ảnh bill chuyển khoản</span>
                                        <button
                                            type="button"
                                            onClick={() => viewPaymentReceipt(order.id)}
                                            className="rounded-full bg-[#2d6358] px-4 py-2 text-sm font-bold text-white"
                                        >
                                            Xem ảnh bill
                                        </button>
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3ed] pt-4">
                                    <span className="text-sm text-[#71867c]">
                                        Cập nhật trạng thái chốt đơn:
                                    </span>

                                    <select
                                        value={order.status}
                                        onChange={(event) =>
                                            updateStatus(
                                                order.id,
                                                event.target.value
                                            )
                                        }
                                        className="rounded-xl border border-[#dceadd] bg-white px-4 py-2 text-sm font-bold outline-none focus:border-[#6eaa83]"
                                    >
                                        {statuses.map((status) => (
                                            <option
                                                key={status.value}
                                                value={status.value}
                                            >
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => saveInvoice(order)}
                                            disabled={issuingInvoiceId === order.id || (order.status === 'cancelled' && !order.invoice)}
                                            className="rounded-full bg-[#2d6358] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                                        >
                                            {issuingInvoiceId === order.id ? 'Đang lưu...' : order.invoice ? 'Xem hóa đơn' : 'Lập & lưu hóa đơn'}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {invoiceView && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-[#203b35]/60 p-4">
                    <section id="invoice-print" className="w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-10">
                        <div className="invoice-no-print mb-6 flex flex-wrap justify-end gap-3">
                            <button type="button" onClick={() => setInvoiceView(null)} className="rounded-full border border-[#dceadd] px-5 py-2 font-bold text-[#526d64]">Đóng</button>
                            <button type="button" onClick={printInvoice} className="rounded-full bg-[#203b35] px-5 py-2 font-bold text-white">In / Lưu PDF</button>
                        </div>
                        <div className="border-b-2 border-[#203b35] pb-5">
                            <p className="text-sm font-extrabold tracking-[0.2em] text-[#2d6358]">{invoiceView.seller?.name || 'ECO-KIDS'}</p>
                            <h2 className="mt-2 text-3xl font-extrabold">HÓA ĐƠN BÁN HÀNG</h2>
                            <p className="mt-2 text-sm text-[#71867c]">Số hóa đơn: <b className="text-[#203b35]">{invoiceView.number}</b></p>
                            <p className="text-sm text-[#71867c]">Ngày lập: <b className="text-[#203b35]">{dateTime(invoiceView.issuedAt)}</b></p>
                        </div>
                        <div className="grid gap-4 border-b border-[#dceadd] py-5 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-[#80938a]">Khách hàng</p>
                                <p className="mt-1 font-extrabold">{invoiceView.customer.name}</p>
                                <p className="text-sm">{invoiceView.customer.phone}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-[#80938a]">Địa chỉ giao hàng</p>
                                <p className="mt-1 text-sm">{invoiceView.customer.address}</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="mt-5 w-full text-left text-sm">
                                <thead><tr className="border-b border-[#dceadd] text-[#71867c]"><th className="py-3 pr-2">Sản phẩm</th><th className="px-2 py-3 text-right">SL</th><th className="px-2 py-3 text-right">Đơn giá</th><th className="py-3 pl-2 text-right">Thành tiền</th></tr></thead>
                                <tbody>
                                    {invoiceView.items.map((item, index) => (
                                        <tr key={`${item.name}-${index}`} className="border-b border-[#edf3ed]">
                                            <td className="py-3 pr-2 font-bold">{item.name}</td>
                                            <td className="px-2 py-3 text-right">{item.quantity}</td>
                                            <td className="px-2 py-3 text-right">{money(item.price)}</td>
                                            <td className="py-3 pl-2 text-right font-bold">{money(item.lineTotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="ml-auto mt-5 max-w-xs space-y-2 text-right">
                            <p>Tạm tính <b className="ml-4">{money(invoiceView.subtotal)}</b></p>
                            <p className="border-t-2 border-[#203b35] pt-3 text-lg font-extrabold">Tổng cộng <span className="ml-4">{money(invoiceView.total)}</span></p>
                        </div>
                        <p className="mt-10 text-center text-sm text-[#71867c]">Cảm ơn quý khách đã mua hàng!</p>
                    </section>
                </div>
            )}
            {paymentReceiptView && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-[#203b35]/60 p-4">
                    <section className="w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-extrabold">Bill chuyển khoản</h2>
                                {paymentReceiptView.uploadedAt && (
                                    <p className="mt-1 text-sm text-[#71867c]">Gửi lúc {dateTime(paymentReceiptView.uploadedAt)}</p>
                                )}
                            </div>
                            <button type="button" onClick={() => setPaymentReceiptView(null)} className="rounded-full border border-[#dceadd] px-4 py-2 font-bold text-[#526d64]">Đóng</button>
                        </div>
                        <img src={paymentReceiptView.dataUrl} alt="Ảnh bill chuyển khoản" className="mx-auto max-h-[75vh] max-w-full rounded-xl object-contain" />
                    </section>
                </div>
            )}
        </main>
    );
}
