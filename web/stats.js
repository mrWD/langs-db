/* Счётчик посещений и панель статистики.

   Считаем через Abacus (abacus.jasoncameron.dev) — публичный счётчик без
   регистрации: браузер увеличивает несколько ключей, ничего не сохраняя о
   пользователе. Ключи: total, uniq, d-<дата>, tz-<часовой пояс>, ui-<локаль>.
   Разбивку по странам и городам собирает ночной GitHub Action
   (data/collect_stats.py) в web/stats.json — у Abacus нет способа перечислить
   ключи, поэтому их опрашивает CI, а сайт читает готовый файл. */
'use strict';

const ABACUS = 'https://abacus.jasoncameron.dev';
const NAMESPACE = 'langs-db-mrwd';
// счёт ведём только на боевом домене, чтобы локальная разработка не искажала цифры
const COUNT_HOSTS = ['mrwd.github.io'];

let statsCtx = null;
let statsLoaded = null;

function hit(key) {
  return fetch(`${ABACUS}/hit/${NAMESPACE}/${encodeURIComponent(key)}`, { mode: 'cors' })
    .then(r => r.json())
    .catch(() => null);
}
function readCounter(key) {
  return fetch(`${ABACUS}/get/${NAMESPACE}/${encodeURIComponent(key)}`, { mode: 'cors' })
    .then(r => (r.ok ? r.json() : { value: 0 }))
    .then(d => d.value || 0)
    .catch(() => null);
}

function tzKey() {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* нет данных */ }
  if (!tz) return null;
  return 'tz-' + tz.replace(/\//g, '-').replace(/[^A-Za-z0-9_\-.]/g, '');
}
function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

function countVisit(lang) {
  if (!COUNT_HOSTS.includes(location.hostname)) return;
  try {
    if (!sessionStorage.getItem('langs-counted')) {
      sessionStorage.setItem('langs-counted', '1');
      hit('total');
      hit('d-' + utcDay());
      const tz = tzKey();
      if (tz) hit(tz);
      hit('ui-' + lang);
    }
    if (!localStorage.getItem('langs-seen')) {
      localStorage.setItem('langs-seen', '1');
      hit('uniq');
    }
  } catch { /* приватный режим — просто не считаем */ }
}

// ---------- панель ----------
function statsBars(entries, labelFn, total) {
  if (!entries.length) return '';
  const max = entries[0][1] || 1;
  return `<div class="stat-bars">` + entries.map(([k, v]) => `
    <div class="stat-bar">
      <span class="stat-bar-label">${statsCtx.esc(labelFn(k))}</span>
      <span class="stat-bar-track"><span class="stat-bar-fill" style="width:${Math.max(2, Math.round(v / max * 100))}%"></span></span>
      <span class="stat-bar-value">${statsCtx.esc(statsCtx.fmtFull.format(v))}</span>
    </div>`).join('') + '</div>';
}

function sparkline(days) {
  const entries = Object.entries(days).slice(-30);
  if (!entries.length) return '';
  const max = Math.max(...entries.map(e => e[1])) || 1;
  return `<div class="spark">` + entries.map(([d, v]) =>
    `<span class="spark-bar" style="height:${Math.max(4, Math.round(v / max * 100))}%" title="${statsCtx.esc(d)}: ${statsCtx.esc(statsCtx.fmtFull.format(v))}"></span>`
  ).join('') + '</div>';
}

function cityLabel(tz) {
  const parts = tz.split('/');
  return parts[parts.length - 1].replace(/_/g, ' ');
}

async function renderStats() {
  const { T, esc, tpl, fmtFull } = statsCtx;
  const body = document.getElementById('stats-body');
  const [data, liveTotal, liveToday] = await Promise.all([
    fetch('stats.json').then(r => (r.ok ? r.json() : null)).catch(() => null),
    readCounter('total'),
    readCounter('d-' + utcDay()),
  ]);

  const total = liveTotal !== null ? liveTotal : (data ? data.total : 0);
  const today = liveToday !== null ? liveToday : 0;
  const uniq = data ? data.uniq : 0;

  const cards = `
    <div class="stat-cards">
      <div class="stat-card"><span class="stat-num">${esc(fmtFull.format(total || 0))}</span><span class="stat-cap">${esc(T.statsVisits)}</span></div>
      <div class="stat-card"><span class="stat-num">${esc(fmtFull.format(uniq || 0))}</span><span class="stat-cap">${esc(T.statsUniq)}</span></div>
      <div class="stat-card"><span class="stat-num">${esc(fmtFull.format(today || 0))}</span><span class="stat-cap">${esc(T.statsToday)}</span></div>
    </div>`;

  if (!data || (!data.total && !total)) {
    body.innerHTML = cards + `<p class="cmp-note">${esc(T.statsEmpty)}</p><p class="cmp-note">${esc(T.statsNote)}</p>`;
    return;
  }

  const countries = Object.entries(data.countries || {}).slice(0, 15);
  const cities = Object.entries(data.cities || {}).slice(0, 15);
  const langs = Object.entries(data.langs || {});
  const days = data.days || {};

  body.innerHTML = cards +
    (Object.keys(days).length ? `<h3>${esc(T.statsDays)}</h3>${sparkline(days)}` : '') +
    (countries.length ? `<h3>${esc(T.statsCountries)}</h3>${statsBars(countries, cc => statsCtx.countryName(cc))}` : '') +
    (cities.length ? `<h3>${esc(T.statsCities)}</h3>${statsBars(cities, cityLabel)}` : '') +
    (langs.length ? `<h3>${esc(T.statsLangs)}</h3>${statsBars(langs, l => LOCALE_NAMES[l] || l)}` : '') +
    `<p class="cmp-note">${esc(tpl(T.statsUpdated, { date: (data.generated || '').replace('T', ' ').replace('Z', ' UTC') }))}</p>` +
    `<p class="cmp-note">${esc(T.statsNote)}</p>`;
}

function openStats() {
  document.getElementById('stats').hidden = false;
  if (!statsLoaded) {
    statsLoaded = renderStats().catch(err => {
      document.getElementById('stats-body').innerHTML =
        `<p class="cmp-note">${statsCtx.esc(String(err))}</p>`;
    });
  }
}
function closeStats() {
  document.getElementById('stats').hidden = true;
}

function initAnalytics(ctx) {
  statsCtx = ctx;
  countVisit(ctx.LANG);
  const overlay = document.getElementById('stats');
  document.getElementById('stats-btn').addEventListener('click', openStats);
  document.getElementById('stats-close').addEventListener('click', closeStats);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeStats(); });
}
