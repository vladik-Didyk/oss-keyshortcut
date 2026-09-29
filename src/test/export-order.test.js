import { describe, it, expect } from 'vitest'
import { orderSection, keepOrder } from '../../scripts/lib/keep-order.mjs'

// The database answers in the order it keeps its rows. The export must not
// pass that order on: it moved shortcuts around when rows were added.
const sc = (action, key, order, modifiers = ['Ctrl']) => ({ modifiers, key, action, order })
const names = (list) => list.map((s) => s.action)

describe('order of the shortcuts in an export', () => {
  const before = [sc('Copy', 'C'), sc('Paste', 'V'), sc('Cut', 'X')]

  it('keeps a shortcut the last export had where it was', () => {
    const fromDatabase = [sc('Cut', 'X', 0), sc('Copy', 'C', 2), sc('Paste', 'V', 1)]
    expect(names(orderSection(fromDatabase, before))).toEqual(['Copy', 'Paste', 'Cut'])
  })

  it('puts new shortcuts after them, in the order of their file', () => {
    const fromDatabase = [sc('Redo', 'Y', 4), sc('Cut', 'X', 0), sc('Undo', 'Z', 3), sc('Copy', 'C', 2), sc('Paste', 'V', 1)]
    expect(names(orderSection(fromDatabase, before))).toEqual(['Copy', 'Paste', 'Cut', 'Undo', 'Redo'])
  })

  it('gives the same result whatever order the database answers in', () => {
    const rows = [sc('Redo', 'Y', 4), sc('Cut', 'X', 0), sc('Undo', 'Z', 3), sc('Copy', 'C', 2), sc('Paste', 'V', 1), sc('Find', 'F', 3)]
    const one = orderSection(rows, before)
    const other = orderSection([...rows].reverse(), before)
    expect(other).toEqual(one)
  })

  it('orders a section without a last export by sort_order', () => {
    expect(names(orderSection([sc('B', 'B', 1), sc('C', 'C', 2), sc('A', 'A', 0)]))).toEqual(['A', 'B', 'C'])
  })

  it('leaves out a shortcut the database no longer has', () => {
    expect(names(orderSection([sc('Copy', 'C', 0), sc('Cut', 'X', 1)], before))).toEqual(['Copy', 'Cut'])
  })

  it('takes the sort_order out of what is written', () => {
    for (const shortcut of orderSection([sc('Copy', 'C', 0)], before)) {
      expect(Object.keys(shortcut).sort()).toEqual(['action', 'key', 'modifiers'])
    }
  })

  it('matches sections by app and by name', () => {
    const apps = [{ slug: 'excel', sections: [{ name: 'Editing', shortcuts: [sc('Cut', 'X', 0), sc('Copy', 'C', 1)] }, { name: 'New', shortcuts: [sc('B', 'B', 1), sc('A', 'A', 0)] }] }]
    const last = [{ slug: 'excel', sections: [{ name: 'Editing', shortcuts: before }] }, { slug: 'word', sections: [{ name: 'New', shortcuts: [sc('B', 'B')] }] }]
    const [excel] = keepOrder(apps, last)
    expect(names(excel.sections[0].shortcuts)).toEqual(['Copy', 'Cut'])
    expect(names(excel.sections[1].shortcuts)).toEqual(['A', 'B'])
  })
})
