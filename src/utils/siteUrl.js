/**
 * The address of a page of this site, in the one form that answers 200.
 * Used for canonical tags, og:url, JSON-LD, the sitemap, the RSS feed, llms.txt
 * and every link inside the site (linkPath, through components/SiteLink.jsx).
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

/**
 * The target of a link inside the site: the path in the form that answers 200,
 * with its query and its anchor kept. "/macos/macos#finder" → "/macos/macos/#finder".
 * A link to the form without the slash costs a crawler one redirect (308).
 * Anything that is not a path of this site comes back unchanged.
 */
export function linkPath(to) {
  if (typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//')) return to
  const [, path, rest] = /^([^?#]*)(.*)$/.exec(to)
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return to
  return `${pagePath(path)}${rest}`
}

/** "/macos/figma" → "https://keyshortcut.com/macos/figma/" */
export function pageUrl(path) {
  return `${SITE_ORIGIN}${pagePath(path)}`
}
