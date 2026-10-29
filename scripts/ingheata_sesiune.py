#!/usr/bin/env python3
"""ingheata_sesiune.py — v1.1 (2026-10-29)
v1.1: la înghețare se iau în calcul doar fișierele dicționarului care nu au fost
încă înghețate; astfel a doua versiune a dicționarului nu mai dă eroare.

Locul în GitHub: scripts/ingheata_sesiune.py   (repo: aipath512/firmsfinder)

Trei comenzi (le pornesc cele 3 acțiuni GitHub; nu se rulează manual):

  ingheata NNNN    trece sesiunea NNNN din C în H: verifică amprentele din
                   dictionar/SHA256SUMS, calculează SHA-256 pe fișierele
                   dictionarului, scrie manifestul, il ștampilează cu
                   OpenTimestamps, adaugă rândul NNNNH în registru și
                   scrie dictionar/latest.json.
  verifica         compară fișierele cu registrul și latest.json cu registrul;
                   ieșire cu eroare dacă un fișier înghețat s-a modificat.
  confirma-ots     trece ștampilele din „in_asteptare" în „confirmat_bitcoin"
                   când ancorarea în Bitcoin este completă.

Doar biblioteca standard Python; clientul `ots` (opentimestamps-client) se
instalează în acțiune. Variabila OTS_CMD poate înlocui comanda `ots` (teste).
"""
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

RADACINA = Path(os.environ.get("RADACINA_REPO") or Path(__file__).resolve().parent.parent)
REGISTRU = RADACINA / "sesiuni" / "registru-sesiuni.json"
DICT = RADACINA / "dictionar"
LATEST = DICT / "latest.json"
BAZA_URL = os.environ.get("BAZA_URL", "https://firmsfinder.eu")
OTS = os.environ.get("OTS_CMD", "ots")


def acum():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def eroare(mesaj):
    print("EROARE: " + mesaj, file=sys.stderr)
    sys.exit(1)


def sha256_fisier(cale):
    h = hashlib.sha256()
    with open(cale, "rb") as f:
        for bloc in iter(lambda: f.read(1024 * 1024), b""):
            h.update(bloc)
    return h.hexdigest()


def rel(cale):
    return cale.relative_to(RADACINA).as_posix()


def incarca_registru():
    if not REGISTRU.exists():
        eroare("lipsește " + rel(REGISTRU))
    with open(REGISTRU, encoding="utf-8") as f:
        return json.load(f)


def salveaza_registru(reg):
    tmp = REGISTRU.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(reg, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, REGISTRU)


def deja_inghetate(reg):
    """Căile fișierelor deja înghețate în orice sesiune H."""
    return {cale for r in reg["sesiuni"] if r.get("stare") == "H" for cale in (r.get("fisiere") or {})}


def fisiere_dictionar(reg):
    """Fișierele NOI ale dicționarului: *.json (fără latest.json) și *.md, neînghețate încă."""
    if not DICT.is_dir():
        eroare("lipsește folderul dictionar/")
    inghetate = deja_inghetate(reg)
    gasite = [p for p in sorted(DICT.iterdir())
              if p.is_file() and p.name != "latest.json" and p.suffix in (".json", ".md")
              and rel(p) not in inghetate]
    if not gasite:
        eroare("în dictionar/ nu există fișiere noi (.json / .md) de înghețat")
    return gasite


def verifica_sha256sums(noi):
    """Dacă există dictionar/SHA256SUMS: fiecare fișier listat trebuie să corespundă,
    iar fiecare fișier nou trebuie să fie listat."""
    sums = DICT / "SHA256SUMS"
    if not sums.exists():
        print("AVERTISMENT: dictionar/SHA256SUMS lipsește; nu s-a făcut verificarea inițială.")
        return
    listate = set()
    for linie in sums.read_text(encoding="utf-8").splitlines():
        linie = linie.strip()
        if not linie:
            continue
        m = re.fullmatch(r"([0-9a-fA-F]{64})\s+\*?(.+)", linie)
        if not m:
            eroare("linie neînțeleasă în SHA256SUMS: " + linie)
        asteptat, nume = m.group(1).lower(), m.group(2)
        cale = DICT / nume
        if not cale.exists():
            eroare("SHA256SUMS listează un fișier care lipsește: " + nume)
        if sha256_fisier(cale) != asteptat:
            eroare("amprenta nu corespunde SHA256SUMS pentru " + nume)
        listate.add(nume)
    nelistate = [p.name for p in noi if p.name not in listate]
    if nelistate:
        eroare("fișiere noi care nu sunt în SHA256SUMS: " + ", ".join(nelistate))
    print("SHA256SUMS: toate amprentele corespund.")


