# PRD: Introvert Co-pilot
Patch the Conference hackathon (WeMakeDevs x Bright Data), Sat Oct 24 2026, Bright Data office, San Francisco. All times PT.
Version 1.0, written 11:15 AM PT for the WE MAKE DEVS CONTEST bot. This document is self-contained. Where it differs from older files in this package (BUILD-PLAN, tracks guide, dossier), this PRD wins.

Hard deadlines: feature freeze 4:30 PM, submit 5:15 PM, live demo about 5:30 PM.
Repo: https://github.com/solfinnai/introvert-copilot (public, `main` has one initial commit).
Local folder: `/Users/henryfinn/Developer/patch-hackathon/introvert-copilot` on Henry's Mac. `docs/` and `seed/` are unpacked there but NOT committed yet.
App port: 3001.

---

## 1. Summary and problem

**One line:** an open, no-login web app that helps introverts handle a conference: know yourself first, see who to meet and why, walk up with a sourced opener, take notes, approve a follow-up, and learn about yourself at the end of the day.

**Problem.** Conferences are built for extroverts. Introverts burn their social battery on small talk with the wrong people, freeze on the opener, forget what they promised, and never follow up. Existing tools (Luma, Brella, LinkedIn) list attendees but do not tell you who matters to you, why, what to say, or what you owe afterwards.

**Solution.** The app scrapes the conference (Bright Data), builds a profile of you and of the people worth meeting (Bright Data plus OpenAI), stores everyone, every topic and every meeting as a graph memory (FalkorDB), lets you ask a co-pilot agent anything about the event using that memory, and drafts approval-gated follow-ups (TrueForge with OpenAI). Every PR is reviewed by Qodo.

**Demo conference:** GitHub Universe 2026, Oct 28 to 29, Fort Mason Center, San Francisco. 183 speakers, 157 sessions, scraped live from its public catalog with Bright Data.

**Trust rules (non-negotiable, also a judging asset):**
- Public sources only. Every claim has a source link, a fetched_at time and a confidence (HIGH, MED, LOW). Missing data shows a dashed `GAP` badge. The model never fills gaps.
- The person profile is a "communication style read from public sources, not a psychological diagnosis".
- Never infer health, religion, politics, sexuality, ethnicity, race, family, age, disability or other protected traits.
- Delete any profile on request (button on the profile).
- Nothing is ever sent. Follow-ups are drafts that need Approve, and real sending is disabled in the public demo.

---

## 2. Users

| User | Need | Where in the app |
|---|---|---|
| Primary: introverted developer or founder at a conference (persona: Henry, AI builder; interests AI agents, anime IP, creator tools, entertainment tech) | Spend limited social energy on the right 3 to 5 people, have something real to say, remember promises | All screens |
| Hackathon judges (9: xAI, Philo, Northwest Bank, Adobe, Netflix, Simulithic, Meta, Microsoft, Agility Robotics) | See sponsor tech doing real work, live, in 3 minutes | Demo path, Cypher panel, Memory used panel, agent trace, fetched_at labels |
| Anonymous public visitor (open demo link) | Click around instantly without signing up | Cached GitHub Universe demo, per-visitor session |

---

## 3. Tracks and how each is won

All four tracks are allowed for one project. Lead the pitch with Bright Data. Every track requires a working demo live on stage.

| Track | Prize | Official judging criteria | How this app wins it | Must be visible in demo |
|---|---|---|---|---|
| **Bright Data** (lead) | $1,500 | Hard-to-get data at the core (fresh data a basic script cannot reliably reach); data quality (accurate, current, handles failures and site changes); usefulness around conferences; live demo | The event itself is scraped live: Web Unlocker fetches the RainFocus catalog JSON, SERP API finds each speaker's LinkedIn, the LinkedIn People Profiles dataset fills profiles, SERP plus Unlocker gather articles and talks for deep profiles. Several Bright Data products merged into one person record. Deterministic validator, GAP handling, cached fallback with banner | "Scraped live with Bright Data" chip, counts, fetched_at, live scrapes left, GAP badges, "Checked: N claims, M downgraded" |
| **FalkorDB** | iPhone Duos or cash (cash amount unconfirmed) | Graph at the core (multi-hop, memory, shared state); explainable answers; real conference problem; live demo | The graph is the agent's memory. "Who to meet" is a multi-hop Cypher ranking with a visible path. Saving a note writes a MET edge and the ranking changes live. Agent chat uses FalkorDB tools and shows the Cypher it ran | Graph canvas with highlighted path, Cypher panel with row count and ms, Memory used panel in chat, person dropping off the list after a note |
| **TrueForge with OpenAI** | $1,000 | Built on TrueForge (uses its tools, sandbox, skills or approvals); OpenAI does the heavy lifting; real conference problem; live demo | Follow-up agent (and, if GO, the chat agent) runs on TrueForge with tool calls and `require_approval_for_tools` on `send_followup`. OpenAI models drive all profiling, extraction and drafting | Banner "Runs on TrueForge, approval required", agent trace ending in `request_approval() WAITING`, TrueForge Sessions view in a second tab |
| **Qodo** | $500 | Qodo installed and reviewing real PRs all day; small, clear PRs with good descriptions; fixes for Qodo findings shown; clean repo | One PR per feature (about 11 PRs), each reviewed by the Qodo GitHub app, real findings fixed in follow-up commits | README "Qodo Code Review Evidence" with PR links, 2 screenshots of findings fixed |

Sponsor idea lists match this app: FalkorDB "networking agent that suggests who to meet and remembers who you've spoken to", TrueForge "follow-up agent that waits for approval before sending". The Bright Data idea list no longer names a LinkedIn scout, so confirm with Bright Data staff that a LinkedIn-based app is fine (section 18).

---
## 4. Features and acceptance criteria per screen

Desktop first: 1440x900, left sidebar (224px) plus top bar (h-14). Mobile is secondary (sidebar becomes a drawer below `md`). Wireframes: `wireframes-desktop/NN-*.png` (primary), HTML sources in `wireframes-desktop/html/`. Older mobile wireframes in `wireframes/` are reference only.

### Global shell (all screens)
- Sidebar: "Introvert Co-pilot" plus tagline. Nav with lucide icons: Home `/`, Know yourself `/me`, Event feed `/feed`, Who to meet `/meet`, Agent chat `/chat`, Notes `/notes`, Follow-ups `/followups`, Debrief `/debrief`. Footer: "Powered by Bright Data, FalkorDB, OpenAI, TrueForge. Reviewed by Qodo."
- Top bar: event switcher "GitHub Universe 2026, Oct 28-29, Fort Mason Center, SF", dashed pill "Open demo, no login", page title, "Reset demo" button.
- AC: no login anywhere; first visit works instantly with cached demo data; Reset demo clears this visitor's graph and re-seeds; no page-level scroll on Home, Who to meet and Agent chat at 1440x900.

### 4.1 Home `/` (`wireframes-desktop/01-home.png`)
Layout `grid-cols-[400px_1fr]`.
- Left: my card: photo, name, one-line intro, event goal, LinkedIn QR (230px, `qrcode` `toDataURL`), "Show QR fullscreen" (white modal, QR at 70vh, Esc closes), "Copy link".
- Right: Today's plan (4 time blocks built from GitHub Universe sessions of my top people, social battery bar, suggested break), Top 5 to meet (photo, name, title, company, why line from graph, "Open card"), Pre-event brief card ("Read brief" opens a 2-minute read: top 5 with why, opener, one talking point).
- AC: scanning the QR with a phone opens my LinkedIn; Top 5 comes from Cypher Q1, not hardcoded; brief renders under 2 s from cache; GAP badge if photo or intro missing.

### 4.2 Know yourself `/me` (`02-know-yourself.png`)
Layout `grid-cols-[520px_1fr]`.
- Left: LinkedIn URL plus "Scrape with Bright Data" (shows fetched_at), five questions: what drains you, what energizes you, your goal for this event, what you are offering, topics you love. "Build my profile" with step status (Scraping with Bright Data, Building profile, Saving to graph).
- Right: self profile cards: social style (summary, evidence, confidence), strengths chips, 15-second intro (Regenerate, Edit), safe topics, energy notes, sources with GAP.
- AC: Build finishes under 25 s with cached scrape; `(:Person {id:'me'})` and `INTERESTED_IN` topics appear in the graph; default demo shows Henry's prebuilt profile (`data/demo/me.json`); a visitor can overwrite with their own URL (counts against the live limit).

