# FirmsFinder GEO V2.2 — patch conservator

Sursa: firmsfinder-main (3).zip. Modificări: geo/claims.json, geo/verification.json, geo/manifest.json (dacă e necesar pentru integritate).

15 texte de afirmații candidate au fost RECUPERATE din geo/evidence.json, nu inventate. Toate au publication.approved=false; evidence_records[].review.status rămâne NOT_COLLECTED. CL-011 (volumul bazei) și CL-015 (conformitate EU AI Act) sunt high risk și NU pot fi publicate drept fapte demonstrate.

Nu s-au modificat homepage-ul, CTA, JSON-LD, intents sau robots.txt. Nu s-a verificat deploymentul Cloudflare și nu s-au executat teste AI.

Pași: (1) review al celor 15 afirmații, (2) colectare dovezi și aprobare, (3) deploy pe branch, (4) verificare HTTP+MIME+JSON+hash, (5) măsurare citări.
