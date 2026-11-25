# Architecture

React, TypeScript, Vite, GSAP and Motion render a single-wedding invitation on Vercel. `/` shows the scroll introduction; `/#invite=<opaque-token>` is the preferred personal link. `/invite/:token` remains supported, with no-referrer protection. `/api/rsvp` is the same-origin Node function.

## RSVP

The browser receives no database keys. The Node handler validates origin and input, applies a database-backed rate limit, hashes the 32-byte opaque invitation token and invokes server-only Supabase/PostgREST functions.

The reviewed schema has three tables: `wedding_invitations`, `wedding_rsvps`, and `wedding_rsvp_attempts`. RLS is enabled, and `anon`/`authenticated` grants are revoked. RPCs use security-invoker and are executable only by `service_role`.

One invitation is one named guest. Allocation is constrained to 1; RSVP count is a generated 0/1 column. A unique primary key and transactional upsert prevent repeated or concurrent submissions from adding attendance. Invites can be revoked or expired. No RSVP deadline is invented.

`src/eventDetails.ts` contains programme, dress and etiquette copy. No CMS schema is needed for those edits. `scripts/create-invitation.mjs` issues one private link at a time after storage is approved/configured; it has not been run live.

## Development and pending work

`server/test-db.mjs` runs the same schema in PGlite for tests and the opt-in development fixture. It is not imported by the production endpoint. `RSVP_QA_MODE` is development-only.

Live Supabase configuration, deployment validation, committee authentication, dashboard, CMS and reporting are pending. No guest list, couple photos, live tokens or secrets are committed.
