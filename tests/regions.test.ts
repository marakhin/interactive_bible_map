import { describe, expect, it } from "vitest";
import { biblicalRegionById, biblicalRegions } from "@/data/biblical-regions";

describe("учебный слой земель и областей Писания", () => {
  it("содержит основные прямо названные территории без повторяющихся идентификаторов", () => {
    expect(new Set(biblicalRegions.map((region) => region.id)).size).toBe(biblicalRegions.length);
    expect([...biblicalRegionById.keys()]).toEqual(expect.arrayContaining([
      "egypt",
      "canaan",
      "mesopotamia",
      "galilee",
      "samaria",
      "judea",
      "idumea",
      "decapolis",
      "transjordan",
      "moab",
    ]));
  });

  it("не выдаёт схематические контуры за точные исторические границы", () => {
    for (const region of biblicalRegions) {
      expect(region.scripture, region.id).toMatch(/\d/);
      expect(region.noteRu, region.id).toContain("схематично");
      expect(region.noteRu, region.id).toContain("не задаёт её географический контур");
      expect(region.points.length, region.id).toBeGreaterThanOrEqual(3);
      for (const [latitude, longitude] of region.points) {
        expect(latitude, `${region.id}: широта`).toBeGreaterThanOrEqual(-90);
        expect(latitude, `${region.id}: широта`).toBeLessThanOrEqual(90);
        expect(longitude, `${region.id}: долгота`).toBeGreaterThanOrEqual(-180);
        expect(longitude, `${region.id}: долгота`).toBeLessThanOrEqual(180);
      }
    }
  });
});
