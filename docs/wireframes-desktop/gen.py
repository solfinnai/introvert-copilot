import json, random, os, base64
from playwright.sync_api import sync_playwright
BASE='/workspace/research/luma-win/github-universe-demo/'
P={p['id']:p for p in json.load(open(BASE+'people.json'))}
def img(pid):
    f=BASE+'photos/'+pid+'.jpg'
    if os.path.exists(f): return 'data:image/jpeg;base64,'+base64.b64encode(open(f,'rb').read()).decode()
    return ''
def av(pid,s=40):
    return f'<img class="av" style="width:{s}px;height:{s}px" src="{img(pid)}">'
random.seed(4)
def qr(size=200,n=25):
    cells=''.join(f'<i style="background:{"#111" if random.random()<.5 else "#fff"}"></i>' for _ in range(n*n))
    return f'<div class="qr" style="width:{size}px;height:{size}px;grid-template-columns:repeat({n},1fr)">{cells}</div>'
CSS='''*{box-sizing:border-box;margin:0;padding:0}body{width:1440px;height:900px;font-family:"Inter","IBM Plex Sans","Helvetica Neue",Arial,sans-serif;font-size:13px;color:#222;background:#f4f4f4;display:flex;overflow:hidden}
.side{width:224px;background:#e6e6e6;border-right:1px solid #bbb;padding:18px 12px;display:flex;flex-direction:column;gap:3px}
.logo{font-weight:700;font-size:16px;margin:0 8px 18px}.logo small{display:block;font-weight:400;font-size:11px;color:#666}
.nav{padding:9px 10px;border-radius:6px;color:#444;display:flex;gap:10px;align-items:center}.nav b{width:14px;height:14px;border:1.5px solid #777;border-radius:3px;display:inline-block}
.nav.on{background:#fff;border:1px solid #aaa;font-weight:600;color:#000}.nav.on b{background:#333;border-color:#333}
.sidefoot{margin-top:auto;font-size:11px;color:#666;border-top:1px solid #bbb;padding:10px 8px}
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.top{height:56px;background:#fff;border-bottom:1px solid #bbb;display:flex;align-items:center;padding:0 22px;gap:14px}
.sel{border:1px solid #999;border-radius:6px;padding:7px 12px;font-weight:600}.sel:after{content:" v";color:#888}
.pill{border:1px dashed #777;border-radius:20px;padding:4px 11px;font-size:11px;color:#444}
.btn{border:1px solid #888;border-radius:6px;padding:7px 13px;background:#fff;font-weight:500;display:inline-block}.btn.pri{background:#222;color:#fff;border-color:#222}
.sp{flex:1}.content{flex:1;padding:22px;display:grid;gap:18px;min-height:0;overflow:hidden}
.card{background:#fff;border:1px solid #bbb;border-radius:8px;padding:16px;min-height:0;overflow:hidden}
h1{font-size:22px;margin-bottom:2px}h2{font-size:14px;margin-bottom:10px;text-transform:uppercase;letter-spacing:.04em;color:#555}h3{font-size:14px;margin-bottom:4px}
.muted{color:#777;font-size:12px}.av{border-radius:50%;object-fit:cover;background:#ccc;filter:grayscale(1);flex:none}
.row{display:flex;gap:10px;align-items:center}.col{display:flex;flex-direction:column;gap:8px}
.chip{display:inline-block;border:1px solid #999;border-radius:14px;padding:3px 10px;font-size:11px;margin:2px 4px 2px 0;background:#fafafa}.chip.on{background:#333;color:#fff}
.src{display:inline-block;border:1px solid #bbb;background:#eee;border-radius:3px;padding:1px 6px;font-size:10px;margin-right:4px}
.gap{display:inline-block;border:1px dashed #555;padding:1px 6px;font-size:10px;font-weight:700;border-radius:3px}
.conf{font-size:10px;font-weight:700;border:1px solid #444;border-radius:3px;padding:1px 5px}
.line{height:9px;background:#ddd;border-radius:3px;margin:6px 0}.line.s{width:60%}.line.m{width:80%}
.input{border:1px solid #999;border-radius:6px;padding:9px 11px;background:#fff;color:#888}
.qr{display:grid;border:8px solid #fff;outline:1px solid #999}
.box{border:1px dashed #999;border-radius:6px;padding:10px}
.ann{position:absolute;background:#fff8c4;border:1px solid #cbb94a;font-size:11px;padding:3px 7px;border-radius:3px;color:#5a4d00}
code,pre{font-family:"IBM Plex Mono",Menlo,monospace;font-size:11px}pre{background:#eee;border:1px solid #ccc;border-radius:6px;padding:10px;white-space:pre-wrap}
.li{padding:9px 0;border-bottom:1px solid #e3e3e3}
'''
NAV=['Home','Know yourself','Event feed','Who to meet','Agent chat','Notes','Follow-ups','Debrief']
def page(active,title,body,cols,extra=''):
    nav=''.join(f'<div class="nav {"on" if n==active else ""}"><b></b>{n}</div>' for n in NAV)
    return f'''<html><head><style>{CSS}</style></head><body><div class="side"><div class="logo">Introvert Co-pilot<small>Conference co-pilot for introverts</small></div>{nav}<div class="sidefoot">Powered by Bright Data, FalkorDB,<br>OpenAI, TrueForge. Reviewed by Qodo.</div></div>
<div class="main"><div class="top"><div class="sel">GitHub Universe 2026</div><span class="muted">Oct 28-29, Fort Mason Center, SF</span><span class="pill">Open demo, no login</span><div class="sp"></div><b style="font-size:15px">{title}</b><div class="sp"></div><span class="muted">session sid: 7f3a...</span><span class="btn">Reset demo</span></div>
<div class="content" style="grid-template-columns:{cols}">{body}</div></div>{extra}</body></html>'''
def pcard(pid,why,small=False):
    p=P[pid]
    return f'''<div class="card" style="padding:12px"><div class="row">{av(pid,52)}<div><h3>{p["name"]}</h3><div class="muted">{p["title"][:38]}</div><div class="muted"><b>{p["company"][:30]}</b></div></div></div><div style="margin-top:8px;font-size:12px"><b>Why meet:</b> {why}</div><div style="margin-top:6px">{"".join(f'<span class="chip">{t}</span>' for t in p["topics"][:2])}</div></div>'''
