import { getPlatformApps, getPlatforms } from "../utils/supabase.server";
import { shortcutPageOf, relatedShortcuts, shortcutLinksOf, shortcutPagePath } from "../utils/shortcutPages";
import { formatKeys } from "../utils/appCopy";
import { parseKeyParts, keysToWords } from "../utils/platformHelpers";
import { buildShortcutDetailJsonLd } from "../utils/structuredData";
import { CONTENT, buildMeta } from "../data/content";
import { loader as legacyRedirect } from "./redirect-legacy";
import ShortcutDetailPage from "../components/ShortcutDetailPage";
import JsonLd from "../components/JsonLd";

const keysOf = (shortcut, platformId) => {
  const parts = parseKeyParts(shortcut.modifiers, shortcut.key);
  return { parts, keys: formatKeys(shortcut, platformId), words: keysToWords(parts, platformId) };
};

// The notes stay on the server: the page gets the one note it shows.
export async function loader({ params }) {
  const { platformId, slug, shortcutId } = params;
  // An old address with three parts (/shortcuts/macos/figma) matches this route
  // in `pnpm dev`. On the host, public/_redirects answers it first.
  if (platformId === "shortcuts") return legacyRedirect({ params: { "*": `${slug}/${shortcutId}` } });

  const platforms = await getPlatforms();
  const platform = platforms.find((p) => p.id === platformId);
  if (!platform) throw new Response("Not Found", { status: 404 });
  const app = (await getPlatformApps(platformId)).find((a) => a.slug === slug);
  if (!app) throw new Response("Not Found", { status: 404 });
  const page = shortcutPageOf(platformId, app, shortcutId);
  if (!page) throw new Response("Not Found", { status: 404 });

  // The same action on the other platforms, as their own data has it.
  const others = [];
  for (const other of platforms) {
    if (other.id === platformId) continue;
    const otherApp = (await getPlatformApps(other.id)).find((a) => a.slug === slug);
    if (!otherApp) continue;
    const same = shortcutPageOf(other.id, otherApp, shortcutId);
    others.push({
      platformId: other.id,
      platformName: other.display_name,
      to: same ? shortcutPagePath(other.id, slug, shortcutId) : `/${other.id}/${slug}`,
      ...(same ? keysOf(same.shortcut, other.id) : { parts: null, keys: null, words: null }),
    });
  }

  const links = shortcutLinksOf(platformId, app);
  return {
    platformId,
    platformName: platform.display_name,
    app: { slug: app.slug, displayName: app.displayName, shortcutCount: app.shortcutCount },
    shortcut: {
      id: page.id,
      title: page.note.title,
      action: page.shortcut.action,
      press: page.note.press,
      what: page.note.what,
      sectionName: page.section.name,
      ...keysOf(page.shortcut, platformId),
    },
    others,
    related: relatedShortcuts(page).map((sc) => ({
      action: sc.action,
      modifiers: sc.modifiers,
      key: sc.key,
      to: links[sc.action] ? shortcutPagePath(platformId, slug, links[sc.action]) : null,
    })),
  };
}

const metaInput = ({ platformId, platformName, app, shortcut, others }) => ({
  title: shortcut.title,
  appName: app.displayName,
  platformName,
  platformId,
  slug: app.slug,
  id: shortcut.id,
  keys: shortcut.keys,
  press: shortcut.press,
  sectionName: shortcut.sectionName,
  others: others.filter((o) => o.keys),
});

// No ErrorBoundary here, and no meta without data: an address that has no page
// goes up to the root route, which renders the not-found page (see root.jsx).
export function meta({ data }) {
  if (!data) return [];
  return buildMeta(CONTENT.meta.shortcutDetail(metaInput(data)));
}

export default function ShortcutDetailRoute({ loaderData }) {
  return (
    <>
      <ShortcutDetailPage data={loaderData} />
      {buildShortcutDetailJsonLd(loaderData).map((block) => (
        <JsonLd key={block["@type"]} data={block} />
      ))}
    </>
  );
}
