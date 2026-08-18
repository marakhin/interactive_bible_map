import { describe, expect, it } from "vitest";
import { bibleBooks } from "@/data/books";
import { eventById, events } from "@/data/events";
import { locationById } from "@/data/locations";
import { storylines } from "@/data/storylines";
import { getPrimaryEventLocation } from "@/domain/event-locations";
import { getTimelineEvents } from "@/domain/timeline";

const auditedPrimaryLocations: Record<string, string> = {
  "terah-leaves-ur": "ur",
  "abraham-call": "harran",
  "abraham-bethel": "bethel",
  "abraham-intercedes": "hebron",
  "offering-isaac": "moriah",
  "jacob-bethel-dream": "bethel",
  "joseph-sold": "dothan",
  "exodus-departure": "egypt",
  "jordan-crossing": "jordan-crossing",
  "saul-anointed": "ramah",
  "kingdom-divides": "shechem",
  "samaria-falls": "samaria",
  "jerusalem-falls": "jerusalem",
  "flight-egypt": "egypt",
  "baptism-christ": "jordan",
  "cana-wedding": "cana",
  "capernaum-ministry": "capernaum",
  "temple-teaching": "jerusalem",
  "gethsemane": "gethsemane",
  "crucifixion": "golgotha",
  "burial-christ": "holy-sepulchre",
  "resurrection": "holy-sepulchre",
  "galilee-appearance": "galilee-appearance",
  "apostolic-council": "jerusalem",
  "paul2-greece": "corinth",
  "paul3-miletus": "miletus",
};

describe("аудит географии событий", () => {
  it("назначает каждому событию с географией ровно одно основное место", () => {
    for (const event of events.filter((item) => item.locations.length)) {
      expect(event.locations.filter((location) => location.role === "main"), event.id).toHaveLength(1);
      expect(getPrimaryEventLocation(event, locationById), event.id).toBeDefined();
    }
  });

  it("сохраняет проверенные основные места сложных событий", () => {
    for (const [eventId, locationId] of Object.entries(auditedPrimaryLocations)) {
      expect(getPrimaryEventLocation(eventById.get(eventId)!, locationById)?.id, eventId).toBe(locationId);
    }
  });

  it("отделяет точный текст Писания от традиционной или неизвестной координаты", () => {
    expect(locationById.get("jordan")).toMatchObject({ localizationType: "traditional", latitude: 31.8372, longitude: 35.5528 });
    expect(locationById.get("capernaum")).toMatchObject({ localizationType: "identified", latitude: 32.881, longitude: 35.575 });
    expect(locationById.get("golgotha")).toMatchObject({ localizationType: "traditional", latitude: 31.77848, longitude: 35.2296 });
    expect(locationById.get("galilee-appearance")).toMatchObject({ localizationType: "unknown" });
  });

  it("включает возвещённую у Марка встречу в Галилее без выдуманной точной горы", () => {
    const event = eventById.get("galilee-appearance")!;
    expect(event.scriptureReferences.map((reference) => reference.displayRu)).toEqual(["Мф. 28:16–20", "Мк. 16:7"]);
    expect(getPrimaryEventLocation(event, locationById)?.localizationType).toBe("unknown");
  });

  it("для каждой книги и сюжетной линии использует один набор событий на карте и шкале", () => {
    for (const book of bibleBooks) {
      const bookEvents = events.filter((event) => event.scriptureReferences.some((reference) => reference.bookId === book.id));
      const mapEvents = bookEvents.filter((event) => {
        const location = getPrimaryEventLocation(event, locationById);
        return location?.latitude !== undefined && location.longitude !== undefined;
      });
      const timelineEvents = getTimelineEvents(bookEvents);
      expect(new Set(mapEvents.map((event) => event.id)).size, `${book.id}: карта`).toBe(mapEvents.length);
      expect(new Set(timelineEvents.map((event) => event.id)).size, `${book.id}: шкала`).toBe(timelineEvents.length);
      expect(mapEvents.every((event) => bookEvents.includes(event)), `${book.id}: карта содержит чужое событие`).toBe(true);
      expect(timelineEvents.every((event) => bookEvents.includes(event)), `${book.id}: шкала содержит чужое событие`).toBe(true);
    }
    for (const storyline of storylines) {
      const storyEvents = events.filter((event) => event.storylineIds.includes(storyline.id));
      const mapEvents = storyEvents.filter((event) => {
        const location = getPrimaryEventLocation(event, locationById);
        return location?.latitude !== undefined && location.longitude !== undefined;
      });
      const timelineEvents = getTimelineEvents(storyEvents);
      expect(mapEvents.every((event) => storyEvents.includes(event)), `${storyline.id}: карта содержит чужое событие`).toBe(true);
      expect(timelineEvents.every((event) => storyEvents.includes(event)), `${storyline.id}: шкала содержит чужое событие`).toBe(true);
    }
  });
});
