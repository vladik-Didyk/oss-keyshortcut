import { Link } from 'react-router'
import { CONTENT } from '../data/content'

/** Who stands behind an app page: one quiet line at the end of the page's FAQ. */
export default function AuthorLine() {
  const { label, to } = CONTENT.shortcutPage.author

  return (
    <p className="text-theme-muted text-xs mt-6">
      {label}{' '}
      <Link to={to} rel="author" className="text-accent underline underline-offset-2 hover:no-underline">
        {CONTENT.about.cards.creator.name}
      </Link>
    </p>
  )
}
