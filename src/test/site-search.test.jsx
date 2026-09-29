import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { readFileSync } from 'fs'
import { join } from 'path'
import Navbar from '../components/Navbar'
import { CONTENT } from '../data/content'
import { PLATFORM_KEY } from '../utils/preferredPlatform'
import { resetPlatformData } from '../hooks/usePlatformData'
import { trackEvent } from '../lib/analytics'

vi.mock('../lib/analytics', async (importOriginal) => ({
  ...(await importOriginal()),
  trackEvent: vi.fn(),
}))

const c = CONTENT.shared.siteSearch
const data = (platform) => JSON.parse(readFileSync(join(process.cwd(), `public/data/platforms/${platform}.json`), 'utf-8'))
const WINDOWS_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

function Page() {
  return (
    <>
      <Navbar />
      <main><a href="#behind">A link of the page behind</a></main>
    </>
  )
}
const at = (path) => {
  const Stub = createRoutesStub([{ path: '*', Component: Page }])
  return render(<Stub initialEntries={[path]} />)
}
const openButton = () => screen.queryByRole('button', { name: c.open })
// The field and the search code load when the search opens.
const open = async () => {
  fireEvent.click(openButton())
  return screen.findByRole('dialog', { name: c.title })
}

beforeEach(() => {
  vi.stubGlobal('navigator', { userAgent: WINDOWS_UA })
  vi.stubGlobal('fetch', vi.fn((url) => {
    const id = /platforms\/(\w+)\.json/.exec(url)?.[1]
    return Promise.resolve({ ok: true, json: () => Promise.resolve(data(id)) })
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
  resetPlatformData()
  document.body.style.overflow = ''
})

describe('search in the navigation bar', () => {
  it.each(['/macos/vscode/', '/macos/vscode/toggle-comment/', '/guides/', '/about/', '/compare/figma-vs-sketch/', '/mac-hud/'])(
    'is on %s',
    (path) => {
      at(path)
      expect(openButton()).toBeInTheDocument()
    },
  )

  // These pages open with a search field of their own.
  it.each(['/', '/macos/', '/windows', '/linux/'])('is not on %s', (path) => {
    at(path)
    expect(openButton()).toBeNull()
  })

  it('asks for no data until it is opened', () => {
    at('/about/')
    expect(fetch).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens on the platform of the visitor and loads its shortcuts', async () => {
    at('/about/')
    const dialog = await open()
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Windows' })).toBeChecked()
    expect(screen.getByRole('combobox')).toHaveFocus()
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/data/platforms/windows.json'))
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('opens with Control + K and with Command + K', async () => {
    at('/about/')
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('finds a shortcut and shows its keys', async () => {
    at('/about/')
    await open()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'excel fill down' } })
    const row = await screen.findByRole('option', { name: /Fill Down/ })
    expect(row).toHaveTextContent('Ctrl')
    expect(row).toHaveTextContent('D')
  })

  it('says that shortcuts are loading before they are there', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    at('/about/')
    await open()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'excel' } })
    expect(await screen.findByText(CONTENT.home.loadingShortcuts)).toBeInTheDocument()
    expect(screen.queryByText(/No results/)).toBeNull()
  })

  it('moves through the results with the arrow keys', async () => {
    at('/about/')
    await open()
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'excel fill' } })
    await screen.findByRole('option', { name: /Fill Down/ })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id)
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true')
  })

  it('searches another platform when the visitor chooses one, and remembers it', async () => {
    at('/about/')
    await open()
    fireEvent.click(screen.getByRole('radio', { name: 'macOS' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/data/platforms/macos.json'))
    expect(localStorage.getItem(PLATFORM_KEY)).toBe('macos')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'vscode toggle comment' } })
    expect(await screen.findByRole('option', { name: /Toggle Comment/ })).toHaveTextContent('⌘')
  })

  it('closes with Escape and gives the focus back to its button', async () => {
    at('/about/')
    await open()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(openButton()).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })

  it('keeps Tab inside while it is open', async () => {
    at('/about/')
    await open()
    const stops = [...screen.getByRole('dialog').querySelectorAll('input, button')]
    const last = stops[stops.length - 1]
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(stops[0]).toHaveFocus()
    fireEvent.keyDown(stops[0], { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })

  it('reports that it was opened', async () => {
    at('/about/')
    await open()
    expect(trackEvent).toHaveBeenCalledWith('site_search_opened', { source: 'navbar' })
  })
})

describe('navigation bar on a phone', () => {
  // Classes without a breakpoint are what a phone gets.
  const phone = (el) => el.className.split(/\s+/).filter((name) => !/^(sm|md|lg|xl|pointer-fine):/.test(name))

  it('gives the search and the menu a target of 44 px', () => {
    at('/about/')
    expect(phone(openButton())).toEqual(expect.arrayContaining(['min-w-[44px]', 'h-[44px]']))
    const menu = screen.getByRole('button', { name: CONTENT.shared.navbar.openMenuLabel })
    expect(phone(menu)).toEqual(expect.arrayContaining(['w-[44px]', 'h-[44px]']))
  })

  it('gives every link of the menu a height of 44 px', () => {
    at('/about/')
    fireEvent.click(screen.getByRole('button', { name: CONTENT.shared.navbar.openMenuLabel }))
    const links = screen.getAllByRole('menuitem')
    expect(links.length).toBeGreaterThan(5)
    for (const link of links) expect(phone(link)).toContain('min-h-[44px]')
  })
})
