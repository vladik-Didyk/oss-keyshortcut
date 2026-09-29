import { Link as RouterLink } from 'react-router'
import { linkPath } from '../utils/siteUrl'

/**
 * The link of this site. It is the router's Link, with the target in the form
 * the host serves: "/macos/figma" becomes "/macos/figma/". Components import
 * this one, never the router's own: a test fails on that.
 */
export default function Link({ to, ...rest }) {
  return <RouterLink to={linkPath(to)} {...rest} />
}
