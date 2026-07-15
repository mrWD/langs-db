/* Языки мира — интерактивный атлас. Данные: Glottolog (CC BY 4.0) + Wikidata (CC0). */
'use strict';

// ---------- constants ----------
const AES_LABELS = [
  'Нет данных', 'Вне угрозы', 'Уязвимый', 'Под угрозой',
  'Серьёзная угроза', 'На грани исчезновения', 'Вымерший',
];
const MED_LABELS = {
  0: 'Полная грамматика (300+ стр.)',
  1: 'Грамматика',
  2: 'Очерк грамматики',
  3: 'Фонология, тексты или словарь',
  4: 'Список слов или меньше',
  '-1': 'Нет данных',
};
const MA_RU = {
  'Eurasia': 'Евразия', 'Africa': 'Африка', 'North America': 'Сев. Америка',
  'South America': 'Юж. Америка', 'Papunesia': 'Папунезия', 'Australia': 'Австралия',
};
const CAT_RU = { L: 'устный язык', S: 'жестовый язык', P: 'пиджин', M: 'смешанный язык' };

const fmtCompact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });
const fmtFull = new Intl.NumberFormat('ru-RU');
const regionNames = (() => {
  try { return new Intl.DisplayNames(['ru'], { type: 'region' }); }
  catch { return null; }
})();

