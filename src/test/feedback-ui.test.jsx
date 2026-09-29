import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { readFileSync } from 'fs'
import { join } from 'path'
import ShortcutPage from '../components/ShortcutPage'
import { CONTENT } from '../data/content'
import { shortcutIds } from '../utils/feedbackIds'
import { myVotes, visitPage, sendVote, countDownload, votesOn, VOTES_SWITCH } from '../lib/feedback'
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

const voteBar = () => document.querySelector(`section[aria-label="${c.title}"]`)

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

// The switch (votesOn) is off until the site has its database. Off means off:
// no request, nothing on the page.
describe('app page while the switch is off', () => {
  it('asks the server nothing and shows nothing of it', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    render(page())
    await new Promise((done) => setTimeout(done, 20))
    expect(calls).toEqual([])
    expect(voteBar()).toBeNull()
    expect(document.body.textContent).not.toMatch(/Confirmed by|views in a month|PDF downloads/)
    expect(document.querySelector('button[aria-pressed]')).toBeNull()
    expect(screen.getByText(CONTENT.shortcutPage.report.title)).toBeInTheDocument()
  })

  it('the served page has none of it', () => {
    const html = renderToString(page())
    expect(html).not.toContain(c.prompt)
    expect(html).not.toMatch(/Confirmed by/)
  })

  it('is off in the code that is committed', () => {
    expect(VOTES_SWITCH).toBe(false)
    expect(votesOn()).toBe(false)
  })
})

