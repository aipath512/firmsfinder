# GEO LIVE T0 - raport

**GEO Technical Readiness (live):** 59.0 / 100 - evaluare COMPLETE - clasa C

- Tinta: https://firmsfinder.eu/
- Evaluator: geo_live.py v1.0.0 (sha256 9d13ee476528ab5591b972c484828b14526e3e26e04038e91bb07651989fb248)
- Metodologie: GEO_LIVE_METHODOLOGY_v1.0_2026-10-14
- Rulare: 2026-10-14T06:35:11Z ... 2026-10-14T06:35:17Z (UTC)
- Commit evaluat: 93c359d20da631be2ff4d4b1233158e77bf282e3; rulare CI: https://github.com/aipath512/firmsfinder/actions/runs/38523064171
- Cereri HTTP inregistrate: 45

Nu masoara vizibilitatea efectiva in sistemele AI si nici impactul comercial.

| Categorie | Obtinut | Disponibil | UNKNOWN |
|---|--:|--:|--:|
| HTTP/JSON | 25 | 25 | 0 |
| JSON-LD | 5 | 20 | 0 |
| robots/llms/sitemap | 15 | 15 | 0 |
| /geo/ghid | 3 | 15 | 0 |
| coerenta ANAF | 5 | 15 | 0 |
| digital-dna.json | 6 | 10 | 0 |

| ID | Categorie | Pondere | Stare | Detaliu |
|---|---|--:|:-:|---|
| H1 | HTTP/JSON | 5 | PASS | manifest.json 200, JSON valid |
| H2 | HTTP/JSON | 8 | PASS | 23/23 artefacte din manifest raspund 200 |
| H3 | HTTP/JSON | 6 | PASS | 23/23 artefacte sunt JSON valid cu Content-Type json |
| H4 | HTTP/JSON | 3 | PASS | signals.json si entities.json 200 + JSON valid |
| H5 | HTTP/JSON | 3 | PASS | http:// redirectioneaza (301) catre https |
| J1 | JSON-LD | 5 | FAIL | 13/14 pagini conforme |
| J2 | JSON-LD | 5 | PASS | 14/14 pagini conforme |
| J3 | JSON-LD | 5 | FAIL | 11/14 pagini conforme |
| J4 | JSON-LD | 5 | FAIL | 13/14 pagini conforme |
| R1 | robots/llms/sitemap | 3 | PASS | robots.txt: HTTP 200, text/plain; charset=utf-8 |
| R2 | robots/llms/sitemap | 3 | PASS | boti AI principali nu sunt blocati; Sitemap declarat |
| R3 | robots/llms/sitemap | 3 | PASS | 14/14 URL-uri din sitemap raspund 200 |
| R4 | robots/llms/sitemap | 2 | PASS | 14/14 intrari cu lastmod ISO valid |
| R5 | robots/llms/sitemap | 2 | PASS | llms.txt: HTTP 200, text/plain; charset=utf-8, titlu H1 prezent |
| R6 | robots/llms/sitemap | 2 | PASS | 15/15 linkuri firmsfinder.eu din llms.txt raspund 200 |
| G1 | /geo/ghid | 3 | PASS | 200 HTML; in sitemap: True; canonical corect: True |
| G2 | /geo/ghid | 4 | FAIL | FAQPage JSON-LD absent sau incomplet |
| G3 | /geo/ghid | 4 | FAIL | 0/23 intrebari vizibile (H2) au pereche in FAQPage |
| G4 | /geo/ghid | 2 | FAIL | FAQPage absent |
| G5 | /geo/ghid | 2 | FAIL | BreadcrumbList absent |
| A1 | coerenta ANAF | 5 | FAIL | ANAF in sursele declarate: False; linii llms.txt care o prezinta ca sursa fara negatie: 1 |
| A2 | coerenta ANAF | 5 | FAIL | fisiere entitati care mentioneaza ANAF fara sa fie in sursele declarate: 1 |
| A3 | coerenta ANAF | 5 | PASS | propozitii vizibile care prezinta ANAF ca sursa folosita, fara negatie: 0 |
| D1 | digital-dna.json | 3 | PASS | digital-dna.json: HTTP 200, JSON valid |
| D2 | digital-dna.json | 4 | FAIL | status=SPECIFICATION_NOT_RUNTIME_VERIFIED; verification.result=NOT_TESTED (PASS cere result=PASS si status fara NOT_RUNTIME_VERIFIED) |
| D3 | digital-dna.json | 3 | PASS | campuri obligatorii: complete |

**J1 - elemente care nu corespund:**
- https://firmsfinder.eu/geo/ghid/

**J3 - elemente care nu corespund:**
- https://firmsfinder.eu/faq/
- https://firmsfinder.eu/despre/
- https://firmsfinder.eu/resurse/

**J4 - elemente care nu corespund:**
- https://firmsfinder.eu/faq/

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

**G5 - elemente care nu corespund:**
- https://firmsfinder.eu/geo/ghid/

**A1 - elemente care nu corespund:**
- - Datele provin din surse publice oficiale (ONRC, Ministerul Finanțelor, ANAF, Monitorul Oficial); accesul la aceste surse este gratuit.

**A2 - elemente care nu corespund:**
- https://firmsfinder.eu/entities.json

**D2 - elemente care nu corespund:**
- https://firmsfinder.eu/digital-dna.json

