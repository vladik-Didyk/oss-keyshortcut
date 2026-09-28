# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Keyboard shortcuts directory website — a React site that serves as a multi-platform shortcut directory (macOS, Windows, Linux) with a secondary Mac HUD product page. Domain: `https://keyshortcut.com`.

## Commands

```bash
pnpm dev          # Start React Router dev server (HMR)
pnpm build        # Build icons + sitemap + React Router build (SSR + pre-render) → build/
pnpm sitemap      # Regenerate sitemap.xml only
pnpm rss          # Regenerate rss.xml only
pnpm og-images    # Regenerate Open Graph images only
pnpm icons        # Download app icons from Supabase Storage only
pnpm preview      # Preview production build via react-router-serve
pnpm start        # Serve production build
pnpm lint         # ESLint (flat config, React hooks + refresh plugins)
pnpm test         # Vitest test suite (single run)
pnpm test:watch   # Vitest in watch mode
pnpm test:perf    # Run performance benchmarks
pnpm test:perf:browser  # Run Playwright E2E performance tests
pnpm run deploy   # Build + deploy the WORKING TREE (uncommitted changes included)
scripts/deploy-clean.sh [--dry-run]  # Build committed HEAD in a clean folder, verify, deploy (preferred manual deploy)
node scripts/verify-build.mjs [dir] [--strict]  # Check a build has the AdSense tag and JSON-LD that parses (+ analytics IDs with --strict)
pnpm export       # Export Supabase data to public/data/ JSON (maintainer only, needs .env)
pnpm sync         # Run shortcut sync pipeline (scrape → diff → write to Supabase)
pnpm sync:dry     # Dry run (no writes to Supabase)
pnpm sync:health  # Health check for sync sources
pnpm readme       # Regenerate README app directory from Supabase
pnpm add-app      # Interactive CLI to add a new app (icon, shortcuts, all files)
pnpm add-app:dry  # Preview add-app without writing
```

Add an app from JSON: `pnpm add-app -- --from-json path/to/app.json`

Run a single test file: `pnpm test src/test/data-integrity.test.js`

## Environment Variables

See `.env.example`. **Build works without any env vars** — it reads from committed JSON in `public/data/`.

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — only for `pnpm export`, `pnpm sync`, `pnpm add-app`
- `SUPABASE_SERVICE_ROLE_KEY` — shortcut-sync write operations
- `GEMINI_API_KEY` — AI-powered scraping in shortcut-sync
- `VITE_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics (optional)
- `VITE_GA4_ID`, `VITE_CLARITY_ID`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` — consent-gated analytics (see Analytics stack)

**Public build config lives in the committed `.env.production`** (Vite loads it for production builds; a shell env var of the same name overrides it, which is why CI no longer passes these two):
- `VITE_ADSENSE_ID` — AdSense publisher ID (already public in `ads.txt`). Empty = no ad script, no ad slots.
- `VITE_APP_STORE_ID` — Mac App Store link; empty = `APP_STORE_URL` is `null` and all download buttons are hidden. Stays empty until Apple approves the app (ID `6760172007`; the switch is prepared on branch `feat/app-store-live`).

A clean-folder build without `.env` still gets the AdSense ID but not the analytics IDs; `scripts/deploy-clean.sh` copies `.env` in for that reason. The 2026-09-24 deploy shipped without any of them.

## Architecture

**Stack**: React 19 + React Router v7 (framework mode) + Vite 7 + Tailwind CSS 4 (via `@tailwindcss/vite`) + jspdf

**Framework mode**: The site uses React Router v7's framework mode for SSR + static pre-rendering. All ~175 pages are pre-rendered at build time to `build/client/` as static HTML. No Node.js server needed in production — deploy as static files.

**Entry flow**: `src/root.jsx` (HTML shell with `<Layout>` + `<Outlet>`) → `src/routes.ts` (route config) → route modules in `src/routes/`

**Client hydration**: `src/entry.client.jsx` hydrates the pre-rendered HTML using `HydratedRouter`.