def versiune_dictionar(fisiere):
    jsoane = [p for p in fisiere if p.suffix == ".json"]
    if len(jsoane) != 1:
        eroare("trebuie să existe exact un fișier .json NOU de dicționar în dictionar/ (găsite: %d)" % len(jsoane))
    with open(jsoane[0], encoding="utf-8") as f:
        date = json.load(f)
    if isinstance(date, dict):
        meta = date.get("meta") if isinstance(date.get("meta"), dict) else {}
        for sursa in (date, meta):
            for cheie in ("versiune", "version"):
                if isinstance(sursa.get(cheie), str):
                    return sursa[cheie]
    m = re.search(r"(\d+\.\d+\.\d+)", jsoane[0].name)
    if m:
        return m.group(1)
    eroare("nu pot afla versiunea dicționarului (nici în JSON, nici în numele fișierului)")


def manifest_text(amprente):
    return "".join("%s  %s\n" % (amprente[k], k) for k in sorted(amprente))


def ots(*argumente):
    return subprocess.run([OTS, *argumente], capture_output=True, text=True)


def normalizeaza_numar(numar):
    numar = numar.strip().upper()
    if re.fullmatch(r"\d{4}[CHT]", numar):
        numar = numar[:4]
    if not re.fullmatch(r"\d{4}", numar):
        eroare("numărul sesiunii trebuie să aibă 4 cifre (ex. 0007); primit: " + numar)
    return numar


