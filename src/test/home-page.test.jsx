import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { gzipSync } from 'zlib'
import DirectoryHomepage from '../components/DirectoryHomepage'
import { loader } from '../routes/home'
import { PLATFORM_KEY, preferredPlatform, platformScript } from '../utils/preferredPlatform'
import { slimApp } from '../utils/slimApps'
import { resetPlatformData } from '../hooks/usePlatformData'
import { CONTENT } from '../data/content'

const read = (path) => readFileSync(join(process.cwd(), path), 'utf-8')
const data = (platform) => JSON.parse(read(`public/data/platforms/${platform}.json`))
const IDS = ['macos', 'windows', 'linux']

const UA = {
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  macos: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  linux: 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
}

function visitor({ userAgent = UA.macos, hint, stored } = {}) {
  vi.stubGlobal('navigator', { userAgent, userAgentData: hint ? { platform: hint } : undefined })
  localStorage.clear()
  if (stored) localStorage.setItem(PLATFORM_KEY, stored)
}

let loaderData
beforeAll(async () => {
  loaderData = await loader()
  // jsdom has neither (category sections, the category bar).
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  }
})

const page = () => {
  const Stub = createRoutesStub([{ id: 'home', path: '/', Component: DirectoryHomepage }])
  return <Stub initialEntries={['/']} hydrationData={{ loaderData: { home: loaderData } }} />
}
const panel = (container, id) => container.querySelector(`[data-panel="${id}"]`)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
  resetPlatformData()
})

describe('home page data', () => {
  it('holds the app list of every platform, and no shortcuts', () => {
    expect(Object.keys(loaderData.directory)).toEqual(loaderData.manifest.platforms.map((p) => p.id))
    for (const id of IDS) {
      const apps = data(id).apps
      expect(loaderData.directory[id].apps).toEqual(apps.map(slimApp))
      for (const app of loaderData.directory[id].apps) {
        expect(Object.keys(app).sort()).toEqual(['category', 'displayName', 'shortcutCount', 'slug'])
      }
    }
    // The whole of it is a fraction of what one platform's shortcuts weigh.
    expect(JSON.stringify(loaderData).length).toBeLessThan(40_000)
  })
})

describe('home page as it is served', () => {
  const html = () => new DOMParser().parseFromString(renderToString(page()), 'text/html')

  it('lists every app of every platform, each with a link to its page', () => {
    const doc = html()
    for (const id of IDS) {
      const links = new Set([...panel(doc, id).querySelectorAll('a[href]')].map((a) => a.getAttribute('href')))
      for (const app of data(id).apps) expect(links).toContain(`/${id}/${app.slug}/`)
    }
  })

  it('is served for macOS, with the script that chooses the platform as its first element', () => {
    const root = html().querySelector('[data-home]')
    expect(root.getAttribute('data-platform')).toBe('macos')
    expect(root.firstElementChild.tagName).toBe('SCRIPT')
    expect(root.firstElementChild.textContent).toBe(platformScript(IDS, 'macos'))
  })

  it('shows one panel and one chosen tab by CSS, for each platform of the data', () => {
    const css = html().querySelector('[data-home] > style').textContent
    expect(css).toContain('[data-home] [data-panel]{display:none}')
    for (const id of IDS) {
      expect(css).toContain(`[data-home][data-platform="${id}"] [data-panel="${id}"]{display:block}`)
      expect(css).toContain(`[data-home][data-platform="${id}"] [data-tab="${id}"]{`)
    }
  })

  it('carries no shortcut: an action of the data is not in the page', () => {
    const text = renderToString(page())
    expect(text).not.toContain('Toggle Comment')
    expect(text).not.toContain('"sections"')
  })
})

