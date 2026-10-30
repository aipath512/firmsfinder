# MASTER CONTEXT — FirmsFinder AI — VARIANTA PUBLICĂ (extras tehnic)
**Versiune:** v1.6 · **Data:** 2026-10-30 (sesiunea 0008C) · **Sursa:** AiVenture S.R.L. — Dan Ionescu
**Ce este:** extras tehnic din contextul intern de lucru: arhitectura datelor, tipurile de record, starea sistemelor, robotii, sursele, politica PFA/GDPR, lecțiile tehnice și pașii următori. Au fost lăsate deoparte, din motive de confidențialitate comercială și de securitate: reguli interne de lucru, poziționarea comercială și concurența, costuri și facturi, modelul de preț, conturi și secrete. Dicționarul complet al datelor este pe https://firmsfinder.eu/dictionar/.
**Limită:** fișierul descrie intenția și starea la data de mai sus; ce nu a fost verificat este marcat [neverificat].

---
## 1. CE ESTE PROIECTUL
**FirmsFinder AI** (firmsfinder.eu — cumpărat și confirmat 11 oct): baza națională a firmelor din România (ONRC + bilanțuri MF 2023–2025), gratuită ca date, cu **inteligență plătită** deasupra.
- **Poziționare canonică:** **DATA IS FREE. AI INTELLIGENCE YOU PAY.** (pe homepage: „ACCES GRATUIT LA DATE FIRME. PLĂTEȘTE INTELIGENȚA.”)
- **Slogan:** „Descoperiți firmele pe care nu le știți: viitorii clienți.”
- **Trei funcții:** **CAUTĂ** (gratuit, push), **DESCOPERĂ** (inteligență economică, semantic, pagina /descopera/), **FII GĂSIT** (pull; semnale Google/Bing/AI/agenți).
- **Datele sunt publice** (data.gov.ro, licență OGL-ROU-1.0, atribuire „Sursa: ONRC / MF, data.gov.ro”); al lui Dan este **prelucrarea**: joncțiunea ONRC+MF pe CUI, curățarea, lecția `caen_mf`, istoricul în timp, accesul la edge pentru om / AI / A2A.
- **Funnel:** FirmsFinder = intrarea către toate serviciile AiVenture (AUDIT-AI, AI-LENS, 3WEBOBS, INJECTOR, EU AI Act gratuit). Vinde singur („aduc eu vânatul”).
- **Concept „economic twins”** (Fiscal Economic Twins™): profilul fiscal/vectorial al clienților unei firme → alte firme active similare, neabordate încă; același tipar dă concurenți și parteneri complementari. Cele două motoare de creștere: Engine 1 inbound (Trust, Authority & AI Signals), Engine 2 outbound (AI-Powered Market Discovery); regula 85/15 (85% automat, 15% poartă umană înainte de orice contact cross-firmă). Risc GDPR/AI Act la profilare automată.
- **Extindere viitoare:** alte 26 de țări UE.

---

## 3. ARHITECTURA DATELOR — REGULA ÎNGHEȚATĂ (30 oct 2026)
**R2 = date primare** (record store, logica mainframe; fișiere imutabile versionate pe sesiune). **D1 = index structural/relațional** (ca un KSDS: „points to data” — fișier + octet de început + lungime, citire Range GET), **reconstruibil din R2**. **Vectorize = index semantic.** Toate căile de acces ajung la același ID persistent: **CUI**.
- R2 conține toate datele din toate sursele externe publice accesibile mașinilor, accesibile de oriunde prin orice cale (secvențial, după cheie etc.) pentru web-om, web-AI, A2A, MCP sau orice tehnică viitoare.
- **Sesiuni:** NNNNC / NNNNH / NNNNT; 0008C = sesiunea de lucru curentă; 0006H = comun înghețat. **ENT-nnnnnnnn** = decizii înregistrate. Fiecare decizie poartă: sesiune, sursa „AiVenture S.R.L. — Dan Ionescu”, ora României.

