'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAPI } from '../../lib/hooks/useAPI';
import AdminLayout from '../admin/layout';

type ChildProfile = {
    id: string;
    name: string;
    nickname: string;
    avatar: string;
    birthDate: string | null;
    gender: string;
    level: number;
};

const avatars = ['🧒', '👧', '👦', '🐰', '🦊', '🐼'];

export default function ChildrenPage() {
    const router = useRouter();
    const { status } = useSession();
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [form, setForm] = useState({ name: '', nickname: '', birthDate: '', gender: '', avatar: avatars[0] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const { API } = useAPI();

    useEffect(() => {
        if (status === 'unauthenticated') router.replace('/login');
        if (status !== 'authenticated') return;
        fetch('/api/children').then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Không thể tải dữ liệu.');
            setChildren(data);
        }).catch(error => setMessage(error.message)).finally(() => setLoading(false));
    }, [router, status]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            const response = await API.post('/children', form);
            if (!response.ok || !response.data) throw new Error(response.message || 'Không thể tạo tài khoản.');
            const child = response.data as ChildProfile;
            setChildren(current => [...current, child]);
            localStorage.setItem('eco-child', child.name);
            setForm({ name: '', nickname: '', birthDate: '', gender: '', avatar: avatars[0] });
            setMessage(`Đã tạo tài khoản cho ${child.name}.`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
        } finally {
            setSaving(false);
        }
    }

    function chooseChild(child: ChildProfile) {
        localStorage.setItem('eco-child', child.name);
        router.push('/dashboard');
    }

    if (status !== 'authenticated' || loading) return <div className="grid min-h-screen place-items-center text-xl text-[#203b35]">Đang tải...</div>;

    return (
        <AdminLayout>
            <main className="min-h-screen bg-[#f4faf4] px-5 py-8 text-[#203b35] lg:px-10">
                <div className="mx-auto max-w-5xl">
                    <Link href="/dashboard" className="font-bold text-[#2d6358]">← Về dashboard</Link>
                    <p className="mt-8 font-bold text-[#80938a]">Khu vực phụ huynh</p>
                    <h1 className="mt-1 text-4xl font-extrabold">Tài khoản của bé</h1>
                    <p className="mt-2 text-[#60786e]">Tạo hồ sơ riêng để lưu tiến độ học tập cho từng bé.</p>

                    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                        <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                            <h2 className="text-2xl font-extrabold">Thêm tài khoản bé</h2>
                            <label className="mt-6 block text-sm font-bold">Tên của bé<input required minLength={2} maxLength={50} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d9eadc] px-4 py-3 font-normal outline-none focus:border-[#2d6358]" placeholder="Ví dụ: Nhật Linh" /></label>
                            <label className="mt-4 block text-sm font-bold">Tên gọi ở nhà<input maxLength={50} value={form.nickname} onChange={event => setForm({ ...form, nickname: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d9eadc] px-4 py-3 font-normal outline-none focus:border-[#2d6358]" placeholder="Ví dụ: Bé Heo" /></label>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <label className="block text-sm font-bold">Ngày sinh<input type="date" value={form.birthDate} onChange={event => setForm({ ...form, birthDate: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d9eadc] px-3 py-3 font-normal" /></label>
                                <label className="block text-sm font-bold">Giới tính<select value={form.gender} onChange={event => setForm({ ...form, gender: event.target.value })} className="mt-2 w-full rounded-xl border border-[#d9eadc] bg-white px-3 py-3 font-normal"><option value="">Chưa chọn</option><option value="girl">Bé gái</option><option value="boy">Bé trai</option><option value="other">Khác</option></select></label>
                            </div>
                            <fieldset className="mt-5"><legend className="text-sm font-bold">Chọn hình đại diện</legend><div className="mt-2 flex flex-wrap gap-2">{avatars.map(avatar => <button type="button" key={avatar} onClick={() => setForm({ ...form, avatar })} className={`grid h-11 w-11 place-items-center rounded-full text-2xl ${form.avatar === avatar ? 'bg-[#d9eadc] ring-2 ring-[#2d6358]' : 'bg-[#f4faf4]'}`}>{avatar}</button>)}</div></fieldset>
                            <button disabled={saving} className="mt-7 w-full rounded-xl bg-[#2d6358] px-4 py-3 font-bold text-white transition hover:bg-[#203b35] disabled:opacity-60">{saving ? 'Đang tạo...' : 'Tạo tài khoản cho bé'}</button>
                            {message && <p className="mt-4 text-sm font-bold text-[#2d6358]">{message}</p>}
                        </form>

                        <section className="rounded-3xl bg-[#e8f4e9] p-6 sm:p-8">
                            <h2 className="text-2xl font-extrabold">Danh sách tài khoản</h2>
                            {children.length === 0 ? <p className="mt-6 text-[#60786e]">Chưa có hồ sơ nào. Tạo tài khoản đầu tiên cho bé nhé.</p> : <div className="mt-6 space-y-3">{children.map(child => <button type="button" key={child.id} onClick={() => chooseChild(child)} className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#f4faf4] text-3xl">{child.avatar}</span><span><b className="block text-lg">{child.name}</b><small className="text-[#80938a]">{child.nickname || 'Nhấn để bắt đầu học'} · Cấp độ {child.level}</small></span><span className="ml-auto text-xl">→</span></button>)}</div>}
                        </section>
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}