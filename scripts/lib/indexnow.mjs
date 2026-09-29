/**
 * IndexNow: tells Bing, Yandex, Seznam and Naver which pages are new or changed,
 * so that they fetch them now instead of finding them weeks later.
 * https://www.indexnow.org/documentation
 *
 * The key proves that the sender owns the site: the site serves it as a file
 * of the same name at its top level. It is public by design.
 */
export const INDEXNOW_KEY = 'e4fc058c17aefe7b3f5d7b6f32d38dc2'
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
export const INDEXNOW_LIMIT = 10000

/** [{ loc, lastmod }] of one sitemap file. */
export function readSitemap(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, body]) => ({
    loc: /<loc>([^<]+)<\/loc>/.exec(body)?.[1].trim(),
    lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(body)?.[1].trim() || null,
  })).filter((entry) => entry.loc)
}

/**
 * The pages to report: those whose day of change is `since` or later.
 * A page without a known day is not reported: nothing says it changed.
 * `since`: 'YYYY-MM-DD', or null for every page.
 */
export function changedSince(entries, since) {
  if (!since) return entries.map((entry) => entry.loc)
  return entries.filter((entry) => entry.lastmod && entry.lastmod.slice(0, 10) >= since).map((entry) => entry.loc)
}

export const daysAgo = (days, today = new Date()) =>
  new Date(today.getTime() - days * 86400000).toISOString().slice(0, 10)

/** The body of the request, for up to 10,000 addresses of one host. */
export function indexNowBody(origin, urls) {
  const host = new URL(origin).host
  const own = urls.filter((url) => new URL(url).host === host)
  return {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
    urlList: own.slice(0, INDEXNOW_LIMIT),
  }
}
