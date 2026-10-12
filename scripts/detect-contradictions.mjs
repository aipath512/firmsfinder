import {readFileSync} from 'node:fs';
export function detect(claims){
 const grouped=new Map();for(const c of claims){if(!c.entity_id||!c.field||!c.source_id)throw new Error('Claim requires entity_id, field, source_id');
 const key=JSON.stringify([c.entity_id,c.field,c.period??null,c.unit??null]);const a=grouped.get(key)||[];a.push(c);grouped.set(key,a);}
 return [...grouped.entries()].filter(([k,a])=>new Set(a.filter(c=>c.value!==null&&c.value!==undefined).map(c=>JSON.stringify(c.value))).size>1).map(([key,claims])=>({key:JSON.parse(key),status:'unresolved',claims}));
}
if(process.argv[1]===new URL(import.meta.url).pathname){if(!process.argv[2])throw new Error('Usage: node scripts/detect-contradictions.mjs claims.json');console.log(JSON.stringify({conflicts:detect(JSON.parse(readFileSync(process.argv[2],'utf8')))},null,2));}