### 4.3 Event feed `/feed` (`03-event-feed.png`)
Layout `grid-cols-[1fr_320px]`.
- Top: event URL input plus "Load event", accent chip "Scraped live with Bright Data" (or grey "Cached demo data"), speaker and session counts, fetched_at, "Live scrapes left: N".
- Filter chips: Should meet, AI agents, MCP, Creator tools, Open source, Entertainment tech, Already met, plus search.
- Grid of attendee cards (4 cols xl, 3 lg, 2 md): photo, name, title, company, one-line why-meet, 2 topic chips. Default sort by Q1 score.
- Right preview drawer for the selected card: photo, session (title, date, time, room), "why you two", topics, "Deep profile" (opens Identity confirm), "Add to my plan".
- AC: pasting `https://githubuniverse.com/` and pressing Load event runs the Bright Data RainFocus adapter and shows 183 speakers with a per-stage progress line; if Bright Data fails or limits are hit, the 15-person seed loads with banner "Showing cached demo data from 10:45 AM PT"; cards sort by score; topic filters work client side.

### 4.4 Identity confirm (modal over the feed, `04-identity-confirm.png`)
- Modal `max-w-3xl`, dimmed backdrop. Up to 3 candidates: photo, name, title and company, location, match note, HIGH or LOW confidence, "Yes, this one". Footer: "None of these, paste a LinkedIn URL", search fetched_at, "Public sources only".
- Candidates from Bright Data SERP `site:linkedin.com/in "<name>" "<company>"`, then cached profile scrapes for photo and city. HIGH when name and company both match. If the speaker record has a self-submitted LinkedIn URL, show it first, marked "From official speaker profile".
- AC: deep research never starts without an explicit confirm click; "None of these" accepts a pasted URL.

### 4.5 Deep profile `/people/[id]` (`05-deep-profile.png`)
Layout `grid-cols-[300px_1fr_340px]`.
- Left: identity, "Identity confirmed" badge, session, sources list (kind, title, date or GAP, link), "Public sources only. Delete on request.", Delete button.
- Center: label "Communication style read from public sources. Not a psychological diagnosis." Sections: Communication style, Values and motivations, What they are working on now, How to pitch, Topics to avoid, Key history. Each claim: text, confidence badge, source chip or GAP. Line "Checked: N claims, M downgraded".
- Right: 3 talking points (each tagged with one of my safe topics), opener (under 25 words, in my style), icebreaker from latest post (line, date, source), exit line, Refresh with last refreshed time ("2 new since 11:42 AM PT").
- AC: every `source_url` shown was actually fetched (validator enforced); LinkedIn experience, education and position show GAP unless present in data; Delete removes node, edges and cache entries for this sid; 3 demo profiles (suggested: Mario Rodriguez, Maggie Appleton, Angie Jones) are pre-cached so the demo never waits.

### 4.6 Who to meet `/meet` (`06-who-to-meet.png`)
Layout `grid-cols-[1fr_340px]`.
- Center: graph canvas (`react-force-graph-2d` via `next/dynamic` ssr false, or simple SVG): ME node in teal, topic pills, people as photo circles, highlighted teal path to the selected person. Toggles: People, Topics, Hide already met.
- Bottom panel (h-44, IBM Plex Mono): the exact Cypher that produced the ranking, row count, ms, Copy.
- Right: ranked list with score and path as mono text, e.g. `Me -INTERESTED_IN-> AI agents <-INTERESTED_IN- Mario Rodriguez`.
- AC: ranking is Q1 live against FalkorDB; selecting a row runs Q2 and highlights the path; after a note is saved for a person, they disappear from the list (refetch, no reload).

### 4.7 Agent chat `/chat` (`07-agent-chat.png`)
Layout `grid-cols-[1fr_440px]`.
- Center: chat thread, quick chips Next person, What do I owe, Prep me, Recap; input plus Send.
- Right: "Memory used" panel with "FalkorDB memory" badge: tool calls in order, graph path as chips with edge labels, the Cypher run (mono), chat memory count, "Open in graph view".
- Tools (each runs one fixed parameterized Cypher; the model never writes Cypher): `find_people(topic)`, `get_person(name)`, `path_between(name)`, `get_promises()`, `log_meeting(name, topics, note)`.
- Memory: every user and assistant message is saved as `(:Message)` with `[:ABOUT]` edges to mentioned `(:Person)` nodes in the sid graph. The last 10 messages are loaded as context.
- Runs on TrueForge if the 1 PM go/no-go is GO (FalkorDB tools exposed to the TrueForge agent); otherwise OpenAI tool calling directly in `/api/chat`.
- AC: "What do I owe?" after a note returns the promise and shows `get_promises` Cypher; "I just met Leo, he's into anime IP" creates Leo with MET and topic edges; every quick chip answer has at least one tool call.

### 4.8 Notes `/notes/[id]` (`08-notes.png`)
Layout `grid-cols-[1fr_420px]`. `/notes` alone lists people I met plus a person picker.
- Left: person header (photo, name, title, met time and place, Open profile, Ask co-pilot), notes editor with autosave time, "Extract and save to graph".
- Right: Extracted (cares about chips, I promised with due date, next step, they offered), rating 1 to 5, energy slider (Drained to Energized).
- AC: save runs NOTE_EXTRACT and Q3 (MET edge plus Note); person drops off Who to meet; learned_facts saved on the Person node. Voice notes out of scope unless ahead at 3 PM.

### 4.9 Follow-ups `/followups` (`09-followups.png`)
Layout `grid-cols-[300px_1fr_280px]`.
- Left: draft list with status chips (Draft, Approved, Denied).
- Center: banner "Runs on TrueForge, approval required, sending disabled in demo". Draft: recipient, subject, body (editable), "Built from: note at 2:14 PM, 3 profile sources", Regenerate, Edit, Deny, Approve.
- Right: agent trace (tool calls ending in `request_approval() WAITING`) and promise reminders.
- AC: nothing leaves the app; Approve sets status approved and copies the body to clipboard; Deny sets denied; on TrueForge NO-GO the same UI runs on the OpenAI fallback with banner "Runs on OpenAI, approval required, sending disabled in demo".

### 4.10 Debrief `/debrief` (`10-debrief.png`)
- 4 stat tiles: People met, Promises owed, Follow-ups approved, Avg conversation rating.
- `grid-cols-[1fr_1fr_1.2fr]`: Who I met (ratings), What I owe plus Still to meet (top unmet from Q1), Energy through the day (inline SVG line).
- Bottom: dashed Self-insight card. With fewer than 3 MET edges it shows `data/demo/debrief-example.json` with an "EXAMPLE" badge and "Uses cached example data".
- AC: counts come from Q4; the example label is always visible when example data is used.

---

## 5. Architecture

```
Browser (Next.js pages, desktop shell)
   |  fetch /api/*  (httpOnly cookie sid)
   v
Next.js 15 route handlers (Vercel, Node runtime)
   |-- middleware.ts: set sid cookie if missing
   |-- lib/limits.ts: per-sid and global counters (Redis INCR on the FalkorDB host)
   |-- lib/brightdata.ts --> Bright Data: Web Unlocker, SERP API, Web Scraper API (LinkedIn datasets)
   |-- lib/cache.ts: committed demo data first, then Redis or file cache, writes carry fetched_at
   |-- lib/openai.ts --> OpenAI Responses API, Structured Outputs strict
   |-- lib/graph.ts --> FalkorDB, one graph per visitor: copilot_<sid>, seeded from copilot_seed
   |-- lib/agent.ts: chat tools (fixed Cypher)
   |-- lib/trueforge.ts --> TrueForge (local, port 8790, demo laptop only) or OpenAI fallback
```

