# Development instructions

- Deliver one wedding first. Do not add billing, subscriptions or multi-tenancy.
- Preserve the spelling Flois & Åge, date 9 January 2027, and Glee Hotel, Nairobi. Use Africa/Nairobi timezone; do not invent the ceremony time.
- Prioritize mobile WhatsApp browsers, Android and iOS. No conventional navigation-heavy guest interface; provide accessible direct RSVP and directions shortcuts.
- Use layered assets and progressive enhancement. Support reduced motion, keyboard navigation, readable contrast, optional audio and skip controls.
- Never commit secrets, guest lists or private photos. Never expose service-role credentials to clients. Validate RSVP tokens, allocations and writes server-side; deny public table access with RLS.
- Do not deploy database migrations or production changes without explicit approval. Document schema changes and environment requirements.
- Use focused commits, reviewable branches after initialization, and verify lint, type checks, build and tests when available. Report unverified behavior and blockers.
- Do not fabricate couple photos, relationship details or wedding programme as factual content.
