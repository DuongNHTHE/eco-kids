import { chromium } from "playwright";
import "dotenv/config";

const SITE_URL = "https://lupinh.vercel.app";
const TARGET_URL = `${SITE_URL}/?utm_source=www.facebook.com&utm_medium=social&utm_campaign=test_facebook`;
const TEST_EMAIL = process.env.ANALYTICS_TEST_EMAIL;
const TEST_PASSWORD = process.env.ANALYTICS_TEST_PASSWORD;

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

if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error("Cần đặt ANALYTICS_TEST_EMAIL và ANALYTICS_TEST_PASSWORD để truy cập dashboard.");
    process.exit(1);
}

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
                measurementId: parsed.searchParams.get("tid"),
                event: parsed.searchParams.get("en"),
                sessionStart: parsed.searchParams.get("_ss"),
                pagePath: (() => {
                    const location = parsed.searchParams.get("dl");
                    return location ? new URL(location).pathname : null;
                })(),
            });
        } catch {
        }
    });

    return { context, page, requests };
};

const visit = async ({ page, requests }, path, label) => {
    const requestOffset = requests.length;
    const targetUrl = path === "/" ? TARGET_URL : `${SITE_URL}${path}`;
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(3000);
    const visitRequests = requests.slice(requestOffset);

    return {
        label,
        path,
        finalPath: new URL(page.url()).pathname,
        pageView: visitRequests.some((r) => r.event === "page_view" && r.pagePath === path),
        clientId: visitRequests.find((r) => r.cid)?.cid ?? null,
        sessionId: visitRequests.find((r) => r.sid)?.sid ?? null,
        events: [...new Set(visitRequests.map((r) => r.event).filter(Boolean))],
    };
};

const login = async (page) => {
    await page.goto(`${SITE_URL}/login`, { waitUntil: "networkidle", timeout: 60000 });
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await Promise.all([
        page.waitForURL((url) => url.pathname !== "/login", { timeout: 30000 }),
        page.locator('button[type="submit"]').click(),
    ]);
};

const runUser = async (index) => {
    const tag = `[User ${String(index).padStart(2, "0")}]`;
    const viewport = VIEWPORTS[index % VIEWPORTS.length];

    try {
        let ctx = await createVisitContext([], viewport);
        const first = await visit(ctx, "/", "First");

        const gaCookie = (await ctx.context.cookies(SITE_URL)).find(
            (c) => c.name === "_ga"
        );
        if (!gaCookie) throw new Error("Không tạo được cookie _ga");
        await ctx.context.close();

        await sleep(rand(1000, 5000));

        ctx = await createVisitContext([gaCookie], viewport);
        await login(ctx.page);
        const dashboard = await visit(ctx, "/dashboard", "Return dashboard");
        const learn = await visit(ctx, "/learn", "Return learn");
        const returnRequests = ctx.requests;
        const sessionStartRequest = returnRequests.find(
            (r) => r.event === "session_start" || r.sessionStart === "1"
        );
        const ret = {
            clientId: returnRequests.find((r) => r.cid)?.cid ?? null,
            sessionId: returnRequests.find((r) => r.sid)?.sid ?? null,
            sessionStart: Boolean(sessionStartRequest),
            sessionStartPath: sessionStartRequest?.pagePath ?? null,
        };
        await ctx.context.close();

        const errors = [];
        if (!first.clientId || first.clientId !== ret.clientId)
            errors.push("Client ID không được giữ lại");
        if (!first.sessionId || !ret.sessionId)
            errors.push(`Thiếu session ID (first: ${first.sessionId}, return: ${ret.sessionId})`);
        else if (first.sessionId === ret.sessionId)
            errors.push(`Session ID bị dùng lại: ${first.sessionId}`);
        if (!ret.sessionStart) errors.push("Lần quay lại không có session_start");
        for (const routeVisit of [dashboard, learn]) {
            if (routeVisit.finalPath !== routeVisit.path)
                errors.push(`${routeVisit.path} bị chuyển hướng tới ${routeVisit.finalPath}`);
            if (!routeVisit.pageView)
                errors.push(`Không ghi nhận page_view cho ${routeVisit.path}`);
        }

        const ok = errors.length === 0;
        console.log(`${tag} ${ok ? "PASS" : "FAIL"} cid=${first.clientId}`, {
            returnSession: {
                sessionId: ret.sessionId,
                sessionStart: ret.sessionStart,
                sessionStartPath: ret.sessionStartPath,
            },
            dashboard,
            learn,
            errors,
        });
        return { index, ok, errors, first, ret, dashboard, learn };
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
