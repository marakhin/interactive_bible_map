import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("bible-map-onboarding", "seen"));
  await page.goto("/");
});

test("путь Авраама открывает маршрут и событие", async ({ page }) => {
  await page.getByLabel("Открыть выбор сюжета").click().catch(() => undefined);
  await page.getByRole("button", { name: /Путь Авраама/ }).first().click();
  await expect(page.getByText("Путь Авраама", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /Призвание Аврама/ }).click();
  await expect(page.getByRole("heading", { name: "Призвание Аврама" })).toBeVisible();
});

test("поиск Иерусалима открывает режим места", async ({ page }) => {
  await page.getByLabel("Поиск").click().catch(async () => page.getByText(/Найти событие/).click());
  await page.getByLabel("Поисковый запрос").fill("Иерусалим");
  await page.getByRole("button", { name: /Иерусалим/ }).last().click();
  await expect(page.getByText("Что здесь произошло?")).toBeVisible();
});

test("фильтр Нового Завета меняет состояние URL", async ({ page }) => {
  await page.getByLabel("Фильтры").click();
  await page.getByRole("button", { name: "Новый" }).click();
  await page.getByRole("button", { name: "Показать на карте" }).click();
  await expect(page).toHaveURL(/testament=NT/);
});
