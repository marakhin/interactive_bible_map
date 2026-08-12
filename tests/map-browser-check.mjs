import { chromium } from "playwright";
import { resolve } from "node:path";

const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(() => localStorage.setItem("bible-map-onboarding", "seen"));
  await page.goto("http://127.0.0.1:3100/?browser-check=svg-map", { waitUntil: "networkidle", timeout: 60_000 });
  await page.locator('[data-map-ready="true"]').waitFor({ state: "attached", timeout: 20_000 });

  const result = await page.evaluate(() => ({
    engine: document.querySelector("[data-map-engine]")?.getAttribute("data-map-engine"),
    countries: document.querySelectorAll(".country-shapes path").length,
    markers: document.querySelectorAll(".biblical-marker").length,
    routes: document.querySelectorAll(".biblical-route polyline").length,
    loadingText: document.body.textContent?.includes("Загружаем карту") ?? false,
    mapBox: document.querySelector(".biblical-geography")?.getBoundingClientRect().toJSON(),
  }));

  if (result.engine !== "self-contained-svg") throw new Error(`Wrong map engine: ${result.engine}`);
  if (result.countries < 8) throw new Error(`Too few country shapes: ${result.countries}`);
  if (result.markers < 8) throw new Error(`Too few event markers: ${result.markers}`);
  if (result.loadingText) throw new Error("Loading indicator is still present");
  if (!result.mapBox || result.mapBox.width < 500 || result.mapBox.height < 300) throw new Error("Map is not visibly sized");
  await page.screenshot({ path: resolve(".map-browser-check.png"), fullPage: false });
  console.log(JSON.stringify({ ...result, browserErrors: errors }));
} finally {
  await browser.close();
}
