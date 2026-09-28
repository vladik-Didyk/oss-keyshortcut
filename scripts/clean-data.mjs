#!/usr/bin/env node
/**
 * Apply scripts/lib/clean-platform-data.mjs to the committed JSON in
 * public/data/platforms/*.json, in place. `pnpm export` already does this on
 * every export; run this after editing the JSON by hand. Idempotent.
 *
 * Usage: node scripts/clean-data.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { cleanApps } from "./lib/clean-platform-data.mjs";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../public/data/platforms");

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const path = join(dir, file);
  const data = JSON.parse(readFileSync(path, "utf-8"));
  const before = data.apps.reduce((n, a) => n + a.shortcutCount, 0);
  data.apps = cleanApps(data.apps);
  const after = data.apps.reduce((n, a) => n + a.shortcutCount, 0);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  console.log(`${file}: ${before} → ${after} shortcuts`);
}