S={}
top5=[('maggie-appleton','tools for thought + interface design, like you'),('kent-c-dodds','MCP builder, shares your web dev focus'),('qianqian-ye','creator tools and arts tech overlap'),('mina-tawadrous','entertainment tech, close to Animori'),('jake-albaugh','design tools + MCP, knows Figma community')]
S['01-home']=page('Home','Home',f'''
<div class="col" style="gap:18px"><div class="card" style="text-align:center">{av('x',96).replace('src=""','src=""')}<h1 style="margin-top:10px">Henry Finn</h1><div class="muted">Founder, Unicorn Studios / Animori</div><p style="margin:10px 0">"I build AI tools for anime and creator IP. Ask me about agents that remember."</p><div class="box" style="text-align:left;margin-bottom:14px"><b>Goal for this event:</b> 3 good conversations, not 30</div><div style="display:flex;justify-content:center">{qr(230)}</div><div class="muted" style="margin:8px 0">Scan to open my LinkedIn</div><span class="btn pri">Show QR fullscreen</span> <span class="btn">Copy link</span></div></div>
<div class="col" style="gap:18px"><div class="card"><h2>Today's plan</h2><div class="row" style="gap:12px">
{"".join(f'<div class="box" style="flex:1"><b>{t}</b><div class="muted">{d}</div></div>' for t,d in [('11:15 AM','Main Stage: Humans set direction (Mario Rodriguez)'),('12:30 PM','Energy break, 20 min quiet'),('2:00 PM','GitHub Next session, meet Maggie after'),('4:00 PM','Debrief + follow-ups')])}</div>
<div style="margin-top:10px" class="row"><span class="muted">Social battery</span><div style="flex:1;height:10px;border:1px solid #888;border-radius:5px"><div style="width:70%;height:100%;background:#555;border-radius:5px"></div></div><b>70%</b></div></div>
<div class="card"><div class="row"><h2 style="margin:0">Top 5 to meet</h2><div class="sp"></div><span class="muted">ranked by FalkorDB graph</span></div>
{"".join(f'<div class="row li">{av(i,40)}<div style="flex:1"><b>{P[i]["name"]}</b> <span class="muted">{P[i]["title"][:40]}, {P[i]["company"][:24]}</span><div style="font-size:12px">{w}</div></div><span class="btn">Open card</span></div>' for i,w in top5)}</div>
<div class="card"><div class="row"><h2 style="margin:0">Pre-event brief</h2><div class="sp"></div><span class="muted">2 min read</span><span class="btn pri">Read brief</span></div><div class="line"></div><div class="line m"></div><div class="line s"></div></div></div>''','400px 1fr')

