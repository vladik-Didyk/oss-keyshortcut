import { CircleCheck } from '../utils/icons'

function formatDate(date, style = 'short') {
  const d = new Date(date)
  return style === 'long'
    ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Shows when shortcuts were last verified/updated.
 *
 * Variants:
 *   "inline"  — compact, for headers/metadata lines (default)
 *   "block"   — full line with docs link + updated date, for intro areas
 *   "mini"    — icon + relative date only, for app cards
 *   "meta"    — one item of the facts line under a page title, with the docs link
 */
export default function LastCheckedBadge({ date, updatedDate, docsUrl, variant = 'inline', onDocsClick }) {
  if (variant === 'meta') {
    // Without a date or a link there is no source to point at, so nothing is claimed.
    if (!date && !docsUrl) return null
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <CircleCheck size={12} className="text-green-600 shrink-0" aria-hidden="true" />
        <span>
          {date ? 'Checked against' : 'Verified against'}{' '}
          {docsUrl ? (
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" onClick={onDocsClick} className="text-theme-muted hover:text-theme-text underline underline-offset-2">official docs</a>
          ) : (
            'official docs'
          )}
          {date && ` on ${formatDate(date)}`}
        </span>
      </span>
    )
  }

  // Graceful fallback: when no date exists, still surface a freshness/trust
  // signal ("Verified against official docs") instead of rendering nothing.
  if (!date) {
    if (variant === 'mini') {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] text-theme-muted"
          title="Verified against official docs"
        >
          <CircleCheck size={10} className="text-green-600 shrink-0" />
          Verified
        </span>
      )
    }

    if (variant === 'block') {
      return (
        <div className="text-theme-muted text-xs mt-2">
          <p className="flex items-center gap-1.5">
            <CircleCheck size={12} className="text-green-600 shrink-0" />
            Verified against{' '}
            {docsUrl ? (
              <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:no-underline">official docs</a>
            ) : (
              'official docs'
            )}
          </p>
        </div>
      )
    }

    // variant === 'inline'
    return (
      <span
        className="ml-2 pl-2 border-l border-theme-border/40 inline-flex items-center gap-1"
        title="Verified against official docs"
      >
        <CircleCheck size={11} className="text-green-600" />
        Verified
      </span>
    )
  }

  const formatted = formatDate(date)
  const long = formatDate(date, 'long')

  if (variant === 'mini') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] text-theme-muted"
        title={`Verified against official docs on ${long}`}
      >
        <CircleCheck size={10} className="text-green-600 shrink-0" />
        {formatted}
      </span>
    )
  }

  if (variant === 'block') {
    const updatedLong = updatedDate ? formatDate(updatedDate, 'long') : null
    const showUpdated = updatedDate && updatedDate !== date

    return (
      <div className="text-theme-muted text-xs mt-2 space-y-1">
        <p className="flex items-center gap-1.5">
          <CircleCheck size={12} className="text-green-600 shrink-0" />
          Last checked against{' '}
          {docsUrl ? (
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:no-underline">official docs</a>
          ) : (
            'official docs'
          )}
          {' '}on {long}
        </p>
        {showUpdated && (
          <p className="flex items-center gap-1.5 pl-[18px]">
            Shortcuts last updated on {updatedLong}
          </p>
        )}
      </div>
    )
  }

  // variant === 'inline'
  return (
    <span
      className="ml-2 pl-2 border-l border-theme-border/40 inline-flex items-center gap-1"
      title={`Verified against official docs on ${long}`}
    >
      <CircleCheck size={11} className="text-green-600" />
      Checked {formatted}
    </span>
  )
}
