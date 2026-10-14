# GEO LIVE T3 - raport

**GEO Technical Readiness (live):** 95.0 / 100 - evaluare COMPLETE - clasa A

- Tinta: https://firmsfinder.eu/
- Evaluator: geo_live.py v1.0.1 (sha256 63c7f72bacb075bf4c212c67de8e903e791e06baa4e52e9b76ddb3c48f86f961)
- Metodologie: GEO_LIVE_METHODOLOGY_v1.0_2026-10-14
- Rulare: 2026-10-14T16:57:32Z ... 2026-10-14T16:57:52Z (UTC)
- Commit evaluat: 996845a4479958f6b930bf53a707e0636dfbc0b6; rulare CI: https://github.com/aipath512/firmsfinder/actions/runs/38602493567
- Cereri HTTP inregistrate: 48

Nu masoara vizibilitatea efectiva in sistemele AI si nici impactul comercial.

| Categorie | Obtinut | Disponibil | UNKNOWN |
|---|--:|--:|--:|
| HTTP/JSON | 25 | 25 | 0 |
| JSON-LD | 20 | 20 | 0 |
| robots/llms/sitemap | 15 | 15 | 0 |
| /geo/ghid | 15 | 15 | 0 |
| coerenta ANAF | 10 | 15 | 0 |
| digital-dna.json | 10 | 10 | 0 |

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
| G2 | /geo/ghid | 4 | PASS | FAQPage cu 23 intrebari si raspunsuri |
| G3 | /geo/ghid | 4 | PASS | 23/23 intrebari vizibile (H2) au pereche in FAQPage |
| G4 | /geo/ghid | 2 | PASS | 23 raspunsuri distincte din 23 |
| G5 | /geo/ghid | 2 | PASS | BreadcrumbList prezent |
| A1 | coerenta ANAF | 5 | PASS | ANAF in sursele declarate: False; linii llms.txt care o prezinta ca sursa fara negatie: 0 |
| A2 | coerenta ANAF | 5 | PASS | fisiere entitati care mentioneaza ANAF fara sa fie in sursele declarate: 0 |
| A3 | coerenta ANAF | 5 | FAIL | propozitii vizibile care prezinta ANAF ca sursa folosita, fara negatie: 17 |
| D1 | digital-dna.json | 3 | PASS | digital-dna.json: HTTP 200, JSON valid |
| D2 | digital-dna.json | 4 | PASS | status=PUBLISHED_IDENTITY_METADATA_VERIFIED_SCOPED; verification.result=PASS (PASS cere result=PASS si status fara NOT_RUNTIME_VERIFIED) |
| D3 | digital-dna.json | 3 | PASS | campuri obligatorii: complete |

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
- https://firmsfinder.eu/geo/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/aeo/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/aio/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/geo/ghid/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r
- https://firmsfinder.eu/resurse/audituri/: QUICK LINKS 1clic-ia.eu ↗ 3webobs.com ↗ 5thelement.ai ↗ ai-lens.eu ↗ aiventure.ro ↗ b2b-ai-library.org ↗ eu-112.eu ↗ eu-112.ro ↗ eu-ai-act-r