Key decisions:
- **Per-visitor graph.** On the first API call for a sid, `GRAPH.COPY copilot_seed copilot_<sid>` (FalkorDB 4.x). If unavailable, run `seed.cypher` statements into `copilot_<sid>`. Reset demo = `GRAPH.DELETE copilot_<sid>` then copy again. Clean up old sid graphs with a script (or key EXPIRE if supported).
- **Hosting.** Vercel cannot reach laptop Docker. For the public URL use FalkorDB Cloud (free tier) via `FALKORDB_URL`. On stage, run everything on the laptop against Docker FalkorDB (safer on venue Wi-Fi). Same code.
- **Cache.** Vercel's filesystem is read-only except `/tmp`. Committed demo data lives in `data/demo/` and `seed/github-universe-demo/`. Live Bright Data responses cache in Redis on the FalkorDB host as `bd:<sha1(key)>` = `{fetched_at, source_url, data}`, TTL 24 h; local file cache `.cache/brightdata/` as fallback. Both behind `lib/cache.ts`.
- **TrueForge** runs only on the demo laptop (local `npx`, port 8790). The deployed Vercel app uses the OpenAI fallback (`USE_TRUEFORGE=false`). State this in the README.

---

## 6. Stack

| Part | Choice |
|---|---|
| App | Next.js 15 App Router, TypeScript, Tailwind, `next dev -p 3001` |
| UI | Inter Tight (UI) and IBM Plex Mono (Cypher, tool calls) via `next/font/google`; zinc-50 to zinc-900 plus ONE accent `#0F766E` (primary buttons, active nav, ME node, highlighted paths only); `lucide-react` 16px; no emoji, no purple, no gradients, no glow, no glassmorphism; white cards, 1px zinc-200 border, rounded-lg; section labels small uppercase zinc-500. Henry's rule: nothing should look AI-made |
| Graph DB | FalkorDB (`falkordb` npm). Local: `docker run -d --name falkor -p 6379:6379 -p 3000:3000 -v falkor-data:/data falkordb/falkordb`. Public: FalkorDB Cloud |
| Counters, cache | `redis` npm against the same FalkorDB host |
| Data | Bright Data Web Unlocker, SERP API, Web Scraper API (LinkedIn People `gd_l1viktl72bvl7bjuj0`, Company `gd_l1vikfnt1wgvvqz95w`, Posts `gd_lyy3tktm25m4avu764`) |
| AI | `openai` npm, Responses API, `text.format` json_schema `strict:true`. Default `gpt-4.1-mini`; deep profile only uses `OPENAI_MODEL_DEEP` (e.g. `gpt-4.1`). Paid from the $50 venue credits already redeemed |
| Agent | TrueForge local (`npx @truefoundry/trueforge@latest`, port 8790) plus `@truefoundry/trueforge-sdk`; fallback OpenAI tool calling |
| Graph view | `react-force-graph-2d` (dynamic import, ssr false) |
| QR | `qrcode` |
| Charts | inline SVG |
| Validation | `zod`; tests `vitest` |
| Deploy | Vercel (env vars in project settings) |
| Review | Qodo GitHub app on every PR, `main` protected |

Ports: 3001 app, 6379 FalkorDB, 3000 FalkorDB Browser, 8790 TrueForge.

---

## 7. Folder structure

```
introvert-copilot/
  app/
    layout.tsx                 AppShell (Sidebar + TopBar), fonts
    page.tsx                   Home
    me/page.tsx                Know yourself
    feed/page.tsx              Event feed (+ Identity confirm modal)
    people/[id]/page.tsx       Deep profile
    meet/page.tsx              Who to meet
    chat/page.tsx              Agent chat
    notes/page.tsx             Notes picker
    notes/[id]/page.tsx        Notes for one person
    followups/page.tsx         Follow-ups
    debrief/page.tsx           Debrief
    api/                       see section 13
  components/
    AppShell Sidebar TopBar QrCard QrFullscreen PersonCard PreviewDrawer IdentityModal
    Claim ConfidenceBadge GapBadge SourceChip FetchedAt CachedBanner
    GraphView CypherPanel MemoryPanel ChatThread AgentTrace EnergyChart   (.tsx)
  lib/
    brightdata.ts   unlock, serp, findLinkedIn, linkedinProfile, linkedinCompany, pollSnapshot, rainfocusAll
    adapters/rainfocus.ts   speakers + sessions to Person records
    adapters/generic.ts     unlock + OpenAI extraction for other event URLs
    cache.ts        cached(key, fn, {ttlMs, refresh})
    graph.ts        client, graphFor(sid), ensureSeeded(sid), query, roQuery, Q1 to Q6
    agent.ts        chat tools + Cypher
    openai.ts       runSchema(name, schema, system, user, model?)
    schemas.ts      SELF_PROFILE, IDENTITY_MATCH, PERSON_PROFILE, NOTE_EXTRACT, FOLLOWUP, DEBRIEF_INSIGHT, EVENT_EXTRACT
    prompts.ts      system prompts
    validate.ts     source check, GAP, banned terms, em dash removal
    limits.ts       checkLimit(sid, kind)
    session.ts      getSid()
    trueforge.ts    follow-up (and chat) agent with fallback
  middleware.ts     sid cookie
  data/demo/        me.json, debrief-example.json, profiles/<id>.json
  seed/github-universe-demo/   event.json, people.json, all-speakers.json, photos/, seed.cypher, raw/
  scripts/seed.ts        build copilot_seed from seed/ + data/demo (no network)
  scripts/warm-cache.ts  Bright Data + profile for demo people, writes data/demo
  docs/             PRD.md, wireframes-desktop/, wireframes/, BUILD-PLAN, tracks guide
  .env.example  README.md
```

---

## 8. Environment variables

`.env.example` (commit) and `.env.local` (never commit). Same keys in Vercel.
```
# Bright Data
BRIGHTDATA_API_KEY=
BRIGHTDATA_UNLOCKER_ZONE=web_unlocker1   # confirm exact zone name in the Bright Data dashboard
BRIGHTDATA_SERP_ZONE=serp_api1           # confirm exact zone name
EVENT_ENRICH_LIMIT=20

# OpenAI ($50 venue credits redeemed on Henry's OpenAI org)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_MODEL_DEEP=gpt-4.1

# FalkorDB
FALKORDB_URL=redis://localhost:6379      # FalkorDB Cloud URL in Vercel
FALKOR_SEED_GRAPH=copilot_seed

# TrueForge
TRUEFORGE_URL=http://localhost:8790
USE_TRUEFORGE=false                      # true on the demo laptop if the 1 PM go/no-go is GO

# Open demo
DEMO_MODE=true
LIMIT_PER_SESSION=5
LIMIT_PER_HOUR=30
LIMIT_PER_DAY=150
SENDING_ENABLED=false
MY_LINKEDIN_URL=
```
OpenAI key: create at https://platform.openai.com/api-keys in the same org that holds the venue credits, put it in `.env.local` as `OPENAI_API_KEY`.

---
## 9. FalkorDB schema and key Cypher

Canonical schema matches `seed/github-universe-demo/seed.cypher` (newest). The user is `(:Person {id:'me'})`, not a separate `Me` label. Topic and Company are keyed by `name`, Article by `url`.

**Nodes**
| Label | Key | Props |
|---|---|---|
| `Person` | `id` (slug of name; `'me'` for the user) | name, title, company, photo_url, linkedin_url, bio, city, about, fetched_at, profile_json, confidence, last_seen_post_at, learned_facts (JSON string); on me also intro_15s, social_style, safe_topics[], drains, energizes, goal, offer |
| `Event` | `id` (`github-universe-2026`) | name, start, end, venue, url |
| `Company` | `name` | url, about, fetched_at |
| `Topic` | `name` | |
| `Article` | `url` | title, kind (article, podcast, talk, interview, news, post), date, fetched_at |
| `Note` | `id` | text, created_at, cares_about[], promised[], next_step, rating, energy |
| `FollowUp` | `id` | subject, body, channel, next_steps_json, status (draft, approved, denied), created_at |
| `Message` | `id` | role (user, assistant), text, created_at, tools_json |

**Edges**
| Edge | From to | Props |
|---|---|---|
| `ATTENDS` | Person(me) to Event | |
| `SPEAKS_AT` | Person to Event | session, date, start, room |
| `WORKS_AT` | Person to Company | title |
| `INTERESTED_IN` | Person to Topic | weight, source_url |
| `WROTE` | Person to Article | |
| `ABOUT` | Article to Topic; Message to Person | |
| `KNOWS` | Person to Person | via |
| `MET` | Person(me) to Person | at, event_id, rating, energy |
| `HAS_NOTE` | Person to Note | |
| `HAS_FOLLOWUP` | Person to FollowUp | |

