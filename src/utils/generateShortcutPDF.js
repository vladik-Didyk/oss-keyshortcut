import { jsPDF } from 'jspdf'

/* ─── Color Palette ─── */
const PAPER     = [247, 243, 235]
const KEYCAP_BG = [42, 42, 44]
const KEYCAP_FG = [255, 255, 255]
const INK       = [28, 28, 30]
const MUTED     = [142, 142, 147]
const BORDER    = [199, 197, 192]
const SHADOW    = [210, 206, 198]
const CARD_BG   = [252, 250, 246]

/* ─── Fixed page geometry (A4 portrait, mm) ─── */
const PW = 210, PH = 297
const OUTER = 12, INSET = 5
const LEFT = OUTER + INSET
const RIGHT = PW - OUTER - INSET
const CW = RIGHT - LEFT
const BOTTOM = PH - OUTER - INSET - 10
const START_Y = OUTER + INSET + 5
const MCOL_GAP = 3
const MCOL_W = (CW - MCOL_GAP) / 2
const LEFT_COL_X = LEFT
const RIGHT_COL_X = LEFT + MCOL_W + MCOL_GAP
const PAGE_H = BOTTOM - START_Y

/* ─── Scalable dimensions (mutated per-PDF) ─── */
const D = {}
function setScale(s) {
  D.rowH     = 6.5  * s
  D.kcH      = 5    * s
  D.kcFS     = 6    * s
  D.kcPad    = 1.6  * s
  D.kcR      = 1.1  * s
  D.kcGap    = 1    * s
  D.actionFS = 6.5  * s
  D.titleFS  = 8    * s
  D.titleH   = 7    * s
  D.cardPad  = 3    * s
  D.cardGap  = 3    * s
  D.countFS  = 5.5  * s
  D.shadowX  = 0.3  * s
  D.shadowY  = 0.35 * s
  D.kcOff    = D.kcH / 2  // keycap vertical offset from row center
}
setScale(1) // initialize

/* ─── Symbol → text mapping ─── */
const MOD_LABEL = { '\u2318': 'Cmd', '\u2325': 'Opt', '\u21E7': 'Sft', '\u2303': 'Ctrl' }
const modLabel = (s) => MOD_LABEL[s] || s
const KEY_LABEL = {
  '\u2191': 'Up', '\u2193': 'Down', '\u2190': 'Left', '\u2192': 'Right',
  '\u21A9': 'Return', '\u23CE': 'Return', '\u21B5': 'Return',
  '\u232B': 'Del', '\u2326': 'Del', '\u238B': 'Esc',
  '\u21E5': 'Tab', '\u21B9': 'Tab', '\u2423': 'Space',
}
const keyLabel = (s) => KEY_LABEL[s] || s

/* ─── Auto-categorizer ─── */
const AUTO_GROUPS = [
  { name: 'Basics', keywords: ['copy', 'paste', 'cut', 'undo', 'redo', 'select all', 'save', 'print', 'open a file', 'close tab', 'open tab', 'new', 'eject', 'bookmark', 'settings', 'preferences', 'app setting'] },
  { name: 'Finder', keywords: ['computer', 'home', 'icloud', 'applications', 'recents', 'go to folder', 'icon view', 'list view', 'column view', 'gallery view', 'quick look', 'move file', 'rename', 'show original', 'hidden files', 'info', 'enclosing', 'new folder', 'duplicate', 'trash', 'empty trash', 'alias', 'connect to server', 'dock', 'sidebar', 'airdrop', 'open folder'] },
  { name: 'System', keywords: ['spotlight', 'emoji', 'symbol', 'lock screen', 'switch between', 'mission control', 'force quit', 'log out', 'shutdown', 'force shutdown', 'show definition', 'space', 'minimize'] },
  { name: 'Window & Tabs', keywords: ['full screen', 'zoom', 'minimize', 'tab', 're-open', 'close', 'window', 'hide'] },
  { name: 'Screenshots', keywords: ['screenshot', 'screen picture', 'select area', 'capture', 'record screen'] },
  { name: 'Volume & Display', keywords: ['volume', 'brightness'] },
  { name: 'Boot & Recovery', keywords: ['safe mode', 'boot', 'diagnostics', 'target disk', 'bootable', 'recovery', 'nvram', 'recovery assistant'] },
  { name: 'Search', keywords: ['search', 'find', 'find next'] },
  { name: 'Navigation', keywords: ['go back', 'go forward', 'forward', 'back', 'reload', 'next', 'previous', 'address'] },
]

