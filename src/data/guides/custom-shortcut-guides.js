export default {
  slug: 'custom-shortcut-guides',
  title: 'How to Add Your Own Keyboard Shortcuts on a Mac',
  description: 'Two ways to add your own keyboard shortcuts on macOS: App Shortcuts in System Settings for menu commands, and the Shortcuts app for actions.',
  published: '2026-03-31',
  lastUpdated: '2026-09-28',
  readingTime: '4 min read',
  category: 'Reference',
  relatedSlugs: ['shortcut-collections', 'personalized-shortcut-workflow'],
  relatedApps: [
    { label: 'Finder Shortcuts', to: '/macos/macos#finder' },
    { label: 'Safari Shortcuts', to: '/macos/safari' },
  ],
  sections: [
    {
      id: 'introduction',
      heading: 'Beyond Built-In Shortcuts',
      content: [
        { type: 'paragraph', text: 'Every app comes with its own keyboard shortcuts, but they\'re designed for the average user. Your workflow is different. You have specific files you open daily, URLs you visit repeatedly, commands you run in sequence, and actions no app developer anticipated.' },
        { type: 'paragraph', text: 'macOS has two ways to add your own. App Shortcuts in System Settings give a key combination to a menu command. The Shortcuts app gives a key combination to an action, such as opening an app or a web page. Both come with macOS.' },
      ],
    },
    {
      id: 'menu-commands',
      heading: 'Shortcuts for Menu Commands',
      content: [
        { type: 'paragraph', text: 'If a menu command has no shortcut, or has one you do not like, you can set your own:' },
        {
          type: 'list',
          items: [
            'Open System Settings → Keyboard → Keyboard Shortcuts → App Shortcuts.',
            'Click the + button and choose one app, or All Applications.',
            'Type the menu title exactly as the app shows it.',
            'Press the key combination and click Done.',
          ],
        },
        { type: 'paragraph', text: 'This works only for commands that are in an app\'s menus. It cannot open an app or a web page.' },
      ],
    },
    {
      id: 'actionable-shortcuts',
      heading: 'Shortcuts That Run an Action',
      content: [
        { type: 'paragraph', text: 'The Shortcuts app can run an action when you press a key combination. Make a shortcut, open its details and choose Add Keyboard Shortcut. Actions that are useful every day:' },
        {
          type: 'list',
          items: [
            'Open an app — start Terminal, Finder or any other app.',
            'Open a URL — a meeting link, a project board, a documentation page.',
            'Copy text to the clipboard — an email signature, a code snippet, a reply you type often.',
          ],
        },
        { type: 'ad', variant: 'in-article' },
      ],
    },
    {
      id: 'workflow-examples',
      heading: 'Workflow Examples',
      content: [
        { type: 'paragraph', text: 'Examples of shortcuts you can make in the Shortcuts app:' },
        {
          type: 'shortcut-table',
          shortcuts: [
            { keys: '⌃⌥ D', action: 'Open daily standup meeting link in browser', platform: 'macos' },
            { keys: '⌃⌥ J', action: 'Open Jira board for current sprint', platform: 'macos' },
            { keys: '⌃⌥ G', action: 'Open GitHub notifications page', platform: 'macos' },
            { keys: '⌃⌥ S', action: 'Copy email signature to clipboard', platform: 'macos' },
            { keys: '⌃⌥ T', action: 'Open Terminal app', platform: 'macos' },
            { keys: '⌃⌥ N', action: 'Make a new meeting note', platform: 'macos' },
          ],
        },
        { type: 'paragraph', text: 'Use the same modifier keys for all of them, for example ⌃⌥ (Control+Option). They are then easier to remember.' },
      ],
    },
    {
      id: 'organization',
      heading: 'Organizing Your Custom Shortcuts',
      content: [
        { type: 'paragraph', text: 'As your custom shortcut collection grows, organization becomes important. A few strategies that work well:' },
        {
          type: 'list',
          items: [
            'Use a consistent modifier prefix. For example, use ⌃⌥ (Control+Option) for all custom shortcuts. This avoids conflicts with app-native shortcuts.',
            'Group by function. URLs in one group, app launchers in another, clipboard templates in a third.',
            'Keep it lean. 10-15 well-chosen custom shortcuts are more useful than 50 that you can\'t remember. If you haven\'t used a custom shortcut in a month, consider removing it.',
            'Review quarterly. Your workflow changes — your shortcuts should change with it. Add new ones for new responsibilities, remove ones that are no longer relevant.',
          ],
        },
      ],
    },
    {
      id: 'apple-shortcuts',
      heading: 'More Than One Action',
      content: [
        { type: 'paragraph', text: 'A shortcut in the Shortcuts app can hold several actions. One key combination then runs all of them:' },
        {
          type: 'list',
          items: [
            'Start a focus mode, open specific apps, and arrange windows for a work session.',
            'Create a new note in Apple Notes with today\'s date as the title.',
            'Take a screenshot and save it to a shared folder.',
            'Collect today\'s calendar events and copy them to the clipboard.',
            'Toggle system dark mode.',
          ],
        },
      ],
    },
    {
      id: 'keyshortcut',
      heading: 'Where KeyShortcut Fits',
      content: [
        { type: 'paragraph', text: 'KeyShortcut for Mac shows the shortcuts that apps already have. Version 1.0 has no editor for your own shortcuts. It can import a shortcut pack, which is a .json file: open Settings and choose Import Pack.' },
      ],
    },
    {
      id: 'getting-started',
      heading: 'Getting Started',
      content: [
        { type: 'paragraph', text: 'Start with three custom shortcuts that solve your most repetitive daily tasks. The ones that make the biggest difference are usually the actions you perform multiple times a day — opening a specific URL, launching a specific app, or typing a specific phrase.' },
        { type: 'paragraph', text: 'Once you use those three without thinking, add three more.' },
        { type: 'cta', variant: 'mac-app' },
      ],
    },
  ],
}
