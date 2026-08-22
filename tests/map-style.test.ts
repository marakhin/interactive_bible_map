import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type StyleExpression = unknown[];
type StyleLayer = {
  id: string;
  "source-layer"?: string;
  layout?: { "text-field"?: unknown };
};

const style = JSON.parse(readFileSync(resolve("public", "map", "openfreemap-ru.json"), "utf8")) as {
  version: number;
  glyphs?: string;
  sprite?: string;
  metadata?: Record<string, unknown>;
  sources: Record<string, { type?: string; url?: string }>;
  layers: StyleLayer[];
};

function findLocalizedCoalesces(value: unknown, result: StyleExpression[] = []): StyleExpression[] {
  if (!Array.isArray(value)) return result;
  const serialized = JSON.stringify(value);
  if (value[0] === "coalesce" && serialized.includes('"name:ru"')) result.push(value);
  for (const entry of value) findLocalizedCoalesces(entry, result);
  return result;
}

describe("русский стиль OpenFreeMap", () => {
  it("использует публичный OpenMapTiles-источник и внешние ресурсы OpenFreeMap", () => {
    expect(style.version).toBe(8);
    expect(style.sources.openmaptiles).toEqual({ type: "vector", url: "https://tiles.openfreemap.org/planet" });
    expect(style.glyphs).toContain("tiles.openfreemap.org/fonts/");
    expect(style.sprite).toContain("tiles.openfreemap.org/sprites/");
    expect(style.metadata?.["biblical-map:language"]).toBe("ru");
    expect(style.metadata?.["biblical-map:recolor"]).toEqual({ saturate: -0.35, blend: 0.18, blendColor: "#fffdf7" });
  });

  it("ставит реальные русские поля перед английским, латиницей и местным именем", () => {
    const localized = style.layers.flatMap((layer) => findLocalizedCoalesces(layer.layout?.["text-field"]));
    expect(localized.length).toBeGreaterThanOrEqual(20);
    for (const expression of localized) {
      const nameFields = expression
        .filter((entry): entry is ["get", string] => Array.isArray(entry) && entry[0] === "get" && typeof entry[1] === "string")
        .map((entry) => entry[1]);
      expect(nameFields).toEqual(["name:ru", "name_ru", "name_en", "name:en", "name:latin", "name_int", "name"]);
    }
  });

  it("сохраняет подробные слои воды, дорог, мест и POI", () => {
    const sourceLayers = new Set(style.layers.map((layer) => layer["source-layer"]));
    for (const required of ["water", "transportation", "place", "poi"]) expect(sourceLayers.has(required)).toBe(true);
    expect(style.layers.some((layer) => layer.id.startsWith("poi_"))).toBe(true);
  });
});
