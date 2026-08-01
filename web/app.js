/* Languages of the World — interactive atlas.
   Data: Glottolog (CC BY 4.0) + Wikidata (CC0) + WALS (CC BY 4.0).
   Interface translations live in i18n.js, the visit counter in stats.js. */
'use strict';

// ---------- locale ----------
const LOCALES = Object.keys(I18N);

function detectLang() {
  const saved = localStorage.getItem('langs-ui');
  if (saved && LOCALES.includes(saved)) return saved;
  for (const l of navigator.languages || [navigator.language]) {
    const two = (l || '').slice(0, 2).toLowerCase();
    if (LOCALES.includes(two)) return two;
  }
  return 'en';
}
const LANG = detectLang();
const T = I18N[LANG];
const RTL = RTL_LOCALES.includes(LANG);
const tpl = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const fmtCompact = new Intl.NumberFormat(LANG, { notation: 'compact', maximumFractionDigits: 1 });
const fmtFull = new Intl.NumberFormat(LANG);
const collator = new Intl.Collator(LANG);
const regionNames = (() => {
  try { return new Intl.DisplayNames([LANG], { type: 'region' }); }
  catch { return null; }
})();

function countryName(cc) {
  try { return (regionNames && regionNames.of(cc)) || cc; } catch { return cc; }
}
function maName(ma) {
  if (!ma) return '—';
  return ma.split(';').map(m => T.ma[m] || m).join(', ');
}
function aesColor(level) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--aes-${level}`).trim();
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- static UI text ----------
function applyStatic() {
  const root = document.documentElement;
  root.lang = LANG;
  root.dir = RTL ? 'rtl' : 'ltr';
  document.title = T.title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = tpl(T.subtitle, { n: '8000', d: '13700' });
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = T[el.dataset.i18n] ?? el.textContent; });
  document.getElementById('search').placeholder = T.searchPh;
  const theme = document.getElementById('theme-toggle');
  theme.title = T.themeTitle;
  theme.setAttribute('aria-label', T.themeTitle);
  document.getElementById('detail-close').setAttribute('aria-label', T.close);

  const sel = document.getElementById('lang-select');
  sel.innerHTML = LOCALES.map(l => `<option value="${l}">${esc(LOCALE_NAMES[l])}</option>`).join('');
  sel.value = LANG;
  sel.addEventListener('change', () => {
    localStorage.setItem('langs-ui', sel.value);
    location.reload();
  });
}

// ---------- state ----------
let ROWS = [];
let byId = new Map();
let childrenOf = new Map();
let altNames = null;          // {glottocode: [name, ...]} — loaded lazily
let filtered = [];
let renderedCount = 0;
const PAGE = 200;
let sortKey = 'spk';
let sortDir = -1;
const activeStatuses = new Set([0, 1, 2, 3, 4, 5, 6]);
let selectedId = null;

// ---------- theme ----------
const root = document.documentElement;
function currentTheme() {
  const saved = localStorage.getItem('langs-theme');
  if (saved) return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(t) {
  root.setAttribute('data-theme', t);
  if (map) switchTiles(t);
  if (markers.length) restyleMarkers();
  renderLegend();
}
document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('langs-theme', next);
  applyTheme(next);
});
root.setAttribute('data-theme', currentTheme());

// ---------- map ----------
let map = null;
let tiles = null;
let markers = [];
let markerGroup = null;
let selectedIdx = null;

const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function initMap() {
  map = L.map('map', {
    renderer: L.canvas({ padding: 0.4 }),
    worldCopyJump: true,
    minZoom: 1,
  }).setView([22, 20], 2);
  switchTiles(root.getAttribute('data-theme'));
  markerGroup = L.layerGroup().addTo(map);
}
function switchTiles(theme) {
  if (tiles) tiles.remove();
  tiles = L.tileLayer(TILE_URLS[theme] || TILE_URLS.light, {
    attribution: TILE_ATTR, subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);
}
function markerStroke() {
  return root.getAttribute('data-theme') === 'dark' ? '#1a1a19' : '#ffffff';
}
function accentColor() {
  return getComputedStyle(root).getPropertyValue('--accent').trim();
}

// base / hovered / selected marker styles (dialects are smaller)
function baseStyle(r) {
  return { radius: r.par ? 3 : 4.5, weight: 1, color: markerStroke(), opacity: 0.9, fillColor: aesColor(r.aes), fillOpacity: r.par ? 0.7 : 0.85 };
}
function hoverStyle(r) {
  return { radius: r.par ? 6 : 7.5, weight: 2.5, color: accentColor(), opacity: 1, fillColor: aesColor(r.aes), fillOpacity: 1 };
}
function selectedStyle(r) {
  return { radius: r.par ? 7.5 : 9, weight: 3, color: accentColor(), opacity: 1, fillColor: aesColor(r.aes), fillOpacity: 1 };
}
function styleFor(i) {
  return i === selectedIdx ? selectedStyle(ROWS[i]) : baseStyle(ROWS[i]);
}
function selectMarker(i) {
  const prev = selectedIdx;
  selectedIdx = i;
  if (prev !== null && markers[prev]) markers[prev].setStyle(styleFor(prev));
  if (i !== null && markers[i]) { markers[i].setStyle(selectedStyle(ROWS[i])); markers[i].bringToFront(); }
}

function buildMarkers() {
  markers = ROWS.map((r, i) => {
    if (r.lat === null || r.lon === null) return null;
    const m = L.circleMarker([r.lat, r.lon], baseStyle(r));
    m.on('click', () => openDetail(r, { fly: false }));
    m.on('mouseover', () => {
      if (i !== selectedIdx) m.setStyle(hoverStyle(r));
      m.bringToFront();
      m.bindTooltip(
        `<strong>${esc(r.label)}</strong><br><span class="tip-sub">${esc(r.par ? r.sub : (r.fam || T.isolate))} · ${esc(T.aes[r.aes])}</span>`,
        { className: 'lang-tip', direction: 'top', offset: [0, -8], sticky: false },
      ).openTooltip();
    });
    m.on('mouseout', () => { m.setStyle(styleFor(i)); m.closeTooltip(); });
    return m;
  });
}
function restyleMarkers() {
  markers.forEach((m, i) => { if (m) m.setStyle(styleFor(i)); });
  if (selectedIdx !== null && markers[selectedIdx]) markers[selectedIdx].bringToFront();
}
function updateMapMarkers() {
  markerGroup.clearLayers();
  const pts = [];
  for (const r of filtered) {
    const m = markers[r.idx];
    if (m) { markerGroup.addLayer(m); pts.push(m.getLatLng()); }
  }
  // with a small result set, fly the map to what was found
  if (pts.length && pts.length <= 100) {
    map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 6, animate: true });
  }
}

// ---------- legend ----------
function renderLegend() {
  const el = document.getElementById('legend');
  if (!el) return;
  const counts = new Array(7).fill(0);
  for (const r of filtered) counts[r.aes]++;
  const order = [1, 2, 3, 4, 5, 6, 0];
  el.innerHTML = order
    .filter(a => counts[a] > 0)
    .map(a => `<div class="row"><span class="dot" style="--c:var(--aes-${a})"></span>${esc(T.aes[a])} · ${fmtFull.format(counts[a])}</div>`)
    .join('');
}

// ---------- filters ----------
const els = {
  search: document.getElementById('search'),
  ma: document.getElementById('f-macroarea'),
  fam: document.getElementById('f-family'),
  cc: document.getElementById('f-country'),
  spk: document.getElementById('f-speakers'),
  med: document.getElementById('f-med'),
  lvl: document.getElementById('f-level'),
  chips: document.getElementById('status-chips'),
  count: document.getElementById('result-count'),
  body: document.getElementById('table-body'),
  scroll: document.getElementById('table-scroll'),
  empty: document.getElementById('empty-state'),
};

function spkBucket(spk) {
  if (spk === null || spk === undefined) return 0;
  if (spk >= 1e6) return 5;
  if (spk >= 1e5) return 4;
  if (spk >= 1e4) return 3;
  if (spk >= 1e3) return 2;
  return 1;
}
function medMatch(mode, med) {
  if (mode === 'g') return med >= 0 && med <= 1;
  if (mode === 's') return med >= 0 && med <= 2;
  if (mode === 'd') return med >= 0 && med <= 3;
  if (mode === 'n') return med === 4;
  return true;
}
function matchesQuery(r, q) {
  if (r.search.includes(q)) return true;
  if (altNames) {
    const alt = altNames[r.id];
    if (alt) return alt.some(n => n.toLowerCase().includes(q));
  }
  return false;
}

function applyFilters() {
  const q = els.search.value.trim().toLowerCase();
  const ma = els.ma.value;
  const fam = els.fam.value;
  const cc = els.cc.value;
  const spk = els.spk.value;
  const med = els.med.value;
  const lvl = els.lvl.value;

  filtered = ROWS.filter(r => {
    // while searching, always show dialects — otherwise they cannot be found
    if (!q && lvl !== 'all' && r.par) return false;
    if (!activeStatuses.has(r.aes)) return false;
    if (ma && !r.maList.includes(ma)) return false;
    if (fam) {
      if (fam === '__isolate__' ? r.fam !== '' : r.fam !== fam) return false;
    }
    if (cc && !r.ccList.includes(cc)) return false;
    if (spk !== '' && spkBucket(r.spk) !== +spk) return false;
    if (med && !medMatch(med, r.med)) return false;
    if (q && !matchesQuery(r, q)) return false;
    return true;
  });
  sortFiltered();
  renderTable(true);
  updateMapMarkers();
  renderLegend();
  els.count.textContent = tpl(T.found, { n: fmtFull.format(filtered.length) });
  renderEmptyState(q);
}

function renderEmptyState(q) {
  if (filtered.length || !q) {
    els.empty.hidden = true;
    return;
  }
  const wiki = `https://${LANG}.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`;
  const glot = `https://glottolog.org/glottolog?namequerytype=part&name=${encodeURIComponent(q)}`;
  els.empty.innerHTML = `
    <h3>${esc(T.nothingTitle)}</h3>
    <p>${esc(T.nothingText)}</p>
    <div id="geo-hint" class="geo-hint"></div>
    <p class="empty-links">
      <a href="${esc(wiki)}" target="_blank" rel="noopener">${esc(tpl(T.nothingWiki, { q }))}</a>
      <a href="${esc(glot)}" target="_blank" rel="noopener">${esc(tpl(T.nothingGlottolog, { q }))}</a>
    </p>`;
  els.empty.hidden = false;
  geoFallback(q);
}

