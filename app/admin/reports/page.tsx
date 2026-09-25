'use client';

import { useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';

type ReportData = {
    summary: { label: string; value: string; change: string; tone: string }[];
    trend: number[];
    students: { name: string; age: string; avatar: string; level: string; weeklyProgress: number; avgScore: number; completedLessons: number; streak: number; status: string; focus: string; accent: string }[];
    topicPerformance: { topic: string; progress: number; score: number; lessons: number }[];
    weeklyActivity: { day: string; minutes: number }[];
};

export default function AdminReportsPage() {
    const { API } = useAPI();
    const [report, setReport] = useState<ReportData | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        API.get('admin/reports', false, false, true).then(result => {
            if (result?.summary) setReport(result);
            else setError(result?.message || 'Không thể tải báo cáo.');
        });
    }, [API]);

    if (error) return <div className="grid min-h-screen place-items-center p-6 text-center font-bold text-[#d45e45]">{error}</div>;
    if (!report) return <div className="grid min-h-screen place-items-center p-6 text-lg font-bold text-[#71867c]">Đang tải báo cáo...</div>;

    const { summary, trend, students, topicPerformance, weeklyActivity } = report;

    return (
        <main className="min-h-screen bg-[#f4faf4] text-[#203b35]">
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 lg:px-10">
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#80938a]">Admin reports</span>
                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Báo cáo tiến độ học tập của bé</h1>
                    </div>

                    <div className="flex items-center gap-3 rounded-full bg-[#f4faf4] px-4 py-2 shadow-sm">
                        <span className="text-2xl">📈</span>
                        <div>
                            <b className="block text-sm">Tuần 34</b>
                            <small className="text-[#71867c]">Cập nhật 2 giờ trước</small>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 pb-10 pt-8 lg:px-10">
                <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {summary.map((item) => (
                        <div key={item.label} className="rounded-[1.75rem] bg-white p-5 shadow-soft">
                            <div className="flex items-center justify-between gap-3">
                                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl text-white ${item.tone}`}>
                                    ↗
                                </span>
                                <span className="rounded-full bg-[#eef8ef] px-2.5 py-1 text-xs font-bold text-[#2d6358]">
                                    {item.change}
                                </span>
                            </div>

                            <div className="mt-6">
                                <p className="text-sm font-bold text-[#7f928d]">{item.label}</p>
                                <h3 className="mt-2 text-3xl font-extrabold">{item.value}</h3>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
                    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <span className="text-sm font-bold text-[#83968c]">Xu hướng học tập</span>
                                <h3 className="mt-2 text-2xl font-extrabold">Tiến độ 7 ngày gần nhất</h3>
                            </div>
                            <button className="rounded-full bg-[#f4faf4] px-4 py-2 text-sm font-bold text-[#203b35]">
                                Xuất báo cáo
                            </button>
                        </div>

                        <div className="mt-6 flex h-56 items-end gap-3">
                            {trend.map((value, index) => (
                                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                                    <div className="flex w-full items-end justify-center rounded-t-2xl bg-[#dfeff0] p-1" style={{ height: `${value}%` }}>
                                        <div className="w-full rounded-t-xl bg-gradient-to-t from-[#f47d52] to-[#f7b15e]" />
                                    </div>
                                    <span className="text-xs font-bold text-[#7f928d]">{index + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-[#fff6e8] p-6 shadow-soft">
                        <span className="text-sm font-bold text-[#ef7d32]">Thống kê</span>
                        <h3 className="mt-2 text-2xl font-extrabold">Thời lượng học</h3>

                        <div className="mt-6 space-y-4">
                            {weeklyActivity.map((item) => (
                                <div key={item.day}>
                                    <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#203b35]">
                                        <span>{item.day}</span>
                                        <span>{item.minutes} phút</span>
                                    </div>
                                    <div className="h-2.5 rounded-full bg-white/70">
                                        <div
                                            className="h-full rounded-full bg-[#f47d52]"
                                            style={{ width: `${Math.min(item.minutes, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <span className="text-sm font-bold text-[#83968c]">Học sinh</span>
                                <h3 className="mt-2 text-2xl font-extrabold">Từng bé theo tiến độ</h3>
                            </div>
                        </div>

                        <div className="mt-6 space-y-4">
                            {students.map((student) => (
                                <div key={student.name} className="rounded-2xl border border-[#e8efe8] bg-[#f4faf4] p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white"
                                                style={{ backgroundColor: student.accent }}
                                            >
                                                {student.avatar}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <b>{student.name}</b>
                                                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2d6358]">
                                                        {student.level}
                                                    </span>
                                                </div>
                                                <small className="text-[#70857e]">{student.age} • {student.focus}</small>
                                            </div>
                                        </div>

                                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#203b35]">
                                            {student.status}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                                        <div>
                                            <div className="mb-2 flex items-center justify-between text-sm font-bold text-[#203b35]">
                                                <span>Tiến độ</span>
                                                <span>{student.weeklyProgress}%</span>
                                            </div>
                                            <div className="h-2.5 rounded-full bg-white">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{ width: `${student.weeklyProgress}%`, backgroundColor: student.accent }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-[#70857e]">Bài hoàn thành</p>
                                            <p className="mt-2 text-2xl font-extrabold">{student.completedLessons}</p>
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-[#70857e]">Điểm TB</p>
                                            <p className="mt-2 text-2xl font-extrabold">{student.avgScore}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
                        <span className="text-sm font-bold text-[#83968c]">Chủ đề</span>
                        <h3 className="mt-2 text-2xl font-extrabold">Hiệu suất theo khóa học</h3>

                        <div className="mt-6 space-y-5">
                            {topicPerformance.map((topic) => (
                                <div key={topic.topic} className="rounded-2xl bg-[#f4faf4] p-4">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <div>
                                            <b className="block">{topic.topic}</b>
                                            <small className="text-[#71867c]">{topic.lessons} bài học</small>
                                        </div>
                                        <span className="font-bold text-[#203b35]">{topic.progress}%</span>
                                    </div>

                                    <div className="h-3 rounded-full bg-white">
                                        <div
                                            className="h-full rounded-full bg-[#6eaa83]"
                                            style={{ width: `${topic.progress}%` }}
                                        />
                                    </div>

                                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-[#71867c]">
                                        <span>Điểm trung bình</span>
                                        <span>{topic.score}/100</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
