# Architecture

React 19, TypeScript, Vite, GSAP and Motion render one wedding invitation on Vercel. `/` contains the introduction, layered envelope, editorial story/gallery, original storybook, event guidance and direct RSVP. `/admin` lazy-loads a separate organiser interface.

The browser calls same-origin Node functions and receives no Supabase keys. Server helpers live in `server/`; input, CSV and PDF helpers live in `shared/`.

| Route | Access and responsibility |
| --- | --- |
| `/api/rsvp` GET | Issues opaque edit receipt; returns only that browser’s response and availability. |
| `/api/rsvp` POST | Validates origin/input/rate, saves one/two names using the receipt hash. |
| `/api/admin` GET | Verifies signed organiser session; returns guest list and story draft. |
| `/api/admin` POST | Rate-limited login, sign-out, or authenticated story save. |
| `/api/photo` POST | Authenticated binary photo upload to private Storage. |
| `/api/story` GET | Published story and temporary signed image URLs only. |

The new schema keeps `wedding_guest_responses` separate from legacy `wedding_invitations` and `wedding_rsvps`. A unique receipt hash authorises updates; normalized email uniqueness prevents duplicate responses. PostgreSQL generates 0/1/2 counts. All wedding tables have RLS and no public grants/policies; all RPCs are invoker/service-only. HMAC IP buckets use the existing attempts table. Previous data is preserved; the current live legacy tables had no records when checked.

`wedding_story` holds one draft/published story and ordered photo metadata. Bytes stay in the private `wedding-assets/story/` folder, never Git. The guest endpoint signs published images for one hour. The current repository contains decorative artwork, a licensed PDF font and a general invitation PDF; it contains no couple photos or guest list.

General PDF downloads use the static A5 file, without loading a PDF generator. Organiser personalised PDFs dynamically import pdf-lib, fontkit and qrcode in the browser, using a subset embedded font and the original monogram. Names stay local to the organiser; both PDFs link to the same canonical invitation. The code throws an explanatory error for names outside the embedded font’s glyph coverage instead of silently replacing characters.

Programme, dress and etiquette remain centralized in `src/eventDetails.ts`; they do not require schema edits. PGlite and in-memory Storage adapters serve tests and opt-in local QA only. Hosted Storage, organiser credentials, physical iOS/Android/WhatsApp testing and post-merge live verification remain release checks.
