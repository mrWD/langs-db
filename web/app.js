/* Языки мира / Languages of the World — interactive atlas.
   Data: Glottolog (CC BY 4.0) + Wikidata (CC0). */
'use strict';

// ---------- i18n ----------
const LOCALES = ['ru', 'en', 'es', 'de', 'fr'];
// column with the localized language name for each UI locale (en uses Glottolog name)
const NAME_COL = { ru: 'nr', en: null, es: 'nes', de: 'nde', fr: 'nfr' };

const I18N = {
  ru: {
    title: 'Языки мира — интерактивный атлас',
    h1: 'Языки мира',
    subtitle: 'Интерактивный атлас: {n} языков — семьи, носители, статус угрозы, карта и материалы для изучения',
    searchPh: 'Поиск: алтайский, ainu, ket, Turkic…',
    regionAll: 'Регион: все', familyAll: 'Семья: все', countryAll: 'Страна: все',
    spkAny: 'Носители: любые', spk5: '> 1 млн', spk4: '100 тыс. – 1 млн', spk3: '10–100 тыс.',
    spk2: '1–10 тыс.', spk1: '< 1 тыс.', spk0: 'нет данных',
    matAny: 'Материалы: любые', matG: 'Есть грамматика', matS: 'Хотя бы очерк грамматики',
    matD: 'Хотя бы тексты / словарь', matN: 'Почти не описан',
    reset: 'Сбросить', statusLabel: 'Статус:', found: 'Найдено: {n}',
    aes: ['Нет данных', 'Вне угрозы', 'Уязвимый', 'Под угрозой', 'Серьёзная угроза', 'На грани исчезновения', 'Вымерший'],
    med: { 0: 'Полная грамматика (300+ стр.)', 1: 'Грамматика', 2: 'Очерк грамматики', 3: 'Фонология, тексты или словарь', 4: 'Список слов или меньше', '-1': 'Нет данных' },
    ma: { 'Eurasia': 'Евразия', 'Africa': 'Африка', 'North America': 'Сев. Америка', 'South America': 'Юж. Америка', 'Papunesia': 'Папунезия', 'Australia': 'Австралия' },
    cat: { L: 'устный язык', S: 'жестовый язык', P: 'пиджин', M: 'смешанный язык' },
    thLang: 'Язык', thFam: 'Семья', thRegion: 'Регион', thSpeakers: 'Носители', thStatus: 'Статус',
    isolate: 'изолят', familyIsolates: 'Изоляты ({n})', cardIsolate: 'Изолят / вне семьи',
    cardFamily: 'Семья', cardType: 'Тип', cardRegion: 'Макрорегион', cardCountries: 'Страны',
    cardSpeakers: 'Носители', cardMed: 'Лучшее описание', noData: 'нет данных',
    cardLinks: 'Материалы и ссылки',
    glottologNote: 'классификация, библиография описаний',
    wikiRu: 'Википедия (рус.)', wikiEn: 'Wikipedia (англ.)', wikiNote: 'обзорная статья',
    olacTitle: 'OLAC — языковые архивы', olacNote: 'записи речи, тексты, учебные материалы',
    ethnologueNote: 'демография и статус (частично платно)',
    elpNote: 'проект документации исчезающих языков',
    footNote: 'Статус — агрегированная шкала AES (Glottolog) по данным ElCat, Ethnologue и UNESCO. Число носителей — Wikidata (P1098); для малых языков может быть устаревшим.',
    verifyNote: 'Данные собраны автоматически и могут содержать неточности — сверяйтесь с первоисточниками.',
    learnTitle: 'Познакомиться с языком',
    glosbeTitle: 'Словарь Glosbe', glosbeNote: 'переводы, примеры, произношение',
    forvoTitle: 'Произношение — Forvo', forvoNote: 'слова, озвученные носителями',
    coursesTitle: 'Найти курсы и уроки', coursesNote: 'поиск в Google',
    coursesQuery: '{name} язык курсы уроки',
    supportLabel: 'Поддержать проект:',
    levelLangs: 'Только языки', levelAll: 'Языки и диалекты',
    dialect: 'диалект', dialectOf: 'диалект языка {name}', dialectsTitle: 'Диалекты ({n})',
    compareBtn: 'Сравнить', compareTitle: 'Сравнение языков',
    comparePick: 'Второй язык: начните вводить название…',
    compareBasic: 'Основные параметры', compareGrammar: 'Грамматика — признаки WALS',
    compareMatches: 'Совпадают {m} из {n} общих признаков',
    compareNoWals: 'Нет типологических данных (WALS): {name}',
    compareLoading: 'Загрузка данных WALS…',
    compareNote: 'Названия признаков — на английском (база WALS). Покрытие неполное: у многих языков описано лишь несколько признаков; для диалектов используются данные родительского языка.',
    footer: 'Данные: {glottolog} (CC BY 4.0) · {wikidata} (CC0) · сборка {date} · статус угрозы — шкала AES (Glottolog: ElCat / Ethnologue / UNESCO)',
    themeTitle: 'Переключить тему', close: 'Закрыть',
  },
  en: {
    title: 'Languages of the World — interactive atlas',
    h1: 'Languages of the World',
    subtitle: 'Interactive atlas: {n} languages — families, speakers, endangerment status, map and learning resources',
    searchPh: 'Search: ainu, ket, Altai, Turkic…',
    regionAll: 'Region: all', familyAll: 'Family: all', countryAll: 'Country: all',
    spkAny: 'Speakers: any', spk5: '> 1 M', spk4: '100 k – 1 M', spk3: '10–100 k',
    spk2: '1–10 k', spk1: '< 1 000', spk0: 'no data',
    matAny: 'Materials: any', matG: 'Has a grammar', matS: 'At least a grammar sketch',
    matD: 'At least texts / dictionary', matN: 'Barely documented',
    reset: 'Reset', statusLabel: 'Status:', found: 'Found: {n}',
    aes: ['No data', 'Not endangered', 'Vulnerable', 'Endangered', 'Severely endangered', 'Critically endangered', 'Extinct'],
    med: { 0: 'Full grammar (300+ pp.)', 1: 'Grammar', 2: 'Grammar sketch', 3: 'Phonology, texts or dictionary', 4: 'Wordlist or less', '-1': 'No data' },
    ma: { 'Eurasia': 'Eurasia', 'Africa': 'Africa', 'North America': 'N. America', 'South America': 'S. America', 'Papunesia': 'Papunesia', 'Australia': 'Australia' },
    cat: { L: 'spoken language', S: 'sign language', P: 'pidgin', M: 'mixed language' },
    thLang: 'Language', thFam: 'Family', thRegion: 'Region', thSpeakers: 'Speakers', thStatus: 'Status',
    isolate: 'isolate', familyIsolates: 'Isolates ({n})', cardIsolate: 'Isolate / unclassified',
    cardFamily: 'Family', cardType: 'Type', cardRegion: 'Macroarea', cardCountries: 'Countries',
    cardSpeakers: 'Speakers', cardMed: 'Best description', noData: 'no data',
    cardLinks: 'Materials & links',
    glottologNote: 'classification, bibliography of descriptions',
    wikiRu: 'Wikipedia (Russian)', wikiEn: 'Wikipedia (English)', wikiNote: 'overview article',
    olacTitle: 'OLAC — language archives', olacNote: 'audio recordings, texts, learning materials',
    ethnologueNote: 'demographics and status (partly paywalled)',
    elpNote: 'documentation project for endangered languages',
    footNote: 'Status is the aggregated AES scale (Glottolog) based on ElCat, Ethnologue and UNESCO. Speaker counts come from Wikidata (P1098) and may be outdated for small languages.',
    verifyNote: 'Data is aggregated automatically and may contain inaccuracies — please verify against the primary sources.',
    learnTitle: 'Get to know the language',
    glosbeTitle: 'Glosbe dictionary', glosbeNote: 'translations, examples, pronunciation',
    forvoTitle: 'Pronunciation — Forvo', forvoNote: 'words spoken by native speakers',
    coursesTitle: 'Find courses & lessons', coursesNote: 'Google search',
    coursesQuery: '{name} language course lessons',
    supportLabel: 'Support the project:',
    levelLangs: 'Languages only', levelAll: 'Languages & dialects',
    dialect: 'dialect', dialectOf: 'dialect of {name}', dialectsTitle: 'Dialects ({n})',
    compareBtn: 'Compare', compareTitle: 'Language comparison',
    comparePick: 'Second language: start typing a name…',
    compareBasic: 'Basic parameters', compareGrammar: 'Grammar — WALS features',
    compareMatches: '{m} of {n} shared features match',
    compareNoWals: 'No typological data (WALS): {name}',
    compareLoading: 'Loading WALS data…',
    compareNote: 'Feature names are in English (WALS database). Coverage is uneven: many languages have only a few coded features; dialects use their parent language’s data.',
    footer: 'Data: {glottolog} (CC BY 4.0) · {wikidata} (CC0) · build {date} · endangerment — AES scale (Glottolog: ElCat / Ethnologue / UNESCO)',
    themeTitle: 'Toggle theme', close: 'Close',
  },
  es: {
    title: 'Lenguas del mundo — atlas interactivo',
    h1: 'Lenguas del mundo',
    subtitle: 'Atlas interactivo: {n} lenguas — familias, hablantes, grado de amenaza, mapa y recursos de aprendizaje',
    searchPh: 'Buscar: ainu, ket, Altai, Turkic…',
    regionAll: 'Región: todas', familyAll: 'Familia: todas', countryAll: 'País: todos',
    spkAny: 'Hablantes: cualquiera', spk5: '> 1 M', spk4: '100 mil – 1 M', spk3: '10–100 mil',
    spk2: '1–10 mil', spk1: '< 1000', spk0: 'sin datos',
    matAny: 'Materiales: cualquiera', matG: 'Con gramática', matS: 'Al menos un esbozo gramatical',
    matD: 'Al menos textos / diccionario', matN: 'Apenas documentada',
    reset: 'Restablecer', statusLabel: 'Estado:', found: 'Encontradas: {n}',
    aes: ['Sin datos', 'No amenazada', 'Vulnerable', 'Amenazada', 'Seriamente amenazada', 'En peligro crítico', 'Extinta'],
    med: { 0: 'Gramática completa (300+ págs.)', 1: 'Gramática', 2: 'Esbozo gramatical', 3: 'Fonología, textos o diccionario', 4: 'Lista de palabras o menos', '-1': 'Sin datos' },
    ma: { 'Eurasia': 'Eurasia', 'Africa': 'África', 'North America': 'América del Norte', 'South America': 'América del Sur', 'Papunesia': 'Papunesia', 'Australia': 'Australia' },
    cat: { L: 'lengua hablada', S: 'lengua de señas', P: 'pidgin', M: 'lengua mixta' },
    thLang: 'Lengua', thFam: 'Familia', thRegion: 'Región', thSpeakers: 'Hablantes', thStatus: 'Estado',
    isolate: 'aislada', familyIsolates: 'Lenguas aisladas ({n})', cardIsolate: 'Lengua aislada / sin clasificar',
    cardFamily: 'Familia', cardType: 'Tipo', cardRegion: 'Macroárea', cardCountries: 'Países',
    cardSpeakers: 'Hablantes', cardMed: 'Mejor descripción', noData: 'sin datos',
    cardLinks: 'Materiales y enlaces',
    glottologNote: 'clasificación, bibliografía de descripciones',
    wikiRu: 'Wikipedia (ruso)', wikiEn: 'Wikipedia (inglés)', wikiNote: 'artículo general',
    olacTitle: 'OLAC — archivos lingüísticos', olacNote: 'grabaciones, textos, materiales de aprendizaje',
    ethnologueNote: 'demografía y estado (parcialmente de pago)',
    elpNote: 'proyecto de documentación de lenguas amenazadas',
    footNote: 'El estado es la escala agregada AES (Glottolog) basada en ElCat, Ethnologue y UNESCO. El número de hablantes proviene de Wikidata (P1098) y puede estar desactualizado.',
    verifyNote: 'Los datos se recopilan automáticamente y pueden contener errores — verifíquelos en las fuentes primarias.',
    learnTitle: 'Conocer la lengua',
    glosbeTitle: 'Diccionario Glosbe', glosbeNote: 'traducciones, ejemplos, pronunciación',
    forvoTitle: 'Pronunciación — Forvo', forvoNote: 'palabras pronunciadas por hablantes nativos',
    coursesTitle: 'Buscar cursos y lecciones', coursesNote: 'búsqueda en Google',
    coursesQuery: 'curso de {name} lecciones',
    supportLabel: 'Apoyar el proyecto:',
    levelLangs: 'Solo lenguas', levelAll: 'Lenguas y dialectos',
    dialect: 'dialecto', dialectOf: 'dialecto de {name}', dialectsTitle: 'Dialectos ({n})',
    compareBtn: 'Comparar', compareTitle: 'Comparación de lenguas',
    comparePick: 'Segunda lengua: escriba un nombre…',
    compareBasic: 'Parámetros básicos', compareGrammar: 'Gramática — rasgos WALS',
    compareMatches: 'Coinciden {m} de {n} rasgos comunes',
    compareNoWals: 'Sin datos tipológicos (WALS): {name}',
    compareLoading: 'Cargando datos WALS…',
    compareNote: 'Los nombres de los rasgos están en inglés (base WALS). La cobertura es desigual: muchas lenguas tienen pocos rasgos codificados; los dialectos usan los datos de su lengua matriz.',
    footer: 'Datos: {glottolog} (CC BY 4.0) · {wikidata} (CC0) · compilación {date} · amenaza — escala AES (Glottolog: ElCat / Ethnologue / UNESCO)',
    themeTitle: 'Cambiar tema', close: 'Cerrar',
  },
  de: {
    title: 'Sprachen der Welt — interaktiver Atlas',
    h1: 'Sprachen der Welt',
    subtitle: 'Interaktiver Atlas: {n} Sprachen — Familien, Sprecher, Gefährdungsstatus, Karte und Lernmaterialien',
    searchPh: 'Suche: ainu, ket, Altai, Turkic…',
    regionAll: 'Region: alle', familyAll: 'Familie: alle', countryAll: 'Land: alle',
    spkAny: 'Sprecher: beliebig', spk5: '> 1 Mio.', spk4: '100 Tsd. – 1 Mio.', spk3: '10–100 Tsd.',
    spk2: '1–10 Tsd.', spk1: '< 1000', spk0: 'keine Daten',
    matAny: 'Materialien: beliebig', matG: 'Grammatik vorhanden', matS: 'Mindestens Grammatikskizze',
    matD: 'Mindestens Texte / Wörterbuch', matN: 'Kaum dokumentiert',
    reset: 'Zurücksetzen', statusLabel: 'Status:', found: 'Gefunden: {n}',
    aes: ['Keine Daten', 'Nicht gefährdet', 'Verwundbar', 'Gefährdet', 'Ernsthaft gefährdet', 'Vom Aussterben bedroht', 'Ausgestorben'],
    med: { 0: 'Vollständige Grammatik (300+ S.)', 1: 'Grammatik', 2: 'Grammatikskizze', 3: 'Phonologie, Texte oder Wörterbuch', 4: 'Wortliste oder weniger', '-1': 'Keine Daten' },
    ma: { 'Eurasia': 'Eurasien', 'Africa': 'Afrika', 'North America': 'Nordamerika', 'South America': 'Südamerika', 'Papunesia': 'Papunesien', 'Australia': 'Australien' },
    cat: { L: 'gesprochene Sprache', S: 'Gebärdensprache', P: 'Pidgin', M: 'Mischsprache' },
    thLang: 'Sprache', thFam: 'Familie', thRegion: 'Region', thSpeakers: 'Sprecher', thStatus: 'Status',
    isolate: 'isoliert', familyIsolates: 'Isolierte Sprachen ({n})', cardIsolate: 'Isolierte Sprache / nicht klassifiziert',
    cardFamily: 'Familie', cardType: 'Typ', cardRegion: 'Makroregion', cardCountries: 'Länder',
    cardSpeakers: 'Sprecher', cardMed: 'Beste Beschreibung', noData: 'keine Daten',
    cardLinks: 'Materialien & Links',
    glottologNote: 'Klassifikation, Bibliographie der Beschreibungen',
    wikiRu: 'Wikipedia (Russisch)', wikiEn: 'Wikipedia (Englisch)', wikiNote: 'Übersichtsartikel',
    olacTitle: 'OLAC — Spracharchive', olacNote: 'Tonaufnahmen, Texte, Lernmaterialien',
    ethnologueNote: 'Demografie und Status (teilweise kostenpflichtig)',
    elpNote: 'Dokumentationsprojekt für bedrohte Sprachen',
    footNote: 'Der Status ist die aggregierte AES-Skala (Glottolog) auf Basis von ElCat, Ethnologue und UNESCO. Sprecherzahlen stammen aus Wikidata (P1098) und können veraltet sein.',
    verifyNote: 'Die Daten werden automatisch zusammengetragen und können Fehler enthalten — bitte anhand der Primärquellen prüfen.',
    learnTitle: 'Die Sprache kennenlernen',
    glosbeTitle: 'Glosbe-Wörterbuch', glosbeNote: 'Übersetzungen, Beispiele, Aussprache',
    forvoTitle: 'Aussprache — Forvo', forvoNote: 'von Muttersprachlern gesprochene Wörter',
    coursesTitle: 'Kurse und Lektionen finden', coursesNote: 'Google-Suche',
    coursesQuery: '{name} Sprachkurs lernen',
    supportLabel: 'Projekt unterstützen:',
    levelLangs: 'Nur Sprachen', levelAll: 'Sprachen & Dialekte',
    dialect: 'Dialekt', dialectOf: 'Dialekt von {name}', dialectsTitle: 'Dialekte ({n})',
    compareBtn: 'Vergleichen', compareTitle: 'Sprachvergleich',
    comparePick: 'Zweite Sprache: Namen eingeben…',
    compareBasic: 'Grundparameter', compareGrammar: 'Grammatik — WALS-Merkmale',
    compareMatches: '{m} von {n} gemeinsamen Merkmalen stimmen überein',
    compareNoWals: 'Keine typologischen Daten (WALS): {name}',
    compareLoading: 'WALS-Daten werden geladen…',
    compareNote: 'Merkmalsnamen sind auf Englisch (WALS-Datenbank). Die Abdeckung ist ungleichmäßig: viele Sprachen haben nur wenige kodierte Merkmale; Dialekte nutzen die Daten ihrer Muttersprache.',
    footer: 'Daten: {glottolog} (CC BY 4.0) · {wikidata} (CC0) · Stand {date} · Gefährdung — AES-Skala (Glottolog: ElCat / Ethnologue / UNESCO)',
    themeTitle: 'Thema wechseln', close: 'Schließen',
  },
  fr: {
    title: 'Langues du monde — atlas interactif',
    h1: 'Langues du monde',
    subtitle: 'Atlas interactif : {n} langues — familles, locuteurs, degré de menace, carte et ressources d’apprentissage',
    searchPh: 'Rechercher : ainu, ket, Altai, Turkic…',
    regionAll: 'Région : toutes', familyAll: 'Famille : toutes', countryAll: 'Pays : tous',
    spkAny: 'Locuteurs : tous', spk5: '> 1 M', spk4: '100 k – 1 M', spk3: '10–100 k',
    spk2: '1–10 k', spk1: '< 1000', spk0: 'aucune donnée',
    matAny: 'Matériaux : tous', matG: 'Grammaire disponible', matS: 'Au moins une esquisse grammaticale',
    matD: 'Au moins textes / dictionnaire', matN: 'À peine documentée',
    reset: 'Réinitialiser', statusLabel: 'Statut :', found: 'Trouvées : {n}',
    aes: ['Aucune donnée', 'Non menacée', 'Vulnérable', 'Menacée', 'Sérieusement menacée', 'En danger critique', 'Éteinte'],
    med: { 0: 'Grammaire complète (300+ p.)', 1: 'Grammaire', 2: 'Esquisse grammaticale', 3: 'Phonologie, textes ou dictionnaire', 4: 'Liste de mots ou moins', '-1': 'Aucune donnée' },
    ma: { 'Eurasia': 'Eurasie', 'Africa': 'Afrique', 'North America': 'Amérique du Nord', 'South America': 'Amérique du Sud', 'Papunesia': 'Papunésie', 'Australia': 'Australie' },
    cat: { L: 'langue parlée', S: 'langue des signes', P: 'pidgin', M: 'langue mixte' },
    thLang: 'Langue', thFam: 'Famille', thRegion: 'Région', thSpeakers: 'Locuteurs', thStatus: 'Statut',
    isolate: 'isolat', familyIsolates: 'Isolats ({n})', cardIsolate: 'Isolat / non classée',
    cardFamily: 'Famille', cardType: 'Type', cardRegion: 'Macro-aire', cardCountries: 'Pays',
    cardSpeakers: 'Locuteurs', cardMed: 'Meilleure description', noData: 'aucune donnée',
    cardLinks: 'Matériaux et liens',
    glottologNote: 'classification, bibliographie des descriptions',
    wikiRu: 'Wikipédia (russe)', wikiEn: 'Wikipédia (anglais)', wikiNote: 'article général',
    olacTitle: 'OLAC — archives linguistiques', olacNote: 'enregistrements, textes, matériaux d’apprentissage',
    ethnologueNote: 'démographie et statut (en partie payant)',
    elpNote: 'projet de documentation des langues menacées',
    footNote: 'Le statut est l’échelle agrégée AES (Glottolog), fondée sur ElCat, Ethnologue et l’UNESCO. Le nombre de locuteurs provient de Wikidata (P1098) et peut être obsolète.',
    verifyNote: 'Les données sont agrégées automatiquement et peuvent contenir des erreurs — vérifiez-les auprès des sources primaires.',
    learnTitle: 'Découvrir la langue',
    glosbeTitle: 'Dictionnaire Glosbe', glosbeNote: 'traductions, exemples, prononciation',
    forvoTitle: 'Prononciation — Forvo', forvoNote: 'mots prononcés par des locuteurs natifs',
    coursesTitle: 'Trouver des cours et leçons', coursesNote: 'recherche Google',
    coursesQuery: 'cours de {name} leçons',
    supportLabel: 'Soutenir le projet :',
    levelLangs: 'Langues seulement', levelAll: 'Langues et dialectes',
    dialect: 'dialecte', dialectOf: 'dialecte de {name}', dialectsTitle: 'Dialectes ({n})',
    compareBtn: 'Comparer', compareTitle: 'Comparaison de langues',
    comparePick: 'Deuxième langue : saisissez un nom…',
    compareBasic: 'Paramètres de base', compareGrammar: 'Grammaire — traits WALS',
    compareMatches: '{m} des {n} traits communs concordent',
    compareNoWals: 'Pas de données typologiques (WALS) : {name}',
    compareLoading: 'Chargement des données WALS…',
    compareNote: 'Les noms des traits sont en anglais (base WALS). La couverture est inégale : beaucoup de langues n’ont que quelques traits codés ; les dialectes utilisent les données de leur langue mère.',
    footer: 'Données : {glottolog} (CC BY 4.0) · {wikidata} (CC0) · version {date} · menace — échelle AES (Glottolog : ElCat / Ethnologue / UNESCO)',
    themeTitle: 'Changer de thème', close: 'Fermer',
  },
};

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
const tpl = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

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
  document.documentElement.lang = LANG;
  document.title = T.title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = T.subtitle.replace('{n}', '8000');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = T[el.dataset.i18n] ?? el.textContent; });
  document.getElementById('search').placeholder = T.searchPh;
  const theme = document.getElementById('theme-toggle');
  theme.title = T.themeTitle;
  theme.setAttribute('aria-label', T.themeTitle);
  document.getElementById('detail-close').setAttribute('aria-label', T.close);
  const sel = document.getElementById('lang-select');
  sel.value = LANG;
  sel.addEventListener('change', () => {
    localStorage.setItem('langs-ui', sel.value);
    location.reload();
  });
}

