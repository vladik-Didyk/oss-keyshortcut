// No ErrorBoundary and no meta here: the 404 goes up to the root route, which
// renders the not-found page and its meta (see ErrorBoundary in root.jsx).
export function loader() {
  throw new Response("Not Found", { status: 404 });
}

export default function CatchAllRoute() {
  return null;
}
