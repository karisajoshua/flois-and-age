# Flois & Åge — Wedding Invitation

A mobile-first wedding invitation for **Saturday, 9 January 2027 · Glee Hotel, Nairobi, Kenya**.

## Development

Use Node 22 LTS: `npm ci`, `npm run dev`. `npm run build` checks TypeScript and builds the site; `npm test` runs 18 database, server, CSV, PDF and wedding-detail checks. No lint script is configured.

## Experience

The original F & Å monogram, scroll introduction, typed names, fixed silk background, ten-second layered envelope opening and gold storybook remain. After a 7.5-second opening, the introduction scrolls slowly to the envelope over 24 seconds. It stops there until the guest chooses Open invitation. Initial action-choice buttons are removed; RSVP and directions remain inside the invitation. Manual scrolling takes control, hidden tabs pause the automatic sequence, and reduced motion shows a stationary opening and envelope. Programme and ladies’ styling are provisional; no ceremony time or RSVP deadline is invented.

Guests RSVP directly with their name and email, accepting or declining. Couples can add one partner name, for a maximum of two named guests per response. Optional dietary and song requests follow the supplied form reference. A secure browser cookie permits later edits without invitation codes; email alone cannot overwrite another reply.

`/admin` is a password-protected organiser dashboard with both guest names, attendance totals, search/filter, CSV export, and general or personalised invitation PDF downloads. Its story editor publishes the couple’s own text and up to six photographs. The first image becomes the main portrait; the others form a responsive gallery with accessible enlargement.

`public/assets/story/` contains the optimized decorative artwork; private couple uploads stay outside Git in Supabase Storage. The supplied screenshot is an RSVP reference, not a couple photograph. Actual relationship details and photos have not been invented.

The downloadable A5 invitation includes the original emblem, confirmed wedding details, a clickable invitation URL and a QR code. `node scripts/build-invitation-pdf.mjs` rebuilds the general PDF. Personalised PDFs are generated only on demand in the dashboard; guest names are never placed in a public PDF or URL.

## Release status

The previous single-guest migration and RSVP saving were activated and tested on the live wedding database. This branch replaces that guest flow and adds a reviewed migration for direct replies and story content; the user approved release and the additive migration has now been applied. The live database contained zero invitations and zero replies when checked on 25 November 2026.

The new migration is active; configure a server-only organiser password for dashboard access. See [deployment](docs/DEPLOYMENT.md) and [RSVP/data](docs/RSVP.md). The couple’s real story, photos, final programme, ceremony time, ladies’ styling and RSVP deadline remain content inputs.

## Documentation

- [Requirements](docs/REQUIREMENTS.md)
- [Quality review](docs/QA.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Agent instructions](AGENTS.md)
