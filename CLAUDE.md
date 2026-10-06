# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Keyboard shortcuts directory website — a React site that serves as a multi-platform shortcut directory (macOS, Windows, Linux) with a secondary Mac HUD product page. Domain: `https://keyshortcut.com`.

## Commands

```bash
pnpm dev          # Start React Router dev server (HMR)
pnpm build        # Build icons + sitemap + React Router build (SSR + pre-render) → build/
pnpm sitemap      # Regenerate sitemap.xml only
pnpm page-dates   # Record the day each app page's shortcut list last changed (run after `pnpm export`, before the commit)
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
node scripts/verify-build.mjs [dir] [--strict]  # Check a build has the AdSense tag, JSON-LD that parses and no link in the form the host redirects (+ analytics IDs with --strict)
pnpm export       # Export Supabase data to public/data/ JSON (maintainer only, needs .env)
pnpm sync         # Run shortcut sync pipeline (scrape → diff → write to Supabase)
pnpm sync:dry     # Dry run (no writes to Supabase)
pnpm sync:health  # Health check for sync sources
pnpm readme       # Regenerate README app directory from Supabase
pnpm add-app      # Interactive CLI to add a new app (icon, shortcuts, all files)
pnpm add-app:dry  # Preview add-app without writing
pnpm check:redirects [base] [--all] [--wait=90]  # Legacy redirects on a running server (default keyshortcut.com): one 301, ending at 200
pnpm pdf-bundle [platform] [--out dir]  # The PDF bundle that is sold: every cheat sheet of a platform in one file → dist/products/
pnpm affiliates [--open]  # Affiliate programs: which have a link, which wait, where to apply
pnpm indexnow [--since=2] [--all] [--dry-run]  # Report new and changed pages to Bing and the other IndexNow search engines
node scripts/preview-pending-apps.mjs [--out=dir]  # What the data would be with the files of content/pending-apps/ in it
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

**Framework mode**: The site uses React Router v7's framework mode for SSR + static pre-rendering. All pages (369 on 2026-09-29) are pre-rendered at build time to `build/client/` as static HTML. No Node.js server needed in production — deploy as static files.

**What a page sends to the browser.** Three rules, each with a test in `page-weight.test.js`:
- A page gets the data it shows, from its loader, and not the data of other pages. The app notes (`src/data/appNotes.js`, 126 KB) are read by the loader of the app page only, which hands the page its one note; `CONTENT.shortcutPage.faqItems(app, platformName, note)` takes the note as an argument. Until 2026-09-29 `content.js` imported the notes, so every page loaded all of them.
- Nothing that is on every page imports the guides. The footer takes its three guide links from `src/data/guideLinks.js`; a test compares them with the guides.
- A list of apps gets `slimApps()` (`src/utils/slimApps.js`): name, category, count. The shortcuts load when the visitor turns to the search (`usePlatformSearch`).
- Scripts as they travel (gzip), before and after 2026-09-29: app page 217 KB → 160 KB, home page 211 KB → 155 KB. HTML of the home page: 139 KB → 29 KB.

**Entry flow**: `src/root.jsx` (HTML shell with `<Layout>` + `<Outlet>`) → `src/routes.ts` (route config) → route modules in `src/routes/`

**Client hydration**: `src/entry.client.jsx` hydrates the pre-rendered HTML using `HydratedRouter`.

### Routing

Defined in `src/routes.ts` using React Router's route config API.

Route modules live in `src/routes/` and export `loader`, `meta`, and a default component:

- `home.jsx` — `/` Directory homepage (server `loader` reads manifest + macos JSON)
- `platform-index.jsx` — `/:platformId` Platform shortcuts index (server `loader`, validates platform)
- `shortcut-page.jsx` — `/:platformId/:slug` Per-app shortcut page (server `loader`, validates app)
- `shortcut-detail.jsx` — `/:platformId/:slug/:shortcutId` Page about one shortcut (server `loader`; exists only where a note exists)
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

**Title and description of an app page** (`CONTENT.meta.shortcutPage`, tested on every page in `app-page-meta.test.js`):
- Title: `{App} Keyboard Shortcuts for {OS} — {N} shortcuts`. Over 60 characters the count is left out. No year: it would say the list was checked this year, and the data has no date. The page of the operating system names it once ("macOS Keyboard Shortcuts").
- Description, 155 characters at most: `{App} shortcuts for {OS}: ` then two to four shortcuts the page opens with ("Start with these", else the everyday ones), each with the keys of that platform, then `All {N}, with a printable PDF.` Every page has its own.

**Links inside the site** end with a slash, like canonical, `og:url` and the sitemap: the host answers the other form with 308.
- Components import `Link` from `src/components/SiteLink.jsx`, never from `react-router`. It sends the target through `linkPath()` (`src/utils/siteUrl.js`), which keeps the query and the anchor: `/macos/macos#finder` becomes `/macos/macos/#finder`. `/privacy` and files stay as they are served.
- A plain `<a href>` and a `navigate()` to a page use `linkPath()` too. `site-url.test.js` fails on the router's own `Link`, on `href="/guides"` and on `navigate(` without it.
- `verify-build.mjs` reads every link, canonical and `og:url` of every built page and fails on one in the wrong form.

