import { useEffect } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useLocation, useNavigation, useRouteError } from "react-router";
import { ThemeProvider } from "./hooks/useTheme";
import RenderErrorBoundary from "./components/ErrorBoundary";
import CookieConsent from "./components/CookieConsent";
import Navbar from "./components/Navbar";
import NotFound from "./components/NotFound";
import Footer from "./components/Footer";
import { hasConsented, initAnalytics, trackPageView } from "./lib/analytics";
import { CONTENT, buildMeta } from "./data/content";
import { ADSENSE_CLIENT } from "./data/ads";
import { REGION_SCRIPT } from "./lib/consent";
import { buildWebSiteJsonLd } from "./utils/structuredData";
import { cloudflareToken } from "./utils/cloudflareToken";
import SERIF_REGULAR from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-normal.woff2?url";
import SERIF_BOLD from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-700-normal.woff2?url";
import "./index.css";

const JSON_LD = JSON.stringify(buildWebSiteJsonLd());

// A token of Cloudflare Web Analytics is 32 hex characters. Anything else gets
// no tag: on 2026-09-29 the live site carried the token "s", and every page
// logged failed requests to cloudflareinsights.com because of it.
const CF_ANALYTICS_TOKEN = cloudflareToken(import.meta.env.VITE_CF_ANALYTICS_TOKEN);

// Hosts Google AdSense needs for scripts, pixels, beacons and ad iframes.
const GOOGLE_ADS_HOSTS = [
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.google.com",
  "https://*.gstatic.com",
  "https://*.adtrafficquality.google",
].join(" ");

// Loads the AdSense script once the page has finished loading and the browser
// is idle, so it doesn't compete with the first render (measured: +240 ms LCP on
// a throttled mobile app page when loaded as a plain async tag). Ad units pushed
// before then wait in the window.adsbygoogle queue.
// It first sets the non-personalised-ads flag for visitors who declined our
// cookie banner. In the EEA/UK/CH, Google's consent message (TCF) also applies.
const ADS_LOADER_SCRIPT = ADSENSE_CLIENT
  ? `(function(){var q=window.adsbygoogle=window.adsbygoogle||[];` +
    `try{if(localStorage.getItem('cookie-consent')==='declined')q.requestNonPersonalizedAds=1}catch(e){}` +
    `function load(){var s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';` +
    `s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}';document.head.appendChild(s)}` +
    `function idle(){'requestIdleCallback' in window?requestIdleCallback(load,{timeout:2000}):setTimeout(load,200)}` +
    `document.readyState==='complete'?idle():window.addEventListener('load',idle,{once:true})})()`
  : "";

