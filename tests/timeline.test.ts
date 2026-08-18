import { describe, expect, it } from "vitest";
import { events } from "@/data/events";
import { storylines } from "@/data/storylines";
import { formatBiblicalYear, getTimelineEvents, getTimelineFit, getVisibleEvents, nextBiblicalYear, sortEvents } from "@/domain/timeline";
import { chronologyLabels, localizationLabels } from "@/domain/types";
import { validateDataset } from "@/data/repository";
import { bibleBookById, bibleBooks } from "@/data/books";

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
  it("позволяет изучать книгу Исход по связанным событиям и местам", () => {
    const exodus = bibleBookById.get("exodus")!;
    const exodusEvents = events.filter((event) => event.scriptureReferences.some((reference) => reference.bookId === "exodus"));
    expect(bibleBooks.some((book) => book.id === "exodus" && book.titleRu === "Исход")).toBe(true);
    expect(exodus.eventCount).toBe(exodusEvents.length);
    expect(exodus.placeCount).toBeGreaterThan(3);
    expect(exodusEvents.every((event) => event.locations.length > 0)).toBe(true);
  });
  it("показывает в Евангелии от Марка все события с параллельным местом", () => {
    const mark = bibleBookById.get("mark")!;
    const markEvents = events.filter((event) => event.scriptureReferences.some((reference) => reference.bookId === "mark"));
    expect(mark.titleRu).toBe("От Марка");
    expect(mark.eventCount).toBe(markEvents.length);
    expect(mark.eventCount).toBeGreaterThanOrEqual(14);
    expect(markEvents.map((event) => event.id)).toEqual(expect.arrayContaining([
      "baptism-christ",
      "transfiguration",
      "entry-jerusalem",
      "last-supper",
      "crucifixion",
      "resurrection",
      "ascension",
    ]));
    expect(getTimelineEvents(markEvents).map((event) => event.id)).toEqual(markEvents.map((event) => event.id));
    expect(getTimelineFit(markEvents)).toMatchObject({ zoom: 5 });
  });
  it("не добавляет на шкалу события из другой выбранной коллекции", () => {
    const abrahamEvents = events.filter((event) => event.storylineIds.includes("abraham"));
    const timelineEvents = getTimelineEvents(abrahamEvents);
    expect(timelineEvents).toHaveLength(abrahamEvents.length);
    expect(timelineEvents.every((event) => event.storylineIds.includes("abraham"))).toBe(true);
    const fit = getTimelineFit(timelineEvents)!;
    expect(timelineEvents.every((event) => event.chronology.startYear! >= fit.timeWindow.start && event.chronology.startYear! <= fit.timeWindow.end)).toBe(true);
  });
});
