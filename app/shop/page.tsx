'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAPI } from '../../lib/hooks/useAPI';

type Product = {
    id: string;
    sku: string;
    slug: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    stock: number;
};

type Package = {
    id: string;
    slug: string;
    name: string;
    subtitle?: string;
    price: number;
    badge?: string;
    color?: string;
    featured?: boolean;
    items: { productId?: string; quantity: number; product?: Product | null }[];
};

type CartItem = {
    id: string;
    kind: 'product' | 'package';
    name: string;
    price: number;
    quantity: number;
};

type OrderHistory = {
    id: string;
    items: { name: string; price: number; quantity: number }[];
    total: number;
    status: string;
    createdAt: string;
};

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';

const statusLabels: Record<string, string> = {
    new: 'Mới',
    confirmed: 'Đã chốt',
    processing: 'Đang chuẩn bị',
    shipped: 'Đang giao',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
};

export default function ParentShopPage() {
    const { API } = useAPI();
    const [products, setProducts] = useState<Product[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [ordersOpen, setOrdersOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
    const [orders, setOrders] = useState<OrderHistory[]>([]);

    useEffect(() => {
        const savedCart = localStorage.getItem('eco-parent-cart');
        if (savedCart) setCart(JSON.parse(savedCart));
        Promise.all([
            API.get('products', false, true, true),
            API.get('packages', false, true, true),
            API.get('orders', false, true, true),
        ]).then(([nextProducts, nextPackages, nextOrders]) => {
            if (Array.isArray(nextProducts)) setProducts(nextProducts);
            if (Array.isArray(nextPackages)) setPackages(nextPackages);
            if (Array.isArray(nextOrders)) setOrders(nextOrders);
            setLoading(false);
        });
    }, [API]);

    useEffect(() => {
        localStorage.setItem('eco-parent-cart', JSON.stringify(cart));
    }, [cart]);

    function addToCart(item: Omit<CartItem, 'quantity'>) {
        setCart(current => {
            const found = current.find(cartItem => cartItem.id === item.id && cartItem.kind === item.kind);
            return found
                ? current.map(cartItem => cartItem.id === item.id && cartItem.kind === item.kind ? { ...cartItem, quantity: Math.min(10, cartItem.quantity + 1) } : cartItem)
                : [...current, { ...item, quantity: 1 }];
        });
        setCartOpen(true);
    }

    function changeQuantity(item: CartItem, quantity: number) {
        if (quantity <= 0) setCart(current => current.filter(cartItem => !(cartItem.id === item.id && cartItem.kind === item.kind)));
        else setCart(current => current.map(cartItem => cartItem.id === item.id && cartItem.kind === item.kind ? { ...cartItem, quantity: Math.min(10, quantity) } : cartItem));
    }

    async function checkout(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage('Đang tạo đơn hàng...');
        const result = await API.post('orders', {
            customer,
            items: cart.map(item => ({
                ...(item.kind === 'package' ? { packageId: item.id } : { productId: item.id }),
                quantity: item.quantity,
            })),
        }, false, true, true);
        if (result?.success !== false && result?.orderId) {
            setCart([]);
            setCustomer({ name: '', phone: '', address: '' });
            setMessage(`Đặt hàng thành công. Mã đơn: ${result.orderId}`);
            const nextOrders = await API.get('orders', false, true, false);
            if (Array.isArray(nextOrders)) setOrders(nextOrders);
        } else {
            setMessage(result?.message || 'Không thể tạo đơn hàng.');
        }
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <main className="min-h-screen bg-[#f4faf4] text-[#203b35]">
            <header className="border-b border-[#dceadd] bg-white/90 px-5 py-5 backdrop-blur lg:px-10">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                    <div>
                        <Link href="/dashboard" className="text-sm font-bold text-[#6eaa83]">← Về dashboard</Link>
                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Cửa hàng học liệu</h1>
                        <p className="mt-1 text-[#71867c]">Mô hình bán rời và package cho hành trình học của bé.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setOrdersOpen(true)} className="rounded-full border border-[#cfe2d2] bg-white px-5 py-3 font-bold text-[#203b35]">Đơn đã đặt</button>
                        <button type="button" onClick={() => setCartOpen(true)} className="relative rounded-full bg-[#203b35] px-5 py-3 font-bold text-white">🛒 Giỏ hàng
                            <span className="ml-2 rounded-full bg-[#f47d52] px-2 py-1 text-xs">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
                {loading ? <div className="rounded-3xl bg-white p-10 text-center font-bold text-[#71867c]">Đang tải sản phẩm...</div> : (
                    <>
                        <section><div className="mb-5"><span className="text-sm font-bold uppercase tracking-[0.2em] text-[#ef7d32]">Mô hình vật lý</span><h2 className="mt-2 text-2xl font-extrabold">Mua thêm cho bộ sưu tập của bé</h2></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map(product => <article key={product.id} className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex h-44 items-center justify-center rounded-2xl bg-[#eef8ef] text-7xl">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full rounded-2xl object-cover" /> : '🧸'}</div><div className="mt-5 flex items-start justify-between gap-3"><div><h3 className="text-xl font-extrabold">{product.name}</h3><p className="mt-1 text-sm text-[#71867c]">{product.description || product.sku}</p></div><strong>{money(product.price)}</strong></div><div className="mt-4 flex items-center justify-between text-sm text-[#71867c]"><span>Còn {product.stock}</span><button disabled={!product.stock} type="button" onClick={() => addToCart({ id: product.slug, kind: 'product', name: product.name, price: product.price })} className="rounded-full bg-[#f47d52] px-4 py-2 font-bold text-white disabled:opacity-50">Thêm giỏ</button></div></article>)}</div></section>

                        <section className="mt-12"><div className="mb-5"><span className="text-sm font-bold uppercase tracking-[0.2em] text-[#ef7d32]">Package tiết kiệm</span><h2 className="mt-2 text-2xl font-extrabold">Chọn trọn bộ cho bé</h2></div><div className="grid gap-5 md:grid-cols-2">{packages.map(pack => <article key={pack.id} className={`rounded-3xl border-2 p-6 ${pack.featured ? 'border-[#f47d52] bg-[#fff6e8]' : 'border-[#e3ece4] bg-white'}`}><div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-[#203b35] px-3 py-1 text-xs font-bold text-white">{pack.badge || 'Package'}</span><h3 className="mt-4 text-3xl font-extrabold">{pack.name}</h3><p className="mt-1 text-[#71867c]">{pack.subtitle}</p></div><strong className="text-2xl">{money(pack.price)}</strong></div><div className="my-5 flex flex-wrap gap-2">{pack.items.map(item => <span key={item.product?.id || item.productId} className="rounded-full bg-white px-3 py-2 text-sm font-bold text-[#527067]">{item.quantity} × {item.product?.name || 'Mô hình'}</span>)}</div><button type="button" onClick={() => addToCart({ id: pack.slug, kind: 'package', name: pack.name, price: pack.price })} className="w-full rounded-full bg-[#203b35] px-5 py-3 font-bold text-white">Thêm package vào giỏ</button></article>)}</div></section>

                    </>
                )}
            </div>

            {ordersOpen && <div className="fixed inset-0 z-40">
                <button aria-label="Đóng lịch sử đơn hàng" className="absolute inset-0 bg-[#203b35]/40" onClick={() => setOrdersOpen(false)} /><section className="absolute left-1/2 top-1/2 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-[#fffdf8] shadow-2xl"><header className="flex items-center justify-between border-b border-[#dceadd] p-6">
                    <div>
                        <span className="text-sm font-bold text-[#80938a]">TẤT CẢ TRẠNG THÁI</span>
                        <h2 className="mt-1 text-2xl font-extrabold">Đơn hàng đã đặt</h2>
                    </div>
                    <button aria-label="Đóng" type="button" onClick={() => setOrdersOpen(false)} className="text-3xl">×</button>
                </header>
                    <div className="overflow-y-auto p-6">
                        {orders.length ?
                            <div className="space-y-4">
                                {orders.map(order =>
                                    <article key={order.id} className="rounded-2xl border border-[#e4eee3] bg-white p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h3 className="font-extrabold">Đơn #{order.id.slice(-8).toUpperCase()}</h3>
                                                <p className="mt-1 text-sm text-[#71867c]">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.createdAt))}</p></div><div className="text-right"><strong>{money(order.total)}</strong><span className="mt-1 block rounded-full bg-[#fff2d5] px-3 py-1 text-xs font-bold text-[#9a7d3a]">{statusLabels[order.status] || order.status}</span></div></div><div className="mt-4 flex flex-wrap gap-2">{order.items.map((item, index) => <span key={`${item.name}-${index}`} className="rounded-full bg-[#f4faf4] px-3 py-2 text-sm font-bold text-[#527067]">{item.name} × {item.quantity}</span>)}</div></article>)}</div> : <div className="p-8 text-center text-[#71867c]">Bạn chưa có đơn hàng nào.</div>}</div></section></div>}

            {cartOpen &&
                <div className="fixed inset-0 z-30">
                    <button aria-label="Đóng giỏ hàng" className="absolute inset-0 bg-[#203b35]/40" onClick={() => setCartOpen(false)} />
                    <aside className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-[#fffdf8] p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm font-bold text-[#80938a]">ĐƠN HÀNG</span>
                                <h2 className="text-3xl font-extrabold">Giỏ hàng</h2>
                            </div>
                            <button aria-label="Đóng giỏ hàng" type="button" onClick={() => setCartOpen(false)} className="text-3xl">×</button>
                        </div>
                        <div className="flex-1 py-6">
                            {cart.length ? cart.map(item =>
                                <div key={`${item.kind}-${item.id}`} className="flex items-center gap-3 border-b border-[#e4eee3] py-4">
                                    <div className="flex-1">
                                        <b>{item.name}</b>
                                        <small className="block text-[#71867c]">{money(item.price)} · {item.kind === 'package' ? 'Package' : 'Mô hình'}</small>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => changeQuantity(item, item.quantity - 1)} className="h-8 w-8 rounded-full bg-[#eef8ef] font-bold">−</button>
                                        <b>{item.quantity}</b>
                                        <button type="button" onClick={() => changeQuantity(item, item.quantity + 1)} className="h-8 w-8 rounded-full bg-[#eef8ef] font-bold">+</button>
                                    </div>
                                </div>
                            ) : <p className="py-10 text-center text-[#71867c]">Giỏ hàng đang trống.</p>}
                        </div>
                        {cart.length > 0 &&
                            <div className="border-t border-[#dceadd] pt-5">
                                <div className="mb-4 flex justify-between text-lg">
                                    <span>Tổng cộng</span>
                                    <strong>{money(total)}</strong>
                                </div>
                                <form onSubmit={checkout} className="space-y-3">
                                    <input required value={customer.name} onChange={event => setCustomer({ ...customer, name: event.target.value })} placeholder="Họ tên người nhận" className="w-full rounded-xl border border-[#dceadd] p-3" />
                                    <input required value={customer.phone} onChange={event => setCustomer({ ...customer, phone: event.target.value })} placeholder="Số điện thoại" className="w-full rounded-xl border border-[#dceadd] p-3" />
                                    <textarea required value={customer.address} onChange={event => setCustomer({ ...customer, address: event.target.value })} placeholder="Địa chỉ nhận hàng" rows={3} className="w-full rounded-xl border border-[#dceadd] p-3" />
                                    <button type="submit" className="w-full rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white">Đặt hàng</button>
                                    {message &&
                                        <p className="text-sm font-bold text-[#2d6358]">{message}</p>
                                    }
                                </form>
                            </div>
                        }
                    </aside>
                </div>
            }
        </main>
    );
}