qs=['What drains you at events?','What gives you energy?','Your goal for this event','What are you offering?','Topics you love talking about']
S['02-know-yourself']=page('Know yourself','Know yourself',f'''
<div class="card col"><h2>Step 1: tell us about you</h2><label class="muted">Your LinkedIn URL</label><div class="row"><div class="input" style="flex:1">linkedin.com/in/henryfinn</div><span class="btn">Scrape with Bright Data</span></div><span class="muted">fetched_at 2026-10-24 10:52 AM PT</span>
{"".join(f'<label style="margin-top:6px"><b>{i+1}. {q}</b></label><div class="input" style="height:{44 if i!=4 else 36}px">Type your answer...</div>' for i,q in enumerate(qs))}
<div style="margin-top:8px"><span class="btn pri">Build my profile</span></div></div>
<div class="card col"><div class="row"><h2 style="margin:0">Your self-profile</h2><div class="sp"></div><span class="chip">OpenAI structured output</span><span class="chip">saved to FalkorDB as (:Me)</span></div>
<div class="row" style="gap:14px;align-items:stretch"><div class="box" style="flex:1"><h3>Social style</h3><b>Deep-diver.</b> Best one on one, warms up with builders.<div class="line m"></div></div><div class="box" style="flex:1"><h3>Strengths</h3><span class="chip">Storytelling</span><span class="chip">Product taste</span><span class="chip">AI + IP</span><div class="line s"></div></div></div>
<div class="box"><h3>Your 15-second intro</h3><p style="font-size:15px">"I'm Henry. I run Unicorn Studios. We build AI tools that help anime and creator IP reach fans. Right now I'm into agents with long memory."</p><div style="margin-top:6px"><span class="btn">Regenerate</span> <span class="btn">Edit</span></div></div>
<div class="row" style="gap:14px;align-items:stretch"><div class="box" style="flex:1"><h3>Safe topics</h3><span class="chip">anime IP</span><span class="chip">AI agents</span><span class="chip">creator tools</span><span class="chip">MCP</span></div><div class="box" style="flex:1"><h3>Energy notes</h3><div class="muted">Drained by: loud crowds, small talk</div><div class="muted">Energized by: demos, 1:1 builder chats</div></div></div>
<div class="box"><h3>Sources</h3><span class="src">LinkedIn 10:52 AM</span><span class="src">Your answers</span><span class="gap">GAP: no recent posts found</span></div></div>''','520px 1fr')

feed=['mario-rodriguez','maggie-appleton','kent-c-dodds','angela-jiang','idan-gazit','john-maeda','qianqian-ye','jake-albaugh']
whys={'mario-rodriguez':'Leads GitHub AI agents strategy','maggie-appleton':'Tools for thought, like you','kent-c-dodds':'Builds MCP apps, web dev','angela-jiang':'Claude Platform, MCP overlap','idan-gazit':'GitHub Next, creative tools','john-maeda':'Design + creative coding','qianqian-ye':'Creator tools, arts tech','jake-albaugh':'Figma MCP, creator tools'}
def drawer():
    p=P['maggie-appleton']
    return f'''<div class="card col" style="grid-row:1/3;grid-column:2"><div class="row"><h2 style="margin:0">Preview</h2><div class="sp"></div><span class="muted">x</span></div><div style="text-align:center">{av('maggie-appleton',96)}<h3 style="margin-top:8px">{p["name"]}</h3><div class="muted">{p["title"]}, {p["company"]}</div></div><div class="box"><b>Session</b><div class="muted">{p["session"]["title"]}</div><div class="muted">Oct 28, {p["session"]["start"]}</div></div><div class="box"><b>Why you two</b><div style="font-size:12px">You: tools for thought, creator tools. Her: interface design, tools for thought.</div></div>{"".join(f'<span class="chip">{t}</span>' for t in p["topics"])}<div class="line"></div><div class="line m"></div><span class="btn pri">Deep profile</span><span class="btn">Add to my plan</span></div>'''
