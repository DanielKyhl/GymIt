// End-to-end tests: builds the web app pointed at the Firebase emulators, then
// runs the Playwright tests (WebKit, iPhone size) with the emulators up.
// Needs Java for the emulators, and once: `npx playwright install webkit`.
//
//   npm run test:e2e

const { spawnSync } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function run(command, env = {}) {
  const result = spawnSync(command, { cwd: ROOT, stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("\nBuilding the web app for the test database...");
// --clear: the bundler caches what it builds, and a cached copy keeps the
// database settings it was built with.
run("npx expo export --platform web --output-dir dist-e2e --clear", {
  EXPO_PUBLIC_USE_EMULATORS: "1",
  EXPO_PUBLIC_EMULATOR_HOST: "127.0.0.1",
});

console.log("\nRunning the tests in WebKit against the emulators...");
run('npx firebase-tools emulators:exec --only auth,firestore --project demo-gymit "npx playwright test"');