### Routing

Defined in `src/routes.ts` using React Router's route config API.

Route modules live in `src/routes/` and export `loader`, `meta`, and a default component:

- `home.jsx` — `/` Directory homepage (server `loader` reads manifest + macos JSON)
- `platform-index.jsx` — `/:platformId` Platform shortcuts index (server `loader`, validates platform)
- `shortcut-page.jsx` — `/:platformId/:slug` Per-app shortcut page (server `loader`, validates app)
- `product-page.jsx` — `/mac-hud` Mac HUD product page (Hero, Problem, Features, etc.)
- `guides-index.jsx` — `/guides` Guides listing page
- `guide-page.jsx` — `/guides/:slug` Individual guide (content from `src/data/guides/`)
- `cheat-sheets.jsx` — `/cheat-sheets` PDF cheat sheet generator (uses jspdf)
- `compare-index.jsx` — `/compare` App comparison listing
- `compare-page.jsx` — `/compare/:slug` Side-by-side app shortcut comparison (slug format: `appA-vs-appB`)
- `privacy.jsx` — `/privacy` Privacy policy
- `about.jsx` — `/about` About page
- `sponsor.jsx` — `/sponsor` Sponsor offer: terms, prices, booking (server `loader` counts the app pages that hold the slot)
- `redirect-directory.jsx` — `/directory` → `/` redirect (301)
- `redirect-legacy.jsx` — `/shortcuts/*` legacy redirects (301)
- `catch-all.jsx` — `*` 404 catch-all

**Layout**: `src/layouts/directory-layout.jsx` wraps directory routes (home, platform-index, shortcut-page, privacy, about) with `<Navbar />` + `<Footer />`. The product page has its own Navbar/Footer.

**SEO**: Route modules export `meta()` functions that return title, description, OG tags, Twitter Card tags, and canonical links (via `{ tagName: "link", rel: "canonical", ... }`). All meta is rendered server-side into pre-rendered HTML.

**Structured data (JSON-LD)**: built in `src/utils/structuredData.js`, written by `<JsonLd>` (`src/components/JsonLd.jsx`) from the route modules.

| Page | JSON-LD | Built in |
|---|---|---|
| every page | `WebSite` with `SearchAction` and `creator` | `buildWebSiteJsonLd()`, written by `root.jsx` |
| platform index | `ItemList` of the app pages, in the order shown; `BreadcrumbList` | `buildPlatformItemList()`; breadcrumb in `ShortcutsIndex.jsx` |
| app page | `WebPage` with the application under `about`; `FAQPage`; `BreadcrumbList` | `buildAppPageJsonLd()`; the other two in `ShortcutPage.jsx` |
| About | `Person` (name, link, `sameAs` from `CONTENT.about.cards.creator`) | `buildAuthorJsonLd()` |
| guide, compare, `/mac-hud` | `Article`, `BreadcrumbList`, `SoftwareApplication` with the real price | inside `GuidePage.jsx`, `ComparePage.jsx`, `product-page.jsx` |

- Every value comes from the data or from text the page shows. Page addresses go through `pageUrl()` (`src/utils/siteUrl.js`).
- App pages state no `offers`, `aggregateRating`, `review` or date: the data has none, and a test fails on them. That is also why an app page is a `WebPage` about the application and not a `SoftwareApplication` of its own.
- `applicationCategory` is set only for the directory categories in `APPLICATION_CATEGORY`. The documentation link is `softwareHelp`, present only when the data has `docsUrl`.
- A page about the operating system (category `macOS System` or `Windows System`, or slug equal to the platform id) gets no app entity.
- `scripts/lib/json-ld.mjs` reads the JSON-LD of a built page; `verify-build.mjs` fails a build whose JSON-LD does not parse or lacks a type on `/macos/`, `/macos/figma/` or `/about/`.

Product page sections use anchor links (`#features`, `#faq`, `#policies`, `#download`) for in-page navigation.

### Key directories

