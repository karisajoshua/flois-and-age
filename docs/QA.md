# Direct RSVP and dashboard review — 25 November 2026

This branch replaces the code-gated guest flow after PR #2. No new hosted migration or production deployment has been made.

| Area | Evidence |
| --- | --- |
| Direct RSVP | Code-free form accepts one name or an optional partner; browser round trips against local PostgreSQL confirm two places. |
| Updates | Accept/decline and reopening the same browser were verified. Browser QA caught extra read-only count data being copied into the form; hydration now selects only editable fields, and the reopen/update flow passed. |
| Database | PGlite applies both real migrations; repeated/concurrent saves retain one row, counts are generated, extra guests are rejected, and another browser cannot overwrite/read a reply using email alone. |
| Access | Tests deny anon/authenticated table reads and RPC execution. Dashboard requires a signed, expiring, HttpOnly session; incorrect passwords, invalid origins, expired/tampered cookies and rate limiting are checked. |
| Dashboard | Browser verified both names on the same row, accepted/declined totals, empty state and story editor. Search/filter and CSV logic are implemented; CSV quoting and formula neutralization are tested. |
| Story | Draft/public separation and photo metadata validation tested. Story text was saved/published through the browser against local PostgreSQL. Actual couple copy and photos are not supplied. |
| Uploads | Server tests verify authenticated upload, MIME/signature/3 MB limits, private bucket configuration, signed URLs and published image metadata with an in-memory Storage adapter. Browser file-chooser verification was interrupted by an environment/browser restart. Hosted Storage still requires release verification. |
| PDF | One A5 page rendered and visually checked with Poppler; embedded original emblem and font, confirmed names/date/venue, exact clickable URL verified. The rendered QR code was decoded independently and matches the canonical invitation URL. |
| Responsive | New RSVP inspected at 390px and 320px with no horizontal overflow; dashboard inspected at 768px. Original invitation/envelope/storybook responsiveness was previously checked at 320/390/430/768/1024px and desktop. Physical Android/iOS/WhatsApp testing remains outstanding. |
| Build | 18 automated tests, TypeScript and Vite build pass. No lint script exists. |

The original static silk background, typed entrance, slow layered envelope and storybook remain. Reduced motion is supported. Programme and ladies’ styling remain clearly provisional. No ceremony time or deadline has been invented.

General invitation PDF download is static and requires no generator download. The organiser UI and personalised PDF generator are lazy-loaded. The large PDF/fontkit chunk is loaded only for personalised downloads. Initial invitation artwork remains 739,062 bytes; no new measured 4G or Lighthouse claim is made.

The existing live wedding database was read-only checked: zero invitations, zero replies, and no conflicting wedding-assets bucket. The previous single-guest migration is active; only the new additive migration requires approval. See `DEPLOYMENT.md` for the exact project, hosted migration-history difference, organiser-password setup and ordered release checks.

Automatic introduction update: the initial action-choice buttons are removed. The title holds for 7.5 seconds, then the existing scroll-driven scenes advance over 24 seconds and stop at the envelope. Touch/wheel/navigation keys cancel automatic scrolling; hidden tabs pause it. Reduced motion exposes the first page and envelope in natural flow with no automatic motion. The envelope remains click-to-open.

Browser verification for automatic entrance passed at 390px: no initial choice buttons, automatic progression to the envelope, click-to-open reveal, reduced-motion first/envelope pages, and keyboard/manual takeover. Background-tab throttling was resolved by focusing the correct test tab.
