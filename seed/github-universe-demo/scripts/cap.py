import json,asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True)
        pg=await b.new_page()
        caps=[]
        async def onresp(r):
            u=r.url
            if r.request.resource_type in ('xhr','fetch'):
                try: body=await r.text()
                except: body=''
                caps.append({'url':u,'method':r.request.method,'post':r.request.post_data,'headers':dict(r.request.headers),'len':len(body)})
                if 'search' in u or 'speaker' in u.lower() or len(body)>20000:
                    open(f'xhr_{len(caps)}.json','w').write(body)
        pg.on('response',lambda r: asyncio.ensure_future(onresp(r)))
        await pg.goto('https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/speakers',wait_until='networkidle',timeout=60000)
        for i in range(6):
            await pg.mouse.wheel(0,4000); await pg.wait_for_timeout(1500)
        open('sp_rendered.html','w').write(await pg.content())
        json.dump(caps,open('caps.json','w'),indent=1)
        await b.close()
asyncio.run(main())
