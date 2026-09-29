// The name a shortcut has in votes: "<section>--<action>", in small letters
// and dashes. The data has no id of its own, so the name is made from what the
// row says. A second row with the same words gets "-2".
//
// The rows of an app page carry it as data-item, and the vote endpoint accepts
// only an id that the served page has (server/feedback.js).

const dashed = (text, max) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '')

/** Map from a shortcut (the object in the data) to its id. */
export function shortcutIds(sections) {
  const used = new Map()
  const ids = new Map()
  for (const section of sections) {
    for (const shortcut of section.shortcuts) {
      const base = `${dashed(section.name, 40) || 'section'}--${dashed(shortcut.action, 70) || 'shortcut'}`
      const n = (used.get(base) || 0) + 1
      used.set(base, n)
      ids.set(shortcut, n > 1 ? `${base}-${n}` : base)
    }
  }
  return ids
}
