// De landingspagina's: wat een zoekmachine, een taalmodel en een bezoeker
// eraan hebben.
//
// Zeven talen uit één generator (scripts/maak-site.mjs). Wat hier vastligt is
// wat stilletjes kapot kan gaan zonder dat iemand het ziet:
//
//   1. De generator is gedraaid: wat in de repo staat is wat hij nu maakt.
//   2. Per pagina: de juiste taal, een titel en omschrijving van een lengte
//      die een zoekmachine niet afkapt, één h1, een canonical naar zichzelf,
//      en hreflang naar álle zeven plus x-default. Wederkerig, want een
//      hreflang die maar één kant op wijst negeert Google.
//   3. De gestructureerde gegevens zijn geldige JSON, en de FAQ daarin is
//      woord voor woord de FAQ op het scherm. Google eist dat; een FAQPage
//      die iets anders zegt dan de pagina is een reden om hem te negeren.
//   4. De punten op de pagina zijn de punten in de app.
//   5. Niets van buiten: geen lettertypen van Google, geen analytics. En
//      geen 404 op een plaatje, lettertype of link.
//   6. Leesbaar: contrast in licht en donker, en op een telefoon geen
//      horizontale scroll.
//   7. sitemap.xml, robots.txt, llms.txt en 404.html kloppen met de pagina's.
//   8. De app zelf staat op noindex, de landingspagina's niet.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startSite, wortel, gepubliceerd, UITGESLOTEN } from './hulp.mjs';
import { teksten, TALEN, STANDAARD, BASIS } from '../site/teksten.mjs';
import { PRIVACY } from '../site/privacy.mjs';
import { PAGINAS } from '../site/paginas.mjs';
import { knipUit } from '../scripts/knipsel.mjs';

const { check, afronden } = maakControle('de landingspagina in zeven talen');

// ---- 1. de generator ----------------------------------------------------------
{
  let ok = true, uit = '';
  try { uit = execFileSync(process.execPath, [join(wortel, 'scripts', 'maak-site.mjs'), '--controle'],
    { encoding: 'utf8', stdio: 'pipe' }); }
  catch (e) { ok = false; uit = String(e.stderr || e.message); }
  check('wat in de repo staat is wat de generator nu maakt', ok, uit.trim());
}

// ---- 1b. wat GitHub Pages publiceert ---------------------------------------------
// GitHub Pages haalt de repo door Jekyll, en die maakte van elk .md-bestand een
// pagina op het domein: ROUTEKAART, OVERDRACHT, BEDIENING, test/LEESMIJ. Plus
// de tests, scripts en SQL als losse bestanden. _config.yml sluit ze uit.
//
// Hier staat nog een keer, los van _config.yml, wat intern is. De twee moeten
// precies overeenkomen: een nieuw document dat niet onder de uitsluiting valt,
// zakt hier, en een patroon dat te veel pakt (een lettertype, een plaatje van
// de voorpagina) ook. De testservers passen dezelfde uitsluiting toe.
{
  const INTERN = (p) => /\.(md|sql)$/.test(p) || /^(docs|test|scripts|site\/bron)\//.test(p)
    || /^site\/[^/]+\.(mjs|json)$/.test(p) || /(^|\/)[._]/.test(p) || /^(CNAME|node_modules)(\/|$)/.test(p);
  const bestanden = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: wortel, encoding: 'utf8' }).split('\n').filter(Boolean);
  const mis = bestanden.filter((p) => gepubliceerd(p) === INTERN(p));
  check('GitHub Pages publiceert de site en niets van de interne bestanden',
    bestanden.length > 100 && mis.length === 0,
    mis.slice(0, 5).map((p) => `${p} ${gepubliceerd(p) ? 'staat online' : 'valt weg'}`).join(' | ')
      || `${bestanden.filter(gepubliceerd).length} van ${bestanden.length} online`);
  const md = bestanden.filter((p) => p.endsWith('.md'));
  check('elk .md-bestand blijft van het domein af, ook een nieuw',
    md.length >= 5 && md.every((p) => !gepubliceerd(p)) && !gepubliceerd('docs/zoekplan/nieuw.md')
      && !gepubliceerd('iets-nieuws.md'),
    md.join(' '));
  check('en de plaatjes van de voorpagina blijven er wel',
    ['site/og/og-nl.jpg', 'site/beeld/stand-nl-licht.jpg'].every(gepubliceerd), UITGESLOTEN.join(', '));
}

const urlVan = (c) => `${BASIS}/${teksten[c].pad ? teksten[c].pad + '/' : ''}`;
const vul = (tekst, vars) => String(tekst).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
const lokaal = (url) => join(wortel, url.replace(BASIS + '/', '').replace(/\/$/, '/index.html'));
const appBron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
const puntenApp = Object.fromEntries([...appBron.matchAll(
  /\{ id:'([a-z0-9_]+)',\s*naam:'[^']*',\s*punten:(\d+)/g)].map((m) => [m[1], Number(m[2])]));

// De WCAG-formule, met doorzichtige vlakken opgeteld bij wat eronder ligt (zie
// test/toegankelijkheid.test.mjs voor waarom).
const CONTRAST = () => {
  const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = (k) => 0.2126 * lin(k.r) + 0.7152 * lin(k.g) + 0.0722 * lin(k.b);
  const achter = (el) => {
    const lagen = [];
    for (let n = el; n; n = n.parentElement) {
      const k = rgba(getComputedStyle(n).backgroundColor);
      if (k.a > 0) lagen.push(k);
      if (k.a >= 1) break;
    }
    let onder = lagen.length && lagen[lagen.length - 1].a >= 1 ? lagen.pop() : rgba(getComputedStyle(document.body).backgroundColor);
    while (lagen.length) { const k = lagen.pop();
      onder = { r: k.r * k.a + onder.r * (1 - k.a), g: k.g * k.a + onder.g * (1 - k.a), b: k.b * k.a + onder.b * (1 - k.a), a: 1 }; }
    return onder;
  };
  const uit = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!['summary'].includes(el.tagName.toLowerCase()) && el.closest('details:not([open])') && !el.closest('summary')) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || !el.getBoundingClientRect().width) continue;
    if (el.closest('.alleenlezer')) continue;
    const a = lum(rgba(s.color)), b = lum(achter(el));
    const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const groot = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
    if (r < (groot ? 3 : 4.5)) uit.push(`${el.className || el.tagName} "${el.textContent.trim().slice(0, 20)}" ${r.toFixed(2)}`);
  }
  return [...new Set(uit)];
};

