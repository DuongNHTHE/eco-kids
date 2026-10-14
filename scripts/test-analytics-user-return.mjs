import { chromium } from "playwright";

const SITE_URL = "https://lupinh.vercel.app";
const TARGET_URL = `${SITE_URL}/?utm_source=www.facebook.com&utm_medium=social&utm_campaign=test_facebook`;

const USER_COUNT = 30; // số người dùng giả lập
const CONCURRENCY = 5; // số người chạy song song
const WAIT_AFTER_LOAD = 15000;
const HEADLESS = true; // đổi thành false nếu muốn xem trình duyệt

const isGACollect = (url) =>
    url.includes("google-analytics.com/g/collect") ||
    url.includes("analytics.google.com/g/collect");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const VIEWPORTS = [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: HEADLESS });

const createVisitContext = async (cookies, viewport) => {
    const context = await browser.newContext({ locale: "vi-VN", viewport });
    if (cookies.length > 0) await context.addCookies(cookies);

    const page = await context.newPage();
    const requests = []; // mỗi lần visit có mảng request riêng

    page.on("request", (request) => {
        const url = request.url();
        if (!isGACollect(url)) return;
        try {
            const parsed = new URL(url);
            requests.push({
                cid: parsed.searchParams.get("cid"),
                sid: parsed.searchParams.get("sid"),
                event: parsed.searchParams.get("en"),
                sessionStart: parsed.searchParams.get("_ss"),
            });
        } catch {
        }
    });

    return { context, page, requests };
};

const visit = async ({ page, requests }, label) => {
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(WAIT_AFTER_LOAD);

    return {
        label,
        clientId: requests.find((r) => r.cid)?.cid ?? null,
        sessionId: requests.find((r) => r.sid)?.sid ?? null,
        sessionStart:
            requests.some((r) => r.event === "session_start") ||
            requests.some((r) => r.sessionStart === "1"),
        events: [...new Set(requests.map((r) => r.event).filter(Boolean))],
    };
};

const runUser = async (index) => {
    const tag = `[User ${String(index).padStart(2, "0")}]`;
    const viewport = VIEWPORTS[index % VIEWPORTS.length];

    try {
        let ctx = await createVisitContext([], viewport);
        const first = await visit(ctx, "First");

        const gaCookie = (await ctx.context.cookies(SITE_URL)).find(
            (c) => c.name === "_ga"
        );
        if (!gaCookie) throw new Error("Không tạo được cookie _ga");
        await ctx.context.close();

        await sleep(rand(1000, 5000));

        ctx = await createVisitContext([gaCookie], viewport);
        const ret = await visit(ctx, "Return");
        await ctx.context.close();

        const errors = [];
        if (!first.clientId || first.clientId !== ret.clientId)
            errors.push("Client ID không được giữ lại");
        if (!first.sessionId || !ret.sessionId)
            errors.push(`Thiếu session ID (first: ${first.sessionId}, return: ${ret.sessionId})`);
        else if (first.sessionId === ret.sessionId)
            errors.push(`Session ID bị dùng lại: ${first.sessionId}`);
        if (!ret.sessionStart) errors.push("Lần quay lại không có session_start");

        const ok = errors.length === 0;
        console.log(`${tag} ${ok ? "PASS" : "FAIL"} cid=${first.clientId}`, ok ? "" : errors);
        return { index, ok, errors, first, ret };
    } catch (error) {
        console.log(`${tag} ERROR: ${error.message}`);
        return { index, ok: false, errors: [error.message], first: null, ret: null };
    }
};

try {
    const results = [];
    let next = 1;

    const worker = async () => {
        while (next <= USER_COUNT) {
            const index = next++;
            results.push(await runUser(index));
            await sleep(rand(500, 2000));
        }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // Tổng kết
    const passed = results.filter((r) => r.ok).length;
    const uniqueClients = new Set(
        results.map((r) => r.first?.clientId).filter(Boolean)
    );

    console.log("\n========== TỔNG KẾT ==========");
    console.log(`Tổng số người dùng : ${USER_COUNT}`);
    console.log(`Đạt (PASS)         : ${passed}`);
    console.log(`Lỗi (FAIL)         : ${USER_COUNT - passed}`);
    console.log(`Client ID khác nhau: ${uniqueClients.size}/${USER_COUNT}`);

    const failed = results.filter((r) => !r.ok).sort((a, b) => a.index - b.index);
    for (const f of failed) {
        console.log(`  - User ${f.index}: ${f.errors.join("; ")}`);
    }

    if (failed.length > 0) process.exitCode = 1;
} finally {
    await browser.close();
}
