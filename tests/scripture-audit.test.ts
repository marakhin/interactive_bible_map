import { describe, expect, it } from "vitest";
import { characters } from "@/data/characters";
import { commonCanonMetadata, commonCanonOsis } from "@/data/common-canon";
import { eventById } from "@/data/events";
import { interfaceLocationById, interfaceLocations, locations } from "@/data/locations";

describe("аудит утверждений по прямому тексту Писания", () => {
  it("не назначает место, которого нет в указанном отрывке", () => {
    expect(eventById.get("isaac-born")?.locations).toEqual([]);
    expect(eventById.get("jeremiah-called")?.locations).toEqual([]);
  });

  it("не добавляет Ниневию к переселению Израиля и называет действующих царей разделения", () => {
    expect(eventById.get("samaria-falls")?.locations.map((place) => place.locationId)).toEqual(["samaria"]);
    expect(eventById.get("kingdom-divides")?.characters).toEqual(["rehoboam", "jeroboam"]);
    expect(characters.find((person) => person.id === "rehoboam")?.nameRu).toBe("Ровоам");
    expect(characters.find((person) => person.id === "jeroboam")?.nameRu).toBe("Иеровоам");
  });

  it("фиксирует единый 66-книжный корпус без повторов", () => {
    expect(commonCanonMetadata.books).toBe(66);
    expect(new Set(commonCanonOsis).size).toBe(66);
    expect(commonCanonOsis).toContain("Esth");
    expect(commonCanonOsis).toContain("Rev");
    expect(commonCanonOsis).not.toContain("Tob");
  });

  it("сохраняет сведения Предания в данных, но не отдаёт их интерфейсу", () => {
    expect(locations.some((place) => place.localizationType === "traditional")).toBe(true);
    expect(interfaceLocations.some((place) => place.localizationType === "traditional")).toBe(false);
    expect(interfaceLocations.some((place) => /традиц|церковн|православ/iu.test(place.localizationNoteRu ?? ""))).toBe(false);
    expect(interfaceLocationById.get("jordan")).toMatchObject({
      latitude: undefined,
      longitude: undefined,
      localizationType: "unknown",
      modernCountry: undefined,
    });
  });
});