// ---------- geographic hint ----------
// Many local varieties ("sandonatese") are not listed in catalogues as a
// separate unit, yet their name derives from a place. We ask the OSM geocoder
// whether this is a place, and show the languages of that area. The request
// only goes out when the ordinary search found nothing.
const geoCache = new Map();

// The geocoder also answers on accidental matches: "vologodsky" finds
// Vologodsky Lane in a Siberian village. We accept a place only if its
// name and the query share a stem — "sandonatese" <-> "San Donà di Piave".
function normPlace(s) {
  // the Cyrillic range is matching data: queries and place names arrive in
  // whatever script the source uses
  return s.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zа-я0-9]+/gi, '');
}
function looksRelated(q, name) {
  const a = normPlace(q), b = normPlace(name);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i >= 5;
}

// 200 km is the limit at which "spoken here" is still true: in Glottolog a
// large language has one point for its whole range, and without a limit a
// language three hundred kilometres away would be pulled to the city
function nearestLanguages(lat, lon, cc = '', maxKm = 200, limit = 5) {
  const kx = 111.32 * Math.cos(lat * Math.PI / 180);
  const seen = new Set();
  const out = [];
  const scored = [];
  for (const r of ROWS) {
    if (r.lat === null) continue;
    if (r.aes === 6) continue;   // "spoken here" means we are not talking about extinct ones
    if (r.cat === 'S') continue; // a sign language is never a local variety
    // the place's country is known — don't offer a language from abroad, even if
    // its point happens to be closer
    if (cc && r.ccList.length && !r.ccList.includes(cc)) continue;
    const d = Math.hypot((r.lat - lat) * 111.32, (r.lon - lon) * kx);
    if (d <= maxKm) scored.push({ r, d });
  }
  scored.sort((a, b) => a.d - b.d);
  for (const { r, d } of scored) {
    // dialects fold into the parent language: in Glottolog they share a point
    const lang = r.par ? (byId.get(r.par) || r) : r;
    if (seen.has(lang.id)) continue;
    seen.add(lang.id);
    out.push({ lang, d });
    if (out.length >= limit) break;
  }
  return out;
}

// Wikipedia full-text search can do what the geocoder and Wikidata cannot:
// it matches derived forms ("sandonese" -> Sandono). The query language is not
// known in advance, so we ask several editions chosen by writing system.
function wikiCandidates(q) {
  const set = [LANG];
  if (/[Ѐ-ӿ]/.test(q)) set.push('ru', 'uk');
  else if (/[؀-ۿ]/.test(q)) set.push('ar');
  else if (/[぀-ヿ一-鿿]/.test(q)) set.push('ja', 'zh');
  else if (/[ऀ-ॿ]/.test(q)) set.push('hi');
  else set.push('en', 'it', 'es', 'fr', 'de');
  return [...new Set(set)].slice(0, 6);
}

async function wikiPlaces(q) {
  const reqs = wikiCandidates(q).map(async wiki => {
    try {
      const url = `https://${wiki}.wikipedia.org/w/api.php?action=query&generator=search`
        + `&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=coordinates&format=json&origin=*`;
      const j = await (await fetch(url, { signal: AbortSignal.timeout(9000) })).json();
      return Object.values(j?.query?.pages || {});
    } catch { return []; }
  });
  const pages = (await Promise.all(reqs)).flat();
  const out = [];
  for (const p of pages) {
    const c = (p.coordinates || [])[0];
    if (!c || !looksRelated(q, p.title)) continue;
    out.push({ name: p.title, cc: '', country: '', lat: c.lat, lon: c.lon });
  }
  return out;
}

// The most accurate answer comes not from geography but from Wikipedia text:
// local varieties are listed in language articles ("sandonatese" in "Lingua
// veneta"). We find such articles, resolve them to Wikidata items and keep the
// ones with a Glottolog or ISO code — i.e. an actual language from our database.
async function languageMentions(q) {
  const wikis = wikiCandidates(q).slice(0, 3);
  const found = [];
  const titles = new Map();   // QID → {title, wiki}
  await Promise.all(wikis.map(async wiki => {
    try {
      const url = `https://${wiki}.wikipedia.org/w/api.php?action=query&generator=search&format=json&origin=*`
        + `&gsrsearch=${encodeURIComponent(`insource:"${q}"`)}&gsrlimit=10&prop=pageprops`;
      const j = await (await fetch(url, { signal: AbortSignal.timeout(9000) })).json();
      for (const p of Object.values(j?.query?.pages || {})) {
        const qid = p.pageprops?.wikibase_item;
        if (qid && !titles.has(qid)) titles.set(qid, { title: p.title, wiki });
      }
    } catch { /* edition unavailable — never mind */ }
  }));
  if (!titles.size) return [];

  try {
    const ids = [...titles.keys()].slice(0, 50).join('|');
    const url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&format=json&origin=*'
      + `&ids=${encodeURIComponent(ids)}`;
    const j = await (await fetch(url, { signal: AbortSignal.timeout(9000) })).json();
    for (const [qid, e] of Object.entries(j?.entities || {})) {
      const claims = e.claims || {};
      const val = pid => (claims[pid] || []).map(x => x.mainsnak?.datavalue?.value).filter(Boolean);
      const lang = val('P1394').map(g => byId.get(g)).find(Boolean)
        || val('P220').map(iso => ROWS.find(r => r.iso === iso && !r.par)).find(Boolean);
      if (lang) found.push({ lang, ...titles.get(qid) });
    }
  } catch { /* Wikidata unavailable — the geographic hint remains */ }
  return found.slice(0, 2);
}

async function osmPlaces(q) {
  try {
    // no accept-language: names arrive in the local language, so the query is
    // checked against the real name rather than a translation. The country
    // we localise ourselves from the code
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8'
      + `&addressdetails=1&q=${encodeURIComponent(q)}`;
    const raw = await (await fetch(url, { signal: AbortSignal.timeout(9000) })).json();
    const out = [];
    for (const x of raw) {
      const a = x.address || {};
      const name = a.city || a.town || a.village || a.municipality || a.county || a.state;
      // match against the populated place specifically: a street or venue name
      // may contain the query while sitting a thousand kilometres away
      if (!name || !looksRelated(q, name)) continue;
      const cc = (a.country_code || '').toUpperCase();
      out.push({ name, cc, country: cc ? countryName(cc) : '', lat: +x.lat, lon: +x.lon });
    }
    return out;
  } catch { return []; }
}

function langCardHtml(lang, cap, sourceHtml) {
  const facts = [
    lang.fam || T.cardIsolate,
    lang.spk === null ? '' : `${T.cardSpeakers}: ${fmtCompact.format(lang.spk)}`,
    T.aes[lang.aes],
  ].filter(Boolean).join(' · ');
  return `<div class="geo-place">
    <a class="geo-primary" href="#l=${esc(lang.id)}" data-open="${esc(lang.id)}">
      <span class="geo-primary-cap">${esc(cap)}</span>
      <span class="geo-primary-name">${esc(lang.label)} <span class="geo-arrow">→</span></span>
      <span class="geo-primary-sub">${esc(facts)}</span>
    </a>
    ${sourceHtml}
  </div>`;
}

