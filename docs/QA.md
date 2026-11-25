# Wedding invitation review — 25 November 2026

The earlier presentation fixes were merged in PR #1. This branch adds the requested entrance, event information and single-guest RSVP implementation.

| Area | Verified result |
| --- | --- |
| Opening | Staggered fades and typed names; a static silk background and the existing scroll sequence. Layout is reserved while text types. Reduced motion shows the complete content immediately. |
| Envelope | Original layers and ten-second opening retained, with the card masked until the flap is open. |
| Programme | Six proposed stages, no invented times, clearly marked provisional. |
| Dress code | Men wear suits and ties; gowns or midi dresses suggested for ladies and marked unconfirmed. |
| Etiquette | One named guest, considerate arrival, silent phones and following venue guidance. No invented age, alcohol or gift rules. |
| RSVP | Accept, decline, dietary request and update flows tested in Chromium against local PostgreSQL; a saved decline was retrieved after a browser reload. |
| One guest | No plus-one or quantity controls. Database allocation is fixed at 1; response count is generated as 1 for acceptance or 0 for decline; repeated/concurrent writes retain one response. |
| Access | Anonymous and ordinary signed-in roles cannot read the RSVP tables or call its RPCs. Invalid, revoked and expired invitations fail. |
| Failure handling | Missing live configuration shows an unavailable state. Origin, input, extra guests, errors and rate limits are checked. No localStorage persistence or false success. |
| Layout | 320, 390, 430, 768 and 1024px frames and 1363px desktop checked. No horizontal overflow; 320px form, 390px form and desktop sections inspected. |
| Checks | 13 tests, TypeScript and Vite build pass. PGlite is used only for tests/development and is absent from the guest bundle. |

The development fixture uses an in-memory PostgreSQL database and the same RSVP handler/SQL as production. Its banner says responses are local tests. It is excluded from the production build. Reduced motion is simulated through media-query responses; physical Android, Safari and WhatsApp tests are still outstanding.

## Activation still required

No wedding-specific Supabase project was identified. No hosted schema, credentials, guest list or live invitation has been created. The SQL is ready for review, and the environment/invitation setup is documented in `RSVP.md`. A deployed end-to-end save and advisors check must pass after the project is selected, approved SQL is applied and server credentials are configured.

The original `AGENTS.md` requires explicit approval for migrations and production changes. This branch is not merged.

## Remaining content and functionality

The final programme, ceremony time, ladies’ styling, RSVP deadline, relationship story and approved photos remain pending. The committee dashboard, CMS and exports are not implemented. The content requested here is centralized in `src/eventDetails.ts` for replacement when confirmed.

## Performance

Original PNGs are retained. Initial WebP artwork is 739,062 bytes; JavaScript is about 165 kB gzipped, CSS about 6 kB. This is an estimated initial transfer below 1 MB, not a measured 4G or Lighthouse claim. Storybook artwork is loaded later.
