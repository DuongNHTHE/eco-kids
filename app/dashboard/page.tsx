'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useAPI } from '../../lib/hooks/useAPI';
import { useLocale } from '../../context/LocaleContext';
import { clearSession, resolveRoleHome } from '../../lib/auth';
import { getSelectedChildId, saveSelectedChild } from '../../lib/child-session';

type ChildProfile = {
  id: string;
  name: string;
  nickname: string;
  avatar: string;
  level: number;
};

const emptyDashboardData = {
  records: [],
  stats: {
    wordsLearned: 0,
    streak: 0,
    averageScore: 0,
    totalMinutes: 0,
  },
  shortName: 'Bé',
};

export default function DashboardPage() {
  const { API } = useAPI();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [topics, setTopics] = useState([]);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [done, setDone] = useState(false);
  const [menu, setMenu] = useState(false);
  const { data: session, status } = useSession();
  const { t } = useLocale();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated') {
      const role = (session?.user as { role?: string } | undefined)?.role || 'PARENT';
      if (role !== 'PARENT') router.replace(resolveRoleHome(role));
    }
  }, [router, session, status]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    Promise.all([
      API.get('children', false, true, true),
      API.get('topics', false, true, true),
    ]).then(([nextChildren, nextTopics]) => {
      if (!Array.isArray(nextChildren)) return;
      const savedId = getSelectedChildId();
      const savedName = localStorage.getItem('eco-child');
      const selectedChild = nextChildren.find(child => child.id === savedId)
        || nextChildren.find(child => child.name === savedName)
        || nextChildren[0];
      setChildren(nextChildren);
      setTopics(nextTopics);
      if (selectedChild) saveSelectedChild(selectedChild);
      setSelectedChildId(selectedChild?.id || '');
    });
  }, [API, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !selectedChildId) return;

    API.get(`progress/${encodeURIComponent(selectedChildId)}`, false, true, true).then(progress => {
      if (!progress || (progress.message && !progress.records)) {
        setData(emptyDashboardData);
        return;
      }
      setData({ ...progress, shortName: progress.childName?.replace(/^Bé\s*/i, '') || 'Bé' });
    });
  }, [API, selectedChildId, status]);

  function chooseChild(child: ChildProfile) {
    saveSelectedChild(child);
    setSelectedChildId(child.id);
    setData(null);
  }

  const role = (session?.user as { role?: string } | undefined)?.role || 'PARENT';
  if (status !== 'authenticated' || role !== 'PARENT') return <div className="grid min-h-screen place-items-center text-xl">Đang tải dashboard...</div>;

  const dashboardData = data || emptyDashboardData;
  const recent = dashboardData.records.slice(0, 3);
  const words = topics.flatMap(topic => topic.words.map(word => ({ ...word, topic })));
  const parentName = session?.user?.name || 'Phụ huynh';
  const parentEmail = session?.user?.email || 'Chưa cập nhật email';
  const parentAvatar = session?.user?.image;
  const parentInitial = parentName.trim().charAt(0).toUpperCase() || 'P';

  async function handleLogout() {
    clearSession();
    await signOut({ callbackUrl: '/login' });
  }

  const activity = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);
    const count = dashboardData.records.filter(record => {
      const practicedAt = new Date(record.practicedAt || record.createdAt || 0);
      return practicedAt >= day && practicedAt < nextDay;
    }).length;
    return { label: new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(day), count };
  });
  const maxActivity = Math.max(...activity.map(item => item.count), 1);
  return (
    <div className="min-h-screen bg-[#f4faf4] text-[#203b35]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#203b35] p-6 text-white transition-transform lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-4xl font-extrabold leading-none text-[#f47d52]">
            e
            <span className="text-[#6eaa83]">
              c
            </span>
            o
          </span>
          <span className="border-l border-[#d9e5da] pl-2 text-xs font-black leading-3 tracking-widest">
            KIDS<br />
            <small className="font-semibold tracking-normal">
              {t('Parent')}
            </small>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="mt-12 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {[
            ['⌂', t('OverView'), '#overview'],
            ['▥', t('Progress'), '#progress'],
            ['☆', t('Activity'), '#activity'],
          ].map(([icon, label, href], index) => (
            <a
              key={label}
              href={href}
              className={`flex gap-3 rounded-xl px-4 py-3 font-bold ${index === 0 ? 'bg-white/15' : ''
                }`}
            >
              <span>{icon}</span>
              {label}
            </a>
          ))}

          <Link
            href="/learn"
            className="flex gap-3 rounded-xl px-4 py-3 font-bold"
          >
            <span>▶</span>
            {t('Classroom')}
          </Link>

          <Link href="/shop" className="flex gap-3 rounded-xl px-4 py-3 font-bold text-[#f7c6a6]">
            <span>🛍</span>
            Cửa hàng học liệu
          </Link>

          <Link href="/children" className="flex gap-3 rounded-xl px-4 py-3 font-bold text-[#bfe8c6]">
            <span>👨‍👩‍👧</span>
            Tài khoản của bé
          </Link>
        </nav>

        {/* Help and account */}
        <div className="shrink-0 pt-6">
          {/* <div className="rounded-2xl bg-white/10 p-4 text-sm">
            <b>💡 {t('Need help')}?</b>

            <p className="mt-2 text-white/70">
              {t('Send a message to ECO-KIDS at any time.')}
            </p>

            <button className="mt-2 font-bold text-[#b7e0bd]">
              {t('Chat')}
            </button>
          </div> */}

          <Link href="/profile" className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3 transition hover:bg-white/15">
            {parentAvatar ? (
              <img src={parentAvatar} alt={`Ảnh đại diện của ${parentName}`} className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/30" />
            ) : (
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f47d52] text-lg font-black text-white">
                {parentInitial}
              </span>
            )}
            <span className="min-w-0">
              <b className="block truncate">{parentName}</b>
              <small className="block truncate text-white/65">{parentEmail}</small>
            </span>
          </Link>

          <div className="mt-3 flex items-center justify-between px-1 text-sm">
            <Link href="/settings" className="font-bold text-white/75 transition hover:text-white">⚙ Cài đặt</Link>
            <button type="button" onClick={handleLogout} className="font-bold text-[#f4c8a9] transition hover:text-white">Đăng xuất</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:ml-64" id="overview">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-6 lg:px-10">
          <button
            onClick={() => setMenu(!menu)}
            className="text-2xl lg:hidden"
          >
            ☰
          </button>

          <div>
  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f4e9] px-3 py-1 text-sm font-bold text-[#2d6358]">
    <span aria-hidden>🔒</span>
    {t('Parent Corner')}
  </span>

  <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
    {t('Good evening, parent')} 👋
  </h1>

  {children.length > 0 && (
    <div className="mt-5">
      <p id="dashboard-child-label" className="text-sm font-bold text-[#60786e]">
        Đang xem tiến độ của:
      </p>

      <div
        role="radiogroup"
        aria-labelledby="dashboard-child-label"
        className="mt-2 flex flex-wrap items-center gap-2"
      >
        {children.map(child => {
          const active = child.id === selectedChildId;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={active}
              key={child.id}
              onClick={() => chooseChild(child)}
              className={`inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 py-1.5 pl-1.5 pr-4 font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6358] ${
                active
                  ? 'border-[#2d6358] bg-[#2d6358] text-white shadow-md'
                  : 'border-[#d9eadc] bg-white text-[#203b35] hover:border-[#2d6358]'
              }`}
            >
              <span
                aria-hidden
                className={`grid h-9 w-9 place-items-center rounded-full text-xl ${active ? 'bg-white' : 'bg-[#f4faf4]'}`}
              >
                {child.avatar}
              </span>
              {child.nickname || child.name}
            </button>
          );
        })}

        <Link
          href="/children"
          className="inline-flex min-h-[48px] items-center gap-1 rounded-full border-2 border-dashed border-[#9bc7b4] px-4 font-bold text-[#2d6358] transition hover:bg-[#e8f4e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d6358]"
        >
          <span aria-hidden className="text-xl leading-none">+</span> Thêm bé
        </Link>
      </div>
    </div>
  )}
