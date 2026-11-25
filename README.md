# Flois & Åge — Wedding Invitation

A mobile-first wedding invitation for **Saturday, 9 January 2027 · Glee Hotel, Nairobi, Kenya**.

## Running locally

Use Node.js 22 LTS and npm:

```sh
npm ci
npm run dev
```

`npm run build` checks TypeScript and creates the production build in `dist`. `npm test` checks Nairobi calendar boundaries, the calendar download, venue directions and artwork availability/budget. No lint script is configured.

## Current experience

A large original F & Å monogram introduces five scroll-controlled scenes over a fixed silk background. Guests open a layered envelope: the seal lifts, the flap opens completely, then the masked card slides out. Skip controls remain available during opening; reduced motion bypasses the opening animation. The invitation includes venue directions, a Nairobi calendar-day countdown and an all-day calendar download. The original gold storybook displays celebration copy and the confirmed wedding details, with readable stacked pages on narrow screens. Replay restarts the experience. Music is optional and plays only after pressing its control when an authorized `VITE_WEDDING_MUSIC_URL` is configured.

The original PNG artwork is preserved; the app serves resized WebP copies. Storybook images load after entering the invitation.

## Still to be implemented

Personalised/token-based invitations, secure RSVP, guest allocations, response editing and the committee dashboard are planned, not working features. No Supabase client or database has been configured. Do not distribute the site as a complete RSVP system.

The couple's relationship story, approved photos, ceremony time, programme, dress code, RSVP deadline, guest list and contacts remain pending. The storybook makes no claims about relationship milestones. The countdown and calendar identify the date without asserting a ceremony time.

## Documentation

- [Requirements](docs/REQUIREMENTS.md)
- [Quality review](docs/QA.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Agent instructions](AGENTS.md)
