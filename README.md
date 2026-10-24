# Introvert Co-pilot

A public demo for introverts walking into GitHub Universe 2026. It ranks who is worth your energy, shows the graph path behind each pick, and drafts what to say. No login. The demo user is Henry Finn.

Built for the WeMakeDevs Patch the Conference hackathon (Oct 24 2026). FalkorDB is the lead track. Bright Data, OpenAI, and TrueForge are wired as later passes. Qodo reviews each PR.

## What works

- App shell: left nav, top bar, cached snapshot pill, Reset demo.
- Seed snapshot: 183 speakers and 157 sessions from `seed/github-universe-demo`.
- Who to meet (`/meet`): day filter, scores, graph path expander, save, mark as met.
- Graph module: FalkorDB when `FALKORDB_URL` connects, otherwise the same ranking on an in-memory graph.
- `falkors://` (TLS, non-standard port) is parsed into host, port, username, and password. TLS is turned on explicitly. The URL is never logged.
- Idempotent seed: the catalog loads into FalkorDB Cloud when the graph is empty. `npm run seed` does the same from a shell. `POST /api/seed` is locked behind `SEED_TOKEN`.
- `GET /api/health` returns `{ ok, backend, nodes, edges }` only.
- Per-browser session in an httpOnly cookie plus localStorage. Reset rotates the cookie and clears local saves. It does not delete the shared graph.

## What is stubbed

- Your story editing and topic toggles.
- The full person page (personality, news, plan). Bios and the graph path are real.
- Agent chat. The composer stays disabled. Allow and Deny do not send anything.
- Live Bright Data fetches and OpenAI generation.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3001. The dev server uses port 3001.

```bash
npm test
npm run build
```

Copy `.env.example` to `.env.local` if you want FalkorDB. Leave `FALKORDB_URL` empty and the app still ranks from the seed files.

```bash
npm run seed
```

With no URL, the script logs the memory backend and writes nothing. With a URL, it loads the catalog and `seed/github-universe-demo/seed.cypher` when the graph is empty. Running it again is a no-op once the seed marker is set.

On Vercel, the first request that needs the graph loads the catalog if it is empty. `POST /api/seed` with `Authorization: Bearer $SEED_TOKEN` loads the catalog and the cypher file and returns counts. Health reports the backend and counts only. Do not print the connection URL.

## Ranking

Shared session topics, whole-word hits on Henry's background (film, video, story, storytelling, creator, design, media, AI, anime, comics), and a co-speaker intro. People marked met drop out of the list. The path chip row is the query the ranker actually used.
