import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidDirectory = join(root, "android");
const appGradlePath = join(androidDirectory, "app", "build.gradle");
const appGradleKtsPath = join(androidDirectory, "app", "build.gradle.kts");
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
if (!gradle.includes('noCompress += "pmtiles"')) {
  const androidBlock = /android\s*\{/g;
  const matches = [...gradle.matchAll(androidBlock)];
  if (matches.length !== 1) {
    throw new Error("Expected exactly one Android Gradle configuration block.");
  }
  const match = matches[0];
  gradle =
    gradle.slice(0, match.index + match[0].length) +
    '\n    androidResources {\n        noCompress += "pmtiles"\n    }\n' +
    gradle.slice(match.index + match[0].length);
  await writeFile(gradlePath, gradle, "utf8");
}

let mainActivity = await readFile(mainActivityPath, "utf8");
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

const pluginPath = join(dirname(mainActivityPath), "OfflineTilesPlugin.java");
await copyFile(nativePluginSource, pluginPath);
console.log("Registered the Android byte-range reader for the bundled PMTiles archive.");
