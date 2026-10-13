# Bucla GEO — ce face și cum se activează

**Ce există:** `geo_score.py` (scorer determinist), `geo_agent_loop.py` (buclă scorer → agent AI → scorer, max 10 iterații), `facts.json` (singurele fapte noi permise agentului), `../workflows/geo-loop.yml` (GitHub Actions).

**Ce face automat**
1. La fiecare push pe `main` și la fiecare pull request: rulează `verify_geo.py` și scorerul; raportul apare în pagina rulării (fila *Summary*).
2. La cerere (*Run workflow*, `run_agent = true`): agentul AI propune corecții, codul le acceptă sau le respinge, se re-scorează, maxim 10 iterații; apoi se deschide un Pull Request cu raportul.

**Ce NU face:** nu publică. Cloudflare publică doar ce îmbinați (*Merge*) în `main`.

**Plase de siguranță (în cod, nu în prompt):** agentul poate edita doar fișierele din lista `ALLOWED`; nu poate atinge `claims`, `evidence`, `observations`, `proof`, `backend`; nu poate introduce e-mailuri, telefoane, domenii sau „N firme” care nu există deja în repository sau în `facts.json`; orice modificare care înrăutățește un semnal sau o poartă este anulată; se oprește la țintă, la 2 iterații fără progres, când rămân doar defecte care cer date de la operator, sau la 10 iterații.

**Limite oneste:** scorul este o acoperire on-site după criteriile din scorer, nu vizibilitate AI. Semnalele care cer date sau decizii ale operatorului (OTS, logo/CUI, stradă, localități, temporalCoverage, LinkedIn, butonul CAUTĂ, ștergerea fișierelor interne) sunt marcate `needs_operator`; agentul nu are voie să le „rezolve”.
