#!/usr/bin/env node
/**
 * parse-microsoft-support.mjs
 *
 * Reads ONE saved article of support.microsoft.com ("Keyboard shortcuts in ...")
 * from a local HTML file, takes ONE platform tab, and turns the rows of its
 * tables into shortcuts. Reads files, writes files. No network, no database.
 *
 * Two steps, one script:
 *
 * 1. Parse (always). Every table row of the tab becomes a record:
 *    parsed ("ok") or left out, with the reason.
 *
 *      node content/pending-apps/tools/parse-microsoft-support.mjs \
 *        --html /path/to/excel.html --tab windows --raw /path/to/excel.rows.json
 *
 * 2. Build (with --config). The action of every shortcut is written by hand in
 *    the config file, under the id of its row. The script joins the two, leaves
 *    out what the site already has and what occurs twice, checks the result and
 *    writes the file for `pnpm add-app -- --from-json`.
 *
 *      node content/pending-apps/tools/parse-microsoft-support.mjs \
 *        --html /path/to/excel.html \
 *        --config content/pending-apps/tools/microsoft-support/excel.json \
 *        --existing public/data/platforms/windows.json \
 *        --out content/pending-apps/windows/excel.json \
 *        --stats /path/to/excel.stats.json
 *
 * How the page marks its tabs:
 *   <section role="tabpanel" data-tab="windows" id="tabpanel_1_windows"> ... </section>
 * One section per tab. --tab is the value of data-tab.
 *
 * Rules of the key parser (strict on purpose: a wrong key is worse than none):
 *   - A key cell is read line by line (<br>, <p>, <li> start a line).
 *   - Every part of a shortcut must be a known modifier or a known key.
 *     Anything else leaves the row out.
 *   - "or", several shortcuts in one cell, a group of keys ("Arrow keys"),
 *     the numeric keypad, a left or right modifier, the mouse: left out.
 *   - A sequence is accepted in two forms only:
 *       Alt, H, B  /  Alt+H, B      -> modifiers ["alt"], key "H B"   (ribbon access keys)
 *       Ctrl+K, Ctrl+C              -> modifiers ["control"], key "K C"
 *   - Tables "Key | Description" (function keys) are read line by line, and a
 *     line counts only in the form "Ctrl+F1: text" or "F1 alone: text".
 */
import * as cheerio from 'cheerio'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'

// ── Tables of names ─────────────────────────────────────────

export const MODIFIER_ORDER = ['control', 'alt', 'shift', 'super']

const MODIFIER_NAMES = {
  ctrl: 'control',
  control: 'control',
  alt: 'alt',
  shift: 'shift',
  'windows key': 'super',
  'windows logo key': 'super',
}

/** Key names as the page writes them (lower case) -> as the site's data writes them. */
const KEY_NAMES = {
  enter: 'Enter',
  tab: 'Tab',
  'tab key': 'Tab',
  esc: 'Esc',
  escape: 'Esc',
  spacebar: 'Space',
  backspace: 'Backspace',
  delete: 'Delete',
  insert: 'Insert',
  home: 'Home',
  end: 'End',
  'page up': 'Page Up',
  pageup: 'Page Up',
  'page down': 'Page Down',
  pagedown: 'Page Down',
  'left arrow key': '←',
  'right arrow key': '→',
  'up arrow key': '↑',
  'down arrow key': '↓',
  'left arrow': '←',
  'right arrow': '→',
  'up arrow': '↑',
  'down arrow': '↓',
}

/** "Plus sign (+)": the name must be known AND the sign in brackets must be the one the name says. */
const SYMBOL_NAMES = {
  'plus sign': '+',
  plus: '+',
  'minus sign': '-',
  minus: '-',
  hyphen: '-',
  'equal sign': '=',
  'equals sign': '=',
  period: '.',
  comma: ',',
  semicolon: ';',
  colon: ':',
  'left bracket': '[',
  'right bracket': ']',
  'left angle bracket': '<',
  'right angle bracket': '>',
  'question mark': '?',
  'forward slash': '/',
  slash: '/',
  backslash: '\\',
  ampersand: '&',
  'ampersand sign': '&',
  'at sign': '@',
  'exclamation point': '!',
  'exclamation mark': '!',
  'number sign': '#',
  'dollar sign': '$',
  'percent sign': '%',
  caret: '^',
  'caret sign': '^',
  asterisk: '*',
  'asterisk sign': '*',
  'tilde sign': '~',
  tilde: '~',
  underscore: '_',
  'grave accent': '`',
  'back quote': '`',
  'single quotation mark': "'",
  apostrophe: "'",
  'straight quotation mark': '"',
  'left parenthesis': '(',
  'right parenthesis': ')',
  'vertical bar': '|',
}

