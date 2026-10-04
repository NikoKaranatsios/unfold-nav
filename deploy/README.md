# Showcase deployment

The public demo is at [unfold-nav.romagnolo.eu](https://unfold-nav.romagnolo.eu).
It serves `index.html`, `site.html` and hashed assets built by `pnpm build:showcase`.
The npm library and this website are separate artifacts.

## Container

The Dockerfile builds with Node 24 and the project's pinned pnpm version, then
copies only the static output into Caddy. The web server runs as UID 1000 on port
8080, with a read-only filesystem and a `/health` endpoint. HTML revalidates on
each visit; hashed assets can be cached for a year. Missing files return 404.

To try the same image locally:

```bash
docker build -t unfold-nav-showcase .
docker run --rm --read-only --cap-drop ALL --security-opt no-new-privileges \
  --tmpfs /tmp:size=16m,mode=1777 -p 8080:8080 unfold-nav-showcase
```

## Romagnolo server

`codex-ops` manages this product as `unfold-nav`, using `compose.yaml`, service
`showcase`, port 8080 and health path `/health`. The existing control plane calls
this environment `staging`; it is the public demo at `unfold-nav.romagnolo.eu`.
The container joins `codex_edge` through the deployment tool and publishes no
host ports. The central Caddy handles HTTPS and proxies to
`unfold-nav-staging-showcase:8080`.

Update the demo through the server's STDIO MCP at `/usr/local/bin/codex-ops-mcp`:

1. Push the tested change to the repository's `main` branch.
2. Call `task_create` for `unfold-nav`, using a new slug and base `origin/main`.
3. Call `task_run_checks` for that task. Registered checks install frozen
   dependencies, check the package, build the showcase and validate Compose.
4. Call `deployment_plan` with `environment: "staging"`. Review the commit and
   hostname, then call `deployment_apply` with that plan's deployment ID.
5. Verify `/health`, the showcase, assets and the standalone demo over HTTPS.

The edge Nginx route `/etc/nginx/sites-available/unfold-nav-redirect` redirects
HTTP to HTTPS and forwards ACME HTTP challenges to the existing Caddy container,
following the other Romagnolo subdomain routes. If Caddy's edge IP changes,
update its ACME upstream along with the other routes.

To roll back, revert the release commit on `main`, push it, and use the same
verified deployment workflow with a new task. Keep the site configuration and
container definition in Git so the rollback rebuilds a complete release.
