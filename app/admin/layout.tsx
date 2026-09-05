'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppSidebar, type SidebarItem } from '../../components/AppSidebar';
import { useLocale } from '../../context/LocaleContext';

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
    const { t } = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const { data: session, status } = useSession();

    useEffect(() => {
        const allowedRoles = ['ADMIN', 'TEACHER', 'SCHOOL_ADMIN'];

        if (status === 'loading') return;
        if (!session?.user) {
            router.replace('/login');
            return;
        }

        if (!allowedRoles.includes((session.user as { role?: string }).role || '')) {
            router.replace('/dashboard');
        }
    }, [router, session, status]);

    const baseItems: Omit<SidebarItem, 'active'>[] = [
        { icon: '⌂', label: t('Overview'), href: '/admin' },
        { icon: '▣', label: t('Courses'), href: '/admin/dashboard' },
        { icon: '＋', label: 'Thêm chủ đề', href: '/admin/topics' },
        { icon: '📊', label: t('Reports'), href: '/admin/reports' },
        { icon: '🛒', label: t('Orders'), href: '/admin/orders' },
        { icon: '👥', label: t('Students'), href: '/admin/students' },
        { icon: '👩‍👧', label: t('Parental Corner'), href: '/dashboard', accent: 'muted' },
        { icon: '▶', label: t('Classroom'), href: '/learn', accent: 'highlight' },
    ];

    const items: SidebarItem[] = baseItems.map(item => ({
        ...item,
        active: item.href ? pathname === item.href : false,
    }));

    return (
        <div className="min-h-screen bg-[#f4faf4] text-[#203b35]">
            <AppSidebar
                brand="KIDS"
                role="Admin"
                items={items}
                footerTitle="✨ Hệ thống đang ổn định"
                footerText="Tổng thời gian hoạt động 99.9% trong tháng này."
            />
            <div className="lg:ml-64">{children}</div>
        </div>
    );
}
