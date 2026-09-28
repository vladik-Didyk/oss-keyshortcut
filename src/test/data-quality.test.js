import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { humanizeActionKey, cleanApp } from '../../scripts/lib/clean-platform-data.mjs'

const PLATFORMS = ['macos', 'windows', 'linux']
const load = (p) => JSON.parse(readFileSync(join(process.cwd(), `public/data/platforms/${p}.json`), 'utf-8')).apps
const normalize = (name) => name.toLowerCase().replace(/&/g, ' and ').replace(/\s+/g, ' ').trim()

describe('committed platform data is clean (run `pnpm clean-data` if this fails)', () => {
  for (const platform of PLATFORMS) {
    const apps = load(platform)

    it(`${platform}: no raw translation keys shown as actions`, () => {
      const raw = apps.flatMap((a) => a.sections.flatMap((s) => s.shortcuts.filter((sc) => /^shortcuts\./.test(sc.action)).map((sc) => `${a.slug}: ${sc.action}`)))
      expect(raw).toEqual([])
    })

    it(`${platform}: no duplicate section names within an app`, () => {
      const dups = apps.flatMap((a) => {
        const names = a.sections.map((s) => normalize(s.name))
        return names.filter((n, i) => names.indexOf(n) !== i).map((n) => `${a.slug}: ${n}`)
      })
      expect(dups).toEqual([])
    })

    it(`${platform}: no duplicate shortcut rows within an app`, () => {
      const dups = apps.flatMap((a) => {
        const seen = new Set()
        const out = []
        for (const s of a.sections) for (const sc of s.shortcuts) {
          const k = `${sc.modifiers.join('+')}|${sc.key}|${sc.action.toLowerCase()}`
          if (seen.has(k)) out.push(`${a.slug}: ${k}`)
          seen.add(k)
        }
        return out
      })
      expect(dups).toEqual([])
    })

    it(`${platform}: shortcutCount matches the rows`, () => {
      for (const a of apps) {
        expect(a.shortcutCount).toBe(a.sections.reduce((n, s) => n + s.shortcuts.length, 0))
      }
    })
  }
})

describe('clean-platform-data', () => {
  it('humanizes untranslated action keys', () => {
    expect(humanizeActionKey('shortcuts.slack.openThreadsView')).toBe('Open threads view')
    expect(humanizeActionKey('shortcuts.slack.previousUnreadChannelDm')).toBe('Previous unread channel DM')
    expect(humanizeActionKey('shortcuts.after-effects.move3DLayer')).toBe('Move 3D layer')
    expect(humanizeActionKey('shortcuts.after-effects.newProject2')).toBe('New project')
    expect(humanizeActionKey('shortcuts.clickup.showHideSidebar')).toBe('Show/hide sidebar')
    expect(humanizeActionKey('Copy')).toBe('Copy')
  })

  it('merges same-named sections and drops duplicate rows', () => {
    const sc = (key, action) => ({ modifiers: ['⌘'], key, action })
    const app = cleanApp({
      slug: 'x',
      shortcutCount: 5,
      sections: [
        { name: 'Windows & Tabs', shortcuts: [sc('T', 'New tab'), sc('W', 'Close tab')] },
        { name: 'Windows and Tabs', shortcuts: [sc('T', 'New tab'), sc('N', 'New window')] },
        { name: 'Other', shortcuts: [sc('W', 'close tab')] },
      ],
    })
    expect(app.sections.map((s) => s.name)).toEqual(['Windows & Tabs'])
    expect(app.sections[0].shortcuts.map((s) => s.key)).toEqual(['T', 'W', 'N'])
    expect(app.shortcutCount).toBe(3)
  })
})
