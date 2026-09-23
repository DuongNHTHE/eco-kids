'use client';

import { useEffect, useState } from 'react';
import { useAPI } from '../../../lib/hooks/useAPI';

type UserRecord = {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    createdAt: string;
};

const roleColors: Record<string, string> = {
    ADMIN: '#203b35',
    TEACHER: '#2d6358',
    SCHOOL_ADMIN: '#f47d52',
    PARENT: '#6eaa83',
};

const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));

export default function AdminUsersPage() {
    const { API } = useAPI();
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function loadUsers() {
        setLoading(true);
        const result = await API.get('admin/users', false, true, true);
        if (Array.isArray(result)) {
            setUsers(result);
            setError('');
        } else {
            setError(result?.message || 'Không thể tải danh sách người dùng.');
        }
        setLoading(false);
    }

    useEffect(() => {
        loadUsers();
    }, []);

    const filteredUsers = users.filter((user) => {
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const searchValue = search.trim().toLowerCase();
        const matchesSearch = !searchValue ||
            user.name.toLowerCase().includes(searchValue) ||
            user.email.toLowerCase().includes(searchValue) ||
            user.role.toLowerCase().includes(searchValue);

        return matchesRole && matchesSearch;
    });

    const roleOptions = ['all', 'ADMIN', 'TEACHER', 'SCHOOL_ADMIN', 'PARENT'];

    return (
        <main>
            <header className="border-b border-[#dceadd] bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 lg:px-10">
                    <div>
                        <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#80938a]">Quản trị</span>
                        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Danh sách người dùng</h1>
                    </div>

                    <button
                        type="button"
                        onClick={loadUsers}
                        className="rounded-full bg-[#203b35] px-5 py-3 text-sm font-bold text-white"
                    >
                        Làm mới
                    </button>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-5 pb-10 pt-8 lg:px-10">
                {error && (
                    <p className="mb-5 rounded-2xl bg-[#fff0e8] p-4 font-bold text-[#d45e45]">
                        {error}
                    </p>
                )}

                <div className="mb-6 flex flex-col gap-3 rounded bg-white p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#7a8f87]">
                            Tìm kiếm
                        </label>
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm theo tên, email hoặc vai trò..."
                            className="w-full rounded-2xl border border-[#dfe9e1] bg-[#f6faf7] px-4 py-3 text-sm text-[#234036] outline-none transition focus:border-[#6eaa83]"
                        />
                    </div>

                    <div className="lg:min-w-[220px]">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#7a8f87]">
                            Vai trò
                        </label>
                        <select
                            value={roleFilter}
                            onChange={(event) => setRoleFilter(event.target.value)}
                            className="w-full rounded-2xl border border-[#dfe9e1] bg-[#f6faf7] px-4 py-3 text-sm text-[#234036] outline-none transition focus:border-[#6eaa83]"
                        >
                            {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                    {role === 'all' ? 'Tất cả' : role}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="rounded bg-white p-10 text-center font-bold text-[#71867c]">
                        Đang tải danh sách người dùng...
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="rounded bg-white p-10 text-center text-[#71867c]">
                        Không tìm thấy người dùng phù hợp.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded border border-[#dfe9e1] bg-white shadow-soft">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead className="bg-[#f4faf4] text-[#557168]">
                                    <tr>
                                        <th className="px-5 py-4 text-sm font-bold">Người dùng</th>
                                        <th className="px-5 py-4 text-sm font-bold">Email</th>
                                        <th className="px-5 py-4 text-sm font-bold">Vai trò</th>
                                        <th className="px-5 py-4 text-sm font-bold">Ngày tạo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="border-t border-[#edf3ed]">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    {user.avatar ? (
                                                        <img
                                                            src={user.avatar}
                                                            alt={user.name}
                                                            className="h-11 w-11 rounded-full object-cover ring-2 ring-[#ecf3ee]"
                                                        />
                                                    ) : (
                                                        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#dfeee7] text-sm font-black text-[#203b35]">
                                                            {user.name.charAt(0).toUpperCase() || 'U'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-extrabold text-[#203b35]">{user.name}</div>
                                                        <div className="text-xs text-[#71867c]">ID: {user.id.slice(-8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-[#3d554d]">{user.email}</td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className="inline-flex rounded-full px-3 py-1 text-xs font-bold text-white"
                                                    style={{ backgroundColor: roleColors[user.role] || '#6eaa83' }}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-[#526a63]">{formatDate(user.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
