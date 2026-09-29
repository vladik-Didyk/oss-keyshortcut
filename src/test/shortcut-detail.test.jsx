import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { readFileSync } from 'fs'
import { join } from 'path'
import ShortcutDetailPage from '../components/ShortcutDetailPage'
import ShortcutPage from '../components/ShortcutPage'
import { loader } from '../routes/shortcut-detail'
import { loader as appLoader } from '../routes/shortcut-page'
import { buildShortcutDetailJsonLd } from '../utils/structuredData'
import { shortcutDetailFaq } from '../utils/shortcutDetail'
import { CONTENT } from '../data/content'

vi.mock('../lib/analytics', async (importOriginal) => ({ ...(await importOriginal()), trackEvent: vi.fn() }))
vi.mock('../utils/generateShortcutPDF', () => ({ generateShortcutPDF: vi.fn() }))

// The page about one shortcut, as a visitor and a crawler get it.
const c = CONTENT.shortcutDetail
const dataOf = (platformId, slug, shortcutId) => loader({ params: { platformId, slug, shortcutId } })
const page = (data) => {
  const Stub = createRoutesStub([{ path: '*', Component: () => <ShortcutDetailPage data={data} /> }])
  return <Stub initialEntries={[`/${data.platformId}/${data.app.slug}/${data.shortcut.id}`]} />
}
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')

beforeAll(() => {
  vi.stubEnv('VITE_VOTES', 'off')
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('page about one shortcut', () => {
  it('is in the page as it is served: title, keys, what it does, questions and answers', async () => {
    const data = await dataOf('macos', 'vscode', 'toggle-comment')
    const html = renderToString(page(data))
    const served = text(html)
    expect(html).toContain('<h1')
    expect(served).toContain('Toggle Comment in VS Code (macOS)')
    expect(served).toContain('Press Command + Slash to comment out the current line or the selected lines, or remove the comment.')
    expect(served).toContain(data.shortcut.what)
    for (const item of shortcutDetailFaq(data)) {
      expect(served).toContain(item.question)
      expect(served).toContain(item.answer)
    }
    expect(html.match(/<details/g)).toHaveLength(2)
  })

  it('has one h1 and real key elements', async () => {
    render(page(await dataOf('macos', 'vscode', 'command-palette')))
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const large = [...document.querySelectorAll('kbd.keycap-large')].map((k) => k.textContent)
    expect(large).toEqual(['⇧', '⌘', 'P'])
  })

  it('the breadcrumb leads home, to the platform and to the app, each with the slash', async () => {
    render(page(await dataOf('windows', 'excel', 'autosum')))
    const crumbs = within(screen.getByRole('navigation', { name: c.breadcrumbLabel }))
    expect(crumbs.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Home', '/'],
      ['Windows shortcuts', '/windows/'],
      ['Excel', '/windows/excel/'],
    ])
    expect(crumbs.getByText('AutoSum')).toHaveAttribute('aria-current', 'page')
  })

  it('shows the same action on the other platforms, each a link to its page', async () => {
    render(page(await dataOf('macos', 'vscode', 'toggle-comment')))
    const table = within(screen.getByRole('table'))
    expect(table.getByRole('link', { name: 'Windows' })).toHaveAttribute('href', '/windows/vscode/toggle-comment/')
    expect(table.getByRole('link', { name: 'Linux' })).toHaveAttribute('href', '/linux/vscode/toggle-comment/')
    expect(table.getAllByRole('row')).toHaveLength(4)
  })

  it('says so where a platform lists the app without the action, and links to the app there', async () => {
    const data = await dataOf('windows', 'vscode', 'find-in-files')
    render(page(data))
    const table = within(screen.getByRole('table'))
    expect(table.getByRole('link', { name: 'macOS' })).toHaveAttribute('href', '/macos/vscode/')
    expect(table.getByText(c.noShortcut('VS Code', 'macOS'))).toBeInTheDocument()
    expect(shortcutDetailFaq(data)[1].answer).toBe('On Linux it is Ctrl+Shift+F.')
  })

  it('has no table and one question where no other platform has the action', async () => {
    const data = await dataOf('macos', 'safari', 'tab-overview')
    render(page(data))
    expect(screen.queryByRole('table')).toBeNull()
    expect(shortcutDetailFaq(data)).toHaveLength(1)
    expect(document.querySelectorAll('details')).toHaveLength(1)
  })

  it('lists five other shortcuts of the section, and links the ones that have a page', async () => {
    const data = await dataOf('macos', 'vscode', 'command-palette')
    render(page(data))
    const heading = screen.getByRole('heading', { name: c.relatedTitle('General', 'VS Code') })
    const items = within(heading.parentElement).getAllByRole('listitem')
    expect(items).toHaveLength(5)
    const linked = data.related.filter((r) => r.to)
    expect(linked.length).toBeGreaterThan(0)
    for (const r of linked) expect(within(heading.parentElement).getByRole('link', { name: r.action })).toHaveAttribute('href', `${r.to}/`)
  })

  it('links to the full list of the app, with the number of its shortcuts', async () => {
    const data = await dataOf('linux', 'vim', 'undo')
    render(page(data))
    expect(screen.getByRole('link', { name: c.fullList('Vim', 'Linux', data.app.shortcutCount) })).toHaveAttribute('href', '/linux/vim/')
  })

  it('the page of the operating system names it once', async () => {
    render(page(await dataOf('macos', 'macos', 'spotlight')))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Spotlight in macOS')
  })
})

describe('structured data of the page', () => {
  it('is the breadcrumb of the page and the questions the page shows', async () => {
    const data = await dataOf('macos', 'vscode', 'toggle-comment')
    const [breadcrumb, faq] = buildShortcutDetailJsonLd(data)
    expect(breadcrumb['@type']).toBe('BreadcrumbList')
    expect(breadcrumb.itemListElement.map((e) => [e.position, e.name, e.item])).toEqual([
      [1, 'Home', 'https://keyshortcut.com/'],
      [2, 'macOS shortcuts', 'https://keyshortcut.com/macos/'],
      [3, 'VS Code', 'https://keyshortcut.com/macos/vscode/'],
      [4, 'Toggle Comment', 'https://keyshortcut.com/macos/vscode/toggle-comment/'],
    ])
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(shortcutDetailFaq(data).map((i) => [i.question, i.answer]))
    expect(JSON.stringify([breadcrumb, faq])).not.toMatch(/dateModified|datePublished|aggregateRating|offers/)
  })

  it('the built page holds it, when a build is on disk', () => {
    let html
    try {
      html = readFileSync(join(process.cwd(), 'build/client/macos/vscode/toggle-comment/index.html'), 'utf-8')
    } catch {
      return
    }
    const types = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1])['@type'])
    expect(types).toEqual(expect.arrayContaining(['WebSite', 'BreadcrumbList', 'FAQPage']))
    expect(html).toContain('<link rel="canonical" href="https://keyshortcut.com/macos/vscode/toggle-comment/"/>')
  })
})

