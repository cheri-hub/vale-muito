# Launch Checklist

## Before Beta

- Configure `.env.local` with Supabase public URL and anon key.
- Configure Redis/Upstash/Vercel KV REST env vars for persistent rate limiting before public traffic.
- Configure the VPS reverse proxy to strip incoming IP headers before enabling `RATE_LIMIT_TRUST_PROXY_HEADERS=true`.
- Apply the database migration and seed SQL.
- Create at least one admin profile.
- Add real PWA icons to `public/` and update `public/manifest.webmanifest` if filenames change.
- Prepare a trusted initial recommendation seed for Piracicaba/SP.
- Keep photos optional for public submissions unless the editorial policy changes.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- Review the remaining `npm audit` moderate findings without using forced major upgrades blindly.

## Manual Smoke Test

- Discover recommendations on `/`.
- Open a recommendation detail page.
- Share a recommendation link.
- Report a recommendation.
- Submit a new recommendation from `/recommend/new`.
- Sign in through `/login`.
- As admin, hide and restore a reported recommendation at `/admin/moderation`.
