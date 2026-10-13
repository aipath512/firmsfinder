# FirmsFinder GEO — acceptanță tehnică

Acest ZIP este proiectul complet, nu un patch incremental. Baza: arhiva (8) corectată.

## Corecții efectuate
- Eliminată distribuția `DataDownload` înșelătoare: `/geo/dataset.json` conține metadate, nu exportul bazei.
- Claims CL-011 (cantitativ) și CL-015 (juridic) marcate explicit ca neconfirmate.
- Canonical adăugat ghidului; URL introdus în sitemap.xml dacă sitemap-ul exista.
- `geo/verification.json` actualizat pentru fișierele modificate.
- `verify_geo.py` testează sintaxa JSON, manifestul, intențiile, țintele, ancorele și legăturile claim-evidence.

## Verificare
Din rădăcina repository-ului: `python verify_geo.py` (local) și `python verify_geo.py --live` (după deploy).
Rezultatele sunt scrise în `GEO_ACCEPTANCE_RESULTS.json`.

## Limitări
Un scor de 100/100 nu poate fi acordat fără PASS la controalele reale. Nu au fost inventate dovezi, număr de firme, aprobări sau citări ale modelelor AI. Fișierele ZIP nu dovedesc publicarea în Cloudflare.