feedbody=f'''<div class="col" style="gap:14px;min-height:0"><div class="card"><div class="row"><div class="input" style="flex:1">https://githubuniverse.com/speakers</div><span class="btn pri">Load event</span></div><div class="row" style="margin-top:8px"><span class="chip on">Scraped live with Bright Data</span><span class="muted">183 speakers, 157 sessions. fetched_at 2026-10-24 10:41 AM PT</span><div class="sp"></div><span class="muted">Live scrapes left: 4 of 5</span></div></div>
<div class="row"><span class="chip on">Should meet</span><span class="chip">AI agents</span><span class="chip">MCP</span><span class="chip">Creator tools</span><span class="chip">Open source</span><span class="chip">Entertainment tech</span><span class="chip">Already met</span><div class="sp"></div><div class="input" style="width:220px;padding:6px 10px">Search people...</div></div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">{"".join(pcard(i,whys[i]).replace('class="card"','class="card" style="padding:12px;'+('outline:2px solid #222;' if i=='maggie-appleton' else '')+'"',1) for i in feed)}</div></div>'''
S['03-event-feed']=page('Event feed','Event feed',feedbody+drawer(),'1fr 320px')

cands=[('maggie-appleton','Staff Research Engineer, GitHub','London, UK','Matches session speaker + LinkedIn',True),('','Maggie Appleton, Marketing Lead','Austin, TX','Same name, different company',False),('','M. Appleton, Designer','Toronto, CA','Weak match',False)]
modal='<div style="position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center"><div class="card" style="width:760px;padding:24px"><div class="row"><h1>Is this the right person?</h1><div class="sp"></div><span class="muted">x</span></div><p class="muted" style="margin:4px 0 16px">We found 3 public matches for "Maggie Appleton". Pick one before we build a deep profile. Public sources only.</p>'+''.join(f'<div class="row box" style="margin-bottom:10px;{"border:2px solid #222" if s else ""}">{av(i,64) if i else "<div class=av style=width:64px;height:64px></div>"}<div style="flex:1"><h3>{t.split(",")[0] if not i else "Maggie Appleton"}</h3><div class="muted">{t}</div><div class="muted">{l}</div><div style="font-size:12px;margin-top:4px">{n}</div></div><span class="conf">{"HIGH" if s else "LOW"}</span><span class="btn {"pri" if s else ""}">{"Yes, this one" if s else "Select"}</span></div>' for i,t,l,n,s in cands)+'<div class="row" style="margin-top:8px"><span class="muted">Search via Bright Data SERP, fetched 11:02 AM PT</span><div class="sp"></div><span class="btn">None of these</span></div></div></div>'
S['04-identity-confirm']=page('Event feed','Event feed',feedbody+drawer(),'1fr 320px',modal)

p=P['maggie-appleton']
secs=[('Communication style','HIGH','Visual thinker. Explains with sketches and essays. Prefers concrete examples over hype.',['maggieappleton.com','Universe bio']),('Values and motivations','MED','Thoughtful tools, human agency, craft over speed.',['Essay Jun 2026','Podcast Mar 2026']),('What she is working on now','HIGH','GitHub Next prototypes for AI-assisted software. Speaking on tomorrow\'s tools.',['Universe session','GitHub Next blog']),('How to pitch to her','MED','Lead with a design question about agent memory, not a product pitch.',['Inferred from essays']),('Topics to avoid','LOW',None,[])]
S['05-deep-profile']=page('Event feed','Deep profile',f'''
<div class="card col"><div style="text-align:center">{av('maggie-appleton',110)}<h1 style="margin-top:8px;font-size:19px">{p["name"]}</h1><div class="muted">{p["title"]}</div><div class="muted"><b>{p["company"]}</b></div></div><span class="chip on" style="text-align:center">Identity confirmed</span><div class="box"><b>Session</b><div class="muted">{p["session"]["title"]}</div><div class="muted">Oct 28, {p["session"]["start"]}</div></div><h2 style="margin-top:6px">Sources (7)</h2>
{"".join(f'<div class="li" style="padding:6px 0"><b style="font-size:12px">{a}</b><div class="muted">{b}</div></div>' for a,b in [('LinkedIn profile','Bright Data, Oct 24 10:58 AM'),('Universe speaker page','Web Unlocker, Oct 24 10:41 AM'),('maggieappleton.com essay','Jun 2026'),('Podcast interview','Mar 2026'),('GitHub Next blog','Sep 2026'),('Latest post','Oct 21, 2026')])}<span class="muted">Public sources only. Delete on request.</span></div>
<div class="card col" style="gap:10px"><div class="row"><h2 style="margin:0">Communication profile</h2><div class="sp"></div><span class="muted">Not a psychological diagnosis</span></div>
{"".join(f'<div class="box"><div class="row"><h3 style="margin:0">{t}</h3><div class="sp"></div><span class="conf">{c}</span></div><p style="margin:6px 0">{x if x else "<span class=gap>GAP: not enough public evidence</span>"}</p>{"".join(f"<span class=src>{s}</span>" for s in srcs)}</div>' for t,c,x,srcs in secs)}</div>
<div class="col" style="gap:14px"><div class="card"><div class="row"><h2 style="margin:0">Talking points</h2><div class="sp"></div><span class="btn">Refresh</span></div>{"".join(f'<div class="li">{i+1}. {t}</div>' for i,t in enumerate(['Agents that remember: her tools-for-thought work vs your graph memory','Interface design for AI in creative IP','Her GitHub Next session on Oct 28']))}</div>
<div class="card"><h2>Opener</h2><p>"Your talk on tomorrow's tools got me thinking. How do you sketch an agent's memory?"</p></div>
<div class="card"><h2>Icebreaker from latest post</h2><div class="muted">Post, Oct 21 2026 <span class="src">source</span></div><p>"I saw your post about local-first AI notes..."</p></div>
<div class="card"><h2>Exit line</h2><p>"I don't want to take all your time. Can I send you the demo?"</p></div><span class="muted">Last refreshed 11:03 AM PT</span></div>''','300px 1fr 340px')

