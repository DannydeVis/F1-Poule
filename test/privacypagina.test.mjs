// De privacyverklaring als losse pagina (/privacy/ en /en/privacy/).
//
// Dezelfde verklaring staat in de app, onder Profiel. Twee plekken met
// dezelfde belofte lopen uit elkaar zodra er één verandert, en dan belooft de
// site iets wat de app niet doet, of zwijgt hij over iets wat de app wel
// doet. Wat hier vastligt:
//
//   1. Het contactadres is op beide plekken hetzelfde.
//   2. Elke dienst die de app in zijn verklaring noemt (Supabase, OpenF1,
//      esm.sh, GitHub Pages, Google, ...) staat ook op de pagina, en
//      andersom. In het Nederlands en in het Engels.
//   3. De pagina's zelf: taal, titel, één h1, canonical, hreflang tussen de
//      twee, geen verzoek naar een andere website, geen kapotte link,
//      contrast in licht en donker, geen horizontale scroll.
//   4. Elke landingspagina linkt ernaar, in zijn taal of anders in het Engels.
//   5. De app linkt ernaar, in de taal van de app, en dat adres bestaat.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startSite, meedoen, wortel } from './hulp.mjs';
import { teksten, TALEN, BASIS, STANDAARD } from '../site/teksten.mjs';
import { PRIVACY, CONTACT, privacyTaal } from '../site/privacy.mjs';

const { check, afronden } = maakControle('de privacyverklaring als losse pagina');
const appBron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
const PAGINAS = Object.keys(PRIVACY);
const urlVan = (taal) => `${BASIS}/${PRIVACY[taal].pad}/`;
const leesPagina = (taal) => readFileSync(join(wortel, PRIVACY[taal].pad, 'index.html'), 'utf8');
const platteTekst = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// ---- 1. één contactadres -----------------------------------------------------
{
  const inApp = appBron.match(/const PRIVACY_CONTACT = '([^']*)';/)?.[1];
  check('het contactadres in de app is dat van de pagina', inApp === CONTACT, `${inApp} / ${CONTACT}`);
  check('en het is een mailadres', /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(CONTACT), CONTACT);
  for (const taal of PAGINAS) {
    check(`${taal}: de pagina linkt naar dat adres`, leesPagina(taal).includes(`href="mailto:${CONTACT}"`));
  }
}

// ---- 2. dezelfde diensten, in beide talen -------------------------------------
// De verklaring in de app: in het Nederlands de broncode van privacyBlok(), in
// het Engels het stuk "de privacyverklaring" uit de vertalingen.
{
  // De zinnen staan in de broncode in stukken ('... zelf ' + 'koppelt'); plak
  // ze eerst aan elkaar, anders vindt een zin over twee regels niets.
  const plak = (s) => s.replace(/'\s*\+\s*'/g, '');
  const stuk = (van, tot) => {
    const a = appBron.indexOf(van), b = appBron.indexOf(tot, a);
    return a > -1 && b > a ? plak(appBron.slice(a, b)) : '';
  };
  const app = {
    nl: stuk('function privacyBlok()', 'function weggaanBlok()'),
    en: stuk('// ---- de privacyverklaring ---', '// ---- weggaan ---'),
  };
  check('de verklaring in de app is gevonden, in beide talen', app.nl.length > 1000 && app.en.length > 1000,
    `${app.nl.length} / ${app.en.length}`);
  // Wie er iets van je te zien krijgt. Een nieuwe dienst in de app hoort hier
  // bij te komen; dan zakt deze test tot hij ook op de pagina staat.
  const DIENSTEN = ['Supabase', 'OpenF1', 'esm.sh', 'GitHub Pages', 'Google', 'Apple', 'Mozilla', 'Google Analytics'];
  const ZINNEN = {
    nl: ['IP-adres', 'alleen als je het zelf koppelt', 'Google Analytics alleen als je daar ja op zegt', 'niet terug te draaien'],
    en: ['IP address', 'only if you link it yourself', 'Google Analytics only if you say yes to it', 'cannot be undone'],
  };
  for (const taal of PAGINAS) {
    const pagina = platteTekst(leesPagina(taal));
    const inApp = DIENSTEN.filter((d) => app[taal].includes(d));
    const opPagina = DIENSTEN.filter((d) => pagina.includes(d));
    check(`${taal}: de pagina noemt dezelfde diensten als de app`,
      inApp.length >= 5 && JSON.stringify(inApp) === JSON.stringify(opPagina),
      `app: ${inApp.join(', ')} · pagina: ${opPagina.join(', ')}`);
    // "niet terug te draaien" staat in de app bij de knoppen, niet in
    // privacyBlok() zelf; daarom tegen de hele app.
    const bron = taal === 'nl' ? plak(appBron) : app.en + plak(appBron);
    const mist = ZINNEN[taal].filter((z) => !pagina.includes(z) || !bron.includes(z));
    check(`${taal}: en belooft hetzelfde (${ZINNEN[taal].join(', ')})`, mist.length === 0, mist.join(', '));
  }
}

// ---- 3 t/m 5: in de browser ---------------------------------------------------
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
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || !el.getBoundingClientRect().width) continue;
    const a = lum(rgba(s.color)), b = lum(achter(el));
    const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const groot = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
    if (r < (groot ? 3 : 4.5)) uit.push(`${el.className || el.tagName} "${el.textContent.trim().slice(0, 20)}" ${r.toFixed(2)}`);
  }
  return [...new Set(uit)];
};

