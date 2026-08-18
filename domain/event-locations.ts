import type { BibleEvent, BibleLocation } from "./types";

export function getPrimaryEventLocation(event: BibleEvent, locations: Map<string, BibleLocation>): BibleLocation | undefined {
  const main = event.locations.find((item) => item.role === "main");
  if (main) return locations.get(main.locationId);

  const fallback = [...event.locations].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];
  return fallback ? locations.get(fallback.locationId) : undefined;
}
