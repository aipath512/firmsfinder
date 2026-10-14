# Raport GEO (scorer determinist)

**Indicator:** 38.6 % (țintă 100 %) · PASS 3 · PARTIAL 11 · FAIL 8 · NA 1 · UNKNOWN 5
**Porți de calitate căzute:** Q1, Q2, Q4, Q7

| # | Semnal | Stare | Motiv | Fișiere afectate |
|--:|---|:-:|---|---|
| 1 | Wikipedia / Wikidata | UNKNOWN | Extern sau nemăsurabil din repository. |  |
| 2 | Crunchbase Profile | UNKNOWN | Extern sau nemăsurabil din repository. |  |
| 3 | proof.json IP Anchoring | FAIL | SHA-256 absent, greșit sau nepotrivit cu fișierul ancorat. **[operator: ștampila OpenTimestamps (se face din contul operatorului, pe fișierul publicat)]** | proof.json, geo/verification.json |
| 4 | sameAs External | FAIL | Zero sameAs în JSON-LD și în geo/entities.json. | index.html, geo/entities.json |
| 5 | ai.txt | PARTIAL | Există, dar fără politică, contact sau puncte de intrare suficiente (5 rânduri). | ai.txt |
| 6 | Hreflang | NA | Un singur limbaj (ro-RO). |  |
| 7 | changelog.json | PARTIAL | Doar instantanee locale; nicio modificare reală consemnată. | geo/changelog.json |
| 8 | ai.json | FAIL | ai.json absent sau doar antet generic. | ai.json |
| 9 | External Entity Links Quality | PASS | Surse oficiale legate: ['anaf.ro', 'data.gov.ro', 'mfinante.gov.ro', 'onrc.ro'] |  |
| 10 | llms.txt | PARTIAL | URL-uri nerezolvate: [] | llms.txt |
| 11 | governance.json | FAIL | governance.json absent. **[operator: conținutul real al politicilor (decizii ale operatorului)]** | governance.json |
| 12 | Press Mentions | UNKNOWN | Extern sau nemăsurabil din repository. |  |
| 13 | Geo-Tagged Content | FAIL | Fără areaServed=România și adresă în Organization. **[operator: conținut real pe localități (date)]** | localitati/index.html, index.html |
| 14 | Dataset Schema Corpus | PARTIAL | definiție diferită între HTML și geo/dataset.json; spatialCoverage lipsă; temporalCoverage lipsă (necesită date reale de la operator) **[operator: temporalCoverage = anii reali încărcați (date)]** | index.html, surse/index.html, geo/dataset.json |
| 15 | intents.json | PARTIAL | Intenții 150, ținte nerezolvate 13. | intents.json, geo/intents.json |
| 16 | Local Citations NAP | FAIL | Fără telefon/adresă în Organization sau nevizibile pe /contact/. **[operator: adresa completă cu stradă (decizie a operatorului)]** | contact/index.html, index.html |
| 17 | entities.json Registry | PARTIAL | 9 din 13 ID-uri nedefinite în pagini. | geo/entities.json, index.html |
| 18 | robots.txt AI | PASS | Boții AI principali permiși, Sitemap prezent. Lipsesc (informativ): ['Claude-User', 'Perplexity-User', 'Applebot', 'Meta-ExternalAgent'] | robots.txt |
| 19 | Author EEAT | PARTIAL | Autor = organizație sau Person fără semnătură vizibilă. | despre/index.html |
| 20 | Google Business Profile | UNKNOWN | Extern sau nemăsurabil din repository. |  |
| 21 | Twitter Card | PARTIAL | 13/14 pagini cu Twitter Card complet | geo/ghid/index.html |
| 22 | Entity Graph JSON-LD | PARTIAL | 10/14 pagini cu graf JSON-LD valid (ID-uri unice, referințe rezolvate) | faq/index.html, despre/index.html, resurse/index.html, geo/ghid/index.html |
| 23 | LinkedIn Verification | FAIL | Fără LinkedIn în sameAs. **[operator: confirmarea din partea LinkedIn]** | index.html |
| 24 | Named Entity Density | UNKNOWN | Extern sau nemăsurabil din repository. |  |
| 25 | Organization Completeness | FAIL | Doar 3/11 proprietăți. **[operator: logo real și identificator (CUI/EUID) — decizie a operatorului]** | index.html |
| 26 | OpenGraph Completeness | PARTIAL | 3/14 pagini cu Open Graph complet | index.html, intelligence/index.html, faq/index.html, contact/index.html |
| 27 | Brand Entity Consistency | PARTIAL | og:site_name diferit: ['FirmsFinder', 'FirmsFinder AI']; homepage trimite către domenii externe nedeclarate: ['1clic-ia.eu'] **[operator: decizia privind butonul CAUTĂ către alt domeniu și forma sloganului]** | index.html |
| 28 | Canonical URL | PASS | 14/14 pagini cu canonical corect |  |

| Poartă | Stare | Detaliu |
|---|:-:|---|
| Q1 Ghid: răspunsuri distincte | CADE | 9 distincte din 23 |
| Q2 Ghid: FAQPage JSON-LD cu aceleași perechi | CADE | fără FAQPage |
| Q3 Fără fișiere cu virgulă în nume | OK | găsit: [] |
| Q4 Homepage: linkuri interne spre toate paginile | CADE | lipsesc: ['/categorii/', '/cautare/', '/comparare/', '/contact/', '/despre/'] |
| Q5 Fără linkuri interne rupte | OK | [] |
| Q6 Hash-uri verification.json corecte | OK | diferă: [] |
| Q7 Fără documente interne în rădăcina publică | CADE | 13 fișiere de lucru: ['GEO_ACCEPTANCE_README.md', 'DELTA_INSTRUCTIUNI.txt', 'PUBLICARE.txt', 'PATCH_README.md', 'INVENTAR.md', 'README.md'] |
| Q8 Claims: nimic „verificat” fără dovadă | OK | încălcări: [] |
| Q9 Observații AI: fără rezultate fără dovadă | OK | 0 observații |