const { page, context, url, extern, jsFouten, stoppen } = await startSite();
const fouten404 = [];
page.on('response', (r) => { if (r.status() >= 400) fouten404.push(`${r.status()} ${r.url()}`); });

const clusters = new Map();
for (const code of TALEN) {
  const t = teksten[code];
  const pad = t.pad ? `${t.pad}/` : '';
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(url + pad);
  await page.waitForLoadState('networkidle');

  const kop = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    titel: document.title,
    ogTitel: document.querySelector('meta[property="og:title"]')?.content ?? '',
    omschrijving: document.querySelector('meta[name="description"]')?.content ?? '',
    canonical: document.querySelector('link[rel="canonical"]')?.href ?? '',
    h1: document.querySelectorAll('h1').length,
    robots: document.querySelector('meta[name="robots"]')?.content ?? '',
    hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
      .map((l) => `${l.hreflang}=${l.href}`).sort(),
    og: document.querySelector('meta[property="og:image"]')?.content ?? '',
    ogLocale: document.querySelector('meta[property="og:locale"]')?.content ?? '',
    ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    faq: [...document.querySelectorAll('.faq details')].map((d) => ({
      vraag: d.querySelector('summary').textContent.trim(), antwoord: d.querySelector('p').textContent.trim() })),
    stappen: [...document.querySelectorAll('.stappen h3')].map((h) => h.textContent.trim()),
    tabellen: [...document.querySelectorAll('#punten table')].map((t) =>
      [...t.querySelectorAll('tbody tr')].map((r) => r.lastElementChild.textContent.trim())),
    links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    beelden: [...document.querySelectorAll('img')].map((i) => ({ src: i.currentSrc || i.src, alt: i.getAttribute('alt') })),
    niveaus: [...document.querySelectorAll('#niveaus .niveau')].map((n) => ({
      naam: n.querySelector('h3').textContent.trim(),
      aantal: Number(n.querySelector('.aantal b').textContent),
      chips: n.querySelectorAll('.chips li').length,
      lampen: n.querySelectorAll('.lampen i.aan').length,
      weekend: n.querySelector('.weekend').textContent.trim(),
      badge: !!n.querySelector('.badge'),
    })),
    niveauKop: document.querySelector('#niveaus h2')?.textContent.trim() ?? '',
    niveauIntro: document.querySelector('#niveaus .inleiding')?.textContent.trim() ?? '',
  }));

  check(`${code}: de pagina zegt dat hij in het ${t.naam} is`, kop.lang === code, kop.lang);
  check(`${code}: titel van 30 tot 65 tekens`, kop.titel.length >= 30 && kop.titel.length <= 65,
    `${kop.titel.length}: ${kop.titel}`);
  // Google zet de sitenaam al apart boven het resultaat, en een merk dat nog
  // niemand kent trekt minder klikken dan de zoekterm zelf. Dus de zoekterm
  // vooraan (F1-poule, Tippspiel, porra ...), het merk achteraan. Zonder
  // streepjes: een dubbele punt of een verticale streep.
  check(`${code}: de titel begint met de zoekterm en eindigt met het merk`,
    kop.titel.endsWith(' | Predict the Race') && !kop.titel.startsWith('Predict')
      && ![kop.titel, kop.ogTitel].some((x) => /[–—]/.test(x)) && kop.ogTitel.startsWith('Predict the Race'),
    `${kop.titel} · ${kop.ogTitel}`);
  check(`${code}: omschrijving van 110 tot 165 tekens`, kop.omschrijving.length >= 110 && kop.omschrijving.length <= 165,
    `${kop.omschrijving.length}`);
  check(`${code}: precies één h1`, kop.h1 === 1, String(kop.h1));
  check(`${code}: canonical naar zichzelf`, kop.canonical === urlVan(code), kop.canonical);
  check(`${code}: mag geïndexeerd worden`, /index/.test(kop.robots) && !/noindex/.test(kop.robots), kop.robots);
  const verwacht = [...TALEN.map((c) => `${c}=${urlVan(c)}`), `x-default=${urlVan(STANDAARD)}`].sort();
  check(`${code}: hreflang naar alle zeven en x-default`, JSON.stringify(kop.hreflang) === JSON.stringify(verwacht),
    kop.hreflang.join(' '));
  clusters.set(code, kop.hreflang.join('|'));
  check(`${code}: het deelplaatje bestaat`, kop.og.startsWith(BASIS) && existsSync(lokaal(kop.og)), kop.og);
  check(`${code}: og:locale ${t.locale}`, kop.ogLocale === t.locale, kop.ogLocale);

  // De gestructureerde gegevens.
  let graaf = [];
  try { graaf = kop.ld.flatMap((s) => JSON.parse(s)['@graph'] ?? []); } catch (e) { graaf = []; }
  const soort = (s) => graaf.find((x) => x['@type'] === s);
  check(`${code}: JSON-LD is geldig en heeft WebApplication, FAQPage, HowTo en WebPage`,
    ['WebApplication', 'FAQPage', 'HowTo', 'WebPage', 'WebSite', 'Organization'].every(soort),
    graaf.map((x) => x['@type']).join(', '));
  const ldFaq = (soort('FAQPage')?.mainEntity ?? []).map((q) => ({ vraag: q.name, antwoord: q.acceptedAnswer?.text }));
  check(`${code}: de FAQ in de JSON-LD is woord voor woord de FAQ op het scherm`,
    ldFaq.length >= 8 && JSON.stringify(ldFaq) === JSON.stringify(kop.faq),
    `${ldFaq.length} tegen ${kop.faq.length}`);
  check(`${code}: de HowTo-stappen zijn de stappen op het scherm`,
    JSON.stringify((soort('HowTo')?.step ?? []).map((s) => s.name)) === JSON.stringify(kop.stappen));
  check(`${code}: de site heeft ook zijn andere namen, voor de sitenaam in de zoekresultaten`,
    ['WebSite', 'Organization'].every((type) => JSON.stringify(soort(type)?.alternateName)
      === JSON.stringify(['PredictTheRace', new URL(BASIS).host])),
    JSON.stringify(soort('WebSite')?.alternateName));
  check(`${code}: de app heet gratis`, soort('WebApplication')?.offers?.price === '0'
    && soort('WebApplication')?.isAccessibleForFree === true);

  // De punten zijn die van de app.
  const [plek, losse, seizoen] = kop.tabellen;
  const LOSSE = ['winnaar', 'pole', 'snelste_ronde', 'snelste_pitstop', 'teamgenoot_duels', 'safety_cars', 'rode_vlag', 'sprint_top10'];
  const SEIZOEN = ['kampioen', 'constructeur', 'winnaars', 'vierde_team'];
  check(`${code}: de puntentabel is 5, 3, 1, 0`, (plek ?? []).join() === '5,3,1,0', (plek ?? []).join());
  check(`${code}: de losse vragen en seizoensvragen geven de punten uit de app`,
    (losse ?? []).join() === LOSSE.map((id) => puntenApp[id]).join()
    && (seizoen ?? []).join() === SEIZOEN.map((id) => puntenApp[id]).join(),
    `${(losse ?? []).join()} | ${(seizoen ?? []).join()}`);

  // De niveaus: "de uitgebreidste F1-poule, of de simpelste". Hoeveel vragen
  // en punten elk niveau heeft komt uit de presets van de app, en het getal in
  // de inleiding ("veertien vragen") moet daar ook bij kloppen.
  {
    const preset = (naam) => [...appBron.match(new RegExp(`${naam}:\\s*\\{[^}]*?vragen:\\[([^\\]]*)\\]`))[1]
      .matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
    const vragen = ['simpel', 'klassiek', 'gevorderd'].map(preset);
    const weekend = (ids) => ids.filter((id) => !['sprint_top10', 'kampioen', 'constructeur', 'winnaars', 'vierde_team']
      .includes(id)).reduce((n, id) => n + puntenApp[id], 0);
    const n = kop.niveaus;
    check(`${code}: drie niveaus, met zoveel vragen als de presets in de app`,
      n.length === 3 && n.every((x, i) => x.aantal === vragen[i].length && x.chips === vragen[i].length),
      JSON.stringify(n.map((x) => [x.naam, x.aantal, x.chips])));
    check(`${code}: met de punten per weekend uit de app`,
      n.every((x, i) => x.weekend.startsWith(vul(t.niveaus.perWeekend, { n: weekend(vragen[i]) }))),
      n.map((x) => x.weekend).join(' | '));
    check(`${code}: startlichten 1, 3 en 5, en het uitgebreidste niveau valt op`,
      n.map((x) => x.lampen).join() === '1,3,5' && n.map((x) => x.badge).join() === 'false,false,true');
    const WOORD = { nl: 'veertien', en: 'fourteen', de: 'vierzehn', fr: 'quatorze', es: 'catorce', it: 'quattordici', pt: 'catorze' };
    check(`${code}: de kop zegt het, en de inleiding noemt het echte aantal vragen`,
      kop.niveauKop === t.niveaus.kop.join('') && vragen[2].length === 14 && kop.niveauIntro.includes(WOORD[code]),
      `${kop.niveauKop} · ${vragen[2].length} vragen`);
  }

  // Plaatjes met een beschrijving (het achterste telefoonplaatje is versiering).
  const zonderAlt = kop.beelden.filter((b) => b.alt === null);
  check(`${code}: elk plaatje heeft een alt`, zonderAlt.length === 0, zonderAlt.map((b) => b.src).join(' '));
  // Elke relatieve link wijst naar iets dat bestaat.
  const kapot = [];
  for (const href of kop.links) {
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    const doel = new URL(href, url + pad);
    const bestand = join(wortel, doel.pathname.replace(/^\//, ''), doel.pathname.endsWith('/') ? 'index.html' : '');
    if (!existsSync(bestand)) kapot.push(href);
  }
  check(`${code}: elke link binnen de site bestaat`, kapot.length === 0, kapot.join(' '));

  // Leesbaar, in allebei de thema's.
  for (const schema of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: schema });
    await page.waitForTimeout(50);
    const slecht = await page.evaluate(CONTRAST);
    check(`${code}: ${schema === 'light' ? 'licht' : 'donker'}: alle tekst haalt de contrastdrempel`,
      slecht.length === 0, slecht.slice(0, 4).join(' | '));
  }
  await page.setViewportSize({ width: 360, height: 780 });
  const breed = await page.evaluate(() => document.documentElement.scrollWidth);
  check(`${code}: op een telefoon van 360 pixels geen horizontale scroll`, breed <= 360, String(breed));
  // De hero knipt af wat uitsteekt, dus dat zie je niet aan de scroll: een
  // woord dat breder is dan het scherm duwt de kop mee naar rechts, en valt
  // er dan gewoon af.
  const teBreed = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3')]
    .filter((h) => { const r = h.getBoundingClientRect();
      return r.width && (r.left < -1 || r.right > document.documentElement.clientWidth + 1 || h.scrollWidth > h.clientWidth + 1); })
    .map((h) => `${h.textContent.trim().slice(0, 30)} ${Math.round(h.getBoundingClientRect().right)}/${document.documentElement.clientWidth}`));
  check(`${code}: en op 360 pixels past elk woord in zijn kop`, teBreed.length === 0, teBreed.join(' | '));
}

