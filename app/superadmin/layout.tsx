'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar, type SidebarItem } from '../../components/AppSidebar';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const baseItems: Omit<SidebarItem, 'active'>[] = [
        { icon: '⌂', label: 'Tổng quan', href: '/superadmin' },
        { icon: '🧭', label: 'Toàn cảnh', href: '/superadmin/dashboard' },
        { icon: '🔐', label: 'Vai trò', href: '/superadmin/roles' },
        { icon: '🏢', label: 'Cơ sở', href: '/superadmin/centers' },
        { icon: '📦', label: 'Dữ liệu', href: '/superadmin/data' },
        { icon: '🧑‍💼', label: 'Admin', href: '/admin', accent: 'muted' },
        { icon: '👩‍👧', label: 'Phụ huynh', href: '/dashboard', accent: 'highlight' },
    ];

    const items: SidebarItem[] = baseItems.map(item => ({
        ...item,
        active: item.href ? pathname === item.href : false,
    }));

    return (
        <div className="min-h-screen bg-[#f4faf4] text-[#203b35]">
            <AppSidebar
                brand="KIDS"
                role="Super Admin"
                items={items}
                footerTitle="🔒 Mức quyền tối đa"
                footerText="Toàn bộ hệ thống và dữ liệu doanh nghiệp đang được giám sát."
            />
            <div className="lg:ml-64">{children}</div>
        </div>
    );
}