def cmd_ingheata(numar):
    numar = normalizeaza_numar(numar)
    reg = incarca_registru()
    if any(r.get("numar") == numar + "H" for r in reg["sesiuni"]):
        eroare("sesiunea %sH există deja în registru; o sesiune înghețată nu se îngheață a doua oară." % numar)
    fisiere = fisiere_dictionar(reg)
    verifica_sha256sums(fisiere)
    versiune = versiune_dictionar(fisiere)
    amprente = {rel(p): sha256_fisier(p) for p in fisiere}

    manifest = RADACINA / "sesiuni" / (numar + "H.manifest.txt")
    manifest.write_text(manifest_text(amprente), encoding="utf-8")
    rez = ots("stamp", str(manifest))
    ots_fisier = Path(str(manifest) + ".ots")
    if rez.returncode != 0 or not ots_fisier.exists():
        manifest.unlink(missing_ok=True)
        eroare("ștampilarea OpenTimestamps a eșuat: " + (rez.stderr or rez.stdout).strip())

    moment = acum()
    reg["sesiuni"].append({
        "numar": numar + "H",
        "stare": "H",
        "moment": moment,
        "versiune_dictionar": versiune,
        "fisiere": amprente,
        "manifest": rel(manifest),
        "ots": rel(ots_fisier),
        "ots_stare": "in_asteptare",
    })
    salveaza_registru(reg)

    latest = {
        "schema": "latest/1",
        "versiune": versiune,
        "sesiune": numar + "H",
        "moment": moment,
        "fisiere": {Path(k).name: {"url": "%s/%s" % (BAZA_URL, k), "sha256": v} for k, v in amprente.items()},
        "manifest": "%s/%s" % (BAZA_URL, rel(manifest)),
        "ots": "%s/%s" % (BAZA_URL, rel(ots_fisier)),
        "registru": "%s/%s" % (BAZA_URL, rel(REGISTRU)),
    }
    with open(LATEST, "w", encoding="utf-8") as f:
        json.dump(latest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("Sesiunea %sH înghețată; versiunea dicționarului %s; %d fișiere." % (numar, versiune, len(amprente)))


def ultimul_h_cu_fisiere(reg):
    randuri = [r for r in reg["sesiuni"] if r.get("stare") == "H" and r.get("fisiere")]
    return randuri[-1] if randuri else None


def cmd_verifica():
    reg = incarca_registru()
    erori = []
    for r in reg["sesiuni"]:
        if r.get("stare") != "H" or not r.get("fisiere"):
            continue
        nume = r["numar"]
        for cale_rel, sha in r["fisiere"].items():
            cale = RADACINA / cale_rel
            if not cale.exists():
                erori.append("%s: lipsește %s" % (nume, cale_rel))
            elif sha256_fisier(cale) != sha:
                erori.append("%s: %s s-a modificat după înghețare" % (nume, cale_rel))
        manifest = RADACINA / r.get("manifest", "")
        if not r.get("manifest") or not manifest.exists():
            erori.append("%s: lipsește manifestul" % nume)
        elif manifest.read_text(encoding="utf-8") != manifest_text(r["fisiere"]):
            erori.append("%s: manifestul nu corespunde registrului" % nume)
        if not r.get("ots") or not (RADACINA / r["ots"]).exists():
            erori.append("%s: lipsește fișierul .ots" % nume)

    ultim = ultimul_h_cu_fisiere(reg)
    if ultim is None:
        if LATEST.exists():
            erori.append("latest.json există, dar registrul nu are nicio sesiune H cu amprente")
    else:
        if not LATEST.exists():
            erori.append("lipsește dictionar/latest.json (ar trebui să indice %s)" % ultim["numar"])
        else:
            with open(LATEST, encoding="utf-8") as f:
                latest = json.load(f)
            if latest.get("sesiune") != ultim["numar"]:
                erori.append("latest.json indică %s, registrul are ultima sesiune %s" % (latest.get("sesiune"), ultim["numar"]))
            if latest.get("versiune") != ultim.get("versiune_dictionar"):
                erori.append("latest.json: versiunea nu corespunde registrului")
            din_latest = {k: v.get("sha256") for k, v in latest.get("fisiere", {}).items()}
            din_registru = {Path(k).name: v for k, v in ultim["fisiere"].items()}
            if din_latest != din_registru:
                erori.append("latest.json: amprentele nu corespund registrului")

    if erori:
        for e in erori:
            print("EROARE: " + e, file=sys.stderr)
        sys.exit(1)
    print("Registrul și fișierele înghețate corespund.")


def cmd_confirma_ots():
    reg = incarca_registru()
    schimbat = False
    for r in reg["sesiuni"]:
        if r.get("ots_stare") != "in_asteptare" or not r.get("ots"):
            continue
        cale = RADACINA / r["ots"]
        if not cale.exists():
            print("AVERTISMENT: lipsește %s" % r["ots"])
            continue
        ots("upgrade", str(cale))
        Path(str(cale) + ".bak").unlink(missing_ok=True)
        info = ots("info", str(cale))
        text = info.stdout + info.stderr
        m = re.search(r"BitcoinBlockHeaderAttestation\((\d+)\)", text)
        if info.returncode == 0 and m:
            r["ots_stare"] = "confirmat_bitcoin"
            r["bloc_bitcoin"] = int(m.group(1))
            r["confirmat_la"] = acum()
            schimbat = True
            print("%s: confirmat în Bitcoin (bloc %s)." % (r["numar"], m.group(1)))
        else:
            print("%s: încă în așteptare." % r["numar"])
    if schimbat:
        salveaza_registru(reg)


def main():
    argumente = sys.argv[1:]
    if argumente[:1] == ["ingheata"] and len(argumente) == 2:
        cmd_ingheata(argumente[1])
    elif argumente == ["verifica"]:
        cmd_verifica()
    elif argumente == ["confirma-ots"]:
        cmd_confirma_ots()
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == "__main__":
    main()
