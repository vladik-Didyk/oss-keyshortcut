/**
 * The address of a page of this site, in the one form that answers 200.
 * Used for canonical tags, og:url, JSON-LD, the sitemap, the RSS feed and llms.txt.
 *
 * Cloudflare Pages serves a pre-rendered route from <path>/index.html, so its
 * address ends with a slash; the form without it 308-redirects there.
 * The exception is /privacy, served from public/privacy.html: no slash.
 * Checked with curl against the live site on 2026-09-28.
 *
 * Plain JS without imports, because the build scripts in scripts/ import it too.
 */
export const SITE_ORIGIN = 'https://keyshortcut.com'

// Pages served from a file of their own in public/, not from <path>/index.html.
const SERVED_WITHOUT_SLASH = new Set(['/privacy'])

/** "/macos/figma", "macos/figma" or "/macos/figma/" → "/macos/figma/" */
export function pagePath(path) {
  const bare = `/${path}`.replace(/\/+/g, '/').replace(/\/$/, '')
  if (bare === '') return '/'
  return SERVED_WITHOUT_SLASH.has(bare) ? bare : `${bare}/`
}

/** "/macos/figma" → "https://keyshortcut.com/macos/figma/" */
export function pageUrl(path) {
  return `${SITE_ORIGIN}${pagePath(path)}`
}
