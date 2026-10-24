import json,re,html,datetime,urllib.request,os
FT=datetime.datetime.now().astimezone().isoformat(timespec='seconds')
S={x['sessionID']:x for x in json.load(open('raw/raw_sessions.json'))}
P={x['fullName']:x for x in json.load(open('raw/raw_speakers.json'))}
CAT='https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/speakers'
G='GAP'
picks={
'Mario Rodriguez':(['AI agents','developer tools','GitHub Copilot'],[('https://github.blog/news-insights/company-news/build-an-agent-into-any-app-with-the-github-copilot-sdk/','Build an agent into any app with the GitHub Copilot SDK','2026-01-22'),('https://github.blog/author/mariorod/','GitHub Copilot app: The agent-native desktop experience (author page)','2026-06-02')],None),
'Jay Parikh':(['AI agents','AI platforms','engineering leadership'],[('https://stackoverflow.blog/2026/07/10/building-more-than-just-an-agent-harness/','Building more than just an agent harness (Stack Overflow Podcast)','2026-07-10'),('https://review.firstround.com/the-fastest-way-to-learn-is-to-run-two-competing-bets-jay-parikh-evp-coreai-microsoft/','The fastest way to learn is to run two competing bets (First Round)','2026-08-27')],'https://www.linkedin.com/in/jayparikh/'),
'John Maeda':(['design','creative coding','AI agents','agentic experience'],[('https://johnmaeda.medium.com/design-in-tech-report-2026-from-ux-to-ax-f9d83164f4d2','Design in Tech Report 2026: From UX to AX','2026-03-18')],None),
'Idan Gazit':(['AI agents','developer tools','creative tools','research prototypes'],[('https://githubnext.com/talks/realtime-multiplayer-automation-and-you/','Realtime multiplayer, automation, and you! (AI Engineer World\'s Fair)','2026-07-02'),('https://githubnext.com/talks/','One Developer, Two Dozen Agents, Zero Alignment (AI Engineer London)','2026-04-09')],None),
'Maggie Appleton':(['AI agents','interface design','tools for thought'],[('https://maggieappleton.com/planning-agents','Planning with Agents: Divided Worlds, Boundary Objects, and Thicker Interfaces','2026-09-14'),('https://maggieappleton.com/now-2026-08/','Now: August 2026','2026-08')],None),
'Kent C. Dodds':(['AI agents','MCP','web development','developer education'],[('https://kentcdodds.com/blog/introducing-kody-your-personal-software-factory','Introducing Kody: Your Personal Software Factory','2026-09-08')],None),
'Angie Jones':(['AI agents','open source','open standards','developer experience'],[('https://aaif.io/blog/building-the-foundation-for-agentic-ai','Building the Foundation for Agentic AI','2026-04-02')],None),
'Angela Jiang':(['AI agents','AI platforms','MCP'],[('https://sequoiacap.com/podcast/anthropics-katelyn-lesse-angela-jiang-building-an-ecosystem-not-a-walled-garden','Building an Ecosystem, not a Walled Garden (Sequoia Training Data)','2026-07-14')],None),
'Rohan Varma':(['AI agents','coding agents','product management'],[('https://www.linkedin.com/posts/rohannvarma_im-joining-openai-codex-to-work-on-the-future-activity-7431784004246216704---Ee',"I'm joining OpenAI Codex to work on the future of agentic development (LinkedIn post)",G)],None),
'Cassidy Williams':(['developer advocacy','AI agents','developer education'],[('https://github.blog/ai-and-ml/decoding-the-new-ai-lingo-loops-harnesses-squads-hill-climbing-oh-my/','Decoding the new AI lingo: Loops, harnesses, squads, hill climbing... oh my!',G),('https://github.blog/ai-and-ml/llms/why-ai-is-pushing-developers-toward-typed-languages/','Why AI is pushing developers toward typed languages',G)],None),
'Martin Woodward':(['developer relations','open source','GitHub Copilot'],[('https://stateofopencon.com/2026/09/25/2026-martinwoodward-speaker/','State of Open Conference 26 speaker page','2026-09-25'),('https://github.blog/author/martinwoodward/','Martin Woodward, GitHub Blog author page',G)],None),
'Yasuhiro Osaki':(['entertainment tech','platform engineering','infrastructure as code'],[],None),
'Qianqian Ye':(['creative coding','creator tools','open source','arts and technology'],[('https://processingfoundation.org/blog/celebrating-4-years-of-p5js-leadership-with-qianqian-ye/','Celebrating 4 Years of p5.js Leadership with Qianqian Ye',G)],None),
'Mina Tawadrous':(['entertainment tech','product management','AI prioritization'],[],None),
'Jake Albaugh':(['design tools','MCP','AI agents','creator tools'],[('https://config.figma.com/san-francisco/session/07a28549-f6a7-4621-8dca-504608ad449b/','Figma deep dive: Agentic workflows and the MCP (Config 2026)',G),('https://help.figma.com/hc/en-us/articles/36189347137047','Figma MCP collection: Figma + Developer Workflows (feat. Jake Albaugh)',G)],None),
}
def slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
people=[]
for n,(topics,src,li_override) in picks.items():
    p=P[n]; sess=[]
    for ss in p.get('session',[]):
        s=S.get(ss['sessionID'])
        if not s: continue
        t=s['times'][0] if s.get('times') else {}
        sess.append({'title':s['title'].strip(),'type':s.get('type'),'date':t.get('date',G),'start':t.get('startTimeFormatted',G),'end':t.get('endTimeFormatted',G),'tz':'America/Los_Angeles','room':t.get('room',G),'session_id':s['sessionID']})
    pid=slug(n)
    li=p.get('linkedIn') or li_override or G
    photo=p.get('photoURL') or G
    local=G
    if photo!=G:
        ext=os.path.splitext(photo)[1] or '.png'; local=f'photos/{pid}{ext}'
        try: urllib.request.urlretrieve(photo,local)
        except Exception as e: local=G
    people.append({'id':pid,'name':n,'title':(p.get('jobTitle') or G).strip(),'company':(p.get('companyName') or G).strip(),'photo_url':photo,'photo_local':local,'linkedin_url':li,
      'linkedin_source':'official Universe speaker profile' if p.get('linkedIn') else ('stackoverflow.blog episode notes' if li_override else G),
      'bio':re.sub(r'\s+',' ',(p.get('bio') or G)).strip(),
      'session':sess[0] if sess else G,'all_sessions':sess,'topics':topics,
      'sources':[{'url':CAT,'title':'GitHub Universe 2026 official speaker profile','date':(p.get('modified') or G)[:10]}]+[{'url':u,'title':t,'date':d} for u,t,d in src],
      'fetched_at':FT})
