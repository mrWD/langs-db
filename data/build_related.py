"""Compute language similarity into web/related.json.

Two independent measures, both keyed by glottocode:

  g — grammatical: share of matching WALS features among the features coded for
      both languages (needs raw/…/wals.json built by build_wals.py)
  l — lexical: ASJP word lists compared with LDND — the mean normalized
      Levenshtein distance over shared concepts, divided by the mean distance
      over deliberately mismatched concepts. That division is the point: without
      it, languages that merely share a phoneme inventory look related.

Lexical comparison is quadratic, so each language is only compared with
plausible candidates: its own family plus its geographic neighbours.

Needs rapidfuzz (see .venv) — run as: .venv/bin/python data/build_related.py
"""

import csv
import json
import math
import os
import sys
from collections import defaultdict

from rapidfuzz.distance import Levenshtein

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
WEB = os.path.join(HERE, "..", "web")

TOP_N = 12               # neighbours per language in each dimension
MIN_SHARED_FEATURES = 30  # fewer than this and similarity is computed from noise
MIN_SHARED_CONCEPTS = 28
GEO_CANDIDATES = 120      # nearest neighbours to compare lexicon against
FAMILY_CANDIDATES = 200


def load_atlas():
    d = json.load(open(os.path.join(WEB, "data.json")))
    i = {c: k for k, c in enumerate(d["cols"])}
    langs, parent = {}, {}
    for r in d["rows"]:
        gid = r[i["id"]]
        parent[gid] = r[i["par"]]
        if r[i["par"]]:
            continue  # dialects are folded into their parent
        langs[gid] = {
            "name": r[i["name"]], "fam": r[i["fam"]],
            "lat": r[i["lat"]], "lon": r[i["lon"]],
        }
    return langs, parent


def roll_up(gid, langs, parent):
    """Dialect -> its language; unknown code -> None."""
    seen = 0
    while gid and gid not in langs and seen < 5:
        gid = parent.get(gid, "")
        seen += 1
    return gid if gid in langs else None


# ---------- grammar ----------
def grammar_neighbours(langs, parent):
    path = os.path.join(WEB, "wals.json")
    if not os.path.exists(path):
        print("! web/wals.json missing - grammatical similarity skipped")
        return {}
    wals = json.load(open(path))["langs"]

    feats, pairs = {}, {}
    for gid, fv in wals.items():
        target = roll_up(gid, langs, parent)
        if not target or len(fv) < MIN_SHARED_FEATURES:
            continue
        # a language may have both its own set and a dialect set - take the larger
        if target in feats and len(feats[target]) >= len(fv):
            continue
        feats[target] = set(fv)
        pairs[target] = {f"{f}={v}" for f, v in fv.items()}

    ids = list(feats)
    print(f"grammar: {len(ids)} languages with {MIN_SHARED_FEATURES}+ features")
    out = {}
    for a in ids:
        fa, pa = feats[a], pairs[a]
        best = []
        for b in ids:
            if a == b:
                continue
            shared = len(fa & fb) if (fb := feats[b]) else 0
            if shared < MIN_SHARED_FEATURES:
                continue
            best.append((len(pa & pairs[b]) / shared, shared, b))
        best.sort(reverse=True)
        out[a] = [[b, round(s * 100), n] for s, n, b in best[:TOP_N]]
    return out


# ---------- lexicon ----------
def load_asjp(langs, parent):
    """glottocode -> {concept: [up to two word forms]} from the fullest doculect."""
    doc2glotto = {}
    for r in csv.DictReader(open(os.path.join(RAW, "asjp_languages.csv"))):
        target = roll_up(r.get("Glottocode", ""), langs, parent)
        if target:
            doc2glotto[r["ID"]] = target

    per_doc = defaultdict(lambda: defaultdict(list))
    for r in csv.DictReader(open(os.path.join(RAW, "asjp_forms.csv"))):
        gid = doc2glotto.get(r["Language_ID"])
        if not gid:
            continue
        form = (r["Form"] or "").strip()
        if form:
            per_doc[(r["Language_ID"], gid)][r["Parameter_ID"]].append(form)

    best = {}
    for (doc, gid), concepts in per_doc.items():
        if gid not in best or len(concepts) > len(best[gid]):
            best[gid] = {c: forms[:2] for c, forms in concepts.items()}
    return best


