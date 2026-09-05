'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { clearSession } from '../lib/auth';

export type SidebarItem = {
    icon: string;
    label: string;
    href?: string;
    active?: boolean;
    accent?: 'default' | 'muted' | 'highlight';
};

export function AppSidebar({
    brand = 'KIDS',
    role = 'Admin',
    items,
    footerTitle,
    footerText,
}: {
    brand?: string;
    role?: string;
    items: SidebarItem[];
    footerTitle?: string;
    footerText?: string;
}) {
    const { data: session } = useSession();
    const userName = session?.user?.name || 'Tài khoản';
    const userEmail = session?.user?.email || 'Chưa cập nhật email';
    const avatar = session?.user?.image;
    const initials = userName.trim().charAt(0).toUpperCase() || 'U';

    async function handleLogout() {
        clearSession();
        await signOut({ callbackUrl: '/login' });
    }

    return (
        <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#203b35] p-6 text-white transition-transform lg:translate-x-0">

            <Link href="/" className="flex shrink-0 items-center gap-2 text-white">
                <span className="text-4xl font-extrabold leading-none text-[#f47d52]">
                    e<span className="text-[#6eaa83]">c</span>o
                </span>

                <span className="border-l border-white/30 pl-2 text-xs font-black tracking-widest">
                    {brand}
                    <br />
                    <small className="tracking-normal">{role}</small>
                </span>
            </Link>

            {/* Menu - phần này được phép scroll */}
            <nav className="mt-12 min-h-0 flex-1 space-y-2 overflow-y-auto">
                {items.map(item => {
                    const classes = `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-bold transition ${item.active
                            ? 'bg-white/15 text-white'
                            : 'text-white/80 hover:bg-white/5'
                        } ${item.accent === 'highlight'
                            ? 'text-[#f4c8a9]'
                            : item.accent === 'muted'
                                ? 'text-[#bfe8c6]'
                                : ''
                        }`;

                    if (item.href) {
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={classes}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    }

                    return (
                        <button key={item.label} className={classes}>
                            <span>{item.icon}</span>
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            <div className="shrink-0 pt-6">

                {(footerTitle || footerText) && (
                    <div className="mb-4 rounded-2xl bg-white/10 p-4 text-sm">
                        {footerTitle && <b>{footerTitle}</b>}

                        {footerText && (
                            <p className="mt-2 text-white/70">
                                {footerText}
                            </p>
                        )}
                    </div>
                )}

                {/* Profile */}
                <Link
                    href="/admin/profile"
                    className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 transition hover:bg-white/15"
                >
                    {avatar ? (
                        <img
                            src={avatar}
                            alt={`Ảnh đại diện của ${userName}`}
                            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/30"
                        />
                    ) : (
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f47d52] text-lg font-black text-white">
                            {initials}
                        </span>
                    )}

                    <span className="min-w-0">
                        <b className="block truncate">
                            {userName}
                        </b>

                        <small className="block truncate text-white/65">
                            {userEmail}
                        </small>
                    </span>
                </Link>

                {/* Settings / Logout */}
                <div className="mt-3 flex items-center justify-between px-1 text-sm">
                    <Link
                        href="/admin/settings"
                        className="font-bold text-white/75 transition hover:text-white"
                    >
                        ⚙ Cài đặt
                    </Link>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="font-bold text-[#f4c8a9] transition hover:text-white"
                    >
                        Đăng xuất
                    </button>
                </div>
            </div>
        </aside>
    );
}
