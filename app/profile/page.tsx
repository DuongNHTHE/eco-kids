'use client';

import { useSession } from 'next-auth/react';

export default function ProfilePage() {
    const { data: session } = useSession();
    const name = session?.user?.name || 'Phụ huynh';
    const initials = name.trim().charAt(0).toUpperCase() || 'P';

    return (
        <main className="min-h-screen bg-[#f4faf4] px-5 py-8 text-[#203b35] lg:px-10">
            <div className="mx-auto max-w-3xl">
                <p className="font-bold text-[#80938a]">Tài khoản</p>
                <h1 className="mt-1 text-4xl font-extrabold">Hồ sơ cá nhân</h1>
                <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex items-center gap-5">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt={`Ảnh đại diện của ${name}`} className="h-24 w-24 rounded-full object-cover ring-4 ring-[#d9eadc]" />
                        ) : (
                            <span className="grid h-24 w-24 place-items-center rounded-full bg-[#f47d52] text-4xl font-black text-white">{initials}</span>
                        )}
                        <div>
                            <h2 className="text-2xl font-extrabold">{name}</h2>
                            <p className="mt-1 text-[#80938a]">{session?.user?.email || 'Chưa cập nhật email'}</p>
                            <p className="mt-2 inline-block rounded-full bg-[#e8f4e9] px-3 py-1 text-sm font-bold text-[#2d6358]">Phụ huynh</p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}