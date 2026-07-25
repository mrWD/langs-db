"""Collect visit counters from Abacus into web/stats.json (run daily by CI).

The site's JS increments counters on Abacus (a free, no-signup counter API);
Abacus has no "list keys" endpoint, so this script polls every key the site can
possibly write: total, uniques, the last N days, every IANA timezone and every
UI locale. Timezones are folded into countries via data/tz_countries.json.

Abacus rate limit is 30 requests per 10s per IP, so requests are paced.
"""

import datetime
import json
import os
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "..", "web")

NAMESPACE = "langs-db-mrwd"
BASE = "https://abacus.jasoncameron.dev/get"
UI_LANGS = ["ru", "en", "es", "de", "fr", "pt", "it", "zh", "ja", "ar", "tr", "pl", "uk", "hi", "id"]
DAYS_BACK = 60
PACE_EVERY = 20      # requests per window
PACE_SLEEP = 10.5    # seconds between windows


def get(key, _state={"n": 0}):
    """Read one counter; returns 0 when the key was never created."""
    _state["n"] += 1
    if _state["n"] % PACE_EVERY == 0:
        time.sleep(PACE_SLEEP)
    req = urllib.request.Request(
        f"{BASE}/{NAMESPACE}/{key}",
        headers={"User-Agent": "langs-db-stats-collector/1.0 (github.com/mrWD/langs-db)"},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return int(json.load(resp).get("value", 0))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return 0        # counter never created — no visits
            if e.code == 429:
                time.sleep(PACE_SLEEP * (attempt + 2))
                continue
            print(f"  {key}: HTTP {e.code}", file=sys.stderr)
            return 0
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                print(f"  {key}: {e}", file=sys.stderr)
                return 0
            time.sleep(3 * (attempt + 1))
    return 0


def main():
    tz_countries = json.load(open(os.path.join(HERE, "tz_countries.json")))
    today = datetime.date.today()

    total = get("total")
    uniq = get("uniq")

    days = {}
    for i in range(DAYS_BACK):
        d = (today - datetime.timedelta(days=i)).isoformat()
        n = get("d-" + d)
        if n:
            days[d] = n

    countries, cities = {}, {}
    for tz, cc in sorted(tz_countries.items()):
        n = get("tz-" + tz.replace("/", "-"))
        if not n:
            continue
        countries[cc] = countries.get(cc, 0) + n
        cities[tz] = n

    langs = {}
    for lg in UI_LANGS:
        n = get("ui-" + lg)
        if n:
            langs[lg] = n

    out = {
        "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total": total,
        "uniq": uniq,
        "days": dict(sorted(days.items())),
        "countries": dict(sorted(countries.items(), key=lambda kv: -kv[1])),
        "cities": dict(sorted(cities.items(), key=lambda kv: -kv[1])),
        "langs": dict(sorted(langs.items(), key=lambda kv: -kv[1])),
    }
    path = os.path.join(WEB, "stats.json")
    with open(path, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"total {total} | uniq {uniq} | {len(countries)} countries | "
          f"{len(cities)} cities | {len(days)} days with visits")


if __name__ == "__main__":
    main()
