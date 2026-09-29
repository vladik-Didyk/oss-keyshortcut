// Counts are computed at build time from public/data/ (scripts/site-stats.mjs,
// injected as __SITE_STATS__ by vite.config.js), so copy updates after `pnpm export`.
const STATS = __SITE_STATS__

// Whole directory: unique apps across macOS, Windows and Linux, and all their shortcuts.
export const APP_COUNT = STATS.appCount
export const SHORTCUT_COUNT = STATS.shortcutCount
// Every app page (an app on three platforms has three), and how many of them
// link to the official documentation the shortcuts were taken from.
export const APP_PAGE_COUNT = STATS.appPageCount
export const PAGES_WITH_DOCS = STATS.pagesWithDocs

// macOS only. The Mac app downloads the macOS data from the same database, so
// product copy about the app uses these.
export const MAC_APP_COUNT = STATS.byPlatform.macos?.appCount ?? 0
export const MAC_SHORTCUT_COUNT = STATS.byPlatform.macos?.shortcutCount ?? 0

export const PRICE = '$7.99'
export const MIN_MACOS = 'macOS 13.0+'
export const APP_STORE_URL = import.meta.env.VITE_APP_STORE_ID
  ? `https://apps.apple.com/app/keyshortcut/id${import.meta.env.VITE_APP_STORE_ID}`
  : null
export const SUPPORT_EMAIL = 'info@keyshortcut.com'
export const SITE_NAME = 'KeyShortcut'
// The public repository: the code, and the issues visitors open from the site.
export const REPO_URL = 'https://github.com/vladik-Didyk/oss-keyshortcut'

export function formatShortcutCount(count = SHORTCUT_COUNT) {
  return count.toLocaleString('en-US') + '+'
}

// Guides are plain data that Node scripts load without Vite, so they cannot
// import this file. They name a count as {appCount} or {macAppCount} instead.
const GUIDE_COUNTS = { appCount: APP_COUNT, macAppCount: MAC_APP_COUNT }

export function fillCounts(text) {
  return text.replace(/\{(appCount|macAppCount)\}/g, (_, name) => GUIDE_COUNTS[name])
}

/** A guide with the counts written into all of its text. Used by the guide route. */
export function withCounts(guide) {
  return JSON.parse(fillCounts(JSON.stringify(guide)))
}
