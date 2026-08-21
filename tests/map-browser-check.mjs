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
  const storyMapIds = await page.locator('.bible-marker-dot').evaluateAll((markers) => [...new Set(markers.flatMap((marker) => (marker.getAttribute('data-event-ids') ?? '').split(' ').filter(Boolean)))].sort());
  if (JSON.stringify(storyRailIds) !== JSON.stringify(storyMapIds)) {
    throw new Error(`Story map is out of sync: rail=${storyRailIds.join(',')}; map=${storyMapIds.join(',')}`);
  }
  const clickZoomBefore = Number(await page.locator('.map-stage').getAttribute('data-map-zoom'));
  const visibleMarkerIndex = await page.locator('.bible-marker-dot').evaluateAll((markers) => markers.findIndex((marker) => {
    const rect = marker.getBoundingClientRect();
    return rect.top > 80 && rect.bottom < window.innerHeight - 140 && rect.left > 360 && rect.right < window.innerWidth - 30;
  }));
  if (visibleMarkerIndex < 0) throw new Error("No event point is available for the click zoom test");
  await page.evaluate(() => {
    const stage = document.querySelector('.map-stage');
    window.__bibleMapZoomSamples = [Number(stage?.getAttribute('data-map-zoom'))];
    window.__bibleMapZoomObserver = new MutationObserver(() => {
      window.__bibleMapZoomSamples.push(Number(stage?.getAttribute('data-map-zoom')));
    });
    if (stage) window.__bibleMapZoomObserver.observe(stage, { attributes: true, attributeFilter: ['data-map-zoom'] });
  });
  await page.locator('.bible-marker-dot').nth(visibleMarkerIndex).click();
  await page.locator('.event-sheet').waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(800);
  const clickZoomSamples = await page.evaluate(() => {
    window.__bibleMapZoomObserver?.disconnect();
    return window.__bibleMapZoomSamples ?? [];
  });
  if (clickZoomSamples.some((zoom) => zoom !== clickZoomBefore)) throw new Error(`Clicking a point changed zoom: ${clickZoomBefore} -> ${clickZoomSamples.join(',')}`);
  await page.locator('.event-sheet .close-button[aria-label="Закрыть"]').click();
  await page.locator('.event-sheet').waitFor({ state: "detached", timeout: 10_000 });
  await page.locator('.biblical-river-tigris').dispatchEvent('mouseover');
  await page.locator('.biblical-river-tooltip').waitFor({ state: "visible", timeout: 10_000 });
  const riverExplanation = await page.locator('.biblical-river-tooltip').textContent();
  if (!riverExplanation?.includes("Хиддекель") || !riverExplanation.includes("Быт. 2:14")) throw new Error("The Tigris explanation is missing");
  const mapStage = page.locator('.map-stage');
  const maxZoom = Number(await mapStage.getAttribute('data-map-max-zoom'));
  const labelMinZoom = Number(await mapStage.getAttribute('data-label-min-zoom'));
  if (maxZoom < 18) throw new Error(`The maximum map zoom is still too low: ${maxZoom}`);
  if (labelMinZoom < 9) throw new Error(`Automatic labels still appear too early: zoom ${labelMinZoom}`);
  const zoomTo = async (target) => {
    while (Number(await mapStage.getAttribute('data-map-zoom')) < target) {
      await page.locator('.leaflet-control-zoom-in').click();
      await page.waitForTimeout(320);
    }
  };
  await zoomTo(labelMinZoom - 1);
  await page.waitForTimeout(500);
  if (await page.locator('.bible-map-tooltip').count()) throw new Error(`Automatic labels are visible before zoom ${labelMinZoom}`);
  await page.locator('.event-rail > button').first().click();
  await page.locator('.event-sheet').waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(900);
  await page.locator('.event-sheet .close-button[aria-label="Закрыть"]').click();
  await page.locator('.event-sheet').waitFor({ state: "detached", timeout: 10_000 });
  await zoomTo(labelMinZoom);
  await page.waitForTimeout(500);
  const automaticLabels = await page.locator('.bible-map-tooltip').count();
  if (automaticLabels < 1) throw new Error(`Automatic place labels are missing at zoom ${labelMinZoom}`);
  await zoomTo(maxZoom);
  if (Number(await mapStage.getAttribute('data-map-zoom')) !== maxZoom) throw new Error(`The map did not reach zoom ${maxZoom}`);
  if (!(await page.locator('.leaflet-control-zoom-in').evaluate((button) => button.classList.contains('leaflet-disabled')))) throw new Error("The zoom control did not reach its configured maximum");
  await page.screenshot({ path: resolve(".max-zoom-check.png"), fullPage: false });
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
    zoom: Number(document.querySelector(".map-stage")?.getAttribute("data-map-zoom")),
    maxZoom: Number(document.querySelector(".map-stage")?.getAttribute("data-map-max-zoom")),
    labelMinZoom: Number(document.querySelector(".map-stage")?.getAttribute("data-label-min-zoom")),
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
  await page.getByRole('button', { name: 'Скрыть линии маршрута' }).click();
  if (await page.locator('.biblical-route-line').count()) throw new Error("The visible map control did not hide the route");
  if (await page.locator('.bible-marker-dot').count() !== result.markers) throw new Error("The visible route control also hid event points");
  await page.getByRole('button', { name: 'Показать линии маршрута' }).click();
  await page.locator('.biblical-route-line').waitFor({ state: "attached", timeout: 10_000 });
  await page.getByRole('button', { name: 'Фильтры' }).click();
  const filterPlacement = await page.evaluate(() => ({
    inHeader: Boolean(document.querySelector('.app-header [aria-label="Фильтры"]')),
    inMap: Boolean(document.querySelector('.map-stage .map-filter-trigger')),
    dropdown: Boolean(document.querySelector('.map-filter-dropdown')),
  }));
  if (filterPlacement.inHeader || !filterPlacement.inMap || !filterPlacement.dropdown) throw new Error(`The map filter dropdown is misplaced: ${JSON.stringify(filterPlacement)}`);
  await page.screenshot({ path: resolve(".filter-dropdown-check.png"), fullPage: false });
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
  await page.getByRole('button', { name: 'Готово' }).click();
  await page.screenshot({ path: resolve(".map-browser-check.png"), fullPage: false });
  console.log(JSON.stringify({ ...result, clickZoomBefore, clickZoomSamples, storyEvents: storyRailIds.length, timelineEvents: storyTimelineIds.length, mappedEvents: storyMapIds.length, contextCards, browserErrors: errors }));
} finally {
  await browser.close();
}
