#!/usr/bin/env python3
"""Verificare HTTP reală a paginilor și artefactelor GEO; doar bibliotecă standard."""
import urllib.request,urllib.error,json,datetime,sys
BASE='https://firmsfinder.eu'
PATHS=['/','/despre/','/surse/','/robots.txt','/llms.txt','/geo/claims.json','/geo/evidence.json','/geo/dataset.json','/geo/intents.json']
PATHS+=['/geo/'+x for x in ['manifest','entities','topic-clusters','semantic-keywords','citable-chunks','rag-metadata','proprietary-data','glossary','knowledge-graph','consistency-manifest','external-corroboration','reference-set','observations','experiments','scorecard','corrections','changelog','verification','ere-dictionary'] if '/geo/'+x+'.json' not in PATHS]
results=[]
for path in PATHS:
 url=BASE+path; row={'url':url,'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'FirmsFinder-GEO-Verification/2.3'}),timeout=15) as resp:
   raw=resp.read();row.update(status=resp.status,content_type=resp.headers.get('Content-Type'),bytes=len(raw),sha256=__import__('hashlib').sha256(raw).hexdigest())
   if path.endswith('.json'):
    try:json.loads(raw);row['json_valid']=True
    except Exception as e:row['json_valid']=False;row['error']=str(e)
 except Exception as e:row.update(status=None,error=str(e))
 results.append(row)
print(json.dumps({'generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'results':results},ensure_ascii=False,indent=2))
sys.exit(1 if any(r.get('status')!=200 or r.get('json_valid') is False for r in results) else 0)
