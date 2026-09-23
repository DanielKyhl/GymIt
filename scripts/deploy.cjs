// Puts the web app (the home-screen app) live on Firebase Hosting, after the
// end-to-end tests pass.
//
//   npm run deploy                  tests, build, upload
//   npm run deploy -- --skip-tests  build and upload only

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function run(command, env = {}) {
  const result = spawnSync(command, { cwd: ROOT, stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!process.argv.includes("--skip-tests")) run("node scripts/e2e.cjs");

console.log("\nBuilding the live app...");
// --clear so nothing from the test build (which points at the emulators on
// this computer) can come back out of the bundler's cache.
run("npx expo export --platform web --clear", { EXPO_PUBLIC_USE_EMULATORS: "", EXPO_PUBLIC_EMULATOR_HOST: "" });

// Never upload a build that talks to a database on this computer.
const jsDir = path.join(ROOT, "dist", "_expo", "static", "js", "web");
const wired = fs
  .readdirSync(jsDir)
  .filter((f) => f.endsWith(".js"))
  .filter((f) => /9099|127\.0\.0\.1/.test(fs.readFileSync(path.join(jsDir, f), "utf8")));
if (wired.length > 0) {
  console.error("\nStopped: the build points at the local emulators, not Firebase. Nothing was uploaded.");
  process.exit(1);
}

console.log("\nUploading...");
run("npx firebase-tools deploy --only hosting");
