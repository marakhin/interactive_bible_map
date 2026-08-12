import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const workerPath = resolve("dist", "client", "assets", "maplibre-gl-worker.mjs");
await access(workerPath, constants.R_OK);

const worker = await stat(workerPath);
if (worker.size < 10_000) throw new Error("MapLibre worker asset is unexpectedly small");

const manifest = JSON.parse(await readFile(resolve("dist", "client", ".vite", "manifest.json"), "utf8"));
const clientEntries = Object.values(manifest).filter((entry) => entry.isEntry).map((entry) => entry.file);
if (clientEntries.length === 0) throw new Error("No client entry was emitted");

const serverBundle = await readFile(resolve("dist", "server", "index.js"), "utf8");
if (!serverBundle.includes('url.pathname === "/assets/maplibre-gl-worker.mjs"')) {
  throw new Error("The production worker does not serve the MapLibre worker asset");
}

console.log(`Verified map worker asset: ${worker.size} bytes`);
