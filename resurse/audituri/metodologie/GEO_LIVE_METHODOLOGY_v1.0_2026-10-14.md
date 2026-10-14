# GEO LIVE - metodologie v1.0 (2026-10-14)

Document normativ. Evaluatorul `.github/geo/geo_live.py` v1.0.0 aplica exact aceste reguli.
Aceeasi versiune, aceleasi ponderi si aceleasi reguli se folosesc la T0 (BEFORE) si la T1 (AFTER).
Orice schimbare de reguli sau ponderi inseamna versiune noua (v1.1+) si re-rulare T0 si T1 pe versiunea noua.

## Ce masoara si ce NU masoara
Masoara **GEO Technical Readiness**: daca semnalele tehnice sunt prezente, corecte, accesibile si coerente pe site-ul public https://firmsfinder.eu.
NU masoara **AI Visibility** (daca sistemele AI descopera, folosesc sau citeaza efectiv continutul) si nici **Business Impact** (contacte, conversii).
Un scor 100 inseamna ca toate controalele de mai jos sunt trecute; nu garanteaza citari sau rezultate comerciale.

## Stari ale unui control
- **PASS** - conditia este indeplinita complet pentru toate elementele evaluate (control atomic, fara punctaj partial).
- **FAIL** - conditia nu este indeplinita pentru cel putin un element; elementele sunt listate in raport. Include raspuns HTTP 404/410 pentru o resursa ceruta.
- **UNKNOWN** - controlul nu a putut fi determinat: raspuns HTTP 403, 429 sau 5xx, eroare de retea sau timeout dupa 3 incercari, ori eroare a evaluatorului. UNKNOWN nu este niciodata transformat in PASS sau FAIL.
- **N/A** - controlul nu se aplica. In v1.0 nu este folosit de niciun control; ramane definit pentru versiuni ulterioare.

## Formula scorului
`scor = 100 x (suma ponderilor controalelor PASS) / (suma ponderilor controalelor PASS + FAIL)`, rotunjit la o zecimala.
Controalele UNKNOWN si N/A nu intra la numitor si sunt raportate separat.
Evaluarea este **COMPLETA** numai daca nu exista niciun control UNKNOWN. Altfel este **INCOMPLETA**, iar scorul este provizoriu si nu se publica drept rezultat oficial.
Clasa (doar pentru evaluare completa): A >= 85; B 70-84,9; C 55-69,9; D 40-54,9; F < 40.

## Ponderi (suma = 100)
| Categorie | Pondere | Controale |
|---|--:|---|
| HTTP/JSON | 25 | H1 (5), H2 (8), H3 (6), H4 (3), H5 (3) |
| JSON-LD | 20 | J1 (5), J2 (5), J3 (5), J4 (5) |
| robots / llms / sitemap | 15 | R1 (3), R2 (3), R3 (3), R4 (2), R5 (2), R6 (2) |
| /geo/ghid | 15 | G1 (3), G2 (4), G3 (4), G4 (2), G5 (2) |
| Coerenta ANAF | 15 | A1 (5), A2 (5), A3 (5) |
| digital-dna.json | 10 | D1 (3), D2 (4), D3 (3) |

## Controale
**HTTP/JSON**
- H1: `/geo/manifest.json` raspunde 200, este JSON valid, Content-Type contine `json`.
- H2: toate URL-urile din `artifacts` ale manifestului raspund 200.
- H3: toate artefactele din manifest sunt JSON valid cu Content-Type care contine `json`.
- H4: `/signals.json` si `/entities.json` raspund 200 cu JSON valid.
- H5: `http://firmsfinder.eu/` redirectioneaza (301/302/307/308) catre `https://firmsfinder.eu`.

**JSON-LD** (pe toate paginile HTML din `sitemap.xml`)
- J1: fiecare pagina are cel putin un bloc JSON-LD.
- J2: toate blocurile JSON-LD se parseaza.
- J3: nicio pagina nu are noduri de nivel superior definite de doua ori cu acelasi `@id`.
- J4: orice referinta `{"@id": ...}` catre `firmsfinder.eu` sau `aiventure.ro` este definita in graful aceleiasi pagini.

**robots / llms / sitemap**
- R1: `/robots.txt` raspunde 200, non-HTML, nevid.
- R2: niciun grup cu `Disallow: /` pentru `*` sau pentru botii AI principali (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot) si exista directiva `Sitemap:` catre `sitemap.xml`.
- R3: `sitemap.xml` este XML valid si toate URL-urile din el raspund 200.
- R4: toate intrarile au `lastmod` ISO valid.
- R5: `/llms.txt` raspunde 200, non-HTML, incepe cu titlu H1 (`# `).
- R6: toate linkurile absolute `https://firmsfinder.eu...` din `llms.txt` raspund 200.

**/geo/ghid**
- G1: `/geo/ghid/` raspunde 200 HTML, este in sitemap, are canonical egal cu URL-ul.
- G2: exista JSON-LD `FAQPage` cu cel putin o intrebare, toate cu raspuns.
- G3: fiecare H2 vizibil care se termina cu `?` apare ca `Question.name` in FAQPage.
- G4: raspunsurile din FAQPage sunt toate distincte.
- G5: exista `BreadcrumbList` in JSON-LD.

**Coerenta ANAF** (referinta: `/source-provenance.json`, lista `sources`)
- A1: nicio linie din `llms.txt` nu prezinta ANAF ca sursa a datelor fara negatie, daca ANAF nu este in `sources`.
- A2: `/entities.json` si `/geo/entities.json` nu mentioneaza ANAF, daca ANAF nu este in `sources`.
- A3: nicio propozitie vizibila din paginile HTML nu prezinta ANAF ca sursa folosita, fara negatie, daca ANAF nu este in `sources`.
- Daca ANAF este adaugat in `sources`, controalele devin PASS; atunci coerenta cu realitatea trebuie dovedita separat (set de date verificat). Evaluatorul verifica doar coerenta dintre fisiere.

**digital-dna.json**
- D1: `/digital-dna.json` raspunde 200 cu JSON valid.
- D2: `verification.result` este `PASS` si `status` nu contine `NOT_RUNTIME_VERIFIED`.
- D3: campurile `signal_id`, `site`, `organization`, `brand` sunt prezente, iar `site` este `https://firmsfinder.eu`.

## Dovezi pe care le produce fiecare rulare
Pentru fiecare cerere HTTP: URL, URL final, status, stare, Content-Type, dimensiune, SHA-256 al raspunsului, timestamp UTC, `cf-cache-status` daca exista.
Pentru fiecare control: stare, detaliu, elementele care nu corespund.
Pentru rulare: versiunea si SHA-256 al evaluatorului, metodologia, commit-ul evaluat, linkul rularii CI, timestamp de inceput si sfarsit.
Cererile folosesc `Cache-Control: no-cache` si User-Agent `FirmsFinder-GEO-Live/1.0`.

## Limite
- Rularea este facuta din serverele GitHub Actions, la un moment dat; site-ul se poate schimba intre rulari.
- Regulile sunt euristici declarate (de ex. A3); pot da fals pozitiv/negativ si se corecteaza prin versiune noua, nu retroactiv.
- Timestamp-ul este cel al rularii CI si al commit-ului Git; nu este ostampila independenta (RFC 3161/OpenTimestamps).
- Nu este semnatura electronica calificata (eIDAS).
