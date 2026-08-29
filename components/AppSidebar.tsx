import Link from 'next/link';

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
    return (
        <aside className="fixed inset-y-0 left-0 z-20 w-64 bg-[#203b35] p-6 text-white transition-transform lg:translate-x-0">
            <Link href="/" className="flex items-center gap-2 text-white">
                <span className="text-4xl font-extrabold leading-none text-[#f47d52]">
                    e
                    <span className="text-[#6eaa83]">c</span>
                    o
                </span>
                <span className="border-l border-white/30 pl-2 text-xs font-black tracking-widest">
                    {brand}
                    <br />
                    <small className="tracking-normal">{role}</small>
                </span>
            </Link>

            <nav className="mt-12 space-y-2">
                {items.map(item => {
                    const classes = `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-bold transition ${
                        item.active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/5'
                    } ${item.accent === 'highlight' ? 'text-[#f4c8a9]' : item.accent === 'muted' ? 'text-[#bfe8c6]' : ''}`;

                    if (item.href) {
                        return (
                            <Link key={item.label} href={item.href} className={classes}>
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

            {(footerTitle || footerText) && (
                <div className="absolute bottom-8 rounded-2xl bg-white/10 p-4 text-sm">
                    {footerTitle && <b>{footerTitle}</b>}
                    {footerText && <p className="mt-2 text-white/70">{footerText}</p>}
                </div>
            )}
        </aside>
    );
}
