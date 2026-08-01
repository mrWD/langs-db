"""Merge Glottolog CLDF data with Wikidata into web/data.json + web/altnames.json.

data.json is compact and column-oriented:
  {"generated": "...", "cols": [...], "rows": [[...], ...]}

Row fields (index = position in cols):
  id    glottocode
  name  English name (Glottolog)
  nm    {lang: localized name} from Wikidata labels (0 when empty)
  iso   ISO 639-3 code (may be "")
  fam   top-level family name ("" = isolate)
  ma    macroarea (may be ";"-separated)
  lat, lon  coordinates (null if unknown)
  cc    ISO 3166-1 alpha-2 country codes, ";"-separated
  aes   endangerment 1..6 (0 = unknown)
  med   most extensive description 0..4 (-1 = unknown)
  spk   speaker count from Wikidata (null = unknown)
  cat   L=spoken, S=sign, P=pidgin, M=mixed
  wr    ru.wikipedia URL ("" if none)
  we    en.wikipedia URL ("" if none)
  par   parent language glottocode ("" for languages, filled for dialects;
        dialects inherit aes and cc from the parent when their own are empty)

altnames.json holds Glottolog's alternative names ({glottocode: [names]}) and is
fetched lazily by the site to widen search beyond the primary name.
"""

import csv
import datetime
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
WEB = os.path.join(HERE, "..", "web")

CATEGORY_MAP = {
    "Spoken_L1_Language": "L",
    "Sign_Language": "S",
    "Pidgin": "P",
    "Mixed_Language": "M",
}

# generic words Wikidata labels wrap language names in, stripped for display
STRIP_RE = {
    "ru": re.compile(r"\s+язык$", re.I),
    "uk": re.compile(r"\s+мова$", re.I),
    "es": re.compile(r"^(idioma|lengua)\s+", re.I),
    "fr": re.compile(r"^langue\s+", re.I),
    "it": re.compile(r"^lingua\s+", re.I),
    "pt": re.compile(r"^(língua|idioma)\s+", re.I),
    "pl": re.compile(r"^język\s+", re.I),
    "id": re.compile(r"^bahasa\s+", re.I),
    "tr": re.compile(r"\s+dili$", re.I),
    "hi": re.compile(r"\s+भाषा$"),
}
# Latin lookalikes that occasionally start a Cyrillic Wikidata label
LAT2CYR = {"a": "а", "A": "А", "e": "е", "E": "Е", "o": "о", "O": "О", "c": "с", "C": "С",
           "x": "х", "X": "Х", "P": "Р", "H": "Н", "B": "В", "M": "М", "T": "Т", "K": "К", "y": "у"}
NO_CASE = {"zh", "ja", "ar", "hi"}  # scripts without letter case


def clean_label(lang, name):
    """Normalize a Wikidata label: drop the generic 'language' word, fix case."""
    name = name.strip()
    rx = STRIP_RE.get(lang)
    if rx:
        name = rx.sub("", name).strip()
    if not name:
        return ""
    if lang in ("ru", "uk") and name[0] in LAT2CYR and any("Ѐ" <= ch <= "ӿ" for ch in name[1:]):
        name = LAT2CYR[name[0]] + name[1:]
    if lang in NO_CASE:
        return name
    return name[:1].upper() + name[1:]


def build_altnames(keep_ids):
    """Glottolog alternative names, deduplicated per languoid."""
    out = {}
    path = os.path.join(RAW, "names.csv")
    if not os.path.exists(path):
        print("! raw/names.csv missing — altnames.json not rebuilt")
        return None
    for r in csv.DictReader(open(path)):
        gid = r["Language_ID"]
        if gid not in keep_ids:
            continue
        n = r["Name"].strip()
        if not n or n.lower() == "not specified":
            continue
        out.setdefault(gid, set()).add(n)
    return {k: sorted(v) for k, v in out.items()}


