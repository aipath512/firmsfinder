# Dicționar de date economice ale firmelor — v1.0.1 (2026-10-29)

Versiune imuabilă, generată la 2026-10-29T13:29:21+02:00, în sesiunea 0007C. Fișierul canonic este `dictionar-economic-firme_v1.0.1_2026-10-29.json`; acest document este derivat din el.

Starea sesiunii (C, H sau T), amprentele SHA-256 și dovezile OTS sunt în `sesiuni/registru-sesiuni.json`, nu în acest fișier.

## Cum se descarcă și se verifică

- Fișiere: `dictionar-economic-firme_v1.0.1_2026-10-29.json`, `dictionar-economic-firme_v1.0.1_2026-10-29.md`, `SHA256SUMS_v1.0.1_2026-10-29.txt`.
- Verificare: `sha256sum -c SHA256SUMS_v1.0.1_2026-10-29.txt`.
- Citire în Python: `import json; d = json.load(open('dictionar-economic-firme_v1.0.1_2026-10-29.json', encoding='utf-8'))`.

## Versionare

- Schema: MAJOR.MINOR.PATCH, ca la versiunile Python.
- MAJOR: schimbare incompatibilă: proprietate redenumită sau ștearsă, cardinalitate modificată.
- MINOR: adăugare compatibilă: proprietate, entitate, relație sau sursă nouă.
- PATCH: corectură de definiție, fără schimbare de structură.
- O versiune publicată nu se modifică niciodată; orice schimbare este o versiune nouă, cu fișiere noi.

## Ancorare în timp

- Câmpuri standard pe orice valoare: valid_from, valid_to, observat_la, sesiune, artefact_r2, sursa.
- O valoare nouă este un rând nou; cea veche primește valid_to; nimic nu se șterge. Valorile lipsă sunt NULL, niciodată 0 sau „-”.
- Sesiuni: NNNNC (curentă), NNNNH (înghețată, imuabilă), NNNNT (test); diferența dintre două sesiuni H produce ADDED / REMOVED / MODIFIED / UNCHANGED.
- Lanț de proveniență: VALOARE -> SURSA -> ARTEFACT_R2 (sha256) -> SESIUNE -> data și ora.
- SHA-256: Arată doar că conținutul este același. Nu dovedește când a existat și nu este semnătură digitală.
- OpenTimestamps: Ancorează amprenta într-un bloc Bitcoin: dovedește că fișierul exista cel târziu la data blocului. Confirmarea durează de obicei câteva ore.
- Număr de sesiune: Leagă cele două dovezi de o sesiune (NNNNC / NNNNH / NNNNT) printr-un rând în registrul de sesiuni.
- Ciclu de viață: C = în lucru; H = înghețată automat la transferul din GitHub în Cloudflare (SHA-256 + OTS înregistrate); un rând H nu se mai modifică.
- Limite: Aceste mecanisme păstrează dovezi tehnice de integritate și cronologie. Nu constituie, singure, dovadă juridică de originalitate sau proprietate.
- Relația versiune - sesiune: Versiunea (MAJOR.MINOR.PATCH) spune ce s-a schimbat în conținut; sesiunea (NNNNC/H/T) spune în ce stare și când a fost înghețat acel conținut. Registrul le leagă: sesiune <-> versiune <-> SHA-256 <-> OTS.

## Entități

| ID | Entitate | Tip | Cheie | Stare | Descriere |
|---|---|---|---|---|---|
| ENT-000001 | FIRMA | obiect | cui | in_uz | Entitate juridică sau persoană fizică autorizată, înregistrată la ONRC. Cheia este CUI. Excepție verificată în D1: sucursalele și filialele fără CUI propriu au cui NULL și se identifică prin cod_inmatriculare (decizie deschisă: cheia alternativă). |
| ENT-000002 | LOCALITATE | nomenclator | cod_localitate | planificat | Localitate (unitate teritorială) în care se află sediul. |
| ENT-000003 | JUDET | nomenclator | cod_judet | planificat | Județ (inclusiv municipiul București). |
| ENT-000004 | FORMA_JURIDICA | nomenclator | cod_forma | planificat | Formă juridică de organizare (SRL, SA, PFA, II, IF etc.). |
| ENT-000005 | STARE_FIRMA | nomenclator | cod_stare | in_uz | Stare a firmei în registrul comerțului (activă, suspendată, radiată etc.). |
| ENT-000006 | ACTIVITATE_CAEN | nomenclator | cod, versiune_caen | in_uz | Activitate din nomenclatorul CAEN, ierarhică: secțiune, diviziune, grupă, clasă. |
| ENT-000007 | SITUATIE_FINANCIARA | obiect | cui, an | in_uz | Situația financiară anuală (bilanț) a unei firme. În D1 există câte o tabelă pe an (mf_bilant_2023, _2024, _2025); structura de 24 de coloane este verificată pe mf_bilant_2025. |
| ENT-000008 | STARE_FISCALA | obiect | cui, valid_from | planificat | Starea fiscală la o dată: TVA, inactiv, split TVA, e-Factura. Verificat la 2026-10-29: tabela anaf_status există în D1, dar are 0 rânduri (starea fiscală ANAF nu este încă încărcată). |
| ENT-000009 | RESTANTA_BUGET | obiect | cui, data_lista | planificat | Restanță la bugetul de stat, conform listelor ANAF. |
| ENT-000010 | EVENIMENT_INSOLVENTA | obiect | numar_bpi, an_bpi, cui | planificat | Act publicat în BPI cu privire la o firmă. |
| ENT-000011 | DOSAR_INSTANTA | obiect | numar_dosar, instanta | planificat | Dosar de instanță în care apare firma. |
| ENT-000012 | CONTRACT_ACHIZITIE_PUBLICA | obiect | id_anunt | planificat | Contract de achiziție publică atribuit unei firme. |
| ENT-000013 | AJUTOR_PUBLIC | obiect | tip, id_sursa | planificat | Ajutor de stat sau proiect finanțat din fonduri UE primit de o firmă. |
| ENT-000014 | CONTACT_FIRMA | obiect | cui, tip, valoare | in_uz | Dată de contact a firmei (telefon, email, site, rețea socială). |
| ENT-000015 | PERSOANA | obiect | id_persoana | planificat | Persoană cu rol într-o firmă (administrator, asociat, beneficiar real). |
| ENT-000016 | SURSA | infrastructura | id | in_uz | Sursă de date înregistrată în registrul de surse. |
| ENT-000017 | ARTEFACT_R2 | infrastructura | cheie_r2 | in_uz | Fișier brut păstrat în R2, cu SHA-256; adevărul primar. |
| ENT-000018 | SESIUNE | infrastructura | cod | in_uz | Sesiune de lucru (convenția NNNNC / NNNNH / NNNNT): C = curentă, H = înghețată la transferul GitHub -> Cloudflare, T = test (o H modificabilă). Starea și dovezile (SHA-256, OTS) se țin în registrul de sesiuni din GitHub. |