Use `roQuery` for reads and parameters for every value. Never concatenate user input into Cypher.

**Q1 Who to meet (ranked, excludes met, returns reason)**
```cypher
MATCH (me:Person {id:'me'})-[:ATTENDS]->(e:Event {id:$event})<-[:SPEAKS_AT|ATTENDS]-(p:Person)
WHERE p.id <> 'me' AND NOT (me)-[:MET]->(p)
OPTIONAL MATCH (me)-[:INTERESTED_IN]->(t:Topic)<-[:INTERESTED_IN]-(p)
OPTIONAL MATCH (me)-[:INTERESTED_IN]->(t2:Topic)<-[:ABOUT]-(:Article)<-[:WROTE]-(p)
OPTIONAL MATCH (me)-[:MET]->(m:Person)-[:WORKS_AT]->(:Company)<-[:WORKS_AT]-(p)
WITH p, collect(DISTINCT t.name) AS shared, collect(DISTINCT t2.name) AS via_articles, collect(DISTINCT m.name) AS intros
RETURN p.id AS id, p.name AS name, p.photo_url AS photo, p.title AS title, p.company AS company,
       shared, via_articles, intros,
       size(shared)*3 + size(via_articles)*2 + size(intros)*4 AS score
ORDER BY score DESC, name LIMIT $limit
```
Reason line, first that applies: "Intro via {intros[0]}", "You both care about {shared[0]}", "Wrote about {via_articles[0]}", else "No shared ground found" (shown honestly). If FalkorDB rejects the `NOT (me)-[:MET]->(p)` predicate, use `OPTIONAL MATCH (me)-[mm:MET]->(p) WITH me, p, mm WHERE mm IS NULL`.

**Q2 Why-you-two path**
```cypher
MATCH (me:Person {id:'me'}), (p:Person {id:$id})
MATCH path = shortestPath((me)-[*..4]-(p))
RETURN [n IN nodes(path) | {label: labels(n)[0], name: coalesce(n.name, n.title, n.url)}] AS nodes,
       [r IN relationships(path) | type(r)] AS rels
```
Fallback: `MATCH (me:Person {id:'me'})-[:INTERESTED_IN]->(t:Topic)<-[:INTERESTED_IN]-(p:Person {id:$id}) RETURN t.name LIMIT 3`.

**Q3 Log meeting and note**
```cypher
MATCH (me:Person {id:'me'}), (p:Person {id:$id})
MERGE (me)-[r:MET {event_id:$event}]->(p)
SET r.at = $at, r.rating = $rating, r.energy = $energy
CREATE (n:Note {id:$noteId, text:$text, created_at:$at, cares_about:$cares, promised:$promised, next_step:$next})
CREATE (p)-[:HAS_NOTE]->(n)
WITH p UNWIND $topics AS tn
MERGE (t:Topic {name:tn}) MERGE (p)-[:INTERESTED_IN]->(t)
```

**Q4 Debrief**
```cypher
MATCH (me:Person {id:'me'})-[m:MET]->(p:Person)
OPTIONAL MATCH (p)-[:HAS_NOTE]->(n:Note)
RETURN p.id AS id, p.name AS name, m.rating AS rating, m.energy AS energy, m.at AS at, collect(n.promised) AS promised
ORDER BY at
```

**Q5 Upsert person from scrape**
```cypher
MERGE (p:Person {id:$id})
SET p.name=$name, p.title=$title, p.company=$company, p.photo_url=$photo, p.linkedin_url=$li, p.fetched_at=$fetched_at
WITH p MATCH (e:Event {id:$event}) MERGE (p)-[r:SPEAKS_AT]->(e) SET r.session=$session, r.date=$date, r.start=$start, r.room=$room
WITH p MERGE (c:Company {name:$company}) MERGE (p)-[:WORKS_AT]->(c)
WITH p UNWIND $topics AS tn MERGE (t:Topic {name:tn}) MERGE (p)-[:INTERESTED_IN]->(t)
```

**Q6 Agent chat tools (`lib/agent.ts`)**
```cypher
// find_people(topic)
MATCH (p:Person)-[:INTERESTED_IN]->(t:Topic)
WHERE toLower(t.name) CONTAINS toLower($topic) AND p.id <> 'me'
OPTIONAL MATCH (:Person {id:'me'})-[mm:MET]->(p)
RETURN p.id, p.name, p.title, p.company, t.name AS topic, mm IS NOT NULL AS met LIMIT 8

// get_person(name)
MATCH (p:Person) WHERE toLower(p.name) CONTAINS toLower($name)
OPTIONAL MATCH (p)-[s:SPEAKS_AT]->(:Event)
OPTIONAL MATCH (p)-[:INTERESTED_IN]->(t:Topic)
OPTIONAL MATCH (p)-[:HAS_NOTE]->(n:Note)
RETURN p.id, p.name, p.title, p.company, p.profile_json, s.session, s.date, s.start, s.room,
       collect(DISTINCT t.name) AS topics, collect(DISTINCT n.text) AS notes LIMIT 1

// path_between(name)
MATCH (me:Person {id:'me'}), (p:Person) WHERE toLower(p.name) CONTAINS toLower($name)
MATCH path = shortestPath((me)-[*..4]-(p))
RETURN [n IN nodes(path) | coalesce(n.name, n.title)] AS nodes, [r IN relationships(path) | type(r)] AS rels LIMIT 1

// get_promises()
MATCH (:Person {id:'me'})-[:MET]->(p:Person)-[:HAS_NOTE]->(n:Note)
WHERE size(n.promised) > 0
RETURN p.name, n.promised, n.next_step, n.created_at ORDER BY n.created_at DESC

// log_meeting(name, topics, note): MERGE (p:Person {id:slug($name)}) SET p.name=$name, then Q3

// save each chat message
CREATE (m:Message {id:$id, role:$role, text:$text, created_at:$at, tools_json:$tools})
WITH m UNWIND $personIds AS pid MATCH (p:Person {id:pid}) MERGE (m)-[:ABOUT]->(p)

// chat context
MATCH (m:Message) RETURN m.role, m.text ORDER BY m.created_at DESC LIMIT 10
```
Each tool returns `{rows, cypher, ms, path?}` for the Memory used panel.

---

## 10. OpenAI JSON schemas

```ts
// lib/openai.ts
const r = await openai.responses.create({
  model: model ?? process.env.OPENAI_MODEL!,
  input: [{ role: 'system', content: system }, { role: 'user', content: user }],
  text: { format: { type: 'json_schema', name, strict: true, schema } },
});
return JSON.parse(r.output_text);
```
Strict rules: every object `additionalProperties:false` and every key in `required`. If strict mode rejects `$defs`, `maxItems` or `enum`, inline or drop them and clamp in code.

**SELF_PROFILE**
```json
{"type":"object","additionalProperties":false,
 "required":["social_style","strengths","intro_15s","safe_topics","energy_tips","event_goal_line","gaps"],
 "properties":{
  "social_style":{"type":"object","additionalProperties":false,"required":["summary","evidence","confidence"],
    "properties":{"summary":{"type":"string"},"evidence":{"type":"string"},"confidence":{"type":"string","enum":["low","medium","high"]}}},
  "strengths":{"type":"array","items":{"type":"string"}},
  "intro_15s":{"type":"string"},
  "safe_topics":{"type":"array","items":{"type":"string"}},
  "energy_tips":{"type":"array","items":{"type":"string"}},
  "event_goal_line":{"type":"string"},
  "gaps":{"type":"array","items":{"type":"string"}}}}
```

**IDENTITY_MATCH** (optional; cheaper to build candidates in code from SERP)
```json
{"type":"object","additionalProperties":false,"required":["candidates"],
 "properties":{"candidates":{"type":"array","items":{"type":"object","additionalProperties":false,
   "required":["name","company","location","photo_url","linkedin_url","match_reason","confidence"],
   "properties":{"name":{"type":"string"},"company":{"type":"string"},"location":{"type":"string"},
     "photo_url":{"type":"string"},"linkedin_url":{"type":"string"},"match_reason":{"type":"string"},
     "confidence":{"type":"string","enum":["low","medium","high"]}}}}}}
```