describe('the app page links to the pages of its shortcuts', () => {
  const appPage = (data) => {
    const Stub = createRoutesStub([{ id: 'app', path: '/:platformId/:slug', Component: ShortcutPage }])
    return <Stub initialEntries={[`/${data.platformId}/${data.app.slug}`]} hydrationData={{ loaderData: { app: data } }} />
  }

  it('a row whose shortcut has a page links to it; the other rows are plain text', async () => {
    const data = await appLoader({ params: { platformId: 'macos', slug: 'vscode' } })
    expect(data.shortcutLinks['Toggle Comment']).toBe('toggle-comment')
    render(appPage(data))
    const rows = [...document.querySelectorAll('tr[data-item]')]
    const linked = rows.filter((row) => row.querySelector('td a[href^="/macos/vscode/"]'))
    expect(linked).toHaveLength(Object.keys(data.shortcutLinks).length)
    const row = rows.find((r) => r.querySelector('td').textContent.startsWith('Toggle Comment'))
    expect(row.querySelector('td a').getAttribute('href')).toBe('/macos/vscode/toggle-comment/')
    expect(rows.length).toBeGreaterThan(linked.length)
  })

  it('an app without notes has no such link', async () => {
    const data = await appLoader({ params: { platformId: 'macos', slug: '1password' } })
    expect(data.shortcutLinks).toEqual({})
    render(appPage(data))
    expect(document.querySelector('tr[data-item] td a')).toBeNull()
  })

  it('the link looks like the text around it and shows on hover', async () => {
    render(appPage(await appLoader({ params: { platformId: 'macos', slug: 'vscode' } })))
    const link = document.querySelector('tr[data-item] td a')
    expect(link.className).toMatch(/text-inherit/)
    expect(link.className).toMatch(/hover:underline/)
  })
})
