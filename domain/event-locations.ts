import type { BibleEvent, BibleLocation } from "./types";

export function getPrimaryEventLocation(event: BibleEvent, locations: Map<string, BibleLocation>): BibleLocation | undefined {
  const main = event.locations.find((item) => item.role === "main");
  if (main) return locations.get(main.locationId);

  const fallback = [...event.locations].sort((a, b) => (b.order ?? 0) - (a.order ?? 0))[0];
  return fallback ? locations.get(fallback.locationId) : undefined;
}

function hasCoordinates(location: BibleLocation | undefined): location is BibleLocation & { latitude: number; longitude: number } {
  return location?.latitude !== undefined && location.longitude !== undefined;
}

/**
 * Keeps collection maps on the public UI projection, but lets an explicitly
 * selected event use the source coordinate as a clearly marked orientation
 * point when that projection intentionally withholds it.
 */
export function getSelectedEventLocation(
  event: BibleEvent,
  interfaceLocations: Map<string, BibleLocation>,
  sourceLocations: Map<string, BibleLocation>,
): BibleLocation | undefined {
  const interfaceLocation = getPrimaryEventLocation(event, interfaceLocations);
  if (hasCoordinates(interfaceLocation)) return interfaceLocation;

  const sourceLocation = getPrimaryEventLocation(event, sourceLocations);
  return hasCoordinates(sourceLocation) ? sourceLocation : interfaceLocation;
}
