export type AnalyticsEvent = "event_opened" | "story_started" | "book_started" | "all_points_opened" | "timeline_changed" | "search_used" | "scripture_opened";

export function track(_event: AnalyticsEvent, _payload?: Record<string, string | number>) {
  // Точка расширения: в локальном MVP данные никуда не отправляются.
}
