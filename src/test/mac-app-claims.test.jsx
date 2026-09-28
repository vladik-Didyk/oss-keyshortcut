import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { CONTENT } from '../data/content'
import { GUIDES } from '../data/guides/index.js'
import GuideCtaBanner from '../components/GuideCtaBanner'

// What the site says about the Mac app was checked against the app's source
// (build 3) on 2026-09-28. Three claims were untrue and were removed:
//   - the app creates custom shortcuts (it has no way to; it imports packs)
//   - "use it forever"
//   - the app "sends nothing over the internet" (it downloads shortcut data)
// This fails if one of them comes back. src/test/ is not scanned, because the
// tests have to name the phrases.
const read = (path) => readFileSync(join(process.cwd(), path), 'utf-8')

const filesUnder = (dir) =>
  readdirSync(join(process.cwd(), dir)).flatMap((name) => {
    const path = join(dir, name)
    return statSync(join(process.cwd(), path)).isDirectory() ? filesUnder(path) : [path]
  })

const FILES = [
  ...['src/data', 'src/components', 'src/routes'].flatMap(filesUnder).filter((f) => /\.(js|jsx|ts)$/.test(f)),
  'public/privacy.html',
]

const hits = (files, patterns, allowed = []) =>
  files.flatMap((file) =>
    read(file).split('\n').flatMap((line, i) =>
      patterns.some((re) => re.test(line)) && !allowed.some((text) => line.includes(text))
        ? [`${file}:${i + 1}: ${line.trim().slice(0, 120)}`]
        : []
    )
  )

const FOREVER = [/use it forever/i]
const NOTHING_SENT = [/sends? nothing over the internet/i]
// A promise that the Mac app makes shortcuts of your own.
const CUSTOM = [/custom shortcut/i, /global hotkey/i, /create your own/i, /your shortcuts, your rules/i]

describe('claims about the Mac app', () => {
  it('finds the files', () => {
    expect(FILES.length).toBeGreaterThan(80)
    for (const file of ['src/data/content.js', 'src/data/guides/shortcut-collections.js', 'src/components/FAQ.jsx', 'src/routes/product-page.jsx']) {
      expect(FILES).toContain(file)
    }
  })

  it('no text says "use it forever"', () => {
    expect(hits(FILES, FOREVER)).toEqual([])
  })

  it('no text says the app sends nothing over the internet', () => {
    expect(hits(FILES, NOTHING_SENT)).toEqual([])
  })

  it('no product copy promises custom shortcuts', () => {
    // Guides are checked below: they may write about custom shortcuts in macOS
    // and in other tools. The cheat sheet sentence is about the notes of a PDF.
    const productCopy = FILES.filter((f) => !f.startsWith('src/data/guides/'))
    const allowed = ['Use the notes section to write your own custom shortcuts']
    expect(hits(productCopy, CUSTOM, allowed)).toEqual([])
  })

  it('no guide says that KeyShortcut makes custom shortcuts', () => {
    // A title with its description, or one section, is one statement. It may
    // name KeyShortcut, or custom shortcuts, not both.
    const textOf = (section) =>
      [section.heading, ...(section.content || []).flatMap((block) => [
        block.text,
        ...(block.items || []),
        ...(block.shortcuts || []).map((s) => s.action),
      ])].filter((t) => typeof t === 'string').join(' ')
    const found = []
    for (const guide of GUIDES) {
      const parts = [
        ['title and description', `${guide.title} ${guide.description}`],
        ...guide.sections.map((section) => [`#${section.id}`, textOf(section)]),
      ]
      for (const [name, text] of parts) {
        if (/KeyShortcut/.test(text) && CUSTOM.some((re) => re.test(text))) found.push(`${guide.slug} ${name}`)
      }
    }
    expect(found).toEqual([])
  })

  it.each([
    ['Create custom shortcuts for anything. Assign a global hotkey and trigger them from anywhere on your Mac.', CUSTOM],
    ['You can also import custom shortcut packs or create your own.', CUSTOM],
    ['supports custom shortcuts with global hotkeys', CUSTOM],
    ['Custom shortcuts you create', CUSTOM],
    ['Pay once, use it forever.', FOREVER],
    ['collects no data, sends nothing over the internet, and requires no account', NOTHING_SENT],
  ])('the patterns catch a removed sentence: %s', (sentence, patterns) => {
    expect(patterns.some((re) => re.test(sentence))).toBe(true)
  })
})

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
