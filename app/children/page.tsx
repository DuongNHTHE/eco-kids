'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAPI } from '../../lib/hooks/useAPI';
import { saveSelectedChild } from '../../lib/child-session';

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

const cardColors = [
    'bg-[#ffe58a] border-[#f2c94c]',
    'bg-[#ffc8b4] border-[#ff9a7a]',
    'bg-[#b7e8d0] border-[#7fd6b0]',
    'bg-[#c9dcff] border-[#93b8ff]',
    'bg-[#f1c9ff] border-[#d69cf0]',
    'bg-[#ffd3e0] border-[#ff9db9]',
];

const inputClass =
    'mt-2 w-full rounded-2xl border-2 border-[#d9eadc] bg-white px-4 py-3 text-base font-normal outline-none focus:border-[#2d6358]';

export default function ChildrenPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [form, setForm] = useState({ name: '', nickname: '', birthDate: '', gender: '', avatar: avatars[0] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const { API } = useAPI();

    useEffect(() => {
        if (status === 'unauthenticated') router.replace('/login');
        if (status !== 'authenticated') return;
        async function loadChildren() {
            try {
                const res = await API.get('/children', false, false, false);
                console.log("check res", res);
                const data = await res;
                setChildren(data);
                if (data.length === 0) setShowForm(true);
            } catch (error) {
                setMessage(error instanceof Error ? error.message : 'Không thể tải dữ liệu.');
            } finally {
                setLoading(false);
            }
        }

        loadChildren();
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
            saveSelectedChild(child);
            setForm({ name: '', nickname: '', birthDate: '', gender: '', avatar: avatars[0] });
            setMessage(`Đã tạo tài khoản cho ${child.name}.`);
            setShowForm(false);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Có lỗi xảy ra.');
        } finally {
            setSaving(false);
        }
    }

    function chooseChild(child: ChildProfile) {
        saveSelectedChild(child);
        router.push('/dashboard');
    }

    const role = (session?.user as { role?: string } | undefined)?.role || '';
    if (status !== 'authenticated' || role !== 'PARENT' || loading) {
        return (
            <div className="grid min-h-screen place-items-center bg-[#fff8e6]">
                <span className="text-8xl motion-safe:animate-bounce" role="status" aria-label="Đang tải">🦊</span>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#fff8e6] px-5 py-6 text-[#203b35] lg:px-10">
            <div className="mx-auto max-w-5xl">
                <Link
                    href="/dashboard"
                    className="inline-flex min-h-[44px] items-center rounded-full bg-white/70 px-4 text-sm font-bold text-[#2d6358] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2d6358]"
                >
                    ← Về dashboard
                </Link>

                <section className="mt-6 text-center">
                    <div aria-hidden className="text-7xl motion-safe:animate-bounce">🦊</div>
                    <h1 className="mt-2 text-4xl font-black sm:text-5xl">Ai đang học nào?</h1>
                    <p className="mt-2 text-lg font-bold text-[#60786e]">Bé chạm vào hình của mình nhé!</p>

                    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {children.map((child, index) => (
                            <button
                                type="button"
                                key={child.id}
                                onClick={() => chooseChild(child)}
                                aria-label={`Bé ${child.nickname || child.name}, cấp độ ${child.level}`}
                                className={`flex min-h-[190px] flex-col items-center justify-center rounded-[2rem] border-4 border-b-8 p-4 shadow-md transition active:translate-y-1 active:border-b-4 motion-safe:hover:scale-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2d6358] ${cardColors[index % cardColors.length]}`}
                            >
                                <span className="text-7xl leading-none sm:text-8xl">{child.avatar}</span>
                                <span className="mt-3 text-xl font-black sm:text-2xl">{child.nickname || child.name}</span>
                                <span className="mt-1 rounded-full bg-white/80 px-3 py-1 text-base font-extrabold">
                                    ⭐ {child.level}
                                </span>
                            </button>
                        ))}

                        <button
                            type="button"
                            onClick={() => setShowForm(open => !open)}
                            aria-expanded={showForm}
                            className="flex min-h-[190px] flex-col items-center justify-center rounded-[2rem] border-4 border-dashed border-[#9bc7b4] bg-white/60 p-4 transition motion-safe:hover:scale-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#2d6358]"
                        >
                            <span className="grid h-20 w-20 place-items-center rounded-full bg-[#2d6358] text-5xl font-black leading-none text-white">+</span>
                            <span className="mt-3 text-base font-bold text-[#2d6358]">Thêm bé</span>
                        </button>
                    </div>

                    {children.length === 0 && !showForm && (
                        <p className="mt-6 text-[#60786e]">Chưa có hồ sơ nào. Bố mẹ hãy tạo hồ sơ đầu tiên cho bé nhé.</p>
                    )}
                </section>

                {showForm && (
                    <form
                        onSubmit={handleSubmit}
                        className="mx-auto mt-10 max-w-2xl rounded-[2rem] border-2 border-[#d9eadc] bg-white p-6 shadow-sm sm:p-8"
                    >
                        <p className="inline-block rounded-full bg-[#e8f4e9] px-3 py-1 text-sm font-bold text-[#2d6358]">
                            Dành cho bố mẹ
                        </p>
                        <h2 className="mt-3 text-2xl font-extrabold">Tạo hồ sơ cho bé</h2>
                        <p className="mt-1 text-[#60786e]">Mỗi bé có một hồ sơ riêng để lưu tiến độ học.</p>

                        <fieldset className="mt-6">
                            <legend className="text-sm font-bold">Chọn hình đại diện</legend>
                            <div className="mt-2 flex flex-wrap gap-3">
                                {avatars.map(avatar => (
                                    <button
                                        type="button"
                                        key={avatar}
                                        onClick={() => setForm({ ...form, avatar })}
                                        aria-pressed={form.avatar === avatar}
                                        aria-label={`Hình ${avatar}`}
                                        className={`grid h-16 w-16 place-items-center rounded-full text-4xl transition ${form.avatar === avatar ? 'scale-110 bg-[#ffe58a] ring-4 ring-[#2d6358]' : 'bg-[#f4faf4]'}`}
                                    >
                                        {avatar}
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        <label className="mt-5 block text-sm font-bold">
                            Tên của bé
                            <input required minLength={2} maxLength={50} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className={inputClass} placeholder="Ví dụ: Nhật Linh" />
                        </label>
                        <label className="mt-4 block text-sm font-bold">
                            Tên gọi ở nhà
                            <input maxLength={50} value={form.nickname} onChange={event => setForm({ ...form, nickname: event.target.value })} className={inputClass} placeholder="Ví dụ: Bé Heo" />
                        </label>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="block text-sm font-bold">
                                Ngày sinh
                                <input type="date" value={form.birthDate} onChange={event => setForm({ ...form, birthDate: event.target.value })} className={inputClass} />
                            </label>
                            <label className="block text-sm font-bold">
                                Giới tính
                                <select value={form.gender} onChange={event => setForm({ ...form, gender: event.target.value })} className={inputClass}>
                                    <option value="">Chưa chọn</option>
                                    <option value="girl">Bé gái</option>
                                    <option value="boy">Bé trai</option>
                                    <option value="other">Khác</option>
                                </select>
                            </label>
                        </div>

                        <button
                            disabled={saving}
                            className="mt-7 min-h-[56px] w-full rounded-full border-b-4 border-[#1f4d43] bg-[#2d6358] px-4 text-lg font-extrabold text-white transition active:translate-y-0.5 active:border-b-2 disabled:opacity-60"
                        >
                            {saving ? 'Đang tạo...' : 'Tạo hồ sơ cho bé'}
                        </button>
                    </form>
                )}

                {message && (
                    <p role="status" className="mx-auto mt-6 max-w-2xl rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-[#2d6358]">
                        {message}
                    </p>
                )}
            </div>
        </main>
    );
}