/**
 * The day the shortcut list of an app page last changed, for <lastmod> in the
 * sitemap. A date is stated only where it is known.
 *
 * The record (src/data/pageDates.json) is written by scripts/page-dates.mjs from
 * the history of public/data/platforms/*.json. Each entry holds the day and a
 * hash of the list as it was then. A list that no longer has that hash changed
 * after the record was written (CI exports fresh data before it builds), so
 * its date is the day of this build.
 *
 * Plain Node, no dependencies: the sitemap script and the tests import it.
 */
import { createHash } from 'crypto'

/** What a visitor reads on the page: the name, the docs link and every shortcut. */
export function pageHash(app) {
  const content = {
    displayName: app.displayName,
    category: app.category || null,
    docsUrl: app.docsUrl || null,
    sections: (app.sections || []).map((section) => ({
      name: section.name,
      shortcuts: section.shortcuts.map((sc) => [sc.action, sc.modifiers || [], sc.key]),
    })),
  }
  return createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 16)
}

/** Both shapes the platform files had: { apps: [...] } and [...]. */
export const appsOf = (data) => (Array.isArray(data) ? data : data?.apps || [])

/** "2026-09-28" for the page, or undefined when nothing is known about it. */
export function pageDate(record, path, app, today) {
  const entry = record?.pages?.[path]
  if (!entry) return undefined
  return entry.hash === pageHash(app) ? entry.changed : today
}

/** The latest of the dates; undefined when none is known. */
export const latest = (dates) => dates.filter(Boolean).sort().at(-1)