function autoGroupSection(section) {
  if (section.shortcuts.length <= 15) return [section]
  const groups = AUTO_GROUPS.map(g => ({ name: g.name, shortcuts: [] }))
  const other = { name: section.name, shortcuts: [] }
  for (const sc of section.shortcuts) {
    const a = sc.action.toLowerCase()
    let matched = false
    for (let gi = 0; gi < AUTO_GROUPS.length; gi++) {
      for (const kw of AUTO_GROUPS[gi].keywords) {
        if (a.includes(kw)) { groups[gi].shortcuts.push(sc); matched = true; break }
      }
      if (matched) break
    }
    if (!matched) other.shortcuts.push(sc)
  }
  const result = []
  for (const g of groups) {
    if (g.shortcuts.length >= 2) result.push(g)
    else other.shortcuts.push(...g.shortcuts)
  }
  if (other.shortcuts.length > 0) result.push(other)
  return result
}

/* ════════════════════════════════════════════════
   Drawing (all use D.* for scaled dimensions)
   ════════════════════════════════════════════════ */

function initPage(doc) {
  doc.setFillColor(...PAPER)
  doc.rect(0, 0, PW, PH, 'F')
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.6)
  doc.roundedRect(OUTER, OUTER, PW - OUTER * 2, PH - OUTER * 2, 3, 3, 'D')
  for (let i = 0; i < 3; i++) {
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.4)
    doc.circle(OUTER + 7 + i * 4, OUTER + 4.5, 1.2, 'D')
  }
}

function drawKeycap(doc, x, y, label) {
  doc.setFontSize(D.kcFS)
  doc.setFont('helvetica', 'bold')
  const tw = doc.getTextWidth(label)
  const w = Math.max(tw + D.kcPad * 2, D.kcH)
  doc.setFillColor(...SHADOW)
  doc.roundedRect(x + D.shadowX, y + D.shadowY, w, D.kcH, D.kcR, D.kcR, 'F')
  doc.setFillColor(...KEYCAP_BG)
  doc.roundedRect(x, y, w, D.kcH, D.kcR, D.kcR, 'F')
  doc.setTextColor(...KEYCAP_FG)
  doc.text(label, x + w / 2, y + D.kcH * 0.7, { align: 'center' })
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'normal')
  return w
}

function drawShortcut(doc, x, rowY, sc, maxWidth) {
  const kcTop = rowY - D.kcOff
  let cx = x
  const rawKey = keyLabel(sc.key)
  const keys = [...sc.modifiers.map(modLabel), rawKey.length === 1 ? rawKey.toUpperCase() : rawKey]
  keys.forEach((k) => { cx += drawKeycap(doc, cx, kcTop, k) + D.kcGap })
  cx += D.kcGap
  doc.setFontSize(D.actionFS)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  let action = sc.action
  const avail = maxWidth - (cx - x)
  while (doc.getTextWidth(action) > avail && action.length > 5) action = action.slice(0, -4) + '\u2026'
  doc.text(action, cx, rowY + D.actionFS * 0.04)
}

function cardH(n) { return D.cardPad + D.titleH + n * D.rowH + D.cardPad }

function drawCardTitle(doc, x, y, w, section) {
  let cy = y + D.cardPad
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(D.titleFS)
  doc.setTextColor(...INK)
  doc.text(section.name, x + D.cardPad + 1, cy + D.titleH * 0.6)
  const nw = doc.getTextWidth(section.name)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(D.countFS)
  doc.setTextColor(...MUTED)
  doc.text(String(section.shortcuts.length), x + D.cardPad + 1 + nw + 1.5, cy + D.titleH * 0.6)
  doc.setTextColor(...INK)
}

