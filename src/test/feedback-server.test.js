// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import {
  MINIMUM,
  VIEW_DAYS,
  GUARD_DAYS,
  DAILY_VOTES,
  PAGE_ITEM,
  castVote,
  countEvent,
  dayOf,
  isBot,
  isItemId,
  isPagePath,
  pageNumbers,
  visit,
  vote,
  download,
} from '../../server/feedback.js'
import { isAppPagePath } from '../data/sponsors'
import { memoryDatabase } from './helpers/d1'

// Votes and counts, against a real SQLite database. The rule that matters most:
// a number below its minimum never leaves the server.
const PAGE = '/macos/figma'
const NOW = new Date('2026-09-28T12:00:00Z')
const read = (path) => readFileSync(join(process.cwd(), path), 'utf-8')

let db
beforeEach(() => {
  db = memoryDatabase()
})

const times = async (n, fn) => {
  for (let i = 0; i < n; i++) await fn(i)
}
const votesOf = (n, item, kind = 'works', page = PAGE) =>
  times(n, (i) => castVote(db, { page, item, vote: kind, address: `10.0.0.${i}-${kind}` }, NOW, 0))

describe('the first real number', () => {
  it('every number is sent from the first one', () => {
    expect(MINIMUM).toEqual({ votes: 1, views: 1, downloads: 1 })
  })

  it('a page nobody counted sends no zero', async () => {
    expect(await pageNumbers(db, PAGE, NOW)).toEqual({ views: null, downloads: null, confirmed: null, items: {} })
  })

  it('one view, one download and one vote are sent as 1', async () => {
    await countEvent(db, PAGE, 'view', NOW)
    await countEvent(db, PAGE, 'pdf', NOW)
    await castVote(db, { page: PAGE, item: PAGE_ITEM, vote: 'works', address: 'a' }, NOW, 0)
    await castVote(db, { page: PAGE, item: 'edit--group', vote: 'works', address: 'a' }, NOW, 0)
    expect(await pageNumbers(db, PAGE, NOW)).toEqual({ views: 1, downloads: 1, confirmed: 1, items: { 'edit--group': 1 } })
  })

  it('a vote that is taken back to "not right" sends no zero', async () => {
    const one = { page: PAGE, item: PAGE_ITEM, address: 'a' }
    await castVote(db, { ...one, vote: 'works' }, NOW, 0)
    await castVote(db, { ...one, vote: 'broken' }, NOW, 0)
    expect((await pageNumbers(db, PAGE, NOW)).confirmed).toBeNull()
  })
})

describe('counts', () => {
  it('shows nothing below the minimum, and the number from the minimum up', async () => {
    await times(MINIMUM.views - 1, () => countEvent(db, PAGE, 'view', NOW))
    expect((await pageNumbers(db, PAGE, NOW)).views).toBeNull()
    await countEvent(db, PAGE, 'view', NOW)
    expect((await pageNumbers(db, PAGE, NOW)).views).toBe(MINIMUM.views)
  })

  it('counts views over the last days only, and downloads over all time', async () => {
    const old = new Date(NOW.getTime() - (VIEW_DAYS + 1) * 86400000)
    await times(MINIMUM.views, () => countEvent(db, PAGE, 'view', old))
    await times(MINIMUM.downloads, () => countEvent(db, PAGE, 'pdf', old))
    const numbers = await pageNumbers(db, PAGE, NOW)
    expect(numbers.views).toBeNull()
    expect(numbers.downloads).toBe(MINIMUM.downloads)
  })

  it('keeps one row per page, kind and day', async () => {
    await times(5, () => countEvent(db, PAGE, 'view', NOW))
    expect(db.rows('SELECT * FROM counts')).toEqual([{ page: PAGE, kind: 'view', day: dayOf(NOW), n: 5 }])
  })

  it('keeps the pages apart', async () => {
    await times(MINIMUM.views, () => countEvent(db, PAGE, 'view', NOW))
    expect((await pageNumbers(db, '/macos/chrome', NOW)).views).toBeNull()
  })

  it('refuses what is not a page or not a kind', async () => {
    expect(await countEvent(db, '/about', 'view', NOW)).toBe(false)
    expect(await countEvent(db, PAGE, 'click', NOW)).toBe(false)
  })
})

