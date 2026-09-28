/**
 * Which prose block an app page shows, and an estimate of its prose words.
 * Reads the committed data and the hand-written notes; renders nothing.
 *
 * Mirrors the choice made in src/components/ShortcutPage.jsx:
 *   note      the app has a note in src/data/appNotes.js and it fits the page
 *   everyday  no fitting note, but the app has 3 or more everyday shortcuts
 *   none      neither: the one-sentence intro is the only prose on the page
 *
 * Prose words = the intro sentence, plus the note's overview and fitting tips
 * (an {{Action}} counts as the words of its name), or the one-line intro of
 * the everyday block. Shortcut tables, titles and the FAQ are not counted.
 *
 * Used by scripts/measure-page-prose.mjs and src/test/page-prose.test.js.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { getAppNote } from "../../src/data/appNotes.js";
import { noteFitsApp, fittingTips, resolveNoteText, everydayShortcuts, largestSections } from "../../src/utils/appCopy.js";

// ShortcutPage.jsx shows the everyday block at `everyday.length >= 3`.
export const EVERYDAY_MIN = 3;

// A page with fewer sections than this may show neither block (see the test).
export const MIN_SECTIONS_FOR_PROSE = 3;

// Copies of CONTENT.shortcutPage.intro, .sectionsSummary and .everydayIntro.
// src/data/content.js needs Vite to load, so it cannot be imported here;
// src/test/page-prose.test.js fails when these copies drift from the original.
const intro = (appName, platformName, shortcutCount, sectionCount) =>
  `This page lists all ${shortcutCount} ${appName} keyboard shortcuts for ${platformName}, grouped into ${sectionCount} ${sectionCount === 1 ? "section" : "sections"}.`;
const sectionsSummary = (largest) =>
  largest.length < 2
    ? ""
    : `The largest are ${largest.map((s, i) => `${i === largest.length - 1 ? "and " : ""}${s.name} (${s.count})`).join(largest.length > 2 ? ", " : " ")}.`;
export const EVERYDAY_INTRO = "Everyday actions this app has shortcuts for:";

export const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

/** The intro paragraph of an app page, as one string. */
export function introText(app, platformName) {
  return `${intro(app.displayName, platformName, app.shortcutCount, app.sections.length)} ${sectionsSummary(largestSections(app))}`.trim();
}

/** Note text with every {{Action}} replaced by the action's name. */
const noteWords = (text, app) =>
  countWords(resolveNoteText(text, app).map((s) => (s.text !== undefined ? s.text : s.action)).join(""));

/** { block: 'note' | 'everyday' | 'none', introWords, blockWords, words } for one page. */
export function pageProse(app, platformId, platformName, noteFor = getAppNote) {
  const note = noteFor(app.slug, platformId);
  const introWords = countWords(introText(app, platformName));
  let block = "none";
  let blockWords = 0;

  if (noteFitsApp(note, app)) {
    block = "note";
    blockWords = [note.overview, ...fittingTips(note, app)].reduce((n, t) => n + noteWords(t, app), 0);
  } else if (everydayShortcuts(app).length >= EVERYDAY_MIN) {
    block = "everyday";
    blockWords = countWords(EVERYDAY_INTRO);
  }

  return { block, introWords, blockWords, words: introWords + blockWords };
}

/** One row per app page on every platform, in platform order. */
export function measureAllPages(root = process.cwd(), noteFor = getAppNote) {
  const dataDir = join(root, "public/data");
  const platforms = JSON.parse(readFileSync(join(dataDir, "platforms.json"), "utf-8"));
  const rows = [];
  for (const { id, display_name: platformName } of platforms) {
    const { apps } = JSON.parse(readFileSync(join(dataDir, `platforms/${id}.json`), "utf-8"));
    for (const app of apps) {
      rows.push({
        path: `${id}/${app.slug}`,
        platform: id,
        slug: app.slug,
        sections: app.sections.length,
        shortcuts: app.shortcutCount,
        ...pageProse(app, id, platformName, noteFor),
      });
    }
  }
  return rows;
}
