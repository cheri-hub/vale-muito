# Vale Muito

Vale Muito é uma PWA para recomendar comidas que realmente compensam o gasto. O MVP começa por Piracicaba/SP, roda offline com seed local e fica pronto para Supabase quando as variáveis públicas forem configuradas.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current Scope

- Home discovery experience with search, category, neighborhood, price and value-score filters.
- Seed data focused on Piracicaba/SP.
- Supabase-ready repository layer with offline fallback.
- Redis REST-backed rate limiting with local development fallback.
- Recommendation form wired to a server action.
- Address geocoding and manual map selection for recommendation coordinates.
- Public editorial rule: "Gastei para comer isso e valeu a pena."
- Optional recommendation photos.
- Detail pages with share and report actions.
- Admin moderation queue wired to server actions.
- Magic-link login skeleton for Supabase Auth.
- Leaflet map for recommendation markers.
- PWA manifest baseline.
- Supabase migration and seed SQL under `supabase/`.

## Routes

- `/` - discover recommendations.
- `/recommend/new` - submit a recommendation.
- `/recommendations/[id]` - recommendation detail, share and report.
- `/login` - Supabase magic-link login.
- `/auth/callback` - Supabase auth callback.
- `/guidelines` - public editorial criteria.
- `/admin/moderation` - review reported recommendations.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run supabase:types
```

Playwright uses `http://localhost:3000` by default. To test production explicitly:

```powershell
$env:E2E_BASE_URL="https://vale-muito.cherihub.cloud"; npm run test:e2e
```

## VPS Deploy

Production deploy for this project uses Docker Compose on the VPS, not Vercel. The deploy script sends deploy manifests over SSH, excludes `.git`, `node_modules`, `.next`, `.env*`, and `.secrets`, then updates only the isolated `valemuito` Compose project on `127.0.0.1:3008` by pulling the published GHCR image.

Public frontend URL: [https://vale-muito.cherihub.cloud](https://vale-muito.cherihub.cloud).

## Container Image

`.github/workflows/release-image.yml` builds the production Docker image and publishes it to GitHub Container Registry at `ghcr.io/cheri-hub/vale-muito`.

The workflow runs when:

- A version tag such as `v1.0.0` is pushed.
- A GitHub Release is published.
- It is started manually with `workflow_dispatch` from the Actions tab.

Expected tags:

- `latest` for stable releases and manual runs.
- `<release-tag>` for published GitHub Releases such as `v1.0.0`.
- `sha-<commit>` for traceability.

Example pull:

```bash
docker pull ghcr.io/cheri-hub/vale-muito:latest
```

If the package is private, authenticate first:

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
docker pull ghcr.io/cheri-hub/vale-muito:latest
```

To deploy a released image to the VPS:

```powershell
.\vps\deploy.ps1 -ImageTag v1.0.0
```

```powershell
.\vps\deploy.ps1
```

Nginx is not changed by the deploy script. Review `docs/vps-deploy.md` before adding a new Nginx site based on `vps/nginx-valemuito.example.conf`.

## Supabase Setup

Create `.env.local` with public Supabase browser values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NOMINATIM_USER_AGENT="ValeMuito/0.1 (your-contact@example.com)"
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_TRUST_PROXY_HEADERS=true
RATE_LIMIT_REDIS_FAILURE_MODE=deny
```

`NOMINATIM_USER_AGENT` is optional in local development, but recommended for production geocoding requests through OpenStreetMap Nominatim.

Rate limiting uses Upstash Redis REST over HTTPS when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Vercel KV is also supported through `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without those variables, the app falls back to an in-memory limiter for local development only.

Set `RATE_LIMIT_TRUST_PROXY_HEADERS=true` only when your VPS reverse proxy, CDN, or load balancer strips untrusted incoming IP headers and sets `x-forwarded-for`, `x-real-ip`, or `cf-connecting-ip` itself. Leave `RATE_LIMIT_REDIS_FAILURE_MODE` unset or set to `deny` for fail-closed production behavior; set it to `memory` only if you intentionally prefer temporary per-instance fallback during Redis outages.

Then apply `supabase/migrations/001_initial_schema.sql` and `supabase/seed.sql` in your Supabase project. Never commit real keys or `.secrets`.

`npm run supabase:types` regenerates `src/lib/supabase/database.types.ts` from a local Supabase instance or from `SUPABASE_PROJECT_ID` when set.

More details live in `docs/supabase-setup.md` and `docs/launch-checklist.md`.
