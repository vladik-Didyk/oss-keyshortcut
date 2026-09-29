/**
 * Checks of a file for `pnpm add-app -- --from-json <file>`, before anything is
 * written to the database. No network, no database: tests run it on every file
 * in content/pending-apps/.
 */
import { MODIFIER_ORDER } from '../shortcut-sync/pipeline/modifier-map.mjs'

export const PLATFORM_IDS = Object.keys(MODIFIER_ORDER)
export const CATEGORY_IDS = [
  'apple-apps', 'macos-system', 'browsers', 'development', 'communication',
  'productivity', 'design', 'microsoft-office', 'media', 'windows-system', 'system-utils',
]
export const ACTION_LIMIT = 60

/** The key the database stores the text of an action under. Shared by every platform of an app. */
export function actionKey(slug, action) {
  const camel = action
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('')
  return `shortcuts.${slug}.${camel}`
}

export const comboOf = (modifiers, key) => `${[...modifiers].sort().join('+')}|${key}`

/** Every fault of an input file, in words. An empty list means the file can be written. */
export function inputFaults(input) {
  const faults = []
  const { slug, displayName, category, platform = 'macos', docsUrl, sections } = input || {}

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug || '')) faults.push(`slug "${slug}": small letters, digits and single dashes only`)
  if (!displayName?.trim()) faults.push('displayName is missing')
  if (!PLATFORM_IDS.includes(platform)) faults.push(`platform "${platform}" is none of ${PLATFORM_IDS.join(', ')}`)
  if (!CATEGORY_IDS.includes(category)) faults.push(`category "${category}" is none of ${CATEGORY_IDS.join(', ')}`)
  if (docsUrl && !/^https:\/\/\S+$/.test(docsUrl)) faults.push(`docsUrl "${docsUrl}" is not an https address`)
  if (!Array.isArray(sections) || sections.length === 0) {
    faults.push('sections is missing or empty')
    return faults
  }

  const allowed = MODIFIER_ORDER[platform] || []
  const combos = new Map()
  const keys = new Map()
  const names = new Set()
  for (const section of sections) {
    const where = `section "${section?.name}"`
    if (!section?.name?.trim()) faults.push('a section has no name')
    if (names.has(section?.name)) faults.push(`${where} is in the file twice`)
    names.add(section?.name)
    if (!Array.isArray(section?.shortcuts) || section.shortcuts.length === 0) {
      faults.push(`${where} has no shortcuts`)
      continue
    }
    for (const shortcut of section.shortcuts) {
      const { modifiers, key, action } = shortcut || {}
      const what = `${where}, "${action}"`
      if (!Array.isArray(modifiers)) { faults.push(`${what}: modifiers is not a list`); continue }
      const unknown = modifiers.filter((m) => !allowed.includes(m))
      if (unknown.length) faults.push(`${what}: ${unknown.join(', ')} is no modifier of ${platform} (${allowed.join(', ')})`)
      const ordered = [...modifiers].sort((a, b) => allowed.indexOf(a) - allowed.indexOf(b))
      if (ordered.join() !== modifiers.join()) faults.push(`${what}: modifiers are not in the order ${allowed.join(', ')}`)
      if (new Set(modifiers).size !== modifiers.length) faults.push(`${what}: a modifier is there twice`)
      if (typeof key !== 'string' || !key.trim() || key !== key.trim()) faults.push(`${what}: key is missing or has spaces around it`)
      if (typeof action !== 'string' || !action.trim()) faults.push(`${where}: a shortcut has no action`)
      else if (action.length > ACTION_LIMIT) faults.push(`${what}: action is longer than ${ACTION_LIMIT} characters`)
      else if (/[.]$/.test(action)) faults.push(`${what}: action ends with a period`)

      const combo = comboOf(modifiers, key)
      if (combos.has(combo)) faults.push(`${what}: the same keys as "${combos.get(combo)}"`)
      combos.set(combo, action)
      // Two actions with the same stored key would share one text.
      const stored = typeof action === 'string' ? actionKey(slug, action) : null
      if (stored && keys.has(stored) && keys.get(stored) !== action) faults.push(`${what}: stored under the same key as "${keys.get(stored)}"`)
      if (stored) keys.set(stored, action)
    }
  }
  return faults
}

/** Display symbols of the exported data ("Ctrl", "⌘") back to the names the database stores. */
export function storedModifiers(symbols, platform, symbolsOf) {
  const bySymbol = Object.fromEntries(Object.entries(symbolsOf[platform] || {}).map(([name, symbol]) => [symbol, name]))
  return symbols.map((symbol) => bySymbol[symbol] || symbol.toLowerCase())
}
