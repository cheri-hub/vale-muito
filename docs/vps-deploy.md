# VPS Deploy

Vale Muito deploys to the VPS with Docker Compose from a tar package sent over SSH. The VPS does not need a full git clone of the repository.

## Safety model

- SSH target: `ssh vps`.
- Remote app directory: `/opt/valemuito`.
- Compose project name: `valemuito`.
- Container name: `valemuito-app`.
- Host port: `127.0.0.1:3008` by default.
- Public frontend domain: `https://vale-muito.cherihub.cloud`.
- Existing Nginx config is not edited by the deploy script.
- Existing Docker projects are not stopped or pruned.

The deploy script packages the local workspace while excluding `.git`, `node_modules`, `.next`, `.env*`, `.secrets`, logs, and local build caches.

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

For later deploys, run:

```powershell
.\vps\deploy.ps1
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

## Useful remote commands

```bash
ssh vps "docker compose -p valemuito -f /opt/valemuito/current/docker-compose.prod.yml ps"
ssh vps "curl -fsS http://127.0.0.1:3008/ >/dev/null && echo ok"
ssh vps "docker logs --tail=120 valemuito-app"
```

## Rollback

List releases:

```bash
ssh vps "ls -1 /opt/valemuito/releases"
```

Point `current` to an older release and restart only the Vale Muito compose project:

```bash
ssh vps "ln -sfn /opt/valemuito/releases/<release-name> /opt/valemuito/current && cd /opt/valemuito/current && VALEMUITO_ENV_FILE=/opt/valemuito/shared/.env.production VALEMUITO_HOST_PORT=3008 docker compose -p valemuito -f docker-compose.prod.yml up -d --build --remove-orphans"
```