**Sitemap dates** (`<lastmod>`): stated only where the day of the last change is known.
- An app page: the day its shortcut list last changed, from `src/data/pageDates.json`. `pnpm page-dates` writes that record from the git history of `public/data/platforms/*.json`; it needs the full history.
- Each entry holds a hash of the list. A list with another hash changed after the record was written (CI exports fresh data before it builds) and gets the day of the build.
- A guide: its `lastUpdated`. A platform page, a comparison, the home page, `/cheat-sheets`, `/guides`: the latest day of what they are made of. `/mac-hud`, `/about`, `/sponsor`, `/privacy`: no `<lastmod>`.
- The day of the build is not a day of change. Before 2026-09-29 every page claimed it.

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

### Home page (`DirectoryHomepage.jsx`)

- **It is served with the app lists of all three platforms in it**, one panel each (`directory/PlatformPanel.jsx`, `data-panel`). CSS shows the panel whose id is in `data-platform` on the root of the page. A crawler reads every list, and no visitor waits for a request to see their own.
- **A script at the top of the page sets `data-platform` before the first paint** (`platformScript()` in `src/utils/preferredPlatform.js`): the platform the visitor chose last (`localStorage`, key `ks-platform`), else the one of their system. `preferredPlatform()` makes the same choice for React, which takes it over after hydration. The two must agree: `home-page.test.jsx` runs both against the same visitors.
- **React starts with the server's platform** (`macos`) and changes in a layout effect. Starting with the visitor's platform would make hydration find another page than the one served. Before 2026-09-29 it did, and a Windows visitor got the macOS list, then a skeleton, then a request.
- The look of the chosen tab comes from the same attribute (`data-tab`), so the tab does not jump either.
- The ad slot is rendered in the panel React holds for active only: AdSense measures a hidden slot as zero wide and never fills it.
- The panel of a platform has its own category bar and its own chosen category.

### Search system

**Where the shortcuts come from.** The pages that list apps do not carry shortcuts. `usePlatformSearch(platformId, apps, query)` (`src/hooks/usePlatformSearch.js`) loads `/data/platforms/<id>.json` when the visitor focuses the field or types, and finds apps by name until it is there. While it loads, the results say "Loading shortcuts…", never "No results".

**Search from every page** (`SiteSearch.jsx`, in the navigation bar): a button that opens a field over the page; Command + K and Control + K open it too. The field, the results and the search code are in `SiteSearchDialog.jsx`, loaded when it opens. The home page and the platform pages have a field of their own and do not show the button (`hasOwnSearch` in `Navbar.jsx`). Tab stays inside while it is open, Escape closes it and gives the focus back to the button.

`src/utils/searchHelpers.js` powers the directory search. It builds a flat index from all apps/shortcuts, parses natural-language queries ("figma copy", "paste in chrome"), and returns results grouped by app with modifier keycaps. Used by both `SearchDropdown` (overlay) and `SearchResultsInline` (main content area) in `DirectoryHomepage.jsx`. Search also works per-app on `ShortcutPage` and `ShortcutsIndex`.

### App pages (`ShortcutPage.jsx`)

- **FAQ** is native `<details>` / `<summary>`, so every answer is in the pre-rendered HTML and opens without JavaScript. The FAQPage JSON-LD may only describe text that is on the page: do not mount answers on click. `faq_item_expanded` fires from `onToggle`, on open only.
- **Shortcut rows** show keycaps (`aria-hidden`) and carry the same shortcut in words, in a `sr-only` span and in the copy button's `aria-label`: ⌘ ⇧ P → "Command + Shift + P" (`keysToWords()` in `src/utils/platformHelpers.js`). The hidden text holds the shortcut and nothing else. The clipboard, the tooltip and the `shortcut_copied` event keep the symbols. A new symbol in the data needs a word in `KEY_SYMBOL_WORDS`; `key-words.test.js` fails until it has one.
- **Author line** (`AuthorLine.jsx`) sits under the verification badge: label and target from `CONTENT.shortcutPage.author`, name from `CONTENT.about.cards.creator.name`.
- **Top of the page on a phone**: two rows, the title with its facts, then search and PDF side by side. Every control is 44 px high (back link, search, clear, PDF); the search field is 16 px, or iOS zooms in on focus. "Also on:" shows on phones too, each platform with its mark (`PlatformGlyph`), because it is the only way to the same app on another platform. The icon of the page loads `eager`, the icons of lists stay `lazy`. From `lg` up the header is the compact sticky one: 36 px icon, PDF as a text link. `shortcut-page.test.jsx` reads the classes without a breakpoint, which are what a phone gets.

### Pages about one shortcut (`/macos/vscode/toggle-comment/`)

One page for one shortcut on one platform: the keys, what they do, the same action on the other platforms, five neighbours from its section, two questions. Started 2026-09-29 with 100 notes, which give 163 pages.

