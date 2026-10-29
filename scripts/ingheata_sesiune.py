#!/usr/bin/env python3
"""Înghețarea sesiunilor (C -> H), verificarea sesiunilor H și confirmarea OpenTimestamps.

Registrul: sesiuni/registru-sesiuni.json (GitHub = SSOT). Doar bibliotecă standard.

  python scripts/ingheata_sesiune.py --verifica
      Compară amprentele SHA-256 ale tuturor sesiunilor H cu fișierele din repo. Eșuează la orice diferență.

  python scripts/ingheata_sesiune.py --ingheata 0007 [--fara-ots]
      Verifică amprentele sesiunii 0007C, ștampilează fișierele cu OpenTimestamps (ots stamp)
      și schimbă rândul în 0007H cu momentul înghețării. Refuză dacă 0007H există deja.

  python scripts/ingheata_sesiune.py --ots-upgrade
      Pentru ștampilele aflate „in_asteptare”, rulează ots upgrade; când ancorarea în Bitcoin e completă,
      marchează „confirmat_bitcoin”.

SHA-256 arată doar că conținutul este același. OpenTimestamps arată cel târziu când a existat.
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys
from datetime import datetime
from zoneinfo import ZoneInfo

REGISTRU = os.path.join("sesiuni", "registru-sesiuni.json")


def sha256(cale):
    h = hashlib.sha256()
    with open(cale, "rb") as f:
        for bloc in iter(lambda: f.read(1 << 20), b""):
            h.update(bloc)
    return h.hexdigest()


def citeste():
    with open(REGISTRU, encoding="utf-8") as f:
        return json.load(f)


def scrie(reg):
    with open(REGISTRU, "w", encoding="utf-8") as f:
        json.dump(reg, f, ensure_ascii=False, indent=2)
        f.write("\n")


def acum_ro():
    return datetime.now(ZoneInfo("Europe/Bucharest")).replace(microsecond=0).isoformat()


def ots(*argumente):
    exe = shutil.which("ots")
    if not exe:
        sys.exit("EROARE: comanda „ots” lipsește (pip install opentimestamps-client).")
    return subprocess.run([exe, *argumente], capture_output=True, text=True)


POINTER = os.path.join("dictionar", "latest.json")
SITE = "https://firmsfinder.eu/"


def scrie_pointer(rand):
    """Pointerul stabil spre ultima versiune înghețată (adresa fixă pe care o citesc agenții)."""
    ptr = {
        "dictionar": "Dicționar de date economice ale firmelor (FirmsFinder)",
        "versiune": rand["versiune_dictionar"],
        "sesiune": rand["sesiune"],
        "inghetata_la": rand["inghetata_la"],
        "fisiere": [
            {"url": SITE + f["cale"], "sha256": f["sha256"], **({"ots": SITE + f["ots"]} if f.get("ots") else {})}
            for f in rand["fisiere"]
        ],
        "registru": SITE + "sesiuni/registru-sesiuni.json",
        "nota": "Pointer mutabil, rescris la fiecare înghețare. Integritatea se verifică cu sha256; starea ștampilei OTS este în registru.",
    }
    with open(POINTER, "w", encoding="utf-8") as f:
        json.dump(ptr, f, ensure_ascii=False, indent=2)
        f.write("\n")


def verifica():
    reg, erori = citeste(), []
    if os.path.exists(POINTER):
        with open(POINTER, encoding="utf-8") as f:
            ptr = json.load(f)
        rand_h = next((r for r in reg["sesiuni"] if r["sesiune"] == ptr.get("sesiune") and r["stare"] == "H"), None)
        if rand_h is None:
            erori.append(f"latest.json arată sesiunea {ptr.get('sesiune')}, care nu este H în registru")
        else:
            sume = {SITE + x["cale"]: x["sha256"] for x in rand_h["fisiere"]}
            for x in ptr.get("fisiere", []):
                if sume.get(x["url"]) != x["sha256"]:
                    erori.append(f"latest.json: amprenta pentru {x['url']} nu corespunde registrului")
    for r in reg["sesiuni"]:
        if r["stare"] != "H":
            continue
        for fis in r.get("fisiere", []):
            if not os.path.exists(fis["cale"]):
                erori.append(f"{r['sesiune']}: lipsește {fis['cale']}")
            elif sha256(fis["cale"]) != fis["sha256"]:
                erori.append(f"{r['sesiune']}: {fis['cale']} s-a modificat după înghețare")
    if erori:
        print("VERIFICARE EȘUATĂ:")
        for e in erori:
            print(" -", e)
        sys.exit(1)
    print("OK: toate sesiunile H corespund amprentelor din registru.")


def ingheata(nr, fara_ots):
    if not re.fullmatch(r"\d{4}", nr):
        sys.exit("EROARE: numărul sesiunii trebuie să aibă 4 cifre (ex. 0007).")
    reg = citeste()
    cod_h, cod_c = nr + "H", nr + "C"
    if any(r["sesiune"] == cod_h for r in reg["sesiuni"]):
        sys.exit(f"EROARE: {cod_h} există deja; o sesiune H nu se mai modifică.")
    rand = next((r for r in reg["sesiuni"] if r["sesiune"] == cod_c), None)
    if rand is None:
        sys.exit(f"EROARE: nu există sesiunea {cod_c} în registru.")
    for fis in rand["fisiere"]:
        if not os.path.exists(fis["cale"]):
            sys.exit(f"EROARE: lipsește {fis['cale']}.")
        if sha256(fis["cale"]) != fis["sha256"]:
            sys.exit(f"EROARE: {fis['cale']} diferă de amprenta din registru; sesiunea nu se îngheață.")
    for fis in rand["fisiere"]:
        if fara_ots:
            continue
        cale_ots = fis["cale"] + ".ots"
        if not os.path.exists(cale_ots):
            rez = ots("stamp", fis["cale"])
            if rez.returncode != 0 or not os.path.exists(cale_ots):
                sys.exit(f"EROARE ots stamp pe {fis['cale']}:\n{rez.stdout}\n{rez.stderr}")
        fis["ots"] = cale_ots
        fis["ots_stare"] = "in_asteptare"
    rand["sesiune"] = cod_h
    rand["stare"] = "H"
    rand["inghetata_la"] = acum_ro()
    if fara_ots:
        rand["observatie"] = (rand.get("observatie", "") + " Înghețată fără OTS (--fara-ots); ștampila lipsește.").strip()
    scrie(reg)
    scrie_pointer(rand)
    print(f"OK: {cod_c} -> {cod_h} la {rand['inghetata_la']}")


def ots_upgrade():
    reg, schimbat = citeste(), False
    for r in reg["sesiuni"]:
        for fis in r.get("fisiere", []):
            if fis.get("ots_stare") != "in_asteptare" or not fis.get("ots"):
                continue
            if not os.path.exists(fis["ots"]):
                print(f"AVERTISMENT: lipsește {fis['ots']}")
                continue
            ots("upgrade", fis["ots"])
            info = ots("info", fis["ots"])
            bak = fis["ots"] + ".bak"
            if os.path.exists(bak):
                os.remove(bak)
            if "BitcoinBlockHeaderAttestation" in info.stdout:
                fis["ots_stare"] = "confirmat_bitcoin"
                fis["ots_confirmat_la"] = acum_ro()
                schimbat = True
                print(f"confirmat: {fis['ots']}")
            else:
                print(f"în așteptare: {fis['ots']}")
    if schimbat:
        scrie(reg)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--verifica", action="store_true")
    g.add_argument("--ingheata", metavar="NNNN")
    g.add_argument("--ots-upgrade", action="store_true")
    p.add_argument("--fara-ots", action="store_true", help="îngheață fără ștampila OTS (doar dacă serverele OTS nu răspund)")
    a = p.parse_args()
    if a.verifica:
        verifica()
    elif a.ingheata:
        ingheata(a.ingheata, a.fara_ots)
    else:
        ots_upgrade()
