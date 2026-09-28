import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { readFileSync } from 'fs'
import { join } from 'path'
import ShortcutPage from '../components/ShortcutPage'
import { CONTENT } from '../data/content'
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
