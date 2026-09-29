/**
 * What a list of apps needs of an app: its name, its category and how many
 * shortcuts it has. Not the shortcuts.
 *
 * The home page and the platform pages used to carry every shortcut of a
 * platform (470 KB of the home page's 700 KB), twice: once as HTML and once as
 * data for the browser. They list apps, so they get the list. The search loads
 * the shortcuts when somebody starts to search (usePlatformSearch).
 */
export const slimApp = ({ slug, displayName, category, shortcutCount }) => ({ slug, displayName, category, shortcutCount })

export const slimApps = (apps) => (apps || []).map(slimApp)

/** { figma: [{ id: 'windows', name: 'Windows' }] } -> { figma: [{ id: 'windows' }] } */
export const slimOtherPlatforms = (map) =>
  Object.fromEntries(Object.entries(map || {}).map(([slug, platforms]) => [slug, platforms.map(({ id }) => ({ id }))]))
