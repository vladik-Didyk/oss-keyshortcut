// Counts are computed at build time from public/data/ (scripts/site-stats.mjs,
// injected as __SITE_STATS__ by vite.config.js), so copy updates after `pnpm export`.
const STATS = __SITE_STATS__

// Whole directory: unique apps across macOS, Windows and Linux, and all their shortcuts.
export const APP_COUNT = STATS.appCount
export const SHORTCUT_COUNT = STATS.shortcutCount

// macOS only. The Mac app downloads the macOS data from the same database, so
// product copy about the app uses these.
export const MAC_APP_COUNT = STATS.byPlatform.macos?.appCount ?? 0
export const MAC_SHORTCUT_COUNT = STATS.byPlatform.macos?.shortcutCount ?? 0

export const PRICE = '$7.99'
export const MIN_MACOS = 'macOS 13.0+'
export const APP_STORE_URL = import.meta.env.VITE_APP_STORE_ID
  ? `https://apps.apple.com/app/keyshortcut/id${import.meta.env.VITE_APP_STORE_ID}`
  : null
export const SUPPORT_EMAIL = 'vladik.didyk@gmail.com'
export const SITE_NAME = 'KeyShortcut'

export function formatShortcutCount(count = SHORTCUT_COUNT) {
  return count.toLocaleString('en-US') + '+'
}
