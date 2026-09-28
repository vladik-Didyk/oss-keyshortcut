import { isRouteErrorResponse, useRouteError } from "react-router";
import { getPlatformApps, getPlatforms, getOtherPlatforms, getOtherPlatformsMap } from "../utils/supabase.server";
import { pickMoreApps } from "../utils/platformHelpers";
import { CONTENT, buildMeta } from "../data/content";
import NotFound from "../components/NotFound";
import ShortcutPage from "../components/ShortcutPage";

/** Strip heavy section/shortcut payloads so the related-app cards stay lightweight. */
function toCardApp(a) {
  return {
    slug: a.slug,
    displayName: a.displayName,
    shortcutCount: a.shortcutCount,
    category: a.category,
  };
}

export async function loader({ params }) {
  const { platformId, slug } = params;
  const platforms = await getPlatforms();
  const valid = platforms.find((p) => p.id === platformId);
  if (!valid) throw new Response("Not Found", { status: 404 });

  const apps = await getPlatformApps(platformId);
  const app = apps.find((a) => a.slug === slug);
  if (!app) throw new Response("Not Found", { status: 404 });

  const otherPlatforms = await getOtherPlatforms(slug, platformId);

  // Onward journeys, different on every page (see pickMoreApps): same-category
  // siblings, then other apps on the platform.
  const otherPlatformsMap = await getOtherPlatformsMap(platformId);
  const sameCategory = app.category ? apps.filter((a) => a.category === app.category) : [];
  const relatedApps = pickMoreApps(sameCategory, slug, 8).map(toCardApp);
  const moreApps = pickMoreApps(
    apps,
    slug,
    8,
    relatedApps.map((a) => a.slug)
  ).map(toCardApp);

  // Only ship otherPlatforms entries the cards actually reference.
  const cardSlugs = new Set([...relatedApps, ...moreApps].map((a) => a.slug));
  const cardOtherPlatformsMap = {};
  for (const s of cardSlugs) {
    if (otherPlatformsMap[s]) cardOtherPlatformsMap[s] = otherPlatformsMap[s];
  }

  return {
    platformId,
    platformName: valid.display_name,
    app,
    otherPlatforms,
    relatedApps,
    moreApps,
    otherPlatformsMap: cardOtherPlatformsMap,
  };
}

export function meta({ data }) {
  if (!data) {
    return buildMeta(CONTENT.meta.notFound);
  }
  const { app, platformName, platformId } = data;
  return buildMeta(CONTENT.meta.shortcutPage(app.displayName, platformName, app.shortcutCount, platformId, app.slug));
}

export default function ShortcutPageRoute() {
  return <ShortcutPage />;
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }

  throw error;
}
