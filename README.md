# Flois & Åge — Wedding Invitation

A private-purpose, mobile-first digital wedding invitation and RSVP management experience for a single wedding.

**Wedding:** Saturday, 9 January 2027 · Glee Hotel, Nairobi, Kenya (EAT).

## Scope
An animated envelope reveal, personalised invitation, countdown, interactive storybook, wedding details, venue directions, gallery, RSVP and thank-you experience. A secure committee dashboard manages invitations, attendance, catering and exports. No commercial platform, payments or multi-tenancy.

## Planned stack
React, TypeScript, Vite, Tailwind CSS, GSAP, Motion, Supabase (PostgreSQL, Auth, Storage, Realtime), Vercel, Google Maps directions and Playwright.

## Setup (after application scaffolding)
Use Node.js 22 LTS and npm. Run `npm ci` once a lockfile exists, copy `.env.example` to `.env.local`, configure public Supabase credentials, then run `npm run dev`. Planned checks: `npm run lint`, `npm run build`, `npm run test`. These commands are not available yet.

## Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Requirements](docs/REQUIREMENTS.md)
- [Roadmap](docs/ROADMAP.md)
- [Agent instructions](AGENTS.md)

## Status
Documentation only. Application, database and deployment are not yet configured. Wedding time, specific venue room, RSVP deadline, story, guest list and media remain to be supplied. Do not commit personal guest information or secrets. Repository visibility should be private.
