import { APP_COUNT, MAC_APP_COUNT, MAC_SHORTCUT_COUNT, PRICE, MIN_MACOS, formatShortcutCount, SITE_NAME, SUPPORT_EMAIL } from './siteConfig'
import { APP_NOTES } from './appNotes'
import { SPONSOR_OFFER, SPONSOR_AUDIENCE } from './sponsors'
import { noteFitsApp, resolveEssentials, everydayShortcuts, formatKeys } from '../utils/appCopy'

/**
 * Single source of truth for all website content.
 * Computed values come from siteConfig.js; everything else is defined here.
 */
export const CONTENT = {
  // ─── Shared across pages ───────────────────────────────────────────
  shared: {
    siteName: SITE_NAME,
    tagline: 'Keyboard shortcuts for every app.',

    navbar: {
      // Primary platform links — shown on desktop and mobile.
      platformLinks: [
        { label: 'macOS', to: '/macos' },
        { label: 'Windows', to: '/windows' },
        { label: 'Linux', to: '/linux' },
      ],
      // Resource links — shown on desktop and mobile (same set on both).
      resourceLinks: [
        { label: 'Guides', to: '/guides' },
        { label: 'Compare', to: '/compare' },
        { label: 'Cheat Sheets', to: '/cheat-sheets' },
      ],
      // Secondary links — shown on desktop and mobile (same set on both).
      secondaryLinks: [
        { label: 'Mac App', to: '/mac-hud' },
        { label: 'About', to: '/about' },
      ],
      // Convenience link surfaced first in the mobile menu so deep-page
      // visitors can always reach the searchable homepage.
      homeLink: { label: 'Home · All shortcuts', to: '/' },
      resourcesLabel: 'Resources',
      appDropdownLinks: [
        { label: 'Features', href: '#features' },
        { label: 'FAQ', href: '#faq' },
        { label: 'Privacy', href: '#policies' },
      ],
      downloadLabel: 'Download',
      macAppLabel: 'Mac App',
      overviewLabel: 'Overview',
      openMenuLabel: 'Open menu',
      closeMenuLabel: 'Close menu',
    },

    footer: {
      tagline: 'Keyboard shortcuts for every app.',
      // Static, hand-curated columns (kept for direct crawl/discovery value).
      columns: [
        {
          heading: 'Directory',
          links: [
            { label: 'All Apps', to: '/' },
            { label: 'macOS Shortcuts', to: '/macos' },
            { label: 'Windows Shortcuts', to: '/windows' },
            { label: 'Linux Shortcuts', to: '/linux' },
          ],
        },
        {
          heading: 'Product',
          links: [
            { label: 'Mac HUD App', to: '/mac-hud' },
            { label: 'Features', to: '/mac-hud#features' },
            { label: 'FAQ', to: '/mac-hud#faq' },
            { label: 'Download', to: '/mac-hud#download' },
          ],
        },
        {
          heading: 'Company',
          links: [
            { label: 'About', to: '/about' },
            { label: 'Sponsor', to: '/sponsor' },
            { label: 'Privacy Policy', to: '/privacy' },
            { label: 'Terms of Use', to: '/privacy#terms' },
          ],
        },
      ],
      // Curated set of high-traffic app pages across all platforms — a
      // static internal-linking asset that helps crawlers and deep-page
      // visitors reach popular references. Slugs verified against
      // public/data/platforms/*.json.
      popularAppsHeading: 'Popular Apps',
      popularApps: [
        { label: 'VS Code (macOS)', to: '/macos/vscode' },
        { label: 'Figma (macOS)', to: '/macos/figma' },
        { label: 'Chrome (macOS)', to: '/macos/chrome' },
        { label: 'Safari (macOS)', to: '/macos/safari' },
        { label: 'Photoshop (macOS)', to: '/macos/photoshop' },
        { label: 'Excel (macOS)', to: '/macos/excel' },
        { label: 'Slack (macOS)', to: '/macos/slack' },
        { label: 'Notion (macOS)', to: '/macos/notion' },
        { label: 'Chrome (Windows)', to: '/windows/chrome' },
        { label: 'Excel (Windows)', to: '/windows/excel' },
        { label: 'VS Code (Linux)', to: '/linux/vscode' },
        { label: 'Vim (Linux)', to: '/linux/vim' },
      ],
      // Resources column heading + the cheat-sheet entry point. Top guides
      // and top comparisons are appended from GUIDES / COMPARISONS in the
      // Footer component so this stays in sync with the data automatically.
      resourcesHeading: 'Resources',
      resourcesStaticLinks: [
        { label: 'Cheat Sheets', to: '/cheat-sheets' },
        { label: 'All Guides', to: '/guides' },
        { label: 'Compare Apps', to: '/compare' },
      ],
      copyright: 'KeyShortcut. All rights reserved.',
      cookieSettings: 'Cookie settings',
      // Shown only when SUPPORT_LINK is set (src/data/support.js).
      supportLink: 'Support this site',
      affiliateNote: 'Some links on this site are affiliate links. If you buy through one, we may earn a commission at no extra cost to you.',
      bottomTagline: 'Made for people who love shortcuts.',
    },

    notFound: {
      title: '404',
      subtitle: 'Page not found',
      button: 'Back to Home',
    },

    errorBoundary: {
      title: 'Something went wrong',
      subtitle: 'An unexpected error occurred.',
      retryButton: 'Try Again',
      button: 'Back to Home',
    },

    macAppStoreButton: {
      ariaLabel: 'Download on the Mac App Store',
    },

    adSlot: {
      // Direct sponsors (sold by us).
      sponsoredLabel: 'Sponsored',
      // Google AdSense units. AdSense allows only "Advertisements" or "Sponsored Links".
      adLabel: 'Advertisements',
    },

    cookieConsent: {
      ariaLabel: 'Cookie consent',
      // Outside the EEA/UK/CH: one banner covers ads and analytics.
      text: 'This website uses cookies for advertising (Google AdSense) and analytics (Google Analytics, Microsoft Clarity, PostHog). By accepting, you consent to our use of cookies. If you decline, you get non-personalised ads and no analytics.',
      // EEA/UK/CH: Google's consent message covers ads; this banner covers analytics only.
      textGdpr: 'We would like to use analytics cookies (Google Analytics, Microsoft Clarity, PostHog) to see which pages people use. Your ad choices are set in Google\u2019s consent message.',
      learnMore: 'Learn more',
      accept: 'Accept',
      decline: 'Decline',
      dismissAria: 'Dismiss cookie banner',
    },
  },

  // ─── Product page (/mac-hud) ───────────────────────────────────────
  productPage: {
    hero: {
      headline: 'Every shortcut.',
      headlineAccent: 'Always visible.',
      subheadline: 'A floating shortcut panel for Mac that detects your active app and shows every keyboard shortcut at a glance. Fast, ergonomic, and always within reach.',
      subheadlineMobile: 'A floating shortcut panel for Mac that detects your active app and shows every keyboard shortcut at a glance. Fast, ergonomic, and always within reach.',
      platformInfo: `${MIN_MACOS}\nOne-time ${PRICE}`,
      platformInfoMobile: `${MIN_MACOS} \u00B7 One-time ${PRICE}`,
      stats: [
        { value: String(MAC_APP_COUNT), label: 'Apps' },
        { value: formatShortcutCount(MAC_SHORTCUT_COUNT), label: 'Shortcuts' },
      ],
      statsMobile: [
        { value: String(MAC_APP_COUNT), label: 'Apps supported' },
        { value: formatShortcutCount(MAC_SHORTCUT_COUNT), label: 'Shortcuts' },
      ],
      keyboardHint: 'Modifier keys filter the panel — press a shortcut to highlight it',
      mobileCta: 'One-time purchase \u00B7 No subscription \u00B7 No tracking',
    },

    problem: {
      title: 'You know the shortcut.',
      titleAccent: 'You just forgot it.',
      paragraphs: [
        'You\'ve looked it up before. Command-something. Maybe Shift was involved. You open a new tab, search "Figma shortcuts," scroll past the ads, find the one you need, switch back... and it\'s gone.',
        'Or maybe you hold a key and stare at a tiny overlay, trying to parse a wall of text before it vanishes.',
        'Shortcuts are supposed to save you time, not cost it. They should be visible, organized, and there the moment you look — not hidden behind a search or a long press.',
      ],
    },

    features: {
      title: 'Take shortcuts,',
      titleAccent: 'not detours.',
      subtitle: 'One interface, everything you need to know.',
      items: [
        {
          title: `${formatShortcutCount(MAC_SHORTCUT_COUNT)} shortcuts across ${MAC_APP_COUNT} apps`,
          description: 'From Finder basics to Figma layers to Excel formulas — the shortcuts you actually use, organized by app, ready at a glance. No memorization required.',
          screenshot: 'keyflow-activeapp',
          alt: 'KeyShortcut showing organized keyboard shortcuts across multiple Mac applications',
        },
        {
          title: 'Always there. Never in the way.',
          description: 'KeyShortcut floats above your workspace in a compact glass panel. It doesn\'t steal focus, doesn\'t block your clicks, doesn\'t interrupt your flow. Pin it to any corner or drag it wherever you want. Toggle it with one hotkey.',
          screenshot: 'keyflow-workflow',
          alt: 'KeyShortcut floating panel positioned in corner without blocking the workspace',
        },
        {
          title: 'Knows what you\'re using',
          description: 'Switch to Figma, and Figma shortcuts appear. Switch to VS Code, and you see VS Code shortcuts. KeyShortcut detects your active app and shows the right shortcuts automatically.',
          screenshot: 'keyflow-appview',
          alt: 'KeyShortcut automatically detecting the active app and showing relevant shortcuts',
        },
        {
          title: 'Your shortcuts, your rules',
          description: 'Create custom shortcuts for anything — open apps, launch URLs, run Apple Shortcuts, or just keep a personal reference card. Assign a global hotkey and trigger them from anywhere on your Mac.',
          screenshot: 'keyflow-search',
          alt: 'KeyShortcut search showing results across multiple apps',
        },
      ],
    },

    details: {
      title: 'Crafted with care.',
      titleAccent: 'Down to every pixel.',
      items: [
        {
          icon: 'Monitor',
          title: 'Glass UI',
          description: 'Follows your system appearance. Light mode, dark mode — it looks right either way.',
        },
        {
          icon: 'Globe',
          title: '11 languages',
          description: 'English, Spanish, French, Portuguese, Russian, Chinese, Hindi, Arabic, Hebrew, Bengali, and Urdu. Interface and shortcuts, fully localized.',
        },
        {
          icon: 'Keyboard',
          title: 'Lives in your menu bar',
          description: 'No Dock icon. Click the ⌘ icon in the menu bar or press ⌃⌘K to show or hide the panel.',
        },
        {
          icon: 'Clipboard',
          title: 'Clipboard preview',
          description: 'See what\'s on your clipboard without pasting it. A small toast appears when you copy — tap it for the full contents.',
        },
        {
          icon: 'Search',
          title: 'Instant search',
          description: 'Type to search across every shortcut in every app. Results are grouped and ranked so you find what you need in a keystroke or two.',
        },
        {
          icon: 'ShieldCheck',
          title: 'Completely private',
          description: 'No analytics. No tracking. No data collection. Works offline, and your settings never leave your Mac.',
        },
      ],
    },

    socialProof: {
      ratingLabel: 'Loved by Mac users',
      ratingSource: 'Mac App Store',
      testimonials: [
        {
          quote: 'I never realized how many shortcuts I was missing until I saw them all laid out. Now I reach for the keyboard instead of the mouse every time.',
          name: 'Alex K.',
          role: 'Software Developer',
        },
        {
          quote: 'The floating panel is genius. It sits in the corner, knows what app I\'m in, and just shows me the shortcuts. No searching, no guessing.',
          name: 'Maria L.',
          role: 'UX Designer',
        },
        {
          quote: 'Worth every penny. I use Figma, VS Code, and Terminal daily — having all the shortcuts visible in one place changed my workflow completely.',
          name: 'James R.',
          role: 'Product Engineer',
        },
      ],
    },

    shortcutPreview: {
      title: 'Beautiful shortcut cards',
      subtitle: 'Every shortcut displayed with styled keycap badges — just like the real keys on your keyboard.',
      shortcuts: [
        { keys: '⌘W', action: 'Close', description: 'Close window' },
        { keys: '⌘C', action: 'Copy', description: 'Copy selection' },
        { keys: '⌘X', action: 'Cut', description: 'Cut selection' },
        { keys: '⌘F', action: 'Find', description: 'Find text' },
        { keys: '⌥⌘⎋', action: 'Force Quit', description: 'Force an unresponsive app to quit' },
        { keys: '⌘H', action: 'Hide', description: 'Hide the active app' },
        { keys: '⌘N', action: 'New', description: 'Open a new window or document' },
        { keys: '⌘T', action: 'New Tab', description: 'Open a new tab' },
        { keys: '⌘V', action: 'Paste', description: 'Paste a copy of the last item copied or cut' },
        { keys: '⌥⇧⌘V', action: 'Paste and Match Style', description: 'Paste matching the document style' },
        { keys: '⌘P', action: 'Print', description: 'Print a document' },
        { keys: '⌘Q', action: 'Quit', description: 'Quit an app' },
        { keys: '⌘S', action: 'Save', description: 'Save a document' },
        { keys: '⇧⌘3', action: 'Screenshot', description: 'Screenshot the full screen' },
        { keys: '⇧⌘4', action: 'Screenshot Selection', description: 'Screenshot a portion of the screen' },
        { keys: '⇧⌘5', action: 'Screenshot Options', description: 'Screenshot or record the screen' },
        { keys: '⌘A', action: 'Select All', description: 'Select everything' },
        { keys: 'Fn', action: 'Emoji & Symbols', description: 'Open Character Viewer' },
        { keys: '⌘Space', action: 'Spotlight', description: 'Search for anything on your Mac' },
        { keys: '⌘Tab', action: 'Switch Apps', description: 'Switch between open apps' },
        { keys: '⌘Z', action: 'Undo', description: 'Undo the last action' },
      ],
    },

    appCoverage: {
      title: 'Shortcuts for the apps',
      titleAccent: 'you use every day',
      subtitle: `${MAC_APP_COUNT} apps. ${formatShortcutCount(MAC_SHORTCUT_COUNT)} shortcuts. From system essentials to pro tools.`,
      footnote: 'Don\'t see your app? Import your own shortcut packs or create custom shortcuts for any app.',
      rows: [
        [
          'Safari', 'Chrome', 'Arc', 'Firefox', 'Brave', 'Edge', 'Vivaldi',
          'Xcode', 'VS Code', 'Cursor', 'IntelliJ IDEA', 'Sublime Text',
          'PyCharm', 'GoLand', 'PHPStorm', 'CLion', 'RubyMine', 'Android Studio',
          'iTerm2', 'Warp', 'Vim', 'Chrome DevTools',
          'Figma', 'Sketch', 'Photoshop', 'Illustrator', 'After Effects', 'Blender',
        ],
        [
          'Slack', 'Discord', 'Telegram', 'Zoom', 'Teams', 'Gmail',
          'Notion', 'Obsidian', 'Things', 'Todoist', 'Linear',
          'Jira', 'Trello', 'Asana', 'ClickUp',
          'Google Docs', 'Google Sheets', 'Google Drive',
          'Bear', '1Password', 'Raycast',
          'Word', 'Excel', 'PowerPoint', 'Acrobat',
          'Spotify', 'VLC', 'Final Cut Pro', 'DaVinci Resolve',
          'Finder', 'Mail', 'Notes', 'Calendar', 'Music',
        ],
      ],
    },

    appGrid: {
      title: 'Browse by category',
      subtitle: 'Find shortcuts for your favorite apps, organized by workflow.',
      viewAll: `View all ${MAC_APP_COUNT} apps`,
    },

    interactiveKeyboard: {
      title: 'Try a',
      titleAccent: 'shortcut',
      subtitle: 'Click modifier keys then a letter to discover keyboard shortcuts.',
      platformLabels: { mac: 'MacBook', win: 'Windows' },
      hints: {
        mac: 'Click \u2318 \u21E7 \u2325 \u2303 then press a key',
        win: 'Click Ctrl, Shift, Alt, or \u229E then press a key',
      },
      mobileFallback: 'Try the interactive keyboard on a larger screen.',
      notAssigned: '\u2014 not assigned',
    },

    faq: {
      title: 'Questions and answers',
      subtitle: 'Everything you need to know about KeyShortcut.',
      items: [
        {
          question: 'What macOS versions does KeyShortcut support?',
          answer: 'KeyShortcut requires macOS 13 (Ventura) or later.',
        },
        {
          question: 'Is this a subscription?',
          answer: `No. KeyShortcut is a one-time purchase of ${PRICE}. No subscriptions, no in-app purchases, no upsells. Pay once, use it forever.`,
        },
        {
          question: 'Does it work with my favorite app?',
          answer: `KeyShortcut covers shortcuts for ${MAC_APP_COUNT} apps \u2014 from system essentials like Finder and Safari to professional tools like Figma, Xcode, Final Cut Pro, and Excel. Plus JetBrains IDEs, Google Workspace, project management tools, and more. You can also import custom shortcut packs or create your own.`,
        },
        {
          question: 'Is it private?',
          answer: 'Completely. KeyShortcut is sandboxed, collects no data, sends nothing over the internet, and requires no account. What happens on your Mac stays on your Mac.',
        },
        {
          question: 'Can I add my own shortcuts?',
          answer: 'Yes. Create custom shortcuts with any key combination. You can make them visual reference cards or assign actions \u2014 open an app, launch a URL, run an Apple Shortcut, or copy text to your clipboard.',
        },
        {
          question: 'Does it support my language?',
          answer: 'KeyShortcut is fully localized in 11 languages: English, Spanish, French, Portuguese (Brazil), Russian, Chinese (Simplified), Hindi, Arabic, Hebrew, Bengali, and Urdu \u2014 including full right-to-left support.',
        },
        {
          question: 'How is KeyShortcut different from free alternatives?',
          answer: 'Free tools typically show you a raw list of menu items when you hold a key \u2014 then disappear the moment you let go. KeyShortcut is always visible, beautifully organized, covers apps beyond the one you\'re in, detects your active app automatically, lets you search across everything, and supports custom shortcuts with global hotkeys. It\'s a shortcut companion, not a tooltip.',
        },
        {
          question: 'Can I use it on multiple Macs?',
          answer: 'Yes. Like any Mac App Store purchase, KeyShortcut is tied to your Apple Account. Download it on any Mac signed into the same account. Family Sharing is also supported.',
        },
      ],
    },

    policies: {
      title: 'Your Privacy Matters',
      subtitle: 'Zero data collection in the app. Everything stays on your Mac.',
      items: [
        {
          title: 'Privacy Policy',
          id: 'privacy',
          content: [
            'The KeyShortcut app does not collect, store, or transmit any personal data. No analytics or tracking frameworks are included in the app.',
            'The app downloads shortcut data from Supabase (read-only). No personal data or device identifiers are sent. Apple MetricKit is used for anonymized crash reports.',
            'All user preferences (favorites, custom shortcuts, window position) are stored locally on your device using macOS UserDefaults.',
            'KeyShortcut does not request Accessibility permission and does not monitor your keystrokes. Active app detection reads only the identifier of the frontmost app.',
            'The keyshortcut.com website uses Cloudflare Web Analytics (cookie-free, no personal data) and Google AdSense. These services apply only to the website, not the app.',
          ],
        },
        {
          title: 'Terms of Use',
          id: 'terms',
          content: [
            'KeyShortcut is provided "as is" without warranty of any kind, express or implied.',
            'You may use KeyShortcut for personal and commercial purposes.',
            'The app is distributed exclusively through the Mac App Store and is subject to Apple\'s standard terms and conditions.',
            'We reserve the right to update these terms at any time. Continued use of the app constitutes acceptance of any changes.',
          ],
        },
        {
          title: 'Data Handling',
          id: 'data',
          content: [
            'Zero data collection in the app \u2014 we never see or access your information.',
            'All app data stays on your device in the macOS app sandbox.',
            'No third-party SDKs, analytics, or advertising frameworks in the app.',
            'No cloud sync \u2014 your settings live exclusively on your Mac.',
            'Uninstalling KeyShortcut removes all associated data from your system.',
            'The website uses Cloudflare Web Analytics and Google AdSense. See our full privacy policy for details.',
          ],
        },
      ],
    },

    ctaBanner: {
      title: 'Take the short way.',
      titleAccent: `One-time ${PRICE}.`,
      subtitle: `${formatShortcutCount(MAC_SHORTCUT_COUNT)} shortcuts across ${MAC_APP_COUNT} apps.\nNo subscription. No tracking. Just shortcuts, always within reach.`,
      footnote: `${MIN_MACOS} \u00B7 No account required`,
    },

    video: {
      title: 'See it in',
      titleAccent: 'action',
      subtitle: 'Watch how KeyShortcut helps you master macOS shortcuts effortlessly.',
      placeholder: 'Video coming soon',
    },
  },

  // ─── Directory homepage (/) ────────────────────────────────────────
  home: {
    title: 'Keyboard Shortcuts',
    titleAccent: 'Directory',
    subtitle: 'Browse shortcuts for popular apps on macOS, Windows, and Linux. Organized by category, searchable by name.',
    stats: (shortcuts, apps) => `${shortcuts} shortcuts \u00b7 ${apps} apps`,
    searchPlaceholder: 'Search apps or shortcuts',
    searchAriaLabel: 'Search for an app',
    allCategory: 'All',
    categoryCount: (n) => `${n} ${n === 1 ? 'app' : 'apps'}`,
    error: 'Something went wrong. Please try refreshing.',
    refreshButton: 'Refresh',
    emptyCategory: 'No apps in this category yet.',
    promo: {
      title: 'KeyShortcut for Mac',
      subtitle: 'See shortcuts for the active app in your menu bar.',
      button: 'Download',
    },
    aboutSection: {
      title: 'About This Directory',
      paragraphs: [
        'KeyShortcut is a free, open keyboard shortcuts directory covering macOS, Windows, and Linux. Every shortcut listed here is sourced from official application documentation, verified for accuracy, and organized into logical categories so you can find what you need quickly.',
        'The directory is searchable by app name and by shortcut action. You can look up a specific key combination, browse all shortcuts for an app, or explore apps by category — from browsers and code editors to design tools and productivity apps.',
        'All shortcuts are displayed with visual keycap badges that match the modifier key style of each platform: Command, Option, Control, and Shift on macOS, or Ctrl, Alt, Shift, and Win on Windows and Linux. This makes it easy to scan the page and identify the combination you need at a glance.',
      ],
      whyTitle: 'Why Keyboard Shortcuts Matter',
      whyParagraphs: [
        'Research consistently shows that keyboard shortcuts save significant time over mouse-driven workflows. A study by Brainscape found that the average user can save up to 8 working days per year by using shortcuts instead of navigating menus. Every second you spend reaching for the mouse, finding the right menu, and clicking adds up.',
        'Beyond speed, shortcuts reduce cognitive load. When a key combination becomes muscle memory, it no longer requires conscious thought — your hands execute the action while your mind stays focused on the task. This is why professional designers, developers, and writers all rely heavily on shortcut-driven workflows.',
      ],
      // Homepage app row: the apps with the most shortcuts. No traffic data yet, so not "Popular".
      mostShortcutsTitle: 'Most shortcuts',
      popularTitle: 'Universal Shortcuts',
      popularSubtitle: 'These shortcuts work in almost every application, across all platforms.',
      popularShortcuts: [
        { action: 'Copy', mac: '⌘ C', win: 'Ctrl C' },
        { action: 'Paste', mac: '⌘ V', win: 'Ctrl V' },
        { action: 'Cut', mac: '⌘ X', win: 'Ctrl X' },
        { action: 'Undo', mac: '⌘ Z', win: 'Ctrl Z' },
        { action: 'Redo', mac: '⇧ ⌘ Z', win: 'Ctrl Y' },
        { action: 'Save', mac: '⌘ S', win: 'Ctrl S' },
        { action: 'Select All', mac: '⌘ A', win: 'Ctrl A' },
        { action: 'Find', mac: '⌘ F', win: 'Ctrl F' },
        { action: 'New Tab', mac: '⌘ T', win: 'Ctrl T' },
        { action: 'Close Tab', mac: '⌘ W', win: 'Ctrl W' },
      ],
    },
  },

  // ─── Platform index (/:platformId) ────────────────────────────────
  directory: {
    backLabel: 'Home',
    searchPlaceholder: 'Search apps or shortcuts',
    searchAriaLabel: 'Search apps',
    clearAriaLabel: 'Clear search',
    categoryCount: (n) => `${n} ${n === 1 ? 'app' : 'apps'}`,
    shortcutsLabel: 'shortcuts',
    intro: (platformName, appCount, shortcutCount) =>
      `Browse keyboard shortcuts for ${appCount} ${platformName} applications, totaling ${shortcutCount.toLocaleString()}+ shortcuts. Every shortcut is sourced from official documentation and organized by category. Click on any app to see its full shortcut reference, filter by action, or download a PDF cheat sheet.`,
    learnMore: (platformName) =>
      `Keyboard shortcuts are essential for working efficiently on ${platformName}. Whether you're switching between apps, editing documents, or managing files, knowing the right key combination saves you time and keeps you in flow. This directory is updated regularly as apps add new features and shortcuts.`,
    modifierTitle: 'Modifier Keys Reference',
    modifierExplainer: (platformName) => {
      if (platformName === 'macOS') return [
        { symbol: '⌘', name: 'Command', description: 'The primary modifier key on Mac. Used for most common shortcuts like Copy (⌘C), Paste (⌘V), and Save (⌘S).' },
        { symbol: '⌥', name: 'Option', description: 'Also labeled Alt on some keyboards. Used for alternate actions and special characters.' },
        { symbol: '⌃', name: 'Control', description: 'Less common in macOS than on other platforms. Used in terminal, Emacs-style text navigation, and some app-specific shortcuts.' },
        { symbol: '⇧', name: 'Shift', description: 'Extends selections, reverses actions, or accesses alternate functions. Shift+⌘+Z is Redo in most apps.' },
        { symbol: 'Fn', name: 'Function', description: 'Activates function keys (F1–F12) and system features like Emoji picker (Fn alone) and Dictation (Fn twice).' },
      ]
      if (platformName === 'Windows') return [
        { symbol: 'Ctrl', name: 'Control', description: 'The primary modifier key on Windows. Used for most shortcuts like Copy (Ctrl+C), Paste (Ctrl+V), and Save (Ctrl+S).' },
        { symbol: 'Alt', name: 'Alternate', description: 'Accesses menu bar shortcuts, switches windows (Alt+Tab), and provides alternate actions in many apps.' },
        { symbol: 'Shift', name: 'Shift', description: 'Extends selections, reverses actions, or accesses alternate functions. Ctrl+Shift+Z is Redo in many apps.' },
        { symbol: '⊞ Win', name: 'Windows', description: 'Opens the Start menu, and is combined with other keys for system-level shortcuts like Win+D (show desktop).' },
      ]
      return [
        { symbol: 'Ctrl', name: 'Control', description: 'The primary modifier key. Used for most shortcuts like Copy (Ctrl+C), Paste (Ctrl+V), and Save (Ctrl+S).' },
        { symbol: 'Alt', name: 'Alternate', description: 'Accesses menu bar shortcuts and provides alternate actions. Alt+Tab switches windows.' },
        { symbol: 'Shift', name: 'Shift', description: 'Extends selections, reverses actions, or accesses alternate functions.' },
        { symbol: 'Super', name: 'Super/Meta', description: 'Often the Windows key on standard keyboards. Opens the activities overview in GNOME or application launcher in KDE.' },
      ]
    },
  },

  // ─── Per-app shortcut page (/:platformId/:slug) ───────────────────
  shortcutPage: {
    breadcrumbHome: 'Home',
    sidebarTitle: 'Sections',
    filterPlaceholder: 'Filter shortcuts...',
    searchPlaceholder: (count) => `Search ${count} shortcuts`,
    backLabel: (platformName) => `${platformName} shortcuts`,
    titleSuffix: 'shortcuts',
    pdfLabel: 'PDF',
    docsLabel: 'Official docs',
    filterAriaLabel: 'Filter shortcuts',
    clearAriaLabel: 'Clear filter',
    downloadTitle: 'Download shortcuts as PDF',
    alsoOnLabel: 'Also on:',
    intro: (appName, platformName, shortcutCount, sectionCount) =>
      `This page lists all ${shortcutCount} ${appName} keyboard shortcuts for ${platformName}, grouped into ${sectionCount} ${sectionCount === 1 ? 'section' : 'sections'}.`,
    // largest: [{ name, count }] from largestSections() in utils/appCopy.
    sectionsSummary: (largest) =>
      largest.length < 2
        ? ''
        : `The largest are ${largest.map((s, i) => `${i === largest.length - 1 ? 'and ' : ''}${s.name} (${s.count})`).join(largest.length > 2 ? ', ' : ' ')}.`,
    startWithTitle: 'Start with these',
    appTipsTitle: (appName) => `Tips for ${appName}`,
    everydayTitle: (appName) => `Everyday ${appName} shortcuts`,
    everydayIntro: 'Everyday actions this app has shortcuts for:',
    faqItems: (app, platformName) => {
      const name = typeof app === 'string' ? app : app.displayName
      const count = typeof app === 'string' ? null : app.shortcutCount
      const sections = typeof app === 'string' ? [] : (app.sections || [])
      const sectionNames = sections.slice(0, 4).map(s => s.name)
      const docsUrl = typeof app === 'string' ? null : app.docsUrl

      const items = []

      // 1. App-specific count question
      if (count) {
        items.push({
          question: `How many keyboard shortcuts does ${name} have on ${platformName}?`,
          answer: `${name} has ${count} keyboard shortcuts on ${platformName}, organized into ${sections.length} sections${sectionNames.length ? ': ' + sectionNames.join(', ') + ', and more' : ''}. This page lists all of them with searchable, organized shortcut tables.`,
        })
      }

      // 2. What to learn first: the app's hand-written essentials if its note fits
      //    this page, otherwise the everyday actions it has (utils/appCopy).
      if (typeof app !== 'string') {
        const platformId = platformName === 'macOS' ? 'macos' : platformName.toLowerCase()
        const note = APP_NOTES[app.slug]
        const fromNote = noteFitsApp(note, app)
        const picks = fromNote ? resolveEssentials(note.essentials, app) : everydayShortcuts(app)
        if (picks.length >= 3) {
          const list = picks.map((sc) => `${sc.action} (${formatKeys(sc, platformId)})`).join(', ')
          items.push(
            fromNote
              ? {
                  question: `Which ${name} shortcuts should I learn first?`,
                  answer: `Start with ${list}. They cover the actions you repeat most in ${name}; the sections below list the rest.`,
                }
              : {
                  question: `Which everyday actions have shortcuts in ${name}?`,
                  answer: `On ${platformName}, ${name} has shortcuts for everyday actions such as ${list}. The sections on this page list all the others.`,
                }
          )
        }
      }

      // 3. PDF / reference question
      items.push({
        question: `Can I download ${name} shortcuts as a PDF?`,
        answer: `Yes. Click the download button at the top of this page to generate a printable PDF cheat sheet with all ${count || ''} ${name} shortcuts. The PDF includes organized sections, keycap-style key labels, and space for your own notes.`,
      })

      // 4. Official docs question (if URL available)
      if (docsUrl) {
        items.push({
          question: `Where is the official ${name} keyboard shortcuts documentation?`,
          answer: `The official ${name} keyboard shortcuts documentation is available on their website. Every shortcut on this page is sourced from and verified against the official documentation to ensure accuracy.`,
        })
      }

      // 5. Platform-specific question
      if (platformName === 'macOS') {
        items.push({
          question: `Do these ${name} shortcuts work on all Mac keyboards?`,
          answer: `Yes. These shortcuts work on all Mac keyboards, including MacBook built-in keyboards and external Apple keyboards. The modifier keys are Command (\u2318), Option (\u2325), Control (\u2303), and Shift (\u21E7). On keyboards without a Function row, some F-key shortcuts may require holding the Fn key.`,
        })
      } else if (platformName === 'Windows') {
        items.push({
          question: `Do these ${name} shortcuts work on all Windows keyboards?`,
          answer: 'Yes. These shortcuts work on standard Windows keyboards. The modifier keys are Ctrl, Alt, Shift, and the Windows key (\u229E). Some laptop keyboards may have compact layouts where certain keys require an Fn modifier to access.',
        })
      } else {
        items.push({
          question: `Do these ${name} shortcuts work across Linux distributions?`,
          answer: `These shortcuts work in ${name} regardless of which Linux distribution or desktop environment you use. The modifier keys are Ctrl, Alt, Shift, and Super (usually the Windows key). Some desktop environments may override specific key combinations \u2014 check your system keyboard settings if a shortcut doesn\u2019t work as expected.`,
        })
      }

      return items
    },
    affiliate: {
      disclosure: 'Affiliate link: we may earn a commission if you buy, at no extra cost to you.',
      learnMore: 'How we make money',
    },
    sponsorCta: (appName) => `Reach people who use ${appName}: sponsor this page`,
    moreAppsTitle: (platformName) => `Explore more ${platformName} apps`,
    faqTitle: 'Frequently Asked Questions',
    ctaTitle: (appName) => `Access ${appName} shortcuts from your menu bar`,
    ctaSubtitle: 'KeyShortcut detects the active app and shows its shortcuts instantly. No memorization needed.',
    ctaButton: 'Download KeyShortcut',
    errorTitle: 'App not found',
    errorSubtitle: 'We don\'t have shortcuts for this app yet.',
    errorLink: 'Browse all apps',
  },

  // ─── Privacy & Terms (/privacy) ───────────────────────────────────
  privacy: {
    policy: {
      title: 'Privacy Policy',
      effectiveDate: 'Effective date: September 28, 2026',
      intro: 'This policy covers the keyshortcut.com website and the KeyShortcut macOS app. The website displays advertisements served by Google AdSense, uses analytics with your consent, and contains affiliate links. The app does not collect personal data. Website sections come first, app sections after.',
      sections: [
        {
          heading: 'Website Analytics & Advertising',
          content: [
            { type: 'paragraph', text: 'The keyshortcut.com website uses the following third-party services:' },
            {
              type: 'list',
              items: [
                { bold: 'Cloudflare Web Analytics', text: ' \u2014 a privacy-first analytics service that measures page views and performance. It does not use cookies, does not track individual users, and does not collect personal data. Data is aggregated and anonymous.' },
                { bold: 'Google Analytics, Microsoft Clarity and PostHog', text: ' \u2014 measure which pages are used and how (Clarity also records anonymised page interactions). They load only after you accept the cookie banner.' },
                { bold: 'Google AdSense', text: ' \u2014 displays ads on the website. Google and its partners may use cookies to serve ads based on your visits to this and other websites. You can opt out of personalized advertising at ', link: { text: 'Google Ads Settings', href: 'https://www.google.com/settings/ads' }, textAfter: '.' },
                { bold: 'How Google uses data', text: ' \u2014 from sites that use its services: ', link: { text: 'policies.google.com/technologies/partner-sites', href: 'https://policies.google.com/technologies/partner-sites' }, textAfter: '.' },
              ],
            },
            { type: 'paragraph', text: 'Visitors in the EEA, the UK and Switzerland see Google\u2019s consent message, a certified consent tool, before ads use cookies. If you decline our cookie banner, you get non-personalised ads and no analytics. You can change your choice at any time with the "Cookie settings" link in the footer.' },
            { type: 'paragraph', text: 'These services apply only to the website. The KeyShortcut macOS app contains no analytics, advertising, or tracking of any kind.' },
          ],
        },
        {
          heading: 'Affiliate Links and Sponsors',
          id: 'affiliate-links',
          content: [
            { type: 'paragraph', text: 'The website is free. It is paid for by ads, sponsors, affiliate links and the KeyShortcut Mac app.' },
            { type: 'paragraph', text: 'Some "Get" buttons on app pages are affiliate links, and each one is labeled. If you buy through one, we may earn a commission at no extra cost to you. The seller may set a cookie to credit the sale to us; that cookie is governed by the seller\u2019s privacy policy.' },
            { type: 'paragraph', text: 'Sponsored placements are labeled "Sponsored". Sponsors and affiliate programs do not change which shortcuts we list or how we describe them.' },
            { type: 'paragraph', text: 'Payments for sponsorships and for voluntary support of the site are handled by Stripe. We never see or store card numbers. Stripe’s privacy policy applies to the payment.' },
          ],
        },
        {
          heading: 'Cookies',
          id: 'cookies',
          content: [
            { type: 'paragraph', text: 'The KeyShortcut macOS app does not use cookies. The keyshortcut.com website uses cookies only through third-party services:' },
            {
              type: 'list',
              items: [
                { bold: 'Google AdSense', text: ' — may set cookies to serve and measure ads. These are governed by ', link: { text: 'Google\u2019s privacy policy', href: 'https://policies.google.com/privacy' }, textAfter: '.' },
                { bold: 'Google Analytics, Microsoft Clarity, PostHog', text: ' — set analytics cookies only after you accept the cookie banner.' },
                { bold: 'Affiliate partners', text: ' — may set a cookie after you click an affiliate link, to credit a purchase.' },
                { bold: 'Cloudflare', text: ' — may set a technical cookie (__cf_bm) for bot protection. This is not used for tracking.' },
              ],
            },
            { type: 'paragraph', text: 'Your choices are stored in your browser. Use "Cookie settings" in the footer to change them, or control cookies through your browser settings. Disabling cookies may affect ad display but will not affect site functionality.' },
          ],
        },
        {
          heading: 'Your Rights (GDPR / EEA)',
          content: [
            { type: 'paragraph', text: 'If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR):' },
            {
              type: 'list',
              items: [
                { bold: 'Right of access', text: ' — request a copy of any personal data we hold about you.' },
                { bold: 'Right to rectification', text: ' — request correction of inaccurate data.' },
                { bold: 'Right to erasure', text: ' — request deletion of your personal data.' },
                { bold: 'Right to restrict processing', text: ' — request that we limit how we use your data.' },
                { bold: 'Right to data portability', text: ' — request your data in a portable format.' },
                { bold: 'Right to object', text: ' — object to processing of your data, including for advertising purposes.' },
              ],
            },
            { type: 'paragraph', text: 'Since KeyShortcut does not collect personal data through its app, these rights primarily apply to any data collected by third-party services on the website (Google AdSense). You can opt out of personalized ads via Google Ads Settings, Google\u2019s consent message, or "Cookie settings" in the footer.' },
            { type: 'contact', text: 'To exercise any of these rights, contact us at' },
          ],
        },
        {
          heading: 'Your Rights (CCPA / California)',
          content: [
            { type: 'paragraph', text: 'If you are a California resident, the California Consumer Privacy Act (CCPA) gives you additional rights:' },
            {
              type: 'list',
              items: [
                { bold: 'Right to know', text: ' — what personal information is collected, used, or shared.' },
                { bold: 'Right to delete', text: ' — request deletion of your personal information.' },
                { bold: 'Right to opt out', text: ' — opt out of the sale or sharing of personal information.' },
                { bold: 'Right to non-discrimination', text: ' — you will not be penalized for exercising your rights.' },
              ],
            },
            { type: 'paragraph', text: 'KeyShortcut does not sell personal information. Google AdSense on the website may use data for ad targeting, which may qualify as "sharing" under CCPA. You can opt out via Google Ads Settings, the privacy choices link Google shows to visitors in US states that require one, or "Cookie settings" in the footer (declining gives non-personalised ads).' },
            { type: 'contact', text: 'For CCPA requests, contact us at' },
          ],
        },
        {
          heading: 'App Data Collection',
          content: [
            { type: 'paragraph', text: 'The KeyShortcut macOS app does not collect, store, or transmit any personal data. There are no analytics frameworks, no tracking pixels, and no advertising SDKs in the app.' },
          ],
        },
        {
          heading: 'Network Access',
          content: [
            { type: 'paragraph', text: 'The KeyShortcut macOS app connects to Supabase (our database provider) to sync shortcut data. These requests are read-only and used solely to keep your shortcut library up to date. No personal data, device identifiers, or usage information is sent in these requests.' },
            { type: 'paragraph', text: 'The app also uses Apple\u2019s MetricKit framework for anonymized crash reporting (see Apple Diagnostics below). Apart from these two services, the app makes no other network requests.' },
          ],
        },
        {
          heading: 'Local Storage',
          content: [
            { type: 'paragraph', text: 'KeyShortcut stores your preferences locally on your device using macOS UserDefaults within the app sandbox. This includes:' },
            {
              type: 'list',
              items: [
                'Favorited shortcuts',
                'Custom shortcuts you create',
                'Window position and appearance settings',
                'Language preference',
                'Imported shortcut pack file references',
              ],
            },
            { type: 'paragraph', text: 'This data never leaves your Mac. Uninstalling KeyShortcut removes all associated data.' },
          ],
        },
        {
          heading: 'Accessibility Permission',
          content: [
            { type: 'paragraph', text: 'KeyShortcut does not request macOS Accessibility permission and does not monitor your keystrokes.' },
            { type: 'paragraph', text: 'Active App Detection (optional, off by default) reads only the bundle identifier of the frontmost app, using standard macOS APIs, to show relevant shortcuts. No window content is accessed.' },
          ],
        },
        {
          heading: 'Apple Diagnostics',
          content: [
            { type: 'paragraph', text: 'KeyShortcut uses Apple\'s MetricKit framework, which allows Apple to collect anonymized crash reports and performance metrics through the standard macOS diagnostics pipeline. This data is processed by Apple, not by us. You can control this in System Settings > Privacy & Security > Analytics & Improvements.' },
          ],
        },
        {
          heading: 'Children\'s Privacy',
          content: [
            { type: 'paragraph', text: 'KeyShortcut does not collect any data from any user, including children.' },
          ],
        },
        {
          heading: 'Data Retention',
          content: [
            { type: 'paragraph', text: 'KeyShortcut does not retain any personal data. App preferences are stored locally on your device and are deleted when you uninstall the app. Any data collected by third-party services on the website (Cloudflare, Google) is governed by their respective retention policies.' },
          ],
        },
        {
          heading: 'Changes to This Policy',
          content: [
            { type: 'paragraph', text: 'If we update this policy, the revised version will be posted here with a new effective date.' },
          ],
        },
        {
          heading: 'Contact',
          content: [
            { type: 'contact', text: 'If you have questions about this privacy policy, contact us at' },
          ],
        },
      ],
    },
    terms: {
      title: 'Terms of Use',
      effectiveDate: 'Effective date: March 14, 2026',
      intro: 'By purchasing and using KeyShortcut, you agree to the following terms.',
      sections: [
        {
          heading: 'License',
          content: [
            { type: 'paragraph', text: 'KeyShortcut is licensed, not sold. Your purchase grants you a non-exclusive, non-transferable license to use the app on any Mac signed into your Apple Account, in accordance with Apple\'s standard App Store terms.' },
          ],
        },
        {
          heading: 'Disclaimer',
          content: [
            { type: 'paragraph', text: 'KeyShortcut is provided "as is" without warranty of any kind, express or implied. We do not warrant that the app will be error-free or uninterrupted.' },
          ],
        },
        {
          heading: 'Limitation of Liability',
          content: [
            { type: 'paragraph', text: 'In no event shall the developer be liable for any indirect, incidental, or consequential damages arising from the use of KeyShortcut.' },
          ],
        },
        {
          heading: 'Governing Law',
          content: [
            { type: 'paragraph', text: 'These terms are subject to Apple\'s Licensed Application End User License Agreement (EULA) and the laws of the jurisdiction in which the developer resides.' },
          ],
        },
        {
          heading: 'Contact',
          content: [
            { type: 'contact', text: 'For questions about these terms, contact us at' },
          ],
        },
      ],
    },
  },

  // ─── About page (/about) ─────────────────────────────────────────
  about: {
    title: 'About KeyShortcut',
    published: '2025-06-01',
    lastUpdated: '2026-09-27',
    sections: [
      {
        title: 'The Story',
        paragraphs: [
          'I spend 12+ hours a day at a computer. Keyboard shortcuts are how I get things done: copying, pasting, switching apps, navigating code. I use them constantly, across dozens of different programs.',
          'The problem? Every time I needed a shortcut I didn\u2019t know, I\u2019d open a browser, go to that app\u2019s website, dig through their docs, find the key combination, switch back, and sometimes forget it before I could even use it. Over and over, for every app.',
          'So I started building my own shortcuts database. One place to look up any shortcut, for any app, organized the way my brain actually works. That became KeyShortcut.',
          `Today it covers ${APP_COUNT} apps across macOS, Windows, and Linux, with ${formatShortcutCount()} shortcuts, all sourced from official documentation. The companion Mac app goes further: it detects your active app and shows its shortcuts in a floating panel, instantly.`,
        ],
      },
      {
        title: 'How We Verify Shortcuts',
        paragraphs: [
          'Every shortcut in this directory is sourced from official application documentation — not user-submitted tips or third-party blogs. When an app publishes a keyboard shortcuts reference page, that\u2019s our primary source.',
          'Our sync pipeline regularly checks official docs pages for changes. When an app updates its shortcuts (adding new ones, deprecating old ones, or changing key combinations), we detect the diff and update the directory accordingly. Each change is reviewed before it goes live.',
          'If you spot an incorrect shortcut or a missing app, you can report it directly by emailing us. Community feedback helps us maintain accuracy across hundreds of apps and thousands of shortcuts.',
        ],
      },
      {
        title: 'How the Directory Is Organized',
        paragraphs: [
          'The directory is structured around three levels: platforms, categories, and apps. At the top level, you choose your operating system — macOS, Windows, or Linux. Each platform has its own set of apps and platform-specific key combinations.',
          'Within each platform, apps are grouped into categories like Browsers, Code Editors, Design, Productivity, and Communication. Categories make it easy to discover apps similar to the ones you already use.',
          'Each app page lists all available shortcuts organized into logical sections (e.g., "File Management," "Navigation," "Editing"). You can search within a page, browse the sidebar table of contents, or download the full list as a printable PDF.',
        ],
      },
      {
        title: 'How the Site Is Funded',
        paragraphs: [
          'The directory is free. Ads (Google AdSense), page sponsors, affiliate links and the KeyShortcut Mac app pay for it.',
          'Affiliate links and sponsored placements are labeled. If you buy through an affiliate link, we may earn a commission at no extra cost to you. Sponsors and affiliate programs do not change which shortcuts we list or how we describe them.',
          `To sponsor the site or one page, see keyshortcut.com/sponsor, or email ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
    cards: {
      missing: {
        label: 'Helping out',
        title: 'Missing something?',
        text: 'Can\u2019t find your favorite app or noticed a wrong shortcut? Let me know and I\u2019ll add it. Every suggestion makes this resource better for everyone.',
        buttonLabel: 'Suggest an app',
        buttonHref: `mailto:${SUPPORT_EMAIL}?subject=App%20suggestion%20for%20KeyShortcut`,
      },
      openSource: {
        label: 'Open source',
        title: 'Built in the open',
        text: 'KeyShortcut is open source. Browse the code, report issues, or contribute on GitHub.',
        buttonLabel: 'View on GitHub',
        buttonHref: 'https://github.com/vladik-Didyk/KeyShortcut',
      },
      creator: {
        label: 'Created by',
        name: 'Vladik Didyk',
        url: 'https://vladik-didyk.netlify.app',
        avatar: '/images/avatar.webp',
        title: 'Full-Stack Developer & Systems Engineer',
        location: 'Toronto, Canada',
        bio: 'Like what you see? The Mac app takes it further \u2014 it detects your active app and shows its shortcuts instantly. Support the project and have every shortcut at your fingertips.',
        links: {
          linkedin: 'https://linkedin.com/in/vladislav-didyk',
          github: 'https://github.com/vladik-Didyk',
        },
        buttonLabel: 'Get the Mac App',
      },
    },
  },

  // ─── Sponsor page (/sponsor) ──────────────────────────────────────
  // Every figure here is computed from the data or comes from SPONSOR_AUDIENCE,
  // which carries its source and period. Do not add a number that was not measured.
  sponsorPage: {
    title: 'Sponsor KeyShortcut',
    lead: 'One sponsor slot: a labeled card in the middle of the app pages. Month to month.',
    fromPage: (path) => `You came from ${path}. You can book that page alone, or the whole site.`,

    offer: {
      title: 'What you get',
      items: ({ slotPages, appPages }) => [
        `A card labeled "Sponsored" in the middle of the shortcut list, on ${slotPages} of the ${appPages} app pages. The other pages are too short to hold one.`,
        'Your name, one line of text and a link. A logo up to 96 px tall if you want one.',
        'One sponsor per page. Your card takes the place of the ad in that spot.',
        'Your link carries ?ref=keyshortcut, so the clicks show up in your own analytics.',
      ],
    },

    audience: {
      title: 'Who sees it',
      items: () => [
        `People looking up keyboard shortcuts for ${APP_COUNT} apps on macOS, Windows and Linux: ${formatShortcutCount()} shortcuts, taken from the apps’ official documentation.`,
        `${SPONSOR_AUDIENCE.monthlyVisitors} unique visitors a month (${SPONSOR_AUDIENCE.source}, ${SPONSOR_AUDIENCE.period}).`,
      ],
      // The slot is new. Say so instead of guessing a click rate.
      unknown: 'What I don’t have yet: click numbers for this slot. It is new.',
      unknownWithOffer: 'What I don’t have yet: click numbers for this slot. It is new, which is why the first month is half price.',
    },

    price: {
      title: 'Price',
      sitewide: { name: 'The whole site', detail: 'Your card on every app page that has the slot.' },
      page: { name: 'One page', detail: 'Your card on one app page of your choice.' },
      perMonth: 'a month',
      terms: 'Month to month. Cancel any time, and the card comes off at the end of the paid month.',
      firstMonth: (code) => `The first month is half price with the code ${code} at checkout.`,
      taken: 'Taken right now. Email me to be told when it opens.',
    },

    steps: {
      title: 'How it works',
      items: ({ email, days }) => [
        'Pay by card. Stripe handles the payment.',
        `Email your name, your line of text, your link and an optional logo to ${email}.`,
        `Your card is live within ${days} business days of both. If it isn’t, I refund the month.`,
      ],
      byEmail: ({ email }) => [
        `Email ${email} with your name, your line of text and your link.`,
        'I reply with a payment link. Stripe handles the payment.',
        'Your card goes live after the payment.',
      ],
    },

    rules: {
      title: 'Rules',
      items: [
        'Every card is labeled "Sponsored", and its link is marked as sponsored for search engines.',
        'A sponsor does not change which shortcuts are listed or how they are described.',
        'Not accepted: gambling, crypto, adult content, and medical, legal or financial advice.',
        'I can decline a sponsor. If I decline after you paid, you get a full refund.',
      ],
    },

    cta: {
      sitewide: (price) => `Book the whole site — $${price} a month`,
      page: (price) => `Book one page — $${price} a month`,
      pageNamed: (path, price) => `Book ${path} — $${price} a month`,
      byEmailNote: 'Card payment for this option is being set up. The button opens an email to me.',
    },

    contact: (email) => `Questions first? Write to ${email}.`,
  },

  // ─── Cheat sheets page: voluntary support (shown only when SUPPORT_LINK is set) ──
  support: {
    cheatSheets: {
      before: 'The cheat sheets are free. If one saved you time, you can ',
      link: 'support the site',
      after: '.',
    },
  },

  // ─── Route meta (SEO) ─────────────────────────────────────────────
  meta: {
    home: {
      title: 'Keyboard Shortcuts Directory \u2014 KeyShortcut',
      description: `Browse ${formatShortcutCount()} keyboard shortcuts for macOS, Windows, and Linux apps. Find shortcuts for any app, organized by category.`,
      url: 'https://keyshortcut.com/',
    },
    productPage: {
      title: 'KeyShortcut for Mac \u2014 Floating Shortcut Panel',
      description: `A floating keyboard shortcut panel for macOS that detects your active app and shows every shortcut at a glance. ${formatShortcutCount(MAC_SHORTCUT_COUNT)} shortcuts across ${MAC_APP_COUNT} apps. One-time purchase.`,
      url: 'https://keyshortcut.com/mac-hud',
    },
    privacy: {
      title: 'Privacy Policy & Terms \u2014 KeyShortcut',
      description: 'KeyShortcut privacy policy, terms of use, and website data practices.',
      url: 'https://keyshortcut.com/privacy',
    },
    about: {
      title: 'About KeyShortcut \u2014 Keyboard Shortcuts Directory',
      description: 'Learn about KeyShortcut, the free keyboard shortcuts directory for macOS, Windows, and Linux. Our mission, approach, and how to get in touch.',
      url: 'https://keyshortcut.com/about',
    },
    sponsor: {
      title: 'Sponsor KeyShortcut \u2014 One Slot on Every App Page',
      description: `One labeled sponsor card on the app pages of a keyboard shortcuts directory covering ${APP_COUNT} apps. $${SPONSOR_OFFER.sitewide.price} a month sitewide, $${SPONSOR_OFFER.page.price} a month for one page. Month to month.`,
      url: 'https://keyshortcut.com/sponsor',
    },
    guidesIndex: {
      title: 'Keyboard Shortcut Guides & Tips \u2014 KeyShortcut',
      description: 'Practical guides on keyboard shortcuts, productivity workflows, and shortcut management for macOS, Windows, and Linux.',
      url: 'https://keyshortcut.com/guides',
    },
    compareIndex: {
      title: 'Keyboard Shortcut Comparisons \u2014 KeyShortcut',
      description: 'Side-by-side keyboard shortcut comparisons between popular apps. See how shortcuts map across Figma vs Sketch, VS Code vs Cursor, Chrome vs Safari, and more.',
      url: 'https://keyshortcut.com/compare',
    },
    compare: (nameA, nameB) => ({
      title: `${nameA} vs ${nameB} Keyboard Shortcuts \u2014 KeyShortcut`,
      description: `Compare keyboard shortcuts between ${nameA} and ${nameB}. Side-by-side view of shared and unique shortcuts to help you switch between apps faster.`,
      url: `https://keyshortcut.com/compare/${nameA.toLowerCase().replace(/\s+/g, '-')}-vs-${nameB.toLowerCase().replace(/\s+/g, '-')}`,
    }),
    cheatSheets: {
      title: 'Keyboard Shortcut Cheat Sheets \u2014 Free Printable PDFs \u2014 KeyShortcut',
      description: `Download free printable keyboard shortcut cheat sheets for ${APP_COUNT}+ apps. PDF format with organized shortcuts and keycap-style key labels for macOS, Windows, and Linux.`,
      url: 'https://keyshortcut.com/cheat-sheets',
    },
    guide: (guide) => ({
      title: `${guide.title} \u2014 KeyShortcut`,
      description: guide.description,
      url: `https://keyshortcut.com/guides/${guide.slug}`,
      image: `https://keyshortcut.com/images/og/${guide.slug}.png`,
      publishedTime: guide.published,
      modifiedTime: guide.lastUpdated || guide.published,
    }),
    catchAll: {
      title: 'Page Not Found \u2014 KeyShortcut',
      description: 'The page you\'re looking for doesn\'t exist.',
    },
    notFound: {
      title: 'Not Found \u2014 KeyShortcut',
    },
    platformIndex: (platformName, appCount, shortcutCount, platformId) => ({
      title: `${platformName} App Shortcuts \u2014 KeyShortcut`,
      description: `Browse keyboard shortcuts for ${appCount} ${platformName} apps. ${shortcutCount.toLocaleString()}+ shortcuts.`,
      url: `https://keyshortcut.com/${platformId}`,
      image: `https://keyshortcut.com/images/og/${platformId}.png`,
    }),
    shortcutPage: (appName, platformName, shortcutCount, platformId, slug) => ({
      title: `${appName} ${platformName} Shortcuts \u2014 KeyShortcut`,
      description: `All ${shortcutCount} ${appName} keyboard shortcuts for ${platformName}.`,
      url: `https://keyshortcut.com/${platformId}/${slug}`,
      image: `https://keyshortcut.com/images/og/${platformId}-${slug}.png`,
    }),
  },

  // ─── Structured data (JSON-LD) ────────────────────────────────────
  structured: {
    website: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'KeyShortcut',
      url: 'https://keyshortcut.com',
      description: 'Browse keyboard shortcuts for macOS, Windows, and Linux apps. Find shortcuts for any app, organized by category.',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://keyshortcut.com/?search={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  },
}

/**
 * Converts a meta entry into React Router's meta array format.
 * @param {{ title: string, description?: string, url?: string }} entry
 * @returns {Array<Object>}
 */
export function buildMeta({ title, description, url, image, publishedTime, modifiedTime }) {
  const meta = [{ title }]
  if (description) {
    meta.push(
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    )
  }
  if (url) {
    meta.push(
      { property: 'og:url', content: url },
      { tagName: 'link', rel: 'canonical', href: url },
    )
  }
  if (image) {
    meta.push(
      { property: 'og:image', content: image },
      { name: 'twitter:image', content: image },
    )
  }
  if (publishedTime) {
    meta.push(
      { property: 'og:type', content: 'article' },
      { property: 'article:published_time', content: publishedTime },
    )
  }
  if (modifiedTime) {
    meta.push({ property: 'article:modified_time', content: modifiedTime })
  }
  return meta
}
