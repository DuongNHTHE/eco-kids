'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';

type Product = {
    id: string;
    sku: string;
    slug: string;
    name: string;
    description?: string;
    imageUrl?: string;
    modelUrl?: string;
    price: number;
    stock: number;
    isActive: boolean;
};

type ProductForm = {
    sku: string;
    slug: string;
    name: string;
    description: string;
    imageUrl: string;
    modelUrl: string;
    price: string;
    stock: string;
    isActive: boolean;
};

const emptyForm: ProductForm = {
    sku: '',
    slug: '',
    name: '',
    description: '',
    imageUrl: '',
    modelUrl: '',
    price: '',
    stock: '0',
    isActive: true,
};

function formFromProduct(product: Product): ProductForm {
    return {
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        modelUrl: product.modelUrl || '',
        price: String(product.price),
        stock: String(product.stock),
        isActive: product.isActive,
    };
}

function formatPrice(price: number) {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
}

export default function AdminProductsPage() {
    const { API } = useAPI();
    const [products, setProducts] = useState<Product[]>([]);
    const [form, setForm] = useState<ProductForm>(emptyForm);
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function loadProducts() {
        setLoading(true);
        const result = await API.get('products', false, true, true);
        if (Array.isArray(result)) setProducts(result);
        else setError(result?.message || 'Không thể tải danh sách sản phẩm.');
        setLoading(false);
    }

    useEffect(() => {
        loadProducts();
    }, []);

    function updateForm<Key extends keyof ProductForm>(key: Key, value: ProductForm[Key]) {
        setForm(current => ({ ...current, [key]: value }));
    }

    function startEdit(product: Product) {
        setEditingSlug(product.slug);
        setForm(formFromProduct(product));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetForm() {
        setEditingSlug(null);
        setForm(emptyForm);
        setError('');
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError('');
        const payload = {
            ...form,
            price: Number(form.price),
            stock: Number(form.stock),
        };
        const result = editingSlug
            ? await API.put(`products/${encodeURIComponent(editingSlug)}`, payload, true, true, true)
            : await API.post('products', payload, true, true, true);

        if (result?.product) {
            resetForm();
            await loadProducts();
        } else {
            setError(result?.message || 'Không thể lưu sản phẩm.');
        }
        setSaving(false);
    }

    async function remove(product: Product) {
        if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) return;
        const result = await API.delete(`products/${encodeURIComponent(product.slug)}`, {}, true, true, true);
        if (result?.success !== false) {
            if (editingSlug === product.slug) resetForm();
            await loadProducts();
        }
    }

    return (
        <main>
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 lg:px-10">
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#80938a]">Quản lý sản phẩm</span>
                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Mô hình vật lý</h1>
                    </div>
                    <button type="button" onClick={resetForm} className="rounded-full bg-[#203b35] px-5 py-3 text-sm font-bold text-white">+ Sản phẩm mới</button>
                </div>
            </header>

            <div className="mx-auto grid max-w-7xl gap-6 px-5 pb-10 pt-8 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:px-10">
                <section className="h-fit rounded-[2rem] bg-white p-6 shadow-soft lg:sticky lg:top-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <span className="text-sm font-bold text-[#83968c]">{editingSlug ? 'Chỉnh sửa' : 'Tạo mới'}</span>
                            <h2 className="mt-1 text-2xl font-extrabold">{editingSlug ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}</h2>
                        </div>
                        {editingSlug && <button type="button" onClick={resetForm} className="text-sm font-bold text-[#6eaa83]">Hủy sửa</button>}
                    </div>

                    <form onSubmit={submit} className="mt-6 space-y-4">
                        <label className="block text-sm font-bold">SKU
                            <input required value={form.sku} onChange={event => updateForm('sku', event.target.value)} className="mt-1 w-full rounded-xl border border-[#dceadd] p-3 outline-none focus:border-[#6eaa83]" placeholder="MODEL-FOX" />
                        </label>
                        <label className="block text-sm font-bold">Tên mô hình
                            <input required value={form.name} onChange={event => updateForm('name', event.target.value)} className="mt-1 w-full rounded-xl border border-[#dceadd] p-3 outline-none focus:border-[#6eaa83]" placeholder="Mô hình Cáo" />
                        </label>
                        <label className="block text-sm font-bold">Slug
                            <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={event => updateForm('slug', event.target.value)} className="mt-1 w-full rounded-xl border border-[#dceadd] p-3 outline-none focus:border-[#6eaa83]" placeholder="explorer" />
                        </label>
                        <label className="block text-sm font-bold">Mô tả
                            <input value={form.description} onChange={event => updateForm('description', event.target.value)} className="mt-1 w-full rounded-xl border border-[#dceadd] p-3 outline-none focus:border-[#6eaa83]" />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block text-sm font-bold">Giá
                                <input required min="0" type="number" value={form.price} onChange={event => updateForm('price', event.target.value)} className="mt-1 w-full rounded-xl border border-[#dceadd] p-3 outline-none focus:border-[#6eaa83]" placeholder="299000" />
                            </label>
                            <label className="block text-sm font-bold">Tồn kho
                                <input required min="0" type="number" value={form.stock} onChange={event => updateForm('stock', event.target.value)} className="mt-1 w-full rounded-xl border border-[#dceadd] p-3 outline-none focus:border-[#6eaa83]" />
                            </label>
                        </div>
                        <label className="block text-sm font-bold">Ảnh sản phẩm (URL)
                            <input type="url" value={form.imageUrl} onChange={event => updateForm('imageUrl', event.target.value)} className="mt-1 w-full rounded-xl border border-[#dceadd] p-3 outline-none focus:border-[#6eaa83]" />
                        </label>
                        <label className="block text-sm font-bold">Mô hình 3D (URL)
                            <input type="url" value={form.modelUrl} onChange={event => updateForm('modelUrl', event.target.value)} className="mt-1 w-full rounded-xl border border-[#dceadd] p-3 outline-none focus:border-[#6eaa83]" />
                        </label>
                        <div className="flex flex-wrap gap-5 text-sm font-bold">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={event => updateForm('isActive', event.target.checked)} /> Đang bán</label>
                        </div>
                        {error && <p className="rounded-xl bg-[#fff0e8] p-3 text-sm font-bold text-[#d45e45]">{error}</p>}
                        <button disabled={saving} type="submit" className="w-full rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white disabled:opacity-60">{saving ? 'Đang lưu...' : editingSlug ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>
                    </form>
                </section>

                <section>
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <div><span className="text-sm font-bold text-[#83968c]">Danh mục hiện tại</span><h2 className="mt-1 text-2xl font-extrabold">{products.length} sản phẩm</h2></div>
                        <button type="button" onClick={loadProducts} className="text-sm font-bold text-[#2d6358]">Làm mới</button>
                    </div>
                    {loading ? <div className="rounded-[2rem] bg-white p-8 text-center font-bold text-[#71867c]">Đang tải sản phẩm...</div> : (
                        <div className="space-y-4">
                            {products.map(product => (
                                <article key={product.id} className="rounded-[2rem] bg-white p-5 shadow-soft">
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="flex min-w-0 items-start gap-4">
                                            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#eef8ef] text-2xl">🧸</span>
                                            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-extrabold">{product.name}</h3>{!product.isActive && <span className="rounded-full bg-[#f0f0f0] px-2 py-1 text-[11px] font-bold text-[#71867c]">Đã ẩn</span>}</div><p className="mt-1 text-sm text-[#71867c]">{product.sku} · /{product.slug} · {product.description || 'Chưa có mô tả'}</p></div>
                                        </div>
                                        <div className="text-right"><strong className="text-xl">{formatPrice(product.price)}</strong><small className="block text-[#71867c]">Tồn kho: {product.stock}</small></div>
                                    </div>
                                    <div className="mt-5 flex justify-end gap-2 border-t border-[#edf3ed] pt-4"><button type="button" onClick={() => startEdit(product)} className="rounded-full bg-[#eef8ef] px-4 py-2 text-sm font-bold text-[#2d6358]">Sửa</button><button type="button" onClick={() => remove(product)} className="rounded-full bg-[#fff0e8] px-4 py-2 text-sm font-bold text-[#d45e45]">Xóa</button></div>
                                </article>
                            ))}
                            {!products.length && <div className="rounded-[2rem] bg-white p-10 text-center text-[#71867c]">Chưa có sản phẩm nào.</div>}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
