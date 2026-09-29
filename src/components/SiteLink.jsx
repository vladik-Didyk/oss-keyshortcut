import { Link as RouterLink } from 'react-router'
import { linkPath } from '../utils/siteUrl'

/**
 * The link of this site. It is the router's Link, with the target in the form
 * the host serves: "/macos/figma" becomes "/macos/figma/". Components import
 * this one, never the router's own: a test fails on that.
 *
 * prefetch="intent": the data and the scripts of the target are fetched when
 * the visitor points at the link or focuses it, so the page is there by the
 * time of the click. A link can ask for another behaviour.
 */
export default function Link({ to, prefetch = 'intent', ...rest }) {
  return <RouterLink to={linkPath(to)} prefetch={prefetch} {...rest} />
}
