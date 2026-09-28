# keysticker.app redirect

keysticker.app (the Mac app's old name) was a stale copy of keyshortcut.com. Since
2026-09-27 it only redirects: `/` → keyshortcut.com/mac-hud, everything else →
the same path on keyshortcut.com (301). `index.html` is a fallback only.

Deploy (from this folder, so wrangler doesn't upload the site's functions/):

    cd deploy/keysticker-app
    CLOUDFLARE_API_TOKEN=… arch -arm64 node ../../node_modules/wrangler/bin/wrangler.js \
      pages deploy . --project-name=keysticker --branch=main --commit-dirty=true

Rollback: Cloudflare → Workers & Pages → keysticker → Deployments → the
2026-03 deployment (34ee8c09) → Rollback.
