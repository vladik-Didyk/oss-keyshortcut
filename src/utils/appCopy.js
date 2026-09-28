/**
 * Page copy built from an app's own shortcut data, so text on app pages is
 * specific to the page instead of the same template with the name swapped.
 *
 * App notes (src/data/appNotes.js) name actions as {{Action name}}. They are
 * resolved against the page's data, so each platform shows its own keys (⌘ on
 * macOS, Ctrl on Windows). An action the page doesn't have renders as plain text.
 */

// Explicit ".js" so plain Node can import this file too (scripts/lib/page-prose.mjs).
import { parseKeyParts } from './platformHelpers.js'

const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").trim()

/** "⇧⌘P" on macOS, "Ctrl+Shift+P" elsewhere. */
export function formatKeys(sc, platform) {
  const parts = parseKeyParts(sc.modifiers, sc.key)
  return platform === 'macos' ? parts.join('') : parts.join('+')
}

/** First shortcut in the app whose action matches `action` (case-insensitive), or null. */
export function findShortcut(app, action) {
  const target = norm(action)
  for (const section of app.sections || []) {
    for (const sc of section.shortcuts) {
      if (norm(sc.action) === target) return sc
    }
  }
  return null
}

/**
 * Split note text into segments: { text } or { action, shortcut } for each
 * {{Action}} placeholder (shortcut is null when the page doesn't have it).
 */
export function resolveNoteText(text, app) {
  const segments = []
  const re = /\{\{([^}]+)\}\}/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index) })
    segments.push({ action: m[1], shortcut: findShortcut(app, m[1]) })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ text: text.slice(last) })
  return segments
}

/** Plain-text version of note text, e.g. for FAQ answers and structured data. */
export function noteToPlainText(text, app, platform) {
  return resolveNoteText(text, app)
    .map((s) => (s.text !== undefined ? s.text : s.shortcut ? `${s.action} (${formatKeys(s.shortcut, platform)})` : s.action))
    .join('')
}

/**
 * A note is used on a page only if every {{Action}} in its overview exists on
 * that page and at least 4 of its essentials do. Windows and Linux data often
 * name actions differently from macOS, and a half-matching note reads wrong.
 * A note that names sections (note.sections) also needs those sections on the page.
 */
export function noteFitsApp(note, app) {
  if (!note) return false
  const overviewOk = resolveNoteText(note.overview, app).every((s) => s.text !== undefined || s.shortcut)
  const sectionsOk = (note.sections || []).every((name) => (app.sections || []).some((s) => norm(s.name) === norm(name)))
  return overviewOk && sectionsOk && resolveEssentials(note.essentials, app).length >= 4
}

/** Tips whose {{Action}} placeholders all exist on this page. */
export function fittingTips(note, app) {
  return (note?.tips || []).filter((t) => resolveNoteText(t, app).every((s) => s.text !== undefined || s.shortcut))
}

/** Essentials from a note that exist on this page, as shortcuts. */
export function resolveEssentials(actions = [], app) {
  return actions.map((a) => findShortcut(app, a)).filter(Boolean)
}

// Everyday actions, in the order they are shown when a page has no hand-written note.
const EVERYDAY = [
  /^undo$/, /^redo$/, /^copy$/, /^paste$/, /^cut$/, /^save$/, /^find$/, /^select all$/,
  /^new tab/, /^close (the current )?tab/, /^new window/, /^zoom in$/, /^print/,
]

/** Up to `count` everyday shortcuts this app has (Undo, Copy, Find, ...). */
export function everydayShortcuts(app, count = 6) {
  const all = (app.sections || []).flatMap((s) => s.shortcuts)
  const picked = []
  for (const re of EVERYDAY) {
    const sc = all.find((s) => re.test(norm(s.action)))
    if (sc && !picked.includes(sc)) picked.push(sc)
    if (picked.length === count) break
  }
  return picked
}

/** The largest sections, e.g. [{ name: 'Editing', count: 46 }, ...]. */
export function largestSections(app, count = 3) {
  return [...(app.sections || [])]
    .map((s) => ({ name: s.name, count: s.shortcuts.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
}
