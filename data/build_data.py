"""Merge Glottolog CLDF data with Wikidata into web/data.json.

Output is a compact column-oriented JSON:
  {"generated": "...", "cols": [...], "rows": [[...], ...]}

Row fields (index = position in cols):
  id    glottocode
  name  English name (Glottolog)
  nr    Russian name (Wikidata label, may be "")
  iso   ISO 639-3 code (may be "")
  fam   top-level family name ("" = isolate)
  ma    macroarea
  lat, lon  coordinates (null if unknown)
  cc    ISO 3166-1 alpha-2 country codes, ";"-separated
  aes   endangerment 1..6 (0 = unknown)
  med   most extensive description 0..4 (-1 = unknown)
  spk   speaker count from Wikidata (null = unknown)
  cat   L=spoken, S=sign, P=pidgin, M=mixed
  wr    ru.wikipedia URL ("" if none)
  we    en.wikipedia URL ("" if none)
"""

import csv
import datetime
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
OUT = os.path.join(HERE, "..", "web", "data.json")

CATEGORY_MAP = {
    "Spoken_L1_Language": "L",
    "Sign_Language": "S",
    "Pidgin": "P",
    "Mixed_Language": "M",
}

RU_STRIP = re.compile(r"\s+язык$", re.IGNORECASE)


def clean_ru(name):
    """'русский язык' -> 'Русский'; also fixes stray Latin lookalike first letters."""
    name = RU_STRIP.sub("", name).strip()
    # Wikidata labels occasionally start with a Latin lookalike letter
    lat2cyr = {"a": "а", "A": "А", "e": "е", "E": "Е", "o": "о", "O": "О", "c": "с", "C": "С", "x": "х", "X": "Х", "P": "Р", "H": "Н", "B": "В", "M": "М", "T": "Т", "K": "К", "y": "у"}
    if name and name[0] in lat2cyr and any("Ѐ" <= ch <= "ӿ" for ch in name[1:]):
        name = lat2cyr[name[0]] + name[1:]
    return name[:1].upper() + name[1:] if name else ""


def main():
    langs = list(csv.DictReader(open(os.path.join(RAW, "languages.csv"))))
    by_id = {r["ID"]: r for r in langs}

    aes, med, cat = {}, {}, {}
    for row in csv.DictReader(open(os.path.join(RAW, "values.csv"))):
        p = row["Parameter_ID"]
        if p == "aes":
            aes[row["Language_ID"]] = int(row["Value"])
        elif p == "med":
            med[row["Language_ID"]] = int(row["Value"])
        elif p == "category":
            cat[row["Language_ID"]] = row["Value"]

    wd = json.load(open(os.path.join(RAW, "wikidata.json")))

    rows = []
    for r in langs:
        if r["Level"] != "language":
            continue
        c = CATEGORY_MAP.get(cat.get(r["ID"], ""))
        if not c:
            continue  # bookkeeping, unattested, artificial, speech register, unclassifiable
        iso = r["ISO639P3code"]
        w = wd.get(iso, {})
        fam = by_id.get(r["Family_ID"], {}).get("Name", "") if r["Family_ID"] else ""
        lat = round(float(r["Latitude"]), 3) if r["Latitude"] else None
        lon = round(float(r["Longitude"]), 3) if r["Longitude"] else None
        rows.append([
            r["ID"],
            r["Name"],
            clean_ru(w.get("name_ru", "")),
            iso,
            fam,
            r["Macroarea"],
            lat,
            lon,
            r["Countries"],
            aes.get(r["ID"], 0),
            med.get(r["ID"], -1),
            w.get("speakers"),
            c,
            w.get("wiki_ru", ""),
            w.get("wiki_en", ""),
        ])

    rows.sort(key=lambda x: (-(x[11] or 0), x[1]))
    out = {
        "generated": datetime.date.today().isoformat(),
        "cols": ["id", "name", "nr", "iso", "fam", "ma", "lat", "lon", "cc", "aes", "med", "spk", "cat", "wr", "we"],
        "rows": rows,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    n_map = sum(1 for x in rows if x[6] is not None)
    n_spk = sum(1 for x in rows if x[11] is not None)
    n_ru = sum(1 for x in rows if x[2])
    print(f"{len(rows)} languages | {n_map} with coords | {n_spk} with speakers | {n_ru} with ru names")
    print(f"data.json: {os.path.getsize(OUT) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
