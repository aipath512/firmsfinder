# Test: 10 întrebări pe D1, cu și fără dicționar — v1.0 (2026-10-29)

Dicționar folosit: v1.0.1, sesiunea 0007H (înghețată 2026-10-29 18:06).
Date: baza `b2b-romania-db` (D1), set ONRC 02.09.2026, bilanțuri MF 2025. Toate interogările au fost doar de citire.

## Cum a fost făcut testul

- „Fără dicționar" = interogarea pe care ar scrie-o un agent care vede doar numele tabelelor și al coloanelor (de exemplu `top=1` înseamnă „activă", `coduri_stare='1048'` înseamnă „în funcțiune").
- „Cu dicționar" = interogarea scrisă după regulile din dicționarul v1.0.1.
- Cifrele sunt calculate pe datele reale din D1, nu estimate.

## Rezultate

| # | Întrebare | Fără dicționar | Cu dicționar | Diferență |
|---|---|---|---|---|
| 1 | Câte firme active are România? | 1.784.283 (toate rândurile) | 1.310.223 (publice, fără stare critică) | −474.060 (26,6%): 473.876 de persoane fizice (top=0) și 184 cu stare critică |
| 2 | Câte firme publice sunt în starea 1048 (în funcțiune)? | 1.147.602 (`coduri_stare='1048'`) | 1.310.407 (`LIKE` pe lista de coduri) | −162.805 (12,4%) |
| 3 | Câte firme au simultan stările 1048 și 2069? | 65.118 (`='1048,2069'`) | 141.503 | −76.385 (54%); și cu ambele ordini (127.683) lipsesc 13.820 de firme cu 3 sau mai multe coduri |
| 4 | Câte firme distincte există? | 1.783.972 (`COUNT(DISTINCT cui)`) | 1.784.283 (`COUNT(*)`, cheie alternativă `cod_inmatriculare`) | −311: 306 fără CUI (sucursale, filiale) și 5 CUI repetate |
| 5 | Câte dintre firmele active au bilanț 2025? | 805.091 | 834.481 | −29.390 (3,5%) |
| 6 | Cifra de afaceri totală 2025? | 2.720.513.742.946, prezentată ca „lei" | Aceeași sumă, cu rezerva că unitatea (lei) și semnul nu sunt confirmate | Cifra nu se schimbă, afirmația da. 403 valori negative, 188.322 NULL (lipsă, nu zero), 30.782 zero |
| 7 | Câte firme au pierdere netă în 2025? | 0 (`profit_net<0`) | 317.326 (`pierdere_neta>0`) | Fără dicționar, concluzia ar fi „nicio firmă în pierdere" |
| 8 | Câte firme din Cluj pot fi afișate public? | 96.257 | 73.498 (`top=1`) | +22.759 (31%) persoane fizice, care nu se afișează |
| 9 | Câte firme sunt inactive fiscal (ANAF)? | 0 | „Necunoscut": `anaf_status` are 0 rânduri | Zero față de „nu știm" |
| 10 | Câți salariați au firmele din IT (CAEN 62), 2025? | 44.888 (19.564 firme, după CAEN din ONRC) | 151.871 (38.146 firme, după `caen_mf`) | −106.983 (70%) |

Scor: 9 din 10 răspunsuri diferă. 8 diferă material (peste 3% sau categoric): 1, 2, 3, 5, 7, 8, 9, 10. Nr. 4 diferă cu 0,02%. Nr. 6 diferă doar în afirmație.

## Limitele testului

1. Interogările „fără dicționar" sunt scrise de mine, ca simulare a unui agent care vede doar schema. Nu a rulat un agent real.
2. „Corect" înseamnă „conform dicționarului". Lista stărilor critice (1084, 1052, 1049, 1070, 1107) este o propunere aprobată de dumneavoastră, nu o verificare externă.
3. Cele 10 întrebări au fost alese în jurul capcanelor deja cunoscute. Testul arată că dicționarul previne greșeli cunoscute, nu că un agent răspunde corect în general.

## Ce a scos la iveală testul în dicționar

- **Lacună la Q10:** `onrc_firma_caen.caen` este o listă de forma `0142:2,0146:2,...` (cod:versiune). Dicționarul nu descrie acest format. Un `LIKE '62%'` prinde doar firmele al căror prim cod începe cu 62. Reușita de la Q10 vine din regula `caen_mf` pentru activitatea reală, nu din formatul listei.
- **Lipsă la Q4:** cele 5 CUI repetate nu sunt menționate în dicționar (doar cele 306 NULL).
- **Corecție la raportul anterior:** „65.118 + 62.565" acoperea doar două ordini de scriere. Numărul complet pentru 1048 și 2069 este 141.503.
- **Q1, Q5:** 918.334 de bilanțuri 2025, dar doar 834.543 se leagă de o firmă din ONRC (83.791 fără corespondent).
- **Starea 1084 (radiată):** 0 rânduri în bază, deci cele 184 de stări critice sunt din celelalte patru coduri.

## Cost

Aproximativ 15,2 milioane de rânduri citite din D1 (planul include 25 de miliarde pe lună), fără nicio scriere.