function drawCard(doc, x, y, w, section) {
  const sc = section.shortcuts
  if (!sc.length) return 0
  const ch = cardH(sc.length)
  doc.setFillColor(...CARD_BG)
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, w, ch, 2.5, 2.5, 'FD')
  drawCardTitle(doc, x, y, w, section)
  let cy = y + D.cardPad + D.titleH
  const innerW = w - D.cardPad * 2 - 2
  for (let i = 0; i < sc.length; i++) {
    drawShortcut(doc, x + D.cardPad + 1, cy + D.rowH / 2, sc[i], innerW)
    cy += D.rowH
  }
  return ch
}

function drawFullWidthCard(doc, x, y, w, section) {
  const sc = section.shortcuts
  if (!sc.length) return 0
  const half = Math.ceil(sc.length / 2)
  const colL = sc.slice(0, half), colR = sc.slice(half)
  const rows = Math.max(colL.length, colR.length)
  const ch = cardH(rows)
  doc.setFillColor(...CARD_BG)
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, w, ch, 2.5, 2.5, 'FD')
  drawCardTitle(doc, x, y, w, section)
  let cy = y + D.cardPad + D.titleH
  const subColW = (w - D.cardPad * 2 - MCOL_GAP) / 2
  for (let i = 0; i < rows; i++) {
    const rc = cy + D.rowH / 2
    if (i < colL.length) drawShortcut(doc, x + D.cardPad + 1, rc, colL[i], subColW - 2)
    if (i < colR.length) drawShortcut(doc, x + D.cardPad + subColW + MCOL_GAP, rc, colR[i], subColW - 2)
    cy += D.rowH
  }
  return ch
}

/** Draw a Notes box at (x, y) with given width and height. */
function drawNotesBox(doc, x, y, w, h) {
  if (h < 12) return
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, w, h, 2, 2, 'D')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...INK)
  doc.text('Notes', x + 4, y + 5)
  doc.setDrawColor(225, 222, 215)
  doc.setLineWidth(0.12)
  for (let ly = y + 8; ly < y + h - 2; ly += 5) doc.line(x + 3, ly, x + w - 3, ly)
}

/** Fill remaining empty space with Notes boxes in each column and at the bottom. */
function fillWithNotes(doc, leftY, rightY) {
  const minBoxH = 14
  const gap = D.cardGap || 2

  // If columns end at very different heights, fill the shorter column
  if (Math.abs(leftY - rightY) > minBoxH + gap) {
    if (leftY < rightY) {
      const h = rightY - leftY - gap
      if (h >= minBoxH) drawNotesBox(doc, LEFT_COL_X, leftY, MCOL_W, h)
      leftY = rightY
    } else {
      const h = leftY - rightY - gap
      if (h >= minBoxH) drawNotesBox(doc, RIGHT_COL_X, rightY, MCOL_W, h)
      rightY = leftY
    }
  }

  // Fill remaining full-width space at the bottom
  const bottomY = Math.max(leftY, rightY) + 1
  const bottomH = BOTTOM - bottomY - 3
  if (bottomH >= minBoxH) {
    drawNotesBox(doc, LEFT, bottomY, CW, bottomH)
  }
}

function drawFooter(doc, page, total) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...MUTED)
  doc.text('keyshortcut.com', LEFT, PH - OUTER - 3)
  doc.text(`${page} / ${total}`, RIGHT, PH - OUTER - 3, { align: 'right' })
}

/* ════════════════════════════════════════════════
   Masonry simulation & adaptive scaling
   ════════════════════════════════════════════════ */

function simulateMasonry(sections) {
  let lH = 0, rH = 0
  for (const s of sections) {
    const ch = cardH(s.shortcuts.length) + D.cardGap
    if (lH <= rH) lH += ch; else rH += ch
  }
  return Math.max(lH, rH)
}

/* ════════════════════════════════════════════════
   Public API
   ════════════════════════════════════════════════ */

