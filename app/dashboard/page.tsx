'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAPI } from '../../lib/hooks/useAPI';
import { useLocale } from '../../context/LocaleContext';

export default function DashboardPage() {
  const { API } = useAPI();
  const [data, setData] = useState(null);
  const [topics, setTopics] = useState([]);
  const [done, setDone] = useState(false);
  const [menu, setMenu] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    const name = localStorage.getItem('eco-child') || 'Bé Mây';
    Promise.all([API.get(`progress/${encodeURIComponent(name)}`, false, true, true),
    API.get('topics', false, true, true)]).then(([progress, nextTopics]) => {
      if (!progress.success && progress.message) return;
      setData({ ...progress, shortName: name.replace(/^Bé\s*/i, '') });
      setTopics(nextTopics);
    });
  }, [API]);
  if (!data) return <div className="grid min-h-screen place-items-center text-xl">Đang tải dashboard…</div>;

  const recent = data.records.slice(0, 3);
  const wordNames = {
    fox: ['🦊', 'Fox', 'Con cáo'],
    whale: ['🐋', 'Whale', 'Cá voi'],
    turtle: ['🐢', 'Turtle', 'Con rùa'],
    apple: ['🍎', 'Apple', 'Quả táo'],
    orange: ['🍊', 'Orange', 'Quả cam'],
    pear: ['🍐', 'Pear', 'Quả lê'],
    car: ['🚗', 'Car', 'Ô tô'],
    bus: ['🚌', 'Bus', 'Xe buýt'],
    rocket: ['🚀', 'Rocket', 'Tên lửa']
  };
  return (
    <div className="min-h-screen bg-[#f4faf4] text-[#203b35]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 w-64 bg-[#203b35] p-6 text-white transition-transform lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'
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
        <nav className="mt-12 space-y-2">
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
        </nav>

        {/* Help */}
        <div className="absolute bottom-8 rounded-2xl bg-white/10 p-4 text-sm">
          <b>💡 {t('Need help')}?</b>

          <p className="mt-2 text-white/70">
            {t('Send a message to ECO-KIDS at any time.')}
          </p>

          <button className="mt-2 font-bold text-[#b7e0bd]">
            {t('Chat')}
          </button>
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
            <span className="text-sm font-bold text-[#80938a]">
              {t('Parent Corner')}
            </span>

            <h1 className="text-3xl font-extrabold sm:text-4xl">
              {t('Good evening, mother of')} <b>{data.shortName}</b> 👋
            </h1>
          </div>

          <div className="hidden items-center gap-3 rounded-full bg-white p-2 pr-5 shadow-sm sm:flex">
            <span className="text-3xl">👩🏻</span>

            <span>
              <b>Nguyễn Thu Hà</b>
              <small className="block">Phụ huynh</small>
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 pb-10 lg:px-10">
          {/* Weekly News */}
          <section className="flex items-center justify-between overflow-hidden rounded-3xl bg-[#2d6358] p-7 text-white shadow-soft">
            <div>
              <span className="font-bold text-[#b7e0bd]">
                {t('Weekly News')}
              </span>

              <h2 className="mt-2 text-4xl font-extrabold">
                {data.shortName} đang tiến bộ thật tuyệt!
              </h2>

              <p className="mt-3 max-w-xl text-[#d1e4d4]">
                Con đã duy trì thói quen học đều và phát âm tốt hơn tuần trước.
              </p>

              <Link
                href="/learn"
                className="mt-5 inline-block rounded-full bg-white px-5 py-3 font-bold text-[#203b35]"
              >
                {t('Continue Learning')} →
              </Link>
            </div>

            <div className="hidden text-8xl sm:block">
              🌱<span className="text-6xl">🦊</span>
            </div>
          </section>

          {/* Statistics */}
          <section
            id="progress"
            className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              ['Aa', t('Words Learned'), data.stats.wordsLearned, 'green'],
              ['🔥', t('Study Streak'), `${data.stats.streak} days`, 'orange'],
              ['🎙', t('Pronunciation Score'), `${data.stats.averageScore}%`, 'blue'],
              ['◷', t('Total Time'), `${data.stats.totalMinutes} minutes`, 'yellow'],
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
                {[6, 9, 5, 12, 8, 14, 10].map((value, index) => (
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
                        height: `${(value / 18) * 100}%`,
                      }}
                    />

                    <small>
                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}
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
                    data.records
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
                    const item =
                      wordNames[record.wordId] || [
                        '✨',
                        record.wordId,
                        'Từ mới',
                      ]

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