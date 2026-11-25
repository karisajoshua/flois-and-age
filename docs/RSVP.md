# One guest per invitation

The form, Vercel function and SQL are implemented and tested locally. Live storage is not configured. No hosted database has been changed.

## Setup after approval

1. Select the Supabase project dedicated to this wedding. None was identifiable in the connected accounts; do not reuse another application's database without approval.
2. Review and apply `supabase/migrations/20261125074252_single_guest_rsvp.sql` to that project.
3. Add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` securely as server-only Vercel environment variables. A legacy service-role JWT can use `SUPABASE_SERVICE_ROLE_KEY` instead. Never add either key with a `VITE_` prefix, send it to the browser, or commit it.
4. Set `RSVP_ALLOWED_ORIGIN` to the production origin. Vercel's automatic deployment and branch URLs are also accepted. Optionally set a random `RSVP_RATE_LIMIT_SECRET`; otherwise the server key supplies the HMAC secret.
5. Deploy the branch and perform an approved test invitation round trip. Verify anonymous table access is denied and inspect Supabase advisors.
6. Issue a separate private invitation link for each named guest. No guest list or shared live invitation code is included in this repository.

To create one invitation, provide a private JSON object with a `name` property on stdin to `node scripts/create-invitation.mjs`, with the server environment loaded. The script writes one invitation and prints its link. It fixes allocation at 1, generates a random 32-byte token and stores only its SHA-256 hash. Keep the output private; never commit names or links. The script has not been run against a live database.

## Guest behaviour

Guests open `/#invite=<token>` or paste their personal link/code in the RSVP section. They can accept or decline, enter their name and email, optionally add dietary requests, and later update the same response. No plus-one, guest-count or attendee-list controls exist.

An acceptance is 1 guest; a decline is 0. Each response's primary key is its invitation ID. PostgreSQL generates the count, so a request cannot set it to 2. Repeating a submission updates the same row. Invalid, expired and revoked tokens are rejected. The RSVP deadline is not invented; invitations remain active until explicitly revoked or assigned an expiry.

## Access and data

The browser calls the same-origin `/api/rsvp` function. The function validates origin, size and input, hashes the token, rate-limits requests, and calls server-only RPCs. All three tables have RLS enabled, no public policies, and grants revoked from `anon` and `authenticated`. RPCs are security-invoker and executable only by `service_role`. No public guest list or direct browser database access exists.

Responses are never saved to localStorage. Success is shown only after the server confirms a database save. Missing configuration and failed writes show an unavailable/error state. Responses are not emailed automatically.

Rate limiting allows 30 requests per 15-minute window using an HMAC of Vercel's client address; raw IP addresses are not retained. Old buckets are removed after a day. No tokens, email addresses or dietary details are logged by application code. Database access is limited to the organisers' project and server credentials. Organisers should remove guest data after it is no longer needed.

## Local verification

`npm test` uses PGlite, an in-memory PostgreSQL engine, to apply the SQL and exercise API persistence, retries, declines, concurrency, one-guest constraints and denied anonymous access.

For browser QA, set `RSVP_QA_MODE=1` in ignored `.env.local` and run `npm run dev`. `/qa/rsvp.html` labels itself as a local test and sends requests to the same handler backed by a local test database. The fixture uses `A` repeated 43 times for Demo Guest. The responsive fixture has an RSVP test button. Test HTML, PGlite and development middleware are excluded from the production browser bundle. Ordinary `/` never uses the test database.