### Decizii adjudecate (jurnal în memoria `economic-twins-b2b`)
| ENT | Titlu | Esență |
|---|---|---|
| 00000001 | Record unic per CUI cu data înmatriculării și prima apariție (06:38) | un record per CUI: `data_inmatriculare`, `prima_aparitie`, `ultima_aparitie`, `data_radiere`; originalele neatinse, versiunea normalizată lângă ele. *De completat (în suspens): `sursa` + `horodatarea sursei`.* |
| 00000005 | Bilanț = record separat per CUI + an; fișierul plat e vedere derivată (07:06, **ÎNGHEȚATĂ**) | tipuri: FIRMA (cheie CUI) și BILANT (cheie CUI+an, `tip_formular` BL/UU/IR); 1 firmă → 0..N bilanțuri, max unul pe an; fișierul plat (ca_2023/24/25, tendință, are_bilant) = proiecție refăcută oricând; bilanț corectat de MF înlocuiește doar anul respectiv |
| 00000006 | Master unic sortat după CUI, cu `tip_record`, diferențe zilnice și compactare lunară (07:12) | un master logic sortat după CUI; sub fiecare CUI toate recordurile (FIRMA, BILANT, ANAF_TVA, BPI, DOSAR…), fiecare cu `sursa`+`horodatarea sursei`; D1 ține poziția; originalele rămân în `raw/`; diferențe zilnice + compactare lunară; păstrare bunic–tată–fiu (ultimele 3 generații); entitățile fără CUI se atașează CUI-ului firmei; chei alternative (EUID, cod TVA, LEI) se rezolvă în D1; câmp `acces` pentru persoane fizice/PFA filtrat la servire. **Etape:** (1) originale în `raw/`; (2) după normalizare, primul master FIRMA+BILANT + index D1, testat pe 10.000 firme; (3) diferențe + compactare abia la al doilea set ONRC. **Criteriu de ieșire:** dacă testul pe 10.000 firme nu trece, se revine la fișiere sortate după CUI pe tip de record |
| 00000007 | Integritate și horodatare (07:16) | SHA-256 pe fiecare fișier brut; două horodatări (`horodatarea sursei` = data publicării; `horodatarea preluării` = UTC, a lor); un manifest per rulare cu SHA-256 propriu și **un singur OTS pe manifest**; `ots upgrade` ulterior confirmă în Bitcoin (ore); fără SHA/OTS pe fiecare record; fiecare generație de master are SHA-256 în manifest și index. **Limită asumată:** dovedește integritatea și existența copiei lor la acea dată, nu că sursa a publicat exact asta și nici adevărul datelor |
| 00000008 | CAEN + tezaur + cuvinte-cheie, în trei logici de acces (07:25) | vezi secțiunea 4 |
| 00000009 | Start minimal, fără uși închise (07:30) | patru invarianți: (1) cheie comună CUI (CUI+an la bilanț); (2) `tip_record` în fiecare record; (3) `sursa` + `horodatarea sursei` în fiecare record; (4) fișiere noi la fiecare sesiune, nu rescrise. Pașii de acum: originale în `raw/`; robot de ingestie; fișiere curate pe tip (FIRMA, BILANT) sortate după CUI, date ISO; prima diferență între două seturi ONRC. **Amânate fără să se închidă nimic:** master unic + diferențe + compactare, Vectorize/intenții/tezaur/cuvinte explicite, plata agenților și pachetul B, tabele noi în D1 |

### Modelul temporal (30 oct)
Seturile ONRC se urmăresc în timp, extrase integral în R2, cu `data_inmatriculare` în AAAA-LL-ZZ **înainte** de actualizare. Diferența dintre două seturi detectează firme noi pe zi/lună, geografie, activitate, industrie (multi-sursă ONRC, MF). Lanțul (set nou publicat → R2 → normalizare → recorduri → Vectorize) trebuie să fie automat, „pe firul apei” datelor publicate (propunere ENT-00000002, în suspens).

---

