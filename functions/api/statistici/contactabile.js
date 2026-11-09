// Aggregated counts of companies with a stored phone, by year of ONRC registration.
// Privacy: only grouped numbers, no company identifiers or phone values.
// A stored phone is NOT the same as a live-verified or ANAF-confirmed contact.
const reply=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=3600'}});
export async function onRequestGet({env}) {
 if(!env.DB)return reply({error:'D1 indisponibil'},503);
 try {
   // Start at the much smaller contact table to reduce D1 rows read.
   // Exclude natural persons and count distinct CUIs, not joined rows.
   const sql=`SELECT SUBSTR(f.data_inmatriculare,1,4) AS an,
       COUNT(DISTINCT f.cui) AS cu_telefon_stocat
     FROM firme_site fs
     JOIN onrc_firme f ON f.cui=fs.cui
     WHERE fs.telefoane IS NOT NULL
       AND TRIM(fs.telefoane) NOT IN ('','[]','null') AND fs.telefoane GLOB '*[0-9]*'
       AND f.persoana_fizica=0 AND f.top=1
       AND f.data_inmatriculare >= '2024-01-01'
       AND f.data_inmatriculare < '2027-01-01'
     GROUP BY SUBSTR(f.data_inmatriculare,1,4)`;
   const rows=(await env.DB.prepare(sql).all()).results||[];
   const years=[2024,2025,2026].map(year=>{
     const match=rows.find(x=>x.an===String(year));
     return {an:year,cu_telefon_stocat:Number(match?.cu_telefon_stocat||0)};
   });
   return reply({ani:years,total_3_ani:years.reduce((sum,r)=>sum+r.cu_telefon_stocat,0),
      definitie:'CUI distinct, persoane juridice înmatriculate 2024–2026, cu șir nenul de telefoane în firme_site',
      sursa_telefoane:'firme_site.telefoane — orice număr stocat, verificat sau neverificat; nu este necesar statut de verificare',
      acoperire:'Parțială: nu include telefoane care nu au fost încă descoperite sau importate',
      actualizat_la:new Date().toISOString()});
 }catch(e){
   console.error('contactabile-ani',String(e?.message||e).slice(0,180));
   return reply({error:'Agregarea contactelor nu poate fi executată în acest moment; nu presupuneți zero.'},503);
 }
}
