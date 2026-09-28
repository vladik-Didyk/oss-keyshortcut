import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { readFileSync } from 'fs'
import { join } from 'path'
import ShortcutPage from '../components/ShortcutPage'
import { CONTENT } from '../data/content'
import { keysToWords, parseKeyParts } from '../utils/platformHelpers'
import { trackEvent } from '../lib/analytics'

vi.mock('../lib/analytics', async (importOriginal) => ({
  ...(await importOriginal()),
  trackEvent: vi.fn(),
}))

const read = (path) => readFileSync(join(process.cwd(), path), 'utf-8')

const APP = {
  slug: 'test-app',
  displayName: 'Test App',
  category: 'Design',
  shortcutCount: 5,
  docsUrl: 'https://example.com/shortcuts',
  sections: [
    {
      name: 'General',
      shortcuts: [
        { action: 'Command Palette', modifiers: ['⌘', '⇧'], key: 'P' },
        { action: 'Delete Line', modifiers: ['⌘'], key: '⌫' },
        { action: 'Settings', modifiers: ['⌘'], key: ',' },
      ],
    },
    {
      name: 'Navigation',
      shortcuts: [
        { action: 'Move Up', modifiers: ['⌥'], key: '↑' },
        { action: 'Next Tab', modifiers: ['⌃'], key: 'Tab' },
      ],
    },
  ],
}

const pageData = (app, platformId = 'macos', platformName = 'macOS') => ({
  platformId,
  platformName,
  app,
  otherPlatforms: [],
  relatedApps: [],
  moreApps: [],
  otherPlatformsMap: {},
})

function page(data = pageData(APP)) {
  const Stub = createRoutesStub([{ id: 'app', path: '/:platformId/:slug', Component: ShortcutPage }])
  return (
    <Stub
      initialEntries={[`/${data.platformId}/${data.app.slug}`]}
      hydrationData={{ loaderData: { app: data } }}
    />
  )
}

const faqItems = (app = APP) => CONTENT.shortcutPage.faqItems(app, 'macOS')
const expandedCalls = () => trackEvent.mock.calls.filter(([name]) => name === 'faq_item_expanded')
const faqParts = (item) => {
  const answer = screen.getByText(item.answer)
  const details = answer.closest('details')
  return { answer, details, summary: details.querySelector('summary') }
}

