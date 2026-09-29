# keysticker.app redirect

keysticker.app (the Mac app's old name) was a stale copy of keyshortcut.com. Since
2026-09-27 it only redirects: `/` → keyshortcut.com/mac-hud/, everything else →
the same page or file on keyshortcut.com (301). `index.html` is a fallback only.

Each address answers with one redirect: a page gets its closing slash in the
rule, a file keeps its name. The rules and the reasons are in `_redirects`;
`src/test/legacy-redirects.test.js` checks them against the pages of the site.
A new file at the top level of `public/` needs a line in `_redirects`.

Try a change before the deploy (from the project folder):

    arch -arm64 node node_modules/wrangler/bin/wrangler.js pages dev deploy/keysticker-app --port 8862 --ip 127.0.0.1
    curl -sI http://127.0.0.1:8862/macos/figma

Deploy (from this folder, so wrangler doesn't upload the site's functions/;
the token is read from the project's `.env`):

    cd deploy/keysticker-app
    arch -arm64 node ../../node_modules/wrangler/bin/wrangler.js pages deploy . \
      --project-name=keysticker --branch=main --commit-dirty=true --env-file ../../.env

Rollback: Cloudflare → Workers & Pages → keysticker → Deployments → the
2026-03 deployment (34ee8c09) → Rollback.