async function geoFallback(q) {
  if (q.length < 3) return;
  const hint = () => document.getElementById('geo-hint');
  if (!hint()) return;
  hint().textContent = T.nothingLooking;

  // ask the Wikipedia text first: it answers about the language itself rather
  // than the surroundings, and so beats a geographic guess
  let mentions = geoCache.get('m:' + q);
  if (!mentions) {
    mentions = await languageMentions(q);
    geoCache.set('m:' + q, mentions);
  }
  if (els.search.value.trim().toLowerCase() !== q || !hint()) return;
  if (mentions.length) {
    hint().innerHTML = mentions.map(m => {
      const href = `https://${m.wiki}.wikipedia.org/wiki/${encodeURIComponent(m.title.replace(/ /g, '_'))}`;
      const src = `<div class="geo-langs"><span class="geo-cap">${esc(T.nothingSource)}:</span>` +
        `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(m.title)}</a></div>`;
      return langCardHtml(m.lang, T.nothingByWiki, src);
    }).join('');
    return;
  }

  let places = geoCache.get(q);
  if (!places) {
    // the geocoder knows what actually is a populated place, so it is the
    // primary one. Wikipedia is the fallback: it picks up derived name forms
    // ("sandonese" -> Sandono) but also returns any object with coordinates,
    // from stadiums to prisons, so it is used only when OSM stayed silent
    const osm = await osmPlaces(q);
    const found = osm.length ? osm : (await wikiPlaces(q)).slice(0, 2);
    const byPlace = new Map();
    for (const p of found) {
      const key = normPlace(p.name);
      if (key && !byPlace.has(key)) byPlace.set(key, p);
    }
    places = [...byPlace.values()].slice(0, 3);
    geoCache.set(q, places);
  }
  // the query may have changed while we were on the network
  if (els.search.value.trim().toLowerCase() !== q || !hint()) return;
  if (!places || !places.length) { hint().textContent = ''; return; }

  // a place with no languages nearby has nothing to show
  const withLangs = places
    .map(p => ({ p, near: nearestLanguages(p.lat, p.lon, p.cc) }))
    .filter(x => x.near.length);
  if (!withLangs.length) { hint().textContent = ''; return; }

  hint().innerHTML = withLangs.map(({ p, near }) => {
    // the headline answer is one language you can click straight away; the rest
    // go into a footnote so nobody has to pick from a list of kilometres
    const rest = near.slice(1).map(({ lang, d }) =>
      `<a href="#l=${esc(lang.id)}" data-open="${esc(lang.id)}" title="≈${fmtFull.format(Math.round(d))} km">${esc(lang.label)}</a>`).join('');
    const tail = rest
      ? `<div class="geo-langs"><span class="geo-cap">${esc(T.nothingAlso)}:</span>${rest}</div>`
      : '';
    const place = `<div class="geo-place-name">📍 ${esc(T.nothingPlace)} <strong>${esc(p.name)}</strong>${p.country ? ', ' + esc(p.country) : ''}</div>`;
    return place + langCardHtml(near[0].lang, T.nothingGuess, tail);
  }).join('');
}

// jump to a language from the geographic hint
els.empty.addEventListener('click', e => {
  const a = e.target.closest('[data-open]');
  if (!a) return;
  e.preventDefault();
  const r = byId.get(a.dataset.open);
  if (r) openDetail(r, { fly: true });
});

function sortFiltered() {
  const k = sortKey, d = sortDir;
  filtered.sort((a, b) => {
    let va, vb;
    if (k === 'name') return d * collator.compare(a.label, b.label);
    if (k === 'fam') { va = a.fam || '￿'; vb = b.fam || '￿'; return d * collator.compare(va, vb); }
    if (k === 'ma') return d * collator.compare(maName(a.ma), maName(b.ma));
    if (k === 'aes') {
      va = a.aes === 0 ? 7 : a.aes; vb = b.aes === 0 ? 7 : b.aes;
      return d * (va - vb) || collator.compare(a.label, b.label);
    }
    // spk: empty values always last, regardless of sort direction
    va = a.spk; vb = b.spk;
    if (va === null && vb === null) return collator.compare(a.label, b.label);
    if (va === null) return 1;
    if (vb === null) return -1;
    return d * (va - vb);
  });
}

// ---------- table ----------
function rowHtml(r) {
  const nameSub = r.sub ? ` <span class="lang-name-en">${esc(r.sub)}</span>` : '';
  const spk = r.spk === null
    ? '<span class="na">—</span>'
    : `<span title="${fmtFull.format(r.spk)}">${esc(fmtCompact.format(r.spk))}</span>`;
  return `<td><span class="lang-name">${esc(r.label)}</span>${nameSub}</td>` +
    `<td class="fam">${esc(r.fam || T.isolate)}</td>` +
    `<td class="ma hide-narrow">${esc(maName(r.ma))}</td>` +
    `<td class="num">${spk}</td>` +
    `<td><span class="status-cell"><span class="dot" style="--c:var(--aes-${r.aes})"></span>${esc(T.aes[r.aes])}</span></td>`;
}

function renderTable(reset) {
  if (reset) {
    els.body.innerHTML = '';
    renderedCount = 0;
    els.scroll.scrollTop = 0;
  }
  const frag = document.createDocumentFragment();
  const end = Math.min(filtered.length, renderedCount + PAGE);
  for (let i = renderedCount; i < end; i++) {
    const r = filtered[i];
    const tr = document.createElement('tr');
    tr.innerHTML = rowHtml(r);
    tr.dataset.id = r.id;
    if (r.id === selectedId) tr.classList.add('selected');
    tr.addEventListener('click', () => openDetail(r, { fly: true }));
    frag.appendChild(tr);
  }
  renderedCount = end;
  els.body.appendChild(frag);
}

new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && renderedCount < filtered.length) renderTable(false);
}, { root: els.scroll, rootMargin: '600px' }).observe(document.getElementById('table-sentinel'));

document.querySelectorAll('thead th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const k = th.dataset.sort;
    if (sortKey === k) sortDir = -sortDir;
    else { sortKey = k; sortDir = k === 'spk' ? -1 : 1; }
    document.querySelectorAll('.sort-arrow').forEach(s => (s.textContent = ''));
    th.querySelector('.sort-arrow').textContent = sortDir === 1 ? '↑' : '↓';
    sortFiltered();
    renderTable(true);
  });
});

// ---------- detail drawer ----------
const detail = document.getElementById('detail');
const detailBody = document.getElementById('detail-body');
document.getElementById('detail-close').addEventListener('click', closeDetail);
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!document.getElementById('compare').hidden) closeCompare();
  else if (!document.getElementById('stats').hidden) closeStats();
  else if (!document.getElementById('feedback').hidden) closeFeedback();
  else closeDetail();
});

