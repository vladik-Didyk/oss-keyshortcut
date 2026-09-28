/**
 * Pure functions that derive lookups from loaded platform data.
 */

export function buildPlatformLookups(apps) {
  if (!apps) return { appMap: {}, categoryGroups: [], totalShortcuts: 0, appCount: 0 }

  const appMap = {}
  const catMap = {}
  let totalShortcuts = 0

  for (const app of apps) {
    appMap[app.slug] = app
    totalShortcuts += app.shortcutCount
    const cat = app.category || 'Other'
    if (!catMap[cat]) catMap[cat] = []
    catMap[cat].push(app)
  }

  const categoryGroups = Object.entries(catMap).map(([name, catApps]) => ({ name, apps: catApps }))

  return { appMap, categoryGroups, totalShortcuts, appCount: apps.length }
}

/** The apps with the most shortcuts (the homepage "Most shortcuts" row). */
export function getPopularApps(apps, count = 8) {
  if (!apps) return []
  return [...apps]
    .sort((a, b) => b.shortcutCount - a.shortcutCount)
    .slice(0, count)
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * A different set of other apps for each app page, for its "more apps" links.
 *
 * Apps are ordered by slug. Page i links to apps i+s, i+2s, … (mod n), with a
 * stride s that is coprime to n and about n/(count+1), so the picks spread
 * across the list instead of being alphabetical neighbours. For any fixed k the
 * map i → i+k·s is a bijection, so every app is linked from about `count`
 * pages: link equity is shared evenly instead of all going to the same few
 * pages. The result depends only on the app list, so every build is identical.
 *
 * Skips `currentSlug` and any slug in `exclude`.
 */
export function pickMoreApps(apps, currentSlug, count = 8, exclude = []) {
  if (!apps?.length) return []
  const ordered = [...apps].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
  const n = ordered.length
  const skip = new Set([currentSlug, ...exclude])
  const start = ordered.findIndex((a) => a.slug === currentSlug)
  if (start === -1) return ordered.filter((a) => !skip.has(a.slug)).slice(0, count)

  let step = Math.max(1, Math.floor(n / (count + 1)))
  while (gcd(step, n) !== 1) step++

  const picked = []
  for (let k = 1; k < n && picked.length < count; k++) {
    const app = ordered[(start + k * step) % n]
    if (!skip.has(app.slug)) picked.push(app)
  }
  return picked
}

/** Split a shortcut's modifiers + key into individual keycap parts.
 *  Handles combined keys like "Tab+Q" → ["Tab","Q"] while keeping
 *  literal "+" and "Num+"/"Num +" intact. */
export function parseKeyParts(modifiers, key) {
  const parts = [...modifiers]
  if (key === '+' || key.startsWith('Num')) {
    parts.push(key)
  } else if (key.includes('+')) {
    parts.push(...key.split('+'))
  } else {
    parts.push(key)
  }
  return parts
}

export function groupByCategories(apps, categoryOrder) {
  if (!apps) return []

  const groups = {}
  for (const app of apps) {
    const cat = app.category || 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(app)
  }

  return categoryOrder
    .filter(cat => groups[cat]?.length)
    .map(cat => ({ name: cat, apps: groups[cat] }))
}
