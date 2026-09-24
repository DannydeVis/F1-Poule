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
import { maakControle, startSite, wortel } from './hulp.mjs';
import { teksten, TALEN, STANDAARD, BASIS } from '../site/teksten.mjs';
import { PRIVACY } from '../site/privacy.mjs';

const { check, afronden } = maakControle('de landingspagina in zeven talen');

// ---- 1. de generator ----------------------------------------------------------
{
  let ok = true, uit = '';
  try { uit = execFileSync(process.execPath, [join(wortel, 'scripts', 'maak-site.mjs'), '--controle'],
    { encoding: 'utf8', stdio: 'pipe' }); }
  catch (e) { ok = false; uit = String(e.stderr || e.message); }
  check('wat in de repo staat is wat de generator nu maakt', ok, uit.trim());
}

const urlVan = (c) => `${BASIS}/${teksten[c].pad ? teksten[c].pad + '/' : ''}`;
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
  }));

  check(`${code}: de pagina zegt dat hij in het ${t.naam} is`, kop.lang === code, kop.lang);
  check(`${code}: titel van 30 tot 65 tekens`, kop.titel.length >= 30 && kop.titel.length <= 65,
    `${kop.titel.length}: ${kop.titel}`);
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
}

check('elke pagina heeft precies dezelfde hreflang-set (wederkerig)', new Set(clusters.values()).size === 1,
  [...new Set(clusters.values())].length + ' verschillende');
check('niets van een andere website geladen', extern.length === 0, extern.slice(0, 3).join(' '));
check('geen 404 op een plaatje, lettertype of pagina', fouten404.length === 0, fouten404.slice(0, 3).join(' '));
check('geen javascriptfouten op de landingspagina\'s', jsFouten.length === 0, jsFouten.join(' | '));

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
  check('de sitemap noemt elke taal, en de privacyverklaring',
    JSON.stringify(locs) === JSON.stringify([...TALEN.map(urlVan), ...privacy]), locs.join(' '));
  const perUrl = sitemap.split('<url>').slice(1).map((u) => ({
    loc: u.match(/<loc>([^<]+)</)?.[1], n: (u.match(/hreflang="/g) ?? []).length }));
  check('met bij elke url alle alternatieven', perUrl.every(({ loc, n }) =>
    n === (privacy.includes(loc) ? privacy.length : TALEN.length) + 1), perUrl.map((u) => u.n).join());
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

  const nf = readFileSync(join(wortel, '404.html'), 'utf8');
  check('404.html staat op noindex en laadt niets relatiefs',
    nf.includes('noindex') && !/(src|href)="(?!https?:|\/|#)/.test(nf));
}

process.exit(afronden() ? 0 : 1);