// ---------- state ----------
let ROWS = [];
let byId = new Map();      // glottocode -> row
let childrenOf = new Map(); // language glottocode -> [dialect rows]
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

// базовый / наведённый / выбранный стили маркера (диалекты — мельче)
let selectedIdx = null;
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
  const r = ROWS[i];
  return i === selectedIdx ? selectedStyle(r) : baseStyle(r);
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
        `<strong>${esc(r.label)}</strong><br><span class="tip-sub">${esc(r.fam || T.isolate)} · ${esc(T.aes[r.aes])}</span>`,
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
  // with a small result set, bring the map to it
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

  const lvl = els.lvl.value;
  filtered = ROWS.filter(r => {
    if (lvl !== 'all' && r.par) return false;
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
  els.count.textContent = tpl(T.found, { n: fmtFull.format(filtered.length) });
}

function sortFiltered() {
  const k = sortKey, d = sortDir;
  filtered.sort((a, b) => {
    let va, vb;
    if (k === 'name') { return d * collator.compare(a.label, b.label); }
    if (k === 'fam') { va = a.fam || '￿'; vb = b.fam || '￿'; return d * collator.compare(va, vb); }
    if (k === 'ma') { return d * collator.compare(maName(a.ma), maName(b.ma)); }
    if (k === 'aes') {
      va = a.aes === 0 ? 7 : a.aes; vb = b.aes === 0 ? 7 : b.aes;
      return d * (va - vb) || collator.compare(a.label, b.label);
    }
    // spk: nulls always last regardless of direction
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
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const cmp = document.getElementById('compare');
  if (!cmp.hidden) closeCompare();
  else closeDetail();
});

// переходы по карточкам (родитель ↔ диалекты) и кнопка сравнения
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
  // диалект открыт, а диалекты скрыты фильтром — включаем их
  if (r.par && els.lvl.value !== 'all') {
    els.lvl.value = 'all';
    applyFilters();
  }
  selectMarker(r.idx);
  history.replaceState(null, '', '#l=' + r.id);
  document.querySelectorAll('tbody tr.selected').forEach(tr => tr.classList.remove('selected'));
  const tr = els.body.querySelector(`tr[data-id="${r.id}"]`);
  if (tr) tr.classList.add('selected');

  const parent = r.par ? byId.get(r.par) : null;
  const dialects = childrenOf.get(r.id) || [];
  const countries = r.ccList.length ? r.ccList.map(countryName).join(', ') : '—';

  // практические ссылки: словарь, произношение, курсы
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
    ${dialects.length ? `
    <h3>${esc(tpl(T.dialectsTitle, { n: fmtFull.format(dialects.length) }))}</h3>
    <div class="dial-chips">${dialects.map(d =>
      `<a href="#l=${esc(d.id)}" data-open="${esc(d.id)}">${esc(d.label)}</a>`).join('')}</div>` : ''}
    <h3>${esc(T.learnTitle)}</h3>
    <ul class="links">${learn.join('')}</ul>
    <h3>${esc(T.cardLinks)}</h3>
    <ul class="links">${links.join('')}</ul>
    <p class="foot-note">${esc(T.footNote)} ${esc(T.verifyNote)}</p>`;
  detail.hidden = false;

  if (fly && r.lat !== null && map) {
    const z = Math.max(map.getZoom(), 5);
    let center = L.latLng(r.lat, r.lon);
    // на десктопе карточка накрывает правую часть карты — целимся левее,
    // чтобы выбранный маркер остался на виду
    if (window.innerWidth > 900) {
      const px = map.project(center, z).add([Math.min(430, window.innerWidth * 0.92) / 2, 0]);
      center = map.unproject(px, z);
    }
    map.flyTo(center, z, { duration: 0.8 });
  }
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
  if (!walsPromise) {
    walsPromise = fetch('wals.json').then(resp => resp.json());
  }
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
    if (r.id !== cmpA.id && r.search.includes(q)) {
      found.push(r);
      if (found.length >= 12) break;
    }
  }
  cmpEls.results.innerHTML = found.map(r =>
    `<button data-id="${esc(r.id)}"><strong>${esc(r.label)}</strong> <span>${esc(r.par ? tpl(T.dialectOf, { name: byId.get(r.par)?.label || '' }) : r.fam || T.isolate)}</span></button>`).join('');
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
    <table class="cmp-table">
      ${cmpBasicRow(T.cardFamily, va.fam, vb.fam)}
      ${cmpBasicRow(T.cardType, va.type, vb.type)}
      ${cmpBasicRow(T.cardRegion, va.ma, vb.ma)}
      ${cmpBasicRow(T.cardCountries, va.cc, vb.cc)}
      ${cmpBasicRow(T.cardSpeakers, va.spk, vb.spk)}
      ${cmpBasicRow(T.thStatus, va.aes, vb.aes)}
      ${cmpBasicRow(T.cardMed, va.med, vb.med)}
    </table>`;
  cmpEls.body.innerHTML = head + basic + `<h3>${esc(T.compareGrammar)}</h3><p class="cmp-note">${esc(T.compareLoading)}</p>`;

  const wals = await loadWals();
  if (cmpA !== a || cmpB !== b) return; // пока грузилось, выбрали другое
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
         <table class="cmp-table">${rows}</table>`
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
  // macroareas (a language may span several, ';'-separated)
  const mas = [...new Set(ROWS.flatMap(r => r.maList))].filter(Boolean).sort();
  els.ma.innerHTML = `<option value="">${esc(T.regionAll)}</option>` +
    mas.map(m => `<option value="${esc(m)}">${esc(T.ma[m] || m)}</option>`).join('');

  // families by size
  const famCount = new Map();
  for (const r of ROWS) famCount.set(r.fam, (famCount.get(r.fam) || 0) + 1);
  const fams = [...famCount.entries()].filter(([f]) => f).sort((a, b) => b[1] - a[1]);
  els.fam.innerHTML = `<option value="">${esc(T.familyAll)}</option>` +
    fams.map(([f, n]) => `<option value="${esc(f)}">${esc(f)} (${n})</option>`).join('') +
    `<option value="__isolate__">${esc(tpl(T.familyIsolates, { n: famCount.get('') || 0 }))}</option>`;

  // countries sorted by localized name
  const ccCount = new Map();
  for (const r of ROWS) for (const c of r.ccList) ccCount.set(c, (ccCount.get(c) || 0) + 1);
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
  const nameCol = NAME_COL[LANG];
  ROWS = data.rows.map((row, i) => {
    const r = {
      id: row[idx.id], name: row[idx.name], nr: row[idx.nr], nes: row[idx.nes],
      nde: row[idx.nde], nfr: row[idx.nfr], iso: row[idx.iso],
      fam: row[idx.fam], ma: row[idx.ma], lat: row[idx.lat], lon: row[idx.lon],
      cc: row[idx.cc], aes: row[idx.aes], med: row[idx.med],
      spk: row[idx.spk] === undefined || row[idx.spk] === null ? null : row[idx.spk],
      cat: row[idx.cat], wr: row[idx.wr], we: row[idx.we], par: row[idx.par] || '', idx: i,
    };
    r.ccList = r.cc ? r.cc.split(';') : [];
    r.maList = r.ma ? r.ma.split(';') : [];
    const localized = nameCol ? r[nameCol] : '';
    r.label = localized || r.name;
    r.sub = localized && localized.toLowerCase() !== r.name.toLowerCase() ? r.name : '';
    r.search = `${r.name}|${r.nr}|${r.nes}|${r.nde}|${r.nfr}|${r.iso}|${r.id}|${r.fam}`.toLowerCase();
    return r;
  });
  byId = new Map(ROWS.map(r => [r.id, r]));
  childrenOf = new Map();
  for (const r of ROWS) {
    if (!r.par) continue;
    if (!childrenOf.has(r.par)) childrenOf.set(r.par, []);
    childrenOf.get(r.par).push(r);
    const p = byId.get(r.par);
    if (p) {
      // у диалекта подпись «диалект языка X»; родитель ищется и по именам диалектов
      r.sub = tpl(T.dialectOf, { name: p.label });
      r.search += `|${p.name}|${p[nameCol || 'name'] || ''}`.toLowerCase();
    }
  }

  const nLangs = ROWS.reduce((n, r) => n + (r.par ? 0 : 1), 0);
  document.getElementById('subtitle').textContent = tpl(T.subtitle, { n: fmtFull.format(nLangs) });
  const credits = tpl(esc(T.footer), {
    glottolog: '<a href="https://glottolog.org" target="_blank" rel="noopener">Glottolog 5.x</a>',
    wikidata: '<a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>',
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
    const b = c[2] ? byId.get(c[2]) : null;
    if (a) openCompare(a, b);
  }
}

boot().catch(err => {
  document.getElementById('result-count').textContent = 'Data load error: ' + err.message;
  console.error(err);
});
