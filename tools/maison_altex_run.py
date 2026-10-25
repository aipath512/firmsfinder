import csv,json,re,time,datetime,urllib.request,urllib.robotparser,urllib.parse,xml.etree.ElementTree as ET
from pathlib import Path
BASE='https://altex.ro'; UA='MAISON-FirmsFinder-Research/1.0 (+https://firmsfinder.eu)'
out=Path('altex-output');out.mkdir(exist_ok=True); errors=[]; discovered={}; rows=[]
def fetch(url):
 if not rp.can_fetch(UA,url):errors.append([url,'robots_disallow']);return ''
 time.sleep(2)
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=25) as r:return r.read().decode('utf-8','replace')
 except Exception as e:errors.append([url,str(e)[:120]]);return ''
def add(url,source):
 u=urllib.parse.urlsplit(url)
 if u.hostname in ('altex.ro','www.altex.ro') and re.fullmatch(r'/vendor/[a-zA-Z0-9%_-]+/?',u.path):discovered.setdefault('https://altex.ro'+u.path,source)
with urllib.request.urlopen(BASE+'/robots.txt',timeout=25) as r:robot=r.read().decode()
rp=urllib.robotparser.RobotFileParser();rp.parse(robot.splitlines())
with open('data/maison_altex_vendor_sample_20261025.csv',newline='',encoding='utf-8') as f:
 for row in csv.DictReader(f):add(row.get('source_url',''),'seed_csv')
sm=re.findall(r'(?im)^sitemap:\\s*(\\S+)',robot);sm+= [BASE+'/sitemap.xml'];seen=set();pages=[]
while sm and len(seen)<50:
 url=sm.pop(0)
 if url in seen:continue
 seen.add(url);xml=fetch(url)
 try:root=ET.fromstring(xml)
 except Exception:continue
 for el in root.iter():
  if el.tag.rsplit('}',1)[-1]!='loc' or not el.text:continue
  u=el.text.strip();add(u,'sitemap')
  if u.endswith('.xml'):sm.append(u)
  elif len(pages)<250 and '/vendor/' not in u:pages.append(u)
for url in pages[:250]:
 html=fetch(url)
 for path in re.findall(r'(?:https?://(?:www\\.)?altex\\.ro)?/vendor/[\\w%-]+/?',html):add(urllib.parse.urljoin(BASE,path),'html_link')
for url,source in sorted(discovered.items()):
 html=fetch(url)
 if not html:continue
 from html import unescape
 txt=unescape(re.sub(r'<[^>]+>','\\n',html));txt=re.sub(r'[ \\t]+',' ',txt)
 def field(label):
  m=re.search(r'(?im)^\\s*'+label+r'\\s*:\\s*([^\\n]+)',txt);return m.group(1).strip() if m else ''
 cui=re.sub(r'\\D','',field('CUI'));phone=field('Telefon');email=field('Email');name=field('Denumire')
 rows.append(dict(name=name,cui=cui,phone=phone,email=email,origin='ALTEX',source_url=url,collected_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),status='complete' if all([name,cui,phone,email]) else 'partial'))
with open(out/'vendors.csv','w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=['name','cui','phone','email','origin','source_url','collected_at','status']);w.writeheader();w.writerows(rows)
with open(out/'discovery.csv','w',newline='',encoding='utf-8') as f:
 w=csv.writer(f);w.writerow(['url','discovered_from','fetched']);w.writerows((u,s,u in {r['source_url'] for r in rows}) for u,s in discovered.items())
(out/'errors.json').write_text(json.dumps(errors,indent=2))
audit=dict(discovered_vendor_urls=len(discovered),fetched_profiles=len(rows),complete_profiles=sum(r['status']=='complete' for r in rows),failed_profiles=len(discovered)-len(rows),sitemaps_visited=len(seen),html_pages_sampled=min(250,len(pages)),errors=len(errors),coverage='NOT_PROVABLY_EXHAUSTIVE',run_utc=datetime.datetime.now(datetime.timezone.utc).isoformat())
(out/'audit.json').write_text(json.dumps(audit,indent=2));print(json.dumps(audit,indent=2))