import { useLoaderData } from "react-router";
import { CONTENT, buildMeta } from "../data/content";
import { getPlatformApps, getPlatforms } from "../utils/supabase.server";
import { countSponsorPages } from "../utils/sponsorStats";
import SponsorPage from "../components/SponsorPage";

export function meta() {
  return buildMeta(CONTENT.meta.sponsor);
}

// Counts the app pages at build time, so the page never states a stale number.
export async function loader() {
  const platforms = await getPlatforms();
  const appsByPlatform = await Promise.all(platforms.map((p) => getPlatformApps(p.id)));
  return countSponsorPages(appsByPlatform);
}

export default function SponsorRoute() {
  return <SponsorPage stats={useLoaderData()} />;
}
