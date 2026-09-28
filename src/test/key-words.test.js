import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  KEY_SYMBOL_WORDS,
  PUNCTUATION_KEY_WORDS,
  keyPartToWords,
  keysToWords,
  parseKeyParts,
} from '../utils/platformHelpers'

const PLATFORMS = ['macos', 'windows', 'linux']
const readPlatform = (id) =>
  JSON.parse(readFileSync(join(process.cwd(), `public/data/platforms/${id}.json`), 'utf-8'))

/** Every shortcut of a platform as { app, action, parts }. */
function allShortcuts(platformId) {
  const rows = []
  for (const app of readPlatform(platformId).apps) {
    for (const section of app.sections) {
      for (const sc of section.shortcuts) {
        rows.push({ app: app.slug, action: sc.action, parts: parseKeyParts(sc.modifiers, sc.key) })
      }
    }
  }
  return rows
}

// A key symbol: a character outside ASCII that Unicode classes as a symbol (⌘ ↩ ← ⏻ …).
const KEY_SYMBOL = /(?=\P{ASCII})\p{S}/u
const keySymbolsIn = (text) => text.match(new RegExp(KEY_SYMBOL, 'gu')) || []
// A key that is a single ASCII character other than a letter or a digit.
const isPunctuationKey = (part) => /^[!-~]$/.test(part) && !/[A-Za-z0-9]/.test(part)
const A_WORD = /^[A-Z][a-z]+( [A-Z][a-z]+)*$/

const MAC_WORDS = [
  ['⌘', 'Command'],
  ['⌥', 'Option'],
  ['⌃', 'Control'],
  ['⇧', 'Shift'],
  ['↩', 'Return'],
  ['⏎', 'Return'],
  ['⌫', 'Delete'],
  ['⌦', 'Forward Delete'],
  ['⎋', 'Escape'],
  ['⇥', 'Tab'],
  ['↑', 'Up Arrow'],
  ['↓', 'Down Arrow'],
  ['←', 'Left Arrow'],
  ['→', 'Right Arrow'],
  ['⏻', 'Power Button'],
]

describe('key symbols in words', () => {
  it('names the four Mac modifiers as the sync pipeline does', () => {
    expect(KEY_SYMBOL_WORDS['⌘']).toBe('Command')
    expect(KEY_SYMBOL_WORDS['⌥']).toBe('Option')
    expect(KEY_SYMBOL_WORDS['⌃']).toBe('Control')
    expect(KEY_SYMBOL_WORDS['⇧']).toBe('Shift')
  })

  it.each(MAC_WORDS)('reads %s as %s on macOS', (symbol, word) => {
    expect(keyPartToWords(symbol, 'macos')).toBe(word)
  })

  it('tests every symbol in the map', () => {
    expect(Object.keys(KEY_SYMBOL_WORDS).sort()).toEqual(MAC_WORDS.map(([symbol]) => symbol).sort())
  })

  it('uses the Windows and Linux names of the keys that differ', () => {
    for (const platformId of ['windows', 'linux']) {
      expect(keyPartToWords('↩', platformId)).toBe('Enter')
      expect(keyPartToWords('⌫', platformId)).toBe('Backspace')
      expect(keyPartToWords('⌦', platformId)).toBe('Delete')
      expect(keyPartToWords('↑', platformId)).toBe('Up Arrow')
      expect(keyPartToWords('⇧', platformId)).toBe('Shift')
    }
  })

  it('names a key that is one punctuation character', () => {
    expect(keyPartToWords(',')).toBe('Comma')
    expect(keyPartToWords('[')).toBe('Left Bracket')
    expect(keyPartToWords('\\')).toBe('Backslash')
    expect(keyPartToWords('+')).toBe('Plus')
  })

  it('leaves text without symbols as it is', () => {
    for (const part of ['P', 'Space', 'F12', 'Esc', 'Page Up', 'Ctrl', 'fn', 'Num+', '(plus)', ':wq', '1-7', 'G D']) {
      expect(keyPartToWords(part)).toBe(part)
    }
    // Names of Object.prototype members are ordinary text too.
    expect(keyPartToWords('constructor')).toBe('constructor')
  })

  it('reads symbols inside a longer key, separated by spaces', () => {
    expect(keyPartToWords('⇧⇧')).toBe('Shift Shift')
    expect(keyPartToWords('X ⌃F')).toBe('X Control F')
    expect(keyPartToWords('↑/↓')).toBe('Up Arrow / Down Arrow')
    expect(keyPartToWords('⏻ Hold 10s')).toBe('Power Button Hold 10s')
  })

  it('joins the parts of a shortcut with " + "', () => {
    expect(keysToWords(['⌘', '⇧', 'P'], 'macos')).toBe('Command + Shift + P')
    expect(keysToWords(parseKeyParts(['⌃', '⌥', '⌘'], '⏻'), 'macos')).toBe('Control + Option + Command + Power Button')
    expect(keysToWords(parseKeyParts([], 'Tab+↩'), 'macos')).toBe('Tab + Return')
    expect(keysToWords(parseKeyParts(['⌘'], '+'), 'macos')).toBe('Command + Plus')
    expect(keysToWords(['Ctrl', 'Shift', 'P'], 'windows')).toBe('Ctrl + Shift + P')
    expect(keysToWords(['Ctrl', '↩'], 'windows')).toBe('Ctrl + Enter')
  })
})

describe.each(PLATFORMS)('key symbols in the %s data', (platformId) => {
  const rows = allShortcuts(platformId)

  it('has shortcuts to scan', () => {
    expect(rows.length).toBeGreaterThan(100)
  })

  it('has a word for every symbol', () => {
    const missing = new Set()
    for (const { parts } of rows) {
      for (const part of parts) {
        for (const symbol of keySymbolsIn(part)) {
          if (!A_WORD.test(KEY_SYMBOL_WORDS[symbol] || '')) missing.add(symbol)
        }
      }
    }
    expect([...missing], 'symbols without a word in KEY_SYMBOL_WORDS (src/utils/platformHelpers.js)').toEqual([])
  })

  it('has a word for every punctuation key', () => {
    const missing = new Set()
    for (const { parts } of rows) {
      for (const part of parts) {
        if (isPunctuationKey(part) && !A_WORD.test(PUNCTUATION_KEY_WORDS[part] || '')) missing.add(part)
      }
    }
    expect([...missing], 'keys without a word in PUNCTUATION_KEY_WORDS (src/utils/platformHelpers.js)').toEqual([])
  })

  it('leaves no symbol in the words of any shortcut', () => {
    const left = rows
      .map((row) => ({ ...row, words: keysToWords(row.parts, platformId) }))
      .filter(({ words }) => KEY_SYMBOL.test(words) || /^\s|\s$|\s\s/.test(words) || words === '')
      .map(({ app, action, words }) => `${app}: ${action} → "${words}"`)
    expect(left).toEqual([])
  })
})
