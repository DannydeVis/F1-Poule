// De premiumpagina op de site (16 november).
//
// Danny: in de app een korte uitleg, en een knop naar een pagina met alle
// voorbeelden en schermafdrukken. Wat hier vastligt:
//   1. De pagina bestaat in het Nederlands en het Engels, en de app linkt naar
//      precies die twee paden.
//   2. Elk onderdeel van premium heeft een sectie met een schermafdruk uit de
//      app, licht en donker, in de taal van de pagina, en de bestanden bestaan.
//   3. Elk plaatje heeft een beschrijving en zijn echte maten, zodat er niets
//      verspringt tijdens het laden.
//   4. Onderaan staat hoe je het aanvraagt, met een knop die een mail opent.
//   5. De pagina noemt geen prijs en zegt dat meespelen gratis blijft.
//   6. In de browser: de plaatjes laden echt, op een telefoon staat alles onder
//      elkaar zonder horizontale scroll, op een breed scherm staat het plaatje
//      naast de tekst.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startSite, wortel } from './hulp.mjs';
import { PAGINAS } from '../site/paginas.mjs';
import { ONDERDELEN, PREMIUM_TALEN } from '../scripts/maak-premiumbeelden.mjs';

const { check, afronden } = maakControle('de premiumpagina');
const pg = PAGINAS.find((p) => p.id === 'premium');
const app = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
const maten = JSON.parse(readFileSync(join(wortel, 'site', 'premium-maten.json'), 'utf8'));

check('de pagina staat in site/paginas.mjs, in het Nederlands en het Engels',
  !!pg && Object.keys(pg.talen).join() === PREMIUM_TALEN.join(), Object.keys(pg?.talen ?? {}).join());
check('de app linkt naar precies die twee paden: Nederlands naar het Nederlandse, de rest naar het Engelse',
  app.includes(`TAAL === 'nl' ? '../${pg.talen.nl.pad}/' : '../${pg.talen.en.pad}/'`));

