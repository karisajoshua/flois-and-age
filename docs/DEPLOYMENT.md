# Vercel deployment

Use Vite, root directory `.`, Node 22.x, `npm ci`, `npm run build`, and output `dist`. The lockfile is committed. No environment variables are required for the invitation preview. Optional `VITE_WEDDING_MUSIC_URL` must point to authorized audio; music requires a user action.

The countdown counts calendar days in Africa/Nairobi. The calendar file is an all-day event; neither asserts a ceremony time.

Invitation token routes are reserved, not authenticated. RSVP and admin are not implemented. No database migrations are included. Production changes require explicit approval under AGENTS.md. A review branch/PR can be deployed as a preview before that approval.
