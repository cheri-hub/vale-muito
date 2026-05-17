# VPS Deploy

Vale Muito deploys to the VPS with Docker Compose from deploy manifests sent over SSH. The VPS does not need a full git clone of the repository or a local application build.

## Safety model

- SSH target: `ssh vps`.
- Remote app directory: `/opt/valemuito`.
- Compose project name: `valemuito`.
- Container name: `valemuito-app`.
- Host port: `127.0.0.1:3008` by default.
- Public frontend domain: `https://vale-muito.cherihub.cloud`.
- Existing Nginx config is not edited by the deploy script.
- Existing Docker projects are not stopped or pruned.

The deploy script packages the local workspace while excluding `.git`, `node_modules`, `.next`, `.env*`, `.secrets`, logs, and local build caches, then updates the app by pulling a published image from GitHub Container Registry.

## First deploy

Create the production env file on the VPS without printing secrets:

```bash
ssh vps "mkdir -p /opt/valemuito/shared && chmod 700 /opt/valemuito/shared"
scp .env.local vps:/opt/valemuito/shared/.env.production
ssh vps "chmod 600 /opt/valemuito/shared/.env.production"
```

Or let the PowerShell deploy script copy `.env.local` without printing it:

```powershell
.\vps\deploy.ps1 -CopyLocalEnv
```

Before the first registry-based deploy, publish a stable GitHub Release so GHCR has `ghcr.io/cheri-hub/vale-muito:<release-tag>` and refreshes `:latest`.

For later deploys, run:

```powershell
.\vps\deploy.ps1
```

To deploy a specific released image tag:

```powershell
.\vps\deploy.ps1 -ImageTag v1.0.0
```

Use another loopback port only if 3008 becomes occupied:

```powershell
.\vps\deploy.ps1 -HostPort 3018
```

## Nginx

A read-only VPS inspection found existing Docker services on ports `3000`, `3001`, `3005`, `8001`, `8002`, and `8004`, plus existing Nginx upstream references around `3002`, `3003`, `3004`, `5000`, and `8003`. Vale Muito uses `127.0.0.1:3008` to avoid those.

Do not overwrite current Nginx files. The VPS currently has a dedicated site for `vale-muito.cherihub.cloud` proxying to `127.0.0.1:3008`, with Certbot TLS and HTTP-to-HTTPS redirect enabled. For future rebuilds, base the site on `vps/nginx-valemuito.example.conf`, then run:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

The app is already reachable on the VPS loopback port after deploy:

```bash
ssh vps "curl -fsS http://127.0.0.1:3008/ >/dev/null && echo ok"
```

If Supabase is configured but its schema is not migrated yet, public read pages fall back to the local seed so the deployed app still opens. Apply `supabase/migrations/001_initial_schema.sql` before relying on production writes.

If the GHCR package is private, authenticate Docker once on the VPS before deploying:

```bash
ssh vps "echo \"<github-token>\" | docker login ghcr.io -u <github-username> --password-stdin"
```

## Useful remote commands

```bash
ssh vps "docker compose -p valemuito -f /opt/valemuito/current/docker-compose.prod.yml ps"
ssh vps "curl -fsS http://127.0.0.1:3008/ >/dev/null && echo ok"
ssh vps "docker logs --tail=120 valemuito-app"
ssh vps "docker image ls ghcr.io/cheri-hub/vale-muito"
ssh vps "for release in /opt/valemuito/releases/*; do printf '%s -> ' \"$(basename \"$release\")\"; cat \"$release/.deployed-image-ref\"; done"
```

## Rollback

List releases:

```bash
ssh vps "ls -1 /opt/valemuito/releases"
```

Point `current` to an older release and restart only the Vale Muito compose project:

```bash
ssh vps "release=/opt/valemuito/releases/<release-name>; image=$(cat \"$release/.deployed-image-ref\"); ln -sfn \"$release\" /opt/valemuito/current && cd /opt/valemuito/current && VALEMUITO_ENV_FILE=/opt/valemuito/shared/.env.production VALEMUITO_HOST_PORT=3008 VALEMUITO_IMAGE=\"$image\" docker compose -p valemuito -f docker-compose.prod.yml pull && VALEMUITO_ENV_FILE=/opt/valemuito/shared/.env.production VALEMUITO_HOST_PORT=3008 VALEMUITO_IMAGE=\"$image\" docker compose -p valemuito -f docker-compose.prod.yml up -d --remove-orphans"
```