## 4. TIPURI DE RECORD ȘI CELE TREI LOGICI DE ACCES (ENT-00000008)
**Tipuri de record (R2):** `FIRMA` (cheie CUI) · `BILANT` (CUI+an) · `CAEN` (nomenclator versionat 1998/2003/2008/2025, cheie cod+versiune, denumire în clar, ierarhie literă→2→3→4 cifre, sursă `raw/nomenclatoare/`) · `FIRMA_CAEN` (CUI+cod; `tip_caen` = autorizat ONRC sau principal din bilanț `caen_mf`; **filtrul folosește `caen_mf` când există**; firma are 1..N CAEN) · `TEZAUR` (cuvânt → coduri CAEN, sinonime) · `CUVANT_EXPLICIT` (CUI+cuvânt, **max 10 per firmă**, `origine=explicit`, sursa = firma, adăugat la „Revendică profilul”; cuvintele implicite nu se copiază pe firmă, rezultă din CAEN prin tezaur) · `INTENT` · ulterior ANAF_TVA, BPI, DOSAR etc. Fiecare record: `tip_record`, `sursa`, `horodatarea sursei`.

**Cele trei logici de acces la același CUI:**
1. **KSDS** — după cheie → record (Range GET prin poziția din D1).
2. **SQL** — filtre/joinuri → listă CUI.
3. **Intent** — cuvinte → tezaur → CAEN ca filtru dur + Vectorize semantic → listă CUI ordonată → logica 1 aduce recordul.

**INTENT:** al căutătorului/agentului (cu acord, max 30 zile, legat de CUI-urile returnate/clicate) **și** al firmei (ce vinde/caută), ca vector atașat firmei. Jurnal anterior: `market_intent_events`.

**D1 (oglindă, nu sursă de adevăr):** tabele `firma`, `firma_caen`, `caen`, `tezaur`, `cuvant_explicit` cu chei străine; limita de 10 cuvinte prin trigger SQLite + validare de robot; „cel puțin un CAEN” verificat doar de robot; analize grele în tabele precalculate/`agregat/`, nu joinuri live pe milioane de rânduri.

---

## 5. STAREA R2, D1, VECTORIZE, WORKERS (verificat 30 oct 2026)
**R2** — bucket `b2b-romania-raw`. Inventar (workflow `inventar-r2`): doar `raw/mf/2026-06/romania_2026_06_26.csv` (753.076.692 octeți, vechiul CSV MF) + `test/r2-test.txt`. Structură țintă: `raw/<sursa>/<set>/…` (ex. `raw/onrc/2026-09/`, `raw/mf/2023|2024|2025/`, `raw/nomenclatoare/`), opțional `<fișier>.meta.json` cu `{"horodatarea_sursei":"…","url_sursa":"…"}`. *Notă: la 26 oct a încărcat baza integral în R2 cu rclone, dar inventarul din 30 oct arată doar fișierul de mai sus → încărcarea ONRC/MF/nomenclatoare e încă de refăcut/confirmat [neverificat].*
**D1** — `b2b-romania-db` (id `0d6de488-285f-458b-b4b0-5f9ac913c5f1`): **există, 2,41 GB, 42 tabele** (verificat). Refacerea de la zero (28 oct) este plan, nu s-a executat în D1. Tabele (din v1.3, conținut actual **[neverificat]**): `onrc_firme` (1.784.283 active; `data_inmatriculare` normalizată ISO pe 275.252 rânduri la 26 oct), `onrc_caen_cauta`, `onrc_firma_caen`, `onrc_nom_caen`, `onrc_nom_stare`, `onrc_excluderi` (gol), `mf_bilant_2023/2024/2025`, `firme_site`, `config`, `cereri_gdpr`; tabele vechi goale `company*`, `onrc_caen`.
**Vectorize** — `firmsfinder-firme` (1024 dim, cosine, creat 15 oct) și `firmsfinder-fiscal` (8 dim, euclidean, creat de Dan 14 oct); ambele există. **Varianta B** (decisă 29 oct): se vectorizează firmele **active cu bilanț + cele nou-înființate**; nota publică pe /descopera/: „Descoperă caută printre firmele active din România care au depus bilanț, plus cele înființate recent. Căutarea simplă din /cautare/ acoperă toate firmele active.” Pilot: 10.000 firme.
**Workers existente în cont** (listă la 30 oct, 77 total; relevante): `firmsfinder-dictionar-agenti` (creat 29 oct), `d1-actualizare-statistici` (28 oct), `aiventure-telegram-control` (26 oct), `maison-anaf-daily` (cron șters 27 oct), `maison-web-verifier`, `aiventure-footer`, `aiventure-gdpr`, `aiventure-legal-worker`, `firmsfinder-meta`, `session-ssot` etc. Scopul exact al `firmsfinder-dictionar-agenti` și `d1-actualizare-statistici` **[neverificat]**. **`firmsfinder-ai` NU mai există** (șters 25 oct; odată cu el a dispărut FirmsFinderBot și ofertele live din v1.3).
**GitHub:** `aipath512/firmsfinder` (site, Pages Functions pe D1; Claude poate publica) · `aipath512/firmsfinder-vectorize` (workflow-uri; Claude poate comite) · `onrc-actualizare-firme` (privat, creat de Dan).