# graph svg
nodes=[('ME',480,230,'Henry (me)',44)]
topics=[('AI agents',300,120),('MCP',660,110),('creator tools',700,330),('tools for thought',290,350)]
ppl=[('maggie-appleton',140,250),('kent-c-dodds',820,200),('jake-albaugh',840,420),('qianqian-ye',560,450),('angela-jiang',470,60),('idan-gazit',130,430)]
edges=[(480,230,x,y) for _,x,y in topics]+[(140,250,300,120),(140,250,290,350),(820,200,660,110),(840,420,700,330),(840,420,660,110),(560,450,700,330),(470,60,660,110),(470,60,300,120),(130,430,290,350)]
svg='<svg width="100%" height="100%" viewBox="0 0 960 520">'+''.join(f'<line x1="{a}" y1="{b}" x2="{c}" y2="{d}" stroke="{"#111" if (a,b,c,d) in [(480,230,290,350),(140,250,290,350)] else "#aaa"}" stroke-width="{3 if (a,b,c,d) in [(480,230,290,350),(140,250,290,350)] else 1.5}"/>' for a,b,c,d in edges)
svg+=''.join(f'<rect x="{x-62}" y="{y-14}" width="124" height="28" rx="14" fill="#eee" stroke="#666"/><text x="{x}" y="{y+4}" text-anchor="middle" font-size="12">{t}</text>' for t,x,y in topics)
for i,x,y in ppl:
    svg+=f'<clipPath id="c{i}"><circle cx="{x}" cy="{y}" r="26"/></clipPath><image href="{img(i)}" x="{x-26}" y="{y-26}" width="52" height="52" clip-path="url(#c{i})" style="filter:grayscale(1)"/><circle cx="{x}" cy="{y}" r="26" fill="none" stroke="#333" stroke-width="2"/><text x="{x}" y="{y+42}" text-anchor="middle" font-size="12" font-weight="600">{P[i]["name"]}</text>'
svg+='<circle cx="480" cy="230" r="40" fill="#222"/><text x="480" y="235" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">ME</text><text x="480" y="290" text-anchor="middle" font-size="12">Henry</text></svg>'
rank=[('maggie-appleton','92','Me > tools for thought < Maggie'),('kent-c-dodds','88','Me > MCP < Kent'),('jake-albaugh','85','Me > creator tools, MCP < Jake'),('qianqian-ye','81','Me > creator tools < Qianqian'),('angela-jiang','77','Me > AI agents, MCP < Angela'),('idan-gazit','72','Me > tools for thought < Idan')]
S['06-who-to-meet']=page('Who to meet','Who to meet',f'''
<div class="col" style="gap:14px;min-height:0"><div class="card" style="flex:1;padding:8px;position:relative"><div class="row" style="position:absolute;left:14px;top:12px"><span class="chip on">FalkorDB graph: copilot_7f3a</span><span class="chip">People</span><span class="chip">Topics</span><span class="chip">Hide already met</span></div><div style="position:absolute;right:14px;top:12px" class="muted">Highlighted: path to Maggie Appleton</div>{svg}</div>
<div class="card" style="height:170px"><div class="row"><h2 style="margin:0">Cypher query</h2><div class="sp"></div><span class="muted">14 ms, 6 rows</span><span class="btn">Copy</span></div><pre style="margin-top:8px">MATCH (me:Person {{sid:$sid, isMe:true}})-[:INTERESTED_IN]->(t:Topic)&lt;-[:INTERESTED_IN]-(p:Person)
WHERE NOT (me)-[:MET]->(p)
RETURN p.name, collect(t.name) AS shared, count(t) AS score ORDER BY score DESC LIMIT 6</pre></div></div>
<div class="card col"><h2>Ranked: who to meet</h2>{"".join(f'<div class="li row">{av(i,40)}<div style="flex:1"><b>{P[i]["name"]}</b><div class="muted">{P[i]["company"][:26]}</div><div style="font-size:11px"><code>{w}</code></div></div><b>{s}</b></div>' for i,s,w in rank)}<span class="btn pri">Open top match</span></div>''','1fr 340px')

