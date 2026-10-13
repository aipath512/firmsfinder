# GEO AUDIT BIS V2 — PATCH LOCAL

Sursa: `firmsfinder-main(1).zip`. SHA256 arhiva: `6cc2c57548fe48937b0edfb30b90b7e6a4b49f9a8a62c6a05fc44c733b7a9dba`.

Fișiere GEO în arhiva sursă: 22. Fișiere JSON modificate: 6. llms.txt modificat: True.

- `geo/entities.json`: identificator AiVenture separat de brandul FirmsFinder; NU modifica automat JSON-LD HTML, care necesită patch separat.
- `geo/intents.json`: 21 redirectări logice `/cauta/` către `/cautare/`; 36 referințe către `/geo/` și `/aeo/` eliminate din `target_pages`, păstrate ca istoric.
- `geo/rag-metadata.json`: 12 discrepanțe topic/claim reconciliate cu citable-chunks.
- `geo/claims.json`: păstrat CL-011 fără aprobare; nu se inventează CL-001..CL-015.
- `geo/manifest.json`: inventar 22 fișiere, inclusiv ERE.
- `geo/verification.json`: inventar local actualizat, toate public UNKNOWN.
- `llms.txt`: corectate 11 apariții de URL spre `/geo/`.

IMPORTANT: Fișierele sunt actualizate LOCAL, NU publicate. Niciun test de citare AI nu a fost executat.

P0 RĂMAS: corectarea JSON-LD din paginile HTML (`@id` identitate) prin diff atent față de live.
P0 RĂMAS: furnizarea obiectelor reale CL-001..CL-015, reconcilierea claim_ids.
P0 RĂMAS: test HTTP/MIME/body/hash după deploy.