for (const taal of PREMIUM_TALEN) {
  const t = pg.talen[taal];
  const html = readFileSync(join(wortel, t.pad, 'index.html'), 'utf8');
  const metBeeld = t.secties.filter((s) => s.beeld);
  check(`${taal}: elk onderdeel van premium heeft een sectie met een schermafdruk`,
    metBeeld.map((s) => s.beeld).sort().join() === [...ONDERDELEN].sort().join(), metBeeld.map((s) => s.beeld).join());
  check(`${taal}: elk plaatje bestaat, licht en donker, in de taal van de pagina, en is niet zwaar`,
    ONDERDELEN.every((o) => ['licht', 'donker'].every((thema) => {
      const pad = join(wortel, 'site', 'beeld', `premium-${o}-${taal}-${thema}.jpg`);
      return existsSync(pad) && readFileSync(pad).length > 8000 && readFileSync(pad).length < 120000;
    })));
  check(`${taal}: elk plaatje heeft een beschrijving van minstens veertig tekens, zonder "schermafdruk van"`,
    metBeeld.every((s) => s.beeldAlt?.length >= 40 && !/^(schermafdruk|screenshot)/i.test(s.beeldAlt)),
    metBeeld.filter((s) => !(s.beeldAlt?.length >= 40)).map((s) => s.id).join());
  const imgs = [...html.matchAll(/<picture class="schermbeeld">\s*<source srcset="([^"]+)" media="\(prefers-color-scheme: dark\)">\s*<img src="([^"]+)" alt="[^"]+" width="(\d+)" height="(\d+)" loading="lazy"/g)];
  check(`${taal}: op de pagina staan ze als plaatje met een donkere variant en hun echte maten`,
    imgs.length === ONDERDELEN.length && imgs.every(([, donker, licht, w, h]) => {
      const naam = licht.match(/premium-(.+)-licht\.jpg$/)?.[1];
      return donker.endsWith(`premium-${naam}-donker.jpg`) && maten[`${naam}-licht`]?.join() === `${w},${h}`;
    }), `${imgs.length} plaatjes`);
  // De vergelijking van gratis en premium (17 november; Danny: "ik mis nog
  // zo'n vergelijk met gratis en premium"): de eerste sectie, een tabel met
  // drie kolommen; wat gratis is staat er twee keer aan, wat premium is alleen
  // in de laatste kolom; de prijs als laatste rij.
  const vgl = t.secties[0];
  const ja = vgl.tabel?.rijen.filter((r) => r[1] === true && r[2] === true) ?? [];
  const alleenPremium = vgl.tabel?.rijen.filter((r) => r[1] === false && r[2] === true) ?? [];
  check(`${taal}: de pagina begint met een vergelijking van gratis en premium`,
    vgl.tabel?.klasse === 'vergelijk' && vgl.tabel.kop.length === 3 && ja.length >= 5
      && alleenPremium.length === ONDERDELEN.length && vgl.tabel.rijen.every((r) => r.length === 3)
      && /\?$/.test(vgl.vraag), JSON.stringify(vgl.tabel?.kop));
  check(`${taal}: in de tabel een vinkje of een kruisje, met ja of nee voor wie niet kan zien`,
    (html.match(/<td class="ja"><span aria-hidden="true">✓<\/span><span class="alleenlezer">/g) ?? []).length === 2 * ja.length + alleenPremium.length
      && (html.match(/<td class="nee"><span aria-hidden="true">✕<\/span><span class="alleenlezer">/g) ?? []).length === alleenPremium.length);
  const aanvraag = t.secties.at(-1);
  check(`${taal}: de laatste sectie zegt hoe je het aanvraagt, met een knop die een mail opent`,
    aanvraag.knop?.href.startsWith('mailto:contact@predicttherace.com') && aanvraag.kort.includes('contact@predicttherace.com')
      && html.includes(`<a class="knop" href="${aanvraag.knop.href}">`));
  const tekst = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
  check(`${taal}: geen prijs op de pagina, en er staat dat meespelen gratis blijft`,
    !/[€$£]\s?\d|\d\s?(euro|eur|dollar)/i.test(tekst) && /gratis|stays free/i.test(t.kort), tekst.match(/[€$£]\s?\d+/)?.[0]);
  check(`${taal}: geen streepjes of emoji in de teksten`,
    !/[–—]|\p{Extended_Pictographic}/u.test(JSON.stringify(t)));
}

// ---- in de browser ---------------------------------------------------------------------
const { page, url, jsFouten, stoppen } = await startSite({ taal: null });
for (const [taal, pad] of [['nl', 'premium/'], ['en', 'en/premium/']]) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url + pad);
  await page.waitForSelector('.schermbeeld img');
  // Lui laden: naar elk plaatje toe, dan moet het er ook echt zijn.
  const geladen = await page.evaluate(async () => {
    const uit = [];
    for (const img of document.querySelectorAll('.schermbeeld img')) {
      img.scrollIntoView();
      if (!img.complete) await new Promise((klaar) => { img.onload = klaar; img.onerror = klaar; setTimeout(klaar, 4000); });
      uit.push(img.naturalWidth);
    }
    return uit;
  });
  check(`${taal}: alle zes de plaatjes laden echt`, geladen.length === 6 && geladen.every((w) => w > 300), geladen.join());
  await page.setViewportSize({ width: 360, height: 760 });
  check(`${taal}: de vergelijking past op 360 pixels: alle drie de kolommen in beeld`, await page.evaluate(() => {
    const t = document.querySelector('table.vergelijk');
    const laatste = t.querySelector('thead th:last-child').getBoundingClientRect();
    return laatste.right <= 360 && t.getBoundingClientRect().right <= 360 && document.documentElement.scrollWidth <= 360;
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  check(`${taal}: op een telefoon staat alles onder elkaar, zonder horizontale scroll`, await page.evaluate(() => {
    const s = document.querySelector('section[data-beeld]');
    const kort = s.querySelector('.kort').getBoundingClientRect(), img = s.querySelector('.schermbeeld').getBoundingClientRect();
    return img.top >= kort.bottom && img.right <= 390 && document.documentElement.scrollWidth <= 390;
  }));
  await page.setViewportSize({ width: 1200, height: 900 });
  check(`${taal}: op een breed scherm staat het plaatje naast de tekst`, await page.evaluate(() => {
    const s = document.querySelector('section[data-beeld]');
    const kort = s.querySelector('.kort').getBoundingClientRect(), img = s.querySelector('.schermbeeld').getBoundingClientRect();
    return img.left >= kort.right && img.top < kort.bottom;
  }));
  check(`${taal}: precies één h1, en elke sectie met een plaatje heeft een h2`, await page.evaluate(() =>
    document.querySelectorAll('h1').length === 1
      && [...document.querySelectorAll('section[data-beeld]')].every((s) => s.querySelector('h2'))));
}
check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