</div>

          <div className="hidden items-center gap-3 rounded-full bg-white p-2 pr-5 shadow-sm sm:flex">
            {parentAvatar ? (
              <img src={parentAvatar} alt={`Ảnh đại diện của ${parentName}`} className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f47d52] text-lg font-black text-white">{parentInitial}</span>
            )}

            <span>
              <b>{parentName}</b>
              <small className="block">{session?.user?.email || 'Phụ huynh'}</small>
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 pb-10 lg:px-10">
          {/* Weekly News */}
          <section className="relative overflow-hidden rounded-[2.5rem] border-4 border-white bg-gradient-to-br from-[#7fd6b0] via-[#9be3c4] to-[#ffe58a] p-6 shadow-soft sm:p-8">
            {/* Trang trí nền */}
            <span aria-hidden className="pointer-events-none absolute -left-6 -top-6 h-28 w-28 rounded-full bg-white/30" />
            <span aria-hidden className="pointer-events-none absolute -bottom-8 right-24 h-24 w-24 rounded-full bg-white/30" />
            <span aria-hidden className="pointer-events-none absolute right-6 top-4 text-3xl motion-safe:animate-pulse">✨</span>

            <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
              {/* Mascot */}
              <div
                aria-hidden
                className="order-1 flex items-end justify-center sm:order-2"
              >
                <span className="text-6xl">🌱</span>
                <span
                  className="text-[6.5rem] leading-none drop-shadow-lg sm:text-[8rem]"
                  // motion-safe:animate-bounce 
                >
                  🦊
                </span>
              </div>

              {/* Nội dung */}
              <div className="order-2 sm:order-1">
                <span className="inline-block rounded-full bg-white/80 px-4 py-1 text-sm font-extrabold text-[#2d6358]">
                  ⭐ {t('Weekly News')}
                </span>

                <h2 className="mt-3 text-3xl font-black leading-tight text-[#1f4d43] sm:text-5xl">
                  Giỏi quá, {dashboardData.shortName} ơi! 🎉
                </h2>

                <div
                  className="mt-3 flex justify-center gap-1 text-3xl sm:justify-start"
                  aria-label="Số ngày học trong tuần"
                >
                  {Array.from({ length: 7 }).map((_, i) => (
                    <span key={i} className={i < dashboardData.stats.daysLearned ? '' : 'opacity-30 grayscale'}>
                      ⭐
                    </span>
                  ))}
                </div>

                <p className="mt-2 text-base font-bold text-[#2d6358] sm:text-lg">
                  Con học đều và phát âm hay hơn tuần trước!
                </p>

                <Link
                  href="/learn"
                  className="mt-5 inline-flex min-h-[64px] items-center gap-3 rounded-full border-b-8 border-[#e0742a] bg-[#ff9a3c] px-8 text-xl font-black text-white shadow-lg transition active:translate-y-1 active:border-b-4 motion-safe:hover:scale-105"
                >
                  <span className="text-3xl">▶️</span>
                  {t('Continue Learning')}
                </Link>
              </div>
            </div>
          </section>

          {/* Statistics */}
          <section
            id="progress"
            className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              ['Aa', t('Words Learned'), dashboardData.stats.wordsLearned, 'green'],
              ['🔥', t('Study Streak'), `${dashboardData.stats.streak} days`, 'orange'],
              ['🎙', t('Pronunciation Score'), `${dashboardData.stats.averageScore}%`, 'blue'],
              ['◷', t('Total Time'), `${dashboardData.stats.totalMinutes} minutes`, 'yellow'],
            ].map(([icon, label, value, color]) => (
              <article
                key={label}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <span
                  className={`inline-grid h-11 w-11 place-items-center rounded-xl bg-${color}-100 font-black`}
                >
                  {icon}
                </span>

                <small className="mt-4 block text-[#80938a]">
                  {label}
                </small>

                <strong className="mt-1 block text-3xl font-extrabold">
                  {value}
                </strong>

                <span className="text-sm text-[#6eaa83]">
                  {t('↑ making progress')}
                </span>
              </article>
            ))}
          </section>

          {/* Content Grid */}
          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            {/* Activity Chart */}
            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <small className="font-bold text-[#80938a]">
                {t('Study Activity')}
              </small>

              <h3 className="text-2xl font-extrabold">
                {t('Last 7 Days')}
              </h3>

              <div className="mt-8 flex h-48 items-end justify-around gap-3">
                {activity.map((item, index) => (
                  <div
                    key={index}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >
                    <i
                      className={`w-full rounded-t-xl ${index === 6
                        ? 'bg-[#f47d52]'
                        : 'bg-[#b7dcb9]'
                        }`}
                      style={{
                        height: `${Math.max((item.count / maxActivity) * 100, item.count ? 8 : 2)}%`,
                      }}
                    />

                    <small>
                      {item.label}
                    </small>
                  </div>
                ))}
              </div>
            </article>

            {/* Topics */}
            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex justify-between">
                <div>
                  <small className="font-bold text-[#80938a]">
                    {t('Topic Journey')}
                  </small>

                  <h3 className="text-2xl font-extrabold">
                    {t('Exploration of Your Child')}
                  </h3>
                </div>

                <Link href="/learn" className="font-bold">
                  {t('Continue Learning')} →
                </Link>
              </div>

              <div className="mt-5 space-y-4">
                {topics.map((topic) => {
                  const learned = new Set(
                    dashboardData.records
                      .filter((record) => record.topicId === topic.id)
                      .map((record) => record.wordId)
                  ).size

                  const percent = Math.round(
                    (learned / topic.words.length) * 100
                  )

                  return (
                    <div
                      key={topic.id}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="grid h-11 w-11 place-items-center rounded-xl text-2xl"
                        style={{
                          background: `${topic.color}1f`,
                        }}
                      >
                        {topic.icon}
                      </span>

                      <div className="flex-1">
                        <b>{topic.vietnamese}</b>

                        <small className="block text-[#80938a]">
                          {learned}/{topic.words.length} {t('words explored')}
                        </small>

                        <div className="mt-2 h-2 rounded-full bg-[#e1ece1]">
                          <i
                            className="block h-full rounded-full"
                            style={{
                              width: `${percent}%`,
                              background: topic.color,
                            }}
                          />
                        </div>
                      </div>

                      <b>{percent}%</b>
                    </div>
                  )
                })}
              </div>
            </article>

            {/* Recent Words */}
            <article
              id="activity"
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <small className="font-bold text-[#80938a]">
                {t('Latest Words')}
              </small>

              <h3 className="text-2xl font-extrabold">
                {t('Your Child Just Learned')}
              </h3>

              <div className="mt-5 space-y-3">
                {recent.length ? (
                  recent.map((record) => {
                    const word = words.find(item => item.id === record.wordId)
                    const item = [word?.shape || '✨', word?.english || record.wordId, word?.vietnamese || 'Từ mới']

                    return (
                      <div
                        key={record._id || record.wordId}
                        className="flex items-center gap-3 rounded-xl bg-[#f4faf4] p-3"
                      >
                        <span className="text-2xl">{item[0]}</span>

                        <span className="flex-1">
                          <b>{item[1]}</b>

                          <small className="block text-[#80938a]">
                            {item[2]}
                          </small>
                        </span>

                        <b className="text-[#6eaa83]">
                          {record.score}%
                        </b>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-[#80938a]">
                    {t('Your child has not learned any words yet. Let\'s start the first lesson!')}
                  </p>
                )}
              </div>
            </article>

            {/* Suggestion */}
            <article className="rounded-2xl bg-[#fff2d5] p-6">
              <span className="text-4xl">💡</span>

              <small className="mt-3 block font-bold text-[#9a7d3a]">
                {t('Suggestions for Tonight')}
              </small>

              <h3 className="text-2xl font-extrabold">
                {t('Hide and Seek Around the House')}
              </h3>

              <p className="mt-2 text-[#74643f]">
                {t('Parents call out a color in English, and the child has 30 seconds to find an object of that color. No screens, just fun learning!')}
              </p>

              <button
                onClick={() => setDone(true)}
                className="mt-4 rounded-full bg-[#203b35] px-5 py-3 font-bold text-white"
              >
                {done
                  ? t('Completed today 🌟')
                  : t('Mark as played ✓')}
              </button>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}