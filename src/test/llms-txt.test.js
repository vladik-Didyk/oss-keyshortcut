import { describe, it, expect, beforeAll } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import { buildLlmsTxt } from '../../scripts/generate-llms-txt.mjs'
import { computeSiteStats } from '../../scripts/site-stats.mjs'
import { SITE_ORIGIN, pageUrl } from '../utils/siteUrl'
import { CONTENT } from '../data/content'
import routerConfig from '../../react-router.config.ts'

const ROOT = process.cwd()

describe('llms.txt', () => {
  let text
  let urls
  let pageUrls

  beforeAll(async () => {
    text = buildLlmsTxt(ROOT)
    urls = [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0])
    pageUrls = new Set((await routerConfig.prerender()).map(pageUrl))
  })

  it('starts with the site name and a one-paragraph summary', () => {
    const lines = text.split('\n')
    expect(lines[0]).toBe('# KeyShortcut')
    expect(lines[2].startsWith('> ')).toBe(true)
  })

  it('links only to pages of the build, in their canonical form, and to files that exist', () => {
    expect(urls.length).toBeGreaterThan(10)
    for (const url of urls) {
      expect(url.startsWith(`${SITE_ORIGIN}/`), `${url} is not on the site`).toBe(true)
      const path = url.slice(SITE_ORIGIN.length)
      const isFile = /\.[a-z]+$/.test(path)
      if (isFile) {
        expect(existsSync(join(ROOT, 'public', path)), `${url} has no file in public/`).toBe(true)
      } else {
        expect(pageUrls.has(url), `${url} is not a pre-rendered page`).toBe(true)
      }
    }
  })

  it('links to every platform index and every platform data file', () => {
    for (const id of Object.keys(computeSiteStats(ROOT).byPlatform)) {
      expect(urls).toContain(pageUrl(`/${id}`))
      expect(urls).toContain(`${SITE_ORIGIN}/data/platforms/${id}.json`)
    }
  })

  it('states the counts computed from the data', () => {
    const stats = computeSiteStats(ROOT)
    const appPages = Object.values(stats.byPlatform).reduce((sum, p) => sum + p.appCount, 0)
    expect(text).toContain(`${appPages.toLocaleString('en-US')} app pages`)
    expect(text).toContain(`${stats.appCount.toLocaleString('en-US')} apps`)
    expect(text).toContain(`${stats.shortcutCount.toLocaleString('en-US')} shortcuts`)
  })

  it('names the person the About page names, and the source of the shortcuts', () => {
    expect(text).toContain(CONTENT.about.cards.creator.name)
    expect(text).toContain('official documentation')
  })

  it('stays short and makes no claims about traffic', () => {
    expect(text.length).toBeLessThan(3000)
    expect(text).not.toMatch(/visitors|pageviews|page views|traffic|per month|monthly/i)
  })
})
