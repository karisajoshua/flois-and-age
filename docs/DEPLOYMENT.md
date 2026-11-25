# Vercel deployment

Use Vite, root `.`, Node 22.x, `npm ci`, `npm run build`, output `dist`. `/api/rsvp.mjs` is a Node server function with a 30-second limit. Helpers live in `server/` and `shared/`. Vite builds only `index.html`; `qa/` and its local PostgreSQL adapter are not guest assets.

No variables are needed for the presentation. Optional `VITE_WEDDING_MUSIC_URL` must be authorized music and plays only on request.

RSVP requires a selected Supabase project, the reviewed migration and server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (legacy `SUPABASE_SERVICE_ROLE_KEY` is supported). Never prefix secrets with `VITE_`. Set `RSVP_ALLOWED_ORIGIN` to the production origin; Vercel's current deployment and branch URLs are accepted for previews. `RSVP_RATE_LIMIT_SECRET` is optional; otherwise the server key signs rate-limit buckets. See `RSVP.md`.

The countdown uses Africa/Nairobi calendar days. The calendar is all-day, and no ceremony time is invented.

No live migration or production change has been made in this branch. Obtain approval before applying SQL or merging to main.