export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self'",
            // Ads: Google AdSense, its consent message (fundingchoicesmessages.google.com)
            // and ad-quality checks (*.adtrafficquality.google) load from these Google
            // hosts. Analytics: Cloudflare, GA4, Clarity, PostHog.
            `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com ${GOOGLE_ADS_HOSTS} https://partner.googleadservices.com https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://*.clarity.ms https://*.posthog.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com`,
            // 'unsafe-inline' required: dynamic style attributes for runtime colors, flex widths, and sizing
            // cannot use nonces/hashes (CSP only supports those for <style> blocks, not style attributes)
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            `img-src 'self' data: https://hgxtwlynuixwwyjykiqd.supabase.co ${GOOGLE_ADS_HOSTS} https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.clarity.ms https://c.bing.com`,
            `connect-src 'self' https://*.cloudflareinsights.com https://cloudflareinsights.com ${GOOGLE_ADS_HOSTS} https://hgxtwlynuixwwyjykiqd.supabase.co https://www.googletagmanager.com https://www.google-analytics.com https://*.analytics.google.com https://*.google-analytics.com https://*.clarity.ms https://c.bing.com https://*.posthog.com https://us.i.posthog.com https://eu.i.posthog.com`,
            `frame-src ${GOOGLE_ADS_HOSTS}`,
            "object-src 'none'",
            "base-uri 'self'",
          ].join("; ")}
        />
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/images/app-icon.svg" />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="/images/app-icon-512.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F5F0E8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="google-adsense-account" content="ca-pub-7739329133284929" />
        {/* Impact.com site ownership check (Setapp, Canva affiliate programs). Impact's
            snippet uses `value`, not `content`. */}
        <meta name="impact-site-verification" value="cb1c7e04-3c32-43cd-99c8-8eb37043e55e" />
        {/* The fonts are the site's own files (src/fonts.css). The two that the
            top of every page is set in are asked for before the stylesheet is read. */}
        <link rel="preload" as="font" type="font/woff2" href={SERIF_REGULAR} crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href={SERIF_BOLD} crossOrigin="anonymous" />
        <link rel="alternate" type="application/rss+xml" title="KeyShortcut Guides" href="/rss.xml" />

        {/* Open Graph defaults */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="KeyShortcut" />
        <meta
          property="og:image"
          content="https://keyshortcut.com/images/og-image.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter Card defaults */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@keyshortcut" />
        <meta name="twitter:creator" content="@vladikdidyk" />
        <meta
          name="twitter:image"
          content="https://keyshortcut.com/images/og-image.png"
        />
        <meta property="og:locale" content="en_US" />

        {/* The cookie banner needs the visitor's region: ask while the page loads. */}
        <script dangerouslySetInnerHTML={{ __html: REGION_SCRIPT }} />

        {/* JSON-LD WebSite — static content, safe to inline */}
        <script type="application/ld+json">{JSON_LD}</script>

        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-theme-accent focus:text-theme-accent-text focus:rounded-lg focus:text-sm focus:font-medium">
          Skip to main content
        </a>
        {children}
        <ScrollRestoration />
        <Scripts />

        {/* Google AdSense (production only). Loads for every visitor, deferred
            (see ADS_LOADER_SCRIPT): in the EEA/UK/CH it shows Google's certified
            consent message, and ad requests wait for that choice. */}
        {import.meta.env.PROD && ADS_LOADER_SCRIPT && (
          <script dangerouslySetInnerHTML={{ __html: ADS_LOADER_SCRIPT }} />
        )}

        {/* Analytics: Cloudflare Web Analytics (production only). Cloudflare also
            puts its own tag into the pages it serves, so this one is a second way in. */}
        {import.meta.env.PROD && CF_ANALYTICS_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${CF_ANALYTICS_TOKEN}"}`}
          />
        )}
      </body>
    </html>
  );
}

function NavigationLoader() {
  const { state } = useNavigation();
  if (state === "idle") return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-theme-border overflow-hidden">
      <div className="h-full bg-theme-accent animate-nav-loading" />
    </div>
  );
}

// Auto-inits analytics for returning visitors who already accepted the cookie
// banner, and fires a page view on every client-side route change. For first-
// time visitors, CookieConsent calls initAnalytics() directly on accept.
function AnalyticsTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (hasConsented()) {
      initAnalytics().then(() => trackPageView(pathname));
    }
  }, [pathname]);
  return null;
}

export default function Root() {
  return (
    <ThemeProvider>
      <div className="relative">
        <NavigationLoader />
        <AnalyticsTracker />
        <RenderErrorBoundary>
          <Outlet />
        </RenderErrorBoundary>
        <CookieConsent />
      </div>
    </ThemeProvider>
  );
}

// Only the not-found page gets its meta from the root route: a route's own
// meta() wins on every other page.
export function meta({ error }) {
  if (!isRouteErrorResponse(error) || error.status !== 404) return [];
  return [...buildMeta(CONTENT.meta.catchAll), { name: "robots", content: "noindex" }];
}

// The not-found page. scripts/generate-404.mjs saves it as build/client/404.html,
// which Cloudflare Pages serves, with status 404, for every URL that has no file.
// It belongs to the root route because that one file is hydrated at any address:
// the root is the only route that matches them all, and an error held by a route
// the browser doesn't match crashes hydration.
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <>
        <Navbar />
        <NotFound />
        <Footer />
      </>
    );
  }

  throw error;
}

export function HydrateFallback() {
  return (
    <div className="min-h-screen bg-theme-base">
      <div className="h-12 bg-theme-base" />
    </div>
  );
}
