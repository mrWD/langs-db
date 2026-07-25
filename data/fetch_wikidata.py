"""Fetch speaker counts, localized labels and Wikipedia sitelinks from Wikidata.

Two query families, both chunked by the first letter of the ISO 639-3 code to
stay under the SPARQL endpoint's 60s timeout:

  1. facts  — speaker count (P1098) + ru/en Wikipedia sitelinks
  2. labels — rdfs:label in every UI language (one row per iso+lang)

Results are merged into data/raw/wikidata.json keyed by ISO code:
  {"rus": {"speakers": 154000000, "wiki_ru": "...", "wiki_en": "...",
           "names": {"ru": "русский язык", "de": "Russisch", ...}}}
"""

import json
import os
import string
import sys
import time
import urllib.parse
import urllib.request

ENDPOINT = "https://query.wikidata.org/sparql"
UA = "langs-db-builder/2.0 (https://github.com/mrWD/langs-db; lvigtor@gmail.com) python-urllib"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "raw", "wikidata.json")

# UI locales that need localized language names (en comes from Glottolog)
LABEL_LANGS = ["ru", "es", "de", "fr", "pt", "it", "zh", "ja", "ar", "tr", "pl", "uk", "hi", "id"]

FACTS_TMPL = """
SELECT ?iso (MAX(?spk) AS ?speakers) (SAMPLE(?ruw) AS ?ruwiki) (SAMPLE(?enw) AS ?enwiki) WHERE {
  ?item wdt:P220 ?iso .
  FILTER(STRSTARTS(?iso, "%(letter)s"))
  OPTIONAL { ?item wdt:P1098 ?spk }
  OPTIONAL { ?ruw schema:about ?item ; schema:isPartOf <https://ru.wikipedia.org/> }
  OPTIONAL { ?enw schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
} GROUP BY ?iso
"""

LABELS_TMPL = """
SELECT ?iso ?lang ?label WHERE {
  ?item wdt:P220 ?iso .
  FILTER(STRSTARTS(?iso, "%(letter)s"))
  ?item rdfs:label ?label .
  BIND(LANG(?label) AS ?lang)
  FILTER(?lang IN (%(langs)s))
}
"""


def run_query(query, retries=4):
    params = urllib.parse.urlencode({"query": query, "format": "json"})
    req = urllib.request.Request(
        ENDPOINT + "?" + params,
        headers={"User-Agent": UA, "Accept": "application/sparql-results+json"},
    )
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.load(resp)["results"]["bindings"]
        except Exception as e:  # noqa: BLE001 - retry on any transient failure
            if attempt == retries - 1:
                print(f"  giving up: {e}", file=sys.stderr)
                return []
            print(f"  retry after error: {e}", file=sys.stderr)
            time.sleep(5 * (attempt + 1))


def main():
    out = {}
    lang_list = ", ".join(f'"{lg}"' for lg in LABEL_LANGS)

    for letter in string.ascii_lowercase:
        for b in run_query(FACTS_TMPL % {"letter": letter}):
            iso = b["iso"]["value"]
            rec = out.setdefault(iso, {})
            if "speakers" in b and b["speakers"]["value"]:
                try:
                    rec["speakers"] = int(float(b["speakers"]["value"]))
                except ValueError:
                    pass
            if "ruwiki" in b:
                rec["wiki_ru"] = b["ruwiki"]["value"]
            if "enwiki" in b:
                rec["wiki_en"] = b["enwiki"]["value"]

        for b in run_query(LABELS_TMPL % {"letter": letter, "langs": lang_list}):
            iso = b["iso"]["value"]
            lg = b["lang"]["value"]
            names = out.setdefault(iso, {}).setdefault("names", {})
            # first label wins; Wikidata returns the preferred one first
            names.setdefault(lg, b["label"]["value"])

        n_names = sum(len(v.get("names", {})) for v in out.values())
        print(f"{letter}: {len(out)} iso codes, {n_names} labels", flush=True)
        time.sleep(1)

    with open(OUT, "w") as f:
        json.dump(out, f, ensure_ascii=False)
    print(f"saved {len(out)} records to {OUT}")


if __name__ == "__main__":
    main()
