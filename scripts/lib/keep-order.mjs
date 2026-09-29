/**
 * The order of the shortcuts of a section, for the export.
 *
 * The database gives the shortcuts of a section in the order it keeps its
 * rows, which changes when rows are added. Their `sort_order` does not hold
 * the order the site shows either: sorting by it would move shortcuts on many
 * pages that are live.
 *
 * So: a shortcut the previous export had stays where it was. A new one comes
 * after them, by its sort_order, which is the order of the file it came from.
 * The result does not depend on the order the database answers in.
 */
const idOf = (sc) => `${sc.modifiers.join('+')}|${sc.key}|${sc.action}`

/** One section. `previous`: the shortcuts the last export had for it, or none. */
export function orderSection(shortcuts, previous = []) {
  const place = new Map(previous.map((sc, index) => [idOf(sc), index]).reverse())
  const known = []
  const fresh = []
  shortcuts.forEach((sc, arrived) => {
    const at = place.get(idOf(sc))
    if (at === undefined) fresh.push({ sc, arrived })
    else known.push({ sc, at, arrived })
  })
  known.sort((a, b) => a.at - b.at || a.arrived - b.arrived)
  fresh.sort((a, b) => (a.sc.order ?? 0) - (b.sc.order ?? 0) || idOf(a.sc).localeCompare(idOf(b.sc)))
  return [...known, ...fresh].map(({ sc }) => {
    const { order: _order, ...shown } = sc
    return shown
  })
}

/** Every app of a platform. `previousApps`: the apps of the last export of that platform. */
export function keepOrder(apps, previousApps = []) {
  const before = new Map(previousApps.map((app) => [app.slug, app]))
  return apps.map((app) => {
    const sectionsBefore = new Map((before.get(app.slug)?.sections || []).map((s) => [s.name, s.shortcuts]))
    return {
      ...app,
      sections: app.sections.map((section) => ({
        ...section,
        shortcuts: orderSection(section.shortcuts, sectionsBefore.get(section.name)),
      })),
    }
  })
}
