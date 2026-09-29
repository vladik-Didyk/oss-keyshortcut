/**
 * Pages about one shortcut: /{platform}/{app}/{id}, e.g. /macos/vscode/toggle-comment.
 *
 * A page exists only where a hand-written note exists (src/data/shortcutNotes.js)
 * and the data of that platform has the action. No note, no page: a page made
 * of nothing but the keys would be the app page cut into pieces.
 *
 * The note names the action as each platform's data names it (note.names), so
 * the keys on the page are always the keys of the data. Renaming an action in
 * the data takes its page away until the note follows; a test fails on that.
 *
 * Plain JS with ".js" imports: the pre-render config, the sitemap script and the
 * server loaders import it. It must not reach the browser: it carries every note.
 */
import { SHORTCUT_NOTES } from '../data/shortcutNotes.js'
import { findShortcut } from './appCopy.js'

export const RELATED_COUNT = 5

export const shortcutPagePath = (platformId, slug, id) => `/${platformId}/${slug}/${id}`

function resolve(platformId, app, note) {
  const name = note.names[platformId]
  const shortcut = name ? findShortcut(app, name) : null
  if (!shortcut) return null
  const section = app.sections.find((s) => s.shortcuts.includes(shortcut))
  return { id: note.id, note, shortcut, section }
}

/** Every shortcut page of an app on a platform: [{ id, note, shortcut, section }]. */
export function shortcutPagesOf(platformId, app) {
  return (SHORTCUT_NOTES[app.slug] || []).map((note) => resolve(platformId, app, note)).filter(Boolean)
}

/** One page, or null. */
export function shortcutPageOf(platformId, app, id) {
  const note = (SHORTCUT_NOTES[app.slug] || []).find((n) => n.id === id)
  return note ? resolve(platformId, app, note) : null
}

/** { <action as the data names it>: <page id> } for the rows of an app page. */
export function shortcutLinksOf(platformId, app) {
  return Object.fromEntries(shortcutPagesOf(platformId, app).map((page) => [page.shortcut.action, page.id]))
}

/**
 * Up to five other shortcuts of the same section: the ones that follow in the
 * list, then from its start. Every page gets its own neighbours.
 */
export function relatedShortcuts(page, count = RELATED_COUNT) {
  const list = page.section.shortcuts
  const at = list.indexOf(page.shortcut)
  return [...list.slice(at + 1), ...list.slice(0, at)].slice(0, count)
}

/** Paths of all shortcut pages. `appsByPlatform`: { macos: [app, ...], ... } */
export function allShortcutPages(appsByPlatform) {
  const pages = []
  for (const [platformId, apps] of Object.entries(appsByPlatform)) {
    for (const app of apps) {
      for (const page of shortcutPagesOf(platformId, app)) {
        pages.push({ platformId, slug: app.slug, id: page.id, written: page.note.written, path: shortcutPagePath(platformId, app.slug, page.id) })
      }
    }
  }
  return pages
}