detailBody.addEventListener('click', e => {
  const open = e.target.closest('[data-open]');
  if (open) {
    e.preventDefault();
    const r = byId.get(open.dataset.open);
    if (r) openDetail(r, { fly: true });
    return;
  }
  const cmp = e.target.closest('[data-compare]');
  if (cmp) openCompare(byId.get(cmp.dataset.compare));
});

function closeDetail() {
  detail.hidden = true;
  selectedId = null;
  selectMarker(null);
  history.replaceState(null, '', location.pathname + location.search);
  document.querySelectorAll('tbody tr.selected').forEach(tr => tr.classList.remove('selected'));
}

function linkItem(url, title, note) {
  return `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}` +
    (note ? `<span class="link-note">${esc(note)}</span>` : '') + '</a></li>';
}

function openDetail(r, { fly }) {
  selectedId = r.id;
  selectMarker(r.idx);
  history.replaceState(null, '', '#l=' + r.id);
  document.querySelectorAll('tbody tr.selected').forEach(tr => tr.classList.remove('selected'));
  const tr = els.body.querySelector(`tr[data-id="${r.id}"]`);
  if (tr) tr.classList.add('selected');

  const parent = r.par ? byId.get(r.par) : null;
  const dialects = childrenOf.get(r.id) || [];
  const countries = r.ccList.length ? r.ccList.map(countryName).join(', ') : '—';
  const alt = (altNames && altNames[r.id] || []).filter(n => n !== r.name && n !== r.label);

  const learn = [];
  if (r.iso) {
    learn.push(linkItem(`https://glosbe.com/${r.iso}/${LANG}`, T.glosbeTitle, T.glosbeNote));
    learn.push(linkItem(`https://forvo.com/languages/${r.iso}/`, T.forvoTitle, T.forvoNote));
  }
  learn.push(linkItem(
    `https://www.google.com/search?q=${encodeURIComponent(tpl(T.coursesQuery, { name: r.label }))}`,
    T.coursesTitle, T.coursesNote,
  ));

  const links = [];
  links.push(linkItem(`https://glottolog.org/resource/languoid/id/${r.id}`, 'Glottolog', T.glottologNote));
  if (r.wr) links.push(linkItem(r.wr, T.wikiRu, T.wikiNote));
  if (r.we) links.push(linkItem(r.we, T.wikiEn, T.wikiNote));
  if (r.iso) {
    links.push(linkItem(`http://www.language-archives.org/language/${r.iso}`, T.olacTitle, T.olacNote));
    links.push(linkItem(`https://www.ethnologue.com/language/${r.iso}/`, 'Ethnologue', T.ethnologueNote));
    if (r.aes >= 2 && r.aes <= 5) {
      links.push(linkItem(`https://www.endangeredlanguages.com/lang/${r.iso}`, 'Endangered Languages Project', T.elpNote));
    }
  }

  detailBody.innerHTML = `
    <h2>${esc(r.label)}</h2>
    ${r.sub ? `<p class="en-name">${esc(r.sub)}</p>` : ''}
    <div class="code-chips">
      <span class="code-chip" title="Glottocode">${esc(r.id)}</span>
      ${r.iso ? `<span class="code-chip" title="ISO 639-3">ISO ${esc(r.iso)}</span>` : ''}
    </div>
    <div class="status-row-line">
      <div class="status-line"><span class="dot" style="--c:var(--aes-${r.aes})"></span>${esc(T.aes[r.aes])}</div>
      <button class="ghost-btn compare-btn" data-compare="${esc(r.id)}">⚖ ${esc(T.compareBtn)}</button>
    </div>
    <dl>
      <dt>${esc(T.cardFamily)}</dt><dd>${esc(r.fam || T.cardIsolate)}</dd>
      <dt>${esc(T.cardType)}</dt><dd>${parent
        ? `${esc(T.dialect)} · <a href="#l=${esc(parent.id)}" data-open="${esc(parent.id)}">${esc(parent.label)}</a>`
        : esc(T.cat[r.cat] || r.cat)}</dd>
      <dt>${esc(T.cardRegion)}</dt><dd>${esc(maName(r.ma))}</dd>
      <dt>${esc(T.cardCountries)}</dt><dd>${esc(countries)}</dd>
      <dt>${esc(T.cardSpeakers)}</dt><dd>${r.spk === null ? esc(T.noData) : esc(fmtFull.format(r.spk)) + ' (Wikidata)'}</dd>
      <dt>${esc(T.cardMed)}</dt><dd>${esc(T.med[r.med] || '—')}</dd>
    </dl>
    ${alt.length ? `<h3>${esc(T.alsoKnown)}</h3><p class="alt-names">${esc(alt.slice(0, 24).join(' · '))}</p>` : ''}
    ${dialects.length ? `
    <h3>${esc(tpl(T.dialectsTitle, { n: fmtFull.format(dialects.length) }))}</h3>
    <div class="dial-chips">${dialects.map(d =>
      `<a href="#l=${esc(d.id)}" data-open="${esc(d.id)}">${esc(d.label)}</a>`).join('')}</div>` : ''}
    <div id="rel-box" class="rel-box"></div>
    <h3>${esc(T.learnTitle)}</h3>
    <ul class="links">${learn.join('')}</ul>
    <h3>${esc(T.cardLinks)}</h3>
    <ul class="links">${links.join('')}</ul>
    <p class="foot-note">${esc(T.footNote)} ${esc(T.verifyNote)}</p>`;
  detail.hidden = false;
  renderRelations(r);
  if (!related) loadRelated().then(() => { if (selectedId === r.id) renderRelations(r); });

  // a map in a collapsed tab has zero size, and flying to a point divides by zero
  const mapReady = map && map.getSize().x > 0 && map.getSize().y > 0;
  if (fly && r.lat !== null && mapReady) {
    const z = Math.max(map.getZoom(), 5);
    let center = L.latLng(r.lat, r.lon);
    // on desktop the card covers the edge of the map — aim to the side so the
    // selected marker stays visible
    if (window.innerWidth > 900) {
      const shift = Math.min(430, window.innerWidth * 0.92) / 2;
      const px = map.project(center, z).add([RTL ? -shift : shift, 0]);
      center = map.unproject(px, z);
    }
    map.flyTo(center, z, { duration: 0.8 });
  }
}