**PERSON_PROFILE** (uses `OPENAI_MODEL_DEEP`). Claim = `{text, source_url, confidence}`; `source_url` is a fetched URL or the literal `GAP`.
```json
{"type":"object","additionalProperties":false,
 "required":["identity","current_work","communication_style","values_motivations","excites_them","talking_points",
             "opener","how_to_pitch","avoid","exit_line","icebreaker_post","why_you_two","key_history","gaps","evidence_quality"],
 "$defs":{"claim":{"type":"object","additionalProperties":false,"required":["text","source_url","confidence"],
   "properties":{"text":{"type":"string"},"source_url":{"type":"string"},"confidence":{"type":"string","enum":["low","medium","high"]}}}},
 "properties":{
  "identity":{"type":"object","additionalProperties":false,"required":["name","headline","company","location","linkedin_url"],
    "properties":{"name":{"type":"string"},"headline":{"type":"string"},"company":{"type":"string"},"location":{"type":"string"},"linkedin_url":{"type":"string"}}},
  "current_work":{"$ref":"#/$defs/claim"},
  "communication_style":{"$ref":"#/$defs/claim"},
  "values_motivations":{"type":"array","items":{"$ref":"#/$defs/claim"}},
  "excites_them":{"type":"array","items":{"$ref":"#/$defs/claim"}},
  "talking_points":{"type":"array","items":{"type":"object","additionalProperties":false,
    "required":["point","my_safe_topic","source_url","confidence"],
    "properties":{"point":{"type":"string"},"my_safe_topic":{"type":"string"},"source_url":{"type":"string"},"confidence":{"type":"string","enum":["low","medium","high"]}}}},
  "opener":{"type":"string"},
  "how_to_pitch":{"$ref":"#/$defs/claim"},
  "avoid":{"type":"array","items":{"$ref":"#/$defs/claim"}},
  "exit_line":{"type":"string"},
  "icebreaker_post":{"type":"object","additionalProperties":false,"required":["line","post_url","post_date"],
    "properties":{"line":{"type":"string"},"post_url":{"type":"string"},"post_date":{"type":"string"}}},
  "why_you_two":{"type":"string"},
  "key_history":{"type":"array","items":{"$ref":"#/$defs/claim"}},
  "gaps":{"type":"array","items":{"type":"string"}},
  "evidence_quality":{"type":"string","enum":["thin","moderate","rich"]}}}
```

PERSON_PROFILE system prompt (paste as-is):
```
You are a networking coach for an introverted professional who is about to meet someone at a conference.
You receive ME (the user's self profile and safe topics) and SOURCES (public data about one person, each with url and fetched_at).
Write a short, practical briefing that helps ME start a genuine conversation and follow up well.
Rules:
- Use only SOURCES. If a fact is not in SOURCES, write GAP. Never invent jobs, dates, schools or quotes.
- Every claim cites a source_url that appears in SOURCES, or GAP.
- This is a communication style read from public sources, not a psychological diagnosis. Give confidence low, medium or high. With fewer than 3 posts or articles, confidence must be low.
- Never mention or infer health, religion, politics, sexuality, ethnicity, race, family, age, disability or other protected traits.
- Exactly 3 talking points, each tied to one of ME.safe_topics.
- Opener under 25 words, specific, low pressure, not salesy, in ME's social style.
- Plain language. No flattery. No em dashes.
Return JSON that matches the schema exactly.
```

**NOTE_EXTRACT**
```json
{"type":"object","additionalProperties":false,"required":["cares_about","i_promised","next_step","they_offered","topics","learned_facts"],
 "properties":{"cares_about":{"type":"array","items":{"type":"string"}},
  "i_promised":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["what","due"],
    "properties":{"what":{"type":"string"},"due":{"type":"string"}}}},
  "next_step":{"type":"string"},"they_offered":{"type":"array","items":{"type":"string"}},
  "topics":{"type":"array","items":{"type":"string"}},"learned_facts":{"type":"array","items":{"type":"string"}}}}
```

**FOLLOWUP** (same shape from TrueForge or fallback)
```json
{"type":"object","additionalProperties":false,"required":["draft","next_steps","promise_reminders","missing"],
 "properties":{
  "draft":{"type":"object","additionalProperties":false,"required":["channel","subject","body"],
    "properties":{"channel":{"type":"string","enum":["linkedin_dm","email"]},"subject":{"type":"string"},"body":{"type":"string"}}},
  "next_steps":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["action","why","due"],
    "properties":{"action":{"type":"string"},"why":{"type":"string"},"due":{"type":"string"}}}},
  "promise_reminders":{"type":"array","items":{"type":"string"}},
  "missing":{"type":"array","items":{"type":"string"}}}}
```
Follow-up agent instructions: read the person, profile and notes (graph tools); suggest up to 3 next steps due within 7 days; draft 60 to 110 words, first line references one specific thing from the note, one clear ask, no flattery, no hype, no em dashes, match the person's communication style without naming it; only facts from the graph and the note; if the note is thin, list what is missing; call `save_draft`; `send_followup` requires approval and is disabled in the demo.

TrueForge agent manifest sketch (if GO):
```json
{"model":{"name":"openai/gpt-4.1-mini"},
 "instructions":"<follow-up instructions above>",
 "mcp_servers":[{"name":"copilot-graph","enable_tools":["get_person","get_promises","path_between"]},
                {"name":"outbox","enable_tools":["save_draft","send_followup"],"require_approval_for_tools":["send_followup"]}],
 "config":{"sandbox":{"enabled":false},"iteration_limit":12}}
```
`copilot-graph` and `outbox` are tiny MCP servers (or SDK tools) wrapping `lib/agent.ts`; `send_followup` only marks the draft approved.

**DEBRIEF_INSIGHT**: `{insight, best_conditions, energy_pattern}`, all strings.
**EVENT_EXTRACT** (generic adapter only): `{event:{name,start,end,venue}, people:[{name,title,company,photo_url,session}]}`; prompt says "extract only what is present, use null for missing, never invent".

**Validator `lib/validate.ts`** (deterministic, after every profile call):
1. Every `source_url` must be in the set of URLs fetched for this person, or `GAP`; else set GAP and confidence low.
2. `key_history` items without a source become GAP.
3. If `evidence_quality` is thin, no claim may be high (downgrade to medium).
4. Banned-term scan (health, religion, politics, sexuality, ethnicity, race, family, age, disability and close synonyms): drop the claim.
5. Replace any em dash with a comma.
Returns `{checked, downgraded, dropped}` for the "Checked: N claims, M downgraded" line.

---

## 11. Bright Data integration detail

All calls go through `lib/brightdata.ts` with `Authorization: Bearer BRIGHTDATA_API_KEY`. Never log the key. Every call is wrapped in `cached(key, fn)` and counted by `checkLimit(sid, 'live')` only when it actually hits the network.

| Function | Product | Request |
|---|---|---|
| `unlock(url)` | Web Unlocker | `POST https://api.brightdata.com/request` body `{"zone":UNLOCKER_ZONE,"url":url,"format":"raw"}` (add `"data_format":"markdown"` for article bodies). 60 s timeout, 1 retry |
| `serp(q)` | SERP API | `POST https://api.brightdata.com/request` body `{"zone":SERP_ZONE,"url":"https://www.google.com/search?q=<encoded>&brd_json=1","format":"raw"}`. Parse JSON, return `organic[] {link,title}`. `brd_json=1` is UNTESTED: if the body is HTML, regex out `linkedin.com/in/` links |
| `findLinkedIn(name, company)` | SERP | `site:linkedin.com/in "<name>" "<company>"`, first link matching `/linkedin\.com\/in\//` |
| `linkedinProfile(url)` | Web Scraper API | `POST https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l1viktl72bvl7bjuj0&format=json` body `[{"url":url}]`. HTTP 202 or a body with `snapshot_id` = pending |
| `pollSnapshot(id)` | Web Scraper API | `GET https://api.brightdata.com/datasets/v3/progress/{id}` every 5 s until `ready` (timeout 180 s), then `GET /datasets/v3/snapshot/{id}?format=json` |
| `linkedinCompany(url)` | Web Scraper API | same endpoint, `dataset_id=gd_l1vikfnt1wgvvqz95w` |
| `rainfocusAll(type)` | Web Unlocker | below |

