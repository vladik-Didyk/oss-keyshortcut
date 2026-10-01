import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { IMPACT_SCRIPT, IMPACT_UTT_URL } from '../lib/impact'

// Impact.com's tag shares what it records with brands, so it loads only for a
// visitor who accepted cookies, like the analytics tools.
const tagLoaded = () => [...document.scripts].some((s) => s.src === IMPACT_UTT_URL)

function runHeadScript() {
  // The page runs it as an inline script in the <head>.
  new Function(IMPACT_SCRIPT)()
}

describe('Impact.com tag', () => {
  beforeEach(() => {
    document.head.innerHTML = '<script></script>'
    localStorage.clear()
    delete window.ksImpact
    delete window.ksImpactOn
    delete window.impactStat
  })

  it.each([[null], ['declined']])('does not load when consent is %s', (consent) => {
    if (consent) localStorage.setItem('cookie-consent', consent)
    runHeadScript()
    expect(tagLoaded()).toBe(false)
    expect(typeof window.ksImpact).toBe('function')
  })

  it('loads once for a visitor who accepted, with the calls Impact gave', () => {
    localStorage.setItem('cookie-consent', 'accepted')
    runHeadScript()
    window.ksImpact()
    expect([...document.scripts].filter((s) => s.src === IMPACT_UTT_URL)).toHaveLength(1)
    expect(window.impactStat.a.map((args) => args[0])).toEqual(['transformLinks', 'trackImpression'])
  })

  it('loads when the visitor accepts on this page: initAnalytics calls it', () => {
    const analytics = readFileSync(join(process.cwd(), 'src/lib/analytics.js'), 'utf-8')
    expect(analytics).toMatch(/initialized = true;\s*\n\s*window\.ksImpact\?\.\(\)/)
  })

  it('is in the <head> of every page, and its host is allowed by the CSP', () => {
    const root = readFileSync(join(process.cwd(), 'src/root.jsx'), 'utf-8')
    expect(root).toContain('__html: IMPACT_SCRIPT')
    expect(root.match(/\$\{IMPACT_HOSTS\}/g)).toHaveLength(3)
  })
})