// ---------- feedback ----------
// A static site cannot send mail itself, so these are just contact channels.
// The email address is assembled from pieces in the code: that makes it harder
// for spam robots reading the page source to harvest
const FEEDBACK = {
  user: 'lvigtor',
  domain: 'gmail.com',
  linkedin: 'https://www.linkedin.com/in/viktor-lavrov/',
  github: 'https://github.com/mrWD/langs-db/issues',
};

function initFeedback() {
  const overlay = document.getElementById('feedback');
  const mail = `${FEEDBACK.user}@${FEEDBACK.domain}`;
  document.getElementById('fb-body').innerHTML = `
    <p class="fb-text">${esc(T.fbText)}</p>
    <ul class="links">
      <li><a href="mailto:${esc(mail)}?subject=${encodeURIComponent(T.fbSubject)}">
        ${esc(T.fbEmail)}<span class="link-note">${esc(mail)}</span></a></li>
      <li><a href="${esc(FEEDBACK.linkedin)}" target="_blank" rel="noopener">
        ${esc(T.fbLinkedIn)}<span class="link-note">Viktor Lavrov</span></a></li>
      <li><a href="${esc(FEEDBACK.github)}" target="_blank" rel="noopener">
        ${esc(T.fbGithub)}<span class="link-note">${esc(T.fbGithubNote)}</span></a></li>
    </ul>`;

  const open = () => { overlay.hidden = false; };
  document.getElementById('fb-btn').addEventListener('click', open);
  document.getElementById('fb-close').addEventListener('click', closeFeedback);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeFeedback(); });
}
function closeFeedback() {
  document.getElementById('feedback').hidden = true;
}

// ---------- language relations ----------
let related = null;        // {glottocode: {g: [[id,%,n]], l: [[id,%,n]]}}
let relatedPromise = null;
let cladeNames = [];
let byClade = new Map();   // index of the last branch -> languages of that branch

function loadRelated() {
  if (!relatedPromise) {
    relatedPromise = fetch('related.json')
      .then(r => r.json())
      .then(d => { related = d; return d; })
      .catch(() => (related = {}));
  }
  return relatedPromise;
}

function relLinks(list) {
  return list.map(([id, pct, n]) => {
    const r = byId.get(id);
    if (!r) return '';
    return `<a href="#l=${esc(id)}" data-open="${esc(id)}" title="${esc(String(n))}">` +
      `${esc(r.label)} <span class="rel-pct">${pct}%</span></a>`;
  }).filter(Boolean).join('');
}

function kinLinks(r) {
  // Relatives are descendants of the nearest common branch. Going down to the
  // last node is not enough: Ukrainian sits a level deeper than Russian (East
  // Slavic > Ukrainian-Rusyn) and would otherwise miss the kin list. So we walk
  // up from the narrowest branch until at least a couple of languages accumulate
  for (let i = r.cls.length - 1; i >= 0; i--) {
    const members = (byClade.get(r.cls[i]) || []).filter(x => x.id !== r.id);
    if (members.length >= 2 || (members.length && i === 0)) {
      return { clade: cladeNames[r.cls[i]], members };
    }
  }
  return { clade: '', members: [] };
}

function renderRelations(r) {
  const box = document.getElementById('rel-box');
  if (!box) return;
  const parts = [];

  if (r.cls.length) {
    const branch = r.cls.map(k => esc(cladeNames[k])).join(' › ');
    parts.push(`<div class="rel-line"><span class="rel-cap">${esc(T.relBranch)}:</span>` +
      `<span class="rel-branch">${branch}</span></div>`);
  }
  const kin = kinLinks(r);
  if (kin.members.length) {
    const shown = kin.members.slice(0, 12);
    const more = kin.members.length - shown.length;
    parts.push(`<div class="rel-line"><span class="rel-cap">${esc(T.relKin)}` +
      `${kin.clade ? ` <span class="rel-clade">(${esc(kin.clade)})</span>` : ''}:</span>` +
      `<span class="rel-links">${shown.map(x =>
        `<a href="#l=${esc(x.id)}" data-open="${esc(x.id)}">${esc(x.label)}</a>`).join('')}` +
      `${more > 0 ? `<span class="rel-pct">+${fmtFull.format(more)}</span>` : ''}</span></div>`);
  }

  // grammar and lexicon come from related.json; for a dialect we take the parent
  const rel = related && (related[r.id] || (r.par ? related[r.par] : null));
  if (rel?.g) {
    parts.push(`<div class="rel-line"><span class="rel-cap">${esc(T.relGram)}:</span>` +
      `<span class="rel-links">${relLinks(rel.g.slice(0, 8))}</span></div>`);
  }
  if (rel?.l) {
    parts.push(`<div class="rel-line"><span class="rel-cap">${esc(T.relLex)}:</span>` +
      `<span class="rel-links">${relLinks(rel.l.slice(0, 8))}</span></div>`);
  }

  if (r.lat !== null) {
    const geo = nearestLanguages(r.lat, r.lon, '', 400, 7).filter(x => x.lang.id !== r.id).slice(0, 6);
    if (geo.length) {
      parts.push(`<div class="rel-line"><span class="rel-cap">${esc(T.relGeo)}:</span>` +
        `<span class="rel-links">${geo.map(({ lang, d }) =>
          `<a href="#l=${esc(lang.id)}" data-open="${esc(lang.id)}">${esc(lang.label)}` +
          `<span class="rel-pct">${fmtFull.format(Math.round(d))} km</span></a>`).join('')}</span></div>`);
    }
  }

  box.innerHTML = parts.length
    ? `<h3>${esc(T.relTitle)}</h3>${parts.join('')}<p class="foot-note">${esc(T.relNote)}</p>`
    : '';
}

// ---------- compare ----------
const cmpEls = {
  overlay: document.getElementById('compare'),
  body: document.getElementById('compare-body'),
  search: document.getElementById('cmp-search'),
  results: document.getElementById('cmp-results'),
};
let cmpA = null;
let cmpB = null;
let walsPromise = null;

