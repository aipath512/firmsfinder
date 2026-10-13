# FirmsFinder GEO V2.3 — patch tehnic (13.10.2026)

## Modificări
- `index.html`, `surse/index.html`: JSON-LD `Dataset` cu identitate stabilă, fără număr de firme sau actualizare inventate. `DataDownload` indică EXCLUSIV metadatele surselor, nu un export al bazei.
- `geo/dataset.json`: descrierea catalogului, surse și limitele de verificare.
- `geo/intents.json`: 24 intenții informaționale au pagini-candidat (`/faq/` sau `/surse/`) marcate pentru revizie editorială; 12 intenții de executare rămân fără destinație pentru a nu inventa funcționalități.
- `scripts/verify_geo_live.py`: script executabil pentru verificarea HTTP/MIME/JSON a URL-urilor; NU a fost executat pe producție în acest patch.

## Implementare
1. În GitHub, pe un branch, copiați fișierele din acest ZIP în rădăcina repo-ului FirmsFinder, păstrând căile.
2. Verificați diferențele și publicați prin fluxul Cloudflare Pages existent.
3. Pe calculator cu Python 3: `python scripts/verify_geo_live.py > geo-live-results.json`.
4. Pentru fiecare rezultat HTTP 200 verificați că răspunsul este artefactul corect, nu un fallback HTML; apoi verificați în browser JSON-LD și relevanța destinațiilor pentru intents.
5. Nu declarați scor GEO 90+ fără metodologie și teste independente de citare AI.

## Limitări
- 15 claims sunt candidate, 0 validate; nu am acces la datele D1 și jurnalele reale de import.
- 12 intenții tranzacționale nu au pagini valide demonstrate.
- Nu este demonstrată citarea de către ChatGPT, Gemini, Claude sau Perplexity.
- `Dataset` este metadată semantică, nu dovadă de proveniență a fiecărui rând.
