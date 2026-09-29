import { useState, useEffect } from 'react'
import { useLocation } from 'react-router'
import Link from './SiteLink'
import { Menu, X } from '../utils/icons'
import { CONTENT } from '../data/content'
import { APP_STORE_URL } from '../data/siteConfig'
import { trackEvent } from '../lib/analytics'
import SiteSearch from './SiteSearch'

const { navbar: NAV } = CONTENT.shared
// { id: 'macos', label: 'macOS' }, from the links of the bar itself.
const PLATFORMS = NAV.platformLinks.map((link) => ({ id: link.to.replace(/\//g, ''), label: link.label }))
// The home page and the platform pages have a search field of their own.
const hasOwnSearch = (pathname) => {
  const path = pathname.replace(/\/+$/, '')
  return path === '' || PLATFORMS.some((p) => path === `/${p.id}`)
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const isProductPage = location.pathname.startsWith('/mac-hud')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll while the mobile menu is open (SSR-safe).
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  const { navbar } = CONTENT.shared
  const closeMenu = () => setMenuOpen(false)

  // Shared link set rendered identically on desktop and mobile (parity).
  const primaryLinks = [...navbar.platformLinks, ...navbar.resourceLinks, ...navbar.secondaryLinks]

  const handleNavClick = (link, source) => {
    closeMenu()
    trackEvent('nav_link_clicked', { label: link.label, to: link.to, source })
  }

  const linkClassDesktop =
    'text-[13px] text-theme-muted hover:text-theme-text transition-colors no-underline'
  const linkClassMobile =
    'flex items-center min-h-[44px] text-[15px] text-theme-muted hover:text-theme-text transition-colors no-underline px-2 rounded-lg hover:bg-theme-base-alt'

  return (
    <nav
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? 'bg-theme-base'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-[980px] px-5 md:px-6 flex items-center justify-between h-12">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 no-underline" onClick={closeMenu}>
            <img decoding="async" src="/images/app-icon.svg" alt="KeyShortcut icon" width={28} height={28} className="rounded-lg" />
            <span className="text-base font-semibold text-theme-text">KeyShortcut</span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            {primaryLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => handleNavClick(link, 'navbar_desktop')}
                className={linkClassDesktop}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <SiteSearch platforms={PLATFORMS} hidden={hasOwnSearch(location.pathname)} />

          {APP_STORE_URL && isProductPage && (
            <a
              href="#download"
              className="text-xs font-medium px-4 py-1.5 rounded-full no-underline transition-colors border-[1.5px] border-theme-accent hover:bg-theme-accent hover:text-theme-accent-text bg-theme-accent text-theme-accent-text"
            >
              {navbar.downloadLabel}
            </a>
          )}

          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="md:hidden flex items-center justify-center w-[44px] h-[44px] -mr-2 rounded-lg text-theme-text hover:bg-theme-base-alt transition-colors cursor-pointer border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
            aria-label={menuOpen ? navbar.closeMenuLabel : navbar.openMenuLabel}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          role="menu"
          aria-label={navbar.resourcesLabel}
          className="md:hidden border-t border-theme-border bg-theme-base max-h-[80vh] overflow-y-auto"
        >
          <div className="mx-auto max-w-[980px] px-5 py-3 flex flex-col gap-1">
            <Link
              to={navbar.homeLink.to}
              onClick={() => handleNavClick(navbar.homeLink, 'navbar_mobile')}
              role="menuitem"
              className={linkClassMobile}
            >
              {navbar.homeLink.label}
            </Link>
            {primaryLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => handleNavClick(link, 'navbar_mobile')}
                role="menuitem"
                className={linkClassMobile}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
