import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'
import PdfBundleOffer from '../components/PdfBundleOffer'
import { PDF_BUNDLE, getPdfBundle } from '../data/products'
import { CONTENT } from '../data/content'
import { MAC_APP_COUNT } from '../data/siteConfig'
import { buildBundle } from '../utils/generateShortcutPDF'
import { trackEvent } from '../lib/analytics'

vi.mock('../lib/analytics', async (importOriginal) => ({
  ...(await importOriginal()),
  trackEvent: vi.fn(),
}))

// The PDF bundle: the file that is sold, and its offer on /cheat-sheets.
const read = (path) => readFileSync(join(process.cwd(), path), 'utf-8')
const macos = JSON.parse(read('public/data/platforms/macos.json')).apps
const SET = { link: 'https://seller.example/buy/bundle', price: '$9', platform: 'macos' }
const c = CONTENT.cheatSheetsPage.bundle

describe('the offer', () => {
  it('is not shown while the link or the price is missing', () => {
    for (const bundle of [PDF_BUNDLE_EMPTY(), { ...SET, link: '' }, { ...SET, price: '' }]) {
      const { container, unmount } = render(<PdfBundleOffer bundle={bundle} />)
      expect(container.innerHTML).toBe('')
      unmount()
    }
  })

  it('refuses a link that is not https and a price that is not a price', () => {
    for (const wrong of [{ link: 'http://seller.example' }, { link: 'javascript:alert(1)' }, { price: '9' }, { price: '$9.5' }, { price: 'free' }, { price: '$9 only today' }]) {
      expect(getPdfBundle({ ...SET, ...wrong })).toBeNull()
    }
    expect(getPdfBundle(SET)).toEqual(SET)
    expect(getPdfBundle({ ...SET, price: '$9.50' })).not.toBeNull()
  })

  it('names what is sold, the price, and that the single sheets stay free', () => {
    render(<PdfBundleOffer bundle={SET} />)
    expect(screen.getByRole('heading', { name: `All ${MAC_APP_COUNT} macOS cheat sheets in one PDF` })).toBeInTheDocument()
    expect(screen.getByText(/single sheets below stay free/)).toBeInTheDocument()
    const button = screen.getByRole('link', { name: /Get the bundle . \$9$/ })
    expect(button).toHaveAttribute('href', SET.link)
    expect(button).toHaveAttribute('target', '_blank')
    expect(button.getAttribute('rel')).toContain('noopener')
    expect(button.className).toMatch(/(^| )min-h-\[44px\]/)
  })

  it('counts the click', () => {
    render(<PdfBundleOffer bundle={SET} />)
    fireEvent.click(screen.getByRole('link'))
    expect(trackEvent).toHaveBeenCalledWith('pdf_bundle_clicked', { platform: 'macos', price: '$9' })
  })

  it('types no count and no price into the copy', () => {
    expect(read('src/data/content.js')).toContain('title: `All ${MAC_APP_COUNT} macOS cheat sheets in one PDF`')
    expect(c.text).not.toMatch(/\d/)
    expect(c.button('$9')).not.toMatch(/\d.*\d/)
  })

  it('the page shows it above the list, and the privacy page names the seller\'s part', () => {
    const page = read('src/components/CheatSheetsPage.jsx')
    expect(page.indexOf('<PdfBundleOffer')).toBeGreaterThan(0)
    expect(page.indexOf('<PdfBundleOffer')).toBeLessThan(page.indexOf('{/* Filters */}'))
    const privacy = JSON.stringify(CONTENT.privacy.policy.sections)
    expect(privacy).toMatch(/PDF bundle of cheat sheets is sold and delivered by the seller/)
    expect(read('public/privacy.html')).toMatch(/PDF bundle of cheat sheets is sold and delivered by the seller/)
  })
})

function PDF_BUNDLE_EMPTY() {
  return { link: '', price: '', platform: 'macos' }
}

describe('the file', () => {
  const some = macos.filter((app) => ['figma', 'chrome', 'excel', 'vscode', 'notes', 'safari'].includes(app.slug))
  const bundle = buildBundle({ apps: some, platformName: 'macOS', date: 'September 2026' })

  it('has a cover, the contents, and a sheet for every app', () => {
    expect(bundle.apps).toBe(some.length)
    expect(bundle.shortcuts).toBe(some.reduce((sum, app) => sum + app.shortcutCount, 0))
    expect(bundle.entries.map((e) => e.slug).sort()).toEqual(some.map((app) => app.slug).sort())
    expect(bundle.pages).toBeGreaterThanOrEqual(2 + some.length)
  })

  it('lists the apps by category, then by name', () => {
    const order = bundle.entries.map((e) => `${e.category}|${e.name}`)
    expect(order).toEqual([...order].sort((a, b) => a.localeCompare(b)))
  })

  it('gives every app the page its sheet starts on', () => {
    const pages = bundle.entries.map((e) => e.page)
    expect(pages[0]).toBe(3)
    expect(pages).toEqual([...pages].sort((a, b) => a - b))
    expect(new Set(pages).size).toBe(pages.length)
    expect(pages.at(-1)).toBeLessThanOrEqual(bundle.pages)
  })

  it('leaves out an app that has no shortcut', () => {
    const empty = { slug: 'empty', displayName: 'Empty', category: 'Design', shortcutCount: 0, sections: [{ name: 'None', shortcuts: [] }] }
    expect(buildBundle({ apps: [...some, empty], platformName: 'macOS', date: 'x' }).apps).toBe(some.length)
  })

  it('is a PDF', () => {
    const bytes = new Uint8Array(bundle.doc.output('arraybuffer'))
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('the script writes outside the site and outside git', () => {
    const script = read('scripts/build-pdf-bundle.mjs')
    expect(script).toContain("join(root, 'dist', 'products')")
    expect(read('.gitignore').split('\n')).toContain('dist')
    expect(JSON.parse(read('package.json')).scripts['pdf-bundle']).toBe('node scripts/build-pdf-bundle.mjs')
  })

  it('no offer is configured until the seller has the file', () => {
    // The day the link is set, the price must be set with it.
    expect(Boolean(PDF_BUNDLE.link)).toBe(Boolean(PDF_BUNDLE.price))
  })
})