check('elke pagina heeft precies dezelfde hreflang-set (wederkerig)', new Set(clusters.values()).size === 1,
  [...new Set(clusters.values())].length + ' verschillende');
check('niets van een andere website geladen', extern.length === 0, extern.slice(0, 3).join(' '));
check('geen 404 op een plaatje, lettertype of pagina', fouten404.length === 0, fouten404.slice(0, 3).join(' '));
{
  const status = await page.evaluate(async (paden) => Promise.all(paden.map(async (p) =>
    `${p}:${(await fetch(p)).status}`)), ['/ROUTEKAART.md', '/ROUTEKAART.html', '/test/LEESMIJ.md', '/schema.sql',
    '/site/teksten.mjs', '/kalender.ics', '/sw.js', '/site/og/og-nl.jpg']);
  check('de testserver serveert wat GitHub Pages publiceert: de documenten niet, de site wel',
    status.join(' ') === '/ROUTEKAART.md:404 /ROUTEKAART.html:404 /test/LEESMIJ.md:404 /schema.sql:404 '
      + '/site/teksten.mjs:404 /kalender.ics:200 /sw.js:200 /site/og/og-nl.jpg:200', status.join(' '));
}
check('geen javascriptfouten op de landingspagina\'s', jsFouten.length === 0, jsFouten.join(' | '));

