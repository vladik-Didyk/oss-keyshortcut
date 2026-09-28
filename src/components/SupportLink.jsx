import { getSupportLink } from '../data/support'
import { trackEvent } from '../lib/analytics'

/**
 * Link to the voluntary-support payment page. Renders nothing until
 * SUPPORT_LINK is set in src/data/support.js.
 *
 * `location` names where the link sits, for the click event.
 * `link` is for tests; pages use the configured one.
 */
export default function SupportLink({ location, children, className = '', link }) {
  const href = getSupportLink(link)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('support_link_clicked', { location })}
      className={className}
    >
      {children}
    </a>
  )
}
