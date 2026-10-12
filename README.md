# FirmsFinder — ON-SITE 60 · v1.0 · 12.10.2026

**Autor / proiect:** AiVenture S.R.L. · FirmsFinder

**Conținut:** 60 fișiere de semnale ON-SITE + `onsite-manifest.json`, `README.md` și `validate_onsite.py`.

**IMPORTANT:** Aceste fișiere sunt un set nou de declarații, reguli și ghiduri. Nu sunt dovada că backend-ul, agenții, verificarea independentă sau serviciile UE funcționează. Nu înlocui automat fișierele existente fără diff.

**Instalare:** dezarhivează în rădăcina repository-ului FirmsFinder, după ce verifici diferențele față de versiunile existente. Fișierele cu același nume le vor suprascrie. În special `robots.txt`, `sitemap.xml`, `schema-org.json`, `services.json` și fișierele de politici trebuie revizuite înainte de publicare.

**Intenții:** `intents.json` conține 150 de intenții: 50 CAUTĂ, 50 FII GĂSIT, 50 DELEAGĂ AI-ULUI. Sunt intenții semantice, nu 150 endpointuri.

**Nu include:** identități din raportul intern ECBTAX, CUI-uri de prospectare, promisiuni de certificare, SHA/OTS inexistente sau API-uri pretins funcționale.

**Verificare locală:** `python validate_onsite.py`

**Verificare după deploy:** accesează `/intents.json`, `/sitemap.xml`, `/robots.txt`, `/llms.txt`; confirmă tipul MIME, statusul HTTP 200 și conținutul real, nu fallback HTML.

**Fișiere și destinații:** toate cele 60 se pun în rădăcina publică a site-ului, lângă `index.html`. Nu adăuga `README.md` și validatorul la sitemap.

**Observație:** sitemap include rute prezente în arhiva analizată; înainte de publicare, verifică dacă fiecare este indexabilă și nu redirecționează la homepage.
