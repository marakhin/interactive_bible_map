import { describe, expect, it } from "vitest";
import rivers from "../data/biblical-rivers.json";

describe("biblical rivers layer", () => {
  it("contains both modern rivers explicitly named in Genesis 2:14", () => {
    expect(rivers.features.map((feature) => feature.properties.id).sort()).toEqual(["euphrates", "tigris"]);
    for (const feature of rivers.features) {
      expect(feature.properties.scripture).toBe("Быт. 2:14");
      expect(feature.geometry.type).toBe("LineString");
      expect(feature.geometry.coordinates.length).toBeGreaterThan(50);
      expect(feature.geometry.coordinates.every(([longitude, latitude]) =>
        longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90,
      )).toBe(true);
    }
  });
});