function countryName(cc) {
  try { return (regionNames && regionNames.of(cc)) || cc; } catch { return cc; }
}
function maRu(ma) {
  if (!ma) return '—';
  return ma.split(';').map(m => MA_RU[m] || m).join(', ');
}
function aesColor(level) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--aes-${level}`).trim();
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- state ----------
let ROWS = [];               // {id,name,nr,iso,fam,ma,lat,lon,cc,aes,med,spk,cat,wr,we,idx,label}
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
let markers = [];            // parallel to ROWS (null where no coords)
let markerGroup = null;

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
function buildMarkers() {
  const stroke = markerStroke();
  markers = ROWS.map(r => {
    if (r.lat === null || r.lon === null) return null;
    const m = L.circleMarker([r.lat, r.lon], {
      radius: 4.5,
      weight: 1,
      color: stroke,
      opacity: 0.9,
      fillColor: aesColor(r.aes),
      fillOpacity: 0.85,
    });
    m.on('click', () => openDetail(r, { fly: false }));
    m.on('mouseover', () => {
      m.setStyle({ radius: 7 });
      m.bindTooltip(
        `<strong>${esc(r.label)}</strong><br><span class="tip-sub">${esc(r.fam || 'изолят')} · ${esc(AES_LABELS[r.aes])}</span>`,
        { className: 'lang-tip', direction: 'top', offset: [0, -8], sticky: false },
      ).openTooltip();
    });
    m.on('mouseout', () => { m.setStyle({ radius: 4.5 }); m.closeTooltip(); });
    return m;
  });
}
function restyleMarkers() {
  const stroke = markerStroke();
  const colors = {};
  for (let a = 0; a <= 6; a++) colors[a] = aesColor(a);
  markers.forEach((m, i) => {
    if (m) m.setStyle({ color: stroke, fillColor: colors[ROWS[i].aes] });
  });
}
function updateMapMarkers() {
  markerGroup.clearLayers();
  const pts = [];
  for (const r of filtered) {
    const m = markers[r.idx];
    if (m) { markerGroup.addLayer(m); pts.push(m.getLatLng()); }
  }
  // с небольшим набором результатов подводим карту к найденному
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
    .map(a => `<div class="row"><span class="dot" style="--c:var(--aes-${a})"></span>${esc(AES_LABELS[a])} · ${fmtFull.format(counts[a])}</div>`)
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
  chips: document.getElementById('status-chips'),
  count: document.getElementById('result-count'),
  body: document.getElementById('table-body'),
  scroll: document.getElementById('table-scroll'),
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

function applyFilters() {
  const q = els.search.value.trim().toLowerCase();
  const ma = els.ma.value;
  const fam = els.fam.value;
  const cc = els.cc.value;
  const spk = els.spk.value;
  const med = els.med.value;

  filtered = ROWS.filter(r => {
    if (!activeStatuses.has(r.aes)) return false;
    if (ma && !r.maList.includes(ma)) return false;
    if (fam) {
      if (fam === '__isolate__' ? r.fam !== '' : r.fam !== fam) return false;
    }
    if (cc && !r.ccList.includes(cc)) return false;
    if (spk !== '' && spkBucket(r.spk) !== +spk) return false;
    if (med && !medMatch(med, r.med)) return false;
    if (q && !r.search.includes(q)) return false;
    return true;
  });
  sortFiltered();
  renderTable(true);
  updateMapMarkers();
  renderLegend();
  els.count.textContent = `Найдено: ${fmtFull.format(filtered.length)}`;
}

function sortFiltered() {
  const k = sortKey, d = sortDir;
  const coll = new Intl.Collator('ru');
  filtered.sort((a, b) => {
    let va, vb;
    if (k === 'name') { va = a.label; vb = b.label; return d * coll.compare(va, vb); }
    if (k === 'fam') { va = a.fam || 'яяя'; vb = b.fam || 'яяя'; return d * coll.compare(va, vb); }
    if (k === 'ma') { return d * coll.compare(maRu(a.ma), maRu(b.ma)); }
    if (k === 'aes') {
      va = a.aes === 0 ? 7 : a.aes; vb = b.aes === 0 ? 7 : b.aes;
      return d * (va - vb) || coll.compare(a.label, b.label);
    }
    // spk: nulls always last regardless of direction
    va = a.spk; vb = b.spk;
    if (va === null && vb === null) return coll.compare(a.label, b.label);
    if (va === null) return 1;
    if (vb === null) return -1;
    return d * (va - vb);
  });
}

// ---------- table ----------
function rowHtml(r) {
  const nameMain = r.nr || r.name;
  const nameSub = r.nr && r.nr.toLowerCase() !== r.name.toLowerCase() ? ` <span class="lang-name-en">${esc(r.name)}</span>` : '';
  const spk = r.spk === null
    ? '<span class="na">—</span>'
    : `<span title="${fmtFull.format(r.spk)}">${esc(fmtCompact.format(r.spk))}</span>`;
  return `<td><span class="lang-name">${esc(nameMain)}</span>${nameSub}</td>` +
    `<td class="fam">${esc(r.fam || 'изолят')}</td>` +
    `<td class="ma hide-narrow">${esc(maRu(r.ma))}</td>` +
    `<td class="num">${spk}</td>` +
    `<td><span class="status-cell"><span class="dot" style="--c:var(--aes-${r.aes})"></span>${esc(AES_LABELS[r.aes])}</span></td>`;
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

// sorting
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
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

function closeDetail() {
  detail.hidden = true;
  selectedId = null;
  history.replaceState(null, '', location.pathname + location.search);
  document.querySelectorAll('tbody tr.selected').forEach(tr => tr.classList.remove('selected'));
}

function linkItem(url, title, note) {
  return `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(title)}` +
    (note ? `<span class="link-note">${esc(note)}</span>` : '') + '</a></li>';
}

function openDetail(r, { fly }) {
  selectedId = r.id;
  history.replaceState(null, '', '#l=' + r.id);
  document.querySelectorAll('tbody tr.selected').forEach(tr => tr.classList.remove('selected'));
  const tr = els.body.querySelector(`tr[data-id="${r.id}"]`);
  if (tr) tr.classList.add('selected');

  const countries = r.ccList.length
    ? r.ccList.map(countryName).join(', ')
    : '—';
  const links = [];
  links.push(linkItem(`https://glottolog.org/resource/languoid/id/${r.id}`, 'Glottolog', 'классификация, библиография описаний'));
  if (r.wr) links.push(linkItem(r.wr, 'Википедия (рус.)', 'обзорная статья'));
  if (r.we) links.push(linkItem(r.we, 'Wikipedia (англ.)', 'обзорная статья'));
  if (r.iso) {
    links.push(linkItem(`http://www.language-archives.org/language/${r.iso}`, 'OLAC — языковые архивы', 'записи речи, тексты, учебные материалы'));
    links.push(linkItem(`https://www.ethnologue.com/language/${r.iso}/`, 'Ethnologue', 'демография и статус (частично платно)'));
    if (r.aes >= 2 && r.aes <= 5) {
      links.push(linkItem(`https://www.endangeredlanguages.com/lang/${r.iso}`, 'Endangered Languages Project', 'проект документации исчезающих языков'));
    }
  }

  detailBody.innerHTML = `
    <h2>${esc(r.nr || r.name)}</h2>
    ${r.nr && r.nr.toLowerCase() !== r.name.toLowerCase() ? `<p class="en-name">${esc(r.name)}</p>` : ''}
    <div class="code-chips">
      <span class="code-chip" title="Glottocode">${esc(r.id)}</span>
      ${r.iso ? `<span class="code-chip" title="ISO 639-3">ISO ${esc(r.iso)}</span>` : ''}
    </div>
    <div class="status-line"><span class="dot" style="--c:var(--aes-${r.aes})"></span>${esc(AES_LABELS[r.aes])}</div>
    <dl>
      <dt>Семья</dt><dd>${esc(r.fam || 'Изолят / вне семьи')}</dd>
      <dt>Тип</dt><dd>${esc(CAT_RU[r.cat] || r.cat)}</dd>
      <dt>Макрорегион</dt><dd>${esc(maRu(r.ma))}</dd>
      <dt>Страны</dt><dd>${esc(countries)}</dd>
      <dt>Носители</dt><dd>${r.spk === null ? 'нет данных' : fmtFull.format(r.spk) + ' (Wikidata)'}</dd>
      <dt>Лучшее описание</dt><dd>${esc(MED_LABELS[r.med] || '—')}</dd>
    </dl>
    <h3>Материалы и ссылки</h3>
    <ul class="links">${links.join('')}</ul>
    <p class="foot-note">Статус — агрегированная шкала AES (Glottolog) по данным ElCat, Ethnologue и UNESCO. Число носителей — Wikidata (P1098); для малых языков может быть устаревшим.</p>`;
  detail.hidden = false;

  if (fly && r.lat !== null && map) {
    map.flyTo([r.lat, r.lon], Math.max(map.getZoom(), 5), { duration: 0.8 });
  }
}

