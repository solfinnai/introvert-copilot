"""Build the "conference" graph on FalkorDB Cloud and run PASS/FAIL checks.
Reads FALKORDB_URL from .env. Data: GitHub Universe 2026 seed (public sources)."""
import json, os, pathlib, sys
from dotenv import load_dotenv
from falkordb import FalkorDB

ROOT = pathlib.Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
results = []
def check(name, ok, detail=""):
    results.append((name, ok, detail))

url = os.environ.get("FALKORDB_URL", "")
try:
    db = FalkorDB.from_url(url)
    ping = db.select_graph("conference").query("RETURN 1 AS ok").result_set[0][0]
    check("Connection", ping == 1, f"FALKORDB_URL from .env, TLS={url.startswith('falkors://')}, RETURN 1 -> {ping}")
except Exception as e:
    check("Connection", False, repr(e)); g = None

g = db.select_graph("conference")
try:
    g.delete()
except Exception:
    pass
g = db.select_graph("conference")

people = json.load(open(ROOT / "seed/github-universe-demo/people.json"))
for p in people:
    s = p.get("session") or {}
    g.query("""
      MERGE (sp:Speaker {id:$id}) SET sp.name=$name, sp.title=$title, sp.company=$company
      MERGE (t:Talk {title:$talk}) SET t.date=$date, t.start=$start
      MERGE (r:Room {name:$room})
      MERGE (sp)-[:PRESENTS]->(t)
      MERGE (t)-[:IN_ROOM]->(r)
      WITH t UNWIND $topics AS tp
        MERGE (to:Topic {name:tp})
        MERGE (t)-[:ABOUT]->(to)
    """, {"id": p["id"], "name": p["name"], "title": p.get("title",""), "company": p.get("company",""),
          "talk": s.get("title") or f"Session by {p['name']}", "date": s.get("date",""), "start": s.get("start",""),
          "room": s.get("room") or "Room TBD", "topics": p.get("topics") or ["General"]})

# Attendees: Henry plus two clearly labeled demo attendees
all_topics = [r[0] for r in g.query("MATCH (t:Topic) RETURN t.name ORDER BY t.name").result_set]
g.query("""
  MERGE (me:Attendee {id:'me'}) SET me.name='Henry Finn'
  MERGE (a:Attendee {id:'demo-a'}) SET a.name='Demo Attendee A (example)'
  MERGE (b:Attendee {id:'demo-b'}) SET b.name='Demo Attendee B (example)'
  MERGE (me)-[:MET]->(a)
  MERGE (me)-[:MET]->(b)
""")
for i, tp in enumerate(all_topics[:6]):
    who = "me" if i < 2 else ("demo-a" if i < 4 else "demo-b")
    g.query("MATCH (x:Attendee {id:$w}), (t:Topic {name:$tp}) MERGE (x)-[:INTERESTED_IN]->(t)", {"w": who, "tp": tp})

nodes = g.query("MATCH (n) RETURN labels(n)[0] AS l, count(*) ORDER BY l").result_set
edges = g.query("MATCH ()-[r]->() RETURN type(r) AS t, count(*) ORDER BY t").result_set
n_total = sum(c for _, c in nodes); e_total = sum(c for _, c in edges)
labels = {l for l, _ in nodes}; types = {t for t, _ in edges}
need_l = {"Talk","Speaker","Topic","Room","Attendee"}; need_t = {"PRESENTS","ABOUT","IN_ROOM","INTERESTED_IN","MET"}
check("Data", need_l <= labels and need_t <= types and n_total > 0,
      f"{n_total} nodes ({', '.join(f'{l} {c}' for l,c in nodes)}); {e_total} edges ({', '.join(f'{t} {c}' for t,c in edges)})")

# Multi-hop: which speaker should Henry meet, through someone he already met?
Q = """
MATCH p = (me:Attendee {id:'me'})-[:MET]->(friend:Attendee)-[:INTERESTED_IN]->(topic:Topic)
          <-[:ABOUT]-(talk:Talk)<-[:PRESENTS]-(sp:Speaker)
MATCH (talk)-[:IN_ROOM]->(room:Room)
RETURN p, room.name LIMIT 5
"""
rows = g.query(Q).result_set
check("Path query", len(rows) > 0, f"{len(rows)} path(s), 5 hops each")
print("\nPaths (who to meet, and why):")
for p, room in rows:
    ns = p.nodes(); rs = p.edges()
    parts = [ns[0].properties.get("name") or ns[0].properties.get("title")]
    for r, n in zip(rs, ns[1:]):
        label = n.properties.get("name") or n.properties.get("title")
        parts.append(f"-[{r.relation}]-" + f"({label})")
    print("  " + " ".join(parts) + f"  | room: {room}")

print("\nChecklist:")
for name, ok, d in results:
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {d}")
sys.exit(0 if all(ok for _, ok, _ in results) else 1)