describe('the platform a visitor gets', () => {
  const cases = [
    ['a Windows visitor', { userAgent: UA.windows }, 'windows'],
    ['a Windows visitor, by client hint', { userAgent: UA.windows, hint: 'Windows' }, 'windows'],
    ['a Mac visitor', { userAgent: UA.macos }, 'macos'],
    ['a Linux visitor', { userAgent: UA.linux }, 'linux'],
    ['a Linux visitor, by client hint', { userAgent: UA.linux, hint: 'Linux' }, 'linux'],
    ['an Android phone', { userAgent: UA.android }, 'macos'],
    ['an iPhone', { userAgent: UA.iphone }, 'macos'],
    ['a Mac visitor who chose Windows before', { userAgent: UA.macos, stored: 'windows' }, 'windows'],
    ['a stored value that is no platform', { userAgent: UA.windows, stored: 'amiga' }, 'windows'],
  ]

  // The script of the page and the code of the component must agree, or the
  // page shows one platform and searches another.
  it.each(cases)('%s', (_, who, expected) => {
    visitor(who)
    expect(preferredPlatform(IDS, 'macos')).toBe(expected)

    const holder = document.createElement('div')
    Object.defineProperty(document, 'currentScript', { configurable: true, get: () => ({ parentElement: holder }) })
    new Function(platformScript(IDS, 'macos'))()
    delete document.currentScript
    expect(holder.getAttribute('data-platform')).toBe(expected)
  })

  it('falls back when storage is closed', () => {
    visitor({ userAgent: UA.windows })
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('closed')
    })
    expect(preferredPlatform(IDS, 'macos')).toBe('windows')
    spy.mockRestore()
  })
})

describe('home page in the browser', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in this test')))))

  it('opens on the platform of the visitor', async () => {
    visitor({ userAgent: UA.windows })
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network'))))
    const { container } = render(page())
    await waitFor(() => expect(container.querySelector('[data-home]').getAttribute('data-platform')).toBe('windows'))
    expect(screen.getByRole('radio', { name: 'Windows' })).toBeChecked()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('remembers a platform the visitor chooses, and asks for no data', async () => {
    visitor({ userAgent: UA.macos })
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network'))))
    const { container } = render(page())
    fireEvent.click(screen.getByRole('radio', { name: 'Linux' }))
    expect(container.querySelector('[data-home]').getAttribute('data-platform')).toBe('linux')
    expect(localStorage.getItem(PLATFORM_KEY)).toBe('linux')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('filters the panel of a platform by category', async () => {
    visitor({ userAgent: UA.windows })
    const { container } = render(page())
    const windows = panel(container, 'windows')
    const office = data('windows').apps.filter((a) => a.category === 'Microsoft Office')
    fireEvent.click(within(windows).getByRole('button', { name: /Office/ }))
    const names = [...windows.querySelectorAll('a.app-card p:first-of-type')].map((p) => p.textContent)
    expect(names.sort()).toEqual(office.map((a) => a.displayName).sort())
  })

  it('loads the shortcuts when the visitor turns to the search, and finds one', async () => {
    visitor({ userAgent: UA.macos })
    const macos = data('macos')
    vi.stubGlobal('fetch', vi.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(url.includes('macos') ? macos : { apps: [] }) })))
    render(page())
    const input = screen.getByRole('combobox')
    expect(fetch).not.toHaveBeenCalled()

    fireEvent.focus(input)
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/data/platforms/macos.json'))
    fireEvent.change(input, { target: { value: 'vscode toggle comment' } })
    await waitFor(() => expect(screen.getAllByText('Toggle Comment').length).toBeGreaterThan(0))
  })

  it('finds an app by name before the shortcuts are there', async () => {
    visitor({ userAgent: UA.macos })
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(page())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'figma' } })
    await waitFor(() => expect(screen.getAllByText('Figma').length).toBeGreaterThan(0))
    expect(screen.queryByText(/No results/)).toBeNull()
  })

  it('says that shortcuts are loading, not that there are none', async () => {
    visitor({ userAgent: UA.macos })
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(page())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzz' } })
    await waitFor(() => expect(screen.getAllByText(CONTENT.home.loadingShortcuts).length).toBeGreaterThan(0))
    expect(screen.queryByText(/No results/)).toBeNull()
  })
})

describe('home page as it is built', () => {
  const file = join(process.cwd(), 'build/client/index.html')

  it.skipIf(!existsSync(file))('weighs a fraction of what it did with every macOS shortcut in it', () => {
    const html = readFileSync(file, 'utf-8')
    // Before 2026-09-29, with the macOS list alone: 704 KB, 139 KB as it travels.
    // With the lists of all three platforms and no shortcuts: 408 KB, 28 KB.
    expect(html.length).toBeLessThan(450_000)
    expect(gzipSync(html).length).toBeLessThan(40_000)
    for (const id of IDS) expect(html).toContain(`data-panel="${id}"`)
  })
})
