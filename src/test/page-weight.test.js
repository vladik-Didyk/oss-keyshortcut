import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { gzipSync } from 'zlib'
import { APP_NOTES } from '../data/appNotes'
import { GUIDES } from '../data/guides/index.js'

// What a page sends to the browser. Until 2026-09-29 every page loaded the
// hand-written notes of all apps (126 KB) and the text of all guides (110 KB),
// because src/data/content.js and the footer imported them.
const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'test' ? [] : files(path)
    return ['.js', '.jsx', '.ts'].includes(extname(name)) ? [path] : []
  })
const importers = (pattern) =>
  files(SRC)
    .filter((path) => pattern.test(readFileSync(path, 'utf-8')))
    .map((path) => path.slice(ROOT.length + 1))
    .sort()

describe('what every page loads', () => {
  it('the notes of the apps are read by the loader of the app page, and by nothing else', () => {
    expect(importers(/from ['"][^'"]*\/appNotes(\.js)?['"]/)).toEqual(['src/routes/shortcut-page.jsx'])
  })

  it('the guides are read by the pages of the guides, and by nothing every page holds', () => {
    const allowed = ['src/components/GuidePage.jsx', 'src/components/GuidesIndex.jsx', 'src/routes/guide-page.jsx', 'src/routes/guides-index.jsx']
    const others = importers(/from ['"][^'"]*\/guides(\/index)?(\.js)?['"]/).filter((path) => !allowed.includes(path))
    expect(others).toEqual([])
  })
})

const ASSETS = join(ROOT, 'build/client/assets')
describe.skipIf(!existsSync(ASSETS))('scripts of a build', () => {
  const scripts = existsSync(ASSETS) ? readdirSync(ASSETS).filter((name) => name.endsWith('.js')) : []
  const text = (name) => readFileSync(join(ASSETS, name), 'utf-8')
  const loadedBy = (page) =>
    [...new Set(readFileSync(join(ROOT, 'build/client', page, 'index.html'), 'utf-8').match(/assets\/[\w.-]+\.js/g))].map((path) => path.slice(7))
  const weight = (page) => loadedBy(page).reduce((sum, name) => sum + gzipSync(text(name)).length, 0)

  it('hold no note of an app', () => {
    const sentence = APP_NOTES.vscode.overview.slice(0, 60)
    expect(scripts.filter((name) => text(name).includes(sentence))).toEqual([])
  })

  it('hold the text of a guide only in the scripts of the guide pages', () => {
    // A sentence of the first guide, as a script would hold it.
    const sentence = JSON.stringify(GUIDES[0].sections).match(/[A-Z][a-z]+(?: [a-z]+){7,}/)[0]
    const holders = scripts.filter((name) => text(name).includes(sentence))
    expect(holders.length).toBeGreaterThan(0)
    for (const page of ['', 'macos/vscode', 'macos', 'about']) {
      expect(loadedBy(page).filter((name) => holders.includes(name)), `/${page}`).toEqual([])
    }
  })

  // As it travels. 212 KB on an app page before 2026-09-29.
  it.each([['macos/vscode', 190_000], ['', 185_000], ['windows', 185_000], ['macos/vscode/toggle-comment', 180_000]])(
    'weigh less than before on /%s',
    (page, limit) => {
      expect(weight(page)).toBeLessThan(limit)
    },
  )
})
