# Languages of the World — an interactive atlas

A static catalogue site covering **7,992 languages and 13,706 dialects**: search
in 15 languages, filters, a sortable table, an interactive map, grammar-based
language comparison (WALS), and a card for every language linking to grammars,
dictionaries, speech recordings and learning materials.

🌍 **[mrwd.github.io/langs-db](https://mrwd.github.io/langs-db/)**

![stack](https://img.shields.io/badge/stack-vanilla_JS_+_Leaflet-blue)

## Features

- **Search** by Russian and English name, ISO 639-3 code, Glottocode and family
  ("Altaic", `ket`, `Turkic`…).
- **Filters**: macroarea, language family (242), country, number of speakers,
  level of documentation (is there a grammar/dictionary?), endangerment status
  (AES scale).
- **Map** (Leaflet + CARTO): every language is a dot coloured by endangerment
  status; when few results are left, the map flies to them automatically.
- **Language card**: family, countries, speakers, the best published description,
  and links — Glottolog, Wikipedia (ru/en), OLAC (speech recordings and
  materials), Ethnologue, Endangered Languages Project.
- Light and dark themes, mobile layout, permalinks of the form `#l=<glottocode>`.
- **15 interface languages**: Русский, English, Español, Deutsch, Français,
  Português, Italiano, 中文, 日本語, العربية (RTL), Türkçe, Polski, Українська,
  हिन्दी, Indonesia — switcher in the header; statuses, countries and number
  formats are localised, and language names come from Wikidata labels
  (33k labels).
- **Search in any language**: the index includes all localised names plus 84k
  alternative names from Glottolog (`altnames.json`, loaded in the background) —
  "wenecki", "Idioma veneciano" and "Altaï méridional" all resolve to the same
  language. Dialects are always searched, even when the filter is set to
  "Languages only".
- **Visit statistics** right on the site (the "Statistics" button): visits,
  visitors, a 30-day trend, and breakdowns by country, city and interface
  language.
- **Geographic hint**: if an idiom is not found, the site checks whether the
  query is a place name and shows the languages of that area within a 200 km
  radius. That way "sandonatese" leads to San Donà di Piave and "sandonese" to
  Sandono, and in both cases to Venetian — even though no catalogue lists those
  languoids. Sources (both free, no API keys): the primary one is
  [Nominatim](https://nominatim.openstreetmap.org), which knows what actually is
  a populated place; the fallback is Wikipedia full-text search, which picks up
  derived forms of names but also returns unrelated objects with coordinates, so
  it only kicks in when Nominatim comes up empty. The hint is only shown when the
  place name and the query share a common stem — accidental street-name matches
  are filtered out.
- **Dialects** (13,706): the "Languages and dialects" toggle in the filters; a
  dialect inherits its parent's status and countries, a language card lists its
  dialects, and a dialect card links back to its parent language.
- **Compare two languages** (the "⚖ Compare" button on a card): basic parameters
  plus grammatical features from [WALS](https://wals.info) (192 features, 2,501
  languages) with matches highlighted; for dialects the parent language's data is
  used.
- **Language relations** on the card — four independent dimensions:
  - *branch and relatives* — the full Glottolog tree (up to 10 levels:
    "Indo-European › … › East Slavic"), with relatives taken from the nearest
    branch;
  - *grammatically similar* — the share of matching WALS features (970 languages
    with at least 30 features coded);
  - *lexically similar* — [ASJP](https://asjp.clld.org) Swadesh lists compared
    using LDND (5,544 languages, 870k pairs);
  - *neighbours on the map* — the nearest languages by coordinates.

## Running locally

```bash
python3 -m http.server 8642 --directory web
# → http://localhost:8642
```

(The server is only needed so the page can load `data.json`; any static host will
do.)

## Layout

```
web/               the entire site (deployable as is)
  index.html
  app.js           logic: filters, table, map, cards, comparison
  i18n.js          interface translations (15 locales)
  stats.js         visit counter and statistics panel
  style.css        themes and layout (including RTL)
  data.json        the main database: 7,992 languages + 13,706 dialects (3.6 MB)
  altnames.json    84k alternative names for search (1.4 MB, lazy-loaded)
  wals.json        192 WALS grammatical features (0.9 MB, lazy-loaded)
  stats.json       aggregated statistics, refreshed daily by CI
  vendor/          Leaflet 1.9.4
data/
  build_data.py       builds data.json and altnames.json
  build_wals.py       builds wals.json
  fetch_wikidata.py   pulls speaker counts and names in 14 languages
  collect_stats.py    polls the Abacus counters → web/stats.json (for CI)
  tz_countries.json   time zone → country code (from the IANA zone.tab)
  raw/                downloaded sources (glottolog-cldf, wals, wikidata)
```

## Data and licences

| Source | What we take | Licence |
|---|---|---|
| [Glottolog](https://glottolog.org) (glottolog-cldf) | languages, dialects, families, coordinates, countries, AES status, MED | CC BY 4.0 |
| [Wikidata](https://www.wikidata.org) | speaker counts (P1098), localised names, Wikipedia links | CC0 |
| [WALS](https://wals.info) (cldf-datasets/wals) | 192 grammatical features for comparing languages | CC BY 4.0 |
| [ASJP](https://asjp.clld.org) (lexibank/asjp) | Swadesh lists for lexical similarity | CC BY 4.0 |

- **AES** (Agglomerated Endangerment Status) — a combined endangerment status
  based on ElCat, Ethnologue and UNESCO data: 1 "not endangered" … 6 "extinct".
- **MED** (Most Extensive Description) — the most complete published description
  of a language, from a full grammar (300+ pages) down to a word list.
- Speaker counts exist for ~1,800 languages; for small languages they may be out
  of date.

## Updating the data

```bash
cd data
# 1) fresh Glottolog data
curl -sL -o raw/languages.csv https://raw.githubusercontent.com/glottolog/glottolog-cldf/master/cldf/languages.csv
curl -sL -o raw/values.csv    https://raw.githubusercontent.com/glottolog/glottolog-cldf/master/cldf/values.csv
# 2) a fresh Wikidata dump (~1 min, 26 SPARQL queries)
python3 fetch_wikidata.py
# 3) rebuild web/data.json
python3 build_data.py
# 4) (optional) refresh WALS for language comparison
for f in values parameters codes languages; do
  curl -sL -o raw/wals_$f.csv https://raw.githubusercontent.com/cldf-datasets/wals/master/cldf/$f.csv
done
python3 build_wals.py
# 5) (optional) language similarity: grammatical and lexical
for f in forms languages; do
  curl -sL -o raw/asjp_$f.csv https://raw.githubusercontent.com/lexibank/asjp/master/cldf/$f.csv
done
python3 -m venv ../.venv && ../.venv/bin/pip install rapidfuzz   # needed once
../.venv/bin/python build_related.py     # ~6 minutes: 870k pairs
```

## Visit statistics

Analytics is assembled from two parts, neither of which needs an account:

1. **The browser** ([stats.js](web/stats.js)) bumps several counters on
   [Abacus](https://abacus.jasoncameron.dev) — a public, registration-free
   counter API — on the first hit of a session: `total`, `uniq`, `d-<date>`,
   `tz-<time zone>`, `ui-<locale>`. No cookies and no personal data; country and
   city are derived from the browser's time zone, and the IP is never stored.
   Counting is disabled on localhost so development does not skew the numbers.
2. **A nightly GitHub Action** ([stats.yml](.github/workflows/stats.yml)) polls
   every key once a day via [collect_stats.py](data/collect_stats.py) and commits
   `web/stats.json` — Abacus has no "list keys" endpoint, so CI assembles the
   breakdown and the site serves the ready-made file instantly.

Worth knowing: the counter is public (the namespace is visible in the JS, so in
theory anyone could inflate it), ad blockers cut off some visits, and the city is
inferred from the time zone — that is a region, not a precise location. Swapping
Abacus for another service only takes edits to [stats.js](web/stats.js) and
[collect_stats.py](data/collect_stats.py).

## Deployment

The site is published to GitHub Pages automatically: every push to `main`
triggers the [`deploy.yml`](.github/workflows/deploy.yml) workflow, which
publishes the `web/` folder. After a data refresh, committing the new
`web/data.json` and pushing is enough.

The `web/` folder is self-contained, so it can be moved to any other static host
(Cloudflare Pages, Netlify, Vercel) unchanged.
