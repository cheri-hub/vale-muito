# Supabase Setup

Vale Muito runs without Supabase by falling back to local seed data. To enable the real backend, configure the public browser keys in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SITE_URL=https://vale-muito.cherihub.cloud
NEXT_PUBLIC_SITE_URL=https://vale-muito.cherihub.cloud
```

Do not commit `.env.local` or `.secrets`. The repository ignores `.secrets` because it can contain project passwords and connection strings.

## Database

Apply these files in order in your Supabase project:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/seed.sql`

The schema enables PostGIS, creates profiles, recommendations, photos, tags, reports, admin audit logs, RLS policies, and the report-count trigger.

The migration also creates the public `recommendation-photos` Storage bucket and policies that let users upload only into their own folder. When photo rows are deleted, a database trigger removes the matching object metadata from Storage so recommendation deletes do not leave dangling public files.

## Type Generation

After connecting a local or remote Supabase project, regenerate official TypeScript types with:

```bash
npm run supabase:types
```

By default the script uses `supabase gen types --local`. To generate from a hosted project, set `SUPABASE_PROJECT_ID` in your shell before running the command.

## Auth

The app uses magic-link email auth at `/login` and handles callbacks at `/auth/callback`. After the first login, create or update the matching `profiles` row. Set `role = 'admin'` for accounts that should access `/admin/moderation`.

In production, set `SITE_URL` to the public frontend origin so server-side callback redirects resolve to the real domain instead of the internal container host. `NEXT_PUBLIC_SITE_URL` can use the same value for browser-side features. Only fall back to forwarded proxy headers when `RATE_LIMIT_TRUST_PROXY_HEADERS=true` and your reverse proxy overwrites trusted `X-Forwarded-*` headers.

## Current Limits

- Photo upload is wired for Supabase mode and remains a placeholder in offline mode.
- Photos are optional by product policy; recommendations without uploads use the app fallback image.
- Recommendation tags are persisted in `tags` and `recommendation_tags` in Supabase mode.
- Regenerate `src/lib/supabase/database.types.ts` with `npm run supabase:types` after schema changes.
