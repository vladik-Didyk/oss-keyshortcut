// Votes and counts of the app pages, kept in a Cloudflare D1 database.
//
// The Pages Functions in functions/api/ (visit, vote, download) are thin: the
// rules are here, so the tests can run them against a real SQLite database.
//
// What is stored: a number per page and day (views, PDF downloads), and two
// numbers per shortcut (works, broken). To keep one person from voting twice,
// a vote also stores a hash of the network address, salted with a value that
// exists only in the database. The address itself is never stored, and the
// hashes are deleted after GUARD_DAYS.
//
// Without a database binding (env.DB) every endpoint answers
// { enabled: false } and the pages show nothing.

/** A number is sent to the page only from this value up. Below it, null. */
export const MINIMUM = { votes: 3, views: 100, downloads: 10 }
/** Views are counted over this many days. */
export const VIEW_DAYS = 30
/** A vote's hash is kept this long. */
export const GUARD_DAYS = 90
/** Votes one network address may cast in a day. */
export const DAILY_VOTES = 40
/** Rows one page may hold: more than the longest page has shortcuts. */
export const MAX_ITEMS_PER_PAGE = 600
/** The vote on the page as a whole. */
export const PAGE_ITEM = 'page'

const PAGE_SHAPE = /^\/[a-z0-9-]{1,40}\/[a-z0-9-]{1,80}$/
const ITEM_SHAPE = /^[a-z0-9-]{1,120}$/
const VOTES = ['works', 'broken']
const KINDS = ['view', 'pdf']
// Robots by the name they give themselves, the browsers of AI assistants among them.
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|monitor|curl|wget|python|httpclient|scrapy|claude|anthropic|chatgpt|openai|perplexity/i

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS counts (page TEXT NOT NULL, kind TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (page, kind, day))',
  'CREATE TABLE IF NOT EXISTS votes (page TEXT NOT NULL, item TEXT NOT NULL, works INTEGER NOT NULL DEFAULT 0, broken INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (page, item))',
  'CREATE TABLE IF NOT EXISTS vote_guard (hash TEXT PRIMARY KEY, who TEXT NOT NULL, vote TEXT NOT NULL, day TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS vote_guard_who ON vote_guard (who, day)',
  'CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY, value TEXT NOT NULL)',
]

export const isPagePath = (value) => typeof value === 'string' && PAGE_SHAPE.test(value)
export const isItemId = (value) => typeof value === 'string' && ITEM_SHAPE.test(value)
export const isBot = (userAgent) => !userAgent || BOT.test(userAgent)

/** 'YYYY-MM-DD' in UTC, `back` days before `now`. */
export function dayOf(now = new Date(), back = 0) {
  return new Date(now.getTime() - back * 86400000).toISOString().slice(0, 10)
}

export async function sha256(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// The tables are made on first use, so the database needs no setup step.
const prepared = new WeakSet()
export async function prepare(db) {
  if (prepared.has(db)) return
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)))
  prepared.add(db)
}

// The salt of the hashes. Made once, kept in the database and nowhere else.
const salts = new WeakMap()
async function saltOf(db) {
  if (salts.has(db)) return salts.get(db)
  const fresh = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('')
  await db.prepare("INSERT OR IGNORE INTO settings (name, value) VALUES ('salt', ?)").bind(fresh).run()
  const row = await db.prepare("SELECT value FROM settings WHERE name = 'salt'").first()
  salts.set(db, row.value)
  return row.value
}

/** Adds one to the count of a page for today. `kind` is 'view' or 'pdf'. */
export async function countEvent(db, page, kind, now = new Date()) {
  if (!isPagePath(page) || !KINDS.includes(kind)) return false
  await prepare(db)
  await db
    .prepare('INSERT INTO counts (page, kind, day, n) VALUES (?, ?, ?, 1) ON CONFLICT (page, kind, day) DO UPDATE SET n = n + 1')
    .bind(page, kind, dayOf(now))
    .run()
  return true
}

const atLeast = (n, minimum) => (n >= minimum ? n : null)
// A confirmation count is shown while the votes against it are fewer than half of it.
const confirmed = (row) => (row && row.works >= MINIMUM.votes && row.broken * 2 < row.works ? row.works : null)

/**
 * The numbers a page may show. A number below its minimum is null, so the
 * browser never receives a small number.
 * { views, downloads, confirmed, items: { <shortcut id>: <count> } }
 */
export async function pageNumbers(db, page, now = new Date()) {
  await prepare(db)
  const [views, downloads, votes] = await db.batch([
    db.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM counts WHERE page = ? AND kind = 'view' AND day > ?").bind(page, dayOf(now, VIEW_DAYS)),
    db.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM counts WHERE page = ? AND kind = 'pdf'").bind(page),
    db.prepare('SELECT item, works, broken FROM votes WHERE page = ? AND works >= ?').bind(page, MINIMUM.votes),
  ])
  const items = {}
  let whole = null
  for (const row of votes.results) {
    const n = confirmed(row)
    if (n === null) continue
    if (row.item === PAGE_ITEM) whole = n
    else items[row.item] = n
  }
  return {
    views: atLeast(views.results[0].n, MINIMUM.views),
    downloads: atLeast(downloads.results[0].n, MINIMUM.downloads),
    confirmed: whole,
    items,
  }
}

/**
 * One vote of one network address on one shortcut (or on the page as a whole).
 * A second vote of the same kind changes nothing; the other kind moves the vote.
 * Returns { ok, changed } or { ok: false, reason }.
 */