def ldn(a, b):
    return Levenshtein.normalized_distance(a, b)


def pair_distance(wa, wb, shared):
    """LDND: distance over shared concepts, normalised against chance."""
    same, other = [], []
    keys = shared
    for c in keys:
        same.append(min(ldn(x, y) for x in wa[c] for y in wb[c]))
    # the "chance" level: the same words, but paired up differently
    shifted = keys[1:] + keys[:1]
    for c, c2 in zip(keys, shifted):
        if c != c2:
            other.append(min(ldn(x, y) for x in wa[c] for y in wb[c2]))
    if not same or not other:
        return None
    denom = sum(other) / len(other)
    if denom <= 0:
        return None
    return (sum(same) / len(same)) / denom


def lexical_neighbours(langs, parent):
    words = load_asjp(langs, parent)
    ids = [g for g in words if len(words[g]) >= MIN_SHARED_CONCEPTS]
    print(f"lexicon: {len(ids)} languages with ASJP lists")

    by_family = defaultdict(list)
    for g in ids:
        by_family[langs[g]["fam"] or g].append(g)
    coords = [(g, langs[g]["lat"], langs[g]["lon"]) for g in ids
              if langs[g]["lat"] is not None]

    # candidates: own family + geographic neighbours
    candidates = {}
    for g in ids:
        cand = set(by_family[langs[g]["fam"] or g][:FAMILY_CANDIDATES])
        la, lo = langs[g]["lat"], langs[g]["lon"]
        if la is not None:
            kx = 111.32 * math.cos(math.radians(la))
            near = sorted(
                ((math.hypot((y - la) * 111.32, (x - lo) * kx), h) for h, y, x in coords),
                key=lambda t: t[0],
            )[:GEO_CANDIDATES]
            cand.update(h for _, h in near)
        cand.discard(g)
        candidates[g] = cand

    todo = {frozenset((a, b)) for a, cs in candidates.items() for b in cs}
    print(f"lexicon: {len(todo)} pairs to compare")

    scored = defaultdict(list)
    for n, pair in enumerate(todo):
        a, b = tuple(pair)
        wa, wb = words[a], words[b]
        shared = [c for c in wa if c in wb]
        if len(shared) < MIN_SHARED_CONCEPTS:
            continue
        d = pair_distance(wa, wb, shared)
        if d is None:
            continue
        sim = max(0.0, 1.0 - d)
        scored[a].append((sim, len(shared), b))
        scored[b].append((sim, len(shared), a))
        if n and n % 200000 == 0:
            print(f"  … {n}/{len(todo)}", flush=True)

    out = {}
    for g, lst in scored.items():
        lst.sort(reverse=True)
        out[g] = [[b, round(s * 100), n] for s, n, b in lst[:TOP_N] if s > 0]
    return out


def main():
    langs, parent = load_atlas()
    gram = grammar_neighbours(langs, parent)
    lex = lexical_neighbours(langs, parent) if "--no-lex" not in sys.argv else {}

    related = {}
    for gid in set(gram) | set(lex):
        rec = {}
        if gram.get(gid):
            rec["g"] = gram[gid]
        if lex.get(gid):
            rec["l"] = lex[gid]
        if rec:
            related[gid] = rec

    path = os.path.join(WEB, "related.json")
    with open(path, "w") as f:
        json.dump(related, f, ensure_ascii=False, separators=(",", ":"))
    print(f"related.json: {len(related)} languages, {os.path.getsize(path) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
