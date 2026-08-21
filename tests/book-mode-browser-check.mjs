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
  await page.locator(".active-selection-title b", { hasText: "От Марка" }).waitFor({ state: "visible", timeout: 10_000 });

  const markEvents = await page.locator(".event-rail > button").count();
  if (markEvents !== 24) throw new Error(`Expected 24 Mark events, found ${markEvents}`);
  await page.waitForFunction(() => document.querySelectorAll(".timeline-event").length === 24);
  const contextCards = await page.locator(".context-card").count();
  if (contextCards !== 0) throw new Error(`The removed map context card is still rendered: ${contextCards}`);
  const markRailIds = await page.locator(".event-rail > button").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("data-event-id")).sort());
  const markTimelineIds = await page.locator(".timeline-event").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("data-event-id")).sort());
  if (JSON.stringify(markRailIds) !== JSON.stringify(markTimelineIds)) {
    throw new Error(`Mark timeline is out of sync: rail=${markRailIds.join(",")}; timeline=${markTimelineIds.join(",")}`);
  }
  await page.waitForFunction(() => [...document.querySelectorAll(".bible-marker-dot")].some((marker) => marker.getAttribute("data-event-ids")));
  const markMapIds = await page.locator(".bible-marker-dot").evaluateAll((markers) => [...new Set(markers.flatMap((marker) => (marker.getAttribute("data-event-ids") ?? "").split(" ").filter(Boolean)))].sort());
  if (JSON.stringify(markRailIds) !== JSON.stringify(markMapIds)) {
    throw new Error(`Mark map is out of sync: rail=${markRailIds.join(",")}; map=${markMapIds.join(",")}`);
  }
  await page.locator('.biblical-route-line[data-route-kind="book"]').waitFor({ state: "attached", timeout: 10_000 });
  const bookRouteStyle = await page.locator('.biblical-route-line').evaluate((line) => ({
    strokeWidth: Number(line.getAttribute('stroke-width')),
    dashArray: line.getAttribute('stroke-dasharray'),
    box: line.getBoundingClientRect().toJSON(),
  }));
  if (bookRouteStyle.strokeWidth > 3 || bookRouteStyle.strokeWidth < 2) throw new Error(`The book route is not visually refined: ${bookRouteStyle.strokeWidth}px`);
  if (!bookRouteStyle.dashArray || bookRouteStyle.box.width < 20 || bookRouteStyle.box.height < 20) throw new Error("The book route is not visibly drawn across its points");
  if (await page.locator('.biblical-route-halo').count() !== 1) throw new Error("The route contrast halo is missing");
  await page.getByRole('button', { name: 'Скрыть линии маршрута' }).click();
  if (await page.locator('.biblical-route-line').count()) throw new Error("The book route remained visible after switching it off");
  await page.getByRole('button', { name: 'Показать линии маршрута' }).click();
  await page.locator('.biblical-route-line[data-route-kind="book"]').waitFor({ state: "attached", timeout: 10_000 });

  const locationChecks = [
    ["Крещение Господне", "Иордан", "jordan"],
    ["Служение в Капернауме", "Капернаум", "capernaum"],
    ["Распятие Господа Иисуса Христа", "Голгофа", "golgotha"],
  ];
  for (const [eventTitle, locationTitle, locationId] of locationChecks) {
    await page.locator(".event-rail > button").filter({ hasText: eventTitle }).click();
    await page.locator(".event-meta button", { hasText: locationTitle }).waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(`.bible-marker-dot.active[data-location-id="${locationId}"]`).waitFor({ state: "attached", timeout: 10_000 });
  }

  await page.locator(".event-rail > button").filter({ hasText: "Явление воскресшего Господа ученикам в Галилее" }).click();
  await page.locator(".event-meta button", { hasText: "Галилея" }).waitFor({ state: "visible", timeout: 10_000 });
  const galileeReferences = await page.locator(".synodal-heading b").textContent();
  if (!galileeReferences?.includes("Мф. 28:16–20") || !galileeReferences.includes("Мк. 16:7")) throw new Error(`The Galilee appearance references are incomplete: ${galileeReferences}`);
  await page.locator(".event-rail > button").filter({ hasText: "Воскресение Христово" }).click();
  await page.locator('[data-synodal-text="true"]').waitFor({ state: "visible", timeout: 10_000 });
  const references = await page.locator(".synodal-heading b").textContent();
  const passageHeadings = await page.locator(".synodal-text section h3").allTextContents();
  if (!["Мф. 28:1–10", "Мк. 16:1–11", "Лк. 24:1–12", "Ин. 20:1–18"].every((reference) => references?.includes(reference) && passageHeadings.includes(reference))) {
    throw new Error(`Parallel Gospel passages are incomplete: ${references}`);
  }

  const lukeUrl = new URL(page.url());
  lukeUrl.search = "?book=luke";
  await page.goto(lukeUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('[data-map-ready="true"]').waitFor({ state: "attached", timeout: 20_000 });
  await page.locator(".active-selection-title b", { hasText: "От Луки" }).waitFor({ state: "visible", timeout: 10_000 });
  const expectedLukeSequence = ["baptism-christ", "temptation-christ", "return-galilee", "nazareth-synagogue", "capernaum-ministry", "miraculous-catch", "luke-sermon-plain"];
  const lukeRailIds = await page.locator(".event-rail > button").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("data-event-id")));
  const lukeSequence = lukeRailIds.filter((eventId) => expectedLukeSequence.includes(eventId));
  if (JSON.stringify(lukeSequence) !== JSON.stringify(expectedLukeSequence)) {
    throw new Error(`Luke 3–6 sequence is incorrect: ${lukeSequence.join(",")}`);
  }
  const lukeTimelineIds = await page.locator(".timeline-event").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("data-event-id")));
  if (!expectedLukeSequence.every((eventId) => lukeTimelineIds.includes(eventId))) {
    throw new Error(`Luke timeline is incomplete: ${lukeTimelineIds.join(",")}`);
  }
  const lukeLocationChecks = [
    ["Искушение Господа в пустыне и Иерусалиме", "Иерусалим", "jerusalem", "Лк. 4:1–13"],
    ["Возвращение Господа в Галилею", "Галилея", "galilee", "Лк. 4:14–15"],
    ["Проповедь Господа в Назарете", "Назарет", "nazareth", "Лк. 4:16–30"],
    ["Служение в Капернауме", "Капернаум", "capernaum", "Лк. 4:31–44"],
    ["Чудесный улов и призвание учеников", "море Галилейское", "sea-galilee", "Лк. 5:1–11"],
    ["Избрание двенадцати и проповедь на ровном месте", "место проповеди по Лк. 6 не названо", "luke-sermon-area", "Лк. 6:12–49"],
  ];
  for (const [eventTitle, locationTitle, locationId, reference] of lukeLocationChecks) {
    await page.locator(".event-rail > button").filter({ hasText: eventTitle }).click();
    await page.locator(".event-meta button", { hasText: locationTitle }).waitFor({ state: "visible", timeout: 10_000 });
    await page.locator(`.bible-marker-dot.active[data-location-id="${locationId}"]`).waitFor({ state: "attached", timeout: 10_000 });
    const eventReferences = await page.locator(".synodal-heading b").textContent();
    if (!eventReferences?.includes(reference)) throw new Error(`${eventTitle} is missing ${reference}: ${eventReferences}`);
  }
  await page.locator('.biblical-route-line[data-route-kind="book"]').waitFor({ state: "attached", timeout: 10_000 });

  await page.getByRole("button", { name: "Фильтры" }).click();
  if (await page.locator('.app-header').getByRole('button', { name: 'Фильтры' }).count()) throw new Error("The filter control is still in the header");
  if (!(await page.locator('.map-stage').getByRole('button', { name: 'Фильтры' }).count())) throw new Error("The filter control is missing from the map");
  await page.locator('.map-filter-dropdown').waitFor({ state: "visible", timeout: 10_000 });
  const regionSwitch = page.locator("label.switch-row").filter({ hasText: "Области и земли Писания" }).locator('input[type="checkbox"]');
  if (await regionSwitch.isChecked()) throw new Error("The Scripture region layer unexpectedly starts enabled");
  await regionSwitch.check();
  await page.getByRole("button", { name: "Очистить" }).click();
  await page.locator(".region-selector-grid label").filter({ hasText: "Галилея" }).locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: "Готово" }).click();
  await page.locator('.biblical-region-boundary[data-region-id="galilee"]').waitFor({ state: "attached", timeout: 10_000 });
  let regionCount = await page.locator(".biblical-region-boundary").count();
  if (regionCount !== 1) throw new Error(`Expected only the selected Galilee region, found ${regionCount}`);
  if (await page.locator('.biblical-region-boundary[data-region-id="judea"]').count()) throw new Error("The unselected Judea boundary is still visible");
  await page.locator('.biblical-region-boundary[data-region-id="galilee"]').dispatchEvent("mouseover");
  const regionTooltip = page.locator(".biblical-region-tooltip");
  await regionTooltip.waitFor({ state: "visible", timeout: 10_000 });
  const regionTooltipText = await regionTooltip.textContent();
  if (!regionTooltipText?.includes("Лк. 4:14–15") || !regionTooltipText.includes("схематично")) {
    throw new Error(`The Galilee boundary warning is incomplete: ${regionTooltipText}`);
  }
  await page.getByRole("button", { name: "Фильтры" }).click();
  await page.getByRole("button", { name: "Все", exact: true }).click();
  await page.getByRole("button", { name: "Готово" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".biblical-region-boundary").length === 10);
  regionCount = await page.locator(".biblical-region-boundary").count();
  if (await page.locator('.biblical-region-boundary[data-region-id="judea"]').count() !== 1) throw new Error("The Judea boundary did not return after selecting all regions");
  await page.screenshot({ path: resolve(".luke-sermon-check.png"), fullPage: false });
  await page.getByRole("button", { name: "Закрыть" }).click();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const zoom = Number(await page.locator(".map-stage").getAttribute("data-map-zoom"));
    if (zoom >= 7) break;
    await page.locator(".leaflet-control-zoom-in").click();
    await page.waitForTimeout(300);
  }
  await page.locator(".historical-region-label", { hasText: "ГАЛИЛЕЯ" }).waitFor({ state: "visible", timeout: 10_000 });
  await page.locator(".historical-region-label", { hasText: "ИУДЕЯ" }).waitFor({ state: "visible", timeout: 10_000 });
  const galileeBoundaryStyle = await page.locator('.biblical-region-boundary[data-region-id="galilee"]').evaluate((element) => ({
    fillOpacity: Number(element.getAttribute("fill-opacity")),
    strokeWidth: Number(element.getAttribute("stroke-width")),
  }));
  if (galileeBoundaryStyle.fillOpacity < 0.16 || galileeBoundaryStyle.strokeWidth < 2) {
    throw new Error(`The region layer is still too faint: ${JSON.stringify(galileeBoundaryStyle)}`);
  }
  await page.locator('.historical-region-source-marker[data-region-source-id="galilee"] .historical-region-info').click();
  const sourcePopup = page.locator(".biblical-region-source-popup");
  await sourcePopup.waitFor({ state: "visible", timeout: 10_000 });
  const regionSourceText = await sourcePopup.textContent();
  if (!regionSourceText?.includes("Основа контура") || !regionSourceText.includes("Шеперд") || !regionSourceText.includes("Pleiades") || !regionSourceText.includes("схематично")) {
    throw new Error(`The Galilee source note is incomplete: ${regionSourceText}`);
  }
  const regionSourceUrls = await sourcePopup.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  if (!regionSourceUrls.some((url) => url?.includes("lib.utexas.edu")) || !regionSourceUrls.some((url) => url?.includes("loc.gov"))) {
    throw new Error(`The Galilee source links are incomplete: ${regionSourceUrls.join(",")}`);
  }
  await page.screenshot({ path: resolve(".regions-source-check.png"), fullPage: false });
  await sourcePopup.locator(".leaflet-popup-close-button").click();
  await page.screenshot({ path: resolve(".regions-layer-check.png"), fullPage: false });
  await page.getByRole("button", { name: "Фильтры" }).click();
  await regionSwitch.uncheck();
  await page.getByRole("button", { name: "Готово" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".biblical-region-boundary").length === 0);

  const matthewUrl = new URL(page.url());
  matthewUrl.search = "?book=matthew";
  await page.goto(matthewUrl.toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('[data-map-ready="true"]').waitFor({ state: "attached", timeout: 20_000 });
  await page.locator(".active-selection-title b", { hasText: "От Матфея" }).waitFor({ state: "visible", timeout: 10_000 });
  await page.locator('.biblical-route-line[data-route-kind="book"]').waitFor({ state: "attached", timeout: 10_000 });
  const matthewRouteBox = await page.locator('.biblical-route-line').evaluate((line) => line.getBoundingClientRect().toJSON());
  if (matthewRouteBox.width < 20 || matthewRouteBox.height < 20) throw new Error("The Matthew route is not visibly drawn");
  if ((await page.locator('.map-route-toggle').textContent())?.trim() !== "Линии: вкл") throw new Error("The Matthew route legend does not match the visible line");
  await page.screenshot({ path: resolve(".book-route-check.png"), fullPage: false });

  await page.getByRole("button", { name: "Показать все точки без фильтров" }).click();
  await page.locator(".all-points-study", { hasText: "Все точки Писания" }).waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(1000);
  const allMarkers = await page.locator(".bible-marker-dot").count();
  const routes = await page.locator(".biblical-route-line").count();
  if (allMarkers < 30) throw new Error(`All-points mode shows too few mapped places: ${allMarkers}`);
  if (routes !== 0) throw new Error("All-points mode unexpectedly shows a storyline route");
  if (!(await page.getByRole('button', { name: 'Для текущего режима маршрут недоступен' }).isDisabled())) throw new Error("The route legend incorrectly reports an active route in all-points mode");
  if (!page.url().includes("view=all")) throw new Error(`All-points mode is missing from URL: ${page.url()}`);
  const expectedPeople = [
    ["isaac", "Исаак"],
    ["jacob", "Иаков (Израиль)"],
    ["joseph", "Иосиф (сын Израиля)"],
    ["peter", "Апостол Пётр"],
  ];
  for (const [characterId, nameRu] of expectedPeople) {
    const personButton = page.locator(`.people-chips [data-character-id="${characterId}"]`);
    await personButton.waitFor({ state: "visible", timeout: 10_000 });
    if ((await personButton.textContent())?.trim() !== nameRu) throw new Error(`Missing Scripture person label: ${characterId}`);
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);

  console.log(JSON.stringify({ markEvents, markTimelineEvents: markTimelineIds.length, markMappedEvents: markMapIds.length, lukeEvents: lukeRailIds.length, lukeSequence, regionCount, regionTooltipText, regionSourceText, regionSourceUrls, galileeBoundaryStyle, bookRouteStyle, matthewRouteBox, contextCards, references, passageHeadings, galileeReferences, people: expectedPeople.map(([, nameRu]) => nameRu), allMarkers, routes, url: page.url(), browserErrors: errors }));
} finally {
  await browser.close();
}
