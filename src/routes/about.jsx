import { CONTENT, buildMeta } from "../data/content";
import { buildAuthorJsonLd } from "../utils/structuredData";
import AboutPage from "../components/AboutPage";
import JsonLd from "../components/JsonLd";

export function meta() {
  return buildMeta(CONTENT.meta.about);
}

export default function AboutRoute() {
  return (
    <>
      <AboutPage />
      {/* Person: the author named on the "Created by" card */}
      <JsonLd data={buildAuthorJsonLd()} />
    </>
  );
}
