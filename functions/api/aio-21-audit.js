const NAMES=["LLM-readable summary","Canonical direct answers","Citable answer chunks","RAG chunk boundaries","Chunk provenance","Semantic keyword clusters","Concept cluster coverage","Definition ownership","Intent mapping TOF/MOF/BOF","Question-answer alignment","Long-form completeness","Content hierarchy H1–H3","Internal semantic links","Entity disambiguation","Cross-page consistency","Freshness metadata","Chronological versioning","Unique data attribution","Methodology disclosure","Negative scope","Machine-readable resource links"];
export async function onRequestGet({request}) {
 const url=new URL(request.url).searchParams.get("url");
 let target;try{target=new URL(url);if(target.protocol!=="https:"||!target.hostname.includes(".")||target.username||target.password||target.port||/^(localhost|.*\.local|.*\.internal)$/i.test(target.hostname))throw Error();}catch{return Response.json({error:"Invalid HTTPS URL"},{status:400})}
 // This first release is intentionally restricted to the authorized AiVenture host.
 if(!["firmsfinder.eu","www.firmsfinder.eu"].includes(target.hostname))return Response.json({error:"Only firmsfinder.eu is authorized in this release"},{status:403});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{const response=await fetch(target.toString(),{redirect:"error",signal:controller.signal,headers:{"Accept":"text/html"}});if(!response.ok)throw Error("Upstream HTTP "+response.status);if(!(response.headers.get("content-type")||"").includes("text/html"))throw Error("Not HTML");const html=(await response.text()).slice(0,500000);
 const tests=[
 [/href=["'][^"']*llms\.txt/i,"Link to llms.txt"],
 [/class=["'][^"']*(answer|faq)|<h[2-4][^>]*>[^<]*\?/i,"Answer/FAQ markup"],
 [/class=["'][^"']*(chunk|answer)/i,"Chunk markup"],
 [null,"Chunk boundaries require semantic review"],
 [null,"Chunk provenance requires semantic review"],
 [null,"Keyword clusters require semantic review"],
 [null,"Concept coverage requires semantic review"],
 [/DefinedTerm|glossary|dicționar/i,"Definitions referenced"],
 [/TOF|MOF|BOF/i,"Intent funnel markers"],
 [null,"Answer alignment requires semantic review"],
 [null,"Completeness requires semantic review"],
 [/<h1\b/i,"H1 present"],
 [/<a\s[^>]*href=["']\//i,"Internal link present"],
 [/application\/ld\+json/i,"JSON-LD present; disambiguation unverified"],
 [null,"Cross-page comparison not executed"],
 [/dateModified|article:modified_time/i,"Modified date marker"],
 [/version|versiune|session/i,"Version marker"],
 [null,"Originality cannot be inferred from HTML"],
 [/metodologi|methodolog/i,"Methodology mentioned"],
 [/nu garant|not guaranteed|limitări/i,"Limitations mentioned"],
 [/llms\.txt|ai\.json|intents\.json/i,"Machine resource referenced"]
 ];
 const signals=NAMES.map((name,i)=>{const [regex,evidence]=tests[i];const matched=regex&&regex.test(html);return{id:"AIO-"+String(i+1).padStart(2,"0"),name,before:matched?"PARTIAL":"UNKNOWN",after:"UNKNOWN",evidence:matched?evidence+" (structural hint only)":evidence+"; not confirmed"}});
 return Response.json({url:target.toString(),checked_at:new Date().toISOString(),method:"HTML structural heuristics; no semantic certification",signals},{headers:{"Cache-Control":"no-store","Access-Control-Allow-Origin":"https://firmsfinder.eu"}});
 }catch(e){return Response.json({error:String(e.message)},{status:502})}finally{clearTimeout(timer)}
}