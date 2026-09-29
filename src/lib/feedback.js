// Votes and counts, the browser's side. The rules are on the server
// (server/feedback.js); this file asks and remembers.
//
// What the browser keeps: the visitor's own votes (localStorage, so the
// buttons show them again) and the pages counted in this tab (sessionStorage,
// so a reload is not a second view). No cookie, no id of the visitor.
// Loading a page reads its numbers; the view is counted when a person acts.
// SSR-safe: every entry point guards `typeof window`.

// The switch. Off: no request is sent and the pages show nothing of it.
// On since the Pages project has its database (the binding DB, 2026-09-29).
// The card is in the page as it is served, so nothing moves when the numbers
// arrive. VITE_VOTES=off in the shell switches it off for one build, and
// VITE_VOTES=on switches it on whatever the constant says.
export const VOTES_SWITCH = true
export const votesOn = () => {
  const forced = import.meta.env.VITE_VOTES
  if (forced === 'on') return true
  if (forced === 'off') return false
  return VOTES_SWITCH
}

const VOTES_KEY = 'ks-votes'
const SEEN_KEY = 'ks-seen'
const OFF = { enabled: false }

function readJson(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || '{}')
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage is full or switched off: the vote is still sent.
  }
}

async function post(path, body) {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
    const answer = await response.json()
    return answer && typeof answer === 'object' ? { ...answer, status: response.status } : OFF
  } catch {
    // No such endpoint (pnpm dev), no network, or an answer that is not JSON.
    return OFF
  }
}

/** The visitor's own votes on a page: { <item>: 'works' | 'broken' }. */
export function myVotes(page) {
  if (typeof window === 'undefined') return {}
  return readJson(window.localStorage, VOTES_KEY)[page] || {}
}

const visit = (page, count) => post('/api/visit', { page, count })

/** Reads the numbers of a page: { enabled, numbers }. Counts nothing. */
export async function visitPage(page) {
  if (typeof window === 'undefined') return OFF
  return visit(page, false)
}

// A view is counted at the first sign of a person, not when the page loads:
// a speed test, a link preview or a monitor loads a page and touches nothing.
// Scrolling is no sign of its own, because a page scrolls by itself to "#faq".
const SIGNS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'pointermove']
// A browser sends a pointer move of its own when the page moves under a resting
// pointer: only a move with a distance is a sign.
const isSign = (event) => event.type !== 'pointermove' || Boolean(event.movementX || event.movementY)

/**
 * Counts the view of a page at the first sign of a person, once per tab and
 * page. Returns the function that stops waiting for the sign.
 */
export function countViewOnSign(page) {
  if (typeof window === 'undefined' || navigator.webdriver) return () => {}
  if (readJson(window.sessionStorage, SEEN_KEY)[page]) return () => {}
  const options = { capture: true, passive: true }
  const stop = () => SIGNS.forEach((type) => window.removeEventListener(type, onSign, options))
  async function onSign(event) {
    if (!isSign(event) || document.visibilityState !== 'visible') return
    stop()
    const answer = await visit(page, true)
    if (answer.enabled) writeJson(window.sessionStorage, SEEN_KEY, { ...readJson(window.sessionStorage, SEEN_KEY), [page]: 1 })
  }
  SIGNS.forEach((type) => window.addEventListener(type, onSign, options))
  return stop
}

/** Sends a vote and remembers it. Returns the server's answer. */
export async function sendVote(page, item, vote) {
  if (typeof window === 'undefined') return OFF
  const answer = await post('/api/vote', { page, item, vote })
  if (answer.enabled && answer.status === 200) {
    const all = readJson(window.localStorage, VOTES_KEY)
    writeJson(window.localStorage, VOTES_KEY, { ...all, [page]: { ...all[page], [item]: vote } })
  }
  return answer
}

/** Counts a PDF download. Nothing waits for it. */
export function countDownload(page) {
  if (typeof window === 'undefined' || navigator.webdriver) return
  post('/api/download', { page })
}
