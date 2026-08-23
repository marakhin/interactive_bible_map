import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("bible-map-onboarding", "seen"));
  await page.goto("/");
  await expect(page.locator(".atlas-app")).toHaveAttribute("data-app-ready", "true");
});

test("путь Авраама открывает маршрут и событие", async ({ page }) => {
  const studyMenu = page.getByLabel("Открыть выбор сюжета");
  if (await studyMenu.isVisible()) await studyMenu.click();
  await page.getByRole("button", { name: /Путь Авраама/ }).first().click();
  await expect(page.getByText("Путь Авраама", { exact: true }).first()).toBeVisible();
  const timeline = page.locator(".timeline");
  await expect(timeline).not.toHaveAttribute("data-range-start", "-2200");
  const fittedRange = await timeline.evaluate((element) => ({
    rangeStart: Number((element as HTMLElement).dataset.rangeStart),
    rangeEnd: Number((element as HTMLElement).dataset.rangeEnd),
    windowStart: Number((element as HTMLElement).dataset.windowStart),
    windowEnd: Number((element as HTMLElement).dataset.windowEnd),
  }));
  expect(fittedRange.rangeStart).toBe(fittedRange.windowStart);
  expect(fittedRange.rangeEnd).toBe(fittedRange.windowEnd);
  if (await studyMenu.isVisible()) await studyMenu.click();
  const eventButton = page.locator('.event-rail [data-event-id="abraham-call"]');
  await eventButton.scrollIntoViewIfNeeded();
  await eventButton.click();
  await expect(page.getByRole("heading", { name: "Призвание Аврама" })).toBeVisible();
});

test("поиск Иерусалима открывает режим места", async ({ page }) => {
  const mobileSearch = page.getByLabel("Поиск");
  if (await mobileSearch.isVisible()) await mobileSearch.click();
  else await page.getByText(/Найти событие/).click();
  await page.getByLabel("Поисковый запрос").fill("Иерусалим");
  const placeSection = page.locator(".search-results section").filter({ has: page.getByRole("heading", { name: "Места" }) });
  await placeSection.getByRole("button", { name: /^Иерусалим / }).click();
  await expect(page).toHaveURL(/place=jerusalem/);
  await expect(page.locator(".active-selection-title b")).toHaveText("Иерусалим");
});

test("фильтр Нового Завета меняет состояние URL", async ({ page }) => {
  await page.getByLabel("Фильтры").click();
  await page.getByRole("button", { name: "Новый" }).click();
  await page.getByRole("button", { name: "Готово" }).click();
  await expect(page).toHaveURL(/testament=NT/);
});

test("интерфейс ограничен Писанием без раздела Предания", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");

  await page.goto("/?event=baptism-christ");
  await expect(page.locator(".atlas-app")).toHaveAttribute("data-app-ready", "true");
  const sheet = page.locator(".event-sheet");
  await expect(sheet.getByRole("tab")).toHaveText(["Писание", "История", "География"]);
  await expect(sheet.getByRole("tab", { name: "Предание" })).toHaveCount(0);
  await sheet.getByRole("tab", { name: "География" }).click();
  await expect(sheet).not.toContainText(/Предан|традиц|православ|Аль-Махтас/iu);
  await expect(sheet.getByText("Точное место неизвестно")).toBeVisible();
  await sheet.getByLabel("Закрыть", { exact: true }).click();

  await page.getByRole("button", { name: "О проекте" }).click();
  const about = page.getByRole("dialog", { name: "О проекте и источниках" });
  await expect(about.getByText("Канон", { exact: true })).toBeVisible();
  await expect(about.getByText("Корпус ограничен 66 книгами, общими для православных, католиков и протестантов.")).toBeVisible();
  await expect(about.getByText("Предание", { exact: true })).toHaveCount(0);
});

