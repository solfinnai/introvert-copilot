"""FalkorDB connectivity check.

Writes a uniquely named temporary graph, runs the checklist, then deletes only
that graph. The persistent conference graph is never selected or deleted.
Reads FALKORDB_URL from the environment or .env. The URL is never printed.
"""
import json
import os
import pathlib
import re
import secrets
import sys
import time

from dotenv import load_dotenv
from falkordb import FalkorDB

ROOT = pathlib.Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


def temp_graph_name():
    stamp = time.strftime("%Y%m%d%H%M%S")
    return f"ic_check_{stamp}_{secrets.token_hex(4)}"


def safe_detail(err, secret):
    text = repr(err)
    if secret:
        text = text.replace(secret, "[redacted]")
    text = re.sub(r"(falkors?|rediss?)://\S+", "[redacted]", text)
    return text[:180]


def finish():
    print("\nChecklist:")
    for name, ok, detail in results:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {detail}")
    return 0 if results and all(ok for _, ok, _ in results) else 1


def load_and_check(graph):
    people = json.load(open(ROOT / "seed/github-universe-demo/people.json"))
    for person in people:
        session = person.get("session") or {}
        graph.query(
            """
      MERGE (sp:Speaker {id:$id}) SET sp.name=$name, sp.title=$title, sp.company=$company
      MERGE (t:Talk {title:$talk}) SET t.date=$date, t.start=$start
      MERGE (r:Room {name:$room})
      MERGE (sp)-[:PRESENTS]->(t)
      MERGE (t)-[:IN_ROOM]->(r)
      WITH t UNWIND $topics AS tp
        MERGE (to:Topic {name:tp})
        MERGE (t)-[:ABOUT]->(to)
    """,
            {
                "id": person["id"],
                "name": person["name"],
                "title": person.get("title", ""),
                "company": person.get("company", ""),
                "talk": session.get("title") or f"Session by {person['name']}",
                "date": session.get("date", ""),
                "start": session.get("start", ""),
                "room": session.get("room") or "Room TBD",
                "topics": person.get("topics") or ["General"],
            },
        )

    topics = [row[0] for row in graph.query("MATCH (t:Topic) RETURN t.name ORDER BY t.name").result_set]
    graph.query(
        """
  MERGE (me:Attendee {id:'me'}) SET me.name='Henry Finn'
  MERGE (a:Attendee {id:'demo-a'}) SET a.name='Demo Attendee A (example)'
  MERGE (b:Attendee {id:'demo-b'}) SET b.name='Demo Attendee B (example)'
  MERGE (me)-[:MET]->(a)
  MERGE (me)-[:MET]->(b)
"""
    )
    for index, topic in enumerate(topics[:6]):
        who = "me" if index < 2 else ("demo-a" if index < 4 else "demo-b")
        graph.query(
            "MATCH (x:Attendee {id:$w}), (t:Topic {name:$tp}) MERGE (x)-[:INTERESTED_IN]->(t)",
            {"w": who, "tp": topic},
        )

    nodes = graph.query("MATCH (n) RETURN labels(n)[0] AS l, count(*) ORDER BY l").result_set
    edges = graph.query("MATCH ()-[r]->() RETURN type(r) AS t, count(*) ORDER BY t").result_set
    node_total = sum(count for _, count in nodes)
    edge_total = sum(count for _, count in edges)
    labels = {label for label, _ in nodes}
    types = {rel for rel, _ in edges}
    need_labels = {"Talk", "Speaker", "Topic", "Room", "Attendee"}
    need_types = {"PRESENTS", "ABOUT", "IN_ROOM", "INTERESTED_IN", "MET"}
    check(
        "Data",
        need_labels <= labels and need_types <= types and node_total > 0,
        f"{node_total} nodes ({', '.join(f'{label} {count}' for label, count in nodes)}); "
        f"{edge_total} edges ({', '.join(f'{rel} {count}' for rel, count in edges)})",
    )

    query = """
MATCH p = (me:Attendee {id:'me'})-[:MET]->(friend:Attendee)-[:INTERESTED_IN]->(topic:Topic)
          <-[:ABOUT]-(talk:Talk)<-[:PRESENTS]-(sp:Speaker)
MATCH (talk)-[:IN_ROOM]->(room:Room)
RETURN p, room.name LIMIT 5
"""
    rows = graph.query(query).result_set
    check("Path query", len(rows) > 0, f"{len(rows)} path(s), 5 hops each")
    print("\nPaths (who to meet, and why):")
    for path, room in rows:
        path_nodes = path.nodes()
        path_edges = path.edges()
        parts = [path_nodes[0].properties.get("name") or path_nodes[0].properties.get("title")]
        for rel, node in zip(path_edges, path_nodes[1:]):
            label = node.properties.get("name") or node.properties.get("title")
            parts.append(f"-[{rel.relation}]-({label})")
        print("  " + " ".join(parts) + f"  | room: {room}")


def main():
    url = os.environ.get("FALKORDB_URL", "")
    name = temp_graph_name()
    graph = None
    try:
        if not url:
            check("Connection", False, "FALKORDB_URL unset")
        else:
            connected = False
            try:
                db = FalkorDB.from_url(url)
                graph = db.select_graph(name)
                ping = graph.query("RETURN 1 AS ok").result_set[0][0]
                tls = url.startswith("falkors://") or url.startswith("rediss://")
                connected = ping == 1
                check("Connection", connected, f"temp graph {name}, TLS={tls}, RETURN 1 -> {ping}")
            except Exception as err:
                check("Connection", False, safe_detail(err, url))
            if connected:
                try:
                    load_and_check(graph)
                except Exception as err:
                    check("Data", False, safe_detail(err, url))
    finally:
        if graph is not None:
            try:
                graph.delete()
                check("Cleanup", True, f"deleted temp graph {name}")
            except Exception as err:
                check("Cleanup", False, safe_detail(err, url))
    return finish()


if __name__ == "__main__":
    sys.exit(main())
