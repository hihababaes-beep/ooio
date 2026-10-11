import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, open, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workDir = join(root, ".build", "planetiler");
const jarPath = join(workDir, "planetiler.jar");
const outputPath = join(root, "www", "assets", "iraq.pmtiles");
const planetilerUrl =
  "https://github.com/onthegomap/planetiler/releases/download/v0.10.2/planetiler.jar";
// لتقليل الحجم: IRAQ_MAXZOOM=13 (أو 12) قبل التشغيل. الافتراضي 14.
const maxZoom = String(process.env.IRAQ_MAXZOOM || "14");

async function downloadFile(url, destination) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
}

async function runPlanetiler() {
  await mkdir(workDir, { recursive: true });
  await mkdir(dirname(outputPath), { recursive: true });
  await rm(outputPath, { force: true });

  console.log("Downloading the pinned Planetiler release...");
  await downloadFile(planetilerUrl, jarPath);

  console.log(`Generating Iraq vector tiles (zoom 0-${maxZoom})...`);
  await new Promise((resolveRun, rejectRun) => {
    const process = spawn(
      "java",
      [
        "-Xmx4g",
        "-jar",
        jarPath,
        "--download",
        "--area=iraq",
        `--maxzoom=${maxZoom}`,
        `--output=${outputPath}`,
        "--force"
      ],
      { cwd: workDir, stdio: "inherit" }
    );

    process.once("error", rejectRun);
    process.once("exit", (code, signal) => {
      if (code === 0) {
        resolveRun();
      } else {
        rejectRun(
          new Error(
            `Planetiler failed (${signal ? `signal ${signal}` : `exit code ${code}`}).`
          )
        );
      }
    });
  });

  const output = await open(outputPath, "r");
  try {
    const header = Buffer.alloc(7);
    const { bytesRead } = await output.read(header, 0, header.length, 0);
    const outputInfo = await stat(outputPath);
    if (bytesRead !== 7 || header.toString("ascii") !== "PMTiles" || outputInfo.size < 1024) {
      throw new Error("Planetiler output is not a valid PMTiles archive.");
    }
    console.log(`Created ${outputPath} (${Math.round(outputInfo.size / 1024 / 1024)} MiB).`);
  } finally {
    await output.close();
  }
}

runPlanetiler().catch((error) => {
  console.error("Iraq tile generation failed:", error);
  process.exitCode = 1;
});
