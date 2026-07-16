"""Build web/wals.json from WALS CLDF csv files (data/raw/wals_*.csv).

Output:
  {"features": {"81A": {"n": "Order of Subject, Object and Verb",
                        "v": {"1": "SOV", ...}}, ...},
   "langs": {"russ1263": {"81A": "2", ...}, ...}}

Languages are keyed by glottocode. When several WALS entries map to the same
glottocode (dialect entries), the one with more coded features wins per
feature.
"""

import csv
import json
import os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
OUT = os.path.join(HERE, "..", "web", "wals.json")


def main():
    features = {}
    for r in csv.DictReader(open(os.path.join(RAW, "wals_parameters.csv"))):
        features[r["ID"]] = {"n": r["Name"], "v": {}}
    for r in csv.DictReader(open(os.path.join(RAW, "wals_codes.csv"))):
        features[r["Parameter_ID"]]["v"][r["Number"]] = r["Name"]

    wals2glotto = {}
    for r in csv.DictReader(open(os.path.join(RAW, "wals_languages.csv"))):
        if r["Glottocode"]:
            wals2glotto[r["ID"]] = r["Glottocode"]

    per_lang = defaultdict(dict)  # wals lang id -> {feature: value}
    for r in csv.DictReader(open(os.path.join(RAW, "wals_values.csv"))):
        per_lang[r["Language_ID"]][r["Parameter_ID"]] = r["Value"]

    # richer WALS entries first, so their values win on collision
    langs = defaultdict(dict)
    for wid in sorted(per_lang, key=lambda w: -len(per_lang[w])):
        gc = wals2glotto.get(wid)
        if not gc:
            continue
        for fid, val in per_lang[wid].items():
            langs[gc].setdefault(fid, val)

    out = {"features": features, "langs": langs}
    with open(OUT, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    n_vals = sum(len(v) for v in langs.values())
    print(f"{len(langs)} languages | {len(features)} features | {n_vals} values")
    print(f"wals.json: {os.path.getsize(OUT) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
