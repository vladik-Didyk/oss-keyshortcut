import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { readFileSync } from 'fs'
import { join } from 'path'
import ShortcutPage from '../components/ShortcutPage'
import { CONTENT } from '../data/content'
import { getAppNote } from '../data/appNotes'
import { shortcutIds } from '../utils/feedbackIds'
import { myVotes, visitPage, countViewOnSign, sendVote, countDownload, votesOn, VOTES_SWITCH } from '../lib/feedback'
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
  const data = { platformId, platformName, app, note: getAppNote(app.slug, platformId) ?? null, otherPlatforms: [], relatedApps: [], moreApps: [], otherPlatformsMap: {} }
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

const voteCard = () => document.querySelector(`section[aria-label="${c.title}"]`)

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

// The switch (votesOn) can be put off for one build. Off means off: no request,
// nothing on the page.
describe('app page while the switch is off', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_VOTES', 'off')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('asks the server nothing and shows nothing of it', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    render(page())
    await new Promise((done) => setTimeout(done, 20))
    expect(calls).toEqual([])
    expect(voteCard()).toBeNull()
    expect(document.body.textContent).not.toMatch(/Confirmed by|views in a month|PDF downloads/)
    expect(document.querySelector('button[aria-pressed]')).toBeNull()
    expect(screen.getByText(CONTENT.shortcutPage.report.title)).toBeInTheDocument()
  })

  it('the served page has none of it', () => {
    const html = renderToString(page())
    expect(html).not.toContain(c.prompt)
    expect(html).not.toMatch(/Confirmed by/)
  })

  it('is off for the build that asks for it', () => {
    expect(votesOn()).toBe(false)
  })
})

