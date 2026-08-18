import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const targetUrl = process.env.MAP_CHECK_URL ?? "http://127.0.0.1:3100/?story=abraham&browser-check=osm-map";
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
  await page.locator('.leaflet-tile-loaded').first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(1800);
  const contextCards = await page.locator('.context-card').count();
  if (contextCards !== 0) throw new Error(`The removed map context card is still rendered: ${contextCards}`);
  const storyRailIds = await page.locator('.event-rail > button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-event-id')).sort());
  await page.waitForFunction((count) => document.querySelectorAll('.timeline-event').length === count, storyRailIds.length);
  const storyTimelineIds = await page.locator('.timeline-event').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-event-id')).sort());
  if (JSON.stringify(storyRailIds) !== JSON.stringify(storyTimelineIds)) {
    throw new Error(`Story timeline is out of sync: rail=${storyRailIds.join(',')}; timeline=${storyTimelineIds.join(',')}`);
  }
  await page.locator('.biblical-river-tigris').dispatchEvent('mouseover');
  await page.locator('.biblical-river-tooltip').waitFor({ state: "visible", timeout: 10_000 });
  const riverExplanation = await page.locator('.biblical-river-tooltip').textContent();
  if (!riverExplanation?.includes("Хиддекель") || !riverExplanation.includes("Быт. 2:14")) throw new Error("The Tigris explanation is missing");
  for (let zoom = 0; zoom < 2; zoom += 1) {
    await page.locator('.leaflet-control-zoom-in').click();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1000);
  const automaticLabels = await page.locator('.bible-map-tooltip').count();
  const visibleLabelIndex = await page.locator('.bible-map-tooltip').evaluateAll((labels) =>
    labels.findIndex((label) => {
      const rect = label.getBoundingClientRect();
      return rect.top > 90 && rect.bottom < window.innerHeight - 130 && rect.left > 300 && rect.right < window.innerWidth - 20;
    }),
  );
  if (visibleLabelIndex < 0) throw new Error("No automatic place label is safely visible in the map viewport");
  await page.locator('.bible-map-tooltip').nth(visibleLabelIndex).click();
  await page.locator('.event-sheet').waitFor({ state: "visible", timeout: 10_000 });
  await page.locator('[data-synodal-text="true"]').waitFor({ state: "visible", timeout: 10_000 });

  const result = await page.evaluate(() => ({
    engine: document.querySelector("[data-map-engine]")?.getAttribute("data-map-engine"),
    status: document.querySelector("[data-basemap-status]")?.getAttribute("data-basemap-status"),
    tiles: document.querySelectorAll(".leaflet-tile-loaded").length,
    markers: document.querySelectorAll(".bible-marker-dot").length,
    routes: document.querySelectorAll(".biblical-route-line").length,
    rivers: document.querySelectorAll(".biblical-river").length,
    riverLabels: document.querySelectorAll(".biblical-river-name").length,
    automaticLabels: document.querySelectorAll(".bible-map-tooltip").length,
    sheetOpen: Boolean(document.querySelector(".event-sheet")),
    synodalText: document.querySelector("[data-synodal-text]")?.textContent?.trim().slice(0, 120),
    basemapError: document.body.textContent?.includes("Подложка временно недоступна") ?? false,
    mapBox: document.querySelector(".real-map")?.getBoundingClientRect().toJSON(),
  }));

  if (result.engine !== "leaflet-openstreetmap") throw new Error(`Wrong map engine: ${result.engine}`);
  if (result.status !== "ready") throw new Error(`Basemap did not become ready: ${result.status}`);
  if (result.tiles < 4) throw new Error(`Too few loaded OSM tiles: ${result.tiles}`);
  if (result.markers < 8) throw new Error(`Too few event markers: ${result.markers}`);
  if (result.routes < 1) throw new Error("The Abraham route is missing");
  if (result.rivers !== 2 || result.riverLabels !== 2) throw new Error(`Biblical river layer is incomplete: ${result.rivers} lines, ${result.riverLabels} labels`);
  if (automaticLabels < 1 || result.automaticLabels < 1) throw new Error("Automatic place labels are missing after zooming in");
  if (!result.sheetOpen) throw new Error("Clicking a map point did not open the event sheet");
  if (!result.synodalText) throw new Error("The inline Synodal Scripture text is missing");
  if (result.basemapError) throw new Error("The basemap error is visible");
  if (!result.mapBox || result.mapBox.width < 500 || result.mapBox.height < 300) throw new Error("Map is not visibly sized");
  await page.getByRole('button', { name: 'Фильтры' }).click();
  const routeToggle = page.locator('.switch-row').filter({ hasText: 'Соединять точки маршрутом' }).locator('input');
  await routeToggle.uncheck();
  if (await page.locator('.biblical-route-line').count()) throw new Error("The route filter did not hide the route");
  if (await page.locator('.bible-marker-dot').count() !== result.markers) throw new Error("Hiding the route also hid event points");
  await routeToggle.check();
  await page.locator('.biblical-route-line').waitFor({ state: "attached", timeout: 10_000 });
  const riverToggle = page.locator('.switch-row').filter({ hasText: 'Реки, названные в Писании' }).locator('input');
  await riverToggle.uncheck();
  if (await page.locator('.biblical-river').count()) throw new Error("The biblical rivers filter did not hide the layer");
  await riverToggle.check();
  await page.locator('.biblical-river-tigris').waitFor({ state: "attached", timeout: 10_000 });
  await page.getByRole('button', { name: 'Показать на карте' }).click();
  await page.screenshot({ path: resolve(".map-browser-check.png"), fullPage: false });
  console.log(JSON.stringify({ ...result, storyEvents: storyRailIds.length, timelineEvents: storyTimelineIds.length, contextCards, browserErrors: errors }));
} finally {
  await browser.close();
}
