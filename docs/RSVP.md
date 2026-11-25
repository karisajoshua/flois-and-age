# Direct RSVP, couples and organiser access

## Guest flow

There is no invitation-code or lookup screen. Share `https://flois-and-age.vercel.app/` privately. Existing old invitation URLs also open the same direct form, with the old token ignored. Each response contains one main name and optionally one partner name; both accept or decline together. Acceptance counts 1 or 2 guests; decline counts 0. Dietary and song requests are optional and cleared on decline.

The server issues a random 32-byte receipt in a Secure/HttpOnly/SameSite=Lax cookie (Secure on HTTPS). Only its SHA-256 hash enters the database. Reopening this browser restores the response; repeated/concurrent saves update the same row. Clearing cookies or switching browsers loses edit access. A different browser using an existing email gets a conflict, without any disclosure of the existing names or requests. There is no email-based public lookup, email confirmation or automated email sending. Cookie-disabled browsers cannot reliably restore/edit replies.

A unique normalized email prevents duplicate replies. Names and counts are not trusted from the browser: server validation rejects third-guest/count fields, and PostgreSQL generates attendance counts. The form never reports success until the database confirms a save. No guest data goes to localStorage or application logs.

## Migration and current database

The wedding project is `muzrleafcjwfghdlftvs` (supabase-purple-drawer). The previous migration `single_guest_rsvp` is already live (hosted history version `20261125123936`; local source `20261125074252_single_guest_rsvp.sql`). Do not replay it blindly.

The user approved release and `20261125144643_direct_couple_rsvp.sql` was applied on 25 November 2026 (hosted history version `20261125195015`). Do not replay it. It adds `wedding_guest_responses`, `wedding_story` and service-only RPCs, plus the private `wedding-assets` storage bucket. It preserves all previous invitation/response tables and data. Live counts were zero on 25 November 2026. The dashboard shows new direct responses; it does not import legacy rows automatically.

All exposed wedding tables have RLS enabled, public/anon/authenticated grants revoked and no guest policies. Functions are security-invoker and executable only by service_role. `wedding_direct_lookup` is callable by the server only with the receipt hash. The dashboard RPC omits receipt hashes. Database-backed rate limits permit 30 POST attempts per 15 minutes per HMAC-address bucket, with a separate namespace for login attempts. Raw client IPs are not retained.

## Dashboard

`/admin` requires `WEDDING_ADMIN_PASSWORD`, server-only, unique and at least 16 characters. No default production password exists. Login compares fixed-length hashes with a timing-safe operation, then issues an HttpOnly signed session cookie lasting four hours. The signing material includes the server key and password. Changing either invalidates existing sessions; sign-out clears the browser cookie. The shared organiser password is intended for this single wedding, not a multi-user permission system.

The dashboard displays both names, replies, dietary/song requests and accurate guest totals; search/filter affects the display, while CSV exports all fetched responses. CSV cells are quoted and spreadsheet formula prefixes neutralized. Personalised PDFs stay in the organiser browser. There are no outbound invitations or email actions.

## Story and photos

Organisers can save a draft or publish their own story with up to six ordered photos and required captions. Only published content reaches guests. Uploaded JPG/PNG/WebP files are checked for type/signature and capped at 3 MB. The bucket is private; service-side signed URLs last one hour. No public upload policy or client database key is required. Sharing the invitation URL permits access to the published story and selected images, as requested.

Removing an image from the selection hides it after saving, but does not delete the underlying private upload. An already issued URL remains usable until expiry. Organisers can remove unused objects in Supabase Storage; photo deletion is deliberately not an automatic destructive dashboard action. Draft uploads that are never saved also remain private until cleaned up. Uploaded photo metadata is retained; use approved photos and strip location metadata before uploading when needed.

Until the actual story/photos are supplied, a decorative rose keepsake and honest welcome copy are displayed. No relationship milestones, couple portraits, ceremony time or deadline are fabricated.

## Local QA

`npm test` applies both SQL files in PGlite and exercises real server handlers/RPCs with anonymous-role checks. Storage HTTP calls use an in-memory object adapter; hosted Storage itself still requires release verification.

Set `RSVP_QA_MODE=1` in ignored `.env.local` for browser testing through `/qa/responsive.html`. The RSVP test calls the actual handler against local PostgreSQL. The demonstration dashboard button starts a local fixture session through the same login handler. It has no production credentials or data. This development-only middleware, its session route, HTML and PGlite are excluded from the deployed guest bundle and server functions. Ordinary `/` never uses the fixture.