describe('votes', () => {
  it('shows a confirmation from the minimum up', async () => {
    await votesOf(MINIMUM.votes - 1, 'edit--duplicate')
    expect((await pageNumbers(db, PAGE, NOW)).items).toEqual({})
    await castVote(db, { page: PAGE, item: 'edit--duplicate', vote: 'works', address: 'last' }, NOW, 0)
    expect((await pageNumbers(db, PAGE, NOW)).items).toEqual({ 'edit--duplicate': MINIMUM.votes })
  })

  it('keeps the vote on the page as a whole apart from the shortcuts', async () => {
    await votesOf(4, PAGE_ITEM)
    const numbers = await pageNumbers(db, PAGE, NOW)
    expect(numbers.confirmed).toBe(4)
    expect(numbers.items).toEqual({})
  })

  it('counts one address once', async () => {
    const one = { page: PAGE, item: 'edit--group', vote: 'works', address: '10.1.1.1' }
    expect(await castVote(db, one, NOW, 0)).toEqual({ ok: true, changed: true })
    expect(await castVote(db, one, NOW, 0)).toEqual({ ok: true, changed: false })
    expect(db.rows('SELECT works, broken FROM votes')).toEqual([{ works: 1, broken: 0 }])
  })

  it('moves a vote that changes its mind', async () => {
    const one = { page: PAGE, item: 'edit--group', address: '10.1.1.1' }
    await castVote(db, { ...one, vote: 'works' }, NOW, 0)
    await castVote(db, { ...one, vote: 'broken' }, NOW, 0)
    expect(db.rows('SELECT works, broken FROM votes')).toEqual([{ works: 0, broken: 1 }])
    expect(db.rows('SELECT COUNT(*) AS n FROM vote_guard')).toEqual([{ n: 1 }])
  })

  it('shows no confirmation while many say it does not work', async () => {
    await votesOf(4, 'edit--group', 'works')
    await votesOf(2, 'edit--group', 'broken')
    expect((await pageNumbers(db, PAGE, NOW)).items).toEqual({})
  })

  it('never sends the votes against a shortcut', async () => {
    await votesOf(5, 'edit--group', 'broken')
    expect(JSON.stringify(await pageNumbers(db, PAGE, NOW))).not.toMatch(/broken|5/)
  })

  it('stops an address at the daily limit', async () => {
    await times(DAILY_VOTES, (i) =>
      castVote(db, { page: PAGE, item: `edit--item-${i}`, vote: 'works', address: '10.9.9.9' }, NOW, 0)
    )
    const over = await castVote(db, { page: PAGE, item: 'edit--one-more', vote: 'works', address: '10.9.9.9' }, NOW, 0)
    expect(over).toEqual({ ok: false, reason: 'limit' })
    const tomorrow = new Date(NOW.getTime() + 86400000)
    expect((await castVote(db, { page: PAGE, item: 'edit--one-more', vote: 'works', address: '10.9.9.9' }, tomorrow, 0)).ok).toBe(true)
  })

  it('stores no address: only hashes, salted with a value from the database', async () => {
    await castVote(db, { page: PAGE, item: 'edit--group', vote: 'works', address: '203.0.113.7' }, NOW, 0)
    const stored = JSON.stringify([db.rows('SELECT * FROM vote_guard'), db.rows('SELECT * FROM votes'), db.rows('SELECT * FROM counts')])
    expect(stored).not.toContain('203.0.113.7')
    const [guard] = db.rows('SELECT * FROM vote_guard')
    expect(guard.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(guard.who).toMatch(/^[0-9a-f]{64}$/)
    expect(db.rows("SELECT value FROM settings WHERE name = 'salt'")[0].value).toMatch(/^[0-9a-f]{48}$/)
  })

  it('gives another database another salt', async () => {
    const other = memoryDatabase()
    const one = { page: PAGE, item: 'edit--group', vote: 'works', address: '203.0.113.7' }
    await castVote(db, one, NOW, 0)
    await castVote(other, one, NOW, 0)
    expect(db.rows('SELECT hash FROM vote_guard')).not.toEqual(other.rows('SELECT hash FROM vote_guard'))
  })

  it('deletes the hashes that are older than the limit', async () => {
    const old = new Date(NOW.getTime() - (GUARD_DAYS + 1) * 86400000)
    await castVote(db, { page: PAGE, item: 'edit--group', vote: 'works', address: 'a' }, old, 0)
    await castVote(db, { page: PAGE, item: 'edit--group', vote: 'works', address: 'b' }, NOW, 1)
    expect(db.rows('SELECT day FROM vote_guard')).toEqual([{ day: dayOf(NOW) }])
    expect(db.rows('SELECT works FROM votes')).toEqual([{ works: 2 }])
  })

  it('refuses a vote that is not a vote', async () => {
    const base = { page: PAGE, item: 'edit--group', vote: 'works', address: 'a' }
    for (const wrong of [{ vote: 'maybe' }, { item: 'Edit Group' }, { item: '' }, { page: '/about' }, { page: '/macos/figma/x' }]) {
      expect(await castVote(db, { ...base, ...wrong }, NOW, 0)).toEqual({ ok: false, reason: 'invalid' })
    }
  })
})

describe('shapes', () => {
  it('reads a page path the way the site does', () => {
    for (const path of ['/macos/figma', '/windows/vscode', '/about', '/macos', '/macos/figma/', '/MacOS/Figma', '//evil.example/x', '']) {
      expect(isPagePath(path), path).toBe(isAppPagePath(path))
    }
  })

  it('knows an id from free text', () => {
    expect(isItemId('edit--bring-forward')).toBe(true)
    expect(isItemId('page')).toBe(true)
    for (const wrong of ['', 'Edit', 'a b', 'a"b', '<x>', 'a'.repeat(121), 7, null]) expect(isItemId(wrong)).toBe(false)
  })

  it('knows a robot by its name', () => {
    for (const robot of ['Googlebot/2.1', 'curl/8.1', 'HeadlessChrome', 'python-requests/2', '', null]) expect(isBot(robot)).toBe(true)
    expect(isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15')).toBe(false)
  })
})

/* ─── The endpoints, with a stand-in for the site's files ─── */

const BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'
const HTML = '<table><tr data-item="edit--duplicate"></tr><tr data-item="edit--group"></tr></table>'

function context(path, body, { database = db, headers = {}, address = '198.51.100.1' } = {}) {
  const asked = []
  return {
    asked,
    request: new Request(`https://keyshortcut.test${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': BROWSER, 'CF-Connecting-IP': address, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    env: {
      DB: database,
      ASSETS: {
        fetch: async (url) => {
          asked.push(String(url))
          return new URL(url).pathname === '/macos/figma/'
            ? new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
            : new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/html' } })
        },
      },
    },
  }
}

describe('endpoints', () => {
  it('answer "not enabled" while there is no database, and store nothing', async () => {
    for (const endpoint of [visit, vote, download]) {
      const response = await endpoint(context('/api/x', { page: PAGE, item: PAGE_ITEM, vote: 'works' }, { database: null }))
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ enabled: false })
    }
  })

  it('a visit counts a view and returns the numbers', async () => {
    await times(MINIMUM.views - 1, () => countEvent(db, PAGE, 'view'))
    const response = await visit(context('/api/visit', { page: PAGE }))
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({
      enabled: true,
      numbers: { views: MINIMUM.views, downloads: null, confirmed: null, items: {} },
    })
  })

  it('a visit that only reads counts nothing', async () => {
    await visit(context('/api/visit', { page: PAGE, count: false }))
    expect(db.rows('SELECT * FROM counts')).toEqual([])
  })

  it('a robot is not counted and cannot vote', async () => {
    const robot = { headers: { 'User-Agent': 'Googlebot/2.1' } }
    await visit(context('/api/visit', { page: PAGE }, robot))
    await download(context('/api/download', { page: PAGE }, robot))
    expect(db.rows('SELECT * FROM counts')).toEqual([])
    expect((await vote(context('/api/vote', { page: PAGE, item: PAGE_ITEM, vote: 'works' }, robot))).status).toBe(403)
  })

  it('a download is counted', async () => {
    await download(context('/api/download', { page: PAGE }))
    expect(db.rows('SELECT kind, n FROM counts')).toEqual([{ kind: 'pdf', n: 1 }])
  })

  it('a vote is stored for a shortcut the page has, and for the page', async () => {
    for (const item of ['edit--group', PAGE_ITEM]) {
      const response = await vote(context('/api/vote', { page: PAGE, item, vote: 'works' }))
      expect(response.status).toBe(200)
      expect((await response.json()).changed).toBe(true)
    }
    expect(db.rows('SELECT item, works FROM votes ORDER BY item')).toEqual([
      { item: 'edit--group', works: 1 },
      { item: PAGE_ITEM, works: 1 },
    ])
  })

  it('a vote for a shortcut the page does not have is refused', async () => {
    const response = await vote(context('/api/vote', { page: PAGE, item: 'edit--made-up', vote: 'works' }))
    expect(response.status).toBe(404)
    expect(db.rows('SELECT * FROM votes')).toEqual([])
  })

  it('a page the site does not have is refused', async () => {
    const response = await visit(context('/api/visit', { page: '/macos/no-such-app' }))
    expect(response.status).toBe(404)
    expect(db.rows('SELECT * FROM counts')).toEqual([])
  })

  it('a request from another site is refused', async () => {
    for (const headers of [{ Origin: 'https://evil.example' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
      const response = await vote(context('/api/vote', { page: PAGE, item: PAGE_ITEM, vote: 'works' }, { headers }))
      expect(response.status).toBe(403)
    }
    const same = { Origin: 'https://keyshortcut.test', 'Sec-Fetch-Site': 'same-origin' }
    expect((await vote(context('/api/vote', { page: PAGE, item: PAGE_ITEM, vote: 'works' }, { headers: same }))).status).toBe(200)
  })

  it('a body that is not what is expected is refused', async () => {
    for (const body of ['not json', '[]', '"text"', JSON.stringify({ page: '/about' }), JSON.stringify({ page: PAGE, pad: 'x'.repeat(3000) })]) {
      expect((await visit(context('/api/visit', body))).status, body.slice(0, 20)).toBe(400)
    }
  })

  it('the daily limit answers 429', async () => {
    await times(DAILY_VOTES, (i) => castVote(db, { page: PAGE, item: `edit--item-${i}`, vote: 'works', address: '198.51.100.1' }))
    expect((await vote(context('/api/vote', { page: PAGE, item: 'edit--group', vote: 'works' }))).status).toBe(429)
  })
})

describe('wiring', () => {
  it('every function is a POST that calls the rules', () => {
    const files = readdirSync(join(process.cwd(), 'functions/api')).sort()
    expect(files).toEqual(['download.js', 'geo.js', 'visit.js', 'vote.js'])
    for (const name of ['download', 'visit', 'vote']) {
      const source = read(`functions/api/${name}.js`)
      expect(source).toContain(`import { ${name} } from '../../server/feedback.js'`)
      expect(source).toContain(`export const onRequestPost = (context) => ${name}(context)`)
    }
  })

  it('the rules read no secret and call no other host', () => {
    const source = read('server/feedback.js')
    expect(source).not.toMatch(/https?:\/\//)
    expect([...new Set(source.match(/env\.[A-Z_]+/g))].sort()).toEqual(['env.ASSETS', 'env.DB'])
  })
})