- `src/routes/` — Route modules (loaders, meta, components)
- `src/layouts/` — Layout components (directory-layout)
- `src/components/` — Page sections and reusable UI
- `src/components/directory/` — Directory-specific components (AppIcon, AppCard)
- `src/hooks/` — Custom hooks (useTheme, useInView, useMediaQuery, useScrollspy, usePlatformData)
- `src/utils/` — Helpers (directoryHelpers for icons, platformHelpers for data lookups)
- `src/data/` — Static content arrays and generated data files
- `public/data/` — Runtime JSON data (manifest + per-platform shortcut files)
- `scripts/` — Build scripts (download-icons, generate-sitemap, update-readme-apps) + shortcut-sync pipeline

### Data architecture (Static JSON + Supabase)

**Data flow**: Supabase (PostgreSQL) is the source of truth, but the build reads from static JSON files committed to git. No Supabase credentials needed to build or contribute.

```
Supabase DB  →  pnpm export  →  public/data/*.json  →  build reads local JSON
                (maintainer)      (committed to git)     (no credentials needed)
```

**Static data files** (`public/data/`):
- `platforms.json` — platform list (id, display_name, icon_url)
- `categories.json` — category definitions
- `manifest.json` — platforms with modifier symbols and category lists
- `platforms/macos.json` — all macOS apps with sections, shortcuts, and otherPlatforms map
- `platforms/windows.json` — same for Windows
- `platforms/linux.json` — same for Linux

**Data loading**: Route `loader()` functions call `supabase.server.js` helpers which read from `public/data/` JSON files. At runtime, `usePlatformData` hook fetches `/data/platforms/{id}.json` for client-side platform switching.

**Updating data**: After changing data in Supabase (via `pnpm sync`, `pnpm add-app`, or manual edits), run `pnpm export` to regenerate the JSON files, then commit them.

**Supabase tables** (source of truth, queried by `pnpm export`):
- `platforms`, `apps`, `app_platforms`, `categories`, `sections`, `shortcuts`, `translations`, `modifier_symbols`

**App icons**: Stored in Supabase Storage bucket `icons/app-icons/` (public URLs, no auth needed). Downloaded at build time by `scripts/download-icons.mjs` using URLs from the exported JSON.

**Centralized copy**: `content.js` — single source of truth for all UI/marketing text. Imports computed values from `siteConfig.js`. Use `content.js` for all new copy.

**Other data files** in `src/data/`:
- `siteConfig.js` — `APP_COUNT` / `SHORTCUT_COUNT` (whole directory, unique apps) and `MAC_APP_COUNT` / `MAC_SHORTCUT_COUNT` (macOS, used in Mac app copy: the app syncs the macOS data). Computed at build time from `public/data/` by `scripts/site-stats.mjs`, injected as `__SITE_STATS__` via `define` in both `vite.config.js` and `vitest.config.js`. Also `APP_PAGE_COUNT` (every app page) and `PAGES_WITH_DOCS` (pages that link to their official docs), used on the About page. **Never type a count in copy**: `src/test/site-counts.test.jsx` fails on text like "60+ apps". Guides are plain data that Node scripts load without Vite, so they cannot import `siteConfig.js`; a guide writes `{appCount}` or `{macAppCount}` and the guide route fills it in (`withCounts`). `pnpm stats` prints the current numbers for text written outside the site. Also `PRICE`, `APP_STORE_URL`, etc.
- `ads.js`, `affiliates.js`, `sponsors.js` — monetization config (see Monetization).
- `categoryConfig.js` — unified category metadata (icon + color per category) for all platforms.
- `keyboardLayout.js` — keyboard row definitions and shortcut databases for Hero and InteractiveKeyboard.
- `guides/` — Guide articles (each exports `meta` + `content`); `guides/index.js` re-exports all for pre-render discovery
- `comparisons.js` — App comparison pairs; auto-discovered by pre-render config
- Hand-maintained: `appCategories.js`, `heroDemoData.js`