test("книга ограничивает шкалу своими событиями, а диапазон меняется и перемещается", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.getByRole("button", { name: /От Марка/ }).click();

  const timeline = page.locator(".timeline");
  const startHandle = page.getByRole("slider", { name: "Начало временного диапазона" });
  const endHandle = page.getByRole("slider", { name: "Конец временного диапазона" });
  await expect(startHandle).toBeVisible();
  await expect(endHandle).toBeVisible();
  await expect(timeline).not.toHaveAttribute("data-range-start", "-2200");

  const fitted = await timeline.evaluate((element) => ({
    rangeStart: Number((element as HTMLElement).dataset.rangeStart),
    rangeEnd: Number((element as HTMLElement).dataset.rangeEnd),
    windowStart: Number((element as HTMLElement).dataset.windowStart),
    windowEnd: Number((element as HTMLElement).dataset.windowEnd),
  }));
  expect(fitted.rangeStart).toBe(fitted.windowStart);
  expect(fitted.rangeEnd).toBe(fitted.windowEnd);

  await startHandle.press("ArrowRight");
  const narrowed = {
    start: Number(await startHandle.getAttribute("aria-valuenow")),
    end: Number(await endHandle.getAttribute("aria-valuenow")),
  };
  expect(narrowed.start).toBeGreaterThan(fitted.rangeStart);
  expect(narrowed.end).toBe(fitted.rangeEnd);

  const selection = page.locator(".timeline-range-selection");
  const dragPoint = await selection.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const candidates = [0.5, 0.65, 0.35, 0.8, 0.2];
    const ratio = candidates.find((item) => document.elementFromPoint(rect.left + rect.width * item, rect.top + rect.height / 2) === element) ?? 0.5;
    return { x: rect.left + rect.width * ratio, y: rect.top + rect.height / 2 };
  });
  const trackBox = await page.locator(".timeline-track").boundingBox();
  const yearWidth = (trackBox?.width ?? 0) / Math.max(1, fitted.windowEnd - fitted.windowStart);
  await page.mouse.move(dragPoint.x, dragPoint.y);
  await page.mouse.down();
  await page.mouse.move(dragPoint.x - Math.max(8, yearWidth), dragPoint.y, { steps: 4 });
  await page.mouse.up();

  await expect(startHandle).toHaveAttribute("aria-valuenow", String(fitted.rangeStart));
  expect(Number(await endHandle.getAttribute("aria-valuenow"))).toBeLessThan(narrowed.end);
});

