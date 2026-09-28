import { Link } from 'react-router'
import AppIcon from './AppIcon'
import { CONTENT } from '../../data/content'
import PlatformIcons from '../PlatformIcons'

export default function AppCard({ app, platform, otherPlatforms }) {
  return (
    <div className="app-card-perspective">
      <Link
        to={`/${platform}/${app.slug}`}
        className="app-card group"
        aria-label={`${app.displayName} — ${app.shortcutCount} shortcuts`}
      >
        <div className="app-card-accent" />
        {/* Phones: compact tile (3 per row). From sm up: the full-size card. */}
        <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center mb-2 sm:mb-4">
          <AppIcon slug={app.slug} displayName={app.displayName} size={72} className="w-12 h-12 sm:w-[72px] sm:h-[72px]" />
        </div>
        <p className="font-medium text-theme-text text-[13px] sm:text-[15px] text-center leading-tight line-clamp-2">
          {app.displayName}
        </p>
        <p className="text-theme-muted text-[11px] sm:text-xs mt-1 sm:mt-1.5 text-center">
          {app.shortcutCount} {CONTENT.directory.shortcutsLabel}
        </p>
        <PlatformIcons currentPlatform={platform} otherPlatforms={otherPlatforms} />
      </Link>
    </div>
  )
}
