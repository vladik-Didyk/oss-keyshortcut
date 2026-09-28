/**
 * App and shortcut counts computed from the committed data in public/data/.
 * Injected into the app as the build-time constant __SITE_STATS__ by
 * vite.config.js and vitest.config.js; read in src/data/siteConfig.js.
 * Counts update on every build/dev start, so copy never goes stale after `pnpm export`.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

export function computeSiteStats(root = process.cwd()) {
  const dataDir = join(root, "public/data");
  const platforms = JSON.parse(readFileSync(join(dataDir, "platforms.json"), "utf-8"));
  const slugs = new Set();
  const byPlatform = {};
  let shortcutCount = 0;
  let appPageCount = 0;
  let pagesWithDocs = 0;

  for (const { id } of platforms) {
    const { apps } = JSON.parse(readFileSync(join(dataDir, `platforms/${id}.json`), "utf-8"));
    const shortcuts = apps.reduce((sum, a) => sum + a.shortcutCount, 0);
    byPlatform[id] = { appCount: apps.length, shortcutCount: shortcuts };
    shortcutCount += shortcuts;
    appPageCount += apps.length;
    pagesWithDocs += apps.filter((a) => a.docsUrl).length;
    for (const a of apps) slugs.add(a.slug);
  }

  // appCount counts an app once even when it has pages on several platforms;
  // appPageCount counts every page. pagesWithDocs: pages that link to the
  // official documentation their shortcuts were taken from.
  return { appCount: slugs.size, shortcutCount, appPageCount, pagesWithDocs, platformCount: platforms.length, byPlatform };
}

// `pnpm stats` prints the numbers, for text written outside the site.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(computeSiteStats(), null, 2));
}