- **A page exists only where a hand-written note exists** (`src/data/shortcutNotes.js`) and the data of that platform has the action. No note, no page. Two shortcuts in three have no counterpart on another platform and none has a description in the data, so a page for every shortcut would be the app page cut into pieces. Google's spam policy calls that scaled content abuse, and it would put the pages that rank at risk.
- **A note** holds `id` (the last part of the address), `title`, `names` (the action as each platform's data names it), `press` (follows "Press ⌘/ to"), `what` (40 to 80 words) and `written`.
- **Rules of a note**, all tested in `shortcut-notes.test.js`: no key in the text (the page prints the keys of its platform from the data), no number, no version, no praise, no sentence that is in another note. Write what the shortcut does and check it against the app's own documentation (`docsUrl`). If the documentation does not say it and you have not seen it, leave it out.
- **The notes stay on the server.** `src/utils/shortcutPages.js` imports them; only loaders, the pre-render config and the sitemap script import that file. The app page gets `shortcutLinks` from its loader and the page about a shortcut gets its one note. A test fails if a component imports either file, or if a note is in a built client file.
- **The app page links a row to the page of its shortcut**, where there is one. The link looks like the text around it and is underlined on hover (`ACTION_LINK`).
- **Renaming an action in the data takes its page away** until `names` in the note follows. `shortcut-notes.test.js` fails on a name the data does not have, so an export that renames actions shows up in the tests.
- **Title**: `{Title} Shortcut in {App} on {OS}: {Keys}`, 60 characters at most, shortened by leaving out the platform. **Description**: the keys here, the keys on one other platform, 155 characters at most.
- **Not found**: the route has no `ErrorBoundary` and no meta without data, so an address without a page goes up to the root route (see `root.jsx`). `generate-404.mjs` asks for an address with four parts, because three now match this route.
- **Sitemap**: the pages are in the sitemap of their platform, with the later of the day the note was written and the day the app's list changed.
- **Shared parts**: `ShortcutKeys.jsx` (keycaps, copy button, short list) and `FaqAccordion.jsx` are used by the app page and by this page.
- **keysticker.app**: `deploy/keysticker-app/_redirects` has a rule for addresses with three parts. It applies after that project is deployed (its own command, see its README).

### Reports from visitors

A visitor tells the developer what to fix, add or remove. Step 1 of three; votes ("Works" / "Doesn't work") and counts need a server function and a database, and are not built.

- **Two ways, the visitor picks**: an email to `SUPPORT_EMAIL` (private), or an issue in the public repository (`REPO_URL` in `siteConfig.js`). Both arrive filled in with the app, the platform and the page. No server, no database, nothing stored by the site.
- **Email opens the computer's mail app.** A visitor who writes in the browser may have none set up, or one they never use, and then the click seems to do nothing (Vlad, 2026-10-01; the link itself worked and opened Apple Mail). After a click on Email the panel shows "No mail app opened?" with "Write in Gmail" (the same message, `reportGmail()` / `siteGmail()`) and "Copy info@keyshortcut.com". Events: `channel` `gmail` and `copy`.
- **Links** are built in `src/utils/reportLinks.js` (`reportEmail`, `reportIssue`). `REPORT_KINDS` names, for each kind, the issue form in `.github/ISSUE_TEMPLATE/` and what the email asks for. A value the link carries must have a field with that `id` in the form, or GitHub drops it; `report-links.test.jsx` checks this.
- **Issue forms** use only labels every repository has (`bug`, `enhancement`, `question`): a form with a label that does not exist loses it silently. They ask for no email address, because an issue is public.
- **App pages**: `ReportProblem.jsx`, a native `<details>` under the shortcut list, so it is in the pre-rendered HTML and opens without JavaScript. It must not have the shape `details > summary + div > p`: a test counts the FAQ answers by it.
- **The flag of a row** shows on hover and opens the panel about that shortcut. It is drawn in the browser, only where there is a mouse (`hover: hover` and `pointer: fine`), and is not a tab stop: the panel is the way in for a phone and for the keyboard.
- **About page**: "Suggest an app" by email, "Suggest on GitHub" beside it.
- Event: `report_link_clicked` with `kind`, `channel`, `app`, `platform`, `shortcut`.

### Votes and counts (`server/feedback.js`)

Visitors say whether the shortcuts of a page work, and a page may show its views and PDF downloads.

- **Storage** is a Cloudflare D1 database bound to the Pages project as `DB`. The tables are made on first use. Without the binding the three functions (`functions/api/visit.js`, `vote.js`, `download.js`) answer `{ enabled: false }` and the pages show nothing of it.
- **The database** is `keyshortcut-votes`, made on 2026-09-29. The binding is set in the dashboard (Workers & Pages → keyshortcut → Settings → Bindings), for Production only: a preview deployment keeps no votes. The project has no `wrangler.toml`; adding one with `pages_build_output_dir` would take the settings over from the dashboard.
- **A number below its minimum never leaves the server** (`MINIMUM`: 3 confirmations, 100 views in 30 days, 10 downloads). The page prints only numbers it received. Votes against a shortcut are never sent. For half a day on 2026-09-29 the minimum was 1; Vlad then saw "1 says it works, 6 views in a month" on the live page and agreed that a small number works against the site.
- **The voter's own vote stands in the place of the count while the count is not public**: "You", large like a number, with "said it works" or "said it is not right" under it. It comes from the visitor's browser and is shown to nobody else. It is the answer to a vote that seemed lost (Vlad pressed "Works" and the card did not change). Once the count is public it takes that place.
- **The line in the place of the numbers** (`feedback.empty`) says nothing about how many voted, because the page does not know a count below the minimum. "No votes to show yet" was replaced for that reason; a test fails on such words.
- **One vote per network address and shortcut.** The address is stored only as a hash, salted with a value that lives in the database; hashes older than 90 days are deleted. 40 votes a day per address.
- **A vote is accepted only for an id the served page has.** Rows carry `data-item` (`shortcutIds()` in `src/utils/feedbackIds.js`: section and action, in small letters and dashes); the function reads the page through `env.ASSETS`. Renaming a section or an action starts its count from zero.
- **The browser** (`src/lib/feedback.js`) keeps the visitor's own votes in `localStorage` and the pages counted in this tab in `sessionStorage`. No cookie. A browser driven by a program is not counted.
- **A view is counted at the first sign of a person**, not when the page loads: a key, a touch, a click, the wheel, or a pointer that moves (`countViewOnSign`). Loading a page only reads its numbers. Scrolling alone is no sign, because a page scrolls by itself to an anchor. Reason: on 2026-09-29 Lighthouse runs and checks in the Claude browser pane made 12 of the first 21 views. A program that acts like a person in a normal browser is still counted; nothing tells those apart for sure.
- **Robots by name** (`BOT` in `server/feedback.js`) include the browsers of AI assistants (Claude, ChatGPT, Perplexity). They are not counted and cannot vote, so a vote cast in the browser pane of the Claude app answers "This vote could not be counted." Measure the site with Lighthouse freely: it touches nothing.
- **"Counted" is said only of a vote the server took.** A refused vote (a robot, the daily limit, no network) shows `feedback.notCounted`, and the button and the visitor's own line go back.
- **Known limit:** views have no guard per network address. A program that posts to `/api/visit` under the name of a normal browser adds views. A guard would store a hash per view, which the privacy page now rules out ("Views and downloads store no information about you").
- **The switch** is `VOTES_SWITCH` in `src/lib/feedback.js`, on since the project has its database. Off means no request and nothing on the page. `VITE_VOTES=off pnpm build` switches it off for one build; `VITE_VOTES=on` switches it on whatever the constant says.
- **On the page:** a green card (`VoteCard.jsx`) at the top, right under the header. It scrolls with the page: Vlad tried it sticky and asked for it released (2026-09-28). Left: the numbers, large, each with a label ("say it works", "views in a month", "PDF downloads"); they count up once when they arrive, not for a visitor who asked for less motion. Right (on a phone: below): the question with "Works" and "Not right"; "Not right" also opens the report panel. The card is in the page as it is served, and the place of the numbers has the same height before and after they arrive, so nothing below moves. If the server says it keeps no votes, the card goes away.
- **The page prints what the database counted.** The code has no starting value and no multiplier. Large numbers in a local preview are samples written into the local database by hand (`sqlite3` on the file under `.wrangler/state/v3/d1/`).
- **Rows:** a green count on a confirmed row, and for a mouse a "works for me" button on hover.
- **The green** is `--theme-good` and its three companions in `index.css`; a test computes their contrast (text 4.5:1, borders 3:1).
- The rules live on the server, so tests run them against a real SQLite (`src/test/helpers/d1.js`, `node:sqlite`).
- **Local:** `pnpm build`, then `wrangler pages dev build/client --d1 DB` gives a local database in `.wrangler/`.
- **Reading the votes against a shortcut:** in the Cloudflare dashboard, D1 → the database → Console: `SELECT page, item, works, broken FROM votes WHERE broken > 0 ORDER BY broken DESC`.
- The privacy page says what is kept: `CONTENT.privacy` and `public/privacy.html`, changed together.

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
- Font: IBM Plex Serif / IBM Plex Mono, served by the site itself (`src/fonts.css`, files of `@fontsource`). Weights in use: Serif 400, 400 italic, 500, 600, 700; Mono 400, 500. A new weight needs a rule in `fonts.css` first. The two fonts of the top of a page are preloaded in `root.jsx`. `fonts.css` also defines system fonts scaled to the measures of IBM Plex Serif (`IBM Plex Serif Fallback ...`): the text is set in one of them until the web font arrives, and no line breaks differently afterwards (layout shift 0.075 → 0 on the VS Code page).

### Testing

Vitest with jsdom environment, globals enabled, setup in `src/test/setup.js` (imports `@testing-library/jest-dom`). **Important**: Tests use a separate `vitest.config.js` with `@vitejs/plugin-react` instead of the React Router plugin — this avoids framework conflicts. Test files live in `src/test/`. E2E tests use Playwright in `e2e/`. Key test suites:
- `data-integrity.test.js` — validates platform JSON structure across all platforms
- `directory-helpers.test.js` — tests platformHelpers utility functions
- `search-helpers.test.js` — tests search/filtering utilities
- `sitemap.test.js` — validates sitemap.xml generation
- `content.test.js` — validates content data structure
- `deployment.test.js` — validates deployment configuration
- `legacy-redirects.test.js` — `public/_redirects` against the data: every old address of every page, the same page as `redirect-legacy.jsx`, and how `scripts/check-redirects.mjs` reads a server's answers
- `headers.test.js` — `public/_headers`: security headers unchanged, the `/assets/*` cache rule, no long cache for a page, `/data/` or a file without a hash
- `structured-data.test.jsx` — JSON-LD builders, the `ItemList` against the rendered platform index, and the JSON-LD of three built pages when a build is on disk
- `use-platform-data.test.js` — tests usePlatformData hook (loading, fetch, error, cache)
- `key-words.test.js` — key symbols in words; scans `public/data/platforms/` for a symbol or punctuation key without a word
- `shortcut-page.test.jsx` — app page: FAQ answers in the rendered and server-rendered HTML, accordion, hidden shortcut words, clipboard, author line
- `performance.test.js` — benchmarks page load and rendering
- `feedback-server.test.js` — votes and counts on the server: minimums, one vote per address, no address stored, refusals, the three endpoints
- `shortcut-notes.test.js` — notes of the pages about one shortcut: every name against the data, the rules of the text, title and description of every page, pre-render list, sitemap, nothing of it in the browser
- `shortcut-detail.test.jsx` — the page about one shortcut as it is served, its structured data, and the links to it from the app page
- `app-page-meta.test.js` — title and description of every app page
- `home-page.test.jsx` — the home page: the lists of every platform in the served page, no shortcut in it, the platform a visitor gets (script and code against the same visitors), search that loads on demand
- `site-search.test.jsx` — the search of the navigation bar, and the 44 px targets of the bar on a phone
- `page-weight.test.js` — what must not reach every page (app notes, guides), and the weight of the scripts of a build
- `cookie-banner.test.jsx` — the banner's words, its blocks, the region check started by the page
- `pending-apps.test.js` — the files of `content/pending-apps/`
- `indexnow.test.js`, `site-verification.test.js`, `cloudflare-token.test.js` — the key file and what is reported; the ownership tag on the home page only; the analytics token
- `feedback-ui.test.jsx` — votes and counts on the app page: nothing without a database, only numbers the server sent, ids of every shortcut of every page
- `pdf-bundle.test.jsx` — the bundle file (contents, page numbers) and its offer, shown only with a link and a price
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

**Cloudflare Web Analytics**: Cloudflare puts its own tag into the pages it serves. The site's own tag is printed only for a token of 32 hex characters (`cloudflareToken()`): on 2026-09-29 the build got the value "s" from the secret `VITE_CF_ANALYTICS_TOKEN`, and every page logged failed requests because of it.

**Search consoles**: the proof of ownership is a meta tag on the home page, from `SITE_VERIFICATION` in `siteConfig.js`. Google Search Console has the property `https://keyshortcut.com/` since 2026-09-29. Taking the tag out ends the verification.

**The banner and page speed.** A browser measures "largest contentful paint" by the largest block of text or image, and the banner arrives after the page. Two things keep it from counting as the page:
- Its text is set as one block per sentence (the words are unchanged).
- The region check it waits for starts with the page: `REGION_SCRIPT` (`src/lib/consent.js`) in the head asks `/api/geo` at once for a visitor who has not answered, and the banner uses that answer (`visitorRegion()`). It used to ask after all scripts had run, and then wait 0.8 s more.
- On the platform pages the banner is still the largest block on a slow phone: their own heading is smaller than one sentence of it. Shortening the banner's text would end that; the text is the owner's.

**Consent banner** lives at `src/components/CookieConsent.jsx`. The `cookie-consent` localStorage key holds `accepted` | `declined` (absent = banner shown). GDPR region detection runs through the Cloudflare Function at `functions/api/geo.js` to decide whether the Decline button is rendered.

**Ads consent is separate** (`src/lib/consent.js`):
- The AdSense script is the one script that loads for every visitor, before our banner. That is required: in the EEA/UK/CH it serves **Google's certified consent message** (AdSense → Privacy & messaging), and AdSense waits for that TCF choice before requesting ads. It is injected by an inline loader in `root.jsx` after `load` + idle (a plain async tag cost ~240 ms LCP on a throttled mobile app page).
- In GDPR regions our banner asks about analytics only, and appears after Google's message settles (`whenGoogleConsentSettled`), so the two don't stack.
- `declined` → `requestNonPersonalizedAds = 1` (set by the loader on page load and by `decline()`), plus analytics opt-out.
- Footer "Cookie settings" → `openCookieSettings()` reopens our banner and Google's message (`googlefc.showRevocationMessage`).
- Ad hosts in the CSP: `GOOGLE_ADS_HOSTS` in `root.jsx` (googlesyndication, doubleclick, google.com, gstatic, adtrafficquality.google) for script, img, connect and frame.

**No Impact.com tracking tag.** One was on the site from 2026-10-01 to 2026-10-05. It belonged to a second Impact account (7865306) opened by mistake; the account that holds Setapp (7857038) has keyshortcut.com connected through the `impact-site-verification` meta tag and needs no script. Do not add a tag from another account.

**Route-change page views** are fired by the `AnalyticsTracker` component in `src/root.jsx`, which watches `useLocation().pathname` and calls `trackPageView()` after re-confirming consent.

Reference implementation (non-SSR variant) at `Personal-Portfolio/src/lib/analytics.js`.

### Monetization

- **AdSense units:** `src/data/ads.js`. One In-article unit serves all placements (`IN_ARTICLE_UNIT`); a placement with an empty ID renders nothing. `AdSlot` never hides the slot with `display:none` before fill (AdSense then measures width 0 and never fills); card styling and the "Advertisements" label appear on fill, and `index.css` collapses `data-ad-status="unfilled"`. Ads render only in production builds.
- **Affiliate links:** `src/data/affiliates.js`, keyed by app slug, plus `PLATFORM_FALLBACK` (Setapp on macOS pages). Kept out of Supabase because CI's `pnpm export` rewrites `public/data/`. Empty `url` = nothing renders. `AffiliateLink` uses `rel="sponsored nofollow noopener"`, fires `affiliate_clicked`. It is a card shaped like a native ad (Vlad's example, 2026-10-01): a panel in the brand's colour (`panel`) with the icon, then the name, an "Ad" label, a `title` and one line (`text`). The title is the link and covers the card; the "Ad" label is its own link to `/privacy#affiliate-links` and carries the disclosure in its accessible name. An app's own program shows the app's icon and name, with the site's host name when it has no `text`; a fallback brings its own `name` and `icon` (`public/images/affiliates/`). Title and text are the vendor's own words (Setapp: its approved lines; Raycast: its site's title and description). Programs: Adobe (Partnerize), Raycast (Rewardful), 1Password (CJ), Canva (Impact), Setapp (Impact). Figma closed its program (Jan 2025).
  - Every app of the directory was checked for a program on 2026-09-28. `src/data/affiliatePrograms.js` holds, per program, where to apply, what its own page says it pays, and its conditions; also the apps that have no program (`NO_PROGRAM`), so that nobody adds them from a directory of affiliate programs, which were wrong about several. No page imports that file. `pnpm affiliates` prints the list, `pnpm affiliates --open` the programs not applied to yet.
  - When a program approves: paste the tracking link into `url` in `affiliates.js`, set the program's `state` to `'live'`, run the tests, deploy. A test fails while the two files disagree.
  - Never print a commission on the site.
  - **Setapp** (approved 2026-09-29) has a brand cheat sheet: the name is "Setapp" (never SetApp, SETAPP, Set App), and Setapp is never a bundle, a store, a subscription service, "Netflix for apps" or an alternative to the App Store. The button's line is one of its approved lines ("A shortcut to the best Mac apps"). `setapp-brand.test.js` checks every text under `src/` and `public/privacy.html`.
