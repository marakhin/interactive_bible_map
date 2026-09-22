import { expect, test, type Page } from "@playwright/test";

async function openStudy(page: Page) {
  const menu = page.getByLabel("Открыть выбор сюжета");
  if (await menu.isVisible()) await menu.click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("bible-map-onboarding", "seen"));
  await page.goto("/");
  await expect(page.locator(".atlas-app")).toHaveAttribute("data-app-ready", "true");
});

test("навигатор целиком под шапкой и закрывается касанием карты", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "desktop");
  await openStudy(page);
  const panel = page.locator(".study-panel");
  await expect(panel).toBeVisible();
  await expect.poll(() => panel.evaluate((element) => Math.round(element.getBoundingClientRect().left))).toBe(0);
  const layout = await page.evaluate(() => ({
    panel: document.querySelector(".study-panel")!.getBoundingClientRect().toJSON(),
    header: document.querySelector(".app-header")!.getBoundingClientRect().toJSON(),
    heading: document.querySelector(".study-head h2")!.getBoundingClientRect().toJSON(),
    width: window.innerWidth, height: window.innerHeight,
  }));
  expect(layout.panel.top).toBeGreaterThanOrEqual(layout.header.bottom);
  expect(layout.heading.top).toBeGreaterThanOrEqual(layout.header.bottom);
  expect(layout.panel.bottom).toBeLessThanOrEqual(layout.height + 1);
  expect(layout.width - layout.panel.right).toBeGreaterThanOrEqual(55);
  if (testInfo.project.name === "mobile-safari") await page.screenshot({ path: ".navigation-drawer-check.png" });
  const originalUrl = page.url();
  await page.touchscreen.tap(layout.width - 20, layout.header.bottom + 180);
  await expect(panel).toBeHidden();
  expect(page.url()).toBe(originalUrl);
  await openStudy(page);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
});

test("другая книга выбирается без сброса текущего раздела", async ({ page }) => {
  await openStudy(page);
  await page.locator('[data-book-id="mark"]').click();
  await openStudy(page);
  await page.getByRole("button", { name: "Выбрать другую книгу или сюжет" }).click();
  await expect(page).toHaveURL(/book=mark/);
  await page.getByRole("button", { name: "Вернуться к текущему разделу" }).click();
  await expect(page.locator(".active-selection-title b")).toHaveText("От Марка");
  await page.getByRole("button", { name: "Выбрать другую книгу или сюжет" }).click();
  await page.locator('[data-book-id="luke"]').click();
  await expect(page).toHaveURL(/book=luke/);
  await openStudy(page);
  await expect(page.locator(".active-selection-title b")).toHaveText("От Луки");
});

test("конец сюжета Давида переходит в соседний сюжет и обратно", async ({ page }, testInfo) => {
  await openStudy(page);
  await page.getByRole("button", { name: /Самуил, Саул и Давид/ }).click();
  await openStudy(page);
  await page.locator('.event-rail [data-event-id="david-covenant"]').click();
  const nav = page.locator(".sheet-nav");
  const nextStory = nav.getByRole("button", { name: /Следующий сюжет Царство и храм/ });
  await expect(nextStory).toBeEnabled();
  await expect.poll(() => page.locator(".event-sheet").evaluate((element) => element.getBoundingClientRect().bottom - window.innerHeight)).toBeLessThanOrEqual(1);
  if (testInfo.project.name === "mobile-safari") await page.screenshot({ path: ".navigation-story-check.png", animations: "disabled" });
  await nextStory.click();
  await expect(page).toHaveURL(/story=kingdom/);
  await expect(page.locator(".event-sheet")).toBeVisible();
  await nav.getByRole("button", { name: /Предыдущий сюжет Самуил, Саул и Давид/ }).click();
  await expect(page).toHaveURL(/story=david/);
  await expect(page.locator(".event-sheet h2")).toHaveText("Обетование дому Давида");
});

test("конец книги открывает следующую книгу с синхронной картой", async ({ page }) => {
  await openStudy(page);
  await page.locator('[data-book-id="mark"]').click();
  await openStudy(page);
  await page.locator('.event-rail [data-event-id="ascension"]').click();
  const nav = page.locator(".sheet-nav");
  await nav.getByRole("button", { name: /Следующая книга/ }).click();
  await expect(page).not.toHaveURL(/book=mark/);
  await expect(page).toHaveURL(/book=/);
  await expect(page.locator(".event-sheet")).toBeVisible();
  await expect(page.locator(".bible-marker-dot.active").first()).toBeAttached();
  await nav.getByRole("button", { name: /Предыдущая книга От Марка/ }).click();
  await expect(page).toHaveURL(/book=mark/);
  await expect(page.locator(".event-sheet h2")).toHaveText("Вознесение Господне");
  await page.reload();
  await expect(page.locator(".event-sheet h2")).toHaveText("Вознесение Господне");
  await expect(page).toHaveURL(/book=mark/);
});
