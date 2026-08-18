import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const targetUrl = process.env.BOOK_CHECK_URL ?? "http://127.0.0.1:3100/?book=mark";
  if (targetUrl.startsWith("http://127.0.0.1:3100")) {
    await page.route("http://127.0.0.1:3100/assets/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const file = resolve("dist", "client", pathname.replace(/^\//, ""));
      const contentType = pathname.endsWith(".css") ? "text/css" : pathname.endsWith(".js") ? "text/javascript" : "application/octet-stream";
      await route.fulfill({ status: 200, contentType, body: await readFile(file) });
    });
  }
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(() => localStorage.setItem("bible-map-onboarding", "seen"));
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('[data-map-ready="true"]').waitFor({ state: "attached", timeout: 20_000 });
  await page.getByRole("heading", { name: "От Марка" }).waitFor({ state: "visible", timeout: 10_000 });

  const markEvents = await page.locator(".event-rail > button").count();
  if (markEvents !== 14) throw new Error(`Expected 14 Mark events, found ${markEvents}`);
  await page.locator(".event-rail > button").filter({ hasText: "Воскресение Христово" }).click();
  await page.locator('[data-synodal-text="true"]').waitFor({ state: "visible", timeout: 10_000 });
  const references = await page.locator(".synodal-heading b").textContent();
  const passageHeadings = await page.locator(".synodal-text section h3").allTextContents();
  if (!["Мф. 28:1–10", "Мк. 16:1–11", "Лк. 24:1–12", "Ин. 20:1–18"].every((reference) => references?.includes(reference) && passageHeadings.includes(reference))) {
    throw new Error(`Parallel Gospel passages are incomplete: ${references}`);
  }

  await page.getByRole("button", { name: "Показать все точки без фильтров" }).click();
  await page.getByRole("heading", { name: "Все точки Писания" }).waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(1000);
  const allMarkers = await page.locator(".bible-marker-dot").count();
  const routes = await page.locator(".biblical-route-line").count();
  if (allMarkers < 30) throw new Error(`All-points mode shows too few mapped places: ${allMarkers}`);
  if (routes !== 0) throw new Error("All-points mode unexpectedly shows a storyline route");
  if (!page.url().includes("view=all")) throw new Error(`All-points mode is missing from URL: ${page.url()}`);
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);

  console.log(JSON.stringify({ markEvents, references, passageHeadings, allMarkers, routes, url: page.url(), browserErrors: errors }));
} finally {
  await browser.close();
}