**Event scrape (GitHub Universe, RainFocus adapter)**
- The speakers page `https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/speakers` is JS-rendered; raw HTML has no names. Its XHR needs a CSRF header; do not use it.
- Fetch the public catalog JSON through Web Unlocker (plain GET, no cookie):
  `https://events.githubuniverse.com/api/search?rfApiProfileId=m1QDSQXyImeQsjxLuOzWjFgzJDD7mlkU&type=speaker&size=50&from=0`, then `from=50`, `100`, `150`. Same with `type=session` (157 sessions with `times[].date`, `startTimeFormatted`, `room`).
- Page 1 shape `{sectionList:[{total, items:[...]}]}`; later pages `{total, items:[...]}`. Code: `const page = j.sectionList?.[0] ?? j`.
- Speaker fields: `fullName, jobTitle, companyName, photoURL, linkedIn` (self-submitted), `bio, session[].sessionID`. Join sessionID to sessions for title, date, time, room.
- Map to Person `{id: slug(fullName), name, title, company, photo_url, linkedin_url, session, topics, sources:[{url,title,date}], fetched_at}`; missing values are the string `GAP`. Topics: keyword match of bio and session title against a fixed list (AI agents, MCP, GitHub Copilot, developer tools, open source, design, creator tools, entertainment tech, security, education, AI platforms, engineering leadership).
- Enrichment: top `EVENT_ENRICH_LIMIT` (20) people by Q1 score: speaker's own LinkedIn if present, else `findLinkedIn`; then `linkedinProfile` for `about, city, current_company, posts, avatar`. Posts become `(:Article {kind:'post'})` with `WROTE`.
- Cost: about 8 Unlocker requests, up to 20 SERP and 20 profile records per event load (about $1.5 per 1K each), inside the 5,000 free monthly credits.
- Generic adapter (any other URL): `unlock(url)`, strip scripts and styles, EVENT_EXTRACT.
- Failure or limit: load `seed/github-universe-demo/people.json` and `event.json` (15 curated speakers, fetched 10:45 AM PT Oct 24), return `source:"cache"`, UI shows CachedBanner. The seed is fallback only.

**LinkedIn caveat:** since Nov 13 2025, logged-out LinkedIn hides position, experience and education (about 2% fill per Bright Data docs). Use `about, posts, current_company, city, avatar, followers, recommendations, publications, projects`. Always render GAP for the hidden fields; never model-filled.

**Deep research per confirmed person:** profile, company, posts, SERP `"<name>" "<company>"`, `"<name>" podcast OR talk OR interview`, `"<name>" site:youtube.com`, `"<company>" news`, then `unlock()` the top 5 non-LinkedIn results as markdown trimmed to 4,000 chars. Each saved as `{kind, url, title, date or GAP, fetched_at}`.

**Data quality checks (shown in UI):** LinkedIn URL normalized to `https://www.linkedin.com/in/<slug>`, name present, photo URL loads, posts have dates, record count, `fetched_at` in PT. Unit test the mapper against `seed/github-universe-demo/raw/raw_speakers.json` (183 speakers, Jake Albaugh first).

---

## 12. Open-demo safety

- **No auth.** `middleware.ts` sets httpOnly, SameSite=Lax, Secure (prod) cookie `sid` (random UUID, 7 days) if missing.
- **Isolation.** Every graph call uses `graphFor(sid)` = `copilot_<sid>`, seeded on first use. No visitor sees another's notes, chats or profile.
- **Default data.** GitHub Universe demo loads from cache by default: instant, free, works offline.
- **Rate limits** (`lib/limits.ts`, Redis INCR plus EXPIRE): live Bright Data and deep-profile calls: 5 per sid, 30 per hour global, 150 per day global (env). Cheap `gpt-4.1-mini` calls (chat, notes, follow-up): 40 per sid per day. On limit: return cached data plus `{limited:true}`; UI shows "Live limit reached. Showing cached demo data." Top bar shows "Live scrapes left: N".
- **Sending disabled.** `SENDING_ENABLED=false` and no send code path exists. Approve only changes status and copies to clipboard.
- **Keys server-side only.** No `NEXT_PUBLIC_` secrets. `.env.local` git-ignored. Before submit `git log -p | grep -iE "api_key|sk-|token"` must be clean.
- **Input safety.** zod on every body; URLs must be http(s), under 500 chars; all Cypher parameterized; chat tools are fixed queries.
- **Reset demo:** deletes and re-seeds `copilot_<sid>`, clears client state.
- **Delete on request:** DELETE on a person removes node, edges and cache keys for that sid.

---

## 13. API routes

| Route | Does | Sponsor |
|---|---|---|
| `GET /api/health` | `{ok, falkor}` | FalkorDB |
| `POST /api/session/reset` | Delete and re-seed `copilot_<sid>` | FalkorDB |
| `GET /api/me`, `PUT /api/me` | Read or save answers and self profile | |
| `POST /api/me/build` | Scrape my LinkedIn, SELF_PROFILE, MERGE me plus topics | BD, OpenAI, FalkorDB |
| `POST /api/event/load` `{url}` | Adapter, Bright Data scrape, Q5 writes, cache fallback. Returns `{event, people, counts:{people, linkedin_found, gaps}, fetched_at, source, limited?}` | BD, FalkorDB |
| `GET /api/event/[id]/feed?limit=` | Q1 ranked list with reason line | FalkorDB |
| `GET /api/plan` | Home: plan blocks, top 5, brief | FalkorDB, OpenAI |
| `POST /api/identity` `{name, company?}` | Up to 3 candidates | BD |
| `POST /api/people/[id]/research` | Deep research, cache sources | BD |
| `POST /api/people/[id]/profile` | PERSON_PROFILE, validator, MERGE Articles and Topics, store profile_json | OpenAI, FalkorDB |
| `GET /api/people/[id]` | Profile, sources, fetched_at | |
| `POST /api/people/[id]/refresh` | Re-scrape posts (bypass cache), return new since last look | BD |
| `DELETE /api/people/[id]` | Delete node, edges, cache | FalkorDB |
| `GET /api/people/[id]/path` | Q2 | FalkorDB |
| `GET /api/meet` | Q1 plus canvas nodes and links plus `{cypher, rows, ms}` | FalkorDB |
| `POST /api/chat` `{message}` | Agent with 5 tools, saves Messages, returns `{reply, tools:[{name,args,cypher,rows,ms,path}], memoryCount}` | OpenAI or TrueForge, FalkorDB |
| `POST /api/notes/[id]` `{text, rating, energy}` | NOTE_EXTRACT, Q3, learned_facts | OpenAI, FalkorDB |
| `POST /api/followups/[id]` | FOLLOWUP via TrueForge or fallback, store draft, return trace | TrueForge, OpenAI |
| `GET /api/followups` | List drafts | |
| `POST /api/followups/[fid]/approve`, `/deny` | Resolve approval, set status, never sends | TrueForge |
| `GET /api/debrief` | Q4, top 3 unmet, insight or example | FalkorDB, OpenAI |

---
## 14. PR plan (one feature per PR, Qodo reviews each)

Rules: branch from latest `main`; PR title `feat: ...` or `chore: ...`; description has What, Why, How to test, Screenshot; wait for Qodo (2 to 5 min), fix real findings in a follow-up commit titled `fix: address Qodo review (<finding>)`, reply "Fixed in <sha>"; squash merge. Never commit `.env.local`. Henry must first install the Qodo GitHub app at https://app.qodo.ai with "Only select repositories" = `introvert-copilot` (not yet done). Paste each prompt into Cursor (Agent mode) in the repo.

**PR1 `chore/docs-seed`** (11:30)
```
Commit the existing docs/ and seed/ folders as they are (do not edit content). Add .gitignore entries: .env.local, .cache/, node_modules/, .next/. Add .env.example with the keys from docs/PRD.md section 8 and empty values. Add a short README stub: one-line pitch, "See docs/PRD.md". Open PR "chore: add PRD, wireframes and GitHub Universe seed".
```

