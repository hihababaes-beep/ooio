import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidDirectory = join(root, "android");
const appGradlePath = join(androidDirectory, "app", "build.gradle");
const appGradleKtsPath = join(androidDirectory, "app", "build.gradle.kts");
const manifestPath = join(androidDirectory, "app", "src", "main", "AndroidManifest.xml");
const nativePluginSource = join(root, "native", "OfflineTilesPlugin.java");
const archivePath = join(root, "www", "assets", "iraq.pmtiles");

async function findMainActivity(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      const match = await findMainActivity(path);
      if (match) return match;
    } else if (entry.name === "MainActivity.java") {
      return path;
    }
  }
  return null;
}

try {
  await readFile(archivePath);
} catch (error) {
  throw new Error(`Offline map archive is missing: ${archivePath}`, { cause: error });
}

const mainActivityPath = await findMainActivity(join(androidDirectory, "app", "src", "main", "java"));
if (!mainActivityPath) {
  throw new Error("Capacitor MainActivity.java was not found; cannot register OfflineTiles.");
}

// 1) منع ضغط ملف الخريطة داخل الـAPK (مطلوب لقراءته بالمواضع)
const gradlePath = await (async () => {
  for (const path of [appGradleKtsPath, appGradlePath]) {
    try {
      await readFile(path);
      return path;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  throw new Error("Capacitor app Gradle build file was not found.");
})();

let gradle = await readFile(gradlePath, "utf8");
if (!/noCompress[^\n]*pmtiles/.test(gradle)) {
  const matches = [...gradle.matchAll(/android\s*\{/g)];
  if (matches.length !== 1) {
    throw new Error("Expected exactly one Android Gradle configuration block.");
  }
  const match = matches[0];
  const isKts = gradlePath.endsWith(".kts");
  const line = isKts ? 'noCompress += "pmtiles"' : "noCompress 'pmtiles'";
  gradle =
    gradle.slice(0, match.index + match[0].length) +
    `\n    androidResources {\n        ${line}\n    }\n` +
    gradle.slice(match.index + match[0].length);
  await writeFile(gradlePath, gradle, "utf8");
}

// 2) تسجيل الإضافة في MainActivity
let mainActivity = await readFile(mainActivityPath, "utf8");
const packageMatch = mainActivity.match(/^\s*package\s+([\w.]+)\s*;/m);
if (!packageMatch) {
  throw new Error("Could not read the package name from MainActivity.java.");
}
if (!mainActivity.includes("OfflineTilesPlugin.class")) {
  const classDeclaration = /public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{/;
  if (!classDeclaration.test(mainActivity)) {
    throw new Error("Could not safely register OfflineTiles in the generated MainActivity.");
  }
  mainActivity = mainActivity.replace(
    classDeclaration,
    "$&\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n" +
      "        registerPlugin(OfflineTilesPlugin.class);\n" +
      "        super.onCreate(savedInstanceState);\n" +
      "    }\n"
  );
  await writeFile(mainActivityPath, mainActivity, "utf8");
}

// 3) نسخ الإضافة بنفس حزمة MainActivity (حتى لا يلزم import)
const pluginPath = join(dirname(mainActivityPath), "OfflineTilesPlugin.java");
const pluginSource = (await readFile(nativePluginSource, "utf8")).replace(
  /^\s*package\s+[\w.]+\s*;/m,
  `package ${packageMatch[1]};`
);
await writeFile(pluginPath, pluginSource, "utf8");

// 4) صلاحيات التطبيق: الموقع (للملاحة) والميكروفون (للتنبيهات الصوتية)
let manifest = await readFile(manifestPath, "utf8");
const permissions = [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS"
];
const missing = permissions.filter((name) => !manifest.includes(name));
if (missing.length) {
  const lines = missing.map((name) => `    <uses-permission android:name="${name}" />`).join("\n");
  const closing = manifest.lastIndexOf("</manifest>");
  if (closing === -1) throw new Error("AndroidManifest.xml is malformed.");
  manifest = manifest.slice(0, closing) + lines + "\n" + manifest.slice(closing);
  await writeFile(manifestPath, manifest, "utf8");
}

console.log("Registered the Android byte-range reader, no-compress rule and permissions.");
