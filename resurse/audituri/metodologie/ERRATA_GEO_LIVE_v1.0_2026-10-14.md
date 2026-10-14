# Erata GEO LIVE v1.0 -> evaluator v1.0.1 (2026-10-14)

Metodologia GEO LIVE v1.0 (text, ponderi, formula) ramane NESCHIMBATA. S-a corectat doar implementarea controlului A3.

## Defectul
Controlul A3 cere ca nicio propozitie vizibila sa nu prezinte ANAF ca sursa folosita, fara negatie, daca ANAF nu este in `source-provenance.json`.
Evaluatorul v1.0.0 detecta formularea sursei doar prin radacinile `provin`, `surs`, `folosit`, `utilizat`, `preluat`, `extras`.
Propozitia din subsolul paginilor, `FirmsFinder utilizeaza date oficiale de la Ministerul Finantelor (MF), ANAF si Monitorul Oficial, ... pentru peste 1,7 milioane de firme.`, foloseste `utilizeaza` si `date oficiale de la`, deci nu era detectata.
Rezultat: A3 a fost marcat PASS in T0-LIVE v1.0.0 (rularea CI 38523064171), desi regula, asa cum este scrisa, trebuia sa dea FAIL. Scorul acelei rulari (59,0) a fost supraestimat cu ponderea lui A3 (5 puncte).

## Corectura
`SRC_RE` din v1.0.1 detecteaza si `utiliz` si `date oficiale de la`. Nicio alta regula nu s-a schimbat.

## Tratamentul rezultatelor
- Raportul T0-LIVE de la evaluatorul v1.0.0 ramane publicat, neschimbat, marcat ca fiind corectat prin aceasta erata.
- T0 oficial devine rularea cu evaluatorul v1.0.1, efectuata pe site-ul de productie inainte de orice remediere (PR-ul de remediere nu a fost integrat in main).
- T1 se ruleaza cu v1.0.1.
