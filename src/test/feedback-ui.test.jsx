import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { readFileSync } from 'fs'
import { join } from 'path'
import ShortcutPage from '../components/ShortcutPage'
import { CONTENT } from '../data/content'
import { shortcutIds } from '../utils/feedbackIds'
import { myVotes, visitPage, sendVote, countDownload } from '../lib/feedback'
import { GUARD_DAYS, isItemId } from '../../server/feedback.js'

vi.mock('../lib/analytics', async (importOriginal) => ({
  ...(await importOriginal()),
  trackEvent: vi.fn(),
}))
vi.mock('../utils/generateShortcutPDF', () => ({ generateShortcutPDF: vi.fn() }))

// Votes and counts on the app page. Two rules: nothing of it shows until the
// server says it keeps votes, and the page prints only numbers the server sent.
const read = (path) => readFileSync(join(process.cwd(), path), 'utf-8')
const platformApps = (id) => JSON.parse(read(`public/data/platforms/${id}.json`)).apps
const figma = platformApps('macos').find((a) => a.slug === 'figma')
const c = CONTENT.shortcutPage.feedback
const PAGE = '/macos/figma'
const NONE = { views: null, downloads: null, confirmed: null, items: {} }

function page(app = figma, platformId = 'macos', platformName = 'macOS') {
  const data = { platformId, platformName, app, otherPlatforms: [], relatedApps: [], moreApps: [], otherPlatformsMap: {} }
  const Stub = createRoutesStub([{ id: 'app', path: '/:platformId/:slug', Component: ShortcutPage }])
  return <Stub initialEntries={[`/${platformId}/${app.slug}`]} hydrationData={{ loaderData: { app: data } }} />
}

// A stand-in for the three endpoints. `answers` is by path; the calls are kept.
function server(answers) {
  const calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path, options) => {
      calls.push({ path, body: JSON.parse(options.body) })
      const answer = answers[path]
      if (!answer) throw new TypeError('no such endpoint')
      const { status = 200, ...body } = answer
      return { status, json: async () => body }
    })
  )
  return calls
}

const voteBox = () => document.querySelector(`section[aria-label="${c.title}"]`)

beforeAll(() => {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ids of the shortcuts', () => {
  it('every shortcut of every page has an id of its own, in the shape the server accepts', () => {
    let rows = 0
    for (const platform of ['macos', 'windows', 'linux']) {
      for (const app of platformApps(platform)) {
        const ids = [...shortcutIds(app.sections).values()]
        rows += ids.length
        expect(new Set(ids).size, `${platform}/${app.slug}`).toBe(ids.length)
        for (const id of ids) expect(isItemId(id), `${platform}/${app.slug}: ${id}`).toBe(true)
        expect(ids).not.toContain('page')
      }
    }
    expect(rows).toBeGreaterThan(5000)
  })

  it('is made from the section and the action, and numbers a repeat', () => {
    const sections = [
      { name: 'Edit & Arrange', shortcuts: [{ action: 'Bring Forward' }, { action: 'Bring forward' }, { action: '→' }] },
      { name: '', shortcuts: [{ action: 'Zoom In (+)' }] },
    ]
    expect([...shortcutIds(sections).values()]).toEqual([
      'edit-arrange--bring-forward',
      'edit-arrange--bring-forward-2',
      'edit-arrange--shortcut',
      'section--zoom-in',
    ])
  })

  it('is in the page as it is served, one per row', () => {
    const html = renderToString(page())
    const served = [...html.matchAll(/data-item="([a-z0-9-]+)"/g)].map((m) => m[1])
    expect(served).toEqual([...shortcutIds(figma.sections).values()])
  })
})

