// De app op het beginscherm van een iPhone (24 oktober).
//
// Aanleiding: "Moeten we nog iets aanpassen voor de iPhones, zodat het scherm
// optimaal benut wordt?" Wat er niet goed was: bovenin een witte statusbalk
// met zwarte letters boven een donkere app, de knoppen Opslaan en Wis alles
// onder het streepje onderin (waar een veeg de app sluit), en een witte flits
// bij het opstarten.
//
// Een testbrowser heeft geen statusbalk of streepje. De app leest die randen
// daarom uit variabelen (--boven, --onder, --links, --rechts, uit
// env(safe-area-inset-*)), en deze test zet ze zelf, zoals een iPhone 15 ze
// geeft: 59 boven, 34 onder; liggend 59 links en rechts.
//
// Wat hier vastligt:
//   1. In de kop: de statusbalk doorzichtig (black-translucent), het scherm
//      tot de rand (viewport-fit=cover), en een opstartbeeld per iPhone-maat
//      dat precies zo groot is als dat scherm, staand, voor elke maat in
//      scripts/maak-opstartbeelden.mjs. Ook voor de opvouwbare iPhone Duo,
//      dicht en open, en open ook liggend.
//   2. Met de randen van een iPhone: alles begint onder de statusbalk, daar
//      ligt een strook met genoeg contrast voor witte letters (in het licht
//      donker, in het donker de kleur van de kop, ook als je het thema zelf
//      kiest), de kop blijft er bij scrollen onder plakken, de tabbalk,
//      de knoppen in een race en een foutmelding blijven boven het streepje.
//   3. Liggend: niets onder de inkeping aan de zijkant.
//   4. Zonder die randen (Safari, Android, een computer) verandert er niets.
//   5. De opvouwbare iPhone Duo: dicht, open en open dwars past alles, met de
//      tabbalk boven het streepje.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startPagina, meedoen, wortel } from './hulp.mjs';
import { IPHONES, bestandVan, maatVan, blok } from '../scripts/maak-opstartbeelden.mjs';

const { check, afronden } = maakControle('de app op het beginscherm van een iPhone');
const app = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');

// ---- 1. de kop -------------------------------------------------------------------------
check('de statusbalk is doorzichtig (black-translucent)',
  app.includes('<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'));
check('het scherm loopt tot de rand (viewport-fit=cover)', /<meta name="viewport" content="[^"]*viewport-fit=cover/.test(app));
check('de opstartbeelden in de kop zijn die van scripts/maak-opstartbeelden.mjs', app.includes(blok()));
{
  const fout = [];
  for (const iphone of IPHONES) {
    const [b, h] = maatVan(iphone);
    const d = iphone[2];
    const png = readFileSync(join(wortel, 'pictogrammen', 'opstart', bestandVan(iphone)));
    const [w, hh] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    if (w !== b * d || hh !== h * d) fout.push(`${bestandVan(iphone)} is ${w}x${hh}`);
  }
  check('elk opstartbeeld is precies zo groot als het scherm', fout.length === 0 && IPHONES.length >= 15, fout.join(', '));
  check('voor de iPhones van de laatste jaren (12 tot en met 17, Air)', [[390, 844, 3], [393, 852, 3], [402, 874, 3],
    [430, 932, 3], [440, 956, 3], [420, 912, 3]].every(([b, h, d]) => IPHONES.some((x) => x[0] === b && x[1] === h && x[2] === d)));
  const duo = blok();
  check('de iPhone Duo: dicht, open staand en open liggend, elk met een eigen plaatje',
    duo.includes('(device-width: 466px) and (device-height: 678px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="../pictogrammen/opstart/opstart-1398x2034.png"')
    && duo.includes('(device-width: 626px) and (device-height: 890px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" href="../pictogrammen/opstart/opstart-1878x2670.png"')
    && duo.includes('(device-width: 626px) and (device-height: 890px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)" href="../pictogrammen/opstart/opstart-2670x1878.png"'));
}