**PR2 `chore/skeleton-shell`** (11:40)
```
Read docs/PRD.md sections 4, 6, 7 and docs/wireframes-desktop/DESKTOP-UI-PROMPT.md. Create a Next.js 15 App Router app in this repo (TypeScript, Tailwind, ESLint), dev script `next dev -p 3001`. Install falkordb redis openai zod qrcode lucide-react react-force-graph-2d and dev deps vitest @types/qrcode. Fonts Inter Tight and IBM Plex Mono via next/font/google. Tailwind theme: zinc grays and one accent #0F766E only. Build AppShell (224px Sidebar with lucide icons, TopBar h-14 with event switcher "GitHub Universe 2026, Oct 28-29, Fort Mason Center, SF", dashed pill "Open demo, no login", Reset demo button) and empty pages for /, /me, /feed, /people/[id], /meet, /chat, /notes, /notes/[id], /followups, /debrief matching the wireframe PNGs in docs/wireframes-desktop/. Add middleware.ts (httpOnly sid cookie), lib/session.ts, lib/graph.ts (graphFor(sid) with ensureSeeded via GRAPH.COPY from FALKOR_SEED_GRAPH, fallback to running seed/github-universe-demo/seed.cypher), scripts/seed.ts that builds copilot_seed from seed.cypher, /api/health and /api/session/reset. No emoji, no purple, no gradients, no em dashes in UI copy. npm run build must pass.
```

**PR3 `feat/event-scrape`** (12:05)
```
Read docs/PRD.md section 11 and seed/github-universe-demo/EVENT-SCRAPE-PROMPT.md. Implement lib/cache.ts (Redis key bd:<sha1>, value {fetched_at, source_url, data}, TTL 24h, file fallback .cache/brightdata), lib/limits.ts (section 12), lib/brightdata.ts (unlock, serp with brd_json=1 and HTML regex fallback, findLinkedIn, linkedinProfile with snapshot polling, rainfocusAll paging from=0,50,100,150 using `j.sectionList?.[0] ?? j`), lib/adapters/rainfocus.ts (speakers joined to sessions, topic keyword tagging, GAP for missing), lib/adapters/generic.ts, and POST /api/event/load which runs the adapter, enriches top EVENT_ENRICH_LIMIT with LinkedIn, upserts with Q5 into the visitor graph, and falls back to seed/github-universe-demo/people.json with source "cache" on any failure or limit. Add a vitest test that maps seed/github-universe-demo/raw/raw_speakers.json to 183 people. Never log the API key.
```

**PR4 `feat/event-feed`** (12:45, finish 1:10)
```
Build /feed per docs/PRD.md 4.3 and 4.4 and wireframes 03-event-feed.png and 04-identity-confirm.png: URL input and Load event, Bright Data chip or CachedBanner, counts, fetched_at, live scrapes left, filter chips, card grid sorted by Q1 (GET /api/event/[id]/feed), right preview drawer, IdentityModal backed by POST /api/identity (speaker's own LinkedIn first, then SERP candidates, HIGH when name and company match, "None of these" accepts a URL). Components: PersonCard, PreviewDrawer, IdentityModal, GapBadge, FetchedAt, CachedBanner.
```

**PR5 `feat/me-and-home`** (1:30)
```
Build /me (PRD 4.2, 02-know-yourself.png) with POST /api/me/build (Bright Data LinkedIn scrape, SELF_PROFILE via runSchema in lib/openai.ts, MERGE me and INTERESTED_IN topics) and GET/PUT /api/me; default to data/demo/me.json. Build Home / (PRD 4.1, 01-home.png): my card, LinkedIn QR with qrcode, QrFullscreen modal (Esc closes), Copy link, Today's plan from sessions of top people, Top 5 from Q1, pre-event brief via GET /api/plan.
```

**PR6 `feat/deep-profile`** (2:00)
```
Build /people/[id] per PRD 4.5 and 05-deep-profile.png. Routes research, profile, refresh, DELETE and GET from PRD section 13. PERSON_PROFILE schema and system prompt from PRD section 10 using OPENAI_MODEL_DEEP. Implement lib/validate.ts exactly as PRD section 10 and show "Checked: N claims, M downgraded". Components Claim, ConfidenceBadge, SourceChip. Then write scripts/warm-cache.ts and run it for Mario Rodriguez, Maggie Appleton and Angie Jones so data/demo/profiles/ holds their profiles.
```

**PR7 `feat/meet-graph`** (2:50)
```
Build /meet per PRD 4.6 and 06-who-to-meet.png. GET /api/meet returns Q1 rows, canvas nodes and links, and {cypher, rows, ms}. GraphView with react-force-graph-2d (dynamic import, ssr false): ME teal, topics as small pills, people as photo circles, selected path in teal from GET /api/people/[id]/path (Q2). CypherPanel (IBM Plex Mono, row count, ms, Copy). Ranked list with mono path text. Toggles People, Topics, Hide already met.
```

**PR8 `feat/agent-chat`** (3:20)
```
Build /chat per PRD 4.7 and 07-agent-chat.png. lib/agent.ts with tools find_people, get_person, path_between, get_promises, log_meeting, each one fixed parameterized Cypher from PRD Q6, each returning {rows, cypher, ms, path}. POST /api/chat: load last 10 Message nodes, run OpenAI tool calling (OPENAI_MODEL) or TrueForge when USE_TRUEFORGE=true, save user and assistant Message nodes with ABOUT edges to mentioned people. MemoryPanel shows tool calls, path chips, Cypher and memory count. Quick chips Next person, What do I owe, Prep me, Recap.
```

**PR9 `feat/notes-followups`** (3:50)
```
Build /notes, /notes/[id] (PRD 4.8, 08-notes.png) with POST /api/notes/[id]: NOTE_EXTRACT, Q3, learned_facts. Build /followups (PRD 4.9, 09-followups.png): lib/trueforge.ts runs the follow-up agent on TrueForge (TRUEFORGE_URL, require_approval_for_tools ["send_followup"]) when USE_TRUEFORGE=true, else OpenAI with the same FOLLOWUP schema. Draft list, editable draft, Regenerate, Edit, Deny, Approve (status only, copy to clipboard, never sends), AgentTrace ending in request_approval() WAITING, banner text per PRD.
```

**PR10 `feat/debrief`** (4:15)
```
Build /debrief per PRD 4.10 and 10-debrief.png: GET /api/debrief with Q4, 4 stat tiles, Who I met, What I owe, Still to meet (Q1 top 3), EnergyChart as inline SVG, Self-insight via DEBRIEF_INSIGHT; with fewer than 3 MET edges use data/demo/debrief-example.json and always show an EXAMPLE badge.
```

**PR11 `chore/polish-deploy`** (4:25)
```
Polish to match wireframes, empty and error states, no em dashes in UI copy, Reset demo works end to end. README: pitch, sponsor usage per track, run steps (Docker FalkorDB, npm run seed, npm run dev on 3001), trust rules, "Qodo Code Review Evidence" section with PR links and 2 screenshots, live URL. Deploy to Vercel with env vars (FALKORDB_URL = FalkorDB Cloud, USE_TRUEFORGE=false). Verify git history has no secrets.
```

---

## 15. Schedule (re-timed from 11:30 AM PT)

| Time PT | Work | Done when |
|---|---|---|
| 11:15 to 11:30 | Henry: install Qodo app, create `.env.local` (OpenAI key, Bright Data key and zone names), start FalkorDB Docker, start TrueForge local (`npx @truefoundry/trueforge@latest`) | Keys work, FalkorDB Browser on :3000 |
| 11:30 | PR1 chore/docs-seed | Merged, Qodo commented |
| 11:40 | PR2 chore/skeleton-shell | Shell renders all 10 routes, seed graph exists |
| 12:05 | PR3 feat/event-scrape | 183 speakers live or 15 from cache |
| 12:45 | PR4 feat/event-feed (part 1) | Feed renders sorted cards |
| **1:00 to 1:10** | **Checkpoint 1**: first Vercel deploy; **TrueForge go/no-go** (agent with one tool and one approval in 10 minutes = GO, else NO-GO, use OpenAI fallback everywhere) | Public URL loads, decision recorded in README |
| 1:10 | PR4 finish (identity modal) | Confirm modal works |
| 1:30 | PR5 feat/me-and-home | QR scans, Top 5 from graph |
| 2:00 | PR6 feat/deep-profile, then warm-cache for 3 demo people | 3 cached profiles render instantly |
| 2:50 | PR7 feat/meet-graph | Path highlights, Cypher panel live |
| 3:20 | PR8 feat/agent-chat | "What do I owe" answered from graph |
| **3:45** | **Checkpoint 2**: apply cut order if behind; full demo run once | Demo path works end to end |
| 3:50 | PR9 feat/notes-followups | Note drops person off list, draft waits for approval |
| 4:15 | PR10 feat/debrief | Tiles and example label |
| 4:25 | PR11 chore/polish-deploy | Prod deploy green |
| **4:30** | **Feature freeze** | Only bug fixes after this |
| 4:30 to 5:10 | Rehearse demo twice (one with Wi-Fi off), record 2-minute backup video, write submission text | |
| **5:15** | **Submit** | Confirmation received |
| about 5:30 | Live demo | |