test("мобильный Safari сохраняет интерфейс внутри viewport", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile-safari"));

  const layout = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().toJSON();
    const tapTargets = [...document.querySelectorAll<HTMLElement>(".app-header .icon-button")].map((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      atlas: rect(".atlas-app"),
      header: rect(".app-header"),
      map: rect(".map-stage"),
      timeline: rect(".timeline"),
      tapTargets,
    };
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.atlas?.width).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.atlas?.height).toBeLessThanOrEqual(layout.viewport.height + 1);
  expect(layout.map?.height).toBeGreaterThan(150);
  expect(layout.timeline?.width).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.timeline?.height).toBeLessThanOrEqual(100);
  expect(layout.timeline?.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
  expect(layout.header?.top).toBeGreaterThanOrEqual(-1);
  expect(layout.tapTargets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  await expect(page.locator(".map-legend")).toBeHidden();
  await expect(page.locator(".leaflet-control-scale-line")).toBeVisible();
  await expect(page.locator(".timeline-topline")).toBeHidden();
  await expect(page.locator(".timeline-track-wrap")).toBeHidden();

  const eraScroller = page.locator(".era-chips");
  if (await eraScroller.isVisible()) {
    const eraBox = await eraScroller.boundingBox();
    const initialScroll = await eraScroller.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflowX: style.overflowX,
        touchAction: style.touchAction,
      };
    });
    expect(initialScroll.overflowX).toBe("scroll");
    expect(initialScroll.touchAction).toBe("pan-x");
    expect(eraBox?.width).toBeLessThanOrEqual(layout.viewport.width + 1);
    if (initialScroll.scrollWidth > initialScroll.clientWidth) {
      await eraScroller.evaluate((element) => { element.scrollLeft = 0; });
      await eraScroller.evaluate((element) => { element.scrollBy({ left: 220 }); });
      await expect.poll(() => eraScroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await eraScroller.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
      await expect.poll(() => eraScroller.evaluate((element) => Math.ceil(element.scrollLeft + element.clientWidth))).toBeGreaterThanOrEqual(initialScroll.scrollWidth);
    }
    const endPosition = await eraScroller.evaluate((element) => {
      const container = element.getBoundingClientRect();
      const lastChip = element.lastElementChild?.getBoundingClientRect();
      return { containerRight: container.right, lastChipRight: lastChip?.right ?? Number.POSITIVE_INFINITY };
    });
    expect(endPosition.lastChipRight).toBeLessThanOrEqual(endPosition.containerRight + 1);

    const selectedEra = eraScroller.getByRole("button", { name: "Исход и Ханаан" });
    await selectedEra.click();
    await expect(selectedEra).toHaveAttribute("aria-pressed", "true");
    const selectedEraStyle = await selectedEra.evaluate((element) => ({
      backgroundColor: getComputedStyle(element).backgroundColor,
      color: getComputedStyle(element).color,
    }));
    expect(selectedEraStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(selectedEraStyle.color).toBe("rgb(255, 255, 255)");
  }

  await page.getByLabel("Поиск").click();
  const searchLayout = await page.evaluate(() => {
    const panel = document.querySelector(".search-panel")?.getBoundingClientRect();
    const input = document.querySelector(".search-input input");
    return {
      top: panel?.top,
      right: panel?.right,
      bottom: panel?.bottom,
      left: panel?.left,
      fontSize: input ? Number.parseFloat(getComputedStyle(input).fontSize) : 0,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
  expect(searchLayout.top).toBeGreaterThanOrEqual(-1);
  expect(searchLayout.left).toBeGreaterThanOrEqual(-1);
  expect(searchLayout.right).toBeLessThanOrEqual(searchLayout.viewport.width + 1);
  expect(searchLayout.bottom).toBeLessThanOrEqual(searchLayout.viewport.height + 1);
  expect(searchLayout.fontSize).toBeGreaterThanOrEqual(16);
  const searchCoversMapFilter = await page.evaluate(() => {
    const trigger = document.querySelector<HTMLElement>(".map-filter-trigger");
    if (!trigger) return false;
    const box = trigger.getBoundingClientRect();
    return !document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest(".map-filter-trigger");
  });
  expect(searchCoversMapFilter).toBe(true);
  await page.getByLabel("Закрыть поиск").click();

  const filterTrigger = page.getByLabel("Фильтры");
  const filterTriggerBox = await filterTrigger.boundingBox();
  expect(filterTriggerBox?.width).toBe(44);
  expect(filterTriggerBox?.height).toBe(44);
  await expect(filterTrigger.locator("span")).toBeHidden();
  await filterTrigger.click();
  const filterDropdown = page.locator(".map-filter-dropdown");
  await expect(filterDropdown).toBeVisible();
  const filterLayout = await filterDropdown.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      left: box.left,
      overflowY: style.overflowY,
      overlayClass: element.parentElement?.className ?? "",
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
  expect(filterLayout.top).toBeGreaterThanOrEqual(-1);
  expect(filterLayout.left).toBeGreaterThanOrEqual(-1);
  expect(filterLayout.right).toBeLessThanOrEqual(filterLayout.viewport.width + 1);
  expect(filterLayout.bottom).toBeLessThanOrEqual(filterLayout.viewport.height + 1);
  expect(filterLayout.overflowY).toBe("scroll");
  expect(filterLayout.overlayClass).toContain("mobile-filter-overlay");

  const regionsSwitch = filterDropdown.locator(".switch-row").filter({ hasText: "Области и земли Писания" });
  await regionsSwitch.click();
  await expect(filterDropdown.locator(".region-selector")).toBeVisible();
  const expandedFilterLayout = await filterDropdown.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { bottom: box.bottom, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, viewportHeight: window.innerHeight };
  });
  expect(expandedFilterLayout.bottom).toBeLessThanOrEqual(expandedFilterLayout.viewportHeight + 1);
  expect(expandedFilterLayout.scrollHeight).toBeGreaterThan(expandedFilterLayout.clientHeight);
  await filterDropdown.evaluate((element) => { element.scrollTop = 0; element.scrollBy({ top: 220 }); });
  await expect.poll(() => filterDropdown.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const primaryAction = page.getByRole("button", { name: "Готово" });
  await primaryAction.scrollIntoViewIfNeeded();
  await expect(primaryAction).toBeVisible();
  const readyGeometry = await filterDropdown.evaluate((element) => {
    const panel = element.getBoundingClientRect();
    const button = element.querySelector<HTMLElement>(".filter-done")?.getBoundingClientRect();
    return { panelTop: panel.top, panelBottom: panel.bottom, buttonTop: button?.top ?? -1, buttonBottom: button?.bottom ?? Number.POSITIVE_INFINITY };
  });
  expect(readyGeometry.buttonTop).toBeGreaterThanOrEqual(readyGeometry.panelTop - 1);
  expect(readyGeometry.buttonBottom).toBeLessThanOrEqual(readyGeometry.panelBottom + 1);
  await primaryAction.click();
  await expect(filterDropdown).toBeHidden();

  await page.locator(".timeline-event").first().evaluate((button) => (button as HTMLButtonElement).click());
  const sheet = page.locator(".event-sheet");
  await expect(sheet).toBeVisible();
  const sheetBox = await sheet.boundingBox();
  const viewport = page.viewportSize();
  expect(sheetBox?.x).toBeGreaterThanOrEqual(-1);
  expect((sheetBox?.x ?? 0) + (sheetBox?.width ?? 0)).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
  expect((sheetBox?.y ?? 0) + (sheetBox?.height ?? 0)).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
});

test("мобильный навигатор книги скрывает фильтр под меню и переключает события", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile-safari"));

  const studyMenu = page.getByLabel("Открыть выбор сюжета");
  await studyMenu.click();
  await expect(page.locator(".study-panel")).toHaveClass(/open/);
  await expect(page.getByLabel("Фильтры")).toBeHidden();
  if (testInfo.project.name === "mobile-safari") await page.screenshot({ path: ".study-panel-filter-hidden-check.png", fullPage: false });

  const actsBook = page.locator('[data-book-id="acts"]');
  await actsBook.scrollIntoViewIfNeeded();
  await actsBook.click();

  const bookNavigation = page.getByRole("navigation", { name: "События выбранной книги" });
  await expect(bookNavigation).toBeVisible();
  await expect(page.locator(".era-chips")).toBeHidden();
  await expect(bookNavigation.locator(".mobile-book-event-current strong")).toHaveText("Вознесение Господне");
  await expect(bookNavigation.getByLabel("Предыдущее событие книги")).toBeDisabled();
  if (testInfo.project.name === "mobile-safari") {
    await page.waitForTimeout(350);
    await page.screenshot({ path: ".book-event-nav-check.png", fullPage: false });
  }

  await bookNavigation.getByLabel("Следующее событие книги").click();
  await expect(page.locator(".event-sheet")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Сошествие Святого Духа на апостолов" })).toBeVisible();
  await expect(bookNavigation.locator(".mobile-book-event-current strong")).toHaveText("Сошествие Святого Духа на апостолов");
  await expect(page).toHaveURL(/book=acts/);
});

test("мобильная карточка Самарии скрывается свайпом и оставляет точку выбранной", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile-safari"));

  const studyMenu = page.getByLabel("Открыть выбор сюжета");
  await studyMenu.click();
  const actsBook = page.locator('[data-book-id="acts"]');
  await actsBook.scrollIntoViewIfNeeded();
  await actsBook.click();
  await studyMenu.click();
  const samariaEvent = page.locator('.event-rail [data-event-id="gospel-samaria"]');
  await samariaEvent.scrollIntoViewIfNeeded();
  await samariaEvent.click();
  const sheet = page.locator(".event-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Благовестие в Самарии" })).toBeVisible();
  await expect(sheet).toHaveAttribute("data-sheet-expanded", "false");
  const compactHeaderHeight = await sheet.evaluate((element) => {
    const handle = element.querySelector<HTMLElement>(".sheet-handle")?.getBoundingClientRect();
    const meta = element.querySelector<HTMLElement>(".event-meta")?.getBoundingClientRect();
    return (meta?.bottom ?? 0) - (handle?.top ?? 0);
  });
  expect(compactHeaderHeight).toBeLessThanOrEqual(140);

  const map = page.locator(".map-stage");
  const zoomBeforeDismiss = await map.getAttribute("data-map-zoom");
  const handle = sheet.locator(".sheet-handle");
  await expect(handle).toHaveAccessibleName("Развернуть карточку");
  if (!testInfo.project.name.includes("landscape")) {
    const collapsedGeometry = await sheet.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      viewportHeight: window.innerHeight,
    }));
    expect(collapsedGeometry.height / collapsedGeometry.viewportHeight).toBeGreaterThanOrEqual(0.44);
    expect(collapsedGeometry.height / collapsedGeometry.viewportHeight).toBeLessThanOrEqual(0.58);
  }
  if (testInfo.project.name === "mobile-safari") {
    await page.waitForTimeout(350);
    await page.screenshot({ path: ".event-sheet-mobile-check.png", fullPage: false });
  }
  if (!testInfo.project.name.includes("landscape")) {
    await handle.click();
    await expect(sheet).toHaveAttribute("data-sheet-expanded", "true");
    await expect(handle).toHaveAccessibleName("Свернуть карточку");
    await expect.poll(() => sheet.evaluate((element) => element.getBoundingClientRect().height / window.innerHeight)).toBeGreaterThanOrEqual(0.7);
    if (testInfo.project.name === "mobile-safari") await page.screenshot({ path: ".event-sheet-expanded-check.png", fullPage: false });
  }
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  const pointerX = (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2;
  const pointerY = (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2;
  await handle.dispatchEvent("pointerdown", { pointerId: 17, pointerType: "touch", isPrimary: true, clientX: pointerX, clientY: pointerY });
  await handle.dispatchEvent("pointermove", { pointerId: 17, pointerType: "touch", isPrimary: true, clientX: pointerX, clientY: pointerY + 110 });
  await expect(sheet).toHaveAttribute("data-sheet-drag-offset", "110");
  await handle.dispatchEvent("pointerup", { pointerId: 17, pointerType: "touch", isPrimary: true, clientX: pointerX, clientY: pointerY + 110 });
  await expect(sheet).toBeHidden();
  await expect(map).toHaveAttribute("data-map-zoom", zoomBeforeDismiss ?? "");
  await expect(page.locator('[data-location-id="samaria"]')).toHaveClass(/active/);
  const selectedTooltip = page.getByRole("button", { name: "Открыть события места Самария" });
  await expect(selectedTooltip).toBeVisible();
  if (testInfo.project.name === "mobile-safari") await page.screenshot({ path: ".event-sheet-dismissed-check.png", fullPage: false });

  let currentZoom = Number(await map.getAttribute("data-map-zoom"));
  const labelMinZoom = Number(await map.getAttribute("data-label-min-zoom"));
  expect(labelMinZoom).toBeGreaterThanOrEqual(11);
  const zoomIn = page.locator(".leaflet-control-zoom-in");
  while (currentZoom < labelMinZoom) {
    await zoomIn.click();
    currentZoom += 1;
    await expect(map).toHaveAttribute("data-map-zoom", String(currentZoom));
  }

  await page.waitForTimeout(100);
  const overlappingLabels = await page.locator(".bible-map-tooltip").evaluateAll((labels) => {
    const rectangles = labels
      .map((label) => label.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight);
    const overlaps: Array<[number, number]> = [];
    for (let left = 0; left < rectangles.length; left += 1) {
      for (let right = left + 1; right < rectangles.length; right += 1) {
        const a = rectangles[left];
        const b = rectangles[right];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([left, right]);
      }
    }
    return overlaps;
  });
  expect(overlappingLabels).toEqual([]);

  const samariaTooltip = page.getByRole("button", { name: "Открыть события места Самария" });
  await expect(samariaTooltip).toBeAttached();
  const tooltipInteraction = await samariaTooltip.evaluate((element) => ({
    pointerEvents: getComputedStyle(element).pointerEvents,
    touchAction: getComputedStyle(element).touchAction,
    tabIndex: (element as HTMLElement).tabIndex,
  }));
  expect(tooltipInteraction).toEqual({ pointerEvents: "auto", touchAction: "manipulation", tabIndex: 0 });
  await samariaTooltip.dispatchEvent("pointerup", { pointerType: "touch" });
  await expect(sheet).toBeVisible();
});

