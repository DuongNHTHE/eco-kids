'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { clearSession } from '../lib/auth';

export type SidebarItem = {
    icon: string;
    label: string;
    href?: string;
    active?: boolean;
    accent?: 'default' | 'muted' | 'highlight';
};

async function handleLogout() {
    clearSession();
    await signOut({ callbackUrl: '/login' });
}

export function AppSidebar({
    brand = 'KIDS',
    role = 'Admin',
    items,
    footerTitle,
    footerText,
}: Readonly<{
    brand?: string;
    role?: string;
    items: SidebarItem[];
    footerTitle?: string;
    footerText?: string;
}>) {
    const { data: session } = useSession();
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const userName = session?.user?.name || 'Tài khoản';
    const userEmail = session?.user?.email || 'Chưa cập nhật email';
    const avatar = session?.user?.image;
    const initials = userName.trim().charAt(0).toUpperCase() || 'U';

    useEffect(() => {
        let mounted = true;
        let connected = false;

        async function loadUnreadCount() {
            const response = await fetch('/api/admin/notifications?isRead=false', { cache: 'no-store' });
            if (!response.ok) return;
            const payload = await response.json();
            if (mounted && Array.isArray(payload.notifications)) setUnreadNotifications(payload.notifications.length);
        }

        function playNotificationSound() {
            try {
                const audioContext = new AudioContext();
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();

                const now = audioContext.currentTime;
                const duration = 3;

                oscillator.frequency.setValueAtTime(740, now);
                oscillator.frequency.exponentialRampToValueAtTime(
                    1040,
                    now + 0.5
                );

                gain.gain.setValueAtTime(0.0001, now);

                // Fade in
                gain.gain.exponentialRampToValueAtTime(
                    0.12,
                    now + 0.05
                );

                gain.gain.setValueAtTime(
                    0.12,
                    now + 0.5
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    now + duration
                );

                oscillator.connect(gain);
                gain.connect(audioContext.destination);

                oscillator.start(now);
                oscillator.stop(now + duration);

                oscillator.addEventListener('ended', () => {
                    audioContext.close();
                });
            } catch {
            }
        }

        loadUnreadCount();
        const source = new EventSource('/api/admin/notifications/stream');
        source.addEventListener('ready', () => { connected = true; });
        source.addEventListener('notification', event => {
            if (!connected) return;
            const notification = JSON.parse((event as MessageEvent).data) as { organization?: string | null; type?: string; };
            console.log("check notification", notification);
            loadUnreadCount();
            playNotificationSound();
            if (notification.type == 'PARTNER_LEAD_CREATE') {
                toast.success('Thông báo mới', { description: `${notification.organization || 'Khách hàng'} vừa đăng ký tư vấn.` });
            }
        });

        return () => {
            mounted = false;
            source.close();
        };
    }, []);

    const sidebarTransform = isOpen ? 'translate-x-0' : '-translate-x-full';

    return (
        <>
            <button
                type="button"
                aria-label={isOpen ? 'Đóng menu' : 'Mở menu'}
                aria-expanded={isOpen}
                onClick={() => setIsOpen(current => !current)}
                className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-xl bg-[#203b35] text-xl text-white shadow-lg lg:hidden"
            >
                {isOpen ? '×' : '☰'}
            </button>

            {isOpen && (
                <button
                    type="button"
                    aria-label="Đóng menu"
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 z-20 bg-[#203b35]/45 lg:hidden"
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] flex-col bg-[#203b35] p-6 text-white transition-transform duration-200 lg:w-64 lg:translate-x-0 ${sidebarTransform}`}>

            <Link href="/" className="flex shrink-0 items-center gap-2 text-white justify-center">
                <span className="text-4xl font-extrabold leading-none text-[#f47d52]">
                    e<span className="text-[#6eaa83]">c</span>o
                </span>

                <span className="border-l border-white/30 pl-2 text-xs font-black tracking-widest">
                    {brand}
                    <br />
                    <small className="tracking-normal">{role}</small>
                </span>
            </Link>

            <nav className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto">
                {items.map(item => {
                    let accentClass = '';
                    if (item.accent === 'highlight') accentClass = 'text-[#f4c8a9]';
                    if (item.accent === 'muted') accentClass = 'text-[#bfe8c6]';
                    const classes = `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-bold transition ${item.active
                        ? 'bg-white/15 text-white'
                        : 'text-white/80 hover:bg-white/5'
                        } ${accentClass}`;

                    if (item.href) {
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={classes}
                                onClick={() => setIsOpen(false)}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                                {item.href === '/admin/notifications' && unreadNotifications > 0 && <span className="ml-auto min-w-6 rounded-full bg-[#f47d52] px-1.5 py-0.5 text-center text-xs font-black text-white">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
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
                    onClick={() => setIsOpen(false)}
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
                        onClick={() => setIsOpen(false)}
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
        </>
    );
}