msgs=[('u','Who should I talk to next?'),('a','Maggie Appleton. You both care about tools for thought, and she speaks at the GitHub Next session at 2:00 PM. You have not met her yet. Want a 30-second prep?'),('u','What did I promise Kent?'),('a','You told Kent C. Dodds you would send him the Co-pilot demo link and your MCP memory notes by Monday. Logged 10:20 AM from your notes.'),('u','I just met Jake, he is into Figma MCP and creator tools'),('a','Saved. Added (Henry)-[:MET]->(Jake Albaugh) with topics MCP and creator tools. He is now hidden from "who to meet".')]
chat=''.join(f'<div style="display:flex;justify-content:{"flex-end" if r=="u" else "flex-start"};margin:8px 0"><div style="max-width:70%;padding:10px 13px;border-radius:10px;{"background:#333;color:#fff" if r=="u" else "background:#eee;border:1px solid #ccc"}">{t}{"<div class=muted style=margin-top:6px>Memory used: 2 nodes, 1 path. Tool: find_people</div>" if r=="a" else ""}</div></div>' for r,t in msgs)
S['07-agent-chat']=page('Agent chat','Agent chat',f'''
<div class="card" style="display:flex;flex-direction:column"><div class="row"><h2 style="margin:0">Ask your co-pilot</h2><div class="sp"></div><span class="chip">OpenAI tool calling</span><span class="chip">Runs on TrueForge if go</span></div><div style="flex:1;overflow:hidden">{chat}</div>
<div class="row" style="margin:8px 0"><span class="chip">Next person</span><span class="chip">What do I owe</span><span class="chip">Prep me</span><span class="chip">Recap</span></div><div class="row"><div class="input" style="flex:1">Ask about people, promises, or log a meeting...</div><span class="btn pri">Send</span></div></div>
<div class="card col"><div class="row"><h2 style="margin:0">Memory used</h2><div class="sp"></div><span class="chip on">FalkorDB memory</span></div><div class="muted">For last answer: "I just met Jake..."</div>
<div class="box"><b>Tool calls</b><div><code>log_meeting("Jake Albaugh", ["MCP","creator tools"])</code></div><div><code>get_person("Jake Albaugh")</code></div></div>
<div class="box"><b>Graph path</b><div class="row" style="margin-top:8px;flex-wrap:wrap"><span class="chip on">Henry</span>-MET-&gt;<span class="chip">Jake Albaugh</span>-INTERESTED_IN-&gt;<span class="chip">MCP</span>&lt;-<span class="chip">Kent C. Dodds</span></div></div>
<b>Cypher</b><pre>MATCH (me:Person {{sid:$sid,isMe:true}}), (p:Person {{name:$name}})
MERGE (me)-[m:MET]->(p) SET m.at=timestamp()
WITH p UNWIND $topics AS t
MERGE (tp:Topic {{name:t}}) MERGE (p)-[:INTERESTED_IN]->(tp)</pre>
<div class="box"><b>Chat memory</b><div class="muted">(:Message) nodes saved: 6. Linked [:ABOUT] to Maggie, Kent, Jake</div></div><span class="btn">Open in graph view</span></div>''','1fr 440px')

