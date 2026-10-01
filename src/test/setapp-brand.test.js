import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { AFFILIATES, PLATFORM_FALLBACK } from '../data/affiliates'

// Setapp's brand cheat sheet (sent by MacPaw's affiliate manager, 2026-09-29):
// - the name is "Setapp", never "SetApp", "SETAPP", "Set App" or "SA";
// - Setapp is never called a bundle, a store, a subscription service,
//   "Netflix for apps" or an alternative to the App Store;
// - approved lines: "A shortcut to the best Mac apps",
//   "An essential toolbox for macOS and iOS".
// src/test/ is skipped because the tests have to name the phrases.
const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const PUBLIC_TEXT = ['public/privacy.html', 'public/llms.txt'].map((f) => join(ROOT, f)).filter(existsSync)
const TEXT_FILE = /\.(js|jsx|ts|tsx|mjs|json|css|md|html|txt)$/

const WRONG_NAME = /\bSetApp\b|\bSETAPP\b|\bSet App\b/
const MENTIONS = /\bsetapp\b/i
const WRONG_WORDS = /\bbundle|\bstore\b|subscription service|netflix|alternative to (the )?app store/i
const APPROVED_LINES = ['A shortcut to the best Mac apps', 'An essential toolbox for macOS and iOS']

function textFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return path === join(SRC, 'test') ? [] : textFiles(path)
    return TEXT_FILE.test(name) ? [path] : []
  })
}

function lines() {
  return [...textFiles(SRC), ...PUBLIC_TEXT].flatMap((file) =>
    readFileSync(file, 'utf-8').split('\n').map((text, i) => ({ where: `${relative(ROOT, file)}:${i + 1}`, text })),
  )
}

const setappEntries = [...Object.values(AFFILIATES), ...Object.values(PLATFORM_FALLBACK)].filter((e) =>
  e.program.startsWith('Setapp'),
)

describe('Setapp brand rules', () => {
  it('finds the Setapp entry', () => {
    expect(setappEntries.length).toBeGreaterThan(0)
  })

  it('writes the name "Setapp" and nothing else', () => {
    expect(lines().filter((l) => WRONG_NAME.test(l.text)).map((l) => l.where)).toEqual([])
  })

  it('never calls Setapp a bundle, a store or a subscription service', () => {
    const hits = lines().filter((l) => MENTIONS.test(l.text) && WRONG_WORDS.test(l.text))
    expect(hits.map((l) => l.where)).toEqual([])
  })

  it('the card says "Setapp" and its lines are ones Setapp approved', () => {
    for (const entry of setappEntries) {
      expect(entry.label).toMatch(/\bSetapp\b/)
      expect(entry.name).toBe('Setapp')
      expect(APPROVED_LINES).toContain(entry.title)
      expect(APPROVED_LINES).toContain(entry.text.replace(/\.$/, ''))
    }
  })
})