---

## 6. ROBOȚII ȘI WORKFLOW-URI (repo `aipath512/firmsfinder-vectorize`)
- **`inventar-r2.yml`** (v1.1, `git pull --rebase`) → `inventar-r2.txt`: listă a obiectelor din R2.
- **`ingestie-r2.yml`** (v1.0, 30 oct, commit 153ff13; manual, „Actions → Run workflow”, **nu** „Re-run jobs”): citește `raw/` din R2 (token **doar citire** e suficient), calculează SHA-256 pe fișierele noi/schimbate (cheie cale+mărime+ETag), scrie `manifest/manifest_<UTC>.json` și adaugă în `manifest/registru.jsonl`, aplică **`ots stamp`** pe manifestele fără `.ots`, apoi `ots upgrade`/`ots info` (confirmat în Bitcoin dacă apare `BitcoinBlockHeaderAttestation`), raportează fișierele dispărute din R2, scrie sumar în GitHub; salvează manifestele în repo (nu în R2). Testat local (SHA corect, a doua rulare 0 noi, fișier schimbat → intrare nouă, `ots stamp` reușit). **Prima rulare reală: în așteptarea lui Dan.**
- **Întârziere OTS:** confirmarea Bitcoin durează ore → o rulare ulterioară a aceluiași workflow face `upgrade`.
- **De scris (neînceput):** robot de normalizare ONRC (date ISO, fișiere curate FIRMA/BILANT sortate după CUI), apoi prima diferență între două seturi ONRC.

---

## 7. SURSE DE DATE
| Sursă | Set | Ce dă |
|---|---|---|
| ONRC | „Firme înregistrate la Registrul Comerțului până la 02.09.2026” + „Nomenclatoare … 02.09.2026” | identitate, adresă, formă juridică, stare, CAEN autorizate |
| MF | „Situații financiare 2023 / 2024 (actualizat iunie 2026) / 2025” | bilanț, 20 indicatori; 2025 probabil incomplet (depuneri întârziate) → de reîmprospătat |
| Viitor | restanțe ANAF, BPI, instanțe, SEAP, ajutoare de stat, ANAF TVA | prin registru de metadate per sursă (29 oct) |

Formate: ONRC separator `^`, UTF-8 cu BOM. MF separator `,`, coloane `CUI,CAEN,I1..I20`, fișierele `web_bl_bs_sl_an{AN}.txt`, `web_uu_an{AN}.txt`, `web_ir_an{AN}.txt` (fără suprapunere de CUI); `.csv` cu același nume = dicționarul. Descărcare: CKAN `https://data.gov.ro/api/3/action/package_search?q=situatii%20financiare` din calculatorul lui Dan (data.gov.ro **nu** e accesibil din shell-ul lui Claude).
Seturi păstrate pentru vectorizare: firme active cu bilanț pozitiv 2023–2025 (27 oct).

