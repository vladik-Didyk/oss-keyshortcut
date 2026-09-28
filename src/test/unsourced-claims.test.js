import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

// The site repeated a statistic ("up to 8 working days per year", credited to
// Brainscape) with no link, year or study title. Rule: no unverified numbers
// or claims in anything public. This fails if the claim comes back anywhere
// under src/. src/test/ is skipped because the tests have to name the phrases.
const BANNED = [/working days/i, /brainscape/i]
const SRC = join(process.cwd(), 'src')
const TEXT_FILE = /\.(js|jsx|ts|tsx|mjs|json|css|md|html|txt)$/

function textFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return path === join(SRC, 'test') ? [] : textFiles(path)
    return TEXT_FILE.test(name) ? [path] : []
  })
}

describe('unsourced claims', () => {
  const files = textFiles(SRC)

  it('finds the source files', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files.map((f) => relative(SRC, f))).toContain('data/content.js')
    expect(files.map((f) => relative(SRC, f))).toContain('data/guides/keyboard-shortcuts-efficiency.js')
  })

  it('no text under src/ contains "working days" or "Brainscape"', () => {
    const hits = files.flatMap((file) => {
      const lines = readFileSync(file, 'utf-8').split('\n')
      return lines.flatMap((line, i) => (BANNED.some((re) => re.test(line)) ? [`${relative(process.cwd(), file)}:${i + 1}`] : []))
    })
    expect(hits).toEqual([])
  })
})
