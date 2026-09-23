import { defineConfig, devices } from "@playwright/test";

// End-to-end tests: the real web build (the one the home-screen app runs),
// driven in WebKit, Safari's engine, at iPhone size, against the Firebase
// emulators. Run them with `npm run test:e2e`, which builds the app for the
// emulators first (see scripts/e2e.cjs).
export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8099",
    trace: "retain-on-failure",
  },
  projects: [{ name: "iPhone (WebKit)", use: { ...devices["iPhone 15"] } }],
  webServer: {
    command: "node scripts/serve-dist.cjs dist-e2e 8099",
    url: "http://127.0.0.1:8099",
    reuseExistingServer: false,
  },
});