// ---- de gidsen (site/paginas.mjs) ------------------------------------------------
// Wat voor een voorpagina geldt, geldt voor elke gegenereerde pagina: de taal,
// de lengte van titel en omschrijving, één h1, een canonical naar zichzelf,
// hreflang (hier per cluster: alleen de talen waarin de gids bestaat), geldige
// JSON-LD met de FAQ woord voor woord zoals op het scherm, bestaande links,
// niets van buiten, contrast en 360 pixels. Daarbij: het kruimelpad klopt met
// de gestructureerde gegevens, de zichtbare datum is dateModified, en er staat
// geen {plekhouder} of streepje in de tekst.
{
  const lastmod = JSON.parse(readFileSync(join(wortel, 'site', 'lastmod.json'), 'utf8'));
  const jokersApp = Number(appBron.match(/const JOKERS_STANDAARD = (\d+);/)[1]);
  const sprintApp = Number(appBron.match(/\{ id:'sprint_top10',\s*naam:'[^']*',\s*punten:(\d+)/)[1]);
  const vensterApp = Number(readFileSync(join(wortel, 'scripts', 'herinneringen.mjs'), 'utf8')
    .match(/VENSTER_UREN = (\d+)/)[1]);
  // De puntentelling van de app zelf: scoreLijst() uit <knip primitieven>.
  const { scoreLijst } = await import(`data:text/javascript,${encodeURIComponent(knipUit(appBron, 'primitieven'))}`);
  // Wat één coureur oplevert die je op plek `voor` zette en die op `echt`
  // eindigde (null: geen plek in de uitslag), volgens de app.
  const plekPunten = (voor, echt) => {
    const lijst = Array.from({ length: 10 }, (_, i) => (i === voor - 1 ? 'X' : `v${i}`));
    const uitslag = Array.from({ length: 22 }, (_, i) => (i === echt - 1 ? 'X' : `u${i}`));
    return scoreLijst(lijst, uitslag).regels[voor - 1].punten;
  };
  const exactApp = plekPunten(1, 1), bijnaApp = plekPunten(4, 5);
  const [, fMax, fStap] = appBron.match(/Math\.max\(0, (\d+) - (\d+) \* Math\.abs\(i - echt\)\)/);
  const wkApp = appBron.match(/const WK_PUNTEN = \[([\d, ]+)\];/)[1].split(',').map((x) => x.trim()).join(', ');
  const winnaarApp = puntenApp.winnaar;
  // Wat een gids over de app zegt, moet uit de app komen. Per gids en per taal
  // een paar zinnen met de getallen erin.
  const FEITEN = {
    organiseren: {
      nl: [`standaard ${jokersApp} per seizoen`, `maximaal ${sprintApp}.`, `${vensterApp} uur voor een deadline`,
        'een melding een uur voor elke deadline'],
      en: [`${jokersApp} per season by default`, `adds up to ${sprintApp} more`, `${vensterApp} hours before a deadline`,
        'a reminder an hour before every deadline'],
    },
    puntentelling: {
      nl: [`${exactApp} punten voor precies goed, ${bijnaApp} bij één plek ernaast`, `in het echt krijgt: ${wkApp}.`,
        `standaard ${jokersApp} per seizoen`, `dan krijg je ${bijnaApp} punten`],
      en: [`${exactApp} points for the exact spot, ${bijnaApp} for one place off`, `in the championship: ${wkApp}.`,
        `${jokersApp} per season by default`, `you get ${bijnaApp} points`],
    },
    excel: {
      nl: [`MAX(0;${fMax}-${fStap}*ABS(B2-C2))`, `=ALS(B14=C14;${winnaarApp};0)`, `de winnaar ${winnaarApp} punten waard`],
      en: [`MAX(0,${fMax}-${fStap}*ABS(B2-C2))`, `=IF(B14=C14,${winnaarApp},0)`, `the winner is worth ${winnaarApp} points`],
    },
  };
  for (const pg of PAGINAS) {
    const cluster = TALEN.filter((c) => pg.talen[c]);
    const verwacht = [...cluster.map((c) => `${c}=${BASIS}/${pg.talen[c].pad}/`),
      `x-default=${BASIS}/${pg.talen[pg.talen.en ? 'en' : 'nl'].pad}/`].sort();
    for (const code of cluster) {
      const t = pg.talen[code];
      const naam = `${pg.id} (${code})`;
      const eigen = `${BASIS}/${t.pad}/`;
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto(`${url}${t.pad}/`);
      await page.waitForLoadState('networkidle');
      const kop = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        titel: document.title,
        omschrijving: document.querySelector('meta[name="description"]')?.content ?? '',
        h1: document.querySelectorAll('h1').length,
        canonical: document.querySelector('link[rel="canonical"]')?.href ?? '',
        robots: document.querySelector('meta[name="robots"]')?.content ?? '',
        hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => `${l.hreflang}=${l.href}`).sort(),
        ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((x) => x.textContent),
        faq: [...document.querySelectorAll('.faq details')].map((d) => ({
          vraag: d.querySelector('summary').textContent.trim(), antwoord: d.querySelector('p').textContent.trim() })),
        kruimel: [...document.querySelectorAll('.kruimel li')].map((li) => ({
          naam: li.textContent.trim(), href: li.querySelector('a')?.href ?? null })),
        datum: document.querySelector('time[datetime]')?.getAttribute('datetime') ?? '',
        datumTekst: document.querySelector('time[datetime]')?.textContent.trim() ?? '',
        tekst: document.body.innerText,
        // Ook wat achter een dichte FAQ-vraag staat.
        alles: document.querySelector('main').textContent.replace(/\s+/g, ' '),
        links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      }));
      check(`${naam}: taal, titel en omschrijving van de goede lengte, één h1, canonical, indexeerbaar`,
        kop.lang === code && kop.titel.length >= 30 && kop.titel.length <= 65
          && kop.omschrijving.length >= 110 && kop.omschrijving.length <= 165 && kop.h1 === 1
          && kop.canonical === eigen && /index/.test(kop.robots) && !/noindex/.test(kop.robots),
        `${kop.lang} · ${kop.titel.length}: ${kop.titel} · ${kop.omschrijving.length} · h1=${kop.h1} · ${kop.canonical}`);
      check(`${naam}: hreflang alleen naar de talen van deze gids, met x-default`,
        JSON.stringify(kop.hreflang) === JSON.stringify(verwacht), kop.hreflang.join(' '));
      let graaf = [];
      try { graaf = kop.ld.flatMap((x) => JSON.parse(x)['@graph'] ?? []); } catch { /* telt als leeg */ }
      const soort = (s) => graaf.find((x) => x['@type'] === s);
      const ldFaq = (soort('FAQPage')?.mainEntity ?? []).map((q) => ({ vraag: q.name, antwoord: q.acceptedAnswer?.text }));
      check(`${naam}: JSON-LD met WebPage, Article en BreadcrumbList, en de FAQ zoals op het scherm`,
        soort('WebPage') && soort('Article')?.author?.['@id'] === `${BASIS}/#maker` && soort('BreadcrumbList')
          && kop.faq.length === t.faq.length && JSON.stringify(ldFaq) === JSON.stringify(kop.faq),
        graaf.map((x) => x['@type']).join(', '));
      const ldKruimel = (soort('BreadcrumbList')?.itemListElement ?? []).map((i) => ({ naam: i.name, url: i.item }));
      const zichtbaar = kop.kruimel.map((k) => ({ naam: k.naam, url: k.href ? new URL(k.href).pathname : null }));
      check(`${naam}: het kruimelpad op het scherm is dat van de gestructureerde gegevens`,
        ldKruimel.length === zichtbaar.length && ldKruimel.every((k, i) => k.naam === zichtbaar[i].naam
          && (zichtbaar[i].url === null ? k.url === eigen : k.url === BASIS + zichtbaar[i].url.replace(/^\/$/, '/'))),
        JSON.stringify(zichtbaar));
      check(`${naam}: de datum op het scherm is dateModified en die van de sitemap`,
        kop.datum === soort('Article')?.dateModified && kop.datum === lastmod[eigen]?.datum
          && soort('Article')?.datePublished === lastmod[eigen]?.sinds && kop.datumTekst.length > 8,
        `${kop.datum} · ${kop.datumTekst} · ${soort('Article')?.dateModified} · ${lastmod[eigen]?.datum}`);
      check(`${naam}: geen {plekhouder} en geen streepje in de tekst`,
        !/\{[a-zA-Z]+\}/.test(kop.alles) && !/[–—]/.test(kop.alles + kop.titel + kop.omschrijving),
        (kop.alles.match(/.{0,20}(\{[a-zA-Z]+\}|[–—]).{0,20}/) ?? [''])[0]);
      const feiten = FEITEN[pg.id]?.[code];
      check(`${naam}: de getallen over de app komen uit de app`,
        feiten?.length > 0 && feiten.every((z) => kop.alles.includes(z)),
        feiten ? feiten.filter((z) => !kop.alles.includes(z)).join(' | ') : 'geen FEITEN voor deze gids');
      if (pg.rekenvoorbeeld) {
        // Het rekenvoorbeeld is wat de app ervan maakt, regel voor regel, met
        // het totaal eronder.
        const { regels, totaal } = scoreLijst(pg.rekenvoorbeeld.voorspeld, pg.rekenvoorbeeld.uitslag);
        const tabel = await page.evaluate(() => {
          const t = document.querySelector('table.rekenvoorbeeld');
          return t && { rijen: [...t.querySelectorAll('tbody tr')].map((r) => [...r.children].map((c) => c.textContent.trim())),
            totaal: t.querySelector('tfoot td')?.textContent.trim() };
        });
        const geenPlek = t.secties.find((x) => x.rekenvoorbeeld).rekenvoorbeeld.geenPlek;
        const verwachtRijen = regels.map((r) => [r.nr, `P${r.voorspeld}`, r.werkelijk ? `P${r.werkelijk}` : geenPlek, String(r.punten)]);
        check(`${naam}: het rekenvoorbeeld is wat scoreLijst() uit de app ervan maakt`,
          tabel && JSON.stringify(tabel.rijen) === JSON.stringify(verwachtRijen) && tabel.totaal === String(totaal),
          JSON.stringify(tabel?.rijen?.find((r, i) => JSON.stringify(r) !== JSON.stringify(verwachtRijen[i])) ?? tabel?.totaal));
        // De tekst eronder noemt Albon (P10, elfde: één plek ernaast) en
        // Sainz (uitgevallen). Past iemand het voorbeeld aan, dan moet die
        // tekst mee.
        const van = (nr) => regels.find((r) => r.nr === nr);
        check(`${naam}: de tekst onder het rekenvoorbeeld klopt nog met het voorbeeld`,
          van('Albon')?.voorspeld === 10 && van('Albon')?.werkelijk === 11 && van('Albon')?.punten === bijnaApp
            && van('Sainz')?.werkelijk === null && van('Sainz')?.punten === 0,
          JSON.stringify([van('Albon'), van('Sainz')]));
      }
      if (t.secties.some((x) => x.vragentabel)) {
        // De losse vragen en seizoensvragen: dezelfde tabellen als op de
        // voorpagina in die taal, en daar komen de punten uit de app.
        const tabellen = () => [...document.querySelectorAll('.tabellen table')]
          .map((x) => [...x.querySelectorAll('th, td')].map((c) => c.textContent.trim()).join(' | '));
        const hier = await page.evaluate(tabellen);
        await page.goto(`${url}${teksten[code].pad ? teksten[code].pad + '/' : ''}`);
        const daar = await page.evaluate(tabellen);
        await page.goto(`${url}${t.pad}/`);
        check(`${naam}: de tabellen met losse vragen en seizoensvragen zijn die van de voorpagina`,
          hier.length === 2 && JSON.stringify(hier) === JSON.stringify(daar), `${hier.length} tabellen`);
      }
      if (t.secties.some((x) => x.formules)) {
        // De formule voor een spreadsheet geeft voor elke voorspelde plek en
        // elke uitslag (ook een lege cel: geen plek) wat de app geeft.
        const formule = await page.evaluate(() => document.querySelector('.formules code')?.textContent ?? '');
        let reken = null;
        try {
          const js = formule.replace(/^=/, '').replace(/\bALS\(/g, 'IF(').replace(/;/g, ',').replace(/C2=""/g, 'C2===""');
          if (!/^[A-Z0-9(),"=*+\- ]+$/.test(js)) throw new Error(js);
          reken = new Function('IF', 'MAX', 'ABS', 'B2', 'C2', `return ${js};`);
        } catch { /* reken blijft leeg */ }
        const fout = [];
        for (let voor = 1; voor <= 10 && reken; voor++) {
          for (const echt of [null, ...Array.from({ length: 22 }, (_, i) => i + 1)]) {
            const uit = reken((c, a, b) => (c ? a : b), Math.max, Math.abs, voor, echt ?? '');
            if (uit !== plekPunten(voor, echt)) fout.push(`P${voor}→${echt ?? 'leeg'}: ${uit} in plaats van ${plekPunten(voor, echt)}`);
          }
        }
        check(`${naam}: de formule rekent elke plek zoals de app`, reken && fout.length === 0, fout.slice(0, 3).join(' | ') || formule);
      }
      const kapot = kop.links.filter((href) => !/^(https?:|mailto:|#)/.test(href)).filter((href) => {
        const doel = new URL(href, `${url}${t.pad}/`);
        return !existsSync(join(wortel, doel.pathname.replace(/^\//, ''), doel.pathname.endsWith('/') ? 'index.html' : ''));
      });
      check(`${naam}: elke link binnen de site bestaat`, kapot.length === 0, kapot.join(' '));
      for (const schema of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: schema });
        await page.waitForTimeout(50);
        const slecht = await page.evaluate(CONTRAST);
        check(`${naam}: ${schema === 'light' ? 'licht' : 'donker'}: alle tekst haalt de contrastdrempel`,
          slecht.length === 0, slecht.slice(0, 4).join(' | '));
      }
      await page.setViewportSize({ width: 360, height: 780 });
      const smal = await page.evaluate(() => ({
        breed: document.documentElement.scrollWidth,
        teBreed: [...document.querySelectorAll('h1, h2, h3, table')].filter((h) => {
          const r = h.getBoundingClientRect(); return r.width && (r.right > document.documentElement.clientWidth + 1);
        }).map((h) => h.textContent.trim().slice(0, 30)),
      }));
      check(`${naam}: op 360 pixels geen horizontale scroll, en alles past`,
        smal.breed <= 360 && smal.teBreed.length === 0, `${smal.breed} · ${smal.teBreed.join(' | ')}`);
    }
  }

  // Geen weespagina's: elke url in de sitemap wordt vanaf minstens één andere
  // gegenereerde pagina gelinkt. Een gids zonder links ernaartoe vindt een
  // zoekmachine alleen via de sitemap, en een bezoeker nooit.
  const sitemap = readFileSync(join(wortel, 'sitemap.xml'), 'utf8');
  const alle = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const bestandVan = (u) => join(wortel, u.replace(`${BASIS}/`, ''), 'index.html');
  const gelinkt = new Map(alle.map((u) => [u, new Set()]));
  for (const van of alle) {
    const html = readFileSync(bestandVan(van), 'utf8');
    for (const [, href] of html.matchAll(/<a [^>]*href="([^"#]+)(?:#[^"]*)?"/g)) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const doel = new URL(href, van).href;
      if (gelinkt.has(doel) && doel !== van) gelinkt.get(doel).add(van);
    }
  }
  const wezen = alle.filter((u) => gelinkt.get(u).size === 0);
  check('geen weespagina: elke url in de sitemap krijgt een link van een andere pagina', wezen.length === 0, wezen.join(' '));
  const gidsUrls = PAGINAS.flatMap((pg) => Object.entries(pg.talen).map(([c, t]) => [c, `${BASIS}/${t.pad}/`]));
  check('en elke gids wordt gelinkt vanaf de voorpagina in zijn eigen taal',
    gidsUrls.every(([c, u]) => gelinkt.get(u)?.has(urlVan(c))), gidsUrls.map(([c, u]) => `${c}:${gelinkt.get(u)?.size}`).join(' '));
  // Onder het blok waar hij bij hoort: de puntentelling onder de puntentabel,
  // niet ergens anders op de pagina.
  const opPlek = PAGINAS.flatMap((pg) => Object.entries(pg.talen).map(([c, t]) => {
    const html = readFileSync(bestandVan(urlVan(c)), 'utf8');
    const blok = html.match(new RegExp(`<section[^>]*id="${pg.teaserPlek ?? 'hoe'}"[^>]*>([\\s\\S]*?)</section>`))?.[1] ?? '';
    return [`${pg.id}(${c})`, blok.includes(`${t.pad}/"`)];
  }));
  check('onder het blok van de voorpagina waar hij bij hoort', opPlek.every(([, ok]) => ok),
    opPlek.filter(([, ok]) => !ok).map(([n]) => n).join(' '));
}

// ---- beweging ------------------------------------------------------------------
// Wat in beeld schuift, schuift pas als je erbij bent. Maar de inhoud mag er
// nooit van afhangen: zonder JavaScript, met "minder beweging" aan, of als het
// script onderaan niet draait, staat alles er gewoon.
{
  const t = teksten[TALEN.find((c) => !teksten[c].pad)];   // de taal op /
  // Hoeveel van de .onthul-blokken echt te zien zijn (niet doorzichtig).
  const TE_ZIEN = () => [...document.querySelectorAll('.onthul')].map((el) => {
    let o = 1; for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o > 0.99;
  });
  const zichtbaar = (lijst) => `${lijst.filter(Boolean).length} van ${lijst.length}`;

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3200);
  const vooraf = await page.evaluate(() => ({
    beweegt: document.documentElement.classList.contains('beweegt'),
    slot: [...document.querySelectorAll('.slot .onthul')].map((el) => Number(getComputedStyle(el).opacity)),
  }));
  check('met JavaScript beweegt de pagina', vooraf.beweegt);
  // Ook na het vangnet van tweeënhalve seconde: wat onder de vouw zit wacht.
  check('en wat nog onder de vouw zit wacht tot je erheen scrolt',
    vooraf.slot.length > 0 && vooraf.slot.every((o) => o === 0), vooraf.slot.join());

  // Stap voor stap naar beneden, zoals iemand die leest.
  const hoog = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= hoog; y += 450) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1600);
  const na = await page.evaluate((TE_ZIEN) => ({
    zichtbaar: [...document.querySelectorAll('.onthul')].map((el) => el.classList.contains('zichtbaar')),
    te_zien: new Function(`return (${TE_ZIEN})()`)(),
    tellers: [...document.querySelectorAll('[data-tel]')].map((n) => [n.getAttribute('data-tel'), n.textContent.trim()]),
    balk: getComputedStyle(document.querySelector('.voortgang')).transform,
  }), TE_ZIEN.toString());
  check('na het scrollen is elk blok in beeld geschoven', na.zichtbaar.every(Boolean), zichtbaar(na.zichtbaar));
  check('en ook echt te zien', na.te_zien.every(Boolean), zichtbaar(na.te_zien));
  check('de tellers eindigen op het echte getal',
    na.tellers.length >= 6 && na.tellers.every(([doel, staat]) => doel === staat), JSON.stringify(na.tellers));
  const schaal = Number((na.balk.match(/matrix\(([\d.]+)/) ?? [])[1]);
  check('de voortgangsbalk onder de kop staat onderaan vol', schaal > 0.98, na.balk);

  // De band onder de hero: versiering, dus niet voorgelezen, en twee keer
  // dezelfde rij zodat hij naadloos rondloopt.
  const band = await page.evaluate(() => ({
    verborgen: document.querySelector('.ticker')?.getAttribute('aria-hidden'),
    items: [...document.querySelectorAll('.ticker span')].map((s) => s.textContent.trim()),
  }));
  const rij = band.items.slice(0, t.ticker.length);
  check('de lichtkrant wordt niet voorgelezen', band.verborgen === 'true', band.verborgen);
  check('en is twee keer dezelfde rij, met de getallen ingevuld',
    band.items.length === 2 * t.ticker.length && band.items.slice(t.ticker.length).join('|') === rij.join('|')
      && rij.join('|') === t.ticker.map((x) => vul(x, { exact: 5, meest: 14 })).join('|'),
    rij.join(' · '));

  const opbouw = await page.evaluate(() => ({
    nummers: [...document.querySelectorAll('.sectiekop .label b')].map((b) => b.textContent.trim()),
    iconen: [...document.querySelectorAll('#functies li')].map((li) => !!li.querySelector('.icoon svg')),
    chips: [...document.querySelectorAll('.hero .zweef')].map((z) => z.getAttribute('aria-hidden')),
    lampen: document.querySelectorAll('.hero .startlichten i').length,
  }));
  check('de secties zijn genummerd, 01 en verder, zonder gat',
    opbouw.nummers.length >= 5 && opbouw.nummers.every((n, i) => n === String(i + 1).padStart(2, '0')),
    opbouw.nummers.join());
  check('elke functie heeft een pictogram',
    opbouw.iconen.length === t.functies.items.length && opbouw.iconen.every(Boolean), zichtbaar(opbouw.iconen));
  check('de zwevende kaartjes bij de telefoon zijn versiering',
    opbouw.chips.length === t.hero.chips.length && opbouw.chips.every((a) => a === 'true'), opbouw.chips.join());
  check('en boven de kop gaan vijf startlichten aan', opbouw.lampen === 5, String(opbouw.lampen));

  // De glans over de rode regel van de kop. De letters krijgen daar een
  // verloop als vulling, en waar het verloop niet komt zijn ze doorzichtig.
  // Het dekte eerst maar een deel van de regel: vóór lights out viel
  // "vrienden" weg, erna "versla je". Dus: tel de letters links en rechts in
  // elke regel, vóór, tijdens en na de glans, op een smalle telefoon (de
  // regel breekt), een grotere (hij past op één regel) en een breed scherm.
  {
    const TEL = async (b64) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      // Het deel van een strook dat letter is: rood of licht, niet het donker eronder.
      const deel = (van, tot) => { let n = 0, al = 0;
        for (let y = 0; y < c.height; y++) for (let i = Math.floor(van * c.width); i < Math.floor(tot * c.width); i++) {
          al++; if (d[(y * c.width + i) * 4] > 150) n++; }
        return n / al; };
      return [deel(0, 1 / 3), deel(2 / 3, 1)];
    };
    const mis = [];
    for (const breedte of [393, 430, 1280]) {
      await page.setViewportSize({ width: breedte, height: 860 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      for (const t of [1500, 2950, 6000]) {
        const regels = await page.evaluate((t) => {
          document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; });
          const r = document.createRange(); r.selectNodeContents(document.querySelector('.hero h1 > span + span'));
          return [...r.getClientRects()].filter((k) => k.width > 20)
            .map(({ x, y, width, height }) => ({ x, y, width, height }));
        }, t);
        if (!regels.length) mis.push(`${breedte}px: geen regel gevonden`);
        for (const k of regels) {
          const [links, rechts] = await page.evaluate(TEL, (await page.screenshot({ clip: k })).toString('base64'));
          if (links < 0.08 || rechts < 0.08) mis.push(`${breedte}px ${t}ms: links ${links.toFixed(2)}, rechts ${rechts.toFixed(2)}`);
        }
      }
    }
    check('de rode regel van de kop staat er helemaal, vóór, tijdens en na de glans', mis.length === 0, mis.slice(0, 3).join(' | '));
  }

  const browser = context.browser();
  // Zonder JavaScript.
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.goto(url);
    const r = await p.evaluate(TE_ZIEN);
    check('zonder JavaScript staat alles er meteen', r.length > 20 && r.every(Boolean), zichtbaar(r));
    await ctx.close();
  }
  // Met "minder beweging" aan: niets beweegt, alles staat er.
  {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(url);
    await p.waitForLoadState('networkidle');
    const r = await p.evaluate((TE_ZIEN) => ({
      beweegt: document.documentElement.classList.contains('beweegt'),
      animaties: document.getAnimations().length,
      te_zien: new Function(`return (${TE_ZIEN})()`)(),
    }), TE_ZIEN.toString());
    check('wie om minder beweging vraagt krijgt geen animaties', !r.beweegt && r.animaties === 0,
      `beweegt=${r.beweegt} · ${r.animaties} animaties`);
    check('en ziet alles meteen', r.te_zien.every(Boolean), zichtbaar(r.te_zien));
    await ctx.close();
  }
  // Het vangnet: het script onderaan draait niet (geblokkeerd, kapot). Dan
  // komt alles toch tevoorschijn, ook wat onder de vouw zit.
  {
    const ctx = await browser.newContext();
    let weg = false;
    await ctx.route(url, async (route) => {
      const r = await route.fetch();
      const body = (await r.text()).replace(/<script>\(function\(\)\{try\{\s*var h=document\.documentElement[\s\S]*?<\/script>/,
        () => { weg = true; return ''; });
      await route.fulfill({ response: r, body });
    });
    const p = await ctx.newPage();
    await p.goto(url);
    await p.waitForTimeout(3200);
    const r = await p.evaluate(TE_ZIEN);
    check('als het script onderaan niet draait, komt alles na een paar tellen toch',
      weg && r.every(Boolean), `script weg=${weg} · ${zichtbaar(r)}`);
    await ctx.close();
  }
}

// ---- de app zelf in app/ -----------------------------------------------------
{
  const eigen = [];
  const luister = (r) => { if (r.status() >= 400) eigen.push(`${r.status()} ${r.url()}`); };
  page.on('response', luister);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url + 'app/');
  await page.waitForSelector('#code');
  await page.waitForLoadState('networkidle');
  const app = await page.evaluate(async () => {
    const m = document.querySelector('link[rel="manifest"]');
    const r = await fetch(m.href); const manifest = await r.json();
    const iconen = await Promise.all(manifest.icons.map(async (i) =>
      (await fetch(new URL(i.src, m.href))).status));
    const lettertypen = [...document.fonts].filter((f) => f.status === 'error').length;
    return { robots: document.querySelector('meta[name="robots"]')?.content ?? '',
             start: new URL(manifest.start_url, m.href).pathname, id: new URL(manifest.id, m.href).pathname,
             iconen, lettertypen };
  });
  check('de app staat op noindex', app.robots === 'noindex', app.robots);
  check('het manifest opent de app in app/, en houdt zijn oude identiteit',
    app.start === '/app/' && app.id === '/', `${app.start} ${app.id}`);
  check('de pictogrammen uit het manifest bestaan', app.iconen.every((s) => s === 200), app.iconen.join());
  check('en de app vindt zijn lettertypen één map hoger', app.lettertypen === 0 && eigen.length === 0,
    `${app.lettertypen} mislukt · ${eigen.join(' ')}`);
  page.off('response', luister);
}
await stoppen();

// ---- sitemap, robots, llms.txt, 404 ---------------------------------------------
{
  const sitemap = readFileSync(join(wortel, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  // Eerst de zeven landingspagina's, dan de privacyverklaring in zijn twee
  // talen (zie test/privacypagina.test.mjs voor die pagina's zelf).
  const privacy = Object.values(PRIVACY).map((p) => `${BASIS}/${p.pad}/`);
  // En dan de gidsen, elk in de talen waarin hij bestaat.
  const gidsen = PAGINAS.flatMap((pg) => TALEN.filter((c) => pg.talen[c]).map((c) => `${BASIS}/${pg.talen[c].pad}/`));
  check('de sitemap noemt elke taal, de privacyverklaring en de gidsen',
    JSON.stringify(locs) === JSON.stringify([...TALEN.map(urlVan), ...privacy, ...gidsen]), locs.join(' '));
  const perUrl = sitemap.split('<url>').slice(1).map((u) => ({
    loc: u.match(/<loc>([^<]+)</)?.[1], n: (u.match(/hreflang="/g) ?? []).length }));
  const clusterGrootte = (loc) => {
    const pg = PAGINAS.find((x) => Object.values(x.talen).some((t) => loc === `${BASIS}/${t.pad}/`));
    return pg ? Object.keys(pg.talen).length : privacy.includes(loc) ? privacy.length : TALEN.length;
  };
  check('met bij elke url de alternatieven van zijn eigen cluster, plus x-default',
    perUrl.every(({ loc, n }) => n === clusterGrootte(loc) + 1), perUrl.map((u) => u.n).join());
  check('en niet de app', !sitemap.includes('/app/'));

  const robots = readFileSync(join(wortel, 'robots.txt'), 'utf8');
  check('robots.txt wijst naar de sitemap', robots.includes(`Sitemap: ${BASIS}/sitemap.xml`));
  check('en laat de taalmodellen toe', ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']
    .every((b) => new RegExp(`User-agent: ${b}\\nAllow: /`).test(robots)));
  check('en sluit niets af', !/Disallow:\s*\/\S*/.test(robots));

  const llms = readFileSync(join(wortel, 'llms.txt'), 'utf8');
  check('llms.txt begint met de naam en een samenvatting', /^# Predict the Race\n\n> /.test(llms));
  check('en noemt elke taalpagina', TALEN.every((c) => llms.includes(urlVan(c))));
  check('en de punten', llms.includes(`| ${teksten.en.punten.vragen.winnaar} | ${puntenApp.winnaar} |`));
  // Er stond "no trackers", terwijl de pagina's Google Analytics laden zodra
  // iemand ja zegt. Een taalmodel dat dat overneemt, vertelt het verkeerd door.
  check('en zegt eerlijk dat er statistieken zijn, alleen na een ja',
    !/no trackers/i.test(llms) && /Google Analytics, only after the visitor says yes/.test(llms));

  const nf = readFileSync(join(wortel, '404.html'), 'utf8');
  check('404.html staat op noindex en laadt niets relatiefs',
    nf.includes('noindex') && !/(src|href)="(?!https?:|\/|#)/.test(nf));
}

process.exit(afronden() ? 0 : 1);