describe('app page without a database', () => {
  it('shows no vote box, no number and no vote button, and the page works', async () => {
    const calls = server({ '/api/visit': { enabled: false } })
    render(page())
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(voteBox()).toBeNull()
    expect(document.body.textContent).not.toMatch(/Confirmed by|views in a month|PDF downloads/)
    expect(document.querySelector('button[aria-pressed]')).toBeNull()
    expect(screen.getByText(CONTENT.shortcutPage.report.title)).toBeInTheDocument()
  })

  it('stays the same when the endpoint is missing', async () => {
    const calls = server({})
    render(page())
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(voteBox()).toBeNull()
  })

  it('the served page has none of it', () => {
    const html = renderToString(page())
    expect(html).not.toContain(c.question)
    expect(html).not.toMatch(/Confirmed by/)
  })
})

describe('app page with votes', () => {
  const [firstId] = [...shortcutIds(figma.sections).values()]
  const numbers = { views: 1240, downloads: 38, confirmed: 14, items: { [firstId]: 5 } }

  it('asks the question and prints the numbers the server sent', async () => {
    server({ '/api/visit': { enabled: true, numbers } })
    render(page())
    await waitFor(() => expect(voteBox()).not.toBeNull())
    expect(voteBox().textContent).toContain(c.question)
    expect(voteBox().textContent).toContain('Confirmed by 14 visitors')
    expect(voteBox().textContent).toContain('1,240 views in a month')
    expect(voteBox().textContent).toContain('38 PDF downloads')
    expect(document.querySelector('header').textContent).toContain('Confirmed by 14 visitors')
    const row = document.querySelector(`tr[data-item="${firstId}"]`)
    expect(row.textContent).toContain('Confirmed by 5 visitors')
  })

  it('prints no number the server did not send', async () => {
    server({ '/api/visit': { enabled: true, numbers: NONE } })
    render(page())
    await waitFor(() => expect(voteBox()).not.toBeNull())
    expect(voteBox().textContent).toContain(c.question)
    expect(document.body.textContent).not.toMatch(/Confirmed by|views in a month|PDF downloads/)
    expect(voteBox().querySelector('ul')).toBeNull()
  })

  it('a vote is sent, shown as chosen, and remembered in the browser', async () => {
    const calls = server({
      '/api/visit': { enabled: true, numbers: NONE },
      '/api/vote': { enabled: true, changed: true, numbers: { ...NONE, confirmed: 3 } },
    })
    render(page())
    await waitFor(() => expect(voteBox()).not.toBeNull())
    const works = screen.getByRole('button', { name: c.worksLabel })
    expect(works).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(works)
    await waitFor(() => expect(voteBox().textContent).toContain('Confirmed by 3 visitors'))
    expect(calls.at(-1)).toEqual({ path: '/api/vote', body: { page: PAGE, item: 'page', vote: 'works' } })
    expect(works).toHaveAttribute('aria-pressed', 'true')
    expect(voteBox().querySelector('[role="status"]').textContent).toBe(c.thanksWorks)
    expect(myVotes(PAGE)).toEqual({ page: 'works' })
  })

  it('"Something is wrong" is counted and opens the report panel', async () => {
    const calls = server({
      '/api/visit': { enabled: true, numbers: NONE },
      '/api/vote': { enabled: true, changed: true, numbers: NONE },
    })
    Element.prototype.scrollIntoView = vi.fn()
    render(page())
    await waitFor(() => expect(voteBox()).not.toBeNull())
    const panel = screen.getByText(CONTENT.shortcutPage.report.title).closest('details')
    expect(panel.open).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: c.brokenLabel }))
    expect(panel.open).toBe(true)
    await waitFor(() => expect(calls.at(-1).body).toEqual({ page: PAGE, item: 'page', vote: 'broken' }))
    expect(voteBox().querySelector('[role="status"]').textContent).toBe(c.thanksBroken)
  })

  it('a vote the server refused is not shown as cast', async () => {
    server({
      '/api/visit': { enabled: true, numbers: NONE },
      '/api/vote': { status: 429, enabled: true, error: 'limit' },
    })
    render(page())
    await waitFor(() => expect(voteBox()).not.toBeNull())
    const works = screen.getByRole('button', { name: c.worksLabel })
    fireEvent.click(works)
    await waitFor(() => expect(works).toHaveAttribute('aria-pressed', 'false'))
    expect(myVotes(PAGE)).toEqual({})
  })

  it('shows the vote of an earlier visit', async () => {
    window.localStorage.setItem('ks-votes', JSON.stringify({ [PAGE]: { page: 'works' } }))
    server({ '/api/visit': { enabled: true, numbers: NONE } })
    render(page())
    await waitFor(() => expect(voteBox()).not.toBeNull())
    expect(screen.getByRole('button', { name: c.worksLabel })).toHaveAttribute('aria-pressed', 'true')
  })

  it('the buttons are controls a thumb can hit', async () => {
    server({ '/api/visit': { enabled: true, numbers: NONE } })
    render(page())
    await waitFor(() => expect(voteBox()).not.toBeNull())
    for (const button of voteBox().querySelectorAll('button')) {
      expect(button.className).toMatch(/(^| )min-h-\[44px\]/)
    }
  })

  it('a row can be confirmed where there is a mouse', async () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('hover'), addEventListener() {}, removeEventListener() {} }))
    const calls = server({
      '/api/visit': { enabled: true, numbers: NONE },
      '/api/vote': { enabled: true, changed: true, numbers: NONE },
    })
    render(page())
    await waitFor(() => expect(voteBox()).not.toBeNull())
    const action = figma.sections[0].shortcuts[0].action
    const button = screen.getAllByRole('button', { name: c.rowWorks(action) })[0]
    fireEvent.click(button)
    await waitFor(() => expect(calls.at(-1).body).toEqual({ page: PAGE, item: firstId, vote: 'works' }))
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('a PDF download is counted', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE }, '/api/download': { enabled: true } })
    render(page())
    await waitFor(() => expect(voteBox()).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: CONTENT.shortcutPage.downloadTitle }))
    await waitFor(() => expect(calls.at(-1)).toEqual({ path: '/api/download', body: { page: PAGE } }))
  })
})

