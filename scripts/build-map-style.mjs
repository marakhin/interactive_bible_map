import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Color } from "@versatiles/style";

const OUTPUT_PATH = resolve("public", "map", "openfreemap-ru.json");
const OPENFREEMAP_DOMAIN = "https://tiles.openfreemap.org";
const UPSTREAM_COMMIT = "72e1480dfc92858d334647037988bd2591fdb021";
const UPSTREAM_STYLE_URL = `https://raw.githubusercontent.com/hyperknot/openfreemap-styles/${UPSTREAM_COMMIT}/styles/liberty/style.json`;
const UPSTREAM_STYLE_SHA256 = "943938d11203cf6d4011ef161a19bedc214737a4b96a10c19d13fa000bba16f4";
const GENERATOR_VERSION = 2;
const LANGUAGE_FIELDS = ["name:ru", "name_ru", "name_en", "name:en", "name:latin", "name_int", "name"];
const RECOLOR = { saturate: -0.35, blend: 0.18, blendColor: "#fffdf7" };
const RUSSIAN_NAME_EXPRESSION = ["coalesce", ...LANGUAGE_FIELDS.map((field) => ["get", field])];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const GENERATOR_SIGNATURE = sha256(JSON.stringify({
  generatorVersion: GENERATOR_VERSION,
  upstreamCommit: UPSTREAM_COMMIT,
  upstreamSha256: UPSTREAM_STYLE_SHA256,
  languageFields: LANGUAGE_FIELDS,
  recolor: RECOLOR,
}));

function replaceDomain(value) {
  if (typeof value === "string") return value.replaceAll("https://__TILEJSON_DOMAIN__", OPENFREEMAP_DOMAIN);
  if (Array.isArray(value)) return value.map(replaceDomain);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, replaceDomain(entry)]));
}

function recolorValue(value) {
  if (Array.isArray(value)) return value.map(recolorValue);
  if (!value || typeof value !== "object") {
    if (typeof value !== "string" || !/^(?:#|rgba?\(|hsla?\()/i.test(value)) return value;
    return Color.parse(value)
      .saturate(RECOLOR.saturate)
      .blend(RECOLOR.blend, Color.parse(RECOLOR.blendColor))
      .asString();
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, recolorValue(entry)]));
}

function usesFeatureName(expression) {
  if (typeof expression === "string") return expression.includes("{name");
  if (!Array.isArray(expression)) return false;
  if ((expression[0] === "get" || expression[0] === "has") && typeof expression[1] === "string" && expression[1].startsWith("name")) return true;
  return expression.some((entry) => usesFeatureName(entry));
}

function createRussianStyle(upstreamStyle) {
  const style = replaceDomain(structuredClone(upstreamStyle));
  style.name = "openfreemap-liberty-ru-muted";
  style.metadata = {
    ...style.metadata,
    "biblical-map:generator-version": GENERATOR_VERSION,
    "biblical-map:generator-signature": GENERATOR_SIGNATURE,
    "biblical-map:upstream-commit": UPSTREAM_COMMIT,
    "biblical-map:language": "ru",
    "biblical-map:language-fallback": LANGUAGE_FIELDS.join(" → "),
    "biblical-map:recolor": RECOLOR,
  };

  for (const layer of style.layers) {
    if (layer.paint) layer.paint = recolorValue(layer.paint);
    const textField = layer.layout?.["text-field"];
    if (textField !== undefined && usesFeatureName(textField)) {
      layer.layout["text-field"] = structuredClone(RUSSIAN_NAME_EXPRESSION);
    }
  }

  return style;
}

function assertCurrentStyle(style) {
  const source = style?.sources?.openmaptiles;
  const localizedLayers = style.layers?.filter((layer) => JSON.stringify(layer.layout?.["text-field"]) === JSON.stringify(RUSSIAN_NAME_EXPRESSION)) ?? [];
  const sourceLayers = new Set(style.layers?.map((layer) => layer["source-layer"]).filter(Boolean));

  if (
    style.version !== 8
    || style.metadata?.["biblical-map:generator-signature"] !== GENERATOR_SIGNATURE
    || source?.url !== `${OPENFREEMAP_DOMAIN}/planet`
    || !style.glyphs?.startsWith(`${OPENFREEMAP_DOMAIN}/fonts/`)
    || !style.sprite?.startsWith(`${OPENFREEMAP_DOMAIN}/sprites/`)
    || localizedLayers.length < 20
    || !["transportation", "water", "place", "poi"].every((layer) => sourceLayers.has(layer))
  ) {
    throw new Error("Русский стиль карты устарел. Выполните npm run map:style.");
  }
}

if (process.argv.includes("--check")) {
  const current = JSON.parse(await readFile(OUTPUT_PATH, "utf8").catch(() => "null"));
  assertCurrentStyle(current);
  console.log("Русский стиль OpenFreeMap синхронизирован");
} else {
  const response = await fetch(UPSTREAM_STYLE_URL);
  if (!response.ok) throw new Error(`Не удалось загрузить закреплённый стиль OpenFreeMap: HTTP ${response.status}`);
  const upstreamText = await response.text();
  if (sha256(upstreamText) !== UPSTREAM_STYLE_SHA256) throw new Error("Контрольная сумма закреплённого стиля OpenFreeMap не совпала");
  const style = createRussianStyle(JSON.parse(upstreamText));
  assertCurrentStyle(style);
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(style, null, 2)}\n`, "utf8");
  console.log(`Русский стиль OpenFreeMap записан: ${OUTPUT_PATH}`);
}
