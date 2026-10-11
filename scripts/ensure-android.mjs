import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(root, "android"))) {
  console.log("Android project already exists.");
} else {
  console.log("Creating the Capacitor Android project...");
  execSync("npx cap add android", { cwd: root, stdio: "inherit" });
}