describe('the switch in the code that is committed', () => {
  it('is on, and one build can put it off', () => {
    expect(VOTES_SWITCH).toBe(true)
    expect(votesOn()).toBe(true)
    vi.stubEnv('VITE_VOTES', 'off')
    expect(votesOn()).toBe(false)
    vi.unstubAllEnvs()
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

  it('the card is in the page as it is served, with the question and no number', () => {
    const html = renderToString(page())
    expect(html).toContain(c.prompt)
    expect(html).toContain(c.empty)
    expect(html).toContain(`aria-label="${c.title}"`)
    expect(html).not.toMatch(/Confirmed by|views in a month|PDF downloads/)
  })

  it('sits at the top: after the header, before the text and the list, and scrolls with the page', async () => {
    server({ '/api/visit': { enabled: true, numbers } })
    render(page())
    await waitFor(() => expect(voteCard().textContent).toContain('Confirmed by'))
    expect(document.querySelector('header').nextElementSibling).toBe(voteCard())
    const list = document.querySelector('table.shortcut-table')
    expect(voteCard().compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    for (const el of [voteCard(), ...voteCard().querySelectorAll('*')]) {
      expect(String(el.getAttribute('class'))).not.toMatch(/(^| )(sticky|fixed)( |$)/)
    }
  })

  it('prints the numbers the server sent, large and in green', async () => {
    server({ '/api/visit': { enabled: true, numbers } })
    render(page())
    await waitFor(() => expect(voteCard().textContent).toContain('Confirmed by 14 visitors'))
    expect(voteCard().textContent).toContain('1,240 views in a month')
    expect(voteCard().textContent).toContain('38 PDF downloads')
    expect(voteCard().firstElementChild.className).toContain('bg-theme-good-soft')
    const stats = [...voteCard().querySelectorAll('li')]
    expect(stats.map((li) => li.querySelector('.sr-only').textContent)).toEqual([
      'Confirmed by 14 visitors',
      '1,240 views in a month',
      '38 PDF downloads',
    ])
    expect(stats.map((li) => li.querySelector('.tabular-nums + span').textContent)).toEqual(['say it works', 'views in a month', 'PDF downloads'])
    for (const li of stats) expect(li.querySelector('.tabular-nums').className).toMatch(/text-theme-good/)
    const row = document.querySelector(`tr[data-item="${firstId}"]`)
    expect(row.textContent).toContain('Confirmed by 5 visitors')
    expect(row.querySelector('span[title]').className).toContain('text-theme-good')
  })

  it('shows a number at once to a visitor who asked for less motion', async () => {
    vi.stubGlobal('matchMedia', (query) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
    server({ '/api/visit': { enabled: true, numbers: { ...NONE, views: 12480 } } })
    render(page())
    await waitFor(() => expect(voteCard().querySelector('li')).not.toBeNull())
    expect(voteCard().querySelector('li .tabular-nums').textContent).toBe('12,480')
  })

  it('prints only the numbers the server sent', async () => {
    server({ '/api/visit': { enabled: true, numbers: { ...NONE, views: 1240 } } })
    render(page())
    await waitFor(() => expect(voteCard().textContent).toContain('1,240 views in a month'))
    expect(voteCard().querySelectorAll('li')).toHaveLength(1)
    expect(voteCard().textContent).not.toMatch(/Confirmed by|PDF downloads/)
  })

  it('says "1" in the singular, on the card and on a row', async () => {
    server({ '/api/visit': { enabled: true, numbers: { views: 1, downloads: 1, confirmed: 1, items: { [firstId]: 1 } } } })
    render(page())
    await waitFor(() => expect(voteCard().querySelectorAll('li')).toHaveLength(3))
    const stats = [...voteCard().querySelectorAll('li')]
    expect(stats.map((li) => li.querySelector('.sr-only').textContent)).toEqual([
      'Confirmed by 1 visitor',
      '1 view in a month',
      '1 PDF download',
    ])
    expect(stats.map((li) => li.querySelector('.tabular-nums + span').textContent)).toEqual(['says it works', 'view in a month', 'PDF download'])
    expect(document.querySelector(`tr[data-item="${firstId}"]`).textContent).toContain('Confirmed by 1 visitor')
  })

  it('a small number does not count up from zero', async () => {
    server({ '/api/visit': { enabled: true, numbers: { ...NONE, confirmed: 3 } } })
    render(page())
    await waitFor(() => expect(voteCard().querySelector('li')).not.toBeNull())
    expect(voteCard().querySelector('li .tabular-nums').textContent).toBe('3')
  })

  // A count below the minimum is not public. The visitor who voted still sees
  // that the vote was taken: their own line, in the place of the count.
  describe('a vote on a page whose count is not public yet', () => {
    const own = () => voteCard().querySelector('li[data-stat="own"]')

    it('shows "You said it works" at once, and no number', async () => {
      const calls = server({
        '/api/visit': { enabled: true, numbers: NONE },
        '/api/vote': { enabled: true, changed: true, numbers: NONE },
      })
      render(page())
      await waitFor(() => expect(calls).toHaveLength(1))
      expect(voteCard().textContent).toContain(c.empty)
      fireEvent.click(screen.getByRole('button', { name: c.worksLabel }))
      expect(own()).not.toBeNull()
      expect(own().querySelector('.sr-only').textContent).toBe('You said it works')
      expect(own().querySelector('.tabular-nums').textContent).toBe('You')
      expect(own().querySelector('.tabular-nums + span').textContent).toBe('said it works')
      await waitFor(() => expect(calls).toHaveLength(2))
      expect(voteCard().textContent).not.toContain(c.empty)
      expect(voteCard().textContent).not.toMatch(/Confirmed by|\d/)
    })

    it('shows "You said it is not right" for the other answer', async () => {
      // "Not right" also opens the report panel and scrolls to it.
      Element.prototype.scrollIntoView = vi.fn()
      const calls = server({
        '/api/visit': { enabled: true, numbers: NONE },
        '/api/vote': { enabled: true, changed: true, numbers: NONE },
      })
      render(page())
      await waitFor(() => expect(calls).toHaveLength(1))
      fireEvent.click(screen.getByRole('button', { name: c.brokenLabel }))
      expect(own().querySelector('.sr-only').textContent).toBe('You said it is not right')
    })

    it('is there again on the next visit, from the browser', async () => {
      window.localStorage.setItem('ks-votes', JSON.stringify({ [PAGE]: { page: 'works' } }))
      const calls = server({ '/api/visit': { enabled: true, numbers: { ...NONE, views: 240 } } })
      render(page())
      await waitFor(() => expect(calls).toHaveLength(1))
      await waitFor(() => expect(own()).not.toBeNull())
      expect([...voteCard().querySelectorAll('li')].map((li) => li.querySelector('.sr-only').textContent)).toEqual([
        'You said it works',
        '240 views in a month',
      ])
    })

    it('gives way to the count once the count is public', async () => {
      window.localStorage.setItem('ks-votes', JSON.stringify({ [PAGE]: { page: 'works' } }))
      server({ '/api/visit': { enabled: true, numbers: { ...NONE, confirmed: 3 } } })
      render(page())
      await waitFor(() => expect(voteCard().textContent).toContain('Confirmed by 3 visitors'))
      expect(own()).toBeNull()
    })

    it('a vote the server did not take is not called counted', async () => {
      const calls = server({
        '/api/visit': { enabled: true, numbers: NONE },
        '/api/vote': { status: 403, enabled: true, error: 'robot' },
      })
      render(page())
      await waitFor(() => expect(calls).toHaveLength(1))
      const works = screen.getByRole('button', { name: c.worksLabel })
      fireEvent.click(works)
      await waitFor(() => expect(voteCard().querySelector('[role="status"]').textContent).toBe(c.notCounted))
      expect(own()).toBeNull()
      expect(works).toHaveAttribute('aria-pressed', 'false')
      expect(myVotes(PAGE)).toEqual({})
    })

    it('is shown to nobody who did not vote', async () => {
      const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
      render(page())
      await waitFor(() => expect(calls).toHaveLength(1))
      expect(own()).toBeNull()
      expect(voteCard().textContent).toContain(c.empty)
    })
  })

  it('the line in the place of the numbers says nothing about how many voted', () => {
    expect(c.empty).not.toMatch(/\d|no votes|first|nobody|yet/i)
  })

  it('prints no number the server did not send: the question and one line of words stay', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    render(page())
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(voteCard().textContent).toContain(c.prompt)
    expect(voteCard().textContent).toContain(c.empty)
    expect(document.body.textContent).not.toMatch(/Confirmed by|views in a month|PDF downloads/)
  })

  it('the place of the numbers keeps its height when they arrive', async () => {
    const place = () => voteCard().firstElementChild.firstElementChild
    server({ '/api/visit': { enabled: true, numbers } })
    render(page())
    expect(place().textContent).toBe(c.empty)
    expect(place().className).toMatch(/(^| )min-h-\[48px\]/)
    await waitFor(() => expect(place().textContent).toContain('Confirmed by 14 visitors'))
    expect(place().className).toMatch(/(^| )min-h-\[48px\]/)
    expect(place().querySelector('ul').className).toMatch(/(^| )grid-cols-3( |$)/)
  })

  it('goes away when the server keeps no votes', async () => {
    const calls = server({ '/api/visit': { enabled: false } })
    render(page())
    expect(voteCard()).not.toBeNull()
    await waitFor(() => expect(calls).toHaveLength(1))
    await waitFor(() => expect(voteCard()).toBeNull())
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
    await waitFor(() => expect(voteCard().textContent).toContain('Confirmed by 3 visitors'))
    expect(calls.at(-1)).toEqual({ path: '/api/vote', body: { page: PAGE, item: 'page', vote: 'works' } })
    expect(works).toHaveAttribute('aria-pressed', 'true')
    expect(works.className).toContain('vote-pop')
    expect(voteCard().querySelector('[role="status"]').textContent).toBe(c.thanksWorks)
    expect(myVotes(PAGE)).toEqual({ page: 'works' })
  })

  it('the thanks give way to the question after a moment', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const calls = server({
        '/api/visit': { enabled: true, numbers },
        '/api/vote': { enabled: true, changed: true, numbers },
      })
      render(page())
      await waitFor(() => expect(calls).toHaveLength(1))
      const status = () => voteCard().querySelector('[role="status"]').textContent
      expect(status()).toBe(c.prompt)
      fireEvent.click(screen.getByRole('button', { name: c.worksLabel }))
      expect(status()).toBe(c.thanksWorks)
      await act(async () => {
        vi.advanceTimersByTime(4100)
      })
      expect(status()).toBe(c.prompt)
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
    expect(voteCard().querySelector('[role="status"]').textContent).toBe(c.thanksBroken)
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
    const buttons = [...voteCard().querySelectorAll('button')]
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([c.worksLabel, c.brokenLabel])
    expect(buttons.map((b) => b.textContent)).toEqual([c.works, c.broken])
    for (const button of buttons) expect(button.className).toMatch(/(^| )min-h-\[44px\]/)
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

// A view is counted when a person acts on the page, not when the page loads:
// a speed test or a link preview loads a page and touches nothing.
describe('the browser side', () => {
  const counted = (calls) => calls.filter((call) => call.path === '/api/visit' && call.body.count === true)
  // A page stops waiting when it is left. A test leaves no listener behind either.
  const waiting = []
  const watch = (path) => {
    const stop = countViewOnSign(path)
    waiting.push(stop)
    return stop
  }
  afterEach(() => {
    while (waiting.length) waiting.pop()()
  })
  const sign = async (type = 'keydown', init = {}) => {
    const event = new Event(type, { bubbles: true })
    Object.assign(event, init)
    await act(async () => {
      window.dispatchEvent(event)
    })
  }

  it('loading a page reads its numbers and counts nothing', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    await visitPage(PAGE)
    await visitPage(PAGE)
    expect(calls.map((call) => call.body)).toEqual([
      { page: PAGE, count: false },
      { page: PAGE, count: false },
    ])
  })

  it('an app page that is only loaded is not counted; the first key, touch or click counts it once', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    render(page())
    await waitFor(() => expect(calls).toHaveLength(1))
    await new Promise((done) => setTimeout(done, 20))
    expect(counted(calls)).toEqual([])
    await sign('keydown')
    await sign('pointerdown')
    await sign('touchstart')
    await sign('wheel')
    expect(counted(calls)).toEqual([{ path: '/api/visit', body: { page: PAGE, count: true } }])
  })

  it('each of the signs counts', async () => {
    for (const type of ['pointerdown', 'keydown', 'touchstart', 'wheel']) {
      window.sessionStorage.clear()
      const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
      const stop = countViewOnSign(PAGE)
      await sign(type)
      expect(counted(calls), type).toHaveLength(1)
      stop()
    }
  })

  it('a pointer that rests is no sign, a pointer that moves is', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    watch(PAGE)
    await sign('pointermove', { movementX: 0, movementY: 0 })
    expect(counted(calls)).toEqual([])
    await sign('pointermove', { movementX: 3, movementY: 0 })
    expect(counted(calls)).toHaveLength(1)
  })

  it('scrolling alone is no sign: a page scrolls by itself to an anchor', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    watch(PAGE)
    await sign('scroll')
    expect(counted(calls)).toEqual([])
  })

  it('a page that is not visible is not counted', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    watch(PAGE)
    await sign('keydown')
    expect(counted(calls)).toEqual([])
    visibility.mockRestore()
  })

  it('counts a page once per tab, and each page on its own', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    watch(PAGE)
    await sign()
    watch(PAGE)
    await sign()
    watch('/macos/chrome')
    await sign()
    expect(counted(calls).map((call) => call.body.page)).toEqual([PAGE, '/macos/chrome'])
  })

  it('stops waiting when the page is left', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE } })
    const stop = countViewOnSign(PAGE)
    stop()
    await sign()
    expect(calls).toEqual([])
  })

  it('a view that was not counted is tried again', async () => {
    const calls = server({ '/api/visit': { enabled: false } })
    watch(PAGE)
    await sign()
    watch(PAGE)
    await sign()
    expect(counted(calls)).toHaveLength(2)
  })

  it('a browser driven by a program is not counted', async () => {
    const calls = server({ '/api/visit': { enabled: true, numbers: NONE }, '/api/download': { enabled: true } })
    vi.stubGlobal('navigator', { webdriver: true })
    await visitPage(PAGE)
    watch(PAGE)
    await sign()
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