describe('the browser side', () => {
  it('counts a page once per tab: a second visit only reads', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    await visitPage(PAGE)
    await visitPage(PAGE)
    await visitPage('/macos/chrome')
    expect(calls.map((call) => call.body)).toEqual([
      { page: PAGE, count: true },
      { page: PAGE, count: false },
      { page: '/macos/chrome', count: true },
    ])
  })

  it('a visit that was not counted is tried again', async () => {
    const calls = server({ '/api/visit': { enabled: false } })
    await visitPage(PAGE)
    await visitPage(PAGE)
    expect(calls.map((call) => call.body.count)).toEqual([true, true])
  })

  it('a browser driven by a program is not counted', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE }, '/api/download': { enabled: true } })
    vi.stubGlobal('navigator', { webdriver: true })
    await visitPage(PAGE)
    countDownload(PAGE)
    expect(calls).toEqual([{ path: '/api/visit', body: { page: PAGE, count: false } }])
  })

  it('answers "not enabled" when the request fails, and throws nothing', async () => {
    server({})
    expect(await visitPage(PAGE)).toEqual({ enabled: false })
    expect(await sendVote(PAGE, 'page', 'works')).toEqual({ enabled: false })
    expect(myVotes(PAGE)).toEqual({})
  })

  it('sets no cookie and calls no other host', () => {
    const source = read('src/lib/feedback.js')
    expect(source).not.toMatch(/document\.cookie/)
    expect(source).not.toMatch(/https?:\/\//)
    expect(source.match(/post\('([^']+)'/g).sort()).toEqual(["post('/api/download'", "post('/api/visit'", "post('/api/vote'"])
  })
})

describe('the privacy page says what is kept', () => {
  const section = CONTENT.privacy.policy.sections.find((s) => s.id === 'votes')
  const text = section.content.map((block) => block.text).join(' ')

  it('names the hash, the time it is kept, and the browser storage', () => {
    expect(text).toMatch(/salted hash/)
    expect(text).toContain(`deleted after ${GUARD_DAYS} days`)
    expect(text).toMatch(/local storage/)
    expect(text).toMatch(/no cookie/)
  })

  it('the page served at /privacy says the same', () => {
    const html = read('public/privacy.html')
    for (const block of section.content) expect(html).toContain(block.text)
  })
})
