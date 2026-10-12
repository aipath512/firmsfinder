import {writeFileSync,mkdirSync} from 'node:fs';
const base=(process.argv[2]||'https://firmsfinder.eu').replace(/\/$/,'');
const report={base,at:new Date().toISOString(),kind:'structural_live_checks_not_full_60_signal_audit',checks:[]};
const paths=['/signals.json','/semnale/','/robots.txt','/sitemap.xml','/llms.txt','/llms-full.txt','/digital-dna.json','/source-provenance.json','/rag-chunk-map.json','/api/onsite/status','/.well-known/agent-card.json'];
for(const path of paths){try{const r=await fetch(base+path,{signal:AbortSignal.timeout(15000)}),text=await r.text();let result={path,status:r.status,content_type:r.headers.get('content-type'),verdict:r.ok?'PASS':'FAIL',scope:'HTTP availability'};
if(path.endsWith('.json')){try{const d=JSON.parse(text);result.json_valid=true;if(path==='/signals.json'){result.signal_count=d.signals?.length;result.verdict=d.signals?.length===60?'PASS':'FAIL';result.scope='Catalog has 60 entries; not proof of 60 functions';}if(d.status==='BACKEND_REQUIRED'){result.verdict='PARTIAL';result.scope='Static descriptor, no dynamic export';}}catch{result.json_valid=false;result.verdict='FAIL';}}
report.checks.push(result);}catch(e){report.checks.push({path,verdict:'UNKNOWN',error:e.message});}}
mkdirSync('audit-results',{recursive:true});const file='audit-results/'+report.at.replace(/[:.]/g,'-')+'.json';writeFileSync(file,JSON.stringify(report,null,2));console.log(file);console.log(JSON.stringify(report.checks,null,2));
