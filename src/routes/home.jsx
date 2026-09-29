import { getManifest, getPlatformApps, getOtherPlatformsMap } from "../utils/supabase.server";
import { CONTENT, buildMeta } from "../data/content";
import { siteVerificationMeta } from "../data/siteConfig";
import { slimApps, slimOtherPlatforms } from "../utils/slimApps";
import DirectoryHomepage from "../components/DirectoryHomepage";

// The home page also carries the proof of ownership for the search consoles.
export function meta() {
  return [...buildMeta(CONTENT.meta.home), ...siteVerificationMeta()];
}

// The app list of every platform, without the shortcuts: the page shows the
// list of the visitor's platform at once, and a crawler reads all of them.
export async function loader() {
  const manifest = await getManifest();
  const directory = {};
  for (const platform of manifest.platforms) {
    const [apps, otherPlatformsMap] = await Promise.all([
      getPlatformApps(platform.id),
      getOtherPlatformsMap(platform.id),
    ]);
    directory[platform.id] = { apps: slimApps(apps), otherPlatformsMap: slimOtherPlatforms(otherPlatformsMap) };
  }
  return { manifest, directory, defaultPlatformId: "macos" };
}

export default function HomeRoute() {
  return <DirectoryHomepage />;
}