- **Sponsors:** `src/data/sponsors.js` (`sitewide` or `byPath`). A page sold on its own shows its own sponsor, so the whole site is promised the pages that have none. Sponsor images must be in `public/images/sponsors/` (CSP).
- **The slot of an app page** (after the second section, pages with three or more) holds one thing: a sponsor's card, else the site's own card for the Mac app (`HOUSE_CARD`, macOS pages, `HouseCard.jsx`), else the AdSense unit. `HOUSE_CARD.enabled: false` gives the slot back to the ad unit. The card makes no promise about active app detection, so it carries no note about Settings.
- **PDF bundle:** `pnpm pdf-bundle` writes every cheat sheet of a platform into one file in `dist/products/` (not served, not in git). It is uploaded by hand to a seller that delivers the file after payment. `PDF_BUNDLE` in `src/data/products.js` holds the seller's link and the price; while either is empty, `/cheat-sheets` shows no offer. The single sheets stay free, and the offer says so. `drawAppSheet()` in `generateShortcutPDF.js` draws a sheet for both.
- **No line that asks for a sponsor on app pages** (removed 2026-09-28). The site has too few visitors to sell one page (about 150 visits a month, Cloudflare Web Analytics, September 2026), and every visitor read the line. The offer stays at `/sponsor`, linked from the footer; `/sponsor?page=<path>` still names a page, for a link sent by hand. Come back to it when traffic is several times higher.
- **Sponsor offer (`/sponsor`):** prices, Stripe Payment Links and the go-live promise are `SPONSOR_OFFER` in `src/data/sponsors.js`; copy is `CONTENT.sponsorPage`. An option with an empty `paymentLink` books by email, so the page works before the links exist. `firstMonthCode` (a Stripe promotion code) switches the half-price line on. The page may state one audience figure, `SPONSOR_AUDIENCE`, always with its source and period; a test fails if the page mentions pageviews, click rates or income. The figure is empty since 2026-09-29, and the page then says nothing of visitors and shows the number of app pages in that tile. `?page=` is accepted only when it has the shape of an app page (`isAppPagePath`).
- **How `/sponsor` is built** (`SponsorPage.jsx`): top with a drawn app page that shows where the card sits, four figures, what you get, "Try your card", who sees it (app icons), price, steps, rules, questions.
  - The two booking buttons are in the price cards and nowhere else. The buttons at the top are links down the page (`#price`, `#preview`).
  - The drawn page uses real shortcuts of a real page (`SPONSOR_MOCK`), and the icons are apps of the site (`SPONSOR_PAGE_APPS`); tests compare both with the data. Use macOS key symbols there: the word for the Control key trips the test that forbids click-rate terms.
  - "Try your card" keeps what is typed in the component and nowhere else: no request, no storage. The page says so.
  - The visitor figure sits in one paragraph with its source and period. The meta title and description leave it out, because they have no room for both.
