import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "source", "index.html");
const webDirectory = join(root, "www");
const vendorDirectory = join(webDirectory, "vendor");
const htmlPath = join(webDirectory, "index.html");
const html = await readFile(sourcePath, "utf8");

const replacements = [
  [
    '<script src="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js" crossorigin="anonymous"></script>',
    '<script src="./vendor/maplibre-gl.js"></script>\n<script src="./vendor/pmtiles.js"></script>'
  ],
  [
    '<link href="https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css" rel="stylesheet"/>',
    '<link href="./vendor/maplibre-gl.css" rel="stylesheet"/>'
  ],
  [
    '<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" crossorigin="anonymous"></script>',
    '<script src="./vendor/lucide.min.js"></script>'
  ],
  [
    '<script src="https://unpkg.com/@capacitor/core@6/dist/capacitor.js" crossorigin="anonymous"></script>',
    '<script src="./vendor/capacitor.js"></script>'
  ],
  [
    '<script src="https://unpkg.com/@capacitor/share@6/dist/plugin.js" crossorigin="anonymous"></script>',
    '<script src="./vendor/capacitor-share.js"></script>'
  ],
  [
    "'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.js'",
    "new URL('./vendor/mapbox-gl-rtl-text.js', window.location.href).href"
  ],
  [
    "glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',",
    "glyphs: `${window.location.origin}/fonts/{fontstack}/{range}.pbf`,"
  ],
  [
    "[OFM_SOURCE_ID]: { type:'vector', url:'https://tiles.openfreemap.org/planet' },",
    "[OFM_SOURCE_ID]: {\n        type:'vector',\n        url:'pmtiles://' + new URL('./assets/iraq.pmtiles', window.location.href).href,\n        attribution:'© OpenStreetMap contributors | © OpenMapTiles | © Natural Earth'\n      },"
  ],
  [
    ".maplibregl-ctrl-attrib,.maplibregl-ctrl-logo,.maplibregl-ctrl-group { display:none!important; }",
    ".maplibregl-ctrl-logo,.maplibregl-ctrl-group { display:none!important; }"
  ],
  ["attributionControl: false,", "attributionControl: true,"]
];

let outputHtml = html;
for (const [search, replacement] of replacements) {
  const first = outputHtml.indexOf(search);
  if (first === -1 || outputHtml.indexOf(search, first + search.length) !== -1) {
    throw new Error(`Expected exactly one source match while preparing offline app: ${search}`);
  }
  outputHtml =
    outputHtml.slice(0, first) + replacement + outputHtml.slice(first + search.length);
}

const protocolMarker = "const TILE_CACHE_NAME = 'sqoor-map-tiles-v1';";
if (!outputHtml.includes(protocolMarker)) {
  throw new Error("Could not locate map initialization to register the PMTiles protocol.");
}
outputHtml = outputHtml.replace(
  protocolMarker,
  "const offlineArchiveUrl = new URL('./assets/iraq.pmtiles', window.location.href).href;\n" +
    "const offlineTilesPlugin = window.Capacitor.registerPlugin('OfflineTiles');\n" +
    "const offlinePMTiles = new pmtiles.PMTiles({\n" +
    "  getKey: () => offlineArchiveUrl,\n" +
    "  async getBytes(offset, length) {\n" +
    "    const result = await offlineTilesPlugin.readRange({ offset, length });\n" +
    "    const binary = atob(result.data);\n" +
    "    const bytes = new Uint8Array(binary.length);\n" +
    "    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);\n" +
    "    return { data: bytes.buffer };\n" +
    "  }\n" +
    "});\n" +
    "const pmtilesProtocol = new pmtiles.Protocol();\n" +
    "pmtilesProtocol.add(offlinePMTiles);\n" +
    "maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);\n" +
    protocolMarker
);

const vendorFiles = [
  [["maplibre-gl", "dist", "maplibre-gl.js"], "maplibre-gl.js"],
  [["maplibre-gl", "dist", "maplibre-gl.css"], "maplibre-gl.css"],
  [["pmtiles", "dist", "pmtiles.js"], "pmtiles.js"],
  [["@mapbox", "mapbox-gl-rtl-text", "mapbox-gl-rtl-text.js"], "mapbox-gl-rtl-text.js"],
  [["lucide", "dist", "umd", "lucide.min.js"], "lucide.min.js"],
  [["@capacitor", "core", "dist", "capacitor.js"], "capacitor.js"],
  [["@capacitor", "share", "dist", "plugin.js"], "capacitor-share.js"]
];

await mkdir(vendorDirectory, { recursive: true });
await mkdir(join(webDirectory, "assets"), { recursive: true });
for (const [parts, target] of vendorFiles) {
  await copyFile(join(root, "node_modules", ...parts), join(vendorDirectory, target));
}
await writeFile(htmlPath, outputHtml, "utf8");

console.log(`Prepared the offline Capacitor web app at ${htmlPath}.`);
