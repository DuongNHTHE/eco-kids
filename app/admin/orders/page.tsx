'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
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
    orderCode?: string | null;
    customer: { name?: string; phone?: string; address?: string };
    items: OrderItem[];
    total: number;
    status: string;
    paymentStatus: 'pending' | 'confirmed';
    paymentConfirmedAt?: string | null;
    isRead: boolean;
    paymentReceiptUploaded: boolean;
    invoice: OrderInvoice | null;
    createdAt: string;
};

type OrderFilter = 'pending' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';
type DatePreset = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear' | 'custom';
type DateRange = { from: string; to: string; preset: DatePreset };
type PaymentCounts = { pending: number; confirmed: number };
type OrderCounts = Record<string, number>;
type SalesStats = {
    orderCount: number;
    revenue: number;
    averageOrder: number;
    pendingCount: number;
    invoiceCount: number;
    dailySales: { _id: string; revenue: number; orderCount: number }[];
    salesInterval: 'day' | 'month';
};

const statuses = [
    { value: 'new', label: 'Mới' },
    { value: 'processing', label: 'Đang chuẩn bị' },
    { value: 'shipped', label: 'Đang giao' },
    { value: 'completed', label: 'Hoàn tất' },
    { value: 'cancelled', label: 'Đã hủy' },
];

const datePresets: { value: Exclude<DatePreset, 'custom'>; label: string }[] = [
    { value: 'thisWeek', label: 'Tuần này' },
    { value: 'lastWeek', label: 'Tuần trước' },
    { value: 'thisMonth', label: 'Tháng này' },
    { value: 'lastMonth', label: 'Tháng trước' },
    { value: 'thisQuarter', label: 'Quý này' },
    { value: 'lastQuarter', label: 'Quý trước' },
    { value: 'thisYear', label: 'Năm nay' },
    { value: 'lastYear', label: 'Năm trước' },
];

function dateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function presetRange(preset: Exclude<DatePreset, 'custom'>, now = new Date()) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const currentQuarter = Math.floor(today.getMonth() / 3);
    const quarterStart = new Date(today.getFullYear(), currentQuarter * 3, 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    switch (preset) {
        case 'thisWeek':
            return { from: dateKey(weekStart), to: dateKey(today), preset };
        case 'lastWeek': {
            const from = new Date(weekStart);
            from.setDate(from.getDate() - 7);
            const to = new Date(weekStart);
            to.setDate(to.getDate() - 1);
            return { from: dateKey(from), to: dateKey(to), preset };
        }
        case 'thisMonth':
            return { from: dateKey(monthStart), to: dateKey(today), preset };
        case 'lastMonth':
            return {
                from: dateKey(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
                to: dateKey(new Date(today.getFullYear(), today.getMonth(), 0)),
                preset,
            };
        case 'thisQuarter':
            return { from: dateKey(quarterStart), to: dateKey(today), preset };
        case 'lastQuarter':
            return {
                from: dateKey(new Date(today.getFullYear(), currentQuarter * 3 - 3, 1)),
                to: dateKey(new Date(today.getFullYear(), currentQuarter * 3, 0)),
                preset,
            };
        case 'thisYear':
            return { from: dateKey(yearStart), to: dateKey(today), preset };
        case 'lastYear':
            return {
                from: dateKey(new Date(today.getFullYear() - 1, 0, 1)),
                to: dateKey(new Date(today.getFullYear() - 1, 11, 31)),
                preset,
            };
    }
}

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const formatDateOnly = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`));
const emptyStats: SalesStats = { orderCount: 0, revenue: 0, averageOrder: 0, pendingCount: 0, invoiceCount: 0, dailySales: [], salesInterval: 'day' };
const MAX_RECEIPT_SIZE = 4 * 1024 * 1024;

export default function AdminOrdersPage() {
    const { API } = useAPI();
    const [orders, setOrders] = useState<Order[]>([]);
    const [filter, setFilter] = useState<OrderFilter>('pending');
    const [dateRange, setDateRange] = useState<DateRange>(() => presetRange('thisWeek'));
    const [customFrom, setCustomFrom] = useState(() => presetRange('thisWeek').from);
    const [customTo, setCustomTo] = useState(() => presetRange('thisWeek').to);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [dateFilterError, setDateFilterError] = useState('');
    const [paymentCounts, setPaymentCounts] = useState<PaymentCounts>({ pending: 0, confirmed: 0 });
    const [orderCounts, setOrderCounts] = useState<OrderCounts>({});
    const [stats, setStats] = useState<SalesStats>(emptyStats);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [invoiceView, setInvoiceView] = useState<OrderInvoice | null>(null);
    const [paymentReceiptView, setPaymentReceiptView] = useState<{ dataUrl: string; uploadedAt?: string } | null>(null);
    const [issuingInvoiceId, setIssuingInvoiceId] = useState('');
    const [confirmingPaymentId, setConfirmingPaymentId] = useState('');
    const [uploadingReceiptId, setUploadingReceiptId] = useState('');
    const [editingReceiptId, setEditingReceiptId] = useState('');
    const [receiptUploadMessage, setReceiptUploadMessage] = useState<{ orderId: string; text: string } | null>(null);
    const [receiptPreviews, setReceiptPreviews] = useState<Record<string, string>>({});
    const receiptPreviewUrls = useRef<Record<string, string>>({});

    useEffect(() => () => {
        Object.values(receiptPreviewUrls.current).forEach(url => URL.revokeObjectURL(url));
    }, []);

    async function loadOrders() {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ from: dateRange.from, to: dateRange.to });
        if (filter === 'pending' || filter === 'confirmed') params.set('paymentStatus', filter);
        else params.set('status', filter);
        const query = `?${params.toString()}`;
        const result = await API.get(`admin/orders${query}`, false, true, true);
        if (Array.isArray(result?.orders)) setOrders(result.orders);
        else if (Array.isArray(result)) setOrders(result);
        if (result?.paymentCounts) setPaymentCounts(result.paymentCounts);
        if (result?.counts) setOrderCounts(result.counts);
        if (result?.stats) setStats({ ...result.stats, salesInterval: result.salesInterval || 'day' });
        if (!result?.counts) setError(result?.message || 'Không thể tải đơn hàng.');
        setLoading(false);
    }

    useEffect(() => { loadOrders(); }, [filter, dateRange.from, dateRange.to]);

    function chooseDatePreset(preset: Exclude<DatePreset, 'custom'>) {
        const nextRange = presetRange(preset);
        setDateRange(nextRange);
        setCustomFrom(nextRange.from);
        setCustomTo(nextRange.to);
        setDateFilterError('');
        setDatePickerOpen(false);
    }

    function applyCustomDateRange(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!customFrom || !customTo || customFrom > customTo) {
            setDateFilterError('Vui lòng chọn khoảng ngày hợp lệ.');
            return;
        }
        setDateRange({ from: customFrom, to: customTo, preset: 'custom' });
        setDateFilterError('');
        setDatePickerOpen(false);
    }

    const selectedDatePreset = datePresets.find(preset => preset.value === dateRange.preset)?.label;
    const selectedDateLabel = selectedDatePreset
        ? `${selectedDatePreset} · ${dateRange.from} – ${dateRange.to}`
        : `${dateRange.from} – ${dateRange.to}`;

    async function updateStatus(orderId: string, status: string) {
        const result = await API.put('admin/orders', { orderId, status }, true, true, true);
        if (result?.order) {
            const previousOrder = orders.find(order => order.id === orderId);
            if ((filter === 'shipped' || filter === 'completed' || filter === 'cancelled') && status !== filter) {
                setOrders(current => current.filter(order => order.id !== orderId));
            } else {
                setOrders(current => current.map(order => order.id === orderId ? result.order : order));
            }
            if (previousOrder && previousOrder.status !== status) {
                setOrderCounts(current => ({
                    ...current,
                    [previousOrder.status]: Math.max(0, (current[previousOrder.status] || 0) - 1),
                    [status]: (current[status] || 0) + 1,
                }));
            }
        }
    }

    async function confirmPayment(orderId: string) {
        setConfirmingPaymentId(orderId);
        try {
            const result = await API.patch('admin/orders', { orderId, action: 'confirm-payment' }, false, true, true);
            if (result?.order) {
                if (filter === 'pending') {
                    setOrders(current => current.filter(order => order.id !== orderId));
                    setPaymentCounts(current => ({
                        pending: Math.max(0, current.pending - 1),
                        confirmed: current.confirmed + 1,
                    }));
                } else {
                    setOrders(current => current.map(order => order.id === orderId ? result.order : order));
                }
            }
        } finally {
            setConfirmingPaymentId('');
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

    async function uploadPaymentReceipt(orderId: string, event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const receiptInput = form.elements.namedItem('receipt');
        const receipt = receiptInput instanceof HTMLInputElement ? receiptInput.files?.[0] : undefined;
        if (!receipt) {
            setReceiptUploadMessage({ orderId, text: 'Vui lòng chọn ảnh bill chuyển khoản.' });
            return;
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(receipt.type) || receipt.size > MAX_RECEIPT_SIZE) {
            setReceiptUploadMessage({ orderId, text: 'Chỉ nhận ảnh JPG, PNG hoặc WebP có dung lượng tối đa 4 MB.' });
            return;
        }

        setUploadingReceiptId(orderId);
        setReceiptUploadMessage({ orderId, text: 'Đang tải ảnh bill...' });
        try {
            const result = await API.post(`orders/${orderId}/payment-receipt`, new FormData(form), false, true, true);
            if (result?.success) {
                setOrders(current => current.map(order => order.id === orderId
                    ? { ...order, paymentReceiptUploaded: true }
                    : order));
                form.reset();
                clearReceiptPreview(orderId);
                setEditingReceiptId('');
                setReceiptUploadMessage({ orderId, text: 'Đã lưu ảnh bill cho đơn hàng.' });
            } else {
                setReceiptUploadMessage({ orderId, text: result?.message || 'Không thể tải ảnh bill.' });
            }
        } finally {
            setUploadingReceiptId('');
        }
    }

    function previewPaymentReceipt(orderId: string, file?: File) {
        const currentUrl = receiptPreviewUrls.current[orderId];
        if (currentUrl) URL.revokeObjectURL(currentUrl);

        if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            delete receiptPreviewUrls.current[orderId];
            setReceiptPreviews(current => {
                const next = { ...current };
                delete next[orderId];
                return next;
            });
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        receiptPreviewUrls.current[orderId] = previewUrl;
        setReceiptPreviews(current => ({ ...current, [orderId]: previewUrl }));
    }

    function clearReceiptPreview(orderId: string) {
        const previewUrl = receiptPreviewUrls.current[orderId];
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        delete receiptPreviewUrls.current[orderId];
        setReceiptPreviews(current => {
            const next = { ...current };
            delete next[orderId];
            return next;
        });
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
                        <div className="relative">
                            <button
                                type="button"
                                aria-expanded={datePickerOpen}
                                onClick={() => setDatePickerOpen(current => !current)}
                                className="rounded-xl border border-[#dceadd] bg-white px-4 py-3 text-left text-sm font-bold text-[#203b35]"
                            >
                                <span className="block text-xs font-semibold text-[#83968c]">Khoảng thời gian</span>
                                <span>{selectedDateLabel}</span>
                            </button>
                            {datePickerOpen && (
                                <>
                                    <button
                                        type="button"
                                        aria-label="Đóng bộ lọc ngày"
                                        className="fixed inset-0 z-30 cursor-default"
                                        onClick={() => setDatePickerOpen(false)}
                                    />
                                    <section className="absolute right-0 top-full z-40 mt-2 grid w-[min(92vw,38rem)] overflow-hidden rounded-2xl border border-[#dceadd] bg-white shadow-2xl sm:grid-cols-[10rem_1fr]">
                                        <div className="border-b border-[#edf3ed] bg-[#f8fbf7] p-2 sm:border-b-0 sm:border-r">
                                            {datePresets.map(preset => (
                                                <button
                                                    key={preset.value}
                                                    type="button"
                                                    onClick={() => chooseDatePreset(preset.value)}
                                                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${dateRange.preset === preset.value ? 'bg-[#e9f3eb] text-[#2d6358]' : 'text-[#526d64] hover:bg-white'}`}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                        <form onSubmit={applyCustomDateRange} className="space-y-4 p-4">
                                            <div>
                                                <h2 className="font-extrabold text-[#203b35]">Tùy chỉnh ngày</h2>
                                                <p className="mt-1 text-xs text-[#71867c]">Lọc đơn hàng và thống kê trong khoảng đã chọn.</p>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <label className="text-sm font-bold text-[#526d64]">
                                                    Từ ngày
                                                    <input
                                                        required
                                                        type="date"
                                                        value={customFrom}
                                                        max={customTo || undefined}
                                                        onChange={event => setCustomFrom(event.target.value)}
                                                        className="mt-1 block w-full rounded-xl border border-[#dceadd] px-3 py-2"
                                                    />
                                                </label>
                                                <label className="text-sm font-bold text-[#526d64]">
                                                    Đến ngày
                                                    <input
                                                        required
                                                        type="date"
                                                        value={customTo}
                                                        min={customFrom || undefined}
                                                        onChange={event => setCustomTo(event.target.value)}
                                                        className="mt-1 block w-full rounded-xl border border-[#dceadd] px-3 py-2"
                                                    />
                                                </label>
                                            </div>
                                            {dateFilterError && <p role="alert" className="text-sm font-bold text-[#c1493a]">{dateFilterError}</p>}
                                            <button type="submit" className="w-full rounded-full bg-[#203b35] px-4 py-2.5 text-sm font-bold text-white">
                                                Áp dụng khoảng ngày
                                            </button>
                                        </form>
                                    </section>
                                </>
                            )}
                        </div>
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
                        { label: 'Giá trị đơn không huỷ', value: money(stats.revenue), hint: `Trong ${dateRange.from} – ${dateRange.to}`, icon: '💰', color: 'bg-[#e9f3eb]' },
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

                <section aria-label={`Doanh số từ ${dateRange.from} đến ${dateRange.to}`} className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                            <h2 className="text-xl font-extrabold">{formatDateOnly(dateRange.from)} – {formatDateOnly(dateRange.to)}</h2>
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
                                    <span className="text-xs font-bold text-[#71867c]">
                                        {stats.salesInterval === 'month'
                                            ? new Intl.DateTimeFormat('vi-VN', { month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${day._id}-01T12:00:00+07:00`))
                                            : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${day._id}T12:00:00+07:00`))}
                                    </span>
                                </div>
                            );
                        }) : <p className="self-center text-sm text-[#80938a]">Không có doanh số trong khoảng ngày đã chọn.</p>}
                    </div>
                </section>

                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setFilter('pending')}
                        className={`rounded-full px-4 py-2 text-sm font-bold ${filter === 'pending'
                            ? "bg-[#203b35] text-white"
                            : "bg-white text-[#527067]"
                            }`}
                    >
                        Đơn chờ xác nhận ({paymentCounts.pending})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('confirmed')}
                        className={`rounded-full px-4 py-2 text-sm font-bold ${filter === 'confirmed'
                                ? "bg-[#203b35] text-white"
                                : "bg-white text-[#527067]"
                            }`}
                    >
                        Đơn đã xác nhận ({paymentCounts.confirmed})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('shipped')}
                        className={`rounded-full px-4 py-2 text-sm font-bold ${filter === 'shipped'
                            ? "bg-[#203b35] text-white"
                            : "bg-white text-[#527067]"
                            }`}
                    >
                        Đang giao ({orderCounts.shipped || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('completed')}
                        className={`rounded-full px-4 py-2 text-sm font-bold ${filter === 'completed'
                            ? "bg-[#203b35] text-white"
                            : "bg-white text-[#527067]"
                            }`}
                    >
                        Hoàn tất ({orderCounts.completed || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('cancelled')}
                        className={`rounded-full px-4 py-2 text-sm font-bold ${filter === 'cancelled'
                            ? "bg-[#203b35] text-white"
                            : "bg-white text-[#527067]"
                            }`}
                    >
                        Đã hủy ({orderCounts.cancelled || 0})
                    </button>
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
                                                Đơn #{order.orderCode || order.id.slice(-8).toUpperCase()}
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

                                <section className="mb-4 rounded-2xl border border-[#dceadd] bg-[#f8fbf7] p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <span className={`text-sm font-bold ${order.paymentReceiptUploaded ? 'text-[#2d6358]' : 'text-[#71867c]'}`}>
                                            {order.paymentReceiptUploaded ? 'Đã có ảnh bill chuyển khoản' : 'Chưa có ảnh bill chuyển khoản'}
                                        </span>
                                        {order.paymentReceiptUploaded && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (editingReceiptId === order.id) {
                                                        clearReceiptPreview(order.id);
                                                        setEditingReceiptId('');
                                                    } else {
                                                        setEditingReceiptId(order.id);
                                                    }
                                                }}
                                                className="rounded-full border border-[#2d6358] px-4 py-2 text-sm font-bold text-[#2d6358]"
                                            >
                                                {editingReceiptId === order.id ? 'Hủy đổi bill' : 'Đổi bill'}
                                            </button>
                                        )}
                                    </div>
                                    {order.paymentReceiptUploaded ? (
                                        <button
                                            type="button"
                                            onClick={() => viewPaymentReceipt(order.id)}
                                            className="mt-3 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-[#dceadd] bg-white p-2 text-left"
                                            aria-label="Mở ảnh bill chuyển khoản"
                                        >
                                            <img
                                                loading="lazy"
                                                src={`/api/orders/${encodeURIComponent(order.id)}/payment-receipt?format=image`}
                                                alt={`Ảnh bill chuyển khoản của đơn ${order.orderCode || order.id}`}
                                                className="max-h-72 max-w-full rounded-lg object-contain"
                                            />
                                            <span className="mt-2 block text-xs font-bold text-[#2d6358]">Bấm vào ảnh để xem lớn</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setEditingReceiptId(order.id)}
                                            className="mt-3 rounded-full bg-[#f47d52] px-4 py-2 text-sm font-bold text-white"
                                        >
                                            Thêm bill
                                        </button>
                                    )}
                                    {editingReceiptId === order.id && (
                                        <form onSubmit={event => uploadPaymentReceipt(order.id, event)} className="mt-3 flex flex-wrap items-end gap-3">
                                            <label className="min-w-0 flex-1 text-sm font-bold text-[#526d64]">
                                                {order.paymentReceiptUploaded ? 'Chọn ảnh bill mới' : 'Chọn ảnh bill'}
                                                <input
                                                    required
                                                    type="file"
                                                    name="receipt"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={event => previewPaymentReceipt(order.id, event.currentTarget.files?.[0])}
                                                    className="mt-2 block w-full text-sm font-normal text-[#71867c] file:mr-3 file:rounded-full file:border-0 file:bg-[#e9f3eb] file:px-4 file:py-2 file:font-bold file:text-[#2d6358]"
                                                />
                                            </label>
                                            <button
                                                type="submit"
                                                disabled={uploadingReceiptId === order.id}
                                                className="rounded-full bg-[#f47d52] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                                            >
                                                {uploadingReceiptId === order.id ? 'Đang tải...' : 'Lưu ảnh bill'}
                                            </button>
                                        </form>
                                    )}
                                    {receiptPreviews[order.id] && (
                                        <div className="mt-4">
                                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#83968c]">Xem trước ảnh bill</p>
                                            <img
                                                src={receiptPreviews[order.id]}
                                                alt={`Xem trước ảnh bill của đơn ${order.orderCode || order.id}`}
                                                className="max-h-64 max-w-full rounded-xl border border-[#dceadd] bg-white object-contain p-1"
                                            />
                                        </div>
                                    )}
                                    {receiptUploadMessage?.orderId === order.id && (
                                        <p role="status" className="mt-2 text-sm font-bold text-[#526d64]">{receiptUploadMessage.text}</p>
                                    )}
                                    <p className="mt-2 text-xs text-[#71867c]">JPG, PNG hoặc WebP · tối đa 4 MB</p>
                                </section>
                                <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dceadd] bg-white p-4">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#83968c]">Xác nhận thanh toán</p>
                                        {order.paymentStatus === 'confirmed' ? (
                                            <p className="mt-1 font-bold text-[#2d6358]">
                                                Đã xác nhận thanh toán
                                                {order.paymentConfirmedAt ? ` · ${dateTime(order.paymentConfirmedAt)}` : ''}
                                            </p>
                                        ) : (
                                            <p className="mt-1 text-sm text-[#71867c]">Chưa xác nhận thanh toán</p>
                                        )}
                                    </div>
                                    {order.paymentStatus === 'confirmed' ? (
                                        <span className="rounded-full bg-[#e9f3eb] px-4 py-2 text-sm font-bold text-[#2d6358]">Đã thanh toán</span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => confirmPayment(order.id)}
                                            disabled={confirmingPaymentId === order.id}
                                            className="rounded-full bg-[#2d6358] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                                        >
                                            {confirmingPaymentId === order.id ? 'Đang xác nhận...' : 'Xác nhận đã thanh toán'}
                                        </button>
                                    )}
                                </section>
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