k=P['kent-c-dodds']
S['08-notes']=page('Notes','Notes',f'''
<div class="col" style="gap:14px"><div class="card row">{av('kent-c-dodds',64)}<div style="flex:1"><h1>{k["name"]}</h1><div class="muted">{k["title"]}, {k["company"]}. Met Oct 28, 10:12 AM near Festival Pavilion</div></div><span class="btn">Open profile</span><span class="btn">Ask co-pilot</span></div>
<div class="card" style="flex:1;display:flex;flex-direction:column"><div class="row"><h2 style="margin:0">Notes</h2><div class="sp"></div><span class="btn">Voice note (later)</span></div><div class="box" style="flex:1;margin-top:8px;font-size:14px;line-height:1.7">Talked about MCP servers for memory. He is building kody.codes. Thinks most agent demos skip real persistence.<br>Promised: send Co-pilot demo link + my FalkorDB notes by Monday.<br>He offered to intro me to someone on the MCP spec team.<br><span style="color:#aaa">|</span></div><div class="row" style="margin-top:10px"><span class="muted">Autosaved 10:20 AM PT</span><div class="sp"></div><span class="btn pri">Extract and save to graph</span></div></div></div>
<div class="col" style="gap:14px"><div class="card col"><div class="row"><h2 style="margin:0">Extracted</h2><div class="sp"></div><span class="chip">OpenAI</span></div>
<div class="box"><b>Cares about</b><div><span class="chip">MCP</span><span class="chip">agent persistence</span><span class="chip">dev education</span></div></div>
<div class="box"><b>I promised</b><div>Send demo link + FalkorDB notes <span class="chip">due Mon Nov 2</span></div></div>
<div class="box"><b>Next step</b><div>Follow up Monday, ask for MCP spec intro</div></div>
<div class="box"><b>They offered</b><div>Intro to MCP spec team</div></div><span class="muted">Saved as (Henry)-[:MET]->(Kent C. Dodds)</span></div>
<div class="card col"><h2>How did it go?</h2><div class="row">{"".join(f'<span class="btn {"pri" if i==4 else ""}">{i}</span>' for i in range(1,6))}<span class="muted">conversation quality</span></div><h2 style="margin-top:8px">Energy after</h2><div class="row"><span class="muted">Drained</span><div style="flex:1;height:8px;background:#ddd;border-radius:4px;position:relative"><div style="position:absolute;left:62%;top:-5px;width:18px;height:18px;border-radius:50%;background:#333"></div></div><span class="muted">Energized</span></div></div></div>''','1fr 420px')

drafts=[('kent-c-dodds','Demo link + FalkorDB notes','Due Mon'),('maggie-appleton','Thanks for the sketching tip','Draft'),('jake-albaugh','Figma MCP follow-up','Draft'),('mario-rodriguez','Question from keynote','Denied')]
S['09-followups']=page('Follow-ups','Follow-ups',f'''
<div class="card col"><h2>Drafts (4)</h2>{"".join(f'<div class="row box" style="{"border:2px solid #222" if j==0 else ""}">{av(i,36)}<div style="flex:1"><b>{P[i]["name"]}</b><div class="muted">{s}</div></div><span class="chip">{st}</span></div>' for j,(i,s,st) in enumerate(drafts))}</div>
<div class="col" style="gap:14px"><div class="card" style="background:#e8e8e8;border-style:dashed"><b>Runs on TrueForge, approval required, sending disabled in demo.</b> <span class="muted">Agent drafts only. Nothing leaves this app without a human click, and the public demo never sends.</span></div>
<div class="card" style="flex:1;display:flex;flex-direction:column"><div class="row">{av('kent-c-dodds',44)}<div><b>To: Kent C. Dodds</b><div class="muted">via LinkedIn message (copy) </div></div><div class="sp"></div><span class="chip">in your voice</span></div><div class="input" style="margin:12px 0;color:#222">Subject: The Co-pilot demo + my FalkorDB memory notes</div>
<div class="box" style="flex:1;font-size:14px;line-height:1.7;color:#222">Hey Kent,<br><br>Great talking MCP and agent persistence by the Festival Pavilion. As promised, here is the Co-pilot demo and my notes on using FalkorDB as agent memory.<br><br>If the MCP spec intro is still on the table, I would love that.<br><br>Henry</div>
<div class="row" style="margin-top:12px"><span class="muted">Built from: profile, notes 10:20 AM, promise due Mon</span><div class="sp"></div><span class="btn">Regenerate</span><span class="btn">Edit</span><span class="btn">Deny</span><span class="btn pri">Approve</span></div></div></div>
<div class="card col"><h2>Agent trace</h2>{"".join(f'<div class="li"><code>{t}</code></div>' for t in ['get_person(Kent C. Dodds)','get_notes(Kent)','get_promises(Kent)','draft_message()','request_approval() WAITING'])}<h2 style="margin-top:10px">Reminders</h2><div class="box">Mon Nov 2: send demo to Kent</div></div>''','300px 1fr 280px')