function loadWals() {
  if (!walsPromise) walsPromise = fetch('wals.json').then(resp => resp.json());
  return walsPromise;
}
function openCompare(a, b) {
  cmpA = a;
  cmpB = b || null;
  cmpEls.search.value = '';
  cmpEls.results.hidden = true;
  cmpEls.overlay.hidden = false;
  cmpEls.search.placeholder = T.comparePick;
  renderCompare();
  if (!cmpB) cmpEls.search.focus();
}
function closeCompare() {
  cmpEls.overlay.hidden = true;
  if (selectedId) history.replaceState(null, '', '#l=' + selectedId);
}
document.getElementById('compare-close').addEventListener('click', closeCompare);
cmpEls.overlay.addEventListener('click', e => { if (e.target === cmpEls.overlay) closeCompare(); });

cmpEls.search.addEventListener('input', () => {
  const q = cmpEls.search.value.trim().toLowerCase();
  if (q.length < 2) { cmpEls.results.hidden = true; return; }
  const found = [];
  for (const r of ROWS) {
    if (r.id !== cmpA.id && matchesQuery(r, q)) {
      found.push(r);
      if (found.length >= 12) break;
    }
  }
  cmpEls.results.innerHTML = found.map(r =>
    `<button data-id="${esc(r.id)}"><strong>${esc(r.label)}</strong> <span>${esc(r.par ? r.sub : (r.fam || T.isolate))}</span></button>`).join('');
  cmpEls.results.hidden = !found.length;
});
cmpEls.results.addEventListener('click', e => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  cmpB = byId.get(btn.dataset.id);
  cmpEls.results.hidden = true;
  cmpEls.search.value = '';
  renderCompare();
});

function cmpBasicRow(label, va, vb) {
  const match = va === vb && va !== '—';
  return `<tr class="${match ? 'match' : ''}"><td>${esc(label)}</td><td>${esc(va)}</td><td>${esc(vb)}</td></tr>`;
}
function basicVal(r) {
  return {
    fam: r.fam || T.cardIsolate,
    type: r.par ? tpl(T.dialectOf, { name: byId.get(r.par)?.label || '' }) : (T.cat[r.cat] || r.cat),
    ma: maName(r.ma),
    cc: r.ccList.length ? r.ccList.map(countryName).join(', ') : '—',
    spk: r.spk === null ? T.noData : fmtCompact.format(r.spk),
    aes: T.aes[r.aes],
    med: T.med[r.med] || '—',
  };
}
async function renderCompare() {
  const a = cmpA, b = cmpB;
  history.replaceState(null, '', b ? `#cmp=${a.id},${b.id}` : '#cmp=' + a.id);
  const head = `<div class="cmp-heads"><div>${esc(a.label)}</div><div>${b ? esc(b.label) : '…'}</div></div>`;
  if (!b) {
    cmpEls.body.innerHTML = head;
    return;
  }
  const va = basicVal(a), vb = basicVal(b);
  const basic = `
    <h3>${esc(T.compareBasic)}</h3>
    <div class="cmp-scroll"><table class="cmp-table">
      ${cmpBasicRow(T.cardFamily, va.fam, vb.fam)}
      ${cmpBasicRow(T.cardType, va.type, vb.type)}
      ${cmpBasicRow(T.cardRegion, va.ma, vb.ma)}
      ${cmpBasicRow(T.cardCountries, va.cc, vb.cc)}
      ${cmpBasicRow(T.cardSpeakers, va.spk, vb.spk)}
      ${cmpBasicRow(T.thStatus, va.aes, vb.aes)}
      ${cmpBasicRow(T.cardMed, va.med, vb.med)}
    </table></div>`;
  cmpEls.body.innerHTML = head + basic + `<h3>${esc(T.compareGrammar)}</h3><p class="cmp-note">${esc(T.compareLoading)}</p>`;

  const wals = await loadWals();
  if (cmpA !== a || cmpB !== b) return; // something else was selected while loading
  const wa = wals.langs[a.id] || wals.langs[a.par];
  const wb = wals.langs[b.id] || wals.langs[b.par];
  const missing = [!wa && a, !wb && b].filter(Boolean)
    .map(r => `<p class="cmp-note">${esc(tpl(T.compareNoWals, { name: r.label }))}</p>`).join('');
  let grammar = '';
  if (wa && wb) {
    const common = Object.keys(wa).filter(f => f in wb)
      .sort((x, y) => parseInt(x) - parseInt(y) || x.localeCompare(y));
    const matches = common.filter(f => wa[f] === wb[f]);
    const rows = common.map(f => {
      const feat = wals.features[f];
      const same = wa[f] === wb[f];
      return `<tr class="${same ? 'match' : ''}"><td>${esc(feat.n)}</td>` +
        `<td>${esc(feat.v[wa[f]] || wa[f])}</td><td>${esc(feat.v[wb[f]] || wb[f])}</td></tr>`;
    }).join('');
    grammar = common.length
      ? `<p class="cmp-summary">${esc(tpl(T.compareMatches, { m: matches.length, n: common.length }))}</p>
         <div class="cmp-scroll"><table class="cmp-table">${rows}</table></div>`
      : '';
  }
  cmpEls.body.innerHTML = head + basic +
    `<h3>${esc(T.compareGrammar)}</h3>` + missing + grammar +
    `<p class="cmp-note">${esc(T.compareNote)}</p>`;
}

// ---------- filter widgets ----------
function buildStatusChips() {
  const order = [1, 2, 3, 4, 5, 6, 0];
  els.chips.innerHTML = order
    .map(a => `<button class="chip" data-aes="${a}" style="--c:var(--aes-${a})" aria-pressed="true"><span class="dot"></span>${esc(T.aes[a])}</button>`)
    .join('');
  els.chips.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const a = +chip.dataset.aes;
      if (activeStatuses.has(a)) { activeStatuses.delete(a); chip.classList.add('off'); chip.setAttribute('aria-pressed', 'false'); }
      else { activeStatuses.add(a); chip.classList.remove('off'); chip.setAttribute('aria-pressed', 'true'); }
      applyFilters();
    });
  });
}

