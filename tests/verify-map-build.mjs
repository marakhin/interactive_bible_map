import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const manifest = JSON.parse(await readFile(resolve("dist", "client", ".vite", "manifest.json"), "utf8"));
const clientEntries = Object.values(manifest).filter((entry) => entry.isEntry).map((entry) => entry.file);
if (clientEntries.length === 0) throw new Error("No client entry was emitted");

const assetFiles = await readdir(resolve("dist", "client", "assets"));
const appBundle = manifest["components/BibleAtlasApp.tsx"]?.file?.replace(/^assets\//, "");
if (!appBundle || !assetFiles.includes(appBundle)) throw new Error("The Bible map client bundle is missing");

const appCode = await readFile(resolve("dist", "client", "assets", appBundle), "utf8");
if (!appCode.includes("biblical-geography")) {
  throw new Error("The self-contained biblical geography layer is missing");
}
if (appCode.includes("maplibre-gl-worker") || appCode.includes("tiles.openfreemap.org")) {
  throw new Error("The production map still depends on MapLibre or external tiles");
}
if (!appCode.includes("data-map-ready")) throw new Error("The map readiness marker is missing");

const clientFiles = await readdir(resolve("dist", "client"));
if (clientFiles.includes("sw.js")) throw new Error("The obsolete service worker is still being published");

console.log("Verified self-contained biblical map with no external tile dependency");
