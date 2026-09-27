import { prefetchPlatform } from '../../hooks/usePlatformData'

export default function PlatformToggle({ platforms, activePlatform, onSelect, label = 'Choose platform' }) {
  if (!platforms) return null

  return (
    // No overflow-hidden so focus-visible rings (ring-inset) are never clipped.
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-theme-border">
      {platforms.map((p, i) => {
        const isActive = p.id === activePlatform
        const isFirst = i === 0
        const isLast = i === platforms.length - 1

        return (
          <button
            key={p.id}
            role="radio"
            aria-checked={isActive}
            onClick={() => onSelect(p.id)}
            onMouseEnter={() => prefetchPlatform(p.id)}
            className={`flex items-center gap-2 px-5 py-3 min-h-[44px] text-sm font-medium transition-all cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-accent ${
              isFirst ? 'rounded-l-xl' : ''
            } ${isLast ? 'rounded-r-xl' : ''} ${
              isActive
                ? 'bg-theme-accent text-theme-base'
                : 'bg-theme-base-alt text-theme-muted hover:text-theme-text'
            }`}
          >
            {p.icon && (
              <img
                src={`/images/platform-icons/${p.icon.replace('.png', '.webp')}`}
                alt=""
                width={16}
                height={16}
                className="shrink-0"
                aria-hidden="true"
              />
            )}
            {p.displayName}
          </button>
        )
      })}
    </div>
  )
}