function buildSelects() {
  const mas = [...new Set(ROWS.flatMap(r => r.maList))].filter(Boolean).sort();
  els.ma.innerHTML = `<option value="">${esc(T.regionAll)}</option>` +
    mas.map(m => `<option value="${esc(m)}">${esc(T.ma[m] || m)}</option>`).join('');

  const famCount = new Map();
  for (const r of ROWS) if (!r.par) famCount.set(r.fam, (famCount.get(r.fam) || 0) + 1);
  const fams = [...famCount.entries()].filter(([f]) => f).sort((a, b) => b[1] - a[1]);
  els.fam.innerHTML = `<option value="">${esc(T.familyAll)}</option>` +
    fams.map(([f, n]) => `<option value="${esc(f)}">${esc(f)} (${n})</option>`).join('') +
    `<option value="__isolate__">${esc(tpl(T.familyIsolates, { n: famCount.get('') || 0 }))}</option>`;

  const ccCount = new Map();
  for (const r of ROWS) if (!r.par) for (const c of r.ccList) ccCount.set(c, (ccCount.get(c) || 0) + 1);
  const ccs = [...ccCount.entries()]
    .map(([c, n]) => ({ c, n, name: countryName(c) }))
    .sort((a, b) => collator.compare(a.name, b.name));
  els.cc.innerHTML = `<option value="">${esc(T.countryAll)}</option>` +
    ccs.map(x => `<option value="${esc(x.c)}">${esc(x.name)} (${x.n})</option>`).join('');
}

let searchTimer = null;
els.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 130);
});
[els.ma, els.fam, els.cc, els.spk, els.med, els.lvl].forEach(el => el.addEventListener('change', applyFilters));
document.getElementById('reset').addEventListener('click', () => {
  els.search.value = '';
  [els.ma, els.fam, els.cc, els.spk, els.med, els.lvl].forEach(el => (el.value = ''));
  activeStatuses.clear();
  [0, 1, 2, 3, 4, 5, 6].forEach(a => activeStatuses.add(a));
  els.chips.querySelectorAll('.chip').forEach(c => { c.classList.remove('off'); c.setAttribute('aria-pressed', 'true'); });
  applyFilters();
});

// ---------- boot ----------
async function boot() {
  applyStatic();
  const resp = await fetch('data.json');
  const data = await resp.json();
  const idx = Object.fromEntries(data.cols.map((c, i) => [c, i]));

  ROWS = data.rows.map((row, i) => {
    const nm = row[idx.nm] || null;
    const r = {
      id: row[idx.id], name: row[idx.name], nm, iso: row[idx.iso],
      fam: row[idx.fam], ma: row[idx.ma], lat: row[idx.lat], lon: row[idx.lon],
      cc: row[idx.cc], aes: row[idx.aes], med: row[idx.med],
      spk: row[idx.spk] === undefined || row[idx.spk] === null ? null : row[idx.spk],
      cat: row[idx.cat], wr: row[idx.wr], we: row[idx.we], par: row[idx.par] || '',
      cls: row[idx.cls] || [], idx: i,
    };
    r.ccList = r.cc ? r.cc.split(';') : [];
    r.maList = r.ma ? r.ma.split(';') : [];
    const localized = nm ? nm[LANG] : '';
    r.label = localized || r.name;
    r.sub = localized && localized.toLowerCase() !== r.name.toLowerCase() ? r.name : '';
    // every localised name goes into the index — search works in any language
    r.search = `${r.name}|${nm ? Object.values(nm).join('|') : ''}|${r.iso}|${r.id}|${r.fam}`.toLowerCase();
    return r;
  });

  byId = new Map(ROWS.map(r => [r.id, r]));
  cladeNames = data.clades || [];
  byClade = new Map();
  for (const r of ROWS) {
    if (r.par) continue;                    // look for kin among languages, not dialects
    for (const k of r.cls) {                // a language is listed in all of its branches
      if (!byClade.has(k)) byClade.set(k, []);
      byClade.get(k).push(r);
    }
  }
  childrenOf = new Map();
  for (const r of ROWS) {
    if (!r.par) continue;
    if (!childrenOf.has(r.par)) childrenOf.set(r.par, []);
    childrenOf.get(r.par).push(r);
    const p = byId.get(r.par);
    if (p) {
      r.sub = tpl(T.dialectOf, { name: p.label });
      r.search += `|${p.name}|${p.label}`.toLowerCase();
    }
  }

  const nLangs = ROWS.reduce((n, r) => n + (r.par ? 0 : 1), 0);
  document.getElementById('subtitle').textContent = tpl(T.subtitle, {
    n: fmtFull.format(nLangs), d: fmtFull.format(ROWS.length - nLangs),
  });
  const credits = tpl(esc(T.footer), {
    glottolog: '<a href="https://glottolog.org" target="_blank" rel="noopener">Glottolog 5.x</a>',
    wikidata: '<a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>',
    wals: '<a href="https://wals.info" target="_blank" rel="noopener">WALS</a>',
    date: esc(data.generated),
  });
  const donate = [
    ['https://buymeacoffee.com/ipupok', '☕ Buy Me a Coffee'],
    ['https://ko-fi.com/ipupok', 'Ko-fi'],
    ['https://www.paypal.com/donate/?hosted_button_id=VBNDB5AHYLGCY', 'PayPal'],
  ].map(([u, t]) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`).join(' · ');
  document.getElementById('footer').innerHTML =
    `<span>${credits} · ${esc(T.verifyNote)}</span>` +
    `<span class="donations">${esc(T.supportLabel)} ${donate}</span>`;

  initMap();
  buildMarkers();
  buildStatusChips();
  buildSelects();
  applyFilters();

  const m = location.hash.match(/^#l=([a-z0-9]+)/);
  if (m) {
    const r = byId.get(m[1]);
    if (r) openDetail(r, { fly: true });
  }
  const c = location.hash.match(/^#cmp=([a-z0-9]+)(?:,([a-z0-9]+))?/);
  if (c) {
    const a = byId.get(c[1]);
    if (a) openCompare(a, c[2] ? byId.get(c[2]) : null);
  }

  initFeedback();
  initAnalytics({ T, esc, tpl, fmtFull, LANG, collator, countryName });

  // alternative names (86k variants) in the background, widening the search
  fetch('altnames.json')
    .then(r => r.json())
    .then(a => {
      altNames = a;
      if (els.search.value.trim()) applyFilters();
    })
    .catch(() => {});
}

boot().catch(err => {
  document.getElementById('result-count').textContent = 'Data load error: ' + err.message;
  console.error(err);
});
