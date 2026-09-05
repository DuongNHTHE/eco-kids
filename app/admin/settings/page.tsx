export default function AdminSettingsPage() {
    return (
        <main className="min-h-screen px-5 py-8 lg:px-10">
            <div className="mx-auto max-w-3xl">
                <p className="font-bold text-[#80938a]">Quản trị</p>
                <h1 className="mt-1 text-4xl font-extrabold">Cài đặt</h1>

                <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-2xl font-extrabold">Tuỳ chọn hệ thống</h2>
                    <label className="mt-6 flex items-center justify-between gap-4 border-b border-[#edf2ed] py-4">
                        <span>
                            <b className="block">Thông báo hoạt động</b>
                            <small className="text-[#80938a]">Nhận cập nhật về lớp học và báo cáo.</small>
                        </span>
                        <input type="checkbox" defaultChecked className="h-5 w-5 accent-[#2d6358]" />
                    </label>
                    <label className="flex items-center justify-between gap-4 py-4">
                        <span>
                            <b className="block">Ngôn ngữ</b>
                            <small className="text-[#80938a]">Ngôn ngữ hiển thị của khu vực quản trị.</small>
                        </span>
                        <select defaultValue="vi" className="rounded-xl border border-[#d9eadc] bg-white px-3 py-2 font-bold text-[#203b35]">
                            <option value="vi">Tiếng Việt</option>
                            <option value="en">English</option>
                        </select>
                    </label>
                </section>
            </div>
        </main>
    );
}