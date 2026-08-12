import { describe, expect, it } from "vitest";
import { events } from "@/data/events";
import { storylines } from "@/data/storylines";
import { formatBiblicalYear, getVisibleEvents, nextBiblicalYear, sortEvents } from "@/domain/timeline";
import { chronologyLabels, localizationLabels } from "@/domain/types";
import { validateDataset } from "@/data/repository";

describe("библейская хронология", () => {
  it("форматирует годы до и по Рождестве Христовом", () => {
    expect(formatBiblicalYear(-586)).toBe("586 г. до Р. Х.");
    expect(formatBiblicalYear(33)).toBe("33 г. по Р. Х.");
  });
  it("переходит через отсутствие нулевого года", () => {
    expect(nextBiblicalYear(-1)).toBe(1);
    expect(formatBiblicalYear(0)).not.toContain("0 г.");
  });
  it("фильтрует окно времени и исключает relative", () => {
    const visible = getVisibleEvents(events, -600, -500);
    expect(visible.some((event) => event.id === "jerusalem-falls")).toBe(true);
    expect(visible.some((event) => event.id === "creation")).toBe(false);
  });
  it("сортирует относительные события первыми, неизвестные последними", () => {
    const sorted = sortEvents(events);
    expect(sorted[0].chronology.type).toBe("relative");
  });
  it("сохраняет порядок сюжетных линий", () => {
    const abraham = storylines.find((story) => story.id === "abraham")!;
    expect(abraham.eventIds.indexOf("abraham-call")).toBeLessThan(abraham.eventIds.indexOf("abraham-hebron"));
  });
  it("имеет понятные подписи неопределённости", () => {
    expect(chronologyLabels.disputed).toBe("Датировка спорна");
    expect(localizationLabels.traditional).toBe("Традиционная локализация");
  });
  it("валидирует все перекрёстные ссылки и минимум 60 событий", () => {
    const data = validateDataset();
    expect(data.events.length).toBeGreaterThanOrEqual(60);
  });
  it("каждое событие имеет ссылку на Писание", () => {
    expect(events.every((event) => event.scriptureReferences.length > 0)).toBe(true);
  });
});