pts=[(0,70),(1,64),(2,55),(3,60),(4,40),(5,32),(6,38),(7,25)]
chart='<svg width="100%" height="190" viewBox="0 0 520 190"><line x1="30" y1="170" x2="510" y2="170" stroke="#999"/><line x1="30" y1="10" x2="30" y2="170" stroke="#999"/><polyline fill="none" stroke="#222" stroke-width="3" points="'+' '.join(f'{40+x*65},{170-y*2}' for x,y in pts)+'"/>'+''.join(f'<circle cx="{40+x*65}" cy="{170-y*2}" r="4" fill="#222"/><text x="{40+x*65}" y="186" font-size="10" text-anchor="middle">{["9am","10","11","12","1pm","2","3","4"][x]}</text>' for x,y in pts)+'<line x1="300" y1="10" x2="300" y2="170" stroke="#999" stroke-dasharray="4"/><text x="305" y="22" font-size="10">dip after 1 PM</text></svg>'
S['10-debrief']=page('Debrief','Debrief',f'''
<div class="col" style="gap:16px;grid-column:1/3"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">{"".join(f'<div class="card"><div class="muted">{a}</div><div style="font-size:30px;font-weight:700">{b}</div><div class="muted">{c}</div></div>' for a,b,c in [('People met','4','goal was 3'),('Promises owed','3','1 due Monday'),('Follow-ups approved','1 of 4','sending disabled in demo'),('Avg conversation','4.2 / 5','best: Kent, Maggie')])}</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:16px"><div class="card"><h2>Who I met</h2>{"".join(f'<div class="li row">{av(i,34)}<div style="flex:1"><b>{P[i]["name"]}</b><div class="muted">{t}</div></div><span>{r}/5</span></div>' for i,t,r in [('kent-c-dodds','10:12 AM, MCP','5'),('maggie-appleton','2:40 PM, tools for thought','5'),('jake-albaugh','11:50 AM, Figma MCP','4'),('qianqian-ye','3:30 PM, creator tools','3')])}</div>
<div class="card"><h2>What I owe</h2>{"".join(f'<div class="li"><b>{a}</b><div class="muted">{b}</div></div>' for a,b in [('Kent C. Dodds','Demo link + FalkorDB notes. Due Mon'),('Maggie Appleton','Share agent memory sketch'),('Jake Albaugh','Try Figma MCP, send feedback')])}<h2 style="margin-top:12px">Still to meet</h2>{av('angela-jiang',30)} {av('idan-gazit',30)} <span class="muted">Angela Jiang, Idan Gazit</span></div>
<div class="card"><h2>Energy through the day</h2>{chart}</div></div>
<div class="card" style="border:2px dashed #555"><div class="row"><h2 style="margin:0">Self-insight</h2><span class="chip on">EXAMPLE</span><div class="sp"></div><span class="muted">Learns across events. Shown with cached example data.</span></div><p style="font-size:16px;margin-top:8px">"You do best one on one with builders. Your two 5/5 chats were before noon or right after a break. You ran out of energy after 2 PM, so put your top person in the morning next time."</p></div></div>''','1fr 1fr')

with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/google-chrome'); pg=b.new_page(viewport={'width':1440,'height':900})
    for n,h in S.items():
        open(f'html/{n}.html','w').write(h); pg.set_content(h); pg.wait_for_timeout(150); pg.screenshot(path=f'{n}.png')
    tiles=''.join(f'<div style="position:relative"><img src="file:///workspace/research/luma-win/wireframes-desktop/{n}.png" style="width:100%;border:1px solid #999"><div style="font:600 18px Arial;padding:6px 0">{n}</div></div>' for n in S)
    pg.set_viewport_size({'width':2400,'height':2000})
    pg.goto('file:///workspace/research/luma-win/wireframes-desktop/html/'+list(S)[0]+'.html')
    ov=f'<html><body style="margin:0;padding:30px;background:#fff;font-family:Arial"><h1 style="font-size:34px">Introvert Co-pilot desktop wireframes (1440x900), GitHub Universe 2026 demo</h1><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">{tiles}</div></body></html>'
    open('html/overview.html','w').write(ov); pg.goto('file:///workspace/research/luma-win/wireframes-desktop/html/overview.html'); pg.wait_for_timeout(500)
    pg.screenshot(path='wireframes-desktop-overview.png',full_page=True)
    b.close()
print('done')
