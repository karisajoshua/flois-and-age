# Invitation quality review — 25 November 2026

Reviewed main at `73a576b` against the project requirements and the requested refinements. This branch corrects the existing guest presentation. It does not complete the planned RSVP product.

## Corrections and validation

| Requirement | Result |
| --- | --- |
| Static background; scroll controls the text sequence | Fixed silk layer stays in the viewport; a scrubbed GSAP sequence fades between five scenes. No timed auto-advance. |
| Larger first-screen F & Å and more writing | Original monogram enlarged; names, wedding date, welcome and venue included. |
| Envelope appears after the introduction | Last scroll scene only; hidden scenes are inert and excluded from the accessibility tree. |
| Original envelope artwork | Original flap, lining, pocket, body and seal used together; no switch between differently sized closed references and layers. Original PNGs preserved. |
| Slow, smooth opening | About ten seconds: seal, flap, pause, extraction, envelope fade and invitation reveal. Full desktop and 390px mobile openings observed in Chromium. |
| Card does not overlap before extraction | Hidden until flap reaches -180 degrees; keyboard opening confirmed this in the mobile layout. Pocket covers extraction; lower mask hides the card edge. |
| Skip and replay | Skip introduction, skip during opening, replay after reveal, and heading focus verified in the browser. |
| Story section | Original cover/spread; two populated celebration chapters. Original spread divided into readable page artwork for small screens. Cover, forward/back controls and end-state disabled button checked. No invented relationship timeline. |
| Responsive layout | Chromium layout frames at 320, 390, 430, 768 and 1024px; desktop at 1363px. No horizontal document overflow in measured frames. Invitation/book visually inspected at 320/390px and desktop. |
| Reduced motion | Matched media queries in a local test fixture; envelope opens immediately and book controls remain usable without waiting for animation. Physical OS setting not exercised. |
| Wedding date/time | Calendar-day countdown uses Africa/Nairobi. Calendar download is 9 January 2027, all-day, with exclusive next-day end. No ceremony time asserted. |
| Music | Opt-in control only when an authorized URL is configured. Playback is unverified because no licensed track is supplied. |
| Build and tests | TypeScript and Vite production build pass. Four Node tests pass: Nairobi day boundaries, calendar event, directions and artwork references/budget. Lockfile clean install succeeds. |

The browser preview was tested on the branch, not on a new production deployment. Physical Android, iOS Safari and WhatsApp browser tests remain outstanding. Browser emulation/layout frames do not substitute for these devices.

The development-only `/qa/responsive.html` fixture provides selectable layout frames; its reduced-motion option matches the media query before the app loads. These QA HTML pages are not included in the Vite production build.

## Performance

Introductory WebP artwork totals **739,062 bytes**, with about 160.5 kB gzipped production JavaScript and 4.45 kB gzipped CSS. This puts estimated initial transfer below 1 MB, excluding response overhead. Storybook artwork loads after entering the invitation. No measured 4G load-time or Lighthouse claim is made.

## Remaining project scope

- Token validation, personalised greetings, allocations, secure RSVP writes, duplicate prevention, response updates and confirmation are not implemented.
- Admin authentication, guest management, response/headcount statistics, filtering, manual entry, exports and CMS are not implemented.
- The couple's approved relationship story and photos are pending; no fabricated gallery or milestones are published.
- Ceremony time, room/garden, programme, dress code, RSVP deadline and contacts remain unconfirmed.
- No database migrations or production changes have been made. AGENTS.md requires explicit approval before production changes.

These remaining items prevent declaring the entire original project complete or ready for guest distribution.