test("на мобильном действует последний выбранный фильтр книги или эпохи", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-safari");

  const era = page.getByRole("button", { name: "Цари и пророки" });
  await era.scrollIntoViewIfNeeded();
  await era.click();
  await expect(era).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Открыть выбор сюжета").click();
  const luke = page.locator('[data-book-id="luke"]');
  await luke.scrollIntoViewIfNeeded();
  await luke.click();
  await expect(page).toHaveURL(/book=luke/);
  await expect(page.locator(".era-chips")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "События выбранной книги" })).toBeVisible();

  await page.getByLabel("Открыть выбор сюжета").click();
  await page.getByRole("button", { name: "Показать все точки без фильтров" }).click();
  await expect(era).toBeVisible();
  await era.scrollIntoViewIfNeeded();
  await era.click();
  await expect(era).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => new URL(page.url()).searchParams.has("book")).toBe(false);
  await expect(page.locator(".bible-marker-dot").first()).toBeAttached();
});

test("мобильное воспроизведение оставляет карту видимой", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-safari");

  const studyMenu = page.getByLabel("Открыть выбор сюжета");
  await studyMenu.click();
  await page.getByRole("button", { name: /Путь Авраама/ }).first().click();
  await studyMenu.click();
  await page.getByRole("button", { name: "История" }).click();

  const compactSheet = page.locator(".event-sheet.story-playing");
  await expect(compactSheet).toBeVisible({ timeout: 7_000 });
  await expect(compactSheet.locator(".story-playback-summary")).toBeVisible();
  await expect(compactSheet.locator(".sheet-tabs")).toBeHidden();
  await expect(page.locator(".map-stage")).toHaveAttribute("data-playback-motion", "fly");

  const geometry = await page.evaluate(() => {
    const sheet = document.querySelector(".event-sheet.story-playing")?.getBoundingClientRect();
    const timeline = document.querySelector(".timeline")?.getBoundingClientRect();
    return { sheetHeight: sheet?.height ?? Number.POSITIVE_INFINITY, sheetBottom: sheet?.bottom ?? Number.POSITIVE_INFINITY, timelineTop: timeline?.top ?? 0 };
  });
  expect(geometry.sheetHeight).toBeLessThanOrEqual(142);
  expect(geometry.sheetBottom).toBeLessThanOrEqual(geometry.timelineTop + 1);
});
