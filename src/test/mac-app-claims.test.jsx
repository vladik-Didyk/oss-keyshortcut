import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CONTENT } from '../data/content'
import { GUIDES } from '../data/guides/index.js'
import GuideCtaBanner from '../components/GuideCtaBanner'

const read = (path) => readFileSync(join(process.cwd(), path), 'utf-8')

// Active app detection is off when the app is first opened. A page that
// promises it says once where to switch it on.
describe('active app detection', () => {
  const NOTE = 'Switch it on in Settings.'
  const times = (text) => text.split(NOTE).length - 1

  it('the Mac app page says once where to switch it on', () => {
    const page = JSON.stringify(CONTENT.productPage) + CONTENT.meta.productPage.description
    expect(page).toMatch(/detects your active app/)
    expect(times(page)).toBe(1)
  })

  it('app pages and the About page say it next to the promise', () => {
    for (const text of [CONTENT.shortcutPage.ctaSubtitle, CONTENT.about.cards.creator.bio]) {
      expect(text).toMatch(/detects (the|your) active app/)
      expect(times(text)).toBe(1)
    }
  })

  it('a guide says it once: in the banner that closes the page', () => {
    expect(times(render(<GuideCtaBanner />).container.textContent)).toBe(1)
    expect(times(render(<GuideCtaBanner settingsNote={false} />).container.textContent)).toBe(0)
    expect(read('src/components/GuidePage.jsx').split('<GuideCtaBanner />')).toHaveLength(2)
    expect(times(JSON.stringify(GUIDES))).toBe(0)
  })
})

// The Mac app page tells search engines about the app in a SoftwareApplication
// block. An offer in it says "this can be bought now", so it may appear only
// while there is a store URL.
describe('Mac app structured data', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  async function softwareApplication(appStoreId) {
    vi.resetModules()
    vi.stubEnv('VITE_APP_STORE_ID', appStoreId)
    const route = await import('../routes/product-page')
    const Stub = createRoutesStub([{ id: 'mac', path: '/mac-hud', Component: route.default }])
    const html = renderToString(
      <Stub initialEntries={['/mac-hud']} hydrationData={{ loaderData: { mac: { appCategories: [] } } }} />
    )
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const blocks = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent))
    return blocks.find((block) => block['@type'] === 'SoftwareApplication')
  }

  it('has no offer while the app cannot be bought', async () => {
    const app = await softwareApplication('')
    expect(app.name).toBe('KeyShortcut')
    expect(app).not.toHaveProperty('offers')
    expect(app).not.toHaveProperty('downloadUrl')
  })

  it('has an offer that points at the store once the store ID is set', async () => {
    const app = await softwareApplication('6760172007')
    expect(app.downloadUrl).toBe('https://apps.apple.com/app/keyshortcut/id6760172007')
    expect(app.offers.url).toBe(app.downloadUrl)
    expect(app.offers.price).toBe('7.99')
  })
})
