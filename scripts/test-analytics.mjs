import { chromium } from "playwright";

const SITE_URL = "https://lupinh.vercel.app";

const USERS = 30;

const WAIT_AFTER_LOAD = 15000;
const WAIT_BEFORE_CLOSE = 5000;

const isGACollect = (url) =>
  url.includes("google-analytics.com/g/collect") ||
  url.includes("analytics.google.com/g/collect");

const browser = await chromium.launch({ headless: false });

const results = [];

for (let i = 0; i < USERS; i++) {
  const userNumber = i + 1;

  const context = await browser.newContext({
    locale: "vi-VN",
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  let userGARequests = 0;
  let userGAResponses = 0;
  const gaRequests = [];

  page.on("request", (request) => {
    const url = request.url();
    if (!isGACollect(url)) return;

    userGARequests++;

    try {
      const parsed = new URL(url);
      gaRequests.push({
        cid: parsed.searchParams.get("cid"),
        sid: parsed.searchParams.get("sid"),
        dl: parsed.searchParams.get("dl"),
        en: parsed.searchParams.get("en"),
        fv: parsed.searchParams.get("_fv"),
        ss: parsed.searchParams.get("_ss"),
      });
    } catch {
      console.log("⚠️ Cannot parse GA request");
    }
  });

  page.on("response", (response) => {
    if (!isGACollect(response.url())) return;

    userGAResponses++;

    if (response.status() === 204) {
      console.log("✅ GA accepted request");
    } else {
      console.log(`⚠️ Unexpected GA response: ${response.status()}`);
    }
  });

  try {
    await page.goto(SITE_URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(WAIT_AFTER_LOAD);

    const cookies = await context.cookies();
    const gaCookies = cookies.filter(
      (c) => c.name === "_ga" || c.name.startsWith("_ga_")
    );

    if (gaCookies.length === 0) {
      console.log("❌ NO GA COOKIE");
    } else {
      for (const c of gaCookies) console.log(`${c.name} = ${c.value}`);
    }

    const browserInfo = await page.evaluate(() => ({
      href: window.location.href,
      title: document.title,
      hasGtag: typeof window.gtag === "function",
      dataLayerLength: Array.isArray(window.dataLayer)
        ? window.dataLayer.length
        : 0,
    }));

    console.log(`User ${userNumber}:`, browserInfo);

    const events = gaRequests.map((r) => r.en).filter(Boolean);

    await page.waitForTimeout(WAIT_BEFORE_CLOSE);

    results.push({
      user: userNumber,
      clientId: gaRequests.find((x) => x.cid)?.cid ?? null,
      sessionId: gaRequests.find((x) => x.sid)?.sid ?? null,
      gaRequests: userGARequests,
      gaResponses: userGAResponses,
      events: [...new Set(events)].join(", "),
      pageView: events.includes("page_view"),
      sessionStart:
        events.includes("session_start") || gaRequests.some((r) => r.ss === "1"),
      firstVisit:
        events.includes("first_visit") || gaRequests.some((r) => r.fv === "1"),
    });
  } catch (error) {
    console.log(`❌ USER ${userNumber} FAILED`);
    console.error(error.message);
    results.push({ user: userNumber, error: error.message });
  }

  await context.close();
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

await browser.close();

console.log("\n===== KẾT QUẢ =====");
console.table(results);
