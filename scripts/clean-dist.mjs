import { lstat, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const projectRoot = resolve(process.cwd());
const outputDirectory = resolve(projectRoot, "dist");

if (dirname(outputDirectory) !== projectRoot || basename(outputDirectory) !== "dist") {
  throw new Error(`Refusing to clean an unexpected build path: ${outputDirectory}`);
}

try {
  const output = await lstat(outputDirectory);
  if (output.isSymbolicLink()) throw new Error(`Refusing to clean a symbolic link: ${outputDirectory}`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

await rm(outputDirectory, { recursive: true, force: true });
console.log(`Cleaned generated build output: ${outputDirectory}`);