/**
 * Draws the cheat sheet of one app into `doc`, from the page the document is
 * on. The page must be empty; more pages are added as needed.
 * `title` prints the app's name in the bar at the top (the bundle needs it:
 * a sheet of its own is named by its file).
 */
export function drawAppSheet(doc, app, { title = false } = {}) {
  // Auto-group large sections
  const allSections = app.sections.flatMap(s =>
    s.shortcuts.length ? autoGroupSection(s) : []
  )

  // Calculate adaptive scale to fit one page
  setScale(1)
  const neededAt1x = simulateMasonry(allSections)
  if (neededAt1x > PAGE_H) {
    const scale = Math.max(0.6, PAGE_H / neededAt1x)
    setScale(scale)
  }

  const startPage = () => {
    initPage(doc)
    if (title) drawSheetTitle(doc, app.displayName)
  }

  startPage()
  let leftY = START_Y, rightY = START_Y

  const newPage = () => {
    doc.addPage()
    startPage()
    leftY = START_Y
    rightY = START_Y
  }

  for (const section of allSections) {
    if (!section.shortcuts.length) continue

    const ch = cardH(section.shortcuts.length)
    const isLarge = ch > PAGE_H

    if (isLarge) {
      const fullH = cardH(Math.ceil(section.shortcuts.length / 2))
      const startAt = Math.max(leftY, rightY)
      if (startAt + fullH > BOTTOM) newPage()
      const dy = Math.max(leftY, rightY)
      const h = drawFullWidthCard(doc, LEFT, dy, CW, section)
      leftY = rightY = dy + h + D.cardGap
    } else {
      let col, ty
      if (leftY <= rightY) {
        if (leftY + ch <= BOTTOM) { col = 'L'; ty = leftY }
        else if (rightY + ch <= BOTTOM) { col = 'R'; ty = rightY }
        else { newPage(); col = 'L'; ty = leftY }
      } else {
        if (rightY + ch <= BOTTOM) { col = 'R'; ty = rightY }
        else if (leftY + ch <= BOTTOM) { col = 'L'; ty = leftY }
        else { newPage(); col = 'L'; ty = leftY }
      }
      const cx = col === 'L' ? LEFT_COL_X : RIGHT_COL_X
      const h = drawCard(doc, cx, ty, MCOL_W, section)
      if (col === 'L') leftY = ty + h + D.cardGap
      else rightY = ty + h + D.cardGap
    }
  }

  fillWithNotes(doc, leftY, rightY)
}

/** The app's name in the bar at the top of a sheet, right of the three dots. */
function drawSheetTitle(doc, name) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...INK)
  doc.text(name, PW / 2, OUTER + 5.6, { align: 'center' })
  doc.setFont('helvetica', 'normal')
}

export function generateShortcutPDF(app) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  drawAppSheet(doc, app)

  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) { doc.setPage(p); drawFooter(doc, p, total) }

  doc.save(`${app.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-shortcuts.pdf`)
}

/* ════════════════════════════════════════════════
   The bundle: every sheet of a platform in one file
   ════════════════════════════════════════════════ */

