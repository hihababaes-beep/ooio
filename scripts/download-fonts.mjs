import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fontStack = "Noto Sans Bold";
const fontDirectory = join(root, "www", "fonts", fontStack);

// الأربعة الأولى أساسية. الباقي: لاتيني موسّع، علامات ترقيم، وأشكال الحروف العربية المتصلة
// (إضافة rtl-text تحوّل العربية إلى هذه الأشكال، فبدونها قد تظهر الأسماء ناقصة).
const required = ["0-255", "1536-1791", "1792-2047", "2048-2303"];
const optional = ["256-511", "8192-8447", "64256-64511", "64512-64767", "64768-65023", "65024-65279"];

await mkdir(fontDirectory, { recursive: true });

let downloaded = 0;
for (const range of [...required, ...optional]) {
  const url = `https://tiles.openfreemap.org/fonts/${encodeURIComponent(fontStack)}/${range}.pbf`;
  const response = await fetch(url);
  if (!response.ok) {
    if (required.includes(range)) {
      throw new Error(`Font download failed (${response.status}): ${url}`);
    }
    console.warn(`Skipped optional font range ${range} (${response.status}).`);
    continue;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) {
    if (required.includes(range)) throw new Error(`Font range is empty: ${url}`);
    console.warn(`Skipped empty optional font range ${range}.`);
    continue;
  }
  await writeFile(join(fontDirectory, `${range}.pbf`), bytes);
  downloaded++;
}

console.log(`Downloaded ${downloaded} Noto Sans Bold glyph ranges for offline labels.`);