## Relații și cardinalități

Citire: `card_direct` = câte ținte are o sursă; `card_invers` = câte surse are o țintă.

| ID | Sursă | Relație | Țintă | Inversă | Direct | Invers | Stare | Descriere |
|---|---|---|---|---|---|---|---|---|
| REL-000001 | FIRMA | ARE_SEDIU_IN | LOCALITATE | ARE_FIRME | 1 | 0..* | planificat | Firma are exact o localitate de sediu. |
| REL-000002 | LOCALITATE | IN_JUDET | JUDET | ARE_LOCALITATI | 1 | 1..* | planificat | Fiecare localitate aparține unui județ. |
| REL-000003 | FIRMA | ARE_FORMA_JURIDICA | FORMA_JURIDICA | FORMA_JURIDICA_A | 1 | 0..* | planificat | Firma are o formă juridică. |
| REL-000004 | FIRMA | ARE_STARE | STARE_FIRMA | STARE_A_FIRMELOR | 1..* | 0..* | existent | Firma are una sau mai multe stări ONRC, ancorate în timp. |
| REL-000005 | FIRMA | ACTIVEAZA_IN | ACTIVITATE_CAEN | ACTIVITATE_A_FIRMELOR | 1..* | 0..* | existent | Activități CAEN ale firmei; exact una este principală. |
| REL-000006 | ACTIVITATE_CAEN | PARTE_DIN | ACTIVITATE_CAEN | CONTINE | 0..1 | 0..* | existent | Ierarhia CAEN: secțiune, diviziune, grupă, clasă. |
| REL-000007 | ACTIVITATE_CAEN | ECHIVALENT_CU | ACTIVITATE_CAEN | ECHIVALENT_CU | 0..* | 0..* | planificat | Echivalența dintre versiunile vechi și noi ale CAEN (simetrică). |
| REL-000008 | FIRMA | ARE_SITUATIE_FINANCIARA | SITUATIE_FINANCIARA | SITUATIE_A | 0..* | 1 | existent | Un bilanț pe an; unic pe (cui, an). |
| REL-000009 | FIRMA | ARE_STARE_FISCALA | STARE_FISCALA | STARE_FISCALA_A | 0..* | 1 | planificat | Istoric de stări fiscale; cel curent are valid_to gol. |
| REL-000010 | FIRMA | ARE_RESTANTA | RESTANTA_BUGET | RESTANTA_A | 0..* | 1 | planificat | Restanțe la buget, câte una pe listă. |
| REL-000011 | FIRMA | ARE_EVENIMENT_INSOLVENTA | EVENIMENT_INSOLVENTA | EVENIMENT_AL | 0..* | 1 | planificat | Acte BPI privind firma. |
| REL-000012 | FIRMA | PARTE_IN | DOSAR_INSTANTA | ARE_PARTI | 0..* | 0..* | planificat | Dosare în care apare firma; potrivirea după nume are nivel de încredere. |
| REL-000013 | FIRMA | CASTIGA | CONTRACT_ACHIZITIE_PUBLICA | CASTIGAT_DE | 0..* | 1..* | planificat | Contracte publice câștigate (un contract poate avea mai mulți câștigători). |
| REL-000014 | FIRMA | PRIMESTE | AJUTOR_PUBLIC | PRIMIT_DE | 0..* | 1..* | planificat | Ajutoare de stat și proiecte UE primite. |
| REL-000015 | FIRMA | ARE_CONTACT | CONTACT_FIRMA | CONTACT_AL | 0..* | 1 | existent | Date de contact găsite. |
| REL-000016 | PERSOANA | ARE_ROL_IN | FIRMA | ARE_PERSOANE | 0..* | 0..* | planificat | Administratori, asociați, beneficiari reali; nu există sursă deschisă în masă. |
| REL-000017 | FIRMA | ASEMANATOARE_CU | FIRMA | ESTE_ASEMANATOARE_CU | 0..* | 0..* | planificat | Similaritate economică, calculată cu Vectorize; relație derivată. |
| REL-000018 | SURSA | PRODUCE | ARTEFACT_R2 | PROVINE_DIN_SURSA | 0..* | 1 | existent | Fișierele brute aduse dintr-o sursă. |
| REL-000019 | ARTEFACT_R2 | INCARCAT_IN | SESIUNE | CONTINE_ARTEFACTE | 1 | 0..* | existent | Sesiunea în care a fost adus fișierul. |
| REL-000020 | * | PROVINE_DIN | SURSA | FURNIZEAZA_DATE | 1..* | 0..* | existent | Orice valoare își păstrează sursa, artefactul și sesiunea (lanțul de proveniență). |

## Proprietăți pe entități

