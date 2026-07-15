"""Fetch speaker counts, Russian labels and Wikipedia sitelinks for languages from Wikidata.

Queries are split by first letter of the ISO 639-3 code to stay under the
SPARQL endpoint's 60s timeout. Results are merged into data/raw/wikidata.json
keyed by ISO code.
"""

import json
import string
import sys
import time
import urllib.parse
import urllib.request

ENDPOINT = "https://query.wikidata.org/sparql"
UA = "langs-db-builder/1.0 (https://github.com/; lvigtor@gmail.com) python-urllib"

LABEL_LANGS = ["ru", "es", "de", "fr"]

QUERY_TMPL = """
SELECT ?iso (MAX(?spk) AS ?speakers) (SAMPLE(?ruw) AS ?ruwiki)
       (SAMPLE(?enw) AS ?enwiki) %(label_projs)s WHERE {
  ?item wdt:P220 ?iso .
  FILTER(STRSTARTS(?iso, "%(letter)s"))
  OPTIONAL { ?item wdt:P1098 ?spk }
  OPTIONAL { ?ruw schema:about ?item ; schema:isPartOf <https://ru.wikipedia.org/> }
  OPTIONAL { ?enw schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  %(label_opts)s
} GROUP BY ?iso
"""

LABEL_PROJS = " ".join(f"(SAMPLE(?l{lg}) AS ?name_{lg})" for lg in LABEL_LANGS)
LABEL_OPTS = "\n  ".join(
    f'OPTIONAL {{ ?item rdfs:label ?l{lg} . FILTER(LANG(?l{lg}) = "{lg}") }}' for lg in LABEL_LANGS
)


def run_query(query, retries=3):
    params = urllib.parse.urlencode({"query": query, "format": "json"})
    req = urllib.request.Request(
        ENDPOINT + "?" + params, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"}
    )
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                return json.load(resp)["results"]["bindings"]
        except Exception as e:  # noqa: BLE001 - retry on any transient failure
            if attempt == retries - 1:
                raise
            print(f"  retry after error: {e}", file=sys.stderr)
            time.sleep(5 * (attempt + 1))


def main():
    out = {}
    for letter in string.ascii_lowercase:
        rows = run_query(QUERY_TMPL % {"letter": letter, "label_projs": LABEL_PROJS, "label_opts": LABEL_OPTS})
        for b in rows:
            iso = b["iso"]["value"]
            rec = {}
            if "speakers" in b and b["speakers"]["value"]:
                try:
                    rec["speakers"] = int(float(b["speakers"]["value"]))
                except ValueError:
                    pass
            for lg in LABEL_LANGS:
                if f"name_{lg}" in b:
                    rec[f"name_{lg}"] = b[f"name_{lg}"]["value"]
            if "ruwiki" in b:
                rec["wiki_ru"] = b["ruwiki"]["value"]
            if "enwiki" in b:
                rec["wiki_en"] = b["enwiki"]["value"]
            if rec:
                out[iso] = rec
        print(f"{letter}: total {len(out)} iso codes", flush=True)
        time.sleep(1)
    with open("raw/wikidata.json", "w") as f:
        json.dump(out, f, ensure_ascii=False)
    print(f"saved {len(out)} records")


if __name__ == "__main__":
    main()