describe('app page with the switch on', () => {
  const [firstId] = [...shortcutIds(figma.sections).values()]
  const numbers = { views: 1240, downloads: 38, confirmed: 14, items: { [firstId]: 5 } }

  beforeEach(() => {
    vi.stubEnv('VITE_VOTES', 'on')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('the bar is in the page as it is served, with the question and no number', () => {
    const html = renderToString(page())
    expect(html).toContain(c.prompt)
    expect(html).toContain(c.hint)
    expect(html).toContain(`aria-label="${c.title}"`)
    expect(html).not.toMatch(/Confirmed by|views in a month|PDF downloads/)
  })

  it('sits at the top: after the header, before the list, and it sticks', async () => {
    server({ '/api/visit': { enabled: true, numbers } })
    render(page())
    await waitFor(() => expect(voteBar().textContent).toContain('Confirmed by'))
    expect(document.querySelector('header').nextElementSibling).toBe(voteBar())
    const list = document.querySelector('table.shortcut-table')
    expect(voteBar().compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(voteBar().className).toMatch(/(^| )sticky( |$)/)
    expect(voteBar().style.top).toBe('48px')
  })

  it('prints the numbers the server sent, and says it in green', async () => {
    server({ '/api/visit': { enabled: true, numbers } })
    render(page())
    await waitFor(() => expect(voteBar().textContent).toContain('Confirmed by 14 visitors'))
    expect(voteBar().textContent).toContain('1,240 views in a month')
    expect(voteBar().textContent).toContain('38 PDF downloads')
    expect(voteBar().className).toContain('bg-theme-good-soft')
    expect(screen.getByText('Confirmed by 14 visitors').className).toContain('text-theme-good')
    const row = document.querySelector(`tr[data-item="${firstId}"]`)
    expect(row.textContent).toContain('Confirmed by 5 visitors')
    expect(row.querySelector('span[title]').className).toContain('text-theme-good')
  })

  it('a phone shows one count in the second line, so the line does not wrap', async () => {
    server({ '/api/visit': { enabled: true, numbers } })
    render(page())
    await waitFor(() => expect(voteBar().textContent).toContain('38 PDF downloads'))
    const facts = [...voteBar().querySelectorAll('[role="status"] li')]
    expect(facts.map((li) => /(^| )hidden( |$)/.test(li.className))).toEqual([false, true])
    expect(facts[1].className).toContain('sm:inline-flex')
  })

  it('prints no number the server did not send: the question and a hint stay', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    render(page())
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(voteBar().textContent).toContain(c.prompt)
    expect(voteBar().textContent).toContain(c.hint)
    expect(document.body.textContent).not.toMatch(/Confirmed by|views in a month|PDF downloads/)
  })

  it('always has two lines, so its height does not change when the numbers arrive', async () => {
    const lines = () => [voteBar().querySelector('p'), voteBar().querySelector('[role="status"]')].map((el) => el.textContent)
    server({ '/api/visit': { enabled: true, numbers: { ...NONE, confirmed: 14 } } })
    render(page())
    expect(lines()).toEqual([c.prompt, c.hint])
    await waitFor(() => expect(lines()).toEqual(['Confirmed by 14 visitors', c.hintToo]))
    expect(voteBar().firstElementChild.className).toMatch(/(^| )min-h-\[60px\]/)
  })

  it('goes away when the server keeps no votes', async () => {
    const calls = server({ '/api/visit': { enabled: false } })
    render(page())
    expect(voteBar()).not.toBeNull()
    await waitFor(() => expect(calls).toHaveLength(1))
    await waitFor(() => expect(voteBar()).toBeNull())
    expect(document.querySelector('button[aria-pressed]')).toBeNull()
  })

  it('a vote is sent, shown as chosen, and remembered in the browser', async () => {
    const calls = server({
      '/api/visit': { enabled: true, numbers: NONE },
      '/api/vote': { enabled: true, changed: true, numbers: { ...NONE, confirmed: 3 } },
    })
    render(page())
    await waitFor(() => expect(calls).toHaveLength(1))
    const works = screen.getByRole('button', { name: c.worksLabel })
    expect(works).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(works)
    await waitFor(() => expect(voteBar().textContent).toContain('Confirmed by 3 visitors'))
    expect(calls.at(-1)).toEqual({ path: '/api/vote', body: { page: PAGE, item: 'page', vote: 'works' } })
    expect(works).toHaveAttribute('aria-pressed', 'true')
    expect(works.className).toContain('vote-pop')
    expect(voteBar().querySelector('[role="status"]').textContent).toBe(c.thanksWorks)
    expect(myVotes(PAGE)).toEqual({ page: 'works' })
  })

  it('the thanks give way to the counts after a moment', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      server({
        '/api/visit': { enabled: true, numbers },
        '/api/vote': { enabled: true, changed: true, numbers },
      })
      render(page())
      await waitFor(() => expect(voteBar().textContent).toContain('1,240 views in a month'))
      fireEvent.click(screen.getByRole('button', { name: c.worksLabel }))
      expect(voteBar().querySelector('[role="status"]').textContent).toBe(c.thanksWorks)
      await act(async () => {
        vi.advanceTimersByTime(4100)
      })
      expect(voteBar().querySelector('[role="status"]').textContent).toContain('1,240 views in a month')
    } finally {
      vi.useRealTimers()
    }
  })

  it('"Not right" is counted and opens the report panel', async () => {
    const calls = server({
      '/api/visit': { enabled: true, numbers: NONE },
      '/api/vote': { enabled: true, changed: true, numbers: NONE },
    })
    Element.prototype.scrollIntoView = vi.fn()
    render(page())
    await waitFor(() => expect(calls).toHaveLength(1))
    const panel = screen.getByText(CONTENT.shortcutPage.report.title).closest('details')
    expect(panel.open).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: c.brokenLabel }))
    expect(panel.open).toBe(true)
    await waitFor(() => expect(calls.at(-1).body).toEqual({ page: PAGE, item: 'page', vote: 'broken' }))
    expect(voteBar().querySelector('[role="status"]').textContent).toBe(c.thanksBroken)
  })

  it('a vote the server refused is not shown as cast', async () => {
    const calls = server({
      '/api/visit': { enabled: true, numbers: NONE },
      '/api/vote': { status: 429, enabled: true, error: 'limit' },
    })
    render(page())
    await waitFor(() => expect(calls).toHaveLength(1))
    const works = screen.getByRole('button', { name: c.worksLabel })
    fireEvent.click(works)
    await waitFor(() => expect(calls).toHaveLength(2))
    await waitFor(() => expect(works).toHaveAttribute('aria-pressed', 'false'))
    expect(myVotes(PAGE)).toEqual({})
  })

  it('shows the vote of an earlier visit', async () => {
    window.localStorage.setItem('ks-votes', JSON.stringify({ [PAGE]: { page: 'works' } }))
    server({ '/api/visit': { enabled: true, numbers: NONE } })
    render(page())
    await waitFor(() => expect(screen.getByRole('button', { name: c.worksLabel })).toHaveAttribute('aria-pressed', 'true'))
  })

  it('the buttons are controls a thumb can hit, and each has a name', async () => {
    server({ '/api/visit': { enabled: true, numbers: NONE } })
    render(page())
    const buttons = [...voteBar().querySelectorAll('button')]
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([c.worksLabel, c.brokenLabel])
    for (const button of buttons) {
      expect(button.className).toMatch(/(^| )min-h-\[44px\]/)
      expect(button.className).toMatch(/(^| )min-w-\[44px\]/)
    }
  })

  it('a row can be confirmed where there is a mouse', async () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('hover'), addEventListener() {}, removeEventListener() {} }))
    const calls = server({
      '/api/visit': { enabled: true, numbers: NONE },
      '/api/vote': { enabled: true, changed: true, numbers: NONE },
    })
    render(page())
    await waitFor(() => expect(calls).toHaveLength(1))
    const action = figma.sections[0].shortcuts[0].action
    const button = screen.getAllByRole('button', { name: c.rowWorks(action) })[0]
    fireEvent.click(button)
    await waitFor(() => expect(calls.at(-1).body).toEqual({ page: PAGE, item: firstId, vote: 'works' }))
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('a PDF download is counted', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE }, '/api/download': { enabled: true } })
    render(page())
    await waitFor(() => expect(calls).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: CONTENT.shortcutPage.downloadTitle }))
    await waitFor(() => expect(calls.at(-1)).toEqual({ path: '/api/download', body: { page: PAGE } }))
  })
})

// The green of the bar, and what reads on it.
describe('the green', () => {
  const css = read('src/index.css')
  const value = (name) => css.match(new RegExp(`${name}: (#[0-9A-Fa-f]{6});`))[1]
  const light = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contrast = (a, b) => {
    const [hi, lo] = [light(a), light(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  it('text and button read well: 4.5 to 1 or more', () => {
    const good = value('--theme-good')
    expect(contrast(good, value('--theme-good-soft'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(good, '#F5F0E8')).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#FFFFFF', good)).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#FFFFFF', value('--theme-good-hover'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#1A1A1A', value('--theme-good-soft'))).toBeGreaterThanOrEqual(4.5)
  })

  it('the border of a control is seen: 3 to 1 or more', () => {
    expect(contrast(value('--theme-good-border'), value('--theme-good-soft'))).toBeGreaterThanOrEqual(3)
    expect(contrast(value('--theme-good-border'), '#F5F0E8')).toBeGreaterThanOrEqual(3)
  })

  it('the jump of the button stops for a visitor who asked for less motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.vote-pop \{\s*animation: none;/)
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
