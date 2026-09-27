#!/usr/bin/env node
/**
 * Check a finished production build before it is deployed.
 *
 * Why: the 2026-09-24 deploy was built in a clean folder without `.env`, so it
 * shipped with no AdSense, GA4, Clarity or PostHog IDs, and nobody noticed.
 *
 * Usage: node scripts/verify-build.mjs [buildDir] [--strict]
 *   buildDir  defaults to build/client
 *   --strict  missing analytics IDs fail the check (default: warn only)
 *
 * Always fails when the AdSense script tag or the ads.txt line is missing.
 */
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const buildDir = args.find((a) => !a.startsWith("--")) || "build/client";

const errors = [];
const warnings = [];

function read(rel) {
  const p = join(buildDir, rel);
  return existsSync(p) ? readFileSync(p, "utf-8") : null;
}

// 1. AdSense script tag in pre-rendered HTML (home + an app page).
for (const page of ["index.html", "macos/vscode/index.html"]) {
  const html = read(page);
  if (html === null) {
    errors.push(`${page} not found in ${buildDir}`);
  } else if (!/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-\d+/.test(html)) {
    errors.push(`${page}: AdSense script tag missing (VITE_ADSENSE_ID not set at build time)`);
  }
}

// 2. ads.txt
const adsTxt = read("ads.txt");
if (!adsTxt || !/google\.com, pub-\d+, DIRECT/.test(adsTxt)) {
  errors.push("ads.txt missing or has no Google publisher line");
}

// 3. Analytics IDs compiled into the client JS. With an ID unset, the minifier
// drops the loader code, so the loader URLs only appear when the ID was set.
const assetsDir = join(buildDir, "assets");
const js = existsSync(assetsDir)
  ? readdirSync(assetsDir)
      .filter((f) => f.endsWith(".js"))
      .map((f) => readFileSync(join(assetsDir, f), "utf-8"))
      .join("\n")
  : "";
const analytics = [
  ["GA4 (VITE_GA4_ID)", /googletagmanager\.com\/gtag\/js/],
  ["Microsoft Clarity (VITE_CLARITY_ID)", /clarity\.ms\/tag\//],
  ["PostHog (VITE_POSTHOG_KEY)", /phc_[A-Za-z0-9]{10,}/],
];
for (const [name, re] of analytics) {
  if (!re.test(js)) (strict ? errors : warnings).push(`${name} not found in client JS`);
}

// 4. App Store buttons: report state so a deploy never flips it by accident.
const appStoreLive = /apps\.apple\.com\/app\/keyshortcut\/id\d+/.test(js);

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const e of errors) console.error(`FAIL  ${e}`);
console.log(`INFO  App Store download buttons: ${appStoreLive ? "SHOWN" : "hidden"}`);

if (errors.length) {
  console.error(`\nverify-build: ${errors.length} problem(s). Do not deploy this build.`);
  process.exit(1);
}
console.log("verify-build: OK");