**Adding a new platform**: Create `public/data/platforms/{platform}.json`, add entry to `manifest.json`, run `pnpm build`. No code changes needed — pre-rendering config auto-discovers platforms.

### Theme system (Retro Stationery)

Single light theme — no light/dark toggle. All colors defined as CSS custom properties on `:root` in `index.css`.
1. **CSS custom properties** in `index.css`: single `:root` block defines all variables
2. **Tailwind `@theme`** block defines `--color-theme-*` tokens that reference CSS variables
3. **`useTheme` context** (`hooks/useTheme.jsx`) exports a no-op toggle for API compatibility (always light)

**Color palette** (warm beige/tan):
- `#F5F0E8` base, `#EDE8DE` alt/surface, `#1A1A1A` text/accent, `#6B6560` muted, `#C8C0B4` border
- Accent text (on dark buttons): `#F5F0E8` (light text on dark background)
- Keycaps: warm neutrals (`#F5F0E8`, `#C8C0B4`, `#1A1A1A`, `#6B6560`)

### Hero Section

Hero uses an HTML/CSS animated keyboard mockup with `AppPanelMockup` — no 3D/canvas. On large screens, a two-column layout shows the panel + animated keyboard. Mobile shows a static screenshot fallback.

### Search system

`src/utils/searchHelpers.js` powers the directory search. It builds a flat index from all apps/shortcuts, parses natural-language queries ("figma copy", "paste in chrome"), and returns results grouped by app with modifier keycaps. Used by both `SearchDropdown` (overlay) and `SearchResultsInline` (main content area) in `DirectoryHomepage.jsx`. Search also works per-app on `ShortcutPage` and `ShortcutsIndex`.

### App pages (`ShortcutPage.jsx`)

- **FAQ** is native `<details>` / `<summary>`, so every answer is in the pre-rendered HTML and opens without JavaScript. The FAQPage JSON-LD may only describe text that is on the page: do not mount answers on click. `faq_item_expanded` fires from `onToggle`, on open only.
- **Shortcut rows** show keycaps (`aria-hidden`) and carry the same shortcut in words, in a `sr-only` span and in the copy button's `aria-label`: ⌘ ⇧ P → "Command + Shift + P" (`keysToWords()` in `src/utils/platformHelpers.js`). The hidden text holds the shortcut and nothing else. The clipboard, the tooltip and the `shortcut_copied` event keep the symbols. A new symbol in the data needs a word in `KEY_SYMBOL_WORDS`; `key-words.test.js` fails until it has one.
- **Author line** (`AuthorLine.jsx`) sits under the verification badge: label and target from `CONTENT.shortcutPage.author`, name from `CONTENT.about.cards.creator.name`.

### Icon imports

`src/utils/icons.js` is a barrel re-export of `lucide-react` icons. Import icons from `../utils/icons` (not directly from `lucide-react`) to keep the tree-shake list centralized and Vite dev server compatible.

### Platform detection

`src/utils/detectPlatform.js` detects user OS from `navigator.userAgent` for auto-selecting the default platform on the homepage.

### Styling conventions

