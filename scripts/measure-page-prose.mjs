#!/usr/bin/env node
/**
 * List, for every app page, which prose block it shows (note / everyday /
 * none) and an estimate of its prose words. Builds nothing: it reads
 * public/data/ and src/data/appNotes.js through scripts/lib/page-prose.mjs.
 *
 * Why: a page that shows neither block has only its one-sentence intro as
 * prose. Those pages are the work list for new notes in src/data/appNotes.js.
 *
 * Usage: node scripts/measure-page-prose.mjs [--thin] [--json]
 *   --thin  print only the pages that show neither block
 *   --json  print the rows as JSON instead of a table
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { measureAllPages, MIN_SECTIONS_FOR_PROSE } from "./lib/page-prose.mjs";

const args = process.argv.slice(2);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rows = measureAllPages(root);
const thin = rows.filter((r) => r.block === "none");

if (args.includes("--json")) {
  console.log(JSON.stringify(args.includes("--thin") ? thin : rows, null, 2));
  process.exit(0);
}

const line = (r) =>
  `${r.path.padEnd(34)} ${r.block.padEnd(9)} ${String(r.words).padStart(5)} ${String(r.sections).padStart(8)} ${String(r.shortcuts).padStart(9)}`;
const header = `${"page".padEnd(34)} ${"block".padEnd(9)} ${"words".padStart(5)} ${"sections".padStart(8)} ${"shortcuts".padStart(9)}`;

if (!args.includes("--thin")) {
  console.log(header);
  for (const r of rows) console.log(line(r));
  console.log("");
}

const count = (block) => rows.filter((r) => r.block === block).length;
const words = rows.map((r) => r.words).sort((a, b) => a - b);
console.log(`Pages: ${rows.length}. Note: ${count("note")}. Everyday block: ${count("everyday")}. Neither: ${thin.length}.`);
console.log(`Prose words per page: lowest ${words[0]}, median ${words[Math.floor(words.length / 2)]}, highest ${words[words.length - 1]}.`);
console.log(`Pages under 40 prose words: ${rows.filter((r) => r.words < 40).length}.`);

console.log(`\nPages that show neither block (${thin.length}):`);
if (thin.length) {
  console.log(header);
  for (const r of thin) console.log(line(r));
}
const mustFix = thin.filter((r) => r.sections >= MIN_SECTIONS_FOR_PROSE);
console.log(`\nOf these, with ${MIN_SECTIONS_FOR_PROSE} or more sections: ${mustFix.length}${mustFix.length ? ` (${mustFix.map((r) => r.path).join(", ")})` : ""}.`);
