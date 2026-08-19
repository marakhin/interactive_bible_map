import type { BibleEvent, Chronology } from "./types";

export type TimeRange = { start: number; end: number };

export function formatBiblicalYear(year: number): string {
  if (year === 0) return "граница летоисчисления";
  return year < 0 ? `${Math.abs(year)} г. до Р. Х.` : `${year} г. по Р. Х.`;
}

export function nextBiblicalYear(year: number): number {
  return year === -1 ? 1 : year + 1;
}

export function previousBiblicalYear(year: number): number {
  return year === 1 ? -1 : year - 1;
}

export function chronologySortValue(chronology: Chronology): number {
  if (chronology.type === "relative") return Number.NEGATIVE_INFINITY;
  if (chronology.type === "unknown" || chronology.startYear === undefined) return Number.POSITIVE_INFINITY;
  return chronology.startYear;
}

export function sortEvents(events: BibleEvent[]): BibleEvent[] {
  return [...events].sort((a, b) => chronologySortValue(a.chronology) - chronologySortValue(b.chronology));
}

export function isEventActive(event: BibleEvent, start: number, end: number): boolean {
  const { chronology } = event;
  if (chronology.type === "relative" || chronology.type === "unknown" || chronology.startYear === undefined) return false;
  const eventEnd = chronology.endYear ?? chronology.startYear;
  return chronology.startYear <= end && eventEnd >= start;
}

export function getVisibleEvents(events: BibleEvent[], start: number, end: number): BibleEvent[] {
  return events.filter((event) => isEventActive(event, start, end));
}

export function getTimelineEvents(events: BibleEvent[]): BibleEvent[] {
  return events.filter((event) => event.chronology.startYear !== undefined);
}

export const eras = [
  { id: "all", title: "Вся история", start: -2200, end: 100 },
  { id: "patriarchs", title: "Патриархи", start: -2100, end: -1600 },
  { id: "exodus", title: "Исход и Ханаан", start: -1600, end: -1050 },
  { id: "kingdom", title: "Цари и пророки", start: -1050, end: -586 },
  { id: "exile", title: "Плен и возвращение", start: -586, end: -330 },
  { id: "gospel", title: "Евангелие", start: -10, end: 35 },
  { id: "church", title: "Апостольский век", start: 30, end: 100 },
] as const;

export function getTimelineTicks(start: number, end: number, count = 6): number[] {
  const step = (end - start) / Math.max(count - 1, 1);
  return Array.from({ length: count }, (_, i) => {
    const value = Math.round(start + step * i);
    return value === 0 ? 1 : value;
  });
}

export function getWindowForZoom(center: number, zoom: number): TimeRange {
  const widths = [2300, 1100, 500, 160, 40];
  const width = widths[Math.max(0, Math.min(widths.length - 1, zoom - 1))];
  const start = Math.round(center - width / 2);
  const end = Math.round(center + width / 2);
  return { start: start === 0 ? -1 : start, end: end === 0 ? 1 : end };
}

export function getTimelineZoomForSpan(span: number): number {
  return span <= 32 ? 5 : span <= 128 ? 4 : span <= 400 ? 3 : span <= 880 ? 2 : 1;
}

export function getTimelineFit(events: BibleEvent[]): { timeRange: TimeRange; timeWindow: TimeRange; zoom: number } | undefined {
  const datedEvents = events.filter((event) => event.chronology.startYear !== undefined);
  if (!datedEvents.length) return undefined;

  const earliest = Math.min(...datedEvents.map((event) => event.chronology.startYear!));
  const latest = Math.max(...datedEvents.map((event) => event.chronology.endYear ?? event.chronology.startYear!));
  const span = latest - earliest;
  const zoom = getTimelineZoomForSpan(span);
  const timeRange = earliest === latest
    ? { start: previousBiblicalYear(earliest), end: nextBiblicalYear(latest) }
    : { start: earliest, end: latest };
  return { timeRange, timeWindow: timeRange, zoom };
}
