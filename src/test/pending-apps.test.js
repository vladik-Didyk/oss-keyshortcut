import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { inputFaults, actionKey, comboOf, storedModifiers, PLATFORM_IDS, CATEGORY_IDS } from '../../scripts/lib/app-input.mjs'
import { MODIFIER_SYMBOLS } from '../../scripts/shortcut-sync/pipeline/modifier-map.mjs'
import { KEY_SYMBOL_WORDS, PUNCTUATION_KEY_WORDS, keysToWords, parseKeyParts } from '../utils/platformHelpers'

// Files for `pnpm add-app -- --from-json`, prepared from the vendors' own pages
// and not yet in the database (content/pending-apps/README.md). These tests are
// the gate: a file that fails here must not be written to the database.
const ROOT = process.cwd()
const DIR = join(ROOT, 'content/pending-apps')
const json = (path) => JSON.parse(readFileSync(path, 'utf-8'))
const site = Object.fromEntries(PLATFORM_IDS.map((id) => [id, json(join(ROOT, `public/data/platforms/${id}.json`)).apps]))
const categoryIds = json(join(ROOT, 'public/data/categories.json'))

const files = PLATFORM_IDS.flatMap((platform) => {
  const dir = join(DIR, platform)
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => ({ platform, name, input: json(join(dir, name)) }))
})
const shortcutsOf = (input) => input.sections.flatMap((section) => section.shortcuts.map((shortcut) => ({ ...shortcut, section: section.name })))

const KEY_SYMBOL = /(?=\P{ASCII})\p{S}/u
const A_WORD = /^[A-Z][a-z]+( [A-Z][a-z]+)*$/

describe('checks of an input file', () => {
  const good = {
    slug: 'my-app', displayName: 'My App', category: 'development', platform: 'windows', docsUrl: 'https://example.com/keys',
    sections: [{ name: 'General', shortcuts: [{ modifiers: ['control', 'shift'], key: 'P', action: 'Command Palette' }] }],
  }
  const withShortcut = (shortcut) => ({ ...good, sections: [{ name: 'General', shortcuts: [{ ...good.sections[0].shortcuts[0], ...shortcut }] }] })

  it('passes a file that is right', () => {
    expect(inputFaults(good)).toEqual([])
  })

  it.each([
    ['a platform the site does not have', { ...good, platform: 'amiga' }, /platform/],
    ['a category the site does not have', { ...good, category: 'games' }, /category/],
    ['a slug with a capital', { ...good, slug: 'My-App' }, /slug/],
    ['no sections', { ...good, sections: [] }, /sections/],
    ['a Mac modifier on Windows', withShortcut({ modifiers: ['command'] }), /no modifier of windows/],
    ['a display symbol in place of a name', withShortcut({ modifiers: ['Ctrl'] }), /no modifier of windows/],
    ['modifiers out of order', withShortcut({ modifiers: ['shift', 'control'] }), /order/],
    ['no key', withShortcut({ key: '' }), /key/],
    ['an action that is too long', withShortcut({ action: 'A'.repeat(61) }), /longer/],
    ['an action that is a sentence', withShortcut({ action: 'Opens the palette.' }), /period/],
  ])('names %s', (_, input, fault) => {
    expect(inputFaults(input).join('\n')).toMatch(fault)
  })

  it('names the same keys twice in one file', () => {
    const twice = { ...good, sections: [{ name: 'General', shortcuts: [good.sections[0].shortcuts[0], { modifiers: ['control', 'shift'], key: 'P', action: 'Show Commands' }] }] }
    expect(inputFaults(twice).join('\n')).toMatch(/same keys/)
  })

  it('knows the platforms and the categories of the site', () => {
    expect(PLATFORM_IDS.sort()).toEqual(Object.keys(site).sort())
    expect(CATEGORY_IDS.sort()).toEqual(categoryIds.map((c) => c.id).sort())
  })
})