**Cut order if behind** (cut the first first): 1) voice notes, 2) energy and learning in Debrief (keep the EXAMPLE-labeled card), 3) TrueForge (fall back to plain OpenAI with the same approval UI), 4) path animation (static highlight is fine). Never cut: Bright Data live scrape, Who to meet Cypher panel, Agent chat Memory used panel, cached fallback.

---

## 16. 3-minute demo script (click by click)

Setup: laptop with app on :3001, Docker FalkorDB, TrueForge Sessions in tab 2 (if GO), FalkorDB Browser in tab 3, phone ready to scan. Mario Rodriguez's profile pre-cached.

1. **0:00 to 0:15, hook.** On Home. "Conferences are built for extroverts. This is a co-pilot for the rest of us. Open link, no login." Point at my card: "Here's me, and here's my LinkedIn QR." Click Show QR fullscreen, a judge scans it.
2. **0:15 to 0:50, Bright Data (lead).** Click Event feed. Paste `https://githubuniverse.com/`, click Load event. "Bright Data Web Unlocker is pulling the GitHub Universe speaker catalog right now, next week, Fort Mason." Counts appear: 183 speakers, 157 sessions, fetched just now. "SERP API finds each speaker's LinkedIn, the LinkedIn dataset fills profiles. Anything we can't verify shows as GAP." Point at a GAP badge. (If live fails, the cached banner shows and you say "cached from this morning".)
3. **0:50 to 1:20, profile.** Click Mario Rodriguez, Deep profile, confirm the identity modal ("I always confirm who it is first"). Profile renders: "Communication style from public sources, not a diagnosis. Every claim has a source and a confidence. Checked: 14 claims, 2 downgraded." Read the opener out loud.
4. **1:20 to 1:50, FalkorDB.** Click Who to meet. "FalkorDB is the memory. This is the multi-hop Cypher that ranked these people." Point at the Cypher panel and the teal path Me, AI agents, Mario.
5. **1:50 to 2:15, Agent chat.** Click Agent chat, chip "Next person". Answer appears with Memory used: find_people, path_between, Cypher. Type "I just met Mario, he wants the MCP demo repo, I promised to send it Monday." Then chip "What do I owe". Answer: the promise, from get_promises.
6. **2:15 to 2:40, close the loop.** Back to Who to meet: Mario is gone from the list. "The graph remembered." Click Follow-ups: draft built from the note. "Runs on TrueForge, approval required, sending disabled." Click Approve. Show TrueForge Sessions tab if GO.
7. **2:40 to 3:00, close.** Click Debrief: tiles and example insight (labeled). "Bright Data for live, hard-to-get data, FalkorDB as memory, OpenAI and TrueForge for safe actions, every PR reviewed by Qodo. Public sources only, delete on request."

Q&A prep: Why a graph? Multi-hop "why you two" and memory that changes rankings. Privacy? Public data only, sourced, GAP, delete button, nothing sent. Hidden LinkedIn history? Shown as GAP since Nov 2025, never guessed. Cost? Under $1 of credits per event load.

---

## 17. Submission checklist

- [ ] Public repo, README with pitch, setup, sponsor usage per track, trust rules, live URL
- [ ] Live Vercel URL works logged out in an incognito window; cached demo loads instantly
- [ ] Reset demo works; limits show "Live scrapes left"
- [ ] No secrets in git history; `.env.example` present
- [ ] Qodo: about 11 merged PRs each with Qodo review, at least 2 findings fixed with "Fixed in <sha>", README evidence section with screenshots
- [ ] FalkorDB: Cypher panel and Memory used panel visible; seed script documented
- [ ] Bright Data: products used listed (Web Unlocker, SERP API, Web Scraper API LinkedIn datasets), fetched_at visible
- [ ] TrueForge: GO or NO-GO noted in README; if GO, Sessions screenshot
- [ ] 2-minute backup demo video (screen recording)
- [ ] Submission form or channel used (confirm method with organizers by 3:45)
- [ ] Select all four tracks

Submission description (paste, adjust numbers):
```
Introvert Co-pilot helps introverts work a conference. It scrapes the event live with Bright Data (Web Unlocker on the GitHub Universe catalog, SERP API to find LinkedIn, the LinkedIn dataset for profiles), builds a sourced communication-style profile of you and of the people worth meeting with OpenAI, stores people, topics and meetings in a FalkorDB graph that ranks who to meet with multi-hop Cypher and serves as the co-pilot agent's memory, and drafts follow-ups that wait for your approval on TrueForge. Every claim has a source and a confidence; missing data is shown as GAP. Open demo, no login, nothing is ever sent. Every feature shipped as a small PR reviewed by Qodo.
```

---

## 18. Open questions and risks

| Risk or question | Impact | Mitigation |
|---|---|---|
| **FalkorDB cash prize amount unconfirmed** (iPhone Duos or cash) | Pitch emphasis | Ask FalkorDB staff; still enter, graph is core anyway |
| **Submission method not published** | Could miss 5:15 | Ask organizers on Discord or at the desk by 1 PM; re-check at 3:45 |
| **`brd_json=1` on SERP untested** | LinkedIn discovery could return HTML | Regex fallback for `linkedin.com/in/`; prefer speaker's self-submitted LinkedIn; test in PR3 first thing |
| Bright Data zone names unknown (`web_unlocker1`, `serp_api1` assumed) | 400 errors | Confirm in dashboard before PR3 |
| LinkedIn hides experience and education logged out since Nov 13 2025 | Thin profiles | GAP badges, use posts, about, articles, talks |
| Bright Data track idea list no longer mentions LinkedIn | Fit question | Confirm with Bright Data staff; lead with event catalog scrape plus multi-source merge |
| LinkedIn dataset is async (snapshot polling up to minutes) | Demo stall | Pre-warm 3 demo profiles; 180 s timeout then cache |
| TrueForge setup time | Lose an hour | 1 PM go/no-go; OpenAI fallback with identical UI |
| `GRAPH.COPY` may not exist on FalkorDB Cloud version | Per-sid seeding fails | Fallback: replay seed.cypher (about 200 statements, under 2 s) |
| Venue Wi-Fi fails during demo | Live scrape fails | Laptop-local stack, cached banner path rehearsed, backup video |
| OpenAI strict schema rejects `$defs` or `enum` | Profile call errors | Inline the claim object; clamp in code |
| $50 OpenAI credits | Budget | gpt-4.1-mini default, deep model only for profiles, per-sid limits |
| Public data ethics question from judges | Score | Trust rules, not-a-diagnosis label, delete button, nothing sent |
| Qodo not installed yet | Qodo track fails | Henry installs before PR1 merges |

---

## 19. Package contents

```
handoff/
  PRD-introvert-copilot-2026-10-24.md   this document (source of truth)
  HANDOFF-README.md                     what is here, current state, first 3 actions
  wireframes-desktop/                   01-home.png to 10-debrief.png, overview, html/, DESKTOP-UI-PROMPT.md, gen.py
  wireframes/                           older mobile wireframes (secondary reference)
  github-universe-demo/                 event.json, people.json, seed.cypher, photos/, raw/, README.md, EVENT-SCRAPE-PROMPT.md
  BUILD-PLAN-2026-10-24.md              earlier build plan (superseded where it differs)
  ptc-tracks-skills-guide-2026-10-24.md track rules, judging, sponsor notes
```
In the repo these go under `docs/` (PRD as `docs/PRD.md`) and `seed/github-universe-demo/`.
