# GEO LIVE T1 - raport

**GEO Technical Readiness (live):** 81.0 / 100 - evaluare COMPLETE - clasa B

- Tinta: https://firmsfinder.eu/
- Evaluator: geo_live.py v1.0.1 (sha256 63c7f72bacb075bf4c212c67de8e903e791e06baa4e52e9b76ddb3c48f86f961)
- Metodologie: GEO_LIVE_METHODOLOGY_v1.0_2026-10-14
- Rulare: 2026-10-14T16:26:22Z ... 2026-10-14T16:26:35Z (UTC)
- Commit evaluat: 34919a9f525c2d191c7ed9e265436bb4c8364a1f; rulare CI: https://github.com/aipath512/firmsfinder/actions/runs/38598054585
- Cereri HTTP inregistrate: 48

Nu masoara vizibilitatea efectiva in sistemele AI si nici impactul comercial.

| Categorie | Obtinut | Disponibil | UNKNOWN |
|---|--:|--:|--:|
| HTTP/JSON | 25 | 25 | 0 |
| JSON-LD | 20 | 20 | 0 |
| robots/llms/sitemap | 15 | 15 | 0 |
| /geo/ghid | 5 | 15 | 0 |
| coerenta ANAF | 10 | 15 | 0 |
| digital-dna.json | 6 | 10 | 0 |

| ID | Categorie | Pondere | Stare | Detaliu |
|---|---|--:|:-:|---|
| H1 | HTTP/JSON | 5 | PASS | manifest.json 200, JSON valid |
| H2 | HTTP/JSON | 8 | PASS | 23/23 artefacte din manifest raspund 200 |
| H3 | HTTP/JSON | 6 | PASS | 23/23 artefacte sunt JSON valid cu Content-Type json |
| H4 | HTTP/JSON | 3 | PASS | signals.json si entities.json 200 + JSON valid |
| H5 | HTTP/JSON | 3 | PASS | http:// redirectioneaza (301) catre https |
| J1 | JSON-LD | 5 | PASS | 17/17 pagini conforme |
| J2 | JSON-LD | 5 | PASS | 17/17 pagini conforme |
| J3 | JSON-LD | 5 | PASS | 17/17 pagini conforme |
| J4 | JSON-LD | 5 | PASS | 17/17 pagini conforme |
| R1 | robots/llms/sitemap | 3 | PASS | robots.txt: HTTP 200, text/plain; charset=utf-8 |
| R2 | robots/llms/sitemap | 3 | PASS | boti AI principali nu sunt blocati; Sitemap declarat |
| R3 | robots/llms/sitemap | 3 | PASS | 17/17 URL-uri din sitemap raspund 200 |
| R4 | robots/llms/sitemap | 2 | PASS | 17/17 intrari cu lastmod ISO valid |
| R5 | robots/llms/sitemap | 2 | PASS | llms.txt: HTTP 200, text/plain; charset=utf-8, titlu H1 prezent |
| R6 | robots/llms/sitemap | 2 | PASS | 15/15 linkuri firmsfinder.eu din llms.txt raspund 200 |
| G1 | /geo/ghid | 3 | PASS | 200 HTML; in sitemap: True; canonical corect: True |
| G2 | /geo/ghid | 4 | FAIL | FAQPage JSON-LD absent sau incomplet |
| G3 | /geo/ghid | 4 | FAIL | 0/23 intrebari vizibile (H2) au pereche in FAQPage |
| G4 | /geo/ghid | 2 | FAIL | FAQPage absent |
| G5 | /geo/ghid | 2 | PASS | BreadcrumbList prezent |
| A1 | coerenta ANAF | 5 | PASS | ANAF in sursele declarate: False; linii llms.txt care o prezinta ca sursa fara negatie: 0 |
| A2 | coerenta ANAF | 5 | PASS | fisiere entitati care mentioneaza ANAF fara sa fie in sursele declarate: 0 |
| A3 | coerenta ANAF | 5 | FAIL | propozitii vizibile care prezinta ANAF ca sursa folosita, fara negatie: 18 |
| D1 | digital-dna.json | 3 | PASS | digital-dna.json: HTTP 200, JSON valid |
| D2 | digital-dna.json | 4 | FAIL | status=SPECIFICATION_NOT_RUNTIME_VERIFIED; verification.result=NOT_TESTED (PASS cere result=PASS si status fara NOT_RUNTIME_VERIFIED) |
| D3 | digital-dna.json | 3 | PASS | campuri obligatorii: complete |

**G2 - elemente care nu corespund:**
- https://firmsfinder.eu/geo/ghid/

**G3 - elemente care nu corespund:**
- Ce este Generative Engine Optimization?
- Ce înseamnă GEO readiness?
- Ce este un fragment citabil?
- Ce sunt fișierele JSON GEO?
- Cum funcționează monitorizarea GEO?
- GEO garantează apariția în ChatGPT?
- Ce este Answer Engine Optimization?
- Ce înseamnă AI Optimization?
- De ce sunt utile întrebările frecvente?
- Ce este Schema.org?
- Ce este un răspuns direct?
- Ce este un intent JSON?
- Cum se deosebește GEO de SEO tradițional?
- Ce semnale GEO pot fi măsurate automat?
- Cum verific dacă un fragment are sursă și context?
- Cum compar două audituri GEO succesive?
- Cum separ pregătirea tehnică de citarea efectivă?
- Cum diferă AEO de GEO și SEO?
- Ce semnale AIO pot fi verificate pe o pagină?
- Cum asociez FAQ cu intențiile reale ale utilizatorilor?
- Cum verific dacă datele structurate corespund conținutului vizibil?
- Cum formulez răspunsuri clare fără afirmații neverificate?
- Cum aliniez intențiile cu paginile și entitățile?

**G4 - elemente care nu corespund:**
- https://firmsfinder.eu/geo/ghid/

**A3 - elemente care nu corespund:**
- https://firmsfinder.eu/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/intelligence/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/faq/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/despre/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/contact/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/surse/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/resurse/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/cautare/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/comparare/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/categorii/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/localitati/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/semnale/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/geo/: Cite Sources Trimiteri către surse verificabile Referințe către INS, ONRC, ANAF, Eurostat și documentația folosită efectiv Prioritate mare 4
- https://firmsfinder.eu/geo/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/aeo/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/aio/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/geo/ghid/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/resurse/audituri/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r

**D2 - elemente care nu corespund:**
- https://firmsfinder.eu/digital-dna.json

