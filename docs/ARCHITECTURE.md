# Architecture

## Application
Vite + React + TypeScript SPA hosted on Vercel. Proposed routes: / (invitation entry), /invite/:token (personalised invitation), /admin/login and /admin (protected dashboard). Configure SPA fallback for deep links. Lazy-load nonessential chapters and admin modules.

## Backend
Supabase PostgreSQL, Auth for administrators, Storage for approved media and Realtime for authorized dashboard updates. Proposed entities: wedding_settings, guests, invitations, rsvps, rsvp_attendees, guest_groups, wedding_programme, story_milestones, gallery, content_sections, guest_messages, admin_profiles, check_ins. Final schema to be reviewed before migrations.

## RSVP
Use cryptographically random opaque invitation tokens, preferably hashed at rest. A server-side endpoint validates token, expiry, deadline and guest allocation; transactionally upsert response and attendees, enforce uniqueness and prevent overbooking. Support changes until deadline. Rate-limit requests. Avoid token leakage in logs/referrers. No public guest list or direct unrestricted writes. Admin access requires verified role and RLS policies.

## Reporting
Track invitation response status separately from confirmed headcount; count only accepted attendees. Export authorized CSV/Excel and dietary totals. Check-in is secondary scope.

## Maps
Use Google Maps directions URL with verified Glee Hotel destination and omitted origin for current-location navigation. Provide address copy and Apple Maps alternative. Embedded map provider to be selected; do not store guest location.

## Configuration
Public Supabase URL and publishable key only in Vite environment. Server secrets in server-side environment. No infrastructure provisioned yet.
