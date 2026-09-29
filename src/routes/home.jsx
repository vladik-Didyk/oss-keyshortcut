import { getManifest, getPlatformApps, getOtherPlatformsMap } from "../utils/supabase.server";
import { CONTENT, buildMeta } from "../data/content";
import { siteVerificationMeta } from "../data/siteConfig";
import DirectoryHomepage from "../components/DirectoryHomepage";

// The home page also carries the proof of ownership for the search consoles.
export function meta() {
  return [...buildMeta(CONTENT.meta.home), ...siteVerificationMeta()];
}

export async function loader() {
  const [manifest, macosApps, otherPlatformsMap] = await Promise.all([
    getManifest(),
    getPlatformApps("macos"),
    getOtherPlatformsMap("macos"),
  ]);
  return {
    manifest,
    platformData: { platform: "macos", apps: macosApps, otherPlatformsMap },
    defaultPlatformId: "macos",
  };
}

export default function HomeRoute() {
  return <DirectoryHomepage />;
}