beforeAll(() => {
  // jsdom has no IntersectionObserver (useScrollspy).
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

beforeEach(() => {
  trackEvent.mockClear()
})

describe('app page FAQ', () => {
  it('has every answer in the page before any click', () => {
    render(page())
    const items = faqItems()
    expect(items.length).toBeGreaterThanOrEqual(3)
    for (const item of items) {
      const { answer, details, summary } = faqParts(item)
      expect(answer).toBeInTheDocument()
      expect(answer.closest('script')).toBeNull()
      expect(summary).toHaveTextContent(item.question)
      expect(details.open).toBe(false)
    }
    expect(expandedCalls()).toHaveLength(0)
  })

  it('has every answer in the server-rendered HTML, outside the JSON-LD', () => {
    const figma = JSON.parse(read('public/data/platforms/macos.json')).apps.find((a) => a.slug === 'figma')
    const doc = new DOMParser().parseFromString(renderToString(page(pageData(figma))), 'text/html')
    const jsonLd = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent).join('')
    doc.querySelectorAll('script').forEach((s) => s.remove())
    const items = faqItems(figma)
    expect(items.length).toBeGreaterThanOrEqual(3)
    for (const item of items) {
      expect(jsonLd).toContain(JSON.stringify(item.answer))
      expect(doc.body.textContent).toContain(item.answer)
    }
    expect(doc.querySelectorAll('details > summary + div > p')).toHaveLength(items.length)
  })

  it('opens and closes', () => {
    render(page())
    const { answer, details, summary } = faqParts(faqItems()[0])
    expect(answer).not.toBeVisible()

    fireEvent.click(summary)
    expect(details.open).toBe(true)
    expect(answer).toBeVisible()

    fireEvent.click(summary)
    expect(details.open).toBe(false)
    expect(answer).not.toBeVisible()
  })

  it('opens one item without opening the others', () => {
    render(page())
    const [first, second] = faqItems().map(faqParts)
    fireEvent.click(first.summary)
    expect(first.details.open).toBe(true)
    expect(second.details.open).toBe(false)
  })

  it('can be reached with the keyboard', () => {
    render(page())
    const { summary } = faqParts(faqItems()[0])
    expect(summary).not.toHaveAttribute('tabindex')
    summary.focus()
    expect(summary).toHaveFocus()
  })

  it('fires faq_item_expanded once when an item opens, and not when it closes', async () => {
    render(page())
    const item = faqItems()[0]
    const { details, summary } = faqParts(item)

    fireEvent.click(summary)
    await waitFor(() => expect(expandedCalls()).toHaveLength(1))
    expect(expandedCalls()[0]).toEqual(['faq_item_expanded', { question: item.question }])

    let closed = false
    details.addEventListener('toggle', () => { closed = !details.open })
    fireEvent.click(summary)
    await waitFor(() => expect(closed).toBe(true))
    expect(expandedCalls()).toHaveLength(1)
  })
})

describe('app page shortcut rows', () => {
  const rowOf = (action) => screen.getAllByText(action).map((el) => el.closest('tr')).find(Boolean)

  it('carries the shortcut in words, hidden visually, next to keycaps hidden from screen readers', () => {
    render(page())
    const row = rowOf('Command Palette')

    const words = within(row).getByText('Command + Shift + P')
    expect(words.tagName).toBe('SPAN')
    expect(words).toHaveClass('sr-only')
    expect(row.querySelectorAll('.sr-only')).toHaveLength(1)

    const keycaps = [...row.querySelectorAll('kbd')]
    expect(keycaps.map((k) => k.textContent)).toEqual(['⌘', '⇧', 'P'])
    for (const keycap of keycaps) expect(keycap).toHaveAttribute('aria-hidden', 'true')

    expect(within(row).getByRole('button')).toHaveAccessibleName(
      'Copy shortcut Command + Shift + P for Command Palette'
    )
  })

  it('reads key symbols and punctuation keys as words', () => {
    render(page())
    expect(within(rowOf('Delete Line')).getByText('Command + Delete')).toHaveClass('sr-only')
    expect(within(rowOf('Settings')).getByText('Command + Comma')).toHaveClass('sr-only')
    expect(within(rowOf('Move Up')).getByText('Option + Up Arrow')).toHaveClass('sr-only')
    expect(within(rowOf('Next Tab')).getByText('Control + Tab')).toHaveClass('sr-only')
  })

  it('holds nothing in the hidden text but the shortcut of its own row', () => {
    const { container } = render(page())
    const shortcuts = APP.sections.flatMap((s) => s.shortcuts)
    const rows = [...container.querySelectorAll('table.shortcut-table tbody tr')]
    expect(rows).toHaveLength(shortcuts.length)
    rows.forEach((row, i) => {
      const parts = parseKeyParts(shortcuts[i].modifiers, shortcuts[i].key)
      expect(row.querySelector('.sr-only').textContent).toBe(keysToWords(parts, 'macos'))
      expect([...row.querySelectorAll('kbd')].map((k) => k.textContent)).toEqual(parts)
    })
  })

  it('uses the words Windows pages already show', () => {
    const app = {
      ...APP,
      sections: [{ name: 'General', shortcuts: [{ action: 'Send', modifiers: ['Ctrl'], key: '↩' }] }],
      shortcutCount: 1,
    }
    render(page(pageData(app, 'windows', 'Windows')))
    expect(within(rowOf('Send')).getByText('Ctrl + Enter')).toHaveClass('sr-only')
  })

  it('still copies the keys as shown', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(page())

    fireEvent.click(within(rowOf('Command Palette')).getByRole('button'))

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('⌘ + ⇧ + P')
    await waitFor(() =>
      expect(trackEvent).toHaveBeenCalledWith('shortcut_copied', {
        app: 'test-app',
        platform: 'macos',
        action: 'Command Palette',
        combo: '⌘ + ⇧ + P',
      })
    )
    delete navigator.clipboard
  })
})

describe('app page author line', () => {
  const { name } = CONTENT.about.cards.creator

  it('names the author of the About page and links there', () => {
    render(page())
    const link = screen.getByRole('link', { name })
    expect(link).toHaveAttribute('href', '/about')
    expect(link.closest('p')).toHaveTextContent(`${CONTENT.shortcutPage.author.label} ${name}`)
  })

  it('sits under the verification badge', () => {
    render(page())
    const line = screen.getByRole('link', { name }).closest('p')
    expect(line.previousElementSibling).toHaveTextContent('Verified against official docs')
  })

  it('takes the name from the About page copy, not from a second copy', () => {
    expect(name).toBeTruthy()
    expect(read('src/components/AuthorLine.jsx')).not.toContain(name)
    expect(read('src/components/ShortcutPage.jsx')).not.toContain(name)
    expect(read('src/data/content.js').split(name)).toHaveLength(2)
  })
})
