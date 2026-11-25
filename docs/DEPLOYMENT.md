# Release sequence

Vercel uses Vite, Node 22.x, root `.`, `npm ci`, `npm run build`, output `dist`. `/admin` rewrites to the SPA. `/api/rsvp`, `/api/admin`, `/api/story` and `/api/photo` use Node Web Request handlers, 30-second limits and server-only credentials. QA HTML and development adapters are not deployed.

The existing production project already has `SUPABASE_URL` and a server-only Supabase key and has passed a live single-guest RSVP round trip. The Vercel connector currently does not return this project; do not create a duplicate project or replace existing credentials.

Release approved by the user on 25 November 2026:

1. Completed: `supabase/migrations/20261125144643_direct_couple_rsvp.sql` was applied to project `muzrleafcjwfghdlftvs`, with hosted history version `20261125195015`. The original migration remains under hosted version `20261125123936`. Do not replay either.
2. Add `WEDDING_ADMIN_PASSWORD` securely in Vercel (at least 16 characters, server-only, no `VITE_` prefix). Retain the existing `SUPABASE_URL` and `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`. Never send credentials in chat or commit them.
3. Keep `RSVP_ALLOWED_ORIGIN=https://flois-and-age.vercel.app`. Optional `RSVP_RATE_LIMIT_SECRET` separates HMAC buckets from the server key. Exact Vercel preview and branch origins are accepted automatically. Custom deployment aliases must be explicitly configured.
4. Merge the reviewed PR, deploy, then test accepting for one/two, reload/update, decline, duplicate-email protection, the real `/admin` session and Storage upload/signing/publishing. Check anonymous grants and Supabase advisors. Delete precisely scoped fictional test responses after verification.
5. Add the approved couple story/photos in the dashboard. Confirm the programme, ceremony time, ladies’ styling and deadline independently before editing event copy.

`RSVP_QA_MODE` must never be set on deployments. The general PDF is committed at `/assets/invitations/flois-and-age-invitation.pdf`; run `node scripts/build-invitation-pdf.mjs` after changing confirmed invitation details. Personalised PDFs load their generator only when requested in the dashboard. Optional authorised music is the only `VITE_` setting.

The additive migration has been applied with user approval. Secure organiser-password setup and post-deployment verification remain release steps. Applying the additive schema before the UI is safe: old handlers still work. To roll back the UI, redeploy the previous commit and retain the additive tables; do not destroy guest data. Returning to the old UI restores its code requirement and hides new direct responses until the new UI is restored.