export async function castVote(db, { page, item, vote, address }, now = new Date(), cleanupChance = 0.02) {
  if (!isPagePath(page) || !isItemId(item) || !VOTES.includes(vote)) return { ok: false, reason: 'invalid' }
  await prepare(db)
  const salt = await saltOf(db)
  const day = dayOf(now)
  const who = await sha256(`${salt}|${address}|${day}`)
  const hash = await sha256(`${salt}|${address}|${page}|${item}`)

  const earlier = await db.prepare('SELECT vote FROM vote_guard WHERE hash = ?').bind(hash).first()
  if (earlier && earlier.vote === vote) return { ok: true, changed: false }

  if (earlier) {
    const [to, from] = vote === 'works' ? ['works', 'broken'] : ['broken', 'works']
    await db.batch([
      db.prepare(`UPDATE votes SET ${to} = ${to} + 1, ${from} = MAX(${from} - 1, 0) WHERE page = ? AND item = ?`).bind(page, item),
      db.prepare('UPDATE vote_guard SET vote = ?, who = ?, day = ? WHERE hash = ?').bind(vote, who, day, hash),
    ])
    return { ok: true, changed: true }
  }

  const [today, row, rows] = await db.batch([
    db.prepare('SELECT COUNT(*) AS n FROM vote_guard WHERE who = ? AND day = ?').bind(who, day),
    db.prepare('SELECT 1 AS found FROM votes WHERE page = ? AND item = ?').bind(page, item),
    db.prepare('SELECT COUNT(*) AS n FROM votes WHERE page = ?').bind(page),
  ])
  if (today.results[0].n >= DAILY_VOTES) return { ok: false, reason: 'limit' }
  if (!row.results.length && rows.results[0].n >= MAX_ITEMS_PER_PAGE) return { ok: false, reason: 'full' }

  const works = vote === 'works' ? 1 : 0
  await db.batch([
    db
      .prepare('INSERT INTO votes (page, item, works, broken) VALUES (?, ?, ?, ?) ON CONFLICT (page, item) DO UPDATE SET works = works + excluded.works, broken = broken + excluded.broken')
      .bind(page, item, works, 1 - works),
    db.prepare('INSERT INTO vote_guard (hash, who, vote, day) VALUES (?, ?, ?, ?)').bind(hash, who, vote, day),
  ])
  if (Math.random() < cleanupChance) {
    await db.prepare('DELETE FROM vote_guard WHERE day < ?').bind(dayOf(now, GUARD_DAYS)).run()
  }
  return { ok: true, changed: true }
}

/* ─── The endpoints ─── */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

const OFF = { enabled: false }

// A request from another site is refused. Browsers send both headers.
function fromThisSite(request) {
  const origin = request.headers.get('Origin')
  if (origin && origin !== new URL(request.url).origin) return false
  const site = request.headers.get('Sec-Fetch-Site')
  return !site || site === 'same-origin'
}

async function bodyOf(request) {
  try {
    const text = await request.text()
    if (text.length > 2000) return null
    const body = JSON.parse(text)
    return body && typeof body === 'object' ? body : null
  } catch {
    return null
  }
}

// The shortcut ids of a page, read from the page the site serves: the rows
// carry them as data-item. null = the site has no such page.
const pages = new Map()
export async function itemsOfPage(env, request, page) {
  if (pages.has(page)) return pages.get(page)
  let items = null
  try {
    const response = await env.ASSETS.fetch(new URL(`${page}/`, request.url))
    if (response.ok && (response.headers.get('Content-Type') || '').includes('text/html')) {
      const html = await response.text()
      items = new Set([...html.matchAll(/data-item="([a-z0-9-]+)"/g)].map((m) => m[1]))
    }
  } catch {
    items = null
  }
  if (pages.size >= 300) pages.clear()
  if (items) pages.set(page, items)
  return items
}

async function open(context) {
  const { request, env } = context
  if (!env.DB) return { answer: json(OFF) }
  if (!fromThisSite(request)) return { answer: json({ enabled: true, error: 'origin' }, 403) }
  const body = await bodyOf(request)
  if (!body || !isPagePath(body.page)) return { answer: json({ enabled: true, error: 'invalid' }, 400) }
  const items = await itemsOfPage(env, request, body.page)
  if (!items) return { answer: json({ enabled: true, error: 'page' }, 404) }
  return { body, items, db: env.DB, robot: isBot(request.headers.get('User-Agent')) }
}

/** POST /api/visit { page, count? } → counts a view and returns the page's numbers. */
export async function visit(context) {
  const { answer, body, db, robot } = await open(context)
  if (answer) return answer
  if (body.count !== false && !robot) await countEvent(db, body.page, 'view')
  return json({ enabled: true, numbers: await pageNumbers(db, body.page) })
}

/** POST /api/download { page } → counts a PDF download. */
export async function download(context) {
  const { answer, body, db, robot } = await open(context)
  if (answer) return answer
  if (!robot) await countEvent(db, body.page, 'pdf')
  return json({ enabled: true })
}

/** POST /api/vote { page, item, vote } → stores the vote and returns the page's numbers. */
export async function vote(context) {
  const { answer, body, items, db, robot } = await open(context)
  if (answer) return answer
  if (robot) return json({ enabled: true, error: 'robot' }, 403)
  if (body.item !== PAGE_ITEM && !items.has(body.item)) return json({ enabled: true, error: 'item' }, 404)
  const address = context.request.headers.get('CF-Connecting-IP') || 'local'
  const result = await castVote(db, { page: body.page, item: body.item, vote: body.vote, address })
  if (!result.ok) return json({ enabled: true, error: result.reason }, result.reason === 'limit' ? 429 : 400)
  return json({ enabled: true, changed: result.changed, numbers: await pageNumbers(db, body.page) })
}