def main():
    langs = list(csv.DictReader(open(os.path.join(RAW, "languages.csv"))))
    by_id = {r["ID"]: r for r in langs}

    aes, med, cat, classification = {}, {}, {}, {}
    for row in csv.DictReader(open(os.path.join(RAW, "values.csv"))):
        p = row["Parameter_ID"]
        if p == "aes":
            aes[row["Language_ID"]] = int(row["Value"])
        elif p == "med":
            med[row["Language_ID"]] = int(row["Value"])
        elif p == "category":
            cat[row["Language_ID"]] = row["Value"]
        elif p == "classification":
            classification[row["Language_ID"]] = row["Value"]

    wd = json.load(open(os.path.join(RAW, "wikidata.json")))

    # The full Glottolog tree: the ancestor path from family to nearest branch.
    # Branch names live in a separate table and rows hold only indices,
    # otherwise "Indo-European/Classical Indo-European/..." repeats thousands of times
    clade_idx, clade_names = {}, []

    def clade_path(gid):
        path = classification.get(gid, "")
        out = []
        for cid in path.split("/"):
            name = by_id.get(cid, {}).get("Name")
            if not name:
                continue
            if cid not in clade_idx:
                clade_idx[cid] = len(clade_names)
                clade_names.append(name)
            out.append(clade_idx[cid])
        return out

    kept_langs = set()
    rows = []
    for r in langs:
        if r["Level"] == "language":
            c = CATEGORY_MAP.get(cat.get(r["ID"], ""))
            if not c:
                continue  # bookkeeping, unattested, artificial, speech register
            par = ""
        elif r["Level"] == "dialect":
            par = r["Language_ID"]
            c = "L"
        else:
            continue
        iso = r["ISO639P3code"]
        w = wd.get(iso, {})
        names = {lg: clean_label(lg, n) for lg, n in w.get("names", {}).items()}
        names = {lg: n for lg, n in names.items() if n}
        fam = by_id.get(r["Family_ID"], {}).get("Name", "") if r["Family_ID"] else ""
        lat = round(float(r["Latitude"]), 3) if r["Latitude"] else None
        lon = round(float(r["Longitude"]), 3) if r["Longitude"] else None
        if r["Level"] == "language":
            kept_langs.add(r["ID"])
        rows.append([
            r["ID"], r["Name"], names or 0, iso, fam, r["Macroarea"], lat, lon,
            r["Countries"], aes.get(r["ID"], 0), med.get(r["ID"], -1),
            w.get("speakers"), c, w.get("wiki_ru", ""), w.get("wiki_en", ""), par,
            clade_path(r["ID"]),
        ])

    # keep only dialects whose parent language made it into the atlas;
    # inherit status and countries from the parent when the dialect has none
    ID, CC, AES, SPK, PAR = 0, 8, 9, 11, 15
    by_row_id = {x[ID]: x for x in rows}
    rows = [x for x in rows if not x[PAR] or x[PAR] in kept_langs]
    for x in rows:
        parent = by_row_id.get(x[PAR])
        if parent is not None:
            if x[AES] == 0:
                x[AES] = parent[AES]
            if not x[CC]:
                x[CC] = parent[CC]

    rows.sort(key=lambda x: (-(x[SPK] or 0), x[1]))
    out = {
        "generated": datetime.date.today().isoformat(),
        "cols": ["id", "name", "nm", "iso", "fam", "ma", "lat", "lon", "cc",
                 "aes", "med", "spk", "cat", "wr", "we", "par", "cls"],
        "clades": clade_names,
        "rows": rows,
    }
    os.makedirs(WEB, exist_ok=True)
    data_path = os.path.join(WEB, "data.json")
    with open(data_path, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    n_dial = sum(1 for x in rows if x[PAR])
    n_loc = sum(1 for x in rows if x[2])
    n_names = sum(len(x[2]) for x in rows if x[2])
    print(f"{len(rows)} rows ({len(rows) - n_dial} languages + {n_dial} dialects) | "
          f"{n_loc} with localized names ({n_names} labels)")
    print(f"data.json: {os.path.getsize(data_path) / 1e6:.2f} MB")

    alt = build_altnames({x[ID] for x in rows})
    if alt is not None:
        alt_path = os.path.join(WEB, "altnames.json")
        with open(alt_path, "w") as f:
            json.dump(alt, f, ensure_ascii=False, separators=(",", ":"))
        print(f"altnames.json: {sum(len(v) for v in alt.values())} names for {len(alt)} languoids, "
              f"{os.path.getsize(alt_path) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
