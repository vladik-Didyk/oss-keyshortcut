/**
 * Clean exported platform data before the site uses it.
 *
 * Supabase has gaps that showed up on live pages (2026-09-28):
 * - 400 shortcuts had no English translation, so the raw action key
 *   ("shortcuts.slack.openThreadsView") was shown as the action text.
 * - Some apps had the same section twice ("Windows & Tabs" and
 *   "Windows and Tabs"), which listed the same shortcuts twice.
 * - 79 rows were exact duplicates within an app.
 *
 * Used by scripts/export-data.mjs (every export) and scripts/clean-data.mjs
 * (one-off run on the committed JSON). Idempotent. The real fix is adding the
 * missing translations in Supabase; this keeps the site clean until then.
 */

const ACRONYMS = new Set(['dm', 'dms', 'ui', 'url', 'urls', 'pdf', 'html', 'css', 'js', 'id', 'ai', 'api', 'gif', 'rgb', 'hsb', '3d', 'fps', 'iso', 'usb', 'ssh'])

/** "shortcuts.slack.openThreadsView" → "Open threads view". Other text is returned unchanged. */
export function humanizeActionKey(action) {
  const m = /^shortcuts\.[^.]+\.(.+)$/.exec(action)
  if (!m) return action
  const words = m[1]
    .replace(/\d+$/, '') // "newProject2" → "newProject"
    .replace(/([a-z])(\d)/g, '$1 $2') // "move3DLayer" → "move 3DLayer"
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // "3DLayer" → "3D Layer"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => {
      const lower = w.toLowerCase()
      return ACRONYMS.has(lower) ? lower.toUpperCase() : lower
    })
  if (!words.length || !words[0]) return action
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
  return words.join(' ').replace(/\b(show|Show) hide\b/g, '$1/hide')
}

const normalizeSectionName = (name) =>
  name.toLowerCase().replace(/&/g, ' and ').replace(/\s+/g, ' ').trim()

const shortcutKey = (sc) => `${sc.modifiers.join('+')}|${sc.key}|${sc.action.toLowerCase()}`

/** Returns a cleaned copy of one app. */
export function cleanApp(app) {
  const merged = []
  const byName = new Map()
  for (const section of app.sections) {
    const norm = normalizeSectionName(section.name)
    const target = byName.get(norm)
    if (target) {
      target.shortcuts.push(...section.shortcuts)
    } else {
      const copy = { ...section, shortcuts: [...section.shortcuts] }
      byName.set(norm, copy)
      merged.push(copy)
    }
  }

  const seen = new Set()
  const sections = merged
    .map((section) => ({
      ...section,
      shortcuts: section.shortcuts
        .map((sc) => ({ ...sc, action: humanizeActionKey(sc.action) }))
        .filter((sc) => {
          const k = shortcutKey(sc)
          if (seen.has(k)) return false
          seen.add(k)
          return true
        }),
    }))
    .filter((section) => section.shortcuts.length > 0)

  return {
    ...app,
    sections,
    shortcutCount: sections.reduce((sum, s) => sum + s.shortcuts.length, 0),
  }
}

export function cleanApps(apps) {
  return apps.map(cleanApp)
}