describe.skipIf(files.length === 0).each(files)('pending file $platform/$name', ({ platform, name, input }) => {
  const present = site[platform].find((app) => app.slug === input.slug)
  const shortcuts = shortcutsOf(input)

  it('is named after its app and lies in the folder of its platform', () => {
    expect(name).toBe(`${input.slug}.json`)
    expect(input.platform).toBe(platform)
  })

  it('has no fault', () => {
    expect(inputFaults(input)).toEqual([])
  })

  it('has the category the app has on the site', () => {
    const known = PLATFORM_IDS.flatMap((id) => site[id]).find((app) => app.slug === input.slug)
    if (!known) return
    expect(categoryIds.find((c) => c.id === input.category).display_name).toBe(known.category)
  })

  it('names the documentation the site names for the app', () => {
    if (!present?.docsUrl) return
    expect(input.docsUrl).toBe(present.docsUrl)
  })

  // The rule of the site: data that is there is not rewritten.
  // A file whose every shortcut is in the data, keys and action, has been
  // written to the database and exported: it passes, and can be deleted.
  it('holds no keys the app already has on this platform, unless the whole file is in the data', () => {
    if (!present) return
    const there = present.sections.flatMap((s) => s.shortcuts)
    const taken = new Map(there.map((sc) => [comboOf(storedModifiers(sc.modifiers, platform, MODIFIER_SYMBOLS), sc.key), sc.action]))
    const again = shortcuts.filter((sc) => taken.has(comboOf(sc.modifiers, sc.key)))
    const written = again.length === shortcuts.length && again.every((sc) => taken.get(comboOf(sc.modifiers, sc.key)) === sc.action)
    if (written) return
    expect(again.map((sc) => `${sc.section}: ${sc.action}`)).toEqual([])
  })

  // The text of an action is stored once for every platform of an app. A new
  // action under the key of one that is there would change its text.
  it('changes the text of no action the app has', () => {
    const texts = new Map()
    for (const id of PLATFORM_IDS) {
      const app = site[id].find((a) => a.slug === input.slug)
      for (const sc of app?.sections.flatMap((s) => s.shortcuts) || []) texts.set(actionKey(input.slug, sc.action), sc.action)
    }
    const changed = shortcuts
      .filter((sc) => texts.has(actionKey(input.slug, sc.action)) && texts.get(actionKey(input.slug, sc.action)) !== sc.action)
      .map((sc) => `"${texts.get(actionKey(input.slug, sc.action))}" would become "${sc.action}"`)
    expect(changed).toEqual([])
  })

  it('has a word for every key, as the pages read them to a screen reader', () => {
    const symbols = MODIFIER_SYMBOLS[platform]
    const without = []
    for (const sc of shortcuts) {
      const parts = parseKeyParts(sc.modifiers.map((m) => symbols[m]), sc.key)
      const words = keysToWords(parts, platform)
      const lacks = parts.some((part) =>
        [...part].some((ch) => KEY_SYMBOL.test(ch) && !A_WORD.test(KEY_SYMBOL_WORDS[ch] || '')) ||
        (/^[!-~]$/.test(part) && !/[A-Za-z0-9]/.test(part) && !A_WORD.test(PUNCTUATION_KEY_WORDS[part] || '')),
      )
      if (lacks || KEY_SYMBOL.test(words) || /^\s|\s$|\s\s/.test(words) || words === '') without.push(`${sc.action}: "${sc.key}" → "${words}"`)
    }
    expect(without).toEqual([])
  })

  it('leaves no section with fewer than three shortcuts, counting those the site has', () => {
    const has = (sectionName) => present?.sections.find((s) => s.name === sectionName)?.shortcuts.length || 0
    const small = input.sections
      .map((s) => ({ name: s.name, count: s.shortcuts.length + has(s.name) }))
      .filter((s) => s.count < 3)
      .map((s) => `${s.name}: ${s.count}`)
    expect(small).toEqual([])
  })
})