json.dump(people,open('people.json','w'),indent=2,ensure_ascii=False)
event={'id':'github-universe-2026','name':'GitHub Universe 2026','dates':{'start':'2026-10-28','end':'2026-10-29','tz':'America/Los_Angeles'},
 'venue':'Fort Mason Center, San Francisco, CA','format':'in-person (sold out) and virtual (free)','url':'https://githubuniverse.com/',
 'speakers_url':CAT,'sessions_url':'https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/sessioncatalog',
 'speaker_count_published':len(P),'session_count_published':len(S),
 'keynotes':[{'title':'Opening Keynote','date':'2026-10-28','start':'09:00 AM','room':'Main Stage @ Festival Pavilion'},{'title':'Closing Keynote','date':'2026-10-29','start':'02:00 PM','room':'Main Stage @ Festival Pavilion'}],
 'sources':[{'url':'https://githubuniverse.com/','title':'GitHub Universe 2026 homepage','date':FT[:10]},{'url':'https://events.githubuniverse.com/api/search','title':'RainFocus public catalog API (type=speaker / type=session)','date':FT[:10]}],
 'fetched_at':FT}
json.dump(event,open('event.json','w'),indent=2)
# all speakers lite (reference for feed)
json.dump([{'id':slug(x['fullName']),'name':x['fullName'],'title':(x.get('jobTitle') or G).strip(),'company':(x.get('companyName') or G).strip(),'photo_url':x.get('photoURL') or G,'linkedin_url':x.get('linkedIn') or G,'sessions':[S[s['sessionID']]['title'].strip() for s in x.get('session',[]) if s['sessionID'] in S]} for x in P.values()],open('all-speakers.json','w'),indent=1,ensure_ascii=False)
# cypher
def q(s): return "'"+str(s).replace('\\','\\\\').replace("'","\\'")+"'"
L=["// GitHub Universe 2026 demo seed. Public sources only. fetched_at "+FT,
"MERGE (e:Event {id:'github-universe-2026'}) SET e.name='GitHub Universe 2026', e.start='2026-10-28', e.end='2026-10-29', e.venue='Fort Mason Center, San Francisco, CA', e.url='https://githubuniverse.com/';",
"MERGE (me:Person {id:'me'}) SET me.name='Henry Finn';",
"MATCH (me:Person {id:'me'}), (e:Event {id:'github-universe-2026'}) MERGE (me)-[:ATTENDS]->(e);"]
mytopics=['AI agents','anime IP','creator tools','entertainment tech']
for t in mytopics: L.append(f"MERGE (t:Topic {{name:{q(t)}}}) WITH t MATCH (me:Person {{id:'me'}}) MERGE (me)-[:INTERESTED_IN]->(t);")
for p in people:
    L.append(f"MERGE (p:Person {{id:{q(p['id'])}}}) SET p.name={q(p['name'])}, p.title={q(p['title'])}, p.photo_url={q(p['photo_url'])}, p.linkedin_url={q(p['linkedin_url'])}, p.fetched_at={q(FT)};")
    L.append(f"MERGE (c:Company {{name:{q(p['company'])}}}) WITH c MATCH (p:Person {{id:{q(p['id'])}}}) MERGE (p)-[:WORKS_AT]->(c);")
    s=p['session']
    if s!=G: L.append(f"MATCH (p:Person {{id:{q(p['id'])}}}), (e:Event {{id:'github-universe-2026'}}) MERGE (p)-[r:SPEAKS_AT]->(e) SET r.session={q(s['title'])}, r.date={q(s['date'])}, r.start={q(s['start'])}, r.room={q(s['room'])};")
    for t in p['topics']: L.append(f"MERGE (t:Topic {{name:{q(t)}}}) WITH t MATCH (p:Person {{id:{q(p['id'])}}}) MERGE (p)-[:INTERESTED_IN]->(t);")
    for a in p['sources'][1:]:
        L.append(f"MERGE (a:Article {{url:{q(a['url'])}}}) SET a.title={q(a['title'])}, a.date={q(a['date'])} WITH a MATCH (p:Person {{id:{q(p['id'])}}}) MERGE (p)-[:WROTE]->(a);")
L.append("// Example who-to-meet: MATCH path=(me:Person {id:'me'})-[:INTERESTED_IN]->(t:Topic)<-[:INTERESTED_IN]-(p:Person) RETURN p.name, collect(t.name) AS shared ORDER BY size(shared) DESC;")
open('seed.cypher','w').write('\n'.join(L)+'\n')
gaps=0
for p in people:
    for k in ('title','company','photo_url','linkedin_url'): gaps+= p[k]==G
    gaps+= p['session']==G
    gaps+= sum(1 for a in p['sources'] if a['date']==G)
    gaps+= 1 if len(p['sources'])==1 else 0
print('GAPs',gaps,'no-LI',[p['name'] for p in people if p['linkedin_url']==G],'no-article',[p['name'] for p in people if len(p['sources'])==1],'undated',sum(1 for p in people for a in p['sources'] if a['date']==G))
for p in people: print(p['name'],'|',p['title'],'|',p['company'],'|',p['session']['title'] if p['session']!=G else G,'|',p['photo_local'])
