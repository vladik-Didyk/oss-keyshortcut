import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'

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
