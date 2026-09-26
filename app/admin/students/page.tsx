'use client';

import { type SubmitEvent as ReactSubmitEvent, useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';

type Student = {
    id: string;
    name: string;
    nickname: string;
    avatar: string;
    birthDate: string | null;
    gender: string;
    level: number;
    createdAt: string | null;
    parentName: string;
    parentEmail: string;
    lessonsRecorded: number;
    averageScore: number;
    lastStudiedAt: string | null;
    active: boolean;
};

type StudentDraft = {
    name: string;
    nickname: string;
    avatar: string;
    birthDate: string;
    gender: string;
    level: number;
};

function formatDate(value: string | null) {
    if (!value) return 'Chưa có dữ liệu';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(date);
}

function getAge(value: string | null) {
    if (!value) return 'Chưa cập nhật';
    const birthDate = new Date(value);
    if (Number.isNaN(birthDate.getTime())) return 'Chưa cập nhật';
    let age = new Date().getFullYear() - birthDate.getFullYear();
    const today = new Date();
    if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age -= 1;
    return `${Math.max(0, age)} tuổi`;
}

export default function AdminStudentsPage() {
    const { API } = useAPI();
    const [students, setStudents] = useState<Student[]>([]);
    const [search, setSearch] = useState('');
    const [activity, setActivity] = useState<'all' | 'active' | 'inactive'>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [detailStudent, setDetailStudent] = useState<Student | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<StudentDraft>({ name: '', nickname: '', avatar: '🧒', birthDate: '', gender: '', level: 1 });

    async function loadStudents() {
        setLoading(true);
        const result = await API.get('admin/students', false, false, true);
        if (Array.isArray(result?.students)) {
            setStudents(result.students);
            setError('');
        } else {
            setError(result?.message || 'Không thể tải danh sách học sinh.');
        }
        setLoading(false);
    }

    useEffect(() => { loadStudents(); }, []);

    function openEditor(student: Student) {
        setDraft({
            name: student.name,
            nickname: student.nickname,
            avatar: student.avatar,
            birthDate: student.birthDate ? new Date(student.birthDate).toISOString().slice(0, 10) : '',
            gender: student.gender,
            level: student.level,
        });
        setEditingStudent(student);
        setDetailStudent(null);
        setError('');
    }

    async function saveStudent(event: ReactSubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editingStudent) return;
        setSaving(true);
        setError('');
        const result = await API.patch('admin/students', {
            studentId: editingStudent.id,
            ...draft,
            birthDate: draft.birthDate || null,
        }, true, false, true);
        setSaving(false);
        if (!result?.success || !result.student) {
            setError(result?.message || 'Không thể cập nhật hồ sơ học sinh.');
            return;
        }
        setStudents(current => current.map(student => student.id === editingStudent.id ? { ...student, ...result.student } : student));
        setEditingStudent(null);
    }

    async function deleteStudent(student: Student) {
        if (!window.confirm(`Xóa hồ sơ của ${student.name}? Tiến độ học tập liên quan cũng sẽ bị xóa.`)) return;
        setError('');
        const result = await API.delete(`admin/students?id=${encodeURIComponent(student.id)}`, true, false, true);
        if (!result?.success) {
            setError(result?.message || 'Không thể xóa hồ sơ học sinh.');
            return;
        }
        setStudents(current => current.filter(item => item.id !== student.id));
        setDetailStudent(current => current?.id === student.id ? null : current);
    }

    const normalizedSearch = search.trim().toLocaleLowerCase('vi');
    const filteredStudents = students.filter(student => {
        const matchesSearch = !normalizedSearch ||
            student.name.toLocaleLowerCase('vi').includes(normalizedSearch) ||
            student.parentName.toLocaleLowerCase('vi').includes(normalizedSearch) ||
            student.parentEmail.toLocaleLowerCase('vi').includes(normalizedSearch);
        const matchesActivity = activity === 'all' || student.active === (activity === 'active');
        return matchesSearch && matchesActivity;
    });
    const activeCount = students.filter(student => student.active).length;
    const averageScore = students.length
        ? Math.round(students.reduce((sum, student) => sum + student.averageScore, 0) / students.length)
        : 0;
    let tableContent;

    if (loading) {
        tableContent = <div className="mt-5 bg-white p-10 text-center font-bold text-[#71867c]">Đang tải danh sách học sinh...</div>;
    } else if (filteredStudents.length === 0) {
        tableContent = <div className="mt-5 bg-white p-10 text-center text-[#71867c]">
            {students.length ? 'Không tìm thấy học sinh phù hợp.' : 'Chưa có hồ sơ học sinh.'}
        </div>;
    } else {
        tableContent = <div className="mt-5 overflow-hidden border border-[#dfe9e1] bg-white shadow-soft">
            <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                    <thead className="bg-[#f4faf4] text-[#557168]">
                        <tr>
                            <th className="px-5 py-4 text-sm font-bold">Học sinh</th>
                            <th className="px-5 py-4 text-sm font-bold">Phụ huynh</th>
                            <th className="px-5 py-4 text-sm font-bold">Tiến độ</th>
                            <th className="px-5 py-4 text-sm font-bold">Hoạt động gần nhất</th>
                            <th className="px-5 py-4 text-sm font-bold">Tình trạng</th>
                            <th className="px-5 py-4 text-sm font-bold">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(student => (
                            <tr key={student.id} className="border-t border-[#edf3ed]">
                                <td className="px-5 py-4">
                                    <div className="flex min-w-52 items-center gap-3">
                                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e9f3eb] text-xl" aria-hidden="true">{student.avatar}</div>
                                        <div>
                                            <p className="font-extrabold text-[#203b35]">{student.name}</p>
                                            <p className="text-xs text-[#71867c]">{student.nickname ? `${student.nickname} · ` : ''}{getAge(student.birthDate)} · Level {student.level}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <p className="font-bold text-[#3d554d]">{student.parentName}</p>
                                    <p className="text-sm text-[#71867c]">{student.parentEmail || 'Chưa có email'}</p>
                                </td>
                                <td className="px-5 py-4">
                                    <p className="font-bold text-[#203b35]">{student.lessonsRecorded} bài ghi nhận</p>
                                    <p className="text-sm text-[#71867c]">Điểm trung bình: {student.averageScore}/100</p>
                                </td>
                                <td className="whitespace-nowrap px-5 py-4 text-sm text-[#526a63]">{formatDate(student.lastStudiedAt)}</td>
                                <td className="px-5 py-4">
                                    <span className={`inline-flex rounded-sm px-3 py-1 text-xs font-bold ${student.active ? 'bg-[#e8f5e9] text-[#2d6358]' : 'bg-[#f1f3f1] text-[#71867c]'}`}>
                                        {student.active ? 'Đang học' : 'Chưa hoạt động'}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        <button type="button" onClick={() => setDetailStudent(student)} className="rounded-lg border border-[#dceadd] px-3 py-2 text-xs font-bold text-[#2d6358] hover:bg-[#f4faf4]">Xem</button>
                                        <button type="button" onClick={() => openEditor(student)} className="rounded-lg border border-[#dceadd] px-3 py-2 text-xs font-bold text-[#203b35] hover:bg-[#f4faf4]">Sửa</button>
                                        <button type="button" onClick={() => deleteStudent(student)} className="rounded-lg border border-[#f1d3c9] px-3 py-2 text-xs font-bold text-[#c6523a] hover:bg-[#fff4ef]">Xóa</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="border-t border-[#edf3ed] px-5 py-3 text-sm text-[#71867c]">Hiển thị {filteredStudents.length} / {students.length} học sinh</p>
        </div>;
    }

    return (
        <main className="min-h-screen px-5 py-8 lg:px-10">
            <div className="mx-auto max-w-7xl">
                <header className="flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#ef7d32]">Trung tâm quản trị</span>
                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Học sinh</h1>
                        <p className="mt-2 text-[#71867c]">Hồ sơ học sinh và tình hình học tập.</p>
                    </div>
                    <button type="button" onClick={loadStudents} className="rounded-full bg-[#203b35] px-5 py-3 text-sm font-bold text-white">
                        Làm mới
                    </button>
                </header>

                <section className="mt-7 grid gap-4 sm:grid-cols-3" aria-label="Thống kê học sinh">
                    <div className="border-l-4 border-[#f47d52] bg-white px-5 py-4 shadow-soft">
                        <p className="text-sm font-bold text-[#71867c]">Tổng số học sinh</p>
                        <p className="mt-2 text-3xl font-extrabold">{students.length}</p>
                    </div>
                    <div className="border-l-4 border-[#6eaa83] bg-white px-5 py-4 shadow-soft">
                        <p className="text-sm font-bold text-[#71867c]">Đang học trong 7 ngày</p>
                        <p className="mt-2 text-3xl font-extrabold">{activeCount}</p>
                    </div>
                    <div className="border-l-4 border-[#f5b83d] bg-white px-5 py-4 shadow-soft">
                        <p className="text-sm font-bold text-[#71867c]">Điểm trung bình</p>
                        <p className="mt-2 text-3xl font-extrabold">{averageScore}<span className="ml-1 text-base text-[#71867c]">/100</span></p>
                    </div>
                </section>

                <section className="mt-7 bg-white p-4 shadow-soft">
                    <div className="grid gap-4 md:grid-cols-[1fr_230px]">
                        <label className="text-xs font-bold uppercase tracking-[0.14em] text-[#71867c]">
                            <span className="block">Tìm học sinh hoặc phụ huynh</span>
                            <input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Tên học sinh, tên phụ huynh hoặc email"
                                className="mt-2 w-full rounded-xl border border-[#dceadd] bg-[#f8fcf8] px-4 py-3 text-sm font-normal normal-case tracking-normal text-[#203b35] outline-none focus:border-[#6eaa83]"
                            />
                        </label>
                        <label className="text-xs font-bold uppercase tracking-[0.14em] text-[#71867c]">
                            <span className="block">Tình trạng học</span>
                            <select
                                value={activity}
                                onChange={event => setActivity(event.target.value as typeof activity)}
                                className="mt-2 w-full rounded-xl border border-[#dceadd] bg-[#f8fcf8] px-4 py-3 text-sm font-bold normal-case tracking-normal text-[#203b35] outline-none focus:border-[#6eaa83]"
                            >
                                <option value="all">Tất cả</option>
                                <option value="active">Đang học gần đây</option>
                                <option value="inactive">Chưa học gần đây</option>
                            </select>
                        </label>
                    </div>
                </section>

                {error && <p role="alert" className="mt-5 bg-[#fff0e8] p-4 font-bold text-[#d45e45]">{error}</p>}
                {tableContent}
            </div>

            {detailStudent && (
                <div className="fixed inset-0 z-40 grid place-items-center p-4">
                    <button
                        type="button"
                        aria-label="Đóng chi tiết học sinh"
                        onClick={() => setDetailStudent(null)}
                        className="absolute inset-0 bg-[#203b35]/50 backdrop-blur-sm"
                    />
                    <dialog
                        open
                        aria-labelledby="student-detail-title"
                        className="relative z-10 m-0 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border-0 bg-white p-0 shadow-2xl"
                    >
                        {/* Header band */}
                        <div className="relative overflow-hidden rounded-t-[2rem] bg-[#e9f3eb] px-6 pb-8 pt-6">
                            <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#ef7d32]/10" aria-hidden="true" />
                            <div className="absolute -bottom-12 -left-6 h-24 w-24 rounded-full bg-[#203b35]/5" aria-hidden="true" />

                            <button
                                type="button"
                                aria-label="Đóng"
                                onClick={() => setDetailStudent(null)}
                                className="absolute z-[5000] right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-bold text-[#71867c] shadow-sm hover:text-[#203b35]"
                            >
                                ×
                            </button>

                            <div className="relative flex items-center gap-4">
                                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white text-4xl shadow-md ring-4 ring-[#ef7d32]/20" aria-hidden="true">
                                    {detailStudent.avatar}
                                </div>
                                <div>
                                    <span className="inline-block rounded-full bg-[#ef7d32] px-3 py-1 text-xs font-bold text-white">
                                        Hồ sơ học sinh
                                    </span>
                                    <h2 id="student-detail-title" className="mt-2 text-2xl font-extrabold text-[#203b35]">
                                        {detailStudent.name}
                                    </h2>
                                    {detailStudent.nickname && (
                                        <p className="mt-0.5 text-sm font-medium text-[#71867c]">
                                            Ở nhà hay gọi là “{detailStudent.nickname}”
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-6 pt-5">
                            {/* Achievement cards */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-2xl bg-[#fff4e6] p-3 text-center">
                                    <p className="text-2xl" aria-hidden="true">⭐</p>
                                    <p className="mt-1 text-lg font-extrabold text-[#203b35]">{detailStudent.level}</p>
                                    <p className="text-xs font-semibold text-[#71867c]">Cấp độ</p>
                                </div>
                                <div className="rounded-2xl bg-[#e9f3eb] p-3 text-center">
                                    <p className="text-2xl" aria-hidden="true">📚</p>
                                    <p className="mt-1 text-lg font-extrabold text-[#203b35]">{detailStudent.lessonsRecorded}</p>
                                    <p className="text-xs font-semibold text-[#71867c]">Bài đã học</p>
                                </div>
                                <div className="rounded-2xl bg-[#eaf1ff] p-3 text-center">
                                    <p className="text-2xl" aria-hidden="true">🎯</p>
                                    <p className="mt-1 text-lg font-extrabold text-[#203b35]">{detailStudent.averageScore}<span className="text-sm font-bold text-[#71867c]">/100</span></p>
                                    <p className="text-xs font-semibold text-[#71867c]">Điểm TB</p>
                                </div>
                                <div className="rounded-2xl bg-[#fdeaea] p-3 text-center">
                                    <p className="text-2xl" aria-hidden="true">🕒</p>
                                    <p className="mt-1 text-sm font-extrabold leading-tight text-[#203b35]">{formatDate(detailStudent.lastStudiedAt) || 'Chưa học'}</p>
                                    <p className="text-xs font-semibold text-[#71867c]">Gần nhất</p>
                                </div>
                            </div>

                            {/* Personal info */}
                            <div className="mt-6 rounded-2xl bg-[#f7f7f5] p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-[#71867c]">Thông tin cá nhân</p>
                                <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                                    <div className="flex items-center justify-between sm:block">
                                        <dt className="text-sm text-[#71867c]">Tuổi</dt>
                                        <dd className="font-bold text-[#203b35] sm:mt-0.5">{getAge(detailStudent.birthDate)}</dd>
                                    </div>
                                    <div className="flex items-center justify-between sm:block">
                                        <dt className="text-sm text-[#71867c]">Giới tính</dt>
                                        <dd className="font-bold text-[#203b35] sm:mt-0.5">
                                            {{ girl: 'Nữ', boy: 'Nam', other: 'Khác' }[detailStudent.gender] || 'Chưa cập nhật'}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between sm:block">
                                        <dt className="text-sm text-[#71867c]">Phụ huynh</dt>
                                        <dd className="font-bold text-[#203b35] sm:mt-0.5">{detailStudent.parentName}</dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 sm:block">
                                        <dt className="text-sm text-[#71867c]">Email phụ huynh</dt>
                                        <dd className="break-all text-right font-bold text-[#203b35] sm:mt-0.5 sm:text-left">
                                            {detailStudent.parentEmail || 'Chưa cập nhật'}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between sm:block">
                                        <dt className="text-sm text-[#71867c]">Ngày tạo hồ sơ</dt>
                                        <dd className="font-bold text-[#203b35] sm:mt-0.5">{formatDate(detailStudent.createdAt)}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDetailStudent(null)}
                                    className="rounded-full px-5 py-3 text-sm font-bold text-[#71867c] hover:bg-[#f7f7f5]"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openEditor(detailStudent)}
                                    className="rounded-full bg-[#203b35] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#152722]"
                                >
                                    Chỉnh sửa hồ sơ
                                </button>
                            </div>
                        </div>
                    </dialog>
                </div>
            )}

            {editingStudent && (
                <div className="fixed inset-0 z-40 grid place-items-center p-4">
                    <button
                        type="button"
                        aria-label="Đóng form chỉnh sửa"
                        onClick={() => setEditingStudent(null)}
                        className="absolute inset-0 bg-[#203b35]/50 backdrop-blur-sm"
                    />
                    <form
                        onSubmit={saveStudent}
                        className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border-0 bg-white p-0 shadow-2xl"
                    >
                        {/* Header band */}
                        <div className="relative overflow-hidden rounded-t-[2rem] bg-[#e9f3eb] px-6 pb-7 pt-6">
                            <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#ef7d32]/10" aria-hidden="true" />
                            <div className="absolute -bottom-12 -left-6 h-24 w-24 rounded-full bg-[#203b35]/5" aria-hidden="true" />

                            <button
                                type="button"
                                aria-label="Đóng"
                                onClick={() => setEditingStudent(null)}
                                className="absolute z-[5000] right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-bold text-[#71867c] shadow-sm hover:text-[#203b35]"
                            >
                                ×
                            </button>

                            <div className="relative flex items-center gap-4">
                                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-3xl shadow-md ring-4 ring-[#ef7d32]/20" aria-hidden="true">
                                    {draft.avatar || '🧒'}
                                </div>
                                <div>
                                    <span className="inline-block rounded-full bg-[#ef7d32] px-3 py-1 text-xs font-bold text-white">
                                        Hồ sơ học sinh
                                    </span>
                                    <h2 className="mt-2 text-2xl font-extrabold text-[#203b35]">
                                        Chỉnh sửa {editingStudent.name}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-6 pt-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="text-sm font-bold text-[#526d64] sm:col-span-2">
                                    <span className="block">Họ tên</span>
                                    <input
                                        required
                                        minLength={2}
                                        maxLength={50}
                                        value={draft.name}
                                        onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}
                                        className="mt-2 w-full rounded-2xl border border-[#dceadd] px-4 py-3 font-normal outline-none focus:border-[#6eaa83] focus:ring-4 focus:ring-[#6eaa83]/15"
                                    />
                                </label>

                                <label className="text-sm font-bold text-[#526d64]">
                                    <span className="block">Tên gọi ở nhà</span>
                                    <input
                                        maxLength={50}
                                        value={draft.nickname}
                                        onChange={event => setDraft(current => ({ ...current, nickname: event.target.value }))}
                                        className="mt-2 w-full rounded-2xl border border-[#dceadd] px-4 py-3 font-normal outline-none focus:border-[#6eaa83] focus:ring-4 focus:ring-[#6eaa83]/15"
                                    />
                                </label>

                                <label className="text-sm font-bold text-[#526d64]">
                                    <span className="block">Ảnh đại diện (emoji)</span>
                                    <input
                                        maxLength={16}
                                        value={draft.avatar}
                                        onChange={event => setDraft(current => ({ ...current, avatar: event.target.value }))}
                                        placeholder="🧒"
                                        className="mt-2 w-full rounded-2xl border border-[#dceadd] px-4 py-3 font-normal outline-none focus:border-[#6eaa83] focus:ring-4 focus:ring-[#6eaa83]/15"
                                    />
                                </label>

                                <label className="text-sm font-bold text-[#526d64]">
                                    <span className="block">Ngày sinh</span>
                                    <input
                                        type="date"
                                        max={new Date().toISOString().slice(0, 10)}
                                        value={draft.birthDate}
                                        onChange={event => setDraft(current => ({ ...current, birthDate: event.target.value }))}
                                        className="mt-2 w-full rounded-2xl border border-[#dceadd] px-4 py-3 font-normal outline-none focus:border-[#6eaa83] focus:ring-4 focus:ring-[#6eaa83]/15"
                                    />
                                </label>

                                <label className="text-sm font-bold text-[#526d64]">
                                    <span className="block">Giới tính</span>
                                    <select
                                        value={draft.gender}
                                        onChange={event => setDraft(current => ({ ...current, gender: event.target.value }))}
                                        className="mt-2 w-full rounded-2xl border border-[#dceadd] bg-white px-4 py-3 font-normal outline-none focus:border-[#6eaa83] focus:ring-4 focus:ring-[#6eaa83]/15"
                                    >
                                        <option value="">Chưa cập nhật</option>
                                        <option value="girl">Nữ</option>
                                        <option value="boy">Nam</option>
                                        <option value="other">Khác</option>
                                    </select>
                                </label>

                                <label className="text-sm font-bold text-[#526d64]">
                                    <span className="block">Cấp độ</span>
                                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#dceadd] px-4 py-3 focus-within:border-[#6eaa83] focus-within:ring-4 focus-within:ring-[#6eaa83]/15">
                                        <span className="text-base" aria-hidden="true">⭐</span>
                                        <input
                                            type="number"
                                            required
                                            min={1}
                                            max={100}
                                            value={draft.level}
                                            onChange={event => setDraft(current => ({ ...current, level: Number(event.target.value) }))}
                                            className="w-full font-normal outline-none"
                                        />
                                    </div>
                                </label>
                            </div>

                            {error && (
                                <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-[#fdeaea] px-4 py-3 text-sm font-bold text-[#d45e45]">
                                    <span aria-hidden="true">⚠️</span>
                                    <span>{error}</span>
                                </p>
                            )}

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingStudent(null)}
                                    className="rounded-full px-5 py-3 text-sm font-bold text-[#71867c] hover:bg-[#f7f7f5]"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-full bg-[#203b35] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#152722] disabled:opacity-60"
                                >
                                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </main>
    );
}