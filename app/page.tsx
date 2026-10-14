// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAPI } from '../lib/hooks/useAPI';
import { resolveRoleHome } from '../lib/auth';

function Button({ children, className = '', ...props }) {
    return <button className={`rounded-full px-5 py-3 font-bold transition hover:-translate-y-0.5 hover:shadow-lg ${className}`} {...props}>{children}</button>;
}

export default function HomePage() {
    const { API } = useAPI();
    const { data: session, status } = useSession();
    const isAuthenticated = status === 'authenticated' && !!session?.user;
    const accountName = session?.user?.name || session?.user?.email || 'Tài khoản';
    const accountRole = (session?.user as { role?: string } | undefined)?.role || 'PARENT';
    const [topics, setTopics] = useState([]);
    const [toast, setToast] = useState('');
    const [partnerMessage, setPartnerMessage] = useState('');

    useEffect(() => {
        API.get("topics", false, false, true).then((nextTopics) => {
            if (!Array.isArray(nextTopics)) {
                return setToast("Chưa tải được nội dung.");
            }

            setTopics(nextTopics);
        });
    }, [API]);

    useEffect(() => {
        if (!toast) return;

        const timer = setTimeout(() => {
            setToast("");
        }, 2400);

        return () => clearTimeout(timer);
    }, [toast]);

    async function submitPartner(event) {
        event.preventDefault();

        setPartnerMessage("Đang gửi…");

        const values = Object.fromEntries(
            new FormData(event.currentTarget)
        );

        const result = await API.post(
            "partners",
            values,
            false,
            false
        );

        setPartnerMessage(result.message);

        if (result.success) {
            event.currentTarget.reset();
        }
    }

    return <div className="overflow-hidden">
        <header className="sticky top-0 z-20 border-b border-[#e4eee3] bg-[#fffdf8]/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
                <Link
                    href="#top"
                    className="flex items-center gap-2"
                >
                    <span className="text-4xl font-extrabold leading-none text-[#f47d52]">
                        e<span className="text-[#6eaa83]">c</span>o
                    </span>

                    <span className="border-l border-[#d9e5da] pl-2 text-xs font-black leading-3 tracking-widest">
                        KIDS
                        <br />
                        <small className="font-semibold tracking-normal">
                            English 3D
                        </small>
                    </span>
                </Link>

                <nav className="hidden gap-7 text-sm font-bold lg:flex">
                    <a href="#how">Cách học</a>
                    <a href="#topics">Chủ đề</a>
                    <a href="#parents">Phụ huynh</a>
                    <a href="#shop">Bộ học liệu</a>
                    <a href="#schools">Trường học</a>
                </nav>

                <div className="flex items-center gap-3">
                    <Link
                        href="/shop"
                        className="rounded-full border border-[#d9e5da] px-4 py-2 font-bold text-[#203b35] transition hover:bg-[#eef8ef]"
                    >
                        🛒 Cửa hàng
                    </Link>

                    <Link
                        href={isAuthenticated ? resolveRoleHome(accountRole) : '/login'}
                        className="hidden rounded-full bg-[#f47d52] px-4 py-2 font-bold text-white sm:block"
                    >
                        {isAuthenticated ? accountName : 'Login'}
                    </Link>
                </div>
            </div>
        </header>

        <main id="top">
            <section className="texture bg-[#eef8ef] px-5 pb-16 pt-14 lg:px-8 lg:pb-24 lg:pt-20">
                <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_.85fr]">
                    <div className="animate-rise">
                        <span className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-[#ef7d32] shadow-sm">
                            ✦ Dành cho bé 3–8 tuổi
                        </span>

                        <h1 className="mt-6 max-w-xl text-6xl font-extrabold leading-[.9] tracking-tight sm:text-8xl">
                            Chạm để học.
                            <br />
                            <em className="text-[#f47d52]">
                                Chơi để lớn.
                            </em>
                        </h1>

                        <p className="mt-7 max-w-xl text-lg leading-8 text-[#527067]">
                            Hệ sinh thái tiếng Anh đa giác quan kết hợp sách thật, mô hình 3D và
                            người bạn AI, giúp bé ghi nhớ tự nhiên mà không phụ thuộc màn hình.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link
                                href="/learn"
                                className="rounded-full bg-[#f47d52] px-6 py-4 font-bold text-white shadow-lg shadow-[#f47d52]/25"
                            >
                                Khám phá bài học <span>→</span>
                            </Link>

                            {/* <a
                                href="#how"
                                className="rounded-full border-2 border-[#203b35] px-6 py-4 font-bold"
                            >
                                ▶ Xem cách hoạt động
                            </a> */}
                        </div>

                        <div className="mt-8 flex items-center gap-5 text-sm">
                            <span className="text-2xl">
                                👧🏻 👦🏻 👧🏽
                            </span>

                            <span>
                                <b>1.200+ gia đình</b>
                                <br />
                                <span className="text-[#6c857c]">
                                    đã cùng bé khám phá
                                </span>
                            </span>

                            <span className="text-[#f5b83d]">
                                ★★★★★{" "}
                                <small className="text-[#203b35]">
                                    4.9/5
                                </small>
                            </span>
                        </div>
                    </div>
                    <div className="relative flex min-h-[390px] items-center justify-center">
                        <div className="relative flex items-center justify-center">
                            <div className="absolute inset-8 rounded-full bg-[#f7c6a6]/40 blur-3xl" />

                            <div className="animate-float relative w-[300px] sm:w-[390px] lg:w-[450px]">
                                <img
                                    src="/img/banner-logo.png"
                                    alt="Bé học tiếng Anh cùng ECO-KIDS"
                                    className="h-auto w-full object-contain drop-shadow-[0_25px_35px_rgba(32,59,53,0.15)]"
                                />
                            </div>
                        </div>

                        <div className="absolute right-0 top-6 rounded-2xl bg-white px-5 py-3 shadow-soft">
                            <b>🔊 FOX</b>
                            <br />
                            <small>/fɒks/</small>
                        </div>

                        <div className="absolute bottom-8 left-0 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft">
                            <span className="text-2xl">✨</span>

                            <span>
                                <b>Great job, Mia!</b>
                                <br />
                                <small>That sounds perfect!</small>
                            </span>
                        </div>
                    </div>
                </div>
            </section>
            <section className="grid grid-cols-2 gap-px bg-[#dceadd] sm:grid-cols-4">
                {[
                    ["👀", "70% trải nghiệm thật", "Sách & mô hình vật lý"],
                    ["✨", "30% công nghệ thông minh", "Web 3D & AI tương tác"],
                    ["🛡️", "An toàn cho đôi mắt", "Tự nhắc nghỉ sau 20 phút"],
                    ["🌱", "Vật liệu thân thiện", "Mô hình PLA an toàn"],
                ].map(([icon, title, copy]) => (
                    <div
                        key={title}
                        className="bg-white px-4 py-6 text-center sm:px-5"
                    >
                        <span className="text-2xl">{icon}</span>

                        <p className="mt-2 text-sm font-extrabold">
                            {title}
                        </p>

                        <small className="text-[#789087]">
                            {copy}
                        </small>
                    </div>
                ))}
            </section>

            <section
                id="how"
                className="mx-auto max-w-7xl px-5 py-20 lg:px-8"
            >
                <div className="mx-auto max-w-2xl text-center">
                    <span className="font-bold text-[#ef7d32]">
                        Một vòng học thật tự nhiên
                    </span>

                    <h2 className="mt-2 text-5xl font-extrabold">
                        4 bước nhỏ, một thế giới{" "} <br />
                        <em className="text-[#f47d52]">thật lớn</em>
                    </h2>

                    <p className="mt-4 text-[#6c857c]">
                        Không cần cài ứng dụng. Bé chỉ cần mở sách và bắt đầu khám phá.
                    </p>
                </div>

                <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        [
                            "01",
                            "📖",
                            "Mở sách",
                            "Chọn một người bạn hoặc chủ đề bé yêu thích.",
                            "bg-[#fff0e8]",
                        ],
                        [
                            "02",
                            "▣",
                            "Quét mã QR",
                            "Mở mô hình 3D ngay trên trình duyệt, không tải app.",
                            "bg-[#fff8d9]",
                        ],
                        [
                            "03",
                            "🦊",
                            "Chạm & xoay",
                            "Quan sát mọi góc độ, nghe từ mới và câu chuyện vui.",
                            "bg-[#e8f4fb]",
                        ],
                        [
                            "04",
                            "🎙️",
                            "Nói cùng AI",
                            "Lắng nghe, lặp lại và nhận lời động viên tức thì.",
                            "bg-[#eeeafb]",
                        ],
                    ].map(([number, icon, title, copy, color]) => (
                        <article
                            key={number}
                            className={`rounded-3xl ${color} p-6`}
                        >
                            <span className="text-sm font-black text-[#87958e]">
                                {number}
                            </span>

                            <div className="my-7 text-6xl">
                                {icon}
                            </div>

                            <h3 className="text-2xl font-extrabold">
                                {title}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-[#61766e]">
                                {copy}
                            </p>
                        </article>
                    ))}
                </div>
            </section>

            <section
                id="topics"
                className="bg-[#fff6e8] px-5 py-20 lg:px-8"
            >
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-wrap items-end justify-between gap-5">
                        <div>
                            <span className="font-bold text-[#ef7d32]">
                                Mỗi ngày một khám phá
                            </span>

                            <h2 className="mt-2 text-5xl font-extrabold">
                                Chủ đề bé sẽ{" "}
                                <em className="text-[#f47d52]">mê tít</em>
                            </h2>
                        </div>

                        <Link
                            href="/learn"
                            className="font-bold underline decoration-[#f47d52] decoration-2 underline-offset-4"
                        >
                            Xem tất cả bài học →
                        </Link>
                    </div>

                    <div className="mt-10 grid gap-5 md:grid-cols-3">
                        {topics.slice(0, 3).map((topic) => (
                            <Link
                                key={topic.id}
                                href={`/learn?topic=${topic.id}`}
                                className="group rounded-3xl bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                            >
                                <div
                                    className="flex h-40 items-center justify-center rounded-2xl text-7xl"
                                    style={{
                                        backgroundColor: `${topic.color}22`,
                                    }}
                                >
                                    {topic.icon}
                                </div>

                                <small className="mt-5 block font-bold text-[#8b9a91]">
                                    {topic.vietnamese}
                                </small>

                                <h3 className="text-2xl font-extrabold">
                                    {topic.title}
                                </h3>

                                <div className="mt-3 flex items-center justify-between text-sm text-[#6c857c]">
                                    <span>
                                        {topic.lessonCount} bài học ·{" "}
                                        {topic.words.length} từ mẫu
                                    </span>

                                    <span
                                        className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                                        style={{
                                            backgroundColor: topic.color,
                                        }}
                                    >
                                        →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section
                id="shop"
                className="mx-auto max-w-7xl px-5 py-20 lg:px-8"
            >
                <div className="mx-auto max-w-2xl text-center">
                    <span className="font-bold text-[#ef7d32]">
                        Cửa hàng học liệu
                    </span>

                    <h2 className="mt-2 text-5xl font-extrabold">
                        Khám phá học liệu{" "}
                        <em className="text-[#f47d52]">cho bé</em>
                    </h2>

                    <p className="mt-4 text-[#6c857c]">
                        Xem các mô hình học tập và combo phù hợp tại cửa hàng ECO-KIDS.
                    </p>

                    <Link
                        href="/shop"
                        className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f47d52] px-7 py-3 font-bold text-white shadow-lg shadow-[#f47d52]/20 transition hover:-translate-y-0.5 hover:bg-[#e36b40]"
                    >
                        Đến cửa hàng <span aria-hidden="true">→</span>
                    </Link>
                </div>
            </section>

            <section
                id="parents"
                className="bg-[#eaf5ed] px-5 py-20 lg:px-8"
            >
                <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
                    <div className="rounded-3xl bg-[#203b35] p-6 text-white shadow-soft">
                        <div className="rounded-2xl bg-[#f7fbf5] p-6 text-[#203b35]">
                            <small>Chào buổi tối, mẹ của Mây 👋</small>

                            <h3 className="mt-2 text-3xl font-extrabold">
                                Tuần này con đã tiến bộ!
                            </h3>

                            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                                {[
                                    ["24", "Từ đã học"],
                                    ["5", "Ngày liên tiếp"],
                                    ["92%", "Phát âm"],
                                ].map(([value, label]) => (
                                    <div
                                        key={label}
                                        className="rounded-xl bg-[#eaf5ed] p-3"
                                    >
                                        <b className="text-2xl">{value}</b>

                                        <small className="block text-xs">
                                            {label}
                                        </small>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex h-28 items-end justify-around gap-2">
                                {[38, 52, 44, 76, 60, 88, 70].map((height, i) => (
                                    <i
                                        key={i}
                                        className="w-full rounded-t-lg bg-[#6eaa83]"
                                        style={{ height: `${height}%` }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 text-center text-2xl">
                            🏆{" "}
                            <span className="text-sm">
                                Huy hiệu mới! Nhà thám hiểm động vật
                            </span>
                        </div>
                    </div>

                    <div>
                        <span className="font-bold text-[#ef7d32]">
                            Cùng con lớn lên mỗi ngày
                        </span>

                        <h2 className="mt-2 text-5xl font-extrabold">
                            Phụ huynh luôn{" "}
                            <em className="text-[#f47d52]">ở bên</em>, dù bận rộn
                        </h2>

                        <p className="mt-5 leading-7 text-[#61776e]">
                            Dashboard đơn giản giúp ba mẹ hiểu con đang học gì, tiến bộ ra
                            sao và khi nào cần một lời động viên.
                        </p>

                        <ul className="my-7 space-y-4">
                            {[
                                [
                                    "Báo cáo hàng tuần",
                                    "Từ vựng, thời gian học và độ chính xác phát âm.",
                                ],
                                [
                                    "Gợi ý hoạt động không màn hình",
                                    "Biến bài học thành trò chơi cùng cả gia đình.",
                                ],
                                [
                                    "Kiểm soát screen-time",
                                    "Tự động chuyển sang hoạt động vật lý sau 20 phút.",
                                ],
                            ].map(([title, copy]) => (
                                <li
                                    key={title}
                                    className="flex gap-3"
                                >
                                    <span className="font-black text-[#6eaa83]">
                                        ✓
                                    </span>

                                    <span>
                                        <b>{title}</b>

                                        <small className="block text-[#71867c]">
                                            {copy}
                                        </small>
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {/* <Link
                            href="/dashboard"
                            className="inline-block rounded-full bg-[#203b35] px-6 py-3 font-bold text-white"
                        >
                            Xem dashboard demo →
                        </Link> */}
                    </div>
                </div>
            </section>

            <section
                id="schools"
                className="
                grid
                gap-10
                bg-[#2d6358]
                px-5
                py-20
                text-white
                lg:grid-cols-2
                lg:items-stretch
                lg:px-[max(2rem,calc((100vw-80rem)/2))]
                "
            >
                <div className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
                    <span className="font-bold text-[#b7e0bd]">
                        Dành cho trường học & trung tâm
                    </span>

                    <h2 className="mt-3 text-5xl font-extrabold">
                        Biến mỗi tiết học thành một chuyến phiêu lưu
                    </h2>

                    <p className="mt-5 leading-7 text-[#d1e4d4]">
                        Giáo án mẫu, Web 3D trên màn hình lớp học, bộ giáo cụ và LMS theo
                        dõi toàn lớp.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
                        <span>✓ Đào tạo giáo viên</span>
                        <span>✓ LMS quản lý lớp</span>
                        <span>✓ Học liệu cập nhật</span>
                    </div>

                    <div
                        className=" mt-6 overflow-hidden rounded-3xl lg:relative lg:min-h-0 lg:flex-1"
                    >
                        <img
                            src="/img/schools.png"
                            alt="Trường học"
                            className=" block h-auto w-full lg:absolute lg:inset-0 lg:h-full lg:w-full lg:object-cover"
                        />
                    </div>
                </div>

                <form
                    onSubmit={submitPartner}
                    className=" h-max self-start rounded-3xl bg-white p-6 text-[#203b35] shadow-soft"
                >
                    <h3 className="text-3xl font-extrabold">
                        Đăng ký buổi tư vấn miễn phí
                    </h3>

                    <label className="mt-5 block text-sm font-bold">
                        Tên trường / trung tâm

                        <input
                            name="organization"
                            required
                            className="mt-1 w-full rounded-xl border border-[#dbe7dc] p-3"
                            placeholder="Mầm non Mặt Trời"
                        />
                    </label>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-bold">
                            Người liên hệ

                            <input
                                name="contactName"
                                required
                                className="mt-1 w-full rounded-xl border border-[#dbe7dc] p-3"
                            />
                        </label>

                        <label className="text-sm font-bold">
                            Số điện thoại

                            <input
                                name="phone"
                                required
                                className="mt-1 w-full rounded-xl border border-[#dbe7dc] p-3"
                            />
                        </label>
                    </div>

                    <label className="mt-3 block text-sm font-bold">
                        Email

                        <input
                            name="email"
                            type="email"
                            className="mt-1 w-full rounded-xl border border-[#dbe7dc] p-3"
                        />
                    </label>

                    <label className="mt-3 block text-sm font-bold">
                        Số học sinh dự kiến

                        <input
                            name="studentCount"
                            type="number"
                            min="1"
                            placeholder="Ví dụ: 120"
                            className="mt-1 w-full rounded-xl border border-[#dbe7dc] p-3"
                        />
                    </label>

                    <label className="mt-3 block text-sm font-bold">
                        Nhu cầu cần tư vấn

                        <textarea
                            name="note"
                            rows={3}
                            placeholder="Thời gian mong muốn, nhu cầu học liệu hoặc đào tạo giáo viên..."
                            className="mt-1 w-full rounded-xl border border-[#dbe7dc] p-3"
                        />
                    </label>

                    <Button
                        type="submit"
                        className="mt-5 w-full bg-[#f47d52] text-white"
                    >
                        Nhận tư vấn miễn phí →
                    </Button>

                    <p
                        className="mt-3 text-sm"
                        role="status"
                    >
                        {partnerMessage}
                    </p>
                </form>
            </section>
        </main>

        <footer className="bg-[#203b35] px-5 py-10 text-white lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_.8fr_1fr]">
                <div>
                    <div className="text-4xl font-extrabold text-[#f47d52]">
                        eco
                        <span className="text-[#b7e0bd]">kids</span>
                    </div>

                    <p className="mt-3 max-w-xs text-sm text-[#c2d7c5]">
                        Nuôi dưỡng tình yêu ngôn ngữ qua những trải nghiệm bé có thể
                        nhìn, nghe và chạm.
                    </p>
                </div>

                <div className="flex gap-8 text-sm">
                    <div>
                        <b>Khám phá</b>

                        <a
                            href="#how"
                            className="mt-3 block text-[#c2d7c5]"
                        >
                            Cách học
                        </a>

                        <a
                            href="#topics"
                            className="mt-2 block text-[#c2d7c5]"
                        >
                            Chủ đề
                        </a>
                    </div>

                    <div>
                        <b>Đồng hành</b>

                        <Link
                            href="/dashboard"
                            className="mt-3 block text-[#c2d7c5]"
                        >
                            Phụ huynh
                        </Link>

                        <a
                            href="#schools"
                            className="mt-2 block text-[#c2d7c5]"
                        >
                            Trường học
                        </a>
                    </div>
                </div>

                <div className="text-sm">
                    <b>Liên hệ với ECO-KIDS</b>

                    <div className="mt-3 space-y-2 text-[#c2d7c5]">
                        <a href="tel:0777278085" className="block transition hover:text-white">
                            Hotline: 0777 278 085
                        </a>
                        <a href="mailto:tungduongnguyenhuu11@gmail.com" className="block transition hover:text-white">
                            Email: tungduongnguyenhuu11@gmail.com
                        </a>
                        <p>TP. Hà Tĩnh, Việt Nam</p>
                    </div>
                </div>
            </div>

            <div className="mx-auto mt-8 max-w-7xl border-t border-white/15 pt-5 text-xs text-[#a8c3ac] text-center">
                © 2026 ECO-KIDS. Made with love for little explorers.
            </div>
        </footer>
        {toast && (
            <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#203b35] px-5 py-3 text-sm font-bold text-white shadow-lg">
                {toast}
            </div>
        )}
    </div>;
}