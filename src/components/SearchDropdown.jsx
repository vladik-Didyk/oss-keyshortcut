import { useNavigate } from 'react-router'
import { ArrowRight } from '../utils/icons'
import { parseKeyParts } from '../utils/platformHelpers'
import { POPULAR_APPS } from '../data/popularApps'
import { linkPath } from '../utils/siteUrl'

/**
 * Anchored search dropdown rendered under the homepage search input.
 *
 * Accessible combobox popup: the container is role="listbox" (id={listId}),
 * each selectable row is role="option" with a stable id ({listId}-opt-{n})
 * and aria-selected, so the parent input can wire aria-activedescendant +
 * Up/Down/Enter keyboard navigation. The `n` counter increments in the same
 * order as flattenSearchResults() in searchHelpers.js.
 */
export default function SearchDropdown({ results, platform, onClose, query, listId, activeIndex = -1 }) {
  const navigate = useNavigate()
  const { appMatches = [], shortcutMatches = [], otherApps = [] } = results || {}
  const hasResults = appMatches.length > 0 || shortcutMatches.length > 0

  const goTo = (href) => {
    navigate(linkPath(href))
    onClose()
  }

  const optId = (n) => (listId ? `${listId}-opt-${n}` : undefined)

  if (!hasResults) {
    if (!query) return null
    return (
      <div
        className="absolute left-0 right-0 top-full mt-2 bg-theme-base border border-theme-border rounded-xl shadow-lg overflow-hidden z-50 p-4 text-left"
        role="status"
      >
        <p className="text-sm text-theme-muted mb-3">No results for &ldquo;{query}&rdquo;</p>
        <p className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider mb-2">Try one of these</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_APPS.map(app => (
            <button
              key={app.slug}
              onClick={() => goTo(`/${platform}/${app.slug}`)}
              className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-lg border border-theme-border bg-theme-base-alt hover:border-theme-border-hover transition-colors cursor-pointer text-[13px] text-theme-text"
            >
              <img
                decoding="async"
                src={`/images/app-icons/${app.slug}.webp`}
                alt=""
                width={16}
                height={16}
                className="rounded shrink-0"
                onError={e => { e.target.style.display = 'none' }}
              />
              {app.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Precompute the flat index base for each shortcut group so option ids match
  // flattenSearchResults() ordering without mutating a counter during render.
  // App matches occupy [0 .. appMatches.length-1]; each group then contributes
  // 1 header + N shortcut rows.
  const groupBases = []
  {
    let cursor = appMatches.length
    for (const group of shortcutMatches) {
      groupBases.push(cursor)
      cursor += 1 + group.shortcuts.length
    }
  }

  return (
    <div
      id={listId}
      className="absolute left-0 right-0 top-full mt-2 bg-theme-base border border-theme-border rounded-xl shadow-lg overflow-hidden z-50 max-h-[min(420px,70vh)] overflow-y-auto text-left"
      role="listbox"
      aria-label="Search results"
    >
      {/* App matches */}
      {appMatches.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <p className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider px-2 mb-1">Apps</p>
          {appMatches.map((app, i) => {
            const selected = i === activeIndex
            return (
              <button
                key={app.slug}
                id={optId(i)}
                role="option"
                aria-selected={selected}
                onClick={() => goTo(`/${platform}/${app.slug}`)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer border-none transition-colors text-left ${
                  selected ? 'bg-theme-base-alt' : 'bg-transparent hover:bg-theme-base-alt'
                }`}
              >
                <img
                  decoding="async"
                  src={`/images/app-icons/${app.slug}.webp`}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-lg shrink-0"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[15px] font-medium text-theme-text">{app.name}</span>
                  <span className="text-[13px] text-theme-muted ml-2">{app.shortcutCount} shortcuts</span>
                </div>
                <ArrowRight size={14} className="text-theme-muted shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* Shortcut matches */}
      {shortcutMatches.length > 0 && (
        <div className="px-3 pt-2 pb-3">
          {appMatches.length > 0 && shortcutMatches.length > 0 && (
            <p className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider px-2 mb-1 mt-1">Shortcuts</p>
          )}
          {shortcutMatches.map((group, gi) => {
            const headerIdx = groupBases[gi]
            const headerSelected = headerIdx === activeIndex
            return (
              <div key={group.appSlug} className="mb-2 last:mb-0">
                <button
                  id={optId(headerIdx)}
                  role="option"
                  aria-selected={headerSelected}
                  onClick={() => goTo(`/${platform}/${group.appSlug}`)}
                  className={`w-full flex items-center gap-2 px-2 py-2 min-h-[44px] cursor-pointer border-none rounded-md transition-colors text-left ${
                    headerSelected ? 'bg-theme-base-alt' : 'bg-transparent hover:bg-theme-base-alt'
                  }`}
                >
                  <img
                    decoding="async"
                    src={`/images/app-icons/${group.appSlug}.webp`}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-md shrink-0"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                  <span className="text-[13px] font-semibold text-theme-text">{group.appName}</span>
                  <span className="text-[11px] text-theme-muted">› {group.category}</span>
                </button>
                <div className="ml-7 mt-0.5">
                  {group.shortcuts.map((sc, i) => {
                    const scIdx = headerIdx + 1 + i
                    const scSelected = scIdx === activeIndex
                    return (
                      <button
                        key={`${sc.action}-${i}`}
                        id={optId(scIdx)}
                        role="option"
                        aria-selected={scSelected}
                        onClick={() => goTo(`/${platform}/${group.appSlug}`)}
                        className={`w-full flex items-center justify-between px-2 py-2 min-h-[44px] cursor-pointer border-none rounded-md transition-colors text-left ${
                          scSelected ? 'bg-theme-base-alt' : 'bg-transparent hover:bg-theme-base-alt'
                        }`}
                      >
                        <span className="text-[14px] text-theme-text truncate">{sc.action}</span>
                        <span className="flex items-center gap-0.5 shrink-0 ml-3">
                          {parseKeyParts(sc.modifiers, sc.key).map((part, j) => (
                            <kbd key={j} className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded text-[11px] font-medium text-theme-muted bg-theme-base-alt border border-theme-border">
                              {part}
                            </kbd>
                          ))}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* "Also in" footer */}
      {otherApps.length > 0 && (
        <div className="px-5 py-2.5 border-t border-theme-border bg-theme-base-alt">
          <p className="text-[12px] text-theme-muted">
            Also in: {otherApps.join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
