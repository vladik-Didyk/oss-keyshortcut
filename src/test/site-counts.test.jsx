import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { computeSiteStats } from '../../scripts/site-stats.mjs'
import {
  APP_COUNT, SHORTCUT_COUNT, APP_PAGE_COUNT, PAGES_WITH_DOCS, MAC_APP_COUNT, fillCounts, withCounts,
} from '../data/siteConfig'
import { CONTENT } from '../data/content'
import { GUIDES } from '../data/guides/index.js'
import AboutPage from '../components/AboutPage'

// How many apps and shortcuts the site has is computed in one place,
// scripts/site-stats.mjs, from public/data/. Nothing else may carry the number.
const stats = computeSiteStats(process.cwd())

const read = (path) => readFileSync(join(process.cwd(), path), 'utf-8')

const filesUnder = (dir) =>
  readdirSync(join(process.cwd(), dir)).flatMap((name) => {
    const path = join(dir, name)
    return statSync(join(process.cwd(), path)).isDirectory() ? filesUnder(path) : [path]
  })

describe('site counts', () => {
  it('come from the data', () => {
    const platforms = JSON.parse(readFileSync(join(process.cwd(), 'public/data/platforms.json'), 'utf-8'))
    const apps = platforms.flatMap(({ id }) =>
      JSON.parse(readFileSync(join(process.cwd(), `public/data/platforms/${id}.json`), 'utf-8')).apps
    )
    expect(APP_COUNT).toBe(new Set(apps.map((a) => a.slug)).size)
    expect(APP_PAGE_COUNT).toBe(apps.length)
    expect(SHORTCUT_COUNT).toBe(apps.reduce((n, a) => n + a.shortcutCount, 0))
    expect(PAGES_WITH_DOCS).toBe(apps.filter((a) => a.docsUrl).length)
    expect(MAC_APP_COUNT).toBe(stats.byPlatform.macos.appCount)
  })

  it('are not typed by hand anywhere in the site copy', () => {
    // "60+ apps", "over 100 applications", "7,000 shortcuts" ... as plain text.
    // A count written as ${APP_COUNT} or {appCount} does not match.
    const typed = /\b(?:over |more than |all )?\d[\d,]{1,}\+? (?:supported |popular |macOS |Mac |Windows |Linux )?(?:apps|applications|app pages)\b/i
    const files = [...filesUnder('src/data'), ...filesUnder('src/components'), ...filesUnder('src/routes'), ...filesUnder('src/layouts')]
      .filter((f) => /\.(js|jsx|ts)$/.test(f))
    const found = []
    for (const file of files) {
      readFileSync(join(process.cwd(), file), 'utf-8').split('\n').forEach((line, i) => {
        if (typed.test(line)) found.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`)
      })
    }
    expect(found, 'use APP_COUNT / MAC_APP_COUNT from src/data/siteConfig.js, or {appCount} / {macAppCount} in a guide').toEqual([])
  })
})

describe('counts in guides', () => {
  const texts = (guide) =>
    guide.sections.flatMap((section) =>
      (section.content || []).flatMap((block) => [block.text, ...(block.items || [])]).filter((t) => typeof t === 'string')
    )

  it('fillCounts writes the numbers in', () => {
    expect(fillCounts('{appCount} apps, {macAppCount} on the Mac')).toBe(`${APP_COUNT} apps, ${MAC_APP_COUNT} on the Mac`)
    expect(fillCounts('no count here')).toBe('no count here')
  })

  it('some guide names a count, and every name is one fillCounts knows', () => {
    const all = GUIDES.flatMap(texts)
    expect(all.some((t) => t.includes('{appCount}'))).toBe(true)
    for (const text of all) expect(fillCounts(text), text).not.toMatch(/\{[a-zA-Z]+\}/)
  })

  it('the guide route hands the page a guide with the numbers in it', () => {
    for (const guide of GUIDES) {
      const filled = withCounts(guide)
      expect(JSON.stringify(filled), guide.slug).not.toMatch(/\{(appCount|macAppCount)\}/)
      expect(filled.sections).toHaveLength(guide.sections.length)
      expect(filled.slug).toBe(guide.slug)
    }
    expect(read('src/routes/guide-page.jsx')).toContain('withCounts(guide)')
  })

  it('titles and descriptions carry no count: scripts print them as they are', () => {
    for (const guide of GUIDES) {
      expect(`${guide.title} ${guide.description}`, guide.slug).not.toMatch(/\{[a-zA-Z]+\}/)
    }
  })
})

describe('About page', () => {
  const words = (text) => text.trim().split(/\s+/).length
  const body = CONTENT.about.sections.flatMap((s) => s.paragraphs).join(' ')

  it('is short', () => {
    expect(words(body)).toBeLessThan(260)
  })

  it('shows the counts of today', () => {
    const { container } = render(<AboutPage />)
    const text = container.textContent
    expect(text).toContain(`${APP_COUNT} apps`)
    expect(text).toContain(`${SHORTCUT_COUNT.toLocaleString('en-US')} shortcuts`)
    expect(text).toContain(`${PAGES_WITH_DOCS} of the ${APP_PAGE_COUNT} app pages`)
  })

  it('makes no claim the site cannot show', () => {
    // The scheduled check of the docs is switched off (GitHub, inactivity), and
    // the site has ${APP_COUNT} apps, not hundreds.
    expect(body).not.toMatch(/hundreds of apps|regularly|pipeline|automatic/i)
    expect(body).not.toMatch(/\d+\+? hours/)
  })
})