- Apple-style design: clean flat backgrounds, generous whitespace, centered layouts
- Alternating section backgrounds via `.section-alt` class
- Max content width: `max-w-[980px]` (Apple's standard)
- Custom CSS classes: `.text-accent`, `.text-gradient`, `.fade-in-up`, `.section-alt`, `.screenshot-shadow`, `.keycap`, `.keycap-mini`, `.keycap-tiny`
- Flat cards with `rounded-2xl bg-theme-base-alt` — no glass-morphism
- Icons from `lucide-react`, app brand icons from `simple-icons`
- Font: IBM Plex Serif / IBM Plex Mono

### Testing

Vitest with jsdom environment, globals enabled, setup in `src/test/setup.js` (imports `@testing-library/jest-dom`). **Important**: Tests use a separate `vitest.config.js` with `@vitejs/plugin-react` instead of the React Router plugin — this avoids framework conflicts. Test files live in `src/test/`. E2E tests use Playwright in `e2e/`. Key test suites:
- `data-integrity.test.js` — validates platform JSON structure across all platforms
- `directory-helpers.test.js` — tests platformHelpers utility functions
- `search-helpers.test.js` — tests search/filtering utilities
- `sitemap.test.js` — validates sitemap.xml generation
- `content.test.js` — validates content data structure
- `deployment.test.js` — validates deployment configuration
- `headers.test.js` — `public/_headers`: security headers unchanged, the `/assets/*` cache rule, no long cache for a page, `/data/` or a file without a hash
- `structured-data.test.jsx` — JSON-LD builders, the `ItemList` against the rendered platform index, and the JSON-LD of three built pages when a build is on disk
- `use-platform-data.test.js` — tests usePlatformData hook (loading, fetch, error, cache)
- `key-words.test.js` — key symbols in words; scans `public/data/platforms/` for a symbol or punctuation key without a word
- `shortcut-page.test.jsx` — app page: FAQ answers in the rendered and server-rendered HTML, accordion, hidden shortcut words, clipboard, author line
- `performance.test.js` — benchmarks page load and rendering
- `mac-app-claims.test.jsx` — copy about the Mac app, checked against the app's source (build 3): fails on a promise of custom shortcuts (the app only imports packs), on "use it forever" and on "sends nothing over the internet"; also the "Switch it on in Settings." note for active app detection (once per page) and the `offers` block of the structured data (only with `APP_STORE_URL`)

### ESLint

Flat config (`eslint.config.js`). `no-unused-vars` ignores names matching `^[A-Z_]`. `react-refresh/only-export-components` is disabled for route modules (`src/routes/`) since they export loaders/meta alongside components.

### Analytics stack

Three consent-gated tools live behind a single wrapper at `src/lib/analytics.js`. Each tool is independent — omit its env var to disable just that tool.

| Tool | Env var | Notes |
|---|---|---|
| Google Analytics 4 | `VITE_GA4_ID` | Page views fired manually on every route change (`send_page_view: false`) |
| Microsoft Clarity | `VITE_CLARITY_ID` | Heatmaps + session recordings |
| PostHog | `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (default `https://us.i.posthog.com`) | Loaded via dynamic `import("posthog-js")` to keep it out of the initial bundle |

**Invariants — do not break:**

1. **Consent gate** — nothing loads before `initAnalytics()`. There must be no pre-consent `<script>` tags for any of the three tools in `src/root.jsx`. All injection happens at runtime inside `src/lib/analytics.js`, only after `CookieConsent.accept()` runs or `AnalyticsTracker` detects existing consent on a returning visit.
2. **CSP allowlist** — every analytics origin must be in the inline CSP meta tag in `src/root.jsx` (`script-src` / `connect-src` / `img-src`). Adding a new tool requires extending the allowlist in the same change; a missing origin makes the script silently fail.
3. **SSR-safe** — every entry point in `analytics.js` must guard `if (typeof window === "undefined") return;`. This is a React Router v7 SSR app and the wrapper is imported by pre-rendered route modules.
4. **Idempotent init** — `initAnalytics()` short-circuits on second call via the `initialized` flag. Safe to call from both `CookieConsent.accept()` and `AnalyticsTracker`.

**Consent banner** lives at `src/components/CookieConsent.jsx`. The `cookie-consent` localStorage key holds `accepted` | `declined` (absent = banner shown). GDPR region detection runs through the Cloudflare Function at `functions/api/geo.js` to decide whether the Decline button is rendered.

**Ads consent is separate** (`src/lib/consent.js`):
- The AdSense script is the one script that loads for every visitor, before our banner. That is required: in the EEA/UK/CH it serves **Google's certified consent message** (AdSense → Privacy & messaging), and AdSense waits for that TCF choice before requesting ads. It is injected by an inline loader in `root.jsx` after `load` + idle (a plain async tag cost ~240 ms LCP on a throttled mobile app page).
- In GDPR regions our banner asks about analytics only, and appears after Google's message settles (`whenGoogleConsentSettled`), so the two don't stack.
- `declined` → `requestNonPersonalizedAds = 1` (set by the loader on page load and by `decline()`), plus analytics opt-out.
- Footer "Cookie settings" → `openCookieSettings()` reopens our banner and Google's message (`googlefc.showRevocationMessage`).
- Ad hosts in the CSP: `GOOGLE_ADS_HOSTS` in `root.jsx` (googlesyndication, doubleclick, google.com, gstatic, adtrafficquality.google) for script, img, connect and frame.

**Route-change page views** are fired by the `AnalyticsTracker` component in `src/root.jsx`, which watches `useLocation().pathname` and calls `trackPageView()` after re-confirming consent.

Reference implementation (non-SSR variant) at `Personal-Portfolio/src/lib/analytics.js`.

### Monetization

- **AdSense units:** `src/data/ads.js`. One In-article unit serves all placements (`IN_ARTICLE_UNIT`); a placement with an empty ID renders nothing. `AdSlot` never hides the slot with `display:none` before fill (AdSense then measures width 0 and never fills); card styling and the "Advertisements" label appear on fill, and `index.css` collapses `data-ad-status="unfilled"`. Ads render only in production builds.
- **Affiliate links:** `src/data/affiliates.js`, keyed by app slug, plus `PLATFORM_FALLBACK` (Setapp on macOS pages). Kept out of Supabase because CI's `pnpm export` rewrites `public/data/`. Empty `url` = nothing renders. `AffiliateLink` uses `rel="sponsored nofollow noopener"`, puts the disclosure beside the button, fires `affiliate_clicked`. Programs: Adobe (Partnerize), Raycast (Rewardful), 1Password (CJ), Canva (Impact), Setapp (Impact). Figma closed its program (Jan 2025).
- **Sponsors:** `src/data/sponsors.js` (`sitewide` or `byPath`). A sponsor replaces the mid-page AdSense unit on app pages; without one, a "sponsor this page" link to `/sponsor?page=<path>` shows there. Sponsor images must be in `public/images/sponsors/` (CSP).
- **Sponsor offer (`/sponsor`):** prices, Stripe Payment Links and the go-live promise are `SPONSOR_OFFER` in `src/data/sponsors.js`; copy is `CONTENT.sponsorPage`. An option with an empty `paymentLink` books by email, so the page works before the links exist. `firstMonthCode` (a Stripe promotion code) switches the half-price line on. The page may state one audience figure, `SPONSOR_AUDIENCE`, always with its source and period; a test fails if the page mentions pageviews, click rates or income. `?page=` is accepted only when it has the shape of an app page (`isAppPagePath`).
- **Selling a slot:** put the sponsor in `SPONSORS.sitewide` or `SPONSORS.byPath`, add the logo to `public/images/sponsors/`, deploy. A taken sitewide slot hides its booking button on `/sponsor`.
- **Voluntary support:** `SUPPORT_LINK` in `src/data/support.js` (a Stripe Payment Link where the visitor chooses the amount). Empty = nothing renders. When set, `SupportLink` shows in the footer and on `/cheat-sheets`.
- **Disclosures** live in three places: `content.js` (privacy + About "How the Site Is Funded"), `public/privacy.html` (served at `/privacy`, see Deployment), and next to each link.

### Deployment

Hosted on **Cloudflare Pages** (project: `keyshortcut`). Domain: `keyshortcut.com` via Namecheap (nameservers pointed to Cloudflare).

```bash
scripts/deploy-clean.sh   # Preferred manual deploy: committed HEAD only, .env copied in, verify-build --strict, arm64 wrangler, --branch=main
pnpm run deploy           # Build + deploy the working tree as-is (uncommitted changes ship too)
```

A push to `main` also deploys, through CI. All ~175 routes are pre-rendered as static HTML. No Node.js server needed. Traps (arm64 workerd, stale OAuth token, `--branch=main`): `~/Desktop/Developing/toolbox/playbooks/2026-09-24-wrangler-pages-deploy-traps.md`.

**keysticker.app** (the Mac app's old name, Pages project `keysticker`) only redirects to keyshortcut.com since 2026-09-27: `/` → `/mac-hud`, other paths → same path. Source and deploy command: `deploy/keysticker-app/`.

**`/privacy` is served from `public/privacy.html`**, not from the pre-rendered React page (Cloudflare prefers `privacy.html`). It is also the Mac App Store privacy URL. Edit both it and `content.js` together.

Cloudflare Pages config files in `public/`:
- `_headers` — security headers (X-Frame-Options, HSTS, etc.) on `/*`, and `Cache-Control: public, max-age=31536000, immutable` on `/assets/*`. Only `/assets/`: Vite puts a content hash in those file names. HTML, `/data/*.json`, icons, OG images, sitemaps and `llms.txt` keep their name when they change, so they must not get a long cache. Check a change with `wrangler pages dev build/client` and `curl -sI`.
- `_redirects` — legacy redirects (`/shortcuts/...`, `/directory`), each one 301 straight to the address with the closing slash. Cloudflare applies this file before anything else, so `redirect-legacy.jsx` and `redirect-directory.jsx` answer only in `pnpm dev` / `pnpm preview`; change both together. No splats: `/:splat` costs a second redirect, `/:splat/` doubles the slash. Test a change with `wrangler pages dev build/client`.

### CI/CD Workflows (`.github/workflows/`)

- **`ci.yml`** — Main pipeline: lint → test → build → deploy to Cloudflare Pages (on main push only). Node 24, pnpm 9. Supabase credentials from GitHub Secrets.
- **`update-readme.yml`** — Auto-updates README app directory from Supabase. Runs weekly (Monday 6:00 UTC), after successful CI/CD deploy, or manually via `workflow_dispatch`.
- **`shortcut-sync.yml`** — Runs shortcut sync pipeline (scrape external docs → extract shortcuts via Gemini AI → diff → create PR).
- **`shortcut-sync-deploy.yml`** — Auto-deploys after merging PRs with `shortcut-sync` label.

### Build scripts pipeline

During `pnpm build`, scripts run in order:
1. `scripts/download-icons.mjs` — Fetches app icons from Supabase Storage into `public/images/app-icons/`
2. `scripts/generate-sitemap.mjs` — Generates `public/sitemap.xml` from pre-rendered routes
3. `scripts/generate-rss.mjs` — Generates `public/rss.xml`
4. `scripts/generate-og-images.mjs` — Generates Open Graph images
5. React Router build — SSR + pre-renders all ~175 pages to `build/client/`

**Pre-render route discovery** (`react-router.config.ts`): Reads `public/data/platforms.json` and each platform's app list at build time to generate all `/:platformId` and `/:platformId/:slug` routes. Also imports guide slugs from `src/data/guides/index.js` and comparison pairs from `src/data/comparisons.js`. Adding a new platform JSON or guide/comparison entry automatically creates new pre-rendered pages.

Standalone scripts:
- `scripts/update-readme-apps.mjs` — Queries Supabase, regenerates the Supported Apps section in README.md between `APP-DIRECTORY:START/END` markers
- `scripts/validate-content.mjs` — Validates content data structure
- `scripts/measure-page-prose.mjs [--thin] [--json]` — Lists, for every app page, the prose block it shows (note / everyday / none) and its prose words. Builds nothing. Logic in `scripts/lib/page-prose.mjs`, shared with `src/test/page-prose.test.js`
- `scripts/shortcut-sync/run.mjs` — Full sync pipeline with `--dry-run` and `--health-check` flags
- `scripts/sync-apple-docs.mjs` — Bulk sync script for Apple app shortcuts (18 apps, idempotent)

### Shortcut sync pipeline (`scripts/shortcut-sync/`)

The sync pipeline scrapes official documentation pages, extracts shortcuts via Gemini AI, diffs against Supabase, and creates PRs with changes.

**Key files**:
- `sources.json` — Registry of all apps with their docs URLs, parser type, and tier (1=weekly, 2=bi-monthly, 3=on-demand)
- `pipeline/supabase-writer.mjs` — Writes shortcut data to Supabase using service role key (REST API, bypasses RLS)
- `pipeline/normalize.mjs` — Normalizes scraped data (modifiers, keys, actions)
- `pipeline/modifier-map.mjs` — Canonical modifier names per platform (command/option/control/shift/fn for macOS)
- `pipeline/key-map.mjs` — Canonical key names (Left/Right/Up/Down for arrows, Enter, Delete, Escape, Space, Tab)
- `diff/` — Diff engine comparing scraped data against existing Supabase data

**Data conventions**:
- Modifiers stored as PostgreSQL arrays of canonical names: `{command,shift}` (not symbols like ⌘⇧)
- `action_key` format: `shortcuts.{slug}.{camelCaseAction}` (e.g., `shortcuts.chrome.selectAll`)
- Action text lives in `translations` table (key=action_key, language='en', value='Select All')
- `docs_url` on `apps` table links to official documentation; displayed as external link icon on shortcut pages
- `app_platforms` junction table links apps to platforms (macos, windows, linux)

**Adding a new app** requires changes in multiple places:
1. **Supabase** — Create `apps` row (slug, display_name, category_id, docs_url), `app_platforms` link, sections, shortcuts, translations
2. **Icon** — Upload 128x128 WebP to Supabase Storage `icons/app-icons/{slug}.webp`, set `icon_url` on the app row
3. **`src/utils/directoryHelpers.js`** — Add entry to `imageIcons` map (display name → slug) AND `slugToIconName` map (slug → display name). Without this, the icon shows a letter placeholder fallback even if the image file exists.
4. **`src/data/appCategories.js`** — Add display name to the appropriate category array
5. **`scripts/shortcut-sync/sources.json`** — Add entry for the sync automation pipeline (alphabetically sorted)
6. **Run `pnpm export`** to regenerate `public/data/` JSON files, then commit them
7. **App note** — a page with 3 or more sections must show a note or the everyday block (3+ everyday shortcuts), or `src/test/page-prose.test.js` fails. Check with `node scripts/measure-page-prose.mjs --thin`; if the page is listed, write a note in `src/data/appNotes.js`

### App notes (`src/data/appNotes.js`)

Hand-written prose for app pages: an overview, 2–3 tips, 4–6 "start with these" actions.

- `APP_NOTES[slug]` is shared by every platform the app is on and is checked on macOS. `APP_NOTES_BY_PLATFORM[platform][slug]` is for a platform whose data names actions differently, and for apps that are not on macOS. Pages read both through `getAppNote(slug, platform)`.
- Keys are never typed. `{{Action name}}` is resolved from the page's data, so each platform shows its own keys.
- `sections` lists the section names the text mentions. A note is used only on a page that has them (`noteFitsApp`).
- No counts, no history, no claims the shortcut list does not show. `src/test/app-notes.test.js` also fails on a sentence that two apps share once the app name and the actions are removed.
- `src/test/unsourced-claims.test.js` fails if "working days" or "Brainscape" appears anywhere under `src/` (an unsourced statistic, removed 2026-09-28).

### Official docs links

- The link of an app is stored in Supabase (`apps.docs_url`) and exported to `public/data` as `docsUrl`. Change it with `node scripts/set-docs-url.mjs <slug> <https address | none>` (`--dry-run` shows the change), then `pnpm export` and deploy. A change in `public/data` alone is lost at the next export.
- `node scripts/check-docs-links.mjs` checks every link the site shows. No database, no AI, no keys. `.github/workflows/docs-link-check.yml` runs it on Mondays and keeps one issue, "Dead official docs links".
- The workflow "Shortcut Sync" has no schedule. It is started by hand and is a dry run unless told otherwise: its extraction is not reliable enough to write to the database unattended.