### Registrul surselor publice oficiale (verificat 30 oct 2026; public pe https://firmsfinder.eu/surse/#registru)
| Sursă | Cum se preia | Stare |
|---|---|---|
| ONRC firme (data.gov.ro, set 02.09.2026) | CSV, CKAN | folosit |
| MF situații financiare 2023–2025 (data.gov.ro) | CSV, CKAN | folosit |
| Nomenclatoare ONRC/CAEN | CSV | folosit |
| ANAF registrul plătitorilor de TVA (serviciu web v9, REST) | POST, loturi de CUI, **1 cerere/s** | **testat 30 oct, neintegrat**. **Limita de lot diferă între surse:** dicționarul v1.0.2 spune max 100; documentația ANAF 2017 spune 500; în testul din 30 oct serviciul a acceptat **până la 2000**. Regulă prudentă până la decizie: 100 → ~18.000 cereri ≈ ~5 ore pentru o trecere completă (estimarea anterioară de 1,5–2 h presupunea 500) |
| ANAF `/bilant` | GET, un CUI + un an pe cerere | verificat, neintegrat |
| ANAF registre e-Factura / RegAgric / RegCult | pagini/fișiere ANAF | verificate parțial |
| VIES (CE) | REST `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/RO/vat/<CUI>`, o cerere per cod | testat 30 oct, neintegrat |
| GLEIF Golden Copy | 3 seturi zilnice + delte | verificat |
| INS Tempo | matrici CSV | verificat |
| portal.just.ro (SOAP) | căutare după nume, max 1000 | verificat; potrivirea după nume are nivel de încredere |
| ANAF restanțieri (praguri 500k/250k/100k lei, snapshot 30.09.2026) | pagina anaf.ro/restante = tabel cu captcha; dicționarul indică liste trimestriale pe data.gov.ro | **de verificat** (data.gov.ro blocat de robots.txt pentru unealta lui Claude; nu se ocolește) |
| BPI | autentificare, text integral plătit, fără descărcare în masă | neutilizabil în masă |
| SEAP/SICAP | fără export în masă (raport vechi OGP) | neutilizabil în masă |
| RegAS 2, Monitorul Oficial | în dezvoltare / consultare | doar listate |

**Cifre cheie (validate 5–7 oct):** ONRC 4.219.081 înregistrări; **1.784.283 active**, din care 473.876 persoane fizice (PFA/II/IF/PF/AF); 2.188.260 radiate; 246.472 altă stare; CAEN autorizat 13,7 mil. legături; MF 2023 = 944.655 · 2024 = 968.704 · 2025 = 918.334 bilanțuri; doar 11.594 firme aveau WEB în ONRC; contabili (`caen_mf='6920'`) 13.328 (2023) / 13.404 (2025).

---

## 8. PFA / GDPR (decizii păstrate)
PFA/II/IF **incluse**, niciodată șterse; câmp `top` (implicit 1; PFA/II/IF = 0), ecranul afișează doar `top=1`; `persoana_fizica=1`; mascarea numelor; identificare doar la cerere pe contact@5thelement.ai. Câmp `acces` în master pentru persoane fizice (ENT-00000006). Cereri GDPR: tabel `cereri_gdpr`, aprobare de Dan („aprobă cererea N”). Temei art. 6(1)(f). Emailuri comerciale: adrese de firmă (office@, contact@) risc mic; adrese personale, de regulă acord. Nu cumpără liste de emailuri/telefoane (20 oct).

---

## 11. LECȚII TEHNICE (păstrate din v1.3)

---

