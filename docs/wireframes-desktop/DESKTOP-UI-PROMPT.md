# Cursor prompt: convert Introvert Co-pilot to desktop-first

Paste everything below the line into Cursor. Wireframes: `wireframes-desktop/01-home.png` to `10-debrief.png` (1440x900). Branch `feat/desktop-shell`, one small PR for Qodo.

---

Convert this Next.js 15 App Router + TypeScript + Tailwind app from mobile-first to desktop-first. Target 1440x900, responsive down to tablet (768px). Mobile stays secondary: below `md` the sidebar collapses to a top drawer. Remove `max-w-[420px] mx-auto` and the BottomNav everywhere; use `max-w-none` full-width layouts. Match the PNG wireframes in `wireframes-desktop/`. Keep all existing API routes and data logic; this PR is layout and UI only.

## Design rules (no generic AI look)
- Typeface: Inter Tight for UI (via `next/font/google`), IBM Plex Mono for Cypher and tool calls. No system font fallback as the primary.
- Palette: neutral grays (zinc-50 to zinc-900) plus ONE accent color, `#0F766E` (teal-700), used only for primary buttons, the active nav item, the "me" graph node and highlighted graph paths. No purple, no gradients, no glow, no glassmorphism.
- Icons: `lucide-react` line icons at 16px. No emoji anywhere.
- Cards: white, 1px zinc-200 border, `rounded-lg`, no heavy shadows. Section labels small uppercase zinc-500 with tracking.
- Copy: short, plain, no em dashes, no "Unlock" or "Supercharge" style words.
- Trust labels everywhere data appears: source chips (`text-[10px]` bordered), confidence badges HIGH / MED / LOW, dashed `GAP` badge when data is missing, and `fetched_at` timestamps in PT.

## App shell (app/layout.tsx)
- `components/AppShell.tsx`: CSS grid `grid-cols-[224px_1fr]`, full viewport height, `h-screen overflow-hidden`; main column scrolls (`overflow-y-auto`).
- `components/Sidebar.tsx`: app name "Introvert Co-pilot" plus tagline, nav links with lucide icons: Home `/`, Know yourself `/me`, Event feed `/feed`, Who to meet `/meet`, Agent chat `/chat`, Notes `/notes`, Follow-ups `/followups`, Debrief `/debrief`. Active state via `usePathname()`. Footer: "Powered by Bright Data, FalkorDB, OpenAI, TrueForge. Reviewed by Qodo."
- `components/TopBar.tsx` (h-14, bottom border): event switcher select showing "GitHub Universe 2026" with "Oct 28-29, Fort Mason Center, SF", a dashed pill "Open demo, no login", page title centered, and a "Reset demo" button that calls the existing reset route and clears the sid session.
- Below `md`: sidebar becomes a slide-over opened from a menu button in TopBar.

## Screen layouts (each page uses a CSS grid inside `p-6 gap-5`)
1. **Home `/`**: `grid-cols-[400px_1fr]`. Left: my card (photo, name, one-line intro, event goal, large LinkedIn QR via `qrcode` at 230px, buttons "Show QR fullscreen" (full-screen modal, white bg, QR at 70vh) and "Copy link"). Right column stack: Today's plan (4 time blocks in a row + social battery bar), Top 5 to meet (rows with photo, name, title, company, why line, "Open card"), Pre-event brief card with "Read brief".
2. **Know yourself `/me`**: `grid-cols-[520px_1fr]`. Left form: LinkedIn URL + "Scrape with Bright Data" + fetched_at, 5 questions (drains, energizes, goal, offering, topics), "Build my profile". Right: generated self-profile cards: social style, strengths chips, 15-second intro (Regenerate, Edit), safe topics, energy notes, sources with GAP.
3. **Event feed `/feed`**: `grid-cols-[1fr_320px]`. Top: URL input + "Load event", accent chip "Scraped live with Bright Data", speaker/session counts, fetched_at, live scrapes left. Filter chips row (Should meet, AI agents, MCP, Creator tools, Open source, Entertainment tech, Already met) + search. Grid `grid-cols-4 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2` of attendee cards (photo, name, title, company, one-line why-meet, 2 topic chips). Clicking a card selects it and fills the right preview drawer (photo, session, "why you two", topics, "Deep profile", "Add to my plan").
4. **Identity confirm**: modal (`max-w-3xl`, dimmed backdrop) over the feed with 3 candidate rows (photo, name, title/company, location, match note, HIGH/LOW confidence, "Yes, this one" / "Select"), plus "None of these" and the search fetched_at.
5. **Deep profile `/people/[id]`**: `grid-cols-[300px_1fr_340px]`. Left: identity, "Identity confirmed", session, sources list with dates, "Public sources only. Delete on request." Center: sections Communication style, Values and motivations, What they are working on now, How to pitch, Topics to avoid, each with confidence badge + source chips + GAP. Label "Not a psychological diagnosis". Right: talking points, opener, icebreaker from latest post (with date + source), exit line, Refresh button, last refreshed time.
6. **Who to meet `/meet`**: `grid-cols-[1fr_340px]`. Center: large graph canvas (react-force-graph-2d or a simple SVG layout) with ME node in accent, topic pills, people as photo circles, highlighted path to the selected person. Toggle chips: People, Topics, Hide already met. Bottom panel (h-44): the Cypher query that produced the ranking, row count, ms, Copy. Right: ranked list with score and the path as mono text.
7. **Agent chat `/chat`**: `grid-cols-[1fr_440px]`. Center: chat thread, quick chips (Next person, What do I owe, Prep me, Recap), input + Send. Right: "Memory used" panel with "FalkorDB memory" badge: tool calls, graph path as chips with edge labels, the Cypher run, chat memory count, "Open in graph view".
8. **Notes `/notes/[id]`**: `grid-cols-[1fr_420px]`. Left: person header (photo, name, title, met time/place, Open profile, Ask co-pilot), large notes editor with autosave time and "Extract and save to graph". Right: Extracted (cares about chips, I promised with due date, next step, they offered), rating 1 to 5, energy slider (Drained to Energized).
9. **Follow-ups `/followups`**: `grid-cols-[300px_1fr_280px]`. Left: draft list with status chips. Center: banner "Runs on TrueForge, approval required, sending disabled in demo", draft with recipient, subject, body, "Built from" line, Regenerate, Edit, Deny, Approve. Right: agent trace (tool calls ending in `request_approval() WAITING`) and reminders.
10. **Debrief `/debrief`**: 4 stat tiles in a row (People met, Promises owed, Follow-ups approved, Avg conversation). Then `grid-cols-[1fr_1fr_1.2fr]`: Who I met (with ratings), What I owe + Still to meet, Energy through the day line chart (recharts or SVG). Bottom: Self-insight card with dashed border and an "EXAMPLE" badge, text noting it uses cached example data.

## Responsive
- `lg` and up: layouts above. `md`: 3-column screens drop the right column below the center; feed grid goes to 2 to 3 columns. Below `md`: single column, sidebar as drawer. No horizontal scroll at 768px.

## Done when
- All 10 routes render at 1440x900 with no page-level scroll on Home, Who to meet and Agent chat (inner panels scroll).
- `npm run build` passes, no TypeScript errors, no emoji, no em dashes in copy.