/** Reasons a key cell is left out before its parts are read. First match wins. */
const REJECT_PATTERNS = [
  [/no shortcut|not available/i, 'the page gives no shortcut for the desktop app'],
  [/numeric keypad|num lock|numpad/i, 'numeric keypad'],
  [/\b(left|right) (shift|alt|ctrl)\b/i, 'left or right modifier key'],
  [/\bscroll lock\b/i, 'a key the data has no name for (Scroll Lock)'],
  [/\bmenu key\b/i, 'a key the data has no name for (Menu key)'],
  [/\b(mouse|click|drag|scroll|wheel|hover)/i, 'mouse action'],
  [/\bor\b/i, 'several alternatives ("or")'],
  [/[^\s+]\/|\/[^\s+]/, 'several alternatives ("/")'],
  [/\barrow keys?\b(?<!\b(left|right|up|down) arrow key)/i, 'a group of keys (arrow keys)'],
  [/\b(the letter|character code|type |page number|first few characters)/i, 'typed text is part of the shortcut'],
]

/** Lines of a key cell that say nothing about the current version. They are dropped. */
const VERSION_NOTE = /^Office (20\d\d|20\d\d and Office 20\d\d)\s*:/

/** Words after the shortcut that are an instruction, not a key. Dropped, the row is flagged. */
const TRAILING_INSTRUCTION = /,\s*(?:and )?then (?:enter|type) the search term$/i

// US keyboard: the sign a key gives with Shift -> the key. Used to COMPARE only.
const SHIFTED = {
  '!': '1', '@': '2', '#': '3', $: '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
  _: '-', '+': '=', '~': '`', '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/',
}

const COMPARE_KEY_ALIASES = {
  escape: 'Esc', esc: 'Esc', return: 'Enter', '↩': 'Enter', '⏎': 'Enter', enter: 'Enter',
  left: '←', right: '→', up: '↑', down: '↓',
  arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓',
  del: 'Delete', delete: 'Delete', backspace: 'Backspace', '⌫': 'Backspace', '⌦': 'Delete',
  spacebar: 'Space', space: 'Space', tab: 'Tab', '⇥': 'Tab',
  pgup: 'Page Up', pgdn: 'Page Down', 'page up': 'Page Up', 'page down': 'Page Down',
  home: 'Home', end: 'End', insert: 'Insert', ins: 'Insert',
}

const COMPARE_MODIFIER_ALIASES = {
  ctrl: 'control', control: 'control', '⌃': 'control',
  alt: 'alt', option: 'alt', '⌥': 'alt',
  shift: 'shift', '⇧': 'shift',
  win: 'super', windows: 'super', super: 'super', meta: 'super', '⌘': 'super',
}

// ── Small helpers ───────────────────────────────────────────

const clean = (s) =>
  String(s ?? '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .trim()

const hash8 = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8)

const sortModifiers = (mods) =>
  [...new Set(mods)].sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b))

/** The lines of a table cell. <br>, <p>, <li> and <div> start a new line. */
function cellLines($, td) {
  const c = $(td).clone()
  c.find('br').replaceWith('\n')
  c.find('p,li,div,ul,ol').each((_, el) => {
    $(el).prepend('\n')
    $(el).append('\n')
  })
  const lines = c.text().split('\n').map(clean).filter(Boolean)
  // A break inside a key name: "Windows" / "key+Shift+N", "Ctrl+Shift+Down" / "arrow key".
  const joined = []
  for (const line of lines) {
    if (joined.length && /^(key|arrow key)\b/.test(line)) joined[joined.length - 1] += ` ${line}`
    else joined.push(line)
  }
  return joined
}

// ── The key parser ──────────────────────────────────────────

