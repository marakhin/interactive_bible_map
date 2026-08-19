import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "mobile-safari", use: { ...devices["iPhone 13"], browserName: "webkit" } },
    { name: "mobile-safari-landscape", use: { ...devices["iPhone 13 landscape"], browserName: "webkit" } },
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
  ],
});
