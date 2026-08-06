import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
const errors = [];
const failed = [];
page.on("console", (msg) => logs.push(msg.text()));
page.on("pageerror", (err) => errors.push(String(err)));
page.on("requestfailed", (req) => failed.push({ url: req.url(), err: req.failure()?.errorText }));
page.on("response", (res) => {
  if (res.status() >= 400) failed.push({ url: res.url(), status: res.status() });
});

await page.goto("http://127.0.0.1:5500/lifeos/", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

const result = await page.evaluate(() => ({
  hero: !!document.querySelector("#heroVideo"),
  appReady: document.getElementById("app")?.classList.contains("ready"),
  preloaderHidden: document.getElementById("preloader")?.classList.contains("is-hidden"),
  bootStarted: window.__LIFEOS_BOOT_STARTED__,
  bootComplete: window.__LIFEOS_BOOT_COMPLETE__,
  bootRenderActive: window.__bootRenderActive,
  appHtmlLen: document.getElementById("app")?.innerHTML?.length || 0,
  videoSrc: document.querySelector("#heroVideo source")?.getAttribute("src") || null
}));

const bootLog = logs.find((l) => l.includes("[LIFEOS BOOT]"));
console.log(JSON.stringify({ ...result, bootLog, errors, failed, consoleLogs: logs }, null, 2));
await browser.close();