// ---------- filter widgets ----------
function buildStatusChips() {
  const order = [1, 2, 3, 4, 5, 6, 0];
  els.chips.innerHTML = order
    .map(a => `<button class="chip" data-aes="${a}" style="--c:var(--aes-${a})" aria-pressed="true"><span class="dot"></span>${esc(AES_LABELS[a])}</button>`)
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
  // macroareas (a language may span several, ';'-separated)
  const mas = [...new Set(ROWS.flatMap(r => r.maList))].filter(Boolean).sort();
  els.ma.innerHTML = '<option value="">Регион: все</option>' +
    mas.map(m => `<option value="${esc(m)}">${esc(MA_RU[m] || m)}</option>`).join('');

  // families by size
  const famCount = new Map();
  for (const r of ROWS) famCount.set(r.fam, (famCount.get(r.fam) || 0) + 1);
  const fams = [...famCount.entries()].filter(([f]) => f).sort((a, b) => b[1] - a[1]);
  els.fam.innerHTML = '<option value="">Семья: все</option>' +
    fams.map(([f, n]) => `<option value="${esc(f)}">${esc(f)} (${n})</option>`).join('') +
    `<option value="__isolate__">Изоляты (${famCount.get('') || 0})</option>`;

  // countries by russian name
  const ccCount = new Map();
  for (const r of ROWS) for (const c of r.ccList) ccCount.set(c, (ccCount.get(c) || 0) + 1);
  const coll = new Intl.Collator('ru');
  const ccs = [...ccCount.entries()]
    .map(([c, n]) => ({ c, n, name: countryName(c) }))
    .sort((a, b) => coll.compare(a.name, b.name));
  els.cc.innerHTML = '<option value="">Страна: все</option>' +
    ccs.map(x => `<option value="${esc(x.c)}">${esc(x.name)} (${x.n})</option>`).join('');
}

let searchTimer = null;
els.search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 130);
});
[els.ma, els.fam, els.cc, els.spk, els.med].forEach(el => el.addEventListener('change', applyFilters));
document.getElementById('reset').addEventListener('click', () => {
  els.search.value = '';
  [els.ma, els.fam, els.cc, els.spk, els.med].forEach(el => (el.value = ''));
  activeStatuses.clear();
  [0, 1, 2, 3, 4, 5, 6].forEach(a => activeStatuses.add(a));
  els.chips.querySelectorAll('.chip').forEach(c => { c.classList.remove('off'); c.setAttribute('aria-pressed', 'true'); });
  applyFilters();
});

// ---------- boot ----------
async function boot() {
  const resp = await fetch('data.json');
  const data = await resp.json();
  const idx = Object.fromEntries(data.cols.map((c, i) => [c, i]));
  ROWS = data.rows.map((row, i) => {
    const r = {
      id: row[idx.id], name: row[idx.name], nr: row[idx.nr], iso: row[idx.iso],
      fam: row[idx.fam], ma: row[idx.ma], lat: row[idx.lat], lon: row[idx.lon],
      cc: row[idx.cc], aes: row[idx.aes], med: row[idx.med],
      spk: row[idx.spk] === undefined ? null : row[idx.spk],
      cat: row[idx.cat], wr: row[idx.wr], we: row[idx.we], idx: i,
    };
    if (r.spk === null || r.spk === undefined) r.spk = null;
    r.ccList = r.cc ? r.cc.split(';') : [];
    r.maList = r.ma ? r.ma.split(';') : [];
    r.label = r.nr || r.name;
    r.search = `${r.name}|${r.nr}|${r.iso}|${r.id}|${r.fam}`.toLowerCase();
    return r;
  });

  document.getElementById('total-count').textContent = fmtFull.format(ROWS.length);
  document.getElementById('generated-date').textContent = data.generated;

  initMap();
  buildMarkers();
  buildStatusChips();
  buildSelects();
  applyFilters();

  const m = location.hash.match(/^#l=([a-z0-9]+)/);
  if (m) {
    const r = ROWS.find(x => x.id === m[1]);
    if (r) openDetail(r, { fly: true });
  }
}

boot().catch(err => {
  document.getElementById('result-count').textContent = 'Ошибка загрузки данных: ' + err.message;
  console.error(err);
});
