import { describe, expect, it } from "vitest";
import { events } from "@/data/events";
import { locationById } from "@/data/locations";
import { getPrimaryEventLocation } from "@/domain/event-locations";
import { getSequentialRoutePoints } from "@/domain/map-route";

describe("маршруты выбранных книг и сюжетов", () => {
  it("соединяет основные точки Евангелия от Матфея в порядке событий", () => {
    const matthewEvents = events.filter((event) => event.scriptureReferences.some((reference) => reference.bookId === "matthew"));
    const route = getSequentialRoutePoints(matthewEvents, locationById);
    const expected = matthewEvents
      .map((event) => getPrimaryEventLocation(event, locationById)?.id)
      .filter((locationId): locationId is string => Boolean(locationId))
      .filter((locationId, index, all) => index === 0 || locationId !== all[index - 1]);

    expect(route.map((point) => point.locationId)).toEqual(expected);
    expect(route.map((point) => point.locationId)).toEqual(expect.arrayContaining(["jordan", "capernaum", "golgotha"]));
    expect(route.length).toBeGreaterThan(5);
  });

  it("не добавляет подряд повторяющиеся точки", () => {
    const repeated = [events.find((event) => event.id === "crucifixion")!, events.find((event) => event.id === "burial-christ")!, events.find((event) => event.id === "resurrection")!];
    const route = getSequentialRoutePoints(repeated, locationById);
    expect(route.map((point) => point.locationId)).toEqual(["golgotha", "holy-sepulchre"]);
  });
});
