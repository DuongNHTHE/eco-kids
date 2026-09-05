'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { resolveRoleHome, saveSession } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('123456789');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    const role = (session.user as { role?: string }).role || 'PARENT';
    router.replace(resolveRoleHome(role));
  }, [router, session, status]);

  if (status === 'loading' || status === 'authenticated') {
    return <div className="grid min-h-screen place-items-center bg-[#f4faf4] text-lg font-bold text-[#71867c]">Đang kiểm tra phiên đăng nhập...</div>;
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setMessage('');
    const result = await signIn('google', { callbackUrl: '/dashboard' });
    if (result?.error) {
      setMessage('Không thể đăng nhập bằng Google. Hãy kiểm tra cấu hình Google OAuth.');
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (!result || result.error) {
        setMessage('Email hoặc mật khẩu không đúng.');
        setLoading(false);
        return;
      }

      const session = await getSession();
      const user = session?.user as ({ id?: string; email?: string; name?: string; role?: string } | undefined);
      if (!user?.id || !user.email || !user.role) {
        setMessage('Không thể tạo phiên đăng nhập.');
        setLoading(false);
        return;
      }

      saveSession({
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        role: user.role,
      });

      router.replace(resolveRoleHome(user.role));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể đăng nhập.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4faf4] p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-[#dceadd] bg-white p-8 shadow-soft">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef8ef] text-3xl">🔐</div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#6eaa83]">ECO-KIDS</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#203b35]">Đăng nhập</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-bold text-[#203b35]">
            Email
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dceadd] bg-[#f8fcf8] px-3 py-2.5 outline-none focus:border-[#6eaa83]"
              placeholder="admin@example.com"
            />
          </label>

          <label className="block text-sm font-bold text-[#203b35]">
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dceadd] bg-[#f8fcf8] px-3 py-2.5 outline-none focus:border-[#6eaa83]"
              placeholder="123456789"
            />
          </label>

          {message && <p className="text-sm font-bold text-[#d45e45]">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#f47d52] px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs font-bold text-[#83968c]">
          <span className="h-px flex-1 bg-[#dceadd]" />
          <span>HOẶC</span>
          <span className="h-px flex-1 bg-[#dceadd]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-[#c8d9cb] bg-white px-5 py-3 font-bold text-[#203b35] transition hover:bg-[#f4faf4] disabled:opacity-60"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full border border-[#dceadd] text-sm font-extrabold text-[#4285f4]">G</span>
          {loading ? 'Đang kết nối Google...' : 'Đăng nhập với Google'}
        </button>

        <div className="mt-5 text-center text-sm">
          <Link href="/" className="font-bold text-[#6eaa83]">← Về trang chủ</Link>
        </div>
      </div>
    </main>
  );
}
