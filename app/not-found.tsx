'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { resolveRoleHome } from '../lib/auth';

export default function NotFound() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    const role = (session?.user as { role?: string } | undefined)?.role || 'PARENT';
    router.replace(status === 'authenticated' ? resolveRoleHome(role) : '/');
  }, [router, session, status]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4faf4] p-6 text-center">
      <div>
        <p className="text-7xl font-extrabold text-[#f47d52]">404</p>
        <h1 className="mt-3 text-3xl font-extrabold text-[#203b35]">Không tìm thấy trang</h1>
        <p className="mt-2 text-[#71867c]">Đang đưa bạn về trang phù hợp...</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-[#6eaa83] px-6 py-3 font-bold text-white"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
