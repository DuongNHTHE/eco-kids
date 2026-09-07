'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AppSidebar, type SidebarItem } from '../../components/AppSidebar';
import { useLocale } from '../../context/LocaleContext';
import { resolveRoleHome } from '../../lib/auth';

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

        const role = (session.user as { role?: string }).role || '';
        if (!allowedRoles.includes(role)) {
            router.replace(resolveRoleHome(role));
        }
    }, [router, session, status]);

    const baseItems: Omit<SidebarItem, 'active'>[] = [
        { icon: '⌂', label: t('Overview'), href: '/admin/dashboard' },
        { icon: '▣', label: t('Courses'), href: '/admin/dashboard' },
        { icon: '＋', label: t('Topics'), href: '/admin/topics' },
        { icon: '📊', label: t('Reports'), href: '/admin/reports' },
        { icon: '📦', label: 'Sản phẩm', href: '/admin/products' },
        { icon: '⚙', label: t('Settings'), href: '/admin/settings' },
        { icon: '🛒', label: t('Orders'), href: '/admin/orders' },
        { icon: '👥', label: t('Students'), href: '/admin/students' },
        // { icon: '👩‍👧', label: t('Parental Corner'), href: '/dashboard', accent: 'muted' },
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
            // footerTitle="✨ Hệ thống đang ổn định"
            // footerText="Tổng thời gian hoạt động 99.9% trong tháng này."
            />
            <div className="lg:ml-64">{children}</div>
        </div>
    );
}