const bestaat = (href, basis) => {
  const doel = new URL(href, basis);
  return existsSync(join(wortel, doel.pathname.replace(/^\//, ''), doel.pathname.endsWith('/') ? 'index.html' : ''));
};

{
  const { page, url, extern, jsFouten, stoppen } = await startSite();
  const fouten = [];
  page.on('response', (r) => { if (r.status() >= 400) fouten.push(`${r.status()} ${r.url()}`); });

  // ---- 3. de pagina's zelf
  for (const taal of PAGINAS) {
    const t = PRIVACY[taal];
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`${url}${t.pad}/`);
    await page.waitForLoadState('networkidle');
    const kop = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      titel: document.title,
      omschrijving: document.querySelector('meta[name="description"]')?.content ?? '',
      canonical: document.querySelector('link[rel="canonical"]')?.href ?? '',
      robots: document.querySelector('meta[name="robots"]')?.content ?? '',
      h1: document.querySelectorAll('h1').length,
      h2: document.querySelectorAll('main h2').length,
      hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => `${l.hreflang}=${l.href}`).sort(),
      links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    }));
    check(`${taal}: de pagina is in het ${taal === 'nl' ? 'Nederlands' : 'Engels'}`, kop.lang === taal, kop.lang);
    check(`${taal}: titel van 30 tot 65 tekens en omschrijving van 110 tot 165`,
      kop.titel.length >= 30 && kop.titel.length <= 65 && kop.omschrijving.length >= 110 && kop.omschrijving.length <= 165,
      `${kop.titel.length} / ${kop.omschrijving.length}`);
    check(`${taal}: één h1 en een kop per onderwerp`, kop.h1 === 1 && kop.h2 === t.secties.length, `${kop.h1} / ${kop.h2}`);
    check(`${taal}: canonical naar zichzelf, en vindbaar`, kop.canonical === urlVan(taal)
      && /index/.test(kop.robots) && !/noindex/.test(kop.robots), `${kop.canonical} ${kop.robots}`);
    const verwacht = [...PAGINAS.map((c) => `${c}=${urlVan(c)}`), `x-default=${urlVan(STANDAARD)}`].sort();
    check(`${taal}: hreflang naar beide talen en x-default`, JSON.stringify(kop.hreflang) === JSON.stringify(verwacht),
      kop.hreflang.join(' '));
    const kapot = kop.links.filter((h) => !/^(https?:|mailto:|#)/.test(h) && !bestaat(h, `${url}${t.pad}/`));
    check(`${taal}: elke link binnen de site bestaat`, kapot.length === 0, kapot.join(' '));
    for (const schema of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: schema });
      await page.waitForTimeout(50);
      const slecht = await page.evaluate(CONTRAST);
      check(`${taal}: ${schema === 'light' ? 'licht' : 'donker'}: alle tekst haalt de contrastdrempel`,
        slecht.length === 0, slecht.slice(0, 4).join(' | '));
    }
    await page.setViewportSize({ width: 360, height: 780 });
    const breed = await page.evaluate(() => document.documentElement.scrollWidth);
    check(`${taal}: op een telefoon van 360 pixels geen horizontale scroll`, breed <= 360, String(breed));
  }
  check('de pagina\'s halen niets van een andere website', extern.length === 0, extern.slice(0, 3).join(' '));
  check('en niets geeft een 404', fouten.length === 0, fouten.slice(0, 3).join(' '));

  // ---- 4. vanaf elke landingspagina
  for (const code of TALEN) {
    const pad = teksten[code].pad ? `${teksten[code].pad}/` : '';
    await page.goto(url + pad);
    const hrefs = await page.$$eval('footer a', (as) => as.map((a) => a.href));
    const doel = `${url}${PRIVACY[privacyTaal(code)].pad}/`;
    check(`${code}: de voet linkt naar de privacyverklaring${privacyTaal(code) === code ? '' : ' (Engels)'}`,
      hrefs.includes(doel), hrefs.filter((h) => h.includes('privacy')).join(' ') || '(geen)');
  }

  // ---- 5. vanuit de app
  for (const taal of ['nl', 'en']) {
    await page.evaluate((t) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('poule:taal', t); }, taal);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${url}app/`);
    await page.waitForSelector('#code');
    await meedoen(page);
    await page.click('[data-weergave="profiel"]');
    await page.click('#privacyopen');
    await page.waitForSelector('#wegaccount');
    const links = await page.$$eval('#app .uitleg a', (as) => as.map((a) => ({ href: a.href, tekst: a.textContent })));
    const pagina = links.find((l) => l.href.includes('privacy/'));
    const verwacht = `${url}${PRIVACY[taal].pad}/`;
    check(`app (${taal}): linkt naar de privacyverklaring in dezelfde taal`, pagina?.href === verwacht,
      pagina?.href ?? '(geen link)');
    const status = pagina ? await page.evaluate(async (h) => (await fetch(h)).status, pagina.href) : 0;
    check(`app (${taal}): en die pagina bestaat`, status === 200, String(status));
    check(`app (${taal}): het contactadres is een maillink`,
      links.some((l) => l.href === `mailto:${CONTACT}` && l.tekst === CONTACT), links.map((l) => l.href).join(' '));
    const kleur = await page.$eval('#app .uitleg a', (a) => getComputedStyle(a).color);
    const tekst = await page.$eval('#app .uitleg b', (b) => getComputedStyle(b).color);
    check(`app (${taal}): de links hebben de tekstkleur, niet het blauw van de browser`, kleur === tekst, `${kleur} / ${tekst}`);
  }
  check('zonder javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