- **Which Cloudflare number counts people.** "Unique visitors" in the HTTP Traffic report are network addresses, robots included: 9.28k in August 2026. Web Analytics counts browsers: 150 visits and 810 page views in the 30 days to 2026-09-29, 590 of the page views from one automatic reader. Only Web Analytics, Search Console or GA4 may be the source of a figure about people. The "9,000+" was on `/sponsor` until 2026-09-29; a test fails if it comes back.
- **Selling a slot:** put the sponsor in `SPONSORS.sitewide` or `SPONSORS.byPath`, add the logo to `public/images/sponsors/`, deploy. A taken sitewide slot hides its booking button on `/sponsor`.
- **Voluntary support:** `SUPPORT_LINK` in `src/data/support.js` (a Stripe Payment Link where the visitor chooses the amount). Empty = nothing renders. When set, `SupportLink` shows in the footer and on `/cheat-sheets`.
- **Disclosures** live in three places: `content.js` (privacy + About "How the Site Is Funded"), `public/privacy.html` (served at `/privacy`, see Deployment), and next to each link.

### Deployment

Hosted on **Cloudflare Pages** (project: `keyshortcut`). Domain: `keyshortcut.com` via Namecheap (nameservers pointed to Cloudflare).

```bash
scripts/deploy-clean.sh   # Preferred manual deploy: committed HEAD only, .env copied in, verify-build --strict, arm64 wrangler, --branch=main
pnpm run deploy           # Build + deploy the working tree as-is (uncommitted changes ship too)
```