// De randen van een iPhone 15 in de beginschermapp.
const RANDEN = { staand: ':root{--boven:59px;--onder:34px}', liggend: ':root{--links:59px;--rechts:59px;--onder:21px}' };
const randen = (page, css) => page.addStyleTag({ content: css });
const stijl = (page, kies, eig, pseudo = null) => page.$eval(kies, (e, [eig, pseudo]) => getComputedStyle(e, pseudo)[eig], [eig, pseudo]);
// Het contrast van witte letters op een kleur (WCAG).
const contrastMetWit = (rgb) => {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number).map((c) => {
    const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
};

// ---- 2. staand, met de randen van een iPhone ------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.setViewportSize({ width: 393, height: 852 });
  await meedoen(page);
  await randen(page, RANDEN.staand);
  check('alles begint onder de statusbalk', (await stijl(page, 'body', 'paddingTop')) === '59px');
  check('daar ligt een vaste strook zo hoog als de statusbalk', (await stijl(page, 'body', 'height', '::before')) === '59px'
    && (await stijl(page, 'body', 'position', '::before')) === 'fixed');
  const licht = await stijl(page, 'body', 'backgroundColor', '::before');
  check('in het licht donker, zodat de witte klok en batterij leesbaar zijn', contrastMetWit(licht) >= 4.5, licht);
  await page.emulateMedia({ colorScheme: 'dark' });
  const donker = await stijl(page, 'body', 'backgroundColor', '::before');
  const kop = await stijl(page, '.zijbalk', 'backgroundColor');
  check('in het donker de kleur van de kop, dus één vlak tot de bovenrand', donker === kop && contrastMetWit(donker) >= 4.5, `${donker} ${kop}`);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate(() => { document.documentElement.dataset.thema = 'donker'; });
  check('ook als je zelf donker kiest op een licht toestel', (await stijl(page, 'body', 'backgroundColor', '::before')) === kop);
  await page.evaluate(() => { delete document.documentElement.dataset.thema; });

  await page.evaluate(() => window.scrollTo(0, 600));
  const boven = await page.$eval('.zijbalk', (e) => e.getBoundingClientRect().top);
  check('de kop blijft bij scrollen onder de statusbalk plakken', boven === 59, String(boven));
  check('de tabbalk blijft boven het streepje onderin', (await stijl(page, '.nav', 'paddingBottom')) === '42px');

  await page.click('[data-race]');
  await page.waitForSelector('.opslaanbalk');
  await page.evaluate(() => window.scrollTo(0, 0));
  const balk = await page.evaluate(() => {
    const knoppen = [...document.querySelectorAll('.opslaanbalk button')].filter((k) => k.offsetParent);
    return { onder: Math.max(...knoppen.map((k) => k.getBoundingClientRect().bottom)), hoog: innerHeight };
  });
  check('in een race blijven Opslaan en Wis alles boven het streepje', balk.onder <= balk.hoog - 34, JSON.stringify(balk));
  const melding = await page.evaluate(() => {
    const d = document.createElement('div'); d.className = 'stillefout'; d.textContent = 'x';
    document.body.append(d); const b = getComputedStyle(d).bottom; d.remove(); return b;
  });
  check('en een foutmelding onderin ook', melding === '46px', melding);
  check('geen javascriptfouten (staand)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 3. liggend --------------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.setViewportSize({ width: 852, height: 393 });
  await meedoen(page);
  await randen(page, RANDEN.liggend);
  check('liggend niets onder de inkeping aan de zijkant', (await stijl(page, 'body', 'paddingLeft')) === '59px'
    && (await stijl(page, 'body', 'paddingRight')) === '59px');
  check('ook de tabbalk niet', (await stijl(page, '.nav', 'paddingLeft')) === '71px' && (await stijl(page, '.nav', 'paddingRight')) === '71px');
  check('geen javascriptfouten (liggend)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 4. zonder die randen ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.setViewportSize({ width: 393, height: 852 });
  await meedoen(page);
  const p = await page.$eval('body', (e) => getComputedStyle(e).padding);
  check('in Safari, op Android of een computer: geen ruimte erbij en geen strook', p === '0px'
    && (await stijl(page, 'body', 'height', '::before')) === '0px', p);
  check('de kop plakt gewoon bovenaan', await page.evaluate(() => { window.scrollTo(0, 600);
    return document.querySelector('.zijbalk').getBoundingClientRect().top === 0; }));
  check('geen javascriptfouten (zonder randen)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 5. de iPhone Duo -------------------------------------------------------------------------
for (const [naam, b, h, css] of [['dicht', 466, 678, RANDEN.staand], ['open', 626, 890, RANDEN.staand],
  ['open en dwars', 890, 626, RANDEN.liggend]]) {
  const { page, jsFouten, stoppen } = await startPagina();
  await page.setViewportSize({ width: b, height: h });
  await meedoen(page);
  await randen(page, css);
  const maat = await page.evaluate(() => {
    const nav = document.querySelector('.nav').getBoundingClientRect();
    return { over: document.documentElement.scrollWidth - innerWidth, navOnder: nav.bottom, hoog: innerHeight };
  });
  check(`iPhone Duo ${naam}: niets steekt opzij uit en de tabbalk staat onderaan`, maat.over === 0
    && Math.abs(maat.navOnder - maat.hoog) < 1, JSON.stringify(maat));
  check(`geen javascriptfouten (Duo ${naam})`, jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
