# GitHub Universe 2026 — demo seed data (reference + fallback)

**Public sources only.** Fetched 2026-10-24T10:45:03-07:00 (America/Los_Angeles). Nothing here came from a login, private list, or guessed value. Unknown fields are `GAP`.

Per Henry's scope change, the app's live data comes from Bright Data (see EVENT-SCRAPE-PROMPT.md). This bundle is the cached fallback for the stage demo and a ground truth for checking the scraper's output.

## Event facts
- **Name:** GitHub Universe 2026
- **Dates:** Oct 28–29, 2026
- **Venue:** Fort Mason Center, San Francisco, CA (main stage: Festival Pavilion)
- **Format:** in-person (sold out) + free virtual
- **Opening Keynote:** Wed Oct 28, 9:00 AM PT, Main Stage. **Closing Keynote:** Thu Oct 29, 2:00 PM PT, Main Stage.
- **Published catalog at fetch time:** 183 speakers, 157 sessions
- Sources: https://githubuniverse.com/ , https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/speakers

## Where the data lives (for the scraper)
- Speakers page: https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/speakers. It's **JS-rendered** (RainFocus). The raw HTML has no speaker names.
- The page loads https://reg.githubuniverse.com/flow/common/speaker/loadEventSpeakers?... That call needs a session CSRF header (`rfcsrf`), so a plain fetch gets `error.api.invalid.csrf.token`.
- **Easiest public JSON:** the RainFocus catalog API is a plain GET with no cookie and no CSRF. Max 50 per page, so paginate with `from=0,50,100,150`:
  - Speakers: https://events.githubuniverse.com/api/search?rfApiProfileId=m1QDSQXyImeQsjxLuOzWjFgzJDD7mlkU&type=speaker&size=50&from=0
  - Sessions (have date/time/room): https://events.githubuniverse.com/api/search?rfApiProfileId=m1QDSQXyImeQsjxLuOzWjFgzJDD7mlkU&type=session&size=50&from=0
  - Page 1 returns `sectionList[0].items`. Later pages return top-level `items`.
  - Speaker fields include fullName, jobTitle, companyName, photoURL, linkedIn (self-submitted), bio, and session[].sessionID.

## Files
- `event.json`: event facts
- `people.json`: 15 curated speakers (id, name, title, company, photo_url, photo_local, linkedin_url, bio, session, all_sessions, topics, sources[{url,title,date}], fetched_at)
- `all-speakers.json`: all 183 published speakers (lite) for the feed
- `photos/`: 15 official speaker headshots from static.rainfocus.com, resized to 400px JPG, for the demo only
- `seed.cypher`: FalkorDB seed with Event, Person, Company, Topic, and Article nodes. Edges are SPEAKS_AT, WORKS_AT, INTERESTED_IN, WROTE, and ATTENDS. Henry is `(:Person {id:'me'})`, interested in AI agents, anime IP, creator tools, and entertainment tech.
- `raw/`: full raw API dumps. `scripts/`: the capture script and build script.

## Notes
- `topics` are tags we assigned from each person's session and bio, not their own words.
- LinkedIn URLs come from each speaker's official Universe profile. Jay Parikh's comes from Stack Overflow's episode notes. Cassidy Williams and Martin Woodward are GAP.
- Load the graph: `cat seed.cypher | redis-cli -p 6379 -x GRAPH.QUERY copilot` won't work for many statements, so run it line by line instead:
  `while IFS= read -r l; do [[ $l == //* || -z $l ]] || redis-cli GRAPH.QUERY copilot "$l" >/dev/null; done < seed.cypher`