/** One token between plus signs -> { modifier } | { key } | { error }. */
function readToken(raw, symbols) {
  const token = clean(raw)
  if (!token) return { error: 'an empty part between plus signs' }
  const placeholder = token.match(/^\u0001(\d+)\u0001$/)
  if (placeholder) return { key: symbols[Number(placeholder[1])] }
  const lower = token.toLowerCase()
  if (Object.hasOwn(MODIFIER_NAMES, lower)) return { modifier: MODIFIER_NAMES[lower] }
  if (Object.hasOwn(KEY_NAMES, lower)) return { key: KEY_NAMES[lower] }
  if (/^[a-z]$/i.test(token)) return { key: token.toUpperCase() }
  if (/^[0-9]$/.test(token)) return { key: token }
  if (/^f([1-9]|1[0-2])$/i.test(token)) return { key: token.toUpperCase() }
  if (/^[;'`\[\]\\.=?\-<>\/]$/.test(token)) return { key: token }
  return { error: `a part that is not a known key: "${token}"` }
}

/** "Ctrl+Shift+F" -> { modifiers, keys } (one chord). */
function readChord(text, symbols) {
  const modifiers = []
  const keys = []
  for (const part of text.split('+')) {
    const t = readToken(part, symbols)
    if (t.error) return { error: t.error }
    if (t.modifier) {
      if (keys.length) return { error: 'a modifier after the key' }
      modifiers.push(t.modifier)
    } else keys.push(t.key)
  }
  if (keys.length > 1) return { error: 'two keys held together' }
  return { modifiers: sortModifiers(modifiers), keys }
}

/**
 * One line of a key cell -> { ok, modifiers, key, flags } or { ok: false, reason }.
 */
export function parseShortcutText(input) {
  const flags = []
  let text = clean(input)
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
  text = text.replace(/\.$/, '')
  if (!text) return { ok: false, reason: 'empty key cell' }

  if (TRAILING_INSTRUCTION.test(text)) {
    text = text.replace(TRAILING_INSTRUCTION, '')
    flags.push('instruction after the shortcut dropped')
  }

  // Named signs first, so that the plus sign and the comma inside them do not split the text.
  const symbols = []
  let bad = null
  text = text.replace(/([A-Za-z]+(?: [a-z]+){0,3}?)\s*\(\s*(\S)\s*\)/g, (whole, name, sign) => {
    const expected = SYMBOL_NAMES[name.toLowerCase()]
    if (!expected) {
      bad = bad || `a sign with an unknown name: "${whole}"`
      return whole
    }
    if (expected !== sign) {
      bad = bad || `name and sign do not agree: "${whole}"`
      return whole
    }
    symbols.push(sign)
    return `\u0001${symbols.length - 1}\u0001`
  })

  for (const [pattern, reason] of REJECT_PATTERNS) if (pattern.test(text)) return { ok: false, reason }
  if (bad) return { ok: false, reason: bad }
  if (/[()":]/.test(text)) return { ok: false, reason: 'a note or a label inside the key cell' }

  const parts = text.split(/\s*,\s*(?:and then |then |and )?/).map(clean)
  const chords = []
  for (const part of parts) {
    const chord = readChord(part, symbols)
    if (chord.error) return { ok: false, reason: chord.error }
    chords.push(chord)
  }

  if (chords.length === 1) {
    const [c] = chords
    if (c.keys.length !== 1) return { ok: false, reason: 'modifier keys only, no key' }
    return { ok: true, modifiers: c.modifiers, key: c.keys[0], flags }
  }

  // Ribbon access keys: Alt, then keys one after another.
  const [first, ...rest] = chords
  const accessKey = (k) => /^[A-Z0-9]$/.test(k)
  if (
    first.modifiers.length === 1 && first.modifiers[0] === 'alt' &&
    first.keys.every(accessKey) &&
    rest.every((c) => c.modifiers.length === 0 && c.keys.length === 1 && accessKey(c.keys[0]))
  ) {
    const keys = [...first.keys, ...rest.map((c) => c.keys[0])]
    flags.push('sequence: ribbon access keys')
    return { ok: true, modifiers: ['alt'], key: keys.join(' '), flags }
  }

  // The same modifiers held for every key: Ctrl+K, Ctrl+C.
  const same = (c) => c.modifiers.join('+') === first.modifiers.join('+')
  if (first.modifiers.length > 0 && chords.every((c) => c.keys.length === 1 && same(c))) {
    flags.push('sequence: same modifiers')
    return { ok: true, modifiers: first.modifiers, key: chords.map((c) => c.keys[0]).join(' '), flags }
  }

  return { ok: false, reason: 'a sequence that is not in one of the two accepted forms' }
}

/** A whole key cell (its lines) -> parsed shortcut or reason. */
export function parseKeyCell(lines) {
  const kept = lines.filter((l) => !VERSION_NOTE.test(l))
  const flags = []
  if (kept.length !== lines.length) flags.push('note about an old Office version dropped')
  if (!kept.length) return { ok: false, reason: 'the page gives no shortcut for the desktop app' }

  if (kept.length === 1) {
    const r = parseShortcutText(kept[0])
    return r.ok ? { ...r, flags: [...flags, ...r.flags] } : r
  }

  const first = parseShortcutText(kept[0])
  const others = kept.slice(1).map((l) => ({ line: l, parsed: parseShortcutText(l) }))
  if (others.some((o) => /^or\b/i.test(o.line))) return { ok: false, reason: 'several alternatives ("or")' }
  if (!first.ok) return { ok: false, reason: `several lines in the key cell; the first: ${first.reason}` }

  const id = (p) => `${p.modifiers.join('+')}::${p.key}`
  const otherShortcuts = others.filter((o) => o.parsed.ok)
  if (otherShortcuts.some((o) => id(o.parsed) !== id(first))) {
    return { ok: false, reason: 'several shortcuts in one cell' }
  }
  if (otherShortcuts.length === others.length) {
    flags.push('the same shortcut on every line of the cell')
  } else {
    // Text under the shortcut. It must read like a sentence, not like keys.
    const prose = others.filter((o) => !o.parsed.ok)
    if (prose.some((o) => o.line.split(' ').length < 4)) {
      return { ok: false, reason: 'several lines in the key cell that are not a plain note' }
    }
    flags.push('note under the shortcut: read by hand')
  }
  return { ok: true, modifiers: first.modifiers, key: first.key, flags: [...flags, ...first.flags] }
}

/** Alternatives of a cell that was left out, for comparing with the site's data. Never written. */
function readAlternatives(lines) {
  const found = []
  for (const line of lines) {
    const text = line.replace(VERSION_NOTE, '').replace(/^or,?\s*/i, '')
    for (const piece of text.split(/\s+or\s+|\s*¶\s*/i)) {
      const r = parseShortcutText(piece)
      if (r.ok) found.push({ modifiers: r.modifiers, key: r.key })
    }
  }
  return found
}

// ── Reading the page ────────────────────────────────────────

export function listTabs(html) {
  const $ = cheerio.load(html)
  return $('section[role="tabpanel"][data-tab]')
    .map((_, el) => ({ tab: $(el).attr('data-tab'), id: $(el).attr('id'), tables: $(el).find('table').length }))
    .get()
}

export function parsePage(html, tab) {
  const $ = cheerio.load(html)
  const panels = $(`section[role="tabpanel"][data-tab="${tab}"]`)
  if (panels.length !== 1) throw new Error(`Expected one tab "${tab}", found ${panels.length}. Tabs: ${listTabs(html).map((t) => t.tab).join(', ')}`)
  const panel = panels.first()

  const rows = []
  const tables = []
  const heading = { h2: '', h3: '', h4: '' }
  let tableIndex = -1

  panel.find('h2, h3, h4, table').each((_, el) => {
    const tag = el.tagName.toLowerCase()
    if (tag === 'h2') return Object.assign(heading, { h2: clean($(el).text()), h3: '', h4: '' })
    if (tag === 'h3') return Object.assign(heading, { h3: clean($(el).text()), h4: '' })
    if (tag === 'h4') return Object.assign(heading, { h4: clean($(el).text()) })
    if ($(el).parents('table').length) return // a table inside a table is read with its parent

    tableIndex += 1
    const t = tableIndex
    const path = [heading.h2, heading.h3].filter(Boolean).join(' > ')
    const headers = $(el).find('tr').first().find('th').map((__, th) => clean($(th).text())).get()
    const lower = headers.map((h) => h.toLowerCase())

    const actionColumn = lower.findIndex((h) => /^to (do|insert) this/.test(h))
    let keyColumn = lower.findIndex((h) => /desktop app/.test(h))
    if (keyColumn === -1) keyColumn = lower.findIndex((h) => /^(press|use)$/.test(h))
    const isKeyTable = lower[0] === 'key' && lower[1] === 'description'
    const kind = isKeyTable ? 'key-description' : actionColumn !== -1 && keyColumn !== -1 ? 'action-key' : 'other'

    let dataRows = 0
    $(el).find('tr').each((r, tr) => {
      const cells = $(tr).children('td')
      if (!cells.length) return
      dataRows += 1
      const base = { table: t, heading: path, kind }

      if (kind === 'other') {
        const texts = cells.map((__, td) => cellLines($, td).join(' ¶ ')).get()
        rows.push({ id: `T${t}R${r}`, ...base, doc: texts[0] || '', keysText: texts[1] || '', ok: false, reason: `not a table of shortcuts (columns: ${headers.join(' | ') || 'none'})` })
        return
      }

      if (kind === 'action-key') {
        const doc = cellLines($, cells.get(actionColumn)).join(' ¶ ')
        const lines = cells.get(keyColumn) ? cellLines($, cells.get(keyColumn)) : []
        const keysText = lines.join(' ¶ ')
        const parsed = lines.length ? parseKeyCell(lines) : { ok: false, reason: 'empty key cell' }
        const row = { id: `T${t}R${r}`, ...base, doc, keysText, ...parsed }
        if (!parsed.ok) row.alternatives = readAlternatives(lines)
        rows.push(row)
        return
      }

      // key-description: one line, one shortcut, only in the form "Ctrl+F1: text" / "F1 alone: text"
      const rowKey = cellLines($, cells.get(0)).join(' ')
      const lines = cellLines($, cells.get(1))
      lines.forEach((line, l) => {
        const id = `T${t}R${r}L${l + 1}`
        const m = line.match(/^([^:]{1,40}?)( alone)?:\s+(.+)$/)
        if (!m) {
          rows.push({ id, ...base, doc: line, keysText: rowKey, ok: false, reason: 'a line of text without a shortcut in front (Key | Description table)' })
          return
        }
        const parsed = parseShortcutText(m[1])
        const row = { id, ...base, doc: m[3], keysText: clean(m[1] + (m[2] || '')), ...parsed }
        if (parsed.ok && parsed.key !== parseShortcutText(rowKey).key) {
          Object.assign(row, { ok: false, reason: 'the shortcut of the line is not of the key of its row' })
        }
        if (!row.ok) row.alternatives = []
        rows.push(row)
      })
    })
    tables.push({ table: t, heading: path, headers, kind, rows: dataRows })
  })

  for (const row of rows) row.docHash = hash8(row.doc)
  return { tab, tables, rows }
}

// ── Comparing shortcuts ─────────────────────────────────────

/** The same combination gives the same id, however it is written. */
export function comboId(modifiers, key) {
  const mods = new Set((modifiers || []).map((m) => COMPARE_MODIFIER_ALIASES[String(m).toLowerCase()] || String(m).toLowerCase()))
  const raw = String(key).trim()
  let parts = raw === ' ' ? ['Space'] : raw.split(/\s+/)
  if (COMPARE_KEY_ALIASES[raw.toLowerCase()]) parts = [COMPARE_KEY_ALIASES[raw.toLowerCase()]]
  parts = parts.map((p) => {
    if (COMPARE_KEY_ALIASES[p.toLowerCase()]) return COMPARE_KEY_ALIASES[p.toLowerCase()]
    if (/^[a-z]$/i.test(p)) return p.toUpperCase()
    if (/^f\d+$/i.test(p)) return p.toUpperCase()
    return p
  })
  // With Shift held, the sign and its key are one combination: Ctrl+Shift+: is Ctrl+Shift+;
  // Without Shift in the text nothing is added: the page itself tells Ctrl+Plus sign (zoom in)
  // from Ctrl+Shift+Plus sign (superscript).
  // A sign alone ("?") cannot be typed without Shift, so it is Shift and its key.
  if (parts.length === 1 && Object.hasOwn(SHIFTED, parts[0]) && (mods.has('shift') || mods.size === 0)) {
    parts = [SHIFTED[parts[0]]]
    mods.add('shift')
  }
  return `${sortModifiers([...mods]).join('+')}::${parts.join(' ')}`
}

// ── Checks on the text of an action ─────────────────────────

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with', 'without', 'vs'])
const KEY_NAME_IN_ACTION = /\b(ctrl|alt|shift|win(dows)? key|f([1-9]|1[0-2])|spacebar|backspace|esc|escape|enter|page up|page down|arrow key)\b|\w\+\w/i

export function checkAction(action) {
  const problems = []
  if (typeof action !== 'string' || !action.trim()) return ['empty']
  if (action !== action.trim() || /\s{2,}/.test(action)) problems.push('spaces')
  if (action.length > 60) problems.push(`longer than 60 (${action.length})`)
  if (/[.;:!]$/.test(action)) problems.push('closing punctuation')
  if (KEY_NAME_IN_ACTION.test(action)) problems.push('names a key')
  action.split(/[\s/]+/).forEach((word, i) => {
    const w = word.replace(/^[("']+/, '')
    if (!w || !/^[a-z]/.test(w)) return
    if (i > 0 && SMALL_WORDS.has(w.toLowerCase())) return
    problems.push(`not Title Case: "${word}"`)
  })
  return problems
}

/** The key add-app.mjs makes for the translation of an action (same code). */
export function actionKey(slug, action) {
  const camel = action
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('')
  return `shortcuts.${slug}.${camel}`
}

// ── Build ───────────────────────────────────────────────────

export function build({ page, config, existingApp, existingActions = [] }) {
  const leftOut = []
  const problems = []
  const existingIds = new Map()
  for (const section of existingApp?.sections || []) {
    for (const s of section.shortcuts) existingIds.set(comboId(s.modifiers, s.key), { section: section.name, ...s })
  }

  const seen = new Map()
  const sections = new Map()
  for (const name of config.sectionOrder || []) sections.set(name, [])
  const counts = { rows: page.rows.length, parsed: 0, written: 0, alreadyInData: 0, twice: 0, review: 0, notParsed: 0, noAction: 0, changed: 0 }

  for (const row of page.rows) {
    if (!row.ok) {
      counts.notParsed += 1
      leftOut.push({ id: row.id, group: row.reason.replace(/: ".*"$/, '').replace(/ \(columns: .*\)$/, ''), reason: row.reason, doc: row.doc, keysText: row.keysText, heading: row.heading })
      continue
    }
    counts.parsed += 1
    const id = comboId(row.modifiers, row.key)
    const entry = config.rows?.[row.id]

    if (entry?.skip) {
      counts.review += 1
      leftOut.push({ id: row.id, group: `left out by hand: ${entry.skip}`, reason: entry.skip, doc: row.doc, keysText: row.keysText, heading: row.heading })
      continue
    }
    if (existingIds.has(id)) {
      counts.alreadyInData += 1
      leftOut.push({ id: row.id, group: 'already in the data of the site', reason: 'already in the data of the site', doc: row.doc, keysText: row.keysText, heading: row.heading, existing: existingIds.get(id) })
      continue
    }
    if (seen.has(id)) {
      counts.twice += 1
      leftOut.push({ id: row.id, group: 'the same combination earlier on the page', reason: `the same combination as ${seen.get(id)}`, doc: row.doc, keysText: row.keysText, heading: row.heading })
      continue
    }
    if (!entry) {
      counts.noAction += 1
      problems.push(`${row.id}: no action written  [${row.heading}]  ${row.keysText}  =>  ${row.doc}`)
      continue
    }
    if (entry.keys !== row.keysText || entry.doc !== row.docHash) {
      counts.changed += 1
      problems.push(`${row.id}: the page differs from what the action was written for (keys "${row.keysText}", doc ${row.docHash})`)
      continue
    }

    const name = entry.section || config.sections?.[row.heading]
    if (!name) {
      problems.push(`${row.id}: no section for the heading "${row.heading}"`)
      continue
    }
    for (const p of checkAction(entry.action)) problems.push(`${row.id}: action "${entry.action}": ${p}`)

    seen.set(id, row.id)
    if (!sections.has(name)) sections.set(name, [])
    sections.get(name).push({ modifiers: row.modifiers, key: row.key, action: entry.action, _row: row.id })
    counts.written += 1
  }

  for (const id of Object.keys(config.rows || {})) {
    if (!page.rows.some((r) => r.id === id)) problems.push(`${id}: in the config, not on the page`)
  }

  // One text per translation key. add-app.mjs keeps one translation per key for the whole app
  // (every platform), and overwrites its text: an action that gives the key of a text the site
  // has, written differently, would change that text on the site.
  const onSite = new Map()
  for (const e of existingActions) onSite.set(actionKey(config.slug, e.action), e)
  const byKey = new Map()
  const sharedTexts = []
  for (const [, list] of sections) {
    for (const s of list) {
      const k = actionKey(config.slug, s.action)
      if (byKey.has(k) && byKey.get(k) !== s.action) problems.push(`${s._row}: "${s.action}" and "${byKey.get(k)}" give the same translation key`)
      byKey.set(k, s.action)
      const e = onSite.get(k)
      if (e && e.action !== s.action) problems.push(`${s._row}: "${s.action}" would overwrite the text "${e.action}" the site has (${e.platform})`)
      if (e && e.action === s.action) sharedTexts.push({ row: s._row, action: s.action, platform: e.platform })
    }
  }

  const out = {
    slug: config.slug,
    displayName: config.displayName,
    category: config.category,
    docsUrl: config.docsUrl,
    platform: config.platform,
    sections: [...sections]
      .filter(([, list]) => list.length)
      .map(([name, list]) => ({ name, shortcuts: list.map(({ modifiers, key, action }) => ({ modifiers, key, action })) })),
  }
  const trace = [...sections].flatMap(([name, list]) => list.map((s) => ({ section: name, ...s })))
  return { out, counts, leftOut, problems, trace, sharedTexts }
}

// ── Command line ────────────────────────────────────────────

function readArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue
    const name = argv[i].slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) args[name] = true
    else {
      args[name] = next
      i += 1
    }
  }
  return args
}

function writeJson(path, data) {
  mkdirSync(dirname(resolve(path)), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function main() {
  const args = readArgs(process.argv.slice(2))
  if (!args.html) {
    console.error('Usage: parse-microsoft-support.mjs --html <file> [--tab windows] [--raw <file>] [--config <file> --existing <platform json> --out <file> --stats <file>]')
    process.exit(2)
  }
  const html = readFileSync(args.html, 'utf8')
  const config = args.config ? JSON.parse(readFileSync(args.config, 'utf8')) : null
  const tab = args.tab || config?.tab || 'windows'

  if (args.tabs) {
    console.log(listTabs(html))
    return
  }

  const page = parsePage(html, tab)
  const ok = page.rows.filter((r) => r.ok).length
  console.log(`tab "${tab}": ${page.tables.length} tables, ${page.rows.length} rows and lines, ${ok} parsed, ${page.rows.length - ok} left out`)
  if (args.raw) writeJson(args.raw, page)
  if (!config) return

  let existingApp = null
  const existingActions = []
  if (args.existing) {
    const data = JSON.parse(readFileSync(args.existing, 'utf8'))
    existingApp = (data.apps || []).find((a) => a.slug === config.slug) || null
    // The texts of the same app on every platform: the files beside --existing.
    const dir = dirname(resolve(args.existing))
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const app = (JSON.parse(readFileSync(resolve(dir, file), 'utf8')).apps || []).find((a) => a.slug === config.slug)
      for (const section of app?.sections || []) {
        for (const sc of section.shortcuts) existingActions.push({ platform: file.replace('.json', ''), action: sc.action })
      }
    }
  }
  const result = build({ page, config, existingApp, existingActions })
  console.log(`existing app on the site: ${existingApp ? `${existingApp.sections.reduce((n, s) => n + s.shortcuts.length, 0)} shortcuts` : 'none'}`)
  console.log(result.counts)
  console.log(result.out.sections.map((s) => `${s.name}: ${s.shortcuts.length}`).join(' | '))
  if (args.stats) writeJson(args.stats, { counts: result.counts, tables: page.tables, leftOut: result.leftOut, trace: result.trace, sharedTexts: result.sharedTexts, problems: result.problems })
  if (result.problems.length) {
    console.error(`\n${result.problems.length} problems:`)
    for (const p of result.problems.slice(0, Number(args.show) || 400)) console.error(`  ${p}`)
    if (!args.force) {
      console.error('\nNothing written. Fix the config, or pass --force to write what is complete.')
      process.exit(1)
    }
  }
  if (args.out) {
    writeJson(args.out, result.out)
    console.log(`written: ${args.out}`)
  }
}

const runDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)
if (runDirectly) main()
