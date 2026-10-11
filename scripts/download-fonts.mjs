import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fontStack = "Noto Sans Bold";
const fontDirectory = join(root, "www", "fonts", fontStack);
const ranges = ["0-255", "1536-1791", "1792-2047", "2048-2303"];

await mkdir(fontDirectory, { recursive: true });

for (const range of ranges) {
  const url = `https://tiles.openfreemap.org/fonts/${encodeURIComponent(fontStack)}/${range}.pbf`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Font download failed (${response.status}): ${url}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error(`Font range is empty: ${url}`);
  }
  await writeFile(join(fontDirectory, `${range}.pbf`), bytes);
}

console.log(`Downloaded ${ranges.length} Noto Sans Bold glyph ranges for offline labels.`);
