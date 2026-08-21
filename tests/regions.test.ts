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
      expect(region.sourceNoteRu.length, region.id).toBeGreaterThan(80);
      expect(region.sources.length, region.id).toBeGreaterThanOrEqual(2);
      expect(region.points.length, region.id).toBeGreaterThanOrEqual(8);
      for (const source of region.sources) {
        expect(source.titleRu.length, `${region.id}: название источника`).toBeGreaterThan(5);
        expect(source.roleRu.length, `${region.id}: роль источника`).toBeGreaterThan(10);
        expect(source.licenseRu.length, `${region.id}: лицензия источника`).toBeGreaterThan(3);
        expect(source.url, `${region.id}: адрес источника`).toMatch(/^https:\/\//);
      }
      for (const [latitude, longitude] of region.points) {
        expect(latitude, `${region.id}: широта`).toBeGreaterThanOrEqual(-90);
        expect(latitude, `${region.id}: широта`).toBeLessThanOrEqual(90);
        expect(longitude, `${region.id}: долгота`).toBeGreaterThanOrEqual(-180);
        expect(longitude, `${region.id}: долгота`).toBeLessThanOrEqual(180);
      }
    }
  });

  it("отдельно объясняет сложные редакционные решения о границах", () => {
    expect(biblicalRegionById.get("canaan")?.scripture).toContain("Чис. 34");
    expect(biblicalRegionById.get("egypt")?.sourceNoteRu).toContain("дельте и долине Нила");
    expect(biblicalRegionById.get("decapolis")?.sourceNoteRu).toContain("не было областью с одной устойчивой административной границей");
  });
});
