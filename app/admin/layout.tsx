'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppSidebar, type SidebarItem } from '../../components/AppSidebar';

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const baseItems: Omit<SidebarItem, 'active'>[] = [
        { icon: '⌂', label: 'Tổng quan', href: '/admin' },
        { icon: '▣', label: 'Khóa học', href: '/admin/dashboard' },
        { icon: '📊', label: 'Báo cáo', href: '/admin/reports' },
        { icon: '🛒', label: 'Đơn hàng', href: '/admin/orders' },
        { icon: '👥', label: 'Học sinh', href: '/admin/students' },
        { icon: '👩‍👧', label: 'Góc phụ huynh', href: '/dashboard', accent: 'muted' },
        { icon: '▶', label: 'Phòng học', href: '/learn', accent: 'highlight' },
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
