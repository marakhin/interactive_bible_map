import { describe, expect, it } from "vitest";
import { bibleBooks } from "@/data/books";
import { eventById, events } from "@/data/events";
import { interfaceLocationById, locationById } from "@/data/locations";
import { storylines } from "@/data/storylines";
import { getPrimaryEventLocation, getSelectedEventLocation } from "@/domain/event-locations";
import { getTimelineEvents } from "@/domain/timeline";

const auditedPrimaryLocations: Record<string, string> = {
  "terah-leaves-ur": "ur",
  "abraham-call": "harran",
  "abraham-bethel": "bethel",
  "abraham-intercedes": "hebron",
  "offering-isaac": "moriah",
  "jacob-bethel-dream": "bethel",
  "joseph-sold": "dothan",
  "exodus-departure": "succoth-exodus",
  "jordan-crossing": "jordan-crossing",
  "saul-anointed": "ramah",
  "kingdom-divides": "shechem",
  "samaria-falls": "samaria",
  "jerusalem-falls": "jerusalem",
  "flight-egypt": "egypt",
  "baptism-christ": "jordan",
  "temptation-christ": "jerusalem",
  "return-galilee": "galilee",
  "nazareth-synagogue": "nazareth",
  "cana-wedding": "cana",
  "capernaum-ministry": "capernaum",
  "centurion-servant-healed": "capernaum",
  "miraculous-catch": "sea-galilee",
  "luke-sermon-plain": "luke-sermon-area",
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

  it("возвращает условный ориентир для явно выбранного события без публичной координаты", () => {
    const transfiguration = eventById.get("transfiguration")!;
    expect(getPrimaryEventLocation(transfiguration, interfaceLocationById)).toMatchObject({
      id: "mount-tabor",
      latitude: undefined,
      longitude: undefined,
      localizationType: "unknown",
    });
    expect(getSelectedEventLocation(transfiguration, interfaceLocationById, locationById)).toMatchObject({
      id: "mount-tabor",
      latitude: 32.687,
      longitude: 35.391,
      localizationType: "traditional",
    });
  });

  it("включает возвещённую у Марка встречу в Галилее без выдуманной точной горы", () => {
    const event = eventById.get("galilee-appearance")!;
    expect(event.scriptureReferences.map((reference) => reference.displayRu)).toEqual(["Мф. 28:16–20", "Мк. 16:7"]);
    expect(getPrimaryEventLocation(event, locationById)?.localizationType).toBe("unknown");
  });

  it("сохраняет географическую последовательность Ин. 6:16–71 и Ин. 8", () => {
    const expected = [
      ["john-walks-on-sea", "Ин. 6:16–21", "sea-galilee"],
      ["bread-of-life-capernaum", "Ин. 6:22–71", "capernaum"],
      ["woman-brought-to-christ", "Ин. 8:1–11", "jerusalem"],
      ["john-temple-teaching", "Ин. 8:12–59", "jerusalem"],
    ] as const;

    for (const [eventId, reference, mainLocationId] of expected) {
      const event = eventById.get(eventId)!;
      expect(event.scriptureReferences.map((item) => item.displayRu)).toEqual([reference]);
      expect(getPrimaryEventLocation(event, locationById)?.id).toBe(mainLocationId);
      expect(event.evidenceType).toBe("scripture_explicit");
    }

    expect(eventById.get("john-walks-on-sea")?.locations.map((item) => item.locationId)).toEqual(["sea-galilee", "capernaum"]);
    expect(eventById.get("woman-brought-to-christ")?.locations.map((item) => item.locationId)).toEqual(["mount-olives", "jerusalem"]);
  });

  it("сохраняет последовательность мест и честную неопределённость географии в Лк. 3–7", () => {
    const lukeEvents = events.filter((event) => event.scriptureReferences.some((reference) => reference.bookId === "luke"));
    const sequence = ["baptism-christ", "temptation-christ", "return-galilee", "nazareth-synagogue", "capernaum-ministry", "miraculous-catch", "luke-sermon-plain", "centurion-servant-healed", "nain-widow"];
    const positions = sequence.map((eventId) => lukeEvents.findIndex((event) => event.id === eventId));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(getPrimaryEventLocation(eventById.get("temptation-christ")!, locationById)?.id).toBe("jerusalem");
    expect(eventById.get("temptation-christ")?.locations.map((location) => location.locationId)).toEqual(["jordan", "judean-wilderness", "jerusalem"]);
    expect(getPrimaryEventLocation(eventById.get("return-galilee")!, locationById)?.id).toBe("galilee");
    expect(getPrimaryEventLocation(eventById.get("nazareth-synagogue")!, locationById)?.id).toBe("nazareth");
    expect(getPrimaryEventLocation(eventById.get("capernaum-ministry")!, locationById)?.id).toBe("capernaum");
    expect(getPrimaryEventLocation(eventById.get("miraculous-catch")!, locationById)?.id).toBe("sea-galilee");
    expect(getPrimaryEventLocation(eventById.get("centurion-servant-healed")!, locationById)?.id).toBe("capernaum");
    expect(getPrimaryEventLocation(eventById.get("nain-widow")!, locationById)?.id).toBe("nain");
    expect(locationById.get("judean-wilderness")?.localizationType).toBe("unknown");
    expect(getPrimaryEventLocation(eventById.get("luke-sermon-plain")!, locationById)).toMatchObject({
      id: "luke-sermon-area",
      localizationType: "unknown",
    });
    expect(locationById.get("luke-sermon-area")?.localizationNoteRu).toContain("не называет ни гору, ни область");
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
