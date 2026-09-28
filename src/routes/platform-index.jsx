import { isRouteErrorResponse, useLoaderData, useRouteError } from "react-router";
import { getPlatformApps, getPlatforms, getOtherPlatformsMap } from "../utils/supabase.server";
import { buildPlatformItemList } from "../utils/structuredData";
import { CONTENT, buildMeta } from "../data/content";
import NotFound from "../components/NotFound";
import ShortcutsIndex from "../components/ShortcutsIndex";
import JsonLd from "../components/JsonLd";

export async function loader({ params }) {
  const { platformId } = params;
  const platforms = await getPlatforms();
  const valid = platforms.find((p) => p.id === platformId);
  if (!valid) throw new Response("Not Found", { status: 404 });

  const apps = await getPlatformApps(platformId);
  const categories = [...new Set(apps.map((a) => a.category))];
  const otherPlatformsMap = await getOtherPlatformsMap(platformId);

  return {
    platformId,
    platformName: valid.display_name,
    apps,
    categories,
    otherPlatformsMap,
  };
}

export function meta({ data }) {
  if (!data) {
    return buildMeta(CONTENT.meta.notFound);
  }
  const { platformName, platformId, apps } = data;
  const totalShortcuts = apps.reduce((s, a) => s + a.shortcutCount, 0);
  return buildMeta(CONTENT.meta.platformIndex(platformName, apps.length, totalShortcuts, platformId));
}

export default function PlatformIndexRoute() {
  const data = useLoaderData();
  return (
    <>
      <ShortcutsIndex />
      {/* ItemList of the apps on this page, in the order shown */}
      <JsonLd data={buildPlatformItemList(data)} />
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }

  throw error;
}