function drawCover(doc, { platformName, apps, shortcutCount, date }) {
  initPage(doc)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.text(`${platformName} shortcuts`, PW / 2, 108, { align: 'center' })
  doc.setFontSize(15)
  doc.setFont('helvetica', 'normal')
  doc.text('Every cheat sheet in one file', PW / 2, 120, { align: 'center' })

  const keys = ['K', 'E', 'Y', 'S']
  let x = PW / 2 - (keys.length * 13 - 3) / 2
  for (const key of keys) {
    doc.setFillColor(...SHADOW)
    doc.roundedRect(x + 0.5, 136.6, 10, 10, 2, 2, 'F')
    doc.setFillColor(...KEYCAP_BG)
    doc.roundedRect(x, 136, 10, 10, 2, 2, 'F')
    doc.setTextColor(...KEYCAP_FG)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(key, x + 5, 142.6, { align: 'center' })
    x += 13
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text(`${apps.length} apps  \u00B7  ${shortcutCount.toLocaleString('en-US')} shortcuts`, PW / 2, 162, { align: 'center' })
  doc.text(`keyshortcut.com  \u00B7  ${date}`, PW / 2, 169, { align: 'center' })
}

// Contents: the apps by category, three columns, each with its page.
function drawContents(doc, entries) {
  const COLS = 3
  const colW = CW / COLS
  const rowH = 4.6
  const top = START_Y + 14
  let col = 0
  let y = top

  const startPage = () => {
    initPage(doc)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...INK)
    doc.text('Contents', LEFT, START_Y + 5)
    col = 0
    y = top
  }
  const next = (rows = 1) => {
    if (y + rows * rowH <= BOTTOM) return
    col += 1
    y = top
    if (col >= COLS) { doc.addPage(); startPage() }
  }

  startPage()
  let category = null
  for (const entry of entries) {
    if (entry.category !== category) {
      // A heading is never the last line of a column.
      next(2)
      if (y > top) y += 2
      category = entry.category
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...INK)
      doc.text(category, LEFT + col * colW, y)
      y += rowH
    }
    next()
    const x = LEFT + col * colW
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...INK)
    doc.text(entry.name, x + 1.5, y)
    doc.setTextColor(...MUTED)
    doc.text(String(entry.page), x + colW - 6, y, { align: 'right' })
    y += rowH
  }
}

/**
 * Every cheat sheet of a platform in one document: cover, contents, then the
 * sheets by category. Returns { doc, pages, entries }; the caller saves it
 * (scripts/build-pdf-bundle.mjs). Nothing here touches the browser.
 *
 *   apps          the platform's apps, as in public/data/platforms/<id>.json
 *   platformName  "macOS"
 *   date          as printed on the cover, e.g. "September 2026"
 */
export function buildBundle({ apps, platformName, date }) {
  const sorted = [...apps]
    .filter((app) => app.sections.some((s) => s.shortcuts.length))
    .sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.displayName.localeCompare(b.displayName))
  const shortcutCount = sorted.reduce((sum, app) => sum + app.shortcutCount, 0)

  // The sheets are drawn first, in a document of their own, to learn the page
  // of each app. The contents need those numbers before they can be drawn.
  const measure = new jsPDF({ unit: 'mm', format: 'a4' })
  const lengths = sorted.map((app, i) => {
    if (i > 0) measure.addPage()
    const before = measure.getNumberOfPages()
    drawAppSheet(measure, app, { title: true })
    return measure.getNumberOfPages() - before + 1
  })

  const contentsPages = (firstSheet) => {
    const trial = new jsPDF({ unit: 'mm', format: 'a4' })
    let page = firstSheet
    drawContents(trial, sorted.map((app, i) => {
      const entry = { category: app.category || 'Other', name: app.displayName, page }
      page += lengths[i]
      return entry
    }))
    return trial.getNumberOfPages()
  }
  // Cover is page 1. The contents push the sheets back by their own length.
  const contentsLength = contentsPages(3)
  let page = 2 + contentsLength
  const entries = sorted.map((app, i) => {
    const entry = { category: app.category || 'Other', name: app.displayName, slug: app.slug, page }
    page += lengths[i]
    return entry
  })

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  drawCover(doc, { platformName, apps: sorted, shortcutCount, date })
  doc.addPage()
  drawContents(doc, entries)
  const names = new Map()
  for (const app of sorted) {
    doc.addPage()
    const first = doc.getNumberOfPages()
    drawAppSheet(doc, app, { title: true })
    for (let p = first; p <= doc.getNumberOfPages(); p++) names.set(p, app.displayName)
  }

  const total = doc.getNumberOfPages()
  for (let p = 2; p <= total; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text(names.has(p) ? `keyshortcut.com  \u00B7  ${names.get(p)}` : 'keyshortcut.com', LEFT, PH - OUTER - 3)
    doc.text(`${p} / ${total}`, RIGHT, PH - OUTER - 3, { align: 'right' })
  }

  return { doc, pages: total, entries, apps: sorted.length, shortcuts: shortcutCount }
}