### FIRMA (ENT-000001)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000001 | cod_inmatriculare | TEXT | da | existent | SRC-0001:cod_inmatriculare; SRC-0003:nrRegCom | păstrat textual, format J<jj>/<nr>/<an> | public | Număr de înmatriculare în registrul comerțului (format J). |
| PRP-000002 | cui | INTEGER |  | existent | SRC-0001:cui; SRC-0002:cui; SRC-0003:cui (în cerere) | întreg, fără prefix RO și fără zerouri inițiale; NULL = fără CUI propriu, nu eroare | public | Cod unic de identificare fiscală; cheia firmei în tot sistemul. NULL pentru sucursale și filiale fără CUI propriu (ex. J40/2066/1991, SPRINT CRAIOVA SRL FILIALA BUCURESTI); acolo se folosește cod_inmatriculare și, unde e cazul, CUI-ul firmei-mamă. |
| PRP-000003 | denumire | TEXT | da | existent | SRC-0001:denumire; SRC-0003:denumire | text original, neschimbat | personal_daca_persoana_fizica | Denumirea oficială a firmei. |
| PRP-000004 | denumire_cautare | TEXT |  | existent, derivat |  | majuscule, fără diacritice, spații normalizate | public | Denumirea pregătită pentru căutare. |
| PRP-000005 | data_inmatriculare | DATE |  | existent | SRC-0001:data_inmatriculare | YYYY-MM-DD (normalizat ISO la 26 oct 2026; importurile viitoare scriu direct ISO) | public | Data înmatriculării în registrul comerțului. |
| PRP-000006 | euid | TEXT |  | existent | SRC-0001:euid | păstrat textual, format ROONRC.J... | public | Identificator european unic al firmei (EUID). |
| PRP-000007 | forma_juridica | TEXT |  | existent | SRC-0001:forma_juridica | text sursă + cod din nomenclator | public | Forma juridică, așa cum apare în sursă; se leagă de nomenclatorul FORMA_JURIDICA. |
| PRP-000008 | persoana_fizica | INTEGER |  | existent | SRC-0001:persoana_fizica | 0 sau 1 | public | 1 pentru PFA, II, IF, PF, AF; 0 pentru persoane juridice. |
| PRP-000009 | judet | TEXT |  | existent | SRC-0001:judet | legat de nomenclatorul JUDET | public | Județul sediului. |
| PRP-000010 | localitate | TEXT |  | existent | SRC-0001:localitate | legat de nomenclatorul LOCALITATE | public | Localitatea sediului. |
| PRP-000011 | strada | TEXT |  | existent | SRC-0001:strada | text original; adresa brută rămâne în R2 | personal_daca_persoana_fizica | Strada sediului. |
| PRP-000012 | nr | TEXT |  | existent | SRC-0001:nr | text original; adresa brută rămâne în R2 | personal_daca_persoana_fizica | Numărul. |
| PRP-000013 | bloc | TEXT |  | existent | SRC-0001:bloc | text original; adresa brută rămâne în R2 | personal_daca_persoana_fizica | Blocul. |
| PRP-000014 | scara | TEXT |  | existent | SRC-0001:scara | text original; adresa brută rămâne în R2 | personal_daca_persoana_fizica | Scara. |
| PRP-000015 | etaj | TEXT |  | existent | SRC-0001:etaj | text original; adresa brută rămâne în R2 | personal_daca_persoana_fizica | Etajul. |
| PRP-000016 | apartament | TEXT |  | existent | SRC-0001:apartament | text original; adresa brută rămâne în R2 | personal_daca_persoana_fizica | Apartamentul. |
| PRP-000017 | cod_postal | TEXT |  | existent | SRC-0001:cod_postal | text original; adresa brută rămâne în R2 | personal_daca_persoana_fizica | Codul poștal. |
| PRP-000018 | adr_completare | TEXT |  | existent | SRC-0001:adr_completare | text original; adresa brută rămâne în R2 | personal_daca_persoana_fizica | Completare de adresă. |
| PRP-000019 | sector | TEXT |  | existent | SRC-0001:sector | text original | public | Sectorul (pentru București). |
| PRP-000020 | web | TEXT |  | existent | SRC-0001:web; SRC-0016:url descoperit | URL complet cu schemă | public | Adresa site-ului, când este cunoscută. |
| PRP-000021 | tara_firma_mama | TEXT |  | existent | SRC-0001:tara_firma_mama | text sursă | public | Țara firmei-mamă, când este declarată. |
| PRP-000022 | coduri_stare | TEXT |  | existent | SRC-0001:coduri_stare | listă de coduri separate prin virgulă, ordine neconstantă; interogare corectă: (','//coduri_stare//',') LIKE '%,1048,%' | public | Lista codurilor de stare ONRC, într-un singur text separat prin virgulă (ex. „1048”, „1048,2069”, „2069,1048”); se leagă de nomenclatorul STARE_FIRMA. NU se filtrează cu egalitate: la 2026-10-29, printre firmele cu top=1, egalitatea cu „1048” găsește 1.147.602, iar „conține 1048” găsește 1.310.407 (diferență 162.805, 12,4%). Ordinea codurilor nu este constantă. |
| PRP-000023 | sursa_data | TEXT |  | existent | SRC-0001:sursa_data | ex. set data.gov.ro + dată ISO | public | Proveniența rândului: setul ONRC și data lui. |
| PRP-000024 | top | INTEGER | da | existent |  | implicit 1; persoana_fizica=1 implică top=0 | public | 1 pentru afișare publică; 0 pentru persoane fizice (nu se șterg, nu se afișează). NU indică activitate: la 2026-10-29, 184 de firme cu top=1 au și o stare critică (radiată, lichidare, dizolvare, faliment sau insolvență). Starea se citește din coduri_stare. |
| PRP-000025 | segment_vechime | TEXT |  | planificat, derivat |  | derivat; se recalculează la fiecare sesiune | public | Vechimea în segmente (sub 1 an, 1-2, 2-3, peste 3 ani), calculată din data_inmatriculare. |

### LOCALITATE (ENT-000002)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000028 | cod_localitate | TEXT | da | planificat |  | nomenclator teritorial oficial, sursă de verificat | public | Cod stabil al localității. |
| PRP-000029 | denumire | TEXT | da | planificat |  | fără variante de scriere | public | Denumirea localității. |
| PRP-000030 | cod_judet | TEXT | da | planificat |  | cheie către JUDET | public | Județul localității. |

### JUDET (ENT-000003)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000026 | cod_judet | TEXT | da | planificat |  | de stabilit nomenclatorul oficial | public | Cod stabil al județului. |
| PRP-000027 | denumire | TEXT | da | existent |  | fără variante de scriere | public | Denumirea județului. |

### FORMA_JURIDICA (ENT-000004)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000031 | cod_forma | TEXT | da | planificat |  | de stabilit | public | Cod stabil al formei juridice. |
| PRP-000032 | denumire | TEXT | da | existent |  |  | public | Denumirea formei juridice. |
| PRP-000033 | este_persoana_fizica | INTEGER |  | planificat |  | 0 sau 1 | public | 1 dacă forma juridică este de persoană fizică (PFA, II, IF). |

### STARE_FIRMA (ENT-000005)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000034 | cod_stare | TEXT | da | existent | SRC-0018:onrc_nom_stare.cod | text sursă | public | Codul stării în ONRC. Exemple verificate în onrc_nom_stare: 1048 funcțiune; 1084 radiată; 1052 lichidare; 1049 dizolvare; 1070 faliment; 1107 insolvență; 2065 mandat administratori expirat; 2069 sediu expirat; 2072 sechestru părți sociale/acțiuni. |
| PRP-000035 | denumire_stare | TEXT | da | existent | SRC-0018:onrc_nom_stare.denumire |  | public | Denumirea stării. |
| PRP-000036 | este_activa | INTEGER |  | planificat, derivat |  | derivat din lista aprobată; lista rămâne de aprobat de către proprietar | public | 1 pentru „în funcțiune”. Propunere inițială, de aprobat: coduri_stare conține 1048 și nu conține niciun cod critic (1049, 1052, 1070, 1084, 1107). Codurile 2065 și 2069 (mandat sau sediu expirat) sunt avertismente, nu excluderi: la 2026-10-29, peste 127.000 de firme cu top=1 au cod 2069 în combinațiile „1048,2069” și „2069,1048”. |

### ACTIVITATE_CAEN (ENT-000006)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000037 | cod | TEXT | da | existent | SRC-0018:onrc_nom_caen.cod | text, fără spații | public | Codul CAEN (literă pentru secțiune; 2, 3 sau 4 cifre). |
| PRP-000038 | denumire | TEXT | da | existent | SRC-0018:onrc_nom_caen.denumire |  | public | Denumirea activității, luată din nomenclator, nu din sursa firmei. |
| PRP-000039 | nivel | TEXT | da | existent |  | valori fixe | public | sectiune, diviziune, grupa sau clasa. |
| PRP-000040 | cod_parinte | TEXT |  | existent |  | gol pentru secțiuni | public | Codul nivelului superior. |
| PRP-000041 | versiune_caen | TEXT | da | planificat |  | valori fixe | public | Versiunea nomenclatorului (vechi sau nou); marcată explicit. |

### SITUATIE_FINANCIARA (ENT-000007)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000042 | cui | INTEGER | da | existent | SRC-0002:cui; SRC-0005:cui (în cerere) | ca la FIRMA | public | Firma căreia îi aparține bilanțul. |
| PRP-000043 | an | INTEGER | da | existent | SRC-0002:an; SRC-0005:an (în cerere) | întreg, 4 cifre | public | Anul bilanțului. |
| PRP-000044 | tip_bilant | TEXT |  | planificat | SRC-0002:tip | valori fixe | public | Tipul de bilanț: BL, UU sau IR. Nu există ca coloană în mf_bilant_2025 (verificat 2026-10-29). |
| PRP-000045 | sursa | TEXT |  | existent | SRC-0002:sursa | text sursă | public | Proveniența rândului în tabela mf_bilant_*. |
| PRP-000046 | caen_mf | TEXT |  | existent | SRC-0002:caen_mf | cod ca la ACTIVITATE_CAEN | public | CAEN principal din bilanț; folosit la filtrarea după activitatea reală. |
| PRP-000047 | active_imobilizate | INTEGER |  | existent | SRC-0002:active_imobilizate | întreg; NULL dacă lipsește | public | Active imobilizate. |
| PRP-000048 | active_circulante | INTEGER |  | existent | SRC-0002:active_circulante | întreg; NULL dacă lipsește | public | Active circulante. |
| PRP-000049 | stocuri | INTEGER |  | existent | SRC-0002:stocuri | întreg; NULL dacă lipsește | public | Stocuri. |
| PRP-000050 | creante | INTEGER |  | existent | SRC-0002:creante | întreg; NULL dacă lipsește | public | Creanțe. |
| PRP-000051 | casa_banci | INTEGER |  | existent | SRC-0002:casa_banci | întreg; NULL dacă lipsește | public | Casa și conturi la bănci. |
| PRP-000052 | cheltuieli_avans | INTEGER |  | existent | SRC-0002:cheltuieli_avans | întreg; NULL dacă lipsește | public | Cheltuieli în avans. |
| PRP-000053 | datorii | INTEGER |  | existent | SRC-0002:datorii | întreg; NULL dacă lipsește | public | Datorii. |
| PRP-000054 | venituri_avans | INTEGER |  | existent | SRC-0002:venituri_avans | întreg; NULL dacă lipsește | public | Venituri în avans. |
| PRP-000055 | provizioane | INTEGER |  | existent | SRC-0002:provizioane | întreg; NULL dacă lipsește | public | Provizioane. |
| PRP-000056 | capitaluri | INTEGER |  | existent | SRC-0002:capitaluri | întreg; NULL dacă lipsește | public | Capitaluri proprii. |
| PRP-000057 | capital_subscris | INTEGER |  | existent | SRC-0002:capital_subscris | întreg; NULL dacă lipsește | public | Capital subscris. |
| PRP-000058 | patrimoniu_regie | INTEGER |  | existent | SRC-0002:patrimoniu_regie | întreg; NULL dacă lipsește | public | Patrimoniul regiei. |
| PRP-000059 | cifra_afaceri | INTEGER |  | existent | SRC-0002:cifra_afaceri | întreg; unitatea de măsură (lei) și semnul valorilor de confirmat pe date; NULL dacă lipsește, niciodată 0 în loc de lipsă | public | Cifra de afaceri netă. |
| PRP-000060 | venituri_totale | INTEGER |  | existent | SRC-0002:venituri_totale | întreg; NULL dacă lipsește | public | Venituri totale. |
| PRP-000061 | cheltuieli_totale | INTEGER |  | existent | SRC-0002:cheltuieli_totale | întreg; NULL dacă lipsește | public | Cheltuieli totale. |
| PRP-000062 | profit_brut | INTEGER |  | existent | SRC-0002:profit_brut | întreg; unitatea de măsură (lei) și semnul valorilor de confirmat pe date; NULL dacă lipsește, niciodată 0 în loc de lipsă | public | Profit brut; pierderea brută este în coloana separată pierdere_bruta. |
| PRP-000063 | pierdere_bruta | INTEGER |  | existent | SRC-0002:pierdere_bruta | întreg; unitatea de măsură (lei) și semnul valorilor de confirmat pe date; NULL dacă lipsește, niciodată 0 în loc de lipsă | public | Pierdere brută, coloană separată de profit_brut. |
| PRP-000064 | profit_net | INTEGER |  | existent | SRC-0002:profit_net | întreg; unitatea de măsură (lei) și semnul valorilor de confirmat pe date; NULL dacă lipsește, niciodată 0 în loc de lipsă | public | Profit net; pierderea netă este în coloana separată pierdere_neta. |
| PRP-000065 | pierdere_neta | INTEGER |  | existent | SRC-0002:pierdere_neta | întreg; unitatea de măsură (lei) și semnul valorilor de confirmat pe date; NULL dacă lipsește, niciodată 0 în loc de lipsă | public | Pierdere netă, coloană separată de profit_net. |
| PRP-000066 | salariati | INTEGER |  | existent | SRC-0002:salariati | întreg; NULL dacă lipsește | public | Număr mediu de salariați. |

### STARE_FISCALA (ENT-000008)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000067 | cui | INTEGER | da | planificat | SRC-0003:cui | ca la FIRMA | public | Firma. |
| PRP-000068 | data_interogare | DATE | da | planificat | SRC-0003:data (în cerere) | YYYY-MM-DD | public | Data pentru care răspunde ANAF. |
| PRP-000069 | stare_inregistrare | TEXT |  | planificat | SRC-0003:stare_inregistrare | text sursă | public | Starea înregistrării fiscale. |
| PRP-000070 | data_inregistrare | DATE |  | planificat | SRC-0003:data_inregistrare | YYYY-MM-DD | public | Data înregistrării fiscale. |
| PRP-000071 | cod_caen_anaf | TEXT |  | planificat | SRC-0003:cod_CAEN | cod ca la ACTIVITATE_CAEN | public | CAEN comunicat de ANAF. |
| PRP-000072 | platitor_tva | INTEGER |  | planificat | SRC-0003:câmp TVA din răspuns; nume exact de confirmat | 0 sau 1 | public | 1 dacă este înregistrată în scopuri de TVA. |
| PRP-000073 | tva_la_incasare | INTEGER |  | planificat | SRC-0003:nume exact de confirmat | 0 sau 1 | public | 1 dacă aplică TVA la încasare. |
| PRP-000074 | split_tva | INTEGER |  | planificat | SRC-0003:nume exact de confirmat | 0 sau 1 | public | 1 dacă aplică split TVA. |
| PRP-000075 | inactiv | INTEGER |  | planificat | SRC-0003:nume exact de confirmat | 0 sau 1 | public | 1 dacă este declarată inactivă de ANAF. |
| PRP-000076 | data_inactivare | DATE |  | planificat | SRC-0003:nume exact de confirmat | YYYY-MM-DD | public | Data declarării ca inactivă. |
| PRP-000077 | data_reactivare | DATE |  | planificat | SRC-0003:nume exact de confirmat | YYYY-MM-DD | public | Data reactivării. |
| PRP-000078 | e_factura | INTEGER |  | planificat | SRC-0003:statusRO_e_Factura; SRC-0004:stare | 0 sau 1 | public | 1 dacă este în registrul RO e-Factura. |
| PRP-000079 | data_inreg_e_factura | DATE |  | planificat | SRC-0003:data_inreg_Reg_RO_e_Factura; SRC-0004:dataInscriere | YYYY-MM-DD | public | Data înscrierii în RO e-Factura. |
| PRP-000080 | organ_fiscal_competent | TEXT |  | planificat | SRC-0003:organFiscalCompetent | text sursă | public | Organul fiscal competent. |
| PRP-000081 | forma_proprietate | TEXT |  | planificat | SRC-0003:forma_de_proprietate | text sursă | public | Forma de proprietate. |

### RESTANTA_BUGET (ENT-000009)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000082 | cui | INTEGER | da | planificat | SRC-0006:cod de identificare fiscală | ca la FIRMA | public | Firma. |
| PRP-000083 | data_lista | DATE | da | planificat | SRC-0006:data listei | YYYY-MM-DD | public | Data de referință a listei. |
| PRP-000084 | suma_restanta | INTEGER |  | planificat | SRC-0006:coloana sumei; de confirmat | lei întregi | public | Suma restantă, în lei. |
| PRP-000085 | categorie_contribuabil | TEXT |  | planificat | SRC-0006:numele listei | valori fixe | public | mari, mijlocii sau mici, după lista de proveniență. |
| PRP-000086 | este_pe_lista_alba | INTEGER |  | planificat | SRC-0007:prezență în listă | 0 sau 1 | public | 1 dacă apare pe lista albă (fără restanțe) la data listei. |

### EVENIMENT_INSOLVENTA (ENT-000010)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000087 | cui | INTEGER | da | planificat | SRC-0008:cod de identificare fiscală | ca la FIRMA | public | Firma. |
| PRP-000088 | numar_bpi | INTEGER | da | planificat | SRC-0008:număr publicare BPI | întreg | public | Numărul BPI. |
| PRP-000089 | an_bpi | INTEGER | da | planificat | SRC-0008:an publicare BPI | întreg | public | Anul BPI. |
| PRP-000090 | numar_dosar | TEXT |  | planificat | SRC-0008:număr dosar | text sursă | public | Numărul dosarului de insolvență. |
| PRP-000091 | tip_act | TEXT |  | planificat | SRC-0008:tip act | text sursă | public | Tipul actului publicat. |
| PRP-000092 | data_publicare | DATE |  | planificat | SRC-0008:data publicării | YYYY-MM-DD | public | Data publicării. |

### DOSAR_INSTANTA (ENT-000011)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000093 | numar_dosar | TEXT | da | planificat | SRC-0009:numar dosar | text sursă | public | Numărul dosarului. |
| PRP-000094 | instanta | TEXT | da | planificat | SRC-0009:instanță | text sursă | public | Instanța. |
| PRP-000095 | materie | TEXT |  | planificat | SRC-0009:categorieCaz | text sursă | public | Materia dosarului (categorie de caz). |
| PRP-000096 | stadiu_procesual | TEXT |  | planificat | SRC-0009:stadiu | text sursă | public | Stadiul procesual. |
| PRP-000097 | rol_firma | TEXT |  | planificat | SRC-0009:calitate parte | text sursă | public | Rolul firmei în dosar (reclamant, pârât etc.). |
| PRP-000098 | incredere_potrivire | TEXT | da | planificat, derivat |  | valori fixe; fără potrivire exactă nu se afișează ca fapt | public | exact, aproximativ sau neconfirmat: sursa caută după nume, nu după CUI. |

### CONTRACT_ACHIZITIE_PUBLICA (ENT-000012)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000099 | id_anunt | TEXT | da | planificat | SRC-0010:id anunț | text sursă | public | Identificatorul anunțului în SEAP. |
| PRP-000100 | cui_castigator | INTEGER | da | planificat | SRC-0010:câștigător | ca la FIRMA | public | Firma câștigătoare. |
| PRP-000101 | autoritate_contractanta_cui | INTEGER |  | planificat | SRC-0010:autoritate contractantă | ca la FIRMA | public | Autoritatea contractantă. |
| PRP-000102 | cpv | TEXT |  | planificat | SRC-0010:CPV | text sursă | public | Cod CPV. |
| PRP-000103 | valoare | INTEGER |  | planificat | SRC-0010:valoare | lei întregi | public | Valoarea contractului, în lei. |
| PRP-000104 | data_atribuire | DATE |  | planificat | SRC-0010:dată atribuire | YYYY-MM-DD | public | Data atribuirii. |

### AJUTOR_PUBLIC (ENT-000013)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000105 | tip | TEXT | da | planificat | SRC-0011:tip măsură; SRC-0012:program | valori fixe | public | ajutor_de_stat sau fonduri_ue. |
| PRP-000106 | id_sursa | TEXT | da | planificat | SRC-0011:id; SRC-0012:cod SMIS | text sursă | public | Identificatorul în sursa de origine. |
| PRP-000107 | valoare | INTEGER |  | planificat | SRC-0011:valoare; SRC-0012:valoare | lei întregi | public | Valoarea, în lei. |
| PRP-000108 | data | DATE |  | planificat | SRC-0011:dată; SRC-0012:dată | YYYY-MM-DD | public | Data acordării sau a contractului. |
| PRP-000109 | furnizor | TEXT |  | planificat | SRC-0011:furnizor; SRC-0012:autoritate | text sursă | public | Furnizorul ajutorului sau autoritatea de management. |

### CONTACT_FIRMA (ENT-000014)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000110 | cui | INTEGER | da | existent |  | număr întreg, fără RO | public | Cheie externă către FIRMA.cui (fără prefix RO). |
| PRP-000111 | tip | TEXT | da | existent | SRC-0016:tip găsit; SRC-0003:telefon | valori fixe | public | telefon, email, site sau retea_sociala. |
| PRP-000112 | valoare | TEXT | da | existent | SRC-0016:valoare găsită; SRC-0003:telefon | telefon în format E.164; email cu litere mici | personal_daca_persoana_fizica | Valoarea contactului. |
| PRP-000113 | data_observata | DATE | da | existent |  | YYYY-MM-DD | public | Data la care a fost văzut. |
| PRP-000114 | confidentialitate | TEXT | da | existent |  | valori fixe | public | public sau mascat (pentru persoane fizice). |

### PERSOANA (ENT-000015)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000115 | id_persoana | TEXT | da | planificat | SRC-0017:id | intern, fără CNP | personal_daca_persoana_fizica | Identificator intern al persoanei. |
| PRP-000116 | rol | TEXT | da | planificat | SRC-0017:rol | valori fixe | personal_daca_persoana_fizica | administrator, asociat sau beneficiar_real. |

### SURSA (ENT-000016)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000117 | id | TEXT | da | existent |  | format fix | public | Identificator SRC-nnnn. |
| PRP-000118 | stare | TEXT | da | existent |  | valori fixe | public | in_uz, verificat, partial_verificat, de_verificat sau exclus. |

### ARTEFACT_R2 (ENT-000017)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000119 | cheie_r2 | TEXT | da | existent |  | text | public | Calea fișierului în R2. |
| PRP-000120 | sha256 | TEXT | da | existent |  | hex, 64 de caractere | public | Amprenta SHA-256 a fișierului. |
| PRP-000121 | data_aducerii | TIMESTAMP | da | existent |  | ISO 8601 cu fus orar | public | Data și ora la care fișierul a fost adus. |

### SESIUNE (ENT-000018)

| ID | Proprietate | Tip | Obl. | Stare | Surse (sursă:câmp) | Normalizare | Sensibilitate | Descriere |
|---|---|---|---|---|---|---|---|---|
| PRP-000122 | cod | TEXT | da | existent |  | 4 cifre + literă | public | NNNNC, NNNNH sau NNNNT. |
| PRP-000123 | timestamp_ro | TIMESTAMP | da | existent |  | ISO 8601 | public | Momentul creării sesiunii, ora României. |
| PRP-000124 | stare | TEXT | da | existent |  | valori fixe | public | C (curentă), H (înghețată) sau T (test). Se citește din registrul de sesiuni, nu din fișierele sesiunii. |
| PRP-000125 | inghetata_la | TIMESTAMP |  | existent |  | ISO 8601 | public | Momentul trecerii C -> H, la transferul GitHub -> Cloudflare; gol cât timp sesiunea nu e înghețată. |
| PRP-000126 | sha256_fisiere | TEXT | da | existent |  | hex, 64 de caractere, câte una per fișier | public | Amprentele SHA-256 ale fișierelor sesiunii: arată că conținutul este același, nu când a existat. |
| PRP-000127 | ots | TEXT |  | existent |  | nume de fișier .ots; stare: in_asteptare sau confirmat_bitcoin | public | Fișierul OpenTimestamps (.ots) per fișier: dovada că fișierul exista cel târziu la data confirmată în Bitcoin. |

## Surse

| ID | Sursă | Unde | Cum | Frecvență | Acces / licență | Limite | Stare |
|---|---|---|---|---|---|---|---|
| SRC-0001 | ONRC firme (registrul comerțului) | https://data.gov.ro | CSV pe data.gov.ro | lunar | open data | Adresa exactă a setului: în MASTER_CONTEXT_FISCAL_B2B | in_uz |
| SRC-0002 | MF situații financiare (bilanțuri) | https://data.gov.ro | CSV pe data.gov.ro | anual | open data | Adresa exactă a setului: în MASTER_CONTEXT_FISCAL_B2B | in_uz |
| SRC-0003 | ANAF plătitor TVA / inactiv / e-Factura (v9) | https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva | REST POST JSON, după CUI și dată | la cerere | gratuit, fără cheie | max. 100 CUI per cerere; max. 1 cerere pe secundă; documentația diferă ușor de comportamentul live | verificat |
| SRC-0004 | ANAF registru RO e-Factura | https://webservicesp.anaf.ro/api/registruroefactura/v1/interogare | REST POST JSON | la cerere | gratuit, fără cheie | max. 100 CUI per cerere; max. 1 cerere pe secundă | verificat |
| SRC-0005 | ANAF bilanț (serviciu web) |  | REST, după CUI și an | la cerere | gratuit, fără cheie | max. 1 cerere pe secundă | verificat |
| SRC-0006 | ANAF restanțe la buget | https://data.gov.ro/dataset/datoriile-catre-bugetul-de-stat | liste pe data.gov.ro | trimestrial | open data, reutilizabil | doar contribuabili peste un prag de datorie | verificat |
| SRC-0007 | ANAF lista albă (fără restanțe) | https://www.anaf.ro/restante/listaalba.xhtml | pagină web | trimestrial | public | metodă de acces automat de verificat | verificat |
| SRC-0008 | BPI - Buletinul Procedurilor de Insolvență | https://www.bpi.ro | căutare web (și portal.onrc.ro) | zilnic | serviciile „Sumar” și „Persoane publicate în BPI” sunt gratuite; BPI online complet este cu abonament | căutare după număr/an BPI, denumire, CUI, nr. Reg. Com., nr. dosar; acces automat de verificat | verificat |
| SRC-0009 | portal.just.ro (dosare în instanțe) | https://portal.just.ro | serviciu web SOAP (portalquery.just.ro) | replicare nocturnă din ECRIS | gratuit, cu menționarea sursei | căutare după nume (nu după CUI); max. 1.000 de rezultate per interogare | verificat |
| SRC-0010 | SEAP / SICAP (achiziții publice) | https://e-licitatie.ro | portal; fără export în masă confirmat | continuu | public | export oficial în masă neconfirmat | partial_verificat |
| SRC-0011 | RegAS (registrul ajutoarelor de stat) |  | de stabilit | de stabilit | acces public neconfirmat | RegAS 2 în dezvoltare (2025) | partial_verificat |
| SRC-0012 | MySMIS / fonduri-ue.ro | https://www.fonduri-ue.ro/statistici | date deschise la MFE; de verificat | lunar (conform MFE) | date deschise parțiale | lista beneficiarilor de verificat | partial_verificat |
| SRC-0013 | OSIM (mărci și brevete) | https://osim.ro | BOPI în PDF; căutare online | periodic | public | date deschise neconfirmate | de_verificat |
| SRC-0014 | VIES (validare TVA UE) | https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number | REST | la cerere | gratuit, fără cheie | nume și adresă doar unde țara le oferă | verificat |
| SRC-0015 | GLEIF (LEI) | https://www.gleif.org/en/lei-data/gleif-api | API public | zilnic | gratuit | doar entități cu LEI (în special mari și financiare) | verificat |
| SRC-0016 | Site-urile firmelor (Firecrawl) |  | crawl propriu cu respectarea robots.txt | la cerere | public | respectarea robots.txt și a termenilor fiecărui site | in_uz |
| SRC-0017 | Termene API (acționariat / UBO) | https://termene.ro/documentatie-api | REST POST JSON, după CUI | la cerere | plătit: 100 € / 100 de interogări (UBO, lanțuri de deținere) | doar după CUI, nu în masă | verificat |
| SRC-0018 | Nomenclatoare derivate din ONRC (CAEN, stări) |  | tabele derivate (onrc_nom_caen, onrc_nom_stare) | odată cu ONRC | open data | versiunea CAEN (vechi/nou) de marcat explicit | in_uz |

## Referințe încrucișate

### Identificatori

| Identificator | Format | Apare în (sursă:câmp) | Notă |
|---|---|---|---|
| cui | întreg, fără prefix RO | SRC-0001:cui; SRC-0002:cui; SRC-0003:cui; SRC-0004:cui; SRC-0008:cod de identificare fiscală; SRC-0014:număr TVA = RO + cui; SRC-0010:cui câștigător; SRC-0006:cod de identificare fiscală |  |
| cod_inmatriculare | J<jj>/<nr>/<an> | SRC-0001:cod_inmatriculare; SRC-0003:nrRegCom; SRC-0008:număr înregistrare Registrul Comerțului |  |
| euid | ROONRC.J... | SRC-0001:euid |  |
| lei (LEI) | 20 de caractere (ISO 17442) | SRC-0015:LEI | doar entități cu LEI; planificat |
| denumire | text | SRC-0009:nume parte | Singura legătură cu dosarele este numele: potrivire doar exactă pe denumire + județ, cu nivel de încredere marcat. |

### Nomenclatoare

| Între | Și | Regulă |
|---|---|---|
| FIRMA.judet (text ONRC) | JUDET.cod_judet | potrivire pe denumire normalizată; cele nepotrivite se raportează |
| FIRMA.localitate (text ONRC) | LOCALITATE.cod_localitate | potrivire pe denumire + județ |
| FIRMA.forma_juridica (text ONRC) | FORMA_JURIDICA.cod_forma | potrivire pe denumire normalizată |
| FIRMA.coduri_stare | STARE_FIRMA.cod_stare | listă de coduri, câte o relație ARE_STARE pe cod |
| CAEN versiune veche | CAEN versiune nouă | relația ECHIVALENT_CU, N:M |
| SITUATIE_FINANCIARA.caen_mf | ACTIVITATE_CAEN.cod | filtrul pe activitate reală folosește caen_mf, nu CAEN-ul autorizat |

## Reguli de conflict

- identitate juridică (denumire, sediu, formă juridică, data înmatriculării, stare ONRC): SRC-0001
- stare fiscală (TVA, inactiv, split TVA, e-Factura): SRC-0003
- indicatori financiari: SRC-0002 (ANAF bilanț (SRC-0005) servește doar la verificare)
- activitate: SRC-0002 (caen_mf pentru activitatea reală; CAEN-ul autorizat rămâne cel din ONRC)
- evenimente (insolvență, dosare, contracte, ajutoare): adaugă înregistrări (adaugă înregistrări; nu modifică stări)
- contacte: SRC-0016 (ordine: site-ul firmei, apoi ANAF, apoi câmpul web din ONRC)
- Conflictul se păstrează ca două valori, fiecare cu sursa ei; câmpul afișat urmează precedența de mai sus.

## Politici

- **persoane fizice**: PFA, II, IF, PF și AF rămân în bază cu top=0; nu se afișează public, iar numele se maschează după acordul GDPR.
- **date excluse**: Datele bancare (IBAN) returnate de ANAF nu intră în dicționar.
- **surse**: Doar date publice, cu respectarea licenței, a termenilor și a limitelor de cereri ale fiecărei surse.
- **date personale**: Nu se păstrează CNP; PERSOANA se identifică printr-un identificator intern.

## Decizii deschise

- Cheia alternativă a entității FIRMA pentru sucursale/filiale fără CUI (cod_inmatriculare).
- Lista codurilor de stare considerate critice și a celor de avertisment (propunere în STARE_FIRMA.este_activa).
- Unitatea de măsură și semnul valorilor din mf_bilant_* (lei? valori negative?) de verificat pe date; 2023 și 2024 de verificat separat de 2025.
- Numele exacte ale indicatorilor ANAF TVA (doc_WS_V9.txt).
- Adresele exacte ale seturilor de pe data.gov.ro.
- Sursă pentru UBO/acționariat: nu există una deschisă în masă.

## Istoric versiuni

- v1.0.0 (2026-10-29): Prima versiune: structura entităților, relațiilor și surselor; 24 de coloane ale tabelei onrc_firme definite. Nu a fost înghețată în registru.
- v1.0.1 (2026-10-29): Corecții verificate pe D1 (b2b-romania-db): coduri_stare conține mai multe coduri (filtrare cu „conține”, nu cu egalitate); top nu indică activitate; cui poate fi NULL la sucursale; nomenclatorul onrc_nom_stare documentat; anaf_status este gol; cele 24 de coloane din mf_bilant_2025 definite (profit și pierdere sunt coloane separate); tip_bilant nu există în D1. Adăugat: număr de sesiune, registru de sesiuni, distincția SHA-256 (integritate) / OpenTimestamps (timp).

Statistici: 18 entități, 127 proprietăți (72 existente), 20 relații, 18 surse.
