import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const isOpenFreeMapVectorTile = (url) => url.includes("tiles.openfreemap.org/planet/") && url.includes(".pbf");
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  let vectorTileResponses = 0;
  page.on("response", (response) => {
    if (response.ok() && isOpenFreeMapVectorTile(response.url())) vectorTileResponses += 1;
  });
  const targetUrl = process.env.MAP_CHECK_URL ?? "http://127.0.0.1:3100/?story=abraham&browser-check=openfreemap-map";
  if (targetUrl.startsWith("http://127.0.0.1:3100")) {
    await page.route("http://127.0.0.1:3100/assets/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const file = resolve("dist", "client", pathname.replace(/^\//, ""));
      const contentType = pathname.endsWith(".css") ? "text/css" : /\.m?js$/.test(pathname) ? "text/javascript" : "application/octet-stream";
      await route.fulfill({ status: 200, contentType, body: await readFile(file) });
    });
    await page.route("http://127.0.0.1:3100/map/openfreemap-ru.json", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: await readFile(resolve("dist", "client", "map", "openfreemap-ru.json")) });
    });
  }
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(() => localStorage.setItem("bible-map-onboarding", "seen"));
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('.maplibregl-canvas').waitFor({ state: "visible", timeout: 20_000 });
  await page.locator('[data-map-ready="true"]').waitFor({ state: "attached", timeout: 20_000 });
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
  const unexpectedMapIds = storyMapIds.filter((eventId) => !storyRailIds.includes(eventId));
  if (unexpectedMapIds.length) throw new Error(`Story map contains unrelated events: ${unexpectedMapIds.join(',')}`);
  const scriptureOnlyUnmappedIds = storyRailIds.filter((eventId) => !storyMapIds.includes(eventId));
  if (!scriptureOnlyUnmappedIds.includes('isaac-born') || !scriptureOnlyUnmappedIds.includes('offering-isaac')) {
    throw new Error(`Scripture-only unmapped events are incomplete: ${scriptureOnlyUnmappedIds.join(',')}`);
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
  if (labelMinZoom < 11) throw new Error(`Automatic labels still appear too early: zoom ${labelMinZoom}`);
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
  const overlappingAutomaticLabels = await page.locator('.bible-map-tooltip').evaluateAll((labels) => {
    const rectangles = labels
      .map((label) => label.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight);
    const overlaps = [];
    for (let left = 0; left < rectangles.length; left += 1) {
      for (let right = left + 1; right < rectangles.length; right += 1) {
        const a = rectangles[left];
        const b = rectangles[right];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([left, right]);
      }
    }
    return overlaps;
  });
  if (overlappingAutomaticLabels.length) throw new Error(`Automatic place labels overlap at zoom ${labelMinZoom}: ${JSON.stringify(overlappingAutomaticLabels)}`);
  await page.screenshot({ path: resolve('.label-density-check.png'), fullPage: false });
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
    language: document.querySelector("[data-basemap-language]")?.getAttribute("data-basemap-language"),
    canvasBox: document.querySelector(".maplibregl-canvas")?.getBoundingClientRect().toJSON(),
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

  if (result.engine !== "leaflet-maplibre-openfreemap") throw new Error(`Wrong map engine: ${result.engine}`);
  if (result.status !== "ready") throw new Error(`Basemap did not become ready: ${result.status}`);
  if (result.language !== "ru") throw new Error(`Wrong basemap language: ${result.language}`);
  if (vectorTileResponses < 1) throw new Error(`No successful OpenFreeMap vector responses: ${vectorTileResponses}`);
  if (!result.canvasBox || result.canvasBox.width < 500 || result.canvasBox.height < 300) throw new Error("The MapLibre canvas is not visibly sized");
  if (result.markers < 7) throw new Error(`Too few Scripture-grounded event markers: ${result.markers}`);
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
  const failurePage = await browser.newPage({ viewport: { width: 1200, height: 760 } });
  let blockVectorTiles = true;
  await failurePage.route("https://tiles.openfreemap.org/planet/**", (route) => {
    if (blockVectorTiles && isOpenFreeMapVectorTile(route.request().url())) return route.abort("failed");
    return route.continue();
  });
  if (targetUrl.startsWith("http://127.0.0.1:3100")) {
    await failurePage.route("http://127.0.0.1:3100/assets/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const file = resolve("dist", "client", pathname.replace(/^\//, ""));
      const contentType = pathname.endsWith(".css") ? "text/css" : /\.m?js$/.test(pathname) ? "text/javascript" : "application/octet-stream";
      await route.fulfill({ status: 200, contentType, body: await readFile(file) });
    });
    await failurePage.route("http://127.0.0.1:3100/map/openfreemap-ru.json", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: await readFile(resolve("dist", "client", "map", "openfreemap-ru.json")) });
    });
  }
  await failurePage.addInitScript(() => localStorage.setItem("bible-map-onboarding", "seen"));
  await failurePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await failurePage.locator('.map-basemap-error').waitFor({ state: "visible", timeout: 20_000 });
  const retryZoomBefore = await failurePage.locator('.map-stage').getAttribute('data-map-zoom');
  const retryMarkersBefore = await failurePage.locator('.bible-marker-dot').count();
  if (retryMarkersBefore < 1 || await failurePage.locator('.biblical-route-line').count() < 1) throw new Error("Biblical overlays disappeared with the failed basemap");
  blockVectorTiles = false;
  await failurePage.getByRole('button', { name: 'Повторить' }).click();
  await failurePage.locator('[data-map-ready="true"]').waitFor({ state: "attached", timeout: 20_000 });
  const retryStatus = await failurePage.locator('[data-basemap-status]').getAttribute('data-basemap-status');
  if (await failurePage.locator('.map-stage').getAttribute('data-map-zoom') !== retryZoomBefore) throw new Error("Retrying the basemap changed Leaflet zoom");
  if (await failurePage.locator('.bible-marker-dot').count() !== retryMarkersBefore) throw new Error("Retrying the basemap recreated biblical markers");
  await failurePage.close();

  const densityPage = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  if (targetUrl.startsWith("http://127.0.0.1:3100")) {
    await densityPage.route("http://127.0.0.1:3100/assets/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const file = resolve("dist", "client", pathname.replace(/^\//, ""));
      const contentType = pathname.endsWith(".css") ? "text/css" : /\.m?js$/.test(pathname) ? "text/javascript" : "application/octet-stream";
      await route.fulfill({ status: 200, contentType, body: await readFile(file) });
    });
    await densityPage.route("http://127.0.0.1:3100/map/openfreemap-ru.json", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: await readFile(resolve("dist", "client", "map", "openfreemap-ru.json")) });
    });
  }
  await densityPage.addInitScript(() => localStorage.setItem("bible-map-onboarding", "seen"));
  const densityUrl = new URL(targetUrl);
  densityUrl.search = "?view=all&browser-check=label-density";
  await densityPage.goto(densityUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await densityPage.locator('[data-map-ready="true"]').waitFor({ state: "attached", timeout: 20_000 });
  await densityPage.waitForTimeout(1200);
  await densityPage.locator('[data-location-id="jerusalem"]').dispatchEvent('click');
  await densityPage.locator('.event-sheet').waitFor({ state: "visible", timeout: 10_000 });
  await densityPage.waitForTimeout(600);
  const densityClickZoomBefore = Number(await densityPage.locator('.map-stage').getAttribute('data-map-zoom'));
  await densityPage.locator('.event-sheet .close-button[aria-label="Закрыть"]').click();
  await densityPage.locator('.event-sheet').waitFor({ state: "detached", timeout: 10_000 });
  const densityClickZoomAfter = Number(await densityPage.locator('.map-stage').getAttribute('data-map-zoom'));
  if (densityClickZoomAfter !== densityClickZoomBefore) throw new Error(`Clicking the dense-area point changed zoom: ${densityClickZoomBefore} -> ${densityClickZoomAfter}`);
  const densityMapStage = densityPage.locator('.map-stage');
  const densityLabelMinZoom = Number(await densityMapStage.getAttribute('data-label-min-zoom'));
  while (Number(await densityMapStage.getAttribute('data-map-zoom')) < densityLabelMinZoom - 1) {
    await densityPage.locator('.leaflet-control-zoom-in').click();
    await densityPage.waitForTimeout(250);
  }
  await densityPage.waitForTimeout(500);
  const labelsBeforeThreshold = await densityPage.locator('.bible-map-tooltip').evaluateAll((labels) => labels.filter((label) => {
    const rect = label.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
  }).length);
  if (labelsBeforeThreshold !== 0) throw new Error(`Dense-area labels are visible before zoom ${densityLabelMinZoom}: ${labelsBeforeThreshold}`);
  await densityPage.screenshot({ path: resolve('.label-threshold-check.png'), fullPage: false });
  await densityPage.locator('.leaflet-control-zoom-in').click();
  await densityPage.waitForTimeout(600);
  const densityOverlaps = await densityPage.locator('.bible-map-tooltip').evaluateAll((labels) => {
    const rectangles = labels
      .map((label) => label.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight);
    const overlaps = [];
    for (let left = 0; left < rectangles.length; left += 1) {
      for (let right = left + 1; right < rectangles.length; right += 1) {
        const a = rectangles[left];
        const b = rectangles[right];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([left, right]);
      }
    }
    return overlaps;
  });
  const densityLabels = await densityPage.locator('.bible-map-tooltip').evaluateAll((labels) => labels.filter((label) => {
    const rect = label.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
  }).length);
  if (densityLabels < 2) throw new Error(`Too few dense-area labels are visible at zoom ${densityLabelMinZoom}: ${densityLabels}`);
  if (densityOverlaps.length) throw new Error(`Dense-area labels overlap at zoom ${densityLabelMinZoom}: ${JSON.stringify(densityOverlaps)}`);
  await densityPage.screenshot({ path: resolve('.label-density-check.png'), fullPage: false });
  const densityResult = { densityLabelMinZoom, labelsBeforeThreshold, densityLabels, densityOverlaps, densityClickZoomBefore, densityClickZoomAfter };
  await densityPage.close();

  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  let mobileVectorTileResponses = 0;
  mobilePage.on("response", (response) => {
    if (response.ok() && isOpenFreeMapVectorTile(response.url())) mobileVectorTileResponses += 1;
  });
  if (targetUrl.startsWith("http://127.0.0.1:3100")) {
    await mobilePage.route("http://127.0.0.1:3100/assets/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const file = resolve("dist", "client", pathname.replace(/^\//, ""));
      const contentType = pathname.endsWith(".css") ? "text/css" : /\.m?js$/.test(pathname) ? "text/javascript" : "application/octet-stream";
      await route.fulfill({ status: 200, contentType, body: await readFile(file) });
    });
    await mobilePage.route("http://127.0.0.1:3100/map/openfreemap-ru.json", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: await readFile(resolve("dist", "client", "map", "openfreemap-ru.json")) });
    });
  }
  await mobilePage.addInitScript(() => localStorage.setItem("bible-map-onboarding", "seen"));
  await mobilePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await mobilePage.locator('.maplibregl-canvas').waitFor({ state: "visible", timeout: 20_000 });
  await mobilePage.locator('[data-map-ready="true"]').waitFor({ state: "attached", timeout: 20_000 });
  await mobilePage.waitForTimeout(1200);
  const mobileResult = await mobilePage.evaluate(() => ({
    status: document.querySelector("[data-basemap-status]")?.getAttribute("data-basemap-status"),
    language: document.querySelector("[data-basemap-language]")?.getAttribute("data-basemap-language"),
    canvasBox: document.querySelector(".maplibregl-canvas")?.getBoundingClientRect().toJSON(),
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (mobileResult.status !== "ready" || mobileResult.language !== "ru") throw new Error(`Mobile basemap is not ready in Russian: ${JSON.stringify(mobileResult)}`);
  if (mobileVectorTileResponses < 1) throw new Error(`No successful mobile OpenFreeMap vector responses: ${mobileVectorTileResponses}`);
  if (!mobileResult.canvasBox || mobileResult.canvasBox.width < 300 || mobileResult.canvasBox.height < 200) throw new Error("The mobile MapLibre canvas is not visibly sized");
  if (mobileResult.scrollWidth > mobileResult.viewportWidth) throw new Error(`The mobile basemap overflows the viewport: ${mobileResult.scrollWidth} > ${mobileResult.viewportWidth}`);
  await mobilePage.screenshot({ path: resolve(".map-mobile-check.png"), fullPage: false });
  await mobilePage.close();

  console.log(JSON.stringify({ ...result, vectorTileResponses, mobileVectorTileResponses, mobileResult, retryStatus, clickZoomBefore, clickZoomSamples, densityResult, storyEvents: storyRailIds.length, timelineEvents: storyTimelineIds.length, mappedEvents: storyMapIds.length, scriptureOnlyUnmappedIds, contextCards, browserErrors: errors }));
} finally {
  await browser.close();
}
