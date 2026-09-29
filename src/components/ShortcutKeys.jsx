import { useCallback, useEffect, useRef, useState } from 'react'
import Link from './SiteLink'
import { Clipboard, CircleCheck } from '../utils/icons'
import { parseKeyParts, keysToWords } from '../utils/platformHelpers'
import { trackEvent } from '../lib/analytics'

// The keys of a shortcut, as the app page and the page of one shortcut show them.

export function Keycap({ children }) {
  return <kbd className="keycap" aria-hidden="true">{children}</kbd>
}

/**
 * A shortcut's keycaps, clickable to copy the human-readable combo to the
 * clipboard. Shows a transient "Copied" state for ~1.2s.
 * The keycaps are hidden from assistive technology; the same shortcut in words
 * (⌘ ⇧ P → "Command + Shift + P") is in the label and in a visually hidden span.
 */
export function CopyableShortcut({ parts, action, appSlug, platform }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const combo = parts.join(' + ')
  const words = keysToWords(parts, platform)

  const onCopy = useCallback(() => {
    if (!navigator.clipboard?.writeText) return
    navigator.clipboard
      .writeText(combo)
      .then(() => {
        setCopied(true)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setCopied(false), 1200)
        trackEvent('shortcut_copied', { app: appSlug, platform, action, combo })
      })
      .catch(() => {})
  }, [combo, action, appSlug, platform])

  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? 'Copied' : `Copy shortcut: ${combo}`}
      aria-label={copied ? `Copied ${words}` : `Copy shortcut ${words} for ${action}`}
      className="group/copy inline-flex items-center gap-1.5 flex-wrap justify-end bg-transparent border-none p-0 m-0 cursor-pointer align-middle"
    >
      <span className="sr-only">{words}</span>
      {parts.map((part, k) => (
        <Keycap key={k}>{part}</Keycap>
      ))}
      <span
        className={`inline-flex items-center transition-opacity ${
          copied ? 'opacity-100 text-green-600' : 'opacity-0 group-hover/copy:opacity-70 text-theme-muted'
        }`}
        aria-hidden="true"
      >
        {copied ? <CircleCheck size={13} /> : <Clipboard size={13} />}
      </span>
    </button>
  )
}

/**
 * A short list of shortcuts: action on the left, copyable keycaps on the right.
 * `links`: { <action>: <path> } for the actions that have a page of their own.
 */
export function ShortcutList({ shortcuts, appSlug, platform, links = {} }) {
  return (
    <ul className="divide-y divide-theme-border">
      {shortcuts.map((sc, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2">
          <span className="text-[14px] text-theme-text">
            {links[sc.action] ? <Link to={links[sc.action]} className={ACTION_LINK}>{sc.action}</Link> : sc.action}
          </span>
          <CopyableShortcut parts={parseKeyParts(sc.modifiers, sc.key)} action={sc.action} appSlug={appSlug} platform={platform} />
        </li>
      ))}
    </ul>
  )
}

// In a dense list a link looks like the text around it and shows on hover.
export const ACTION_LINK = 'text-inherit no-underline hover:underline focus-visible:underline underline-offset-2'