A push to `main` also deploys, through CI. All routes are pre-rendered as static HTML. No Node.js server needed. Traps (arm64 workerd, stale OAuth token, `--branch=main`): `~/Desktop/Developing/toolbox/playbooks/2026-09-24-wrangler-pages-deploy-traps.md`.

**keysticker.app** (the Mac app's old name, Pages project `keysticker`) only redirects to keyshortcut.com since 2026-09-27: `/` → `/mac-hud/`, a page → the same page with its closing slash, a file → the same file, each in one redirect. It is a Pages project of its own: a change to `deploy/keysticker-app/_redirects` goes live only with the deploy command in `deploy/keysticker-app/README.md`. A new file at the top level of `public/` needs a line there; `src/test/legacy-redirects.test.js` fails until it has one.

**`/privacy` is served from `public/privacy.html`**, not from the pre-rendered React page (Cloudflare prefers `privacy.html`). It is also the Mac App Store privacy URL. Edit both it and `content.js` together.

**IndexNow** (`scripts/indexnow.mjs`, `scripts/lib/indexnow.mjs`): reports new and changed pages to Bing, Yandex, Seznam and Naver. The key is a file at the top level of `public/` with the key as its name and its content; it is public by design. Only pages whose day of change in the sitemap is recent are reported: a list changed in the database but not yet recorded by `pnpm page-dates` states the day of the build, and would be reported on every deploy until the record is committed.

**The server code finds `public/data` by looking upward** from its own file (`findDataDir` in `supabase.server.js`). The build may split the server code into a subfolder, and a path counted in folders then points beside the project.

Cloudflare Pages config files in `public/`:
- `_headers` — security headers (X-Frame-Options, HSTS, etc.) on `/*`, and `Cache-Control: public, max-age=31536000, immutable` on `/assets/*`. Only `/assets/`: Vite puts a content hash in those file names. HTML, `/data/*.json`, icons, OG images, sitemaps and `llms.txt` keep their name when they change, so they must not get a long cache. Check a change with `wrangler pages dev build/client` and `curl -sI`.
- `_redirects` — legacy redirects (`/shortcuts/...`, `/directory`), each one 301 straight to the address with the closing slash. Cloudflare applies this file before anything else, so `redirect-legacy.jsx` and `redirect-directory.jsx` answer only in `pnpm dev` / `pnpm preview`; change both together. No splats: `/:splat` costs a second redirect, `/:splat/` doubles the slash. Test a change with `wrangler pages dev build/client`.
  - `src/test/legacy-redirects.test.js` checks the file without a network: the old addresses of every platform and app page in `public/data` must lead to a page the build pre-renders.
  - `pnpm check:redirects` (`scripts/check-redirects.mjs`) asks a running server: one 301, ending at 200. Default is keyshortcut.com; pass `http://127.0.0.1:<port>` for `wrangler pages dev`, `--all` for every page, `--wait=90` after a deploy. It exits 1 only on a wrong answer. A server that refuses the robot or is down is a warning, because `update-readme.yml` runs only after a CI/CD run that succeeded.
  - The list asked on every run is `SHORT_LIST` in that script. A new rule needs an entry there.

### CI/CD Workflows (`.github/workflows/`)

- **`ci.yml`** — Main pipeline: lint → test → build → deploy to Cloudflare Pages (on main push only), then the legacy redirects are checked on the live site, then the pages that changed in the last two days are reported to IndexNow (`scripts/indexnow.mjs`, never fails the run). The three tests that ask Supabase can time out on GitHub; the run of 2026-09-29 passed when it was run again. Node 24, pnpm 9. Supabase credentials from GitHub Secrets.
- **`redirect-check.yml`** — The same check of the legacy redirects, on Mondays (06:30 UTC) or by hand. Reads the site only, no secrets.
- **`update-readme.yml`** — Auto-updates README app directory from Supabase. Runs weekly (Monday 6:00 UTC), after successful CI/CD deploy, or manually via `workflow_dispatch`.
- **`shortcut-sync.yml`** — Runs shortcut sync pipeline (scrape external docs → extract shortcuts via Gemini AI → diff → create PR).
- **`shortcut-sync-deploy.yml`** — Auto-deploys after merging PRs with `shortcut-sync` label.

### Build scripts pipeline

During `pnpm build`, scripts run in order:
1. `scripts/download-icons.mjs` — Fetches app icons from Supabase Storage into `public/images/app-icons/`
2. `scripts/generate-sitemap.mjs` — Generates `public/sitemap.xml` from pre-rendered routes
3. `scripts/generate-rss.mjs` — Generates `public/rss.xml`
4. `scripts/generate-og-images.mjs` — Generates Open Graph images
5. React Router build — SSR + pre-renders all pages to `build/client/`

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

### Lists that wait for the database (`content/pending-apps/`)

Files for `pnpm add-app -- --from-json <file>`, prepared on 2026-09-29 from the vendors' own pages. Eight were written to the database the same day (845 shortcuts: Excel for Windows 22 → 159, Word 20 → 220, Windows 30 → 150, a new Edge page). Four wait for icons: Outlook, OneNote, File Explorer, Windows Terminal (281 shortcuts). Its `README.md` is written for the owner.

- **The import runs in the main checkout**, because `.env` is there and is never copied: `node <main>/scripts/add-app.mjs --from-json <main>/content/pending-apps/...`, then `pnpm -C <main> export`. The data files are then copied into the worktree, where the tests and the build run.
- **The export keeps the order of the last export** (`scripts/lib/keep-order.mjs`): a shortcut that was there stays where it was, new ones follow by their `sort_order`. The database answers in the order it keeps its rows, and its `sort_order` does not hold the order the site shows: sorting by it alone moved shortcuts on many macOS pages.

- **Nothing of it is in `public/data`**: that folder is an export, and the next export would undo it. `node scripts/preview-pending-apps.mjs` shows the data as it would be.
- **`pending-apps.test.js` is the gate**: every file against `inputFaults()` (`scripts/lib/app-input.mjs`), no keys the app already has, no text of an existing action changed, a word for every key. A file whose every shortcut is in the data has been written and passes.
- **`scripts/add-app.mjs`** checks its input with the same `inputFaults()` before it writes, links the app to the platform of the file (until 2026-09-29: always macOS), puts a new shortcut after the ones its section has, and leaves `appCategories.js` alone for a platform other than macOS: that file lists the apps of the Mac app.
- **The text of an action is stored once per app, for every platform** (`shortcuts.<slug>.<camelCase>`). A new action whose key equals that of an existing one replaces its text on every platform. The test fails on that.
- **Notes for the new pages** (Edge, and the four that wait) are in `APP_NOTES_FOR_PENDING` (`appNotes.js`) and show from the day the pages exist. `app-notes.test.js` checks them against the data with the pending files merged in.
- **`content/pending-apps/local/`** is not in git: the full reports and the parsers that quote the vendors' pages at length.

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

### Email links

Every `mailto:` link is built by `siteMailto({ topic, page, body })` in `src/utils/siteMailto.js`. The subject opens with `[KeyShortcut]` and the body ends with "Sent from <page address>", so a message written from the site is recognisable in the inbox. `public/privacy.html` is static and carries the same tag, typed in. `src/test/site-mailto.test.jsx` fails on a link written by hand.
