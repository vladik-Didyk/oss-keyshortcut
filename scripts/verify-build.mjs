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
 * Always fails when the AdSense script tag, the ads.txt line or 404.html is missing,
 * when the JSON-LD of a checked page does not parse or lacks a type, or when a
 * link inside the site points at an address the host answers with a redirect.
 */
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { readJsonLd, jsonLdTypes } from "./lib/json-ld.mjs";
import { linkPath, SITE_ORIGIN } from "../src/utils/siteUrl.js";

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

// 5. 404.html (scripts/generate-404.mjs). Without it Cloudflare Pages answers
// every unknown URL with the home page and status 200.
const notFoundPage = read("404.html");
if (notFoundPage === null) {
  errors.push("404.html missing: unknown URLs would return the home page with status 200");
} else if (!notFoundPage.includes('<meta name="robots" content="noindex"/>')) {
  errors.push("404.html has no noindex tag");
}

// 6. llms.txt (scripts/generate-llms-txt.mjs)
if (read("llms.txt") === null) warnings.push("llms.txt missing");

// 7. JSON-LD (src/utils/structuredData.js), one page of each type that has
// its own: every block must parse, and the types of that page must be there.
const structuredData = [
  ["macos/index.html", ["WebSite", "BreadcrumbList", "ItemList"]],
  ["macos/figma/index.html", ["WebSite", "FAQPage", "BreadcrumbList", "WebPage"]],
  ["about/index.html", ["WebSite", "Person"]],
  ["macos/vscode/toggle-comment/index.html", ["WebSite", "BreadcrumbList", "FAQPage"]],
];
const jsonLdFound = [];
for (const [page, expected] of structuredData) {
  const html = read(page);
  if (html === null) {
    errors.push(`${page} not found in ${buildDir}`);
    continue;
  }
  try {
    const types = jsonLdTypes(readJsonLd(html));
    jsonLdFound.push(`${page}: ${types.join(", ")}`);
    for (const type of expected) {
      if (!types.includes(type)) errors.push(`${page}: JSON-LD has no ${type}`);
    }
  } catch (error) {
    errors.push(`${page}: ${error.message}`);
  }
}

// 8. Links inside the site, canonical and og:url: every one in the form the
// host serves (src/utils/siteUrl.js). The other form answers 308, which costs
// a crawler a request for every link it follows.
function htmlFiles(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(path, found);
    else if (entry.name.endsWith(".html")) found.push(path);
  }
  return found;
}
const pages = existsSync(buildDir) ? htmlFiles(buildDir) : [];
const wrongLinks = new Map();
let linksChecked = 0;
for (const file of pages) {
  const html = readFileSync(file, "utf-8");
  const targets = [
    ...[...html.matchAll(/<a\b[^>]*?\shref="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<meta property="og:url" content="([^"]+)"/g)].map((m) => m[1]),
  ];
  for (const raw of targets) {
    const target = raw.replaceAll("&amp;", "&");
    const path = target.startsWith(SITE_ORIGIN) ? target.slice(SITE_ORIGIN.length) || "/" : target;
    if (!path.startsWith("/") || path.startsWith("//")) continue;
    linksChecked++;
    if (linkPath(path) !== path) {
      const where = wrongLinks.get(path) || [];
      where.push(file.slice(buildDir.length + 1));
      wrongLinks.set(path, where);
    }
  }
}
for (const [path, where] of [...wrongLinks].slice(0, 20)) {
  errors.push(`link to ${path} (should be ${linkPath(path)}) on ${where.length} page(s), first: ${where[0]}`);
}
if (wrongLinks.size > 20) errors.push(`... and ${wrongLinks.size - 20} more link targets in the wrong form`);

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const e of errors) console.error(`FAIL  ${e}`);
console.log(`INFO  App Store download buttons: ${appStoreLive ? "SHOWN" : "hidden"}`);
for (const line of jsonLdFound) console.log(`INFO  JSON-LD ${line}`);
console.log(`INFO  Links inside the site: ${linksChecked} checked on ${pages.length} pages, ${wrongLinks.size} target(s) in the wrong form`);

if (errors.length) {
  console.error(`\nverify-build: ${errors.length} problem(s). Do not deploy this build.`);
  process.exit(1);
}
console.log("verify-build: OK");
