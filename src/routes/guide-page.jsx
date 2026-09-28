import { useLoaderData } from "react-router";
import { CONTENT, buildMeta } from "../data/content";
import { getGuideBySlug } from "../data/guides";
import { withCounts } from "../data/siteConfig";
import GuidePage from "../components/GuidePage";

export function loader({ params }) {
  const guide = getGuideBySlug(params.slug);
  if (!guide) throw new Response("Not Found", { status: 404 });
  return { guide: withCounts(guide) };
}

export function meta({ data }) {
  if (!data) return buildMeta(CONTENT.meta.catchAll);
  return buildMeta(CONTENT.meta.guide(data.guide));
}

export default function GuidePageRoute() {
  const { guide } = useLoaderData();
  return <GuidePage guide={guide} />;
}
