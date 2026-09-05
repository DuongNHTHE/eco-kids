'use client';

import { useSession } from 'next-auth/react';

export default function AdminProfilePage() {
    const { data: session } = useSession();
    const user = session?.user;
    const name = user?.name || 'Tài khoản';
    const initials = name.trim().charAt(0).toUpperCase() || 'U';

    return (
        <main className="min-h-screen px-5 py-8 lg:px-10">
            <div className="mx-auto max-w-3xl">
                <p className="font-bold text-[#80938a]">Tài khoản</p>
                <h1 className="mt-1 text-4xl font-extrabold">Hồ sơ cá nhân</h1>

                <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                        {user?.image ? (
                            <img src={user.image} alt={`Ảnh đại diện của ${name}`} className="h-24 w-24 rounded-full object-cover ring-4 ring-[#d9eadc]" />
                        ) : (
                            <span className="grid h-24 w-24 place-items-center rounded-full bg-[#f47d52] text-4xl font-black text-white">
                                {initials}
                            </span>
                        )}
                        <div>
                            <h2 className="text-2xl font-extrabold">{name}</h2>
                            <p className="mt-1 text-[#80938a]">{user?.email || 'Chưa cập nhật email'}</p>
                            <p className="mt-2 inline-block rounded-full bg-[#e8f4e9] px-3 py-1 text-sm font-bold text-[#2d6358]">
                                {(user as { role?: string } | undefined)?.role || 'Thành viên'}
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}