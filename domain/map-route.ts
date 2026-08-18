import { getPrimaryEventLocation } from "./event-locations";
import type { BibleEvent, BibleLocation } from "./types";

export type SequentialRoutePoint = {
  eventId: string;
  locationId: string;
  latitude: number;
  longitude: number;
};

export function getSequentialRoutePoints(
  routeEvents: BibleEvent[],
  locations: Map<string, BibleLocation>,
): SequentialRoutePoint[] {
  const points: SequentialRoutePoint[] = [];

  for (const event of routeEvents) {
    const location = getPrimaryEventLocation(event, locations);
    if (!location || location.latitude === undefined || location.longitude === undefined) continue;

    const previous = points.at(-1);
    if (previous?.locationId === location.id) continue;
    points.push({
      eventId: event.id,
      locationId: location.id,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }

  return points;
}
