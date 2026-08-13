import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const manifest = JSON.parse(await readFile(resolve("dist", "client", ".vite", "manifest.json"), "utf8"));
const clientEntries = Object.values(manifest).filter((entry) => entry.isEntry).map((entry) => entry.file);
if (clientEntries.length === 0) throw new Error("No client entry was emitted");

const assetFiles = await readdir(resolve("dist", "client", "assets"));
const appBundle = manifest["components/BibleAtlasApp.tsx"]?.file?.replace(/^assets\//, "");
if (!appBundle || !assetFiles.includes(appBundle)) throw new Error("The Bible map client bundle is missing");

const appCode = await readFile(resolve("dist", "client", "assets", appBundle), "utf8");
if (!appCode.includes("leaflet-openstreetmap")) {
  throw new Error("The Leaflet OpenStreetMap layer is missing");
}
if (!appCode.includes("tile.openstreetmap.org") || appCode.includes("maplibre-gl-worker") || appCode.includes("tiles.openfreemap.org")) {
  throw new Error("The production map is not using the approved OpenStreetMap basemap");
}
if (!appCode.includes("data-map-ready")) throw new Error("The map readiness marker is missing");
if (!appCode.includes("data-synodal-text") || !appCode.includes("Синодальный перевод")) {
  throw new Error("The inline Synodal Scripture text is missing from the production client");
}
if (!appCode.includes("bible-map-tooltip")) throw new Error("Automatic clickable place labels are missing");

const clientFiles = await readdir(resolve("dist", "client"));
if (clientFiles.includes("sw.js")) throw new Error("The obsolete service worker is still being published");

console.log("Verified the real OpenStreetMap basemap and biblical overlay bundle");