## 13. URMĂTORII PAȘI (în ordine)
**Ai lui Dan (cloud, o singură operațiune pe rând):**
1. Încarcă în R2 cu rclone `copy` (nu `sync`): ONRC set 02.09.2026 → `raw/onrc/2026-09/`; MF → `raw/mf/2023|2024|2025/`; nomenclatoare → `raw/nomenclatoare/` (opțional `.meta.json` cu data publicării).
2. GitHub → Actions → „Ingestie R2 (SHA-256 + manifest + OTS)” → **Run workflow** → raportează rezultatul; ulterior o a doua rulare pentru `ots upgrade`.
**Ai lui Claude (la comanda lui):**
3. Robot de normalizare ONRC (date ISO) + fișiere curate FIRMA/BILANT sortate după CUI.
4. Prima diferență între două seturi ONRC (firme noi pe zi / județ / CAEN).
5. Master unic cu index D1, test pe 10.000 firme (criteriu de ieșire în ENT-00000006).
6. Vectorize varianta B + nota publică pe /descopera/; apoi tezaur, cuvinte explicite, intenții (ENT-00000008).
7. **Dicționar v1.0.3** (decis 30 oct 09:28: „adăugăm în dicționar”): de înghețat ca versiune nouă, cu fișiere noi + SHA-256 + OTS, după ce Dan precizează ce intră (vezi secțiunea 16).
8. Robot „ANAF TVA zilnic” (la „da”; decizia limitei de lot) și normalizare ONRC.
9. Înregistrarea în jurnal a ENT-00000002..4 (după „Adjudecat”); documentul de o pagină ENT-00000001..8 (oferit, fără răspuns).

---

## 16. SITE-UL firmsfinder.eu — STARE LA 30 OCT 2026 (verificat live)
Repo static `aipath512/firmsfinder` (Cloudflare Pages; pagini `<dir>/index.html`, stil `/onsite.css` + `/assets/ledger-ff.css`). Claude publică direct (clonă locală în sesiune; push cere ca repo-ul să fie atașat în sesiune).
- **/surse/** (v2.0, commit d4a962f + corecturi 5f13139): cuprins; registrul surselor (tabel cu link și stare); R2/D1/Vectorize; integritate (SHA-256, OTS, două horodatări, un manifest per rulare); deciziile ENT-00000001/5/6/7/8/9; dicționarul cu SHA/OTS. Linkează acum `/dictionar/` (nu mai confundă cu `/resurse/dictionar/`).
- **/dictionar/** (nou, 5f13139): generat din dicționarul canonic v1.0.2 (înghețat 29 oct, sesiunea 0008H; 18 entități, 127 proprietăți dintre care 72 existente, 20 relații, 18 surse): fișiere cu SHA-256 și OTS (confirmate Bitcoin 29 oct), pași de verificare, entități, relații, surse, reguli de conflict, decizii deschise, istoric. JSON-LD WebPage + Dataset. Fișiere în `/dictionar/` (`latest.json` → v1.0.2). **Atenție:** `/resurse/dictionar/` este alt document (Dicționar de date ERE, 21 tipuri, sesiunea 0006H).
- **sitemap.xml**: 31 intrări, `lastmod` din ultimul commit; include `/dictionar/`; `/utm/` este noindex (exclus); `/legal/` servit de Worker.
- **Meniu** (commit 2e6b022, 30 pagini): pagini de date = „Acasă · Căutare · Descoperă · Comparare · Semnale · Date · Surse · Dicționar · Contact”; pagina de start, FAQ, GEO/AEO/AIO, Intelligence, Despre, Resurse = meniul existent + Date, Surse, Contact înaintea FAQ; Metodologie, Cazuri de studiu, Pentru cine, Fii găsit, ON-SITE, ON-PAGE, AI-SEO = + Surse, Contact. Verificat fără depășire orizontală la 390 px.
- **R2:** inventar rulat din nou 30 oct 07:02Z: tot doar 2 obiecte (753.076.699 B); încărcarea lui Dan (rclone) încă neconfirmată.
- **Constatări de proces:** WebFetch respectă robots.txt (data.gov.ro API blocat; nu se ocolește); `gh workflow run` nu merge (GraphQL blocat) → `gh api -X POST …/dispatches`; `pkill`/`sleep` înlănțuite pot termina shell-ul.
