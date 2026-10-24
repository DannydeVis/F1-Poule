#!/usr/bin/env node
/**
 * Wat de Play Store van de Android-app laat zien, in zeven talen: de titel, de
 * korte en lange omschrijving, "wat is er nieuw", schermafdrukken en de banner
 * (feature graphic). In de indeling van fastlane supply, zodat het later ook
 * vanzelf naar de Play Console kan:
 *
 *   <uit>/<taal>/title.txt, short_description.txt, full_description.txt
 *   <uit>/<taal>/changelogs/default.txt
 *   <uit>/<taal>/images/icon.png, featureGraphic.jpg
 *   <uit>/<taal>/images/phoneScreenshots/1-races.jpg ... 4-stand.jpg
 *
 *   node scripts/maak-winkel.mjs <uit>             alleen de teksten
 *   node scripts/maak-winkel.mjs <uit> --beelden   ook de plaatjes (Playwright)
 *
 * De teksten komen van de voorpagina (site/teksten.mjs): de kop, de stappen,
 * de functies, "geen advertenties" en de disclaimer. Wat alleen hier staat,
 * staat in site/winkel.mjs. De plaatjes gebruiken de voorbeeldpoule van de
 * voorpagina (scripts/voorbeeldpoule.mjs) in de nabootsing uit de tests.
 *
 * Niet in de repo: de workflow "Android-app" maakt het en zet het als bijlage
 * bij de run, naast de .aab.
 */

import { mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { teksten, TALEN } from '../site/teksten.mjs';
import { WINKEL, GRENZEN } from '../site/winkel.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');

// De winkeltekst van één taal.
export function winkelTekst(code) {
  const t = teksten[code];
  // "• Kop. Tekst", of "• Kop? Tekst" als de kop al een leesteken heeft.
  const lijst = (items) => items.map(([kop, tekst]) => `• ${kop}${/[?!.]$/.test(kop) ? '' : '.'} ${tekst}`).join('\n');
  return {
    titel: WINKEL.titel,
    kort: `${t.hero.kop.join(' ')} ${t.hero.boven}.`,
    lang: [
      t.hero.sub,
      `${t.stappen.kop}\n${lijst(t.stappen.items)}`,
      `${t.functies.kop}\n${lijst(t.functies.items)}`,
      `${t.privacy.kop}\n${t.privacy.tekst}`,
      t.voet.disclaimer,
    ].join('\n\n'),
    nieuw: WINKEL.talen[code].nieuw,
  };
}

// Wat de Play Console weigert: te lang, of HTML (die laat hij niet zien).
export function fouten(tekst) {
  const uit = [];
  for (const [veld, max] of Object.entries(GRENZEN)) {
    if ([...tekst[veld]].length > max) uit.push(`${veld} is ${[...tekst[veld]].length} tekens (max ${max})`);
    if (/<[a-z/][^>]*>/i.test(tekst[veld])) uit.push(`${veld} bevat HTML`);
  }
  return uit;
}

function teksten_(uit) {
  for (const code of TALEN) {
    const tekst = winkelTekst(code);
    const mis = fouten(tekst);
    if (mis.length) throw new Error(`${code}: ${mis.join(', ')}`);
    const map = join(uit, WINKEL.talen[code].taal);
    mkdirSync(join(map, 'changelogs'), { recursive: true });
    mkdirSync(join(map, 'images'), { recursive: true });
    writeFileSync(join(map, 'title.txt'), `${tekst.titel}\n`);
    writeFileSync(join(map, 'short_description.txt'), `${tekst.kort}\n`);
    writeFileSync(join(map, 'full_description.txt'), `${tekst.lang}\n`);
    writeFileSync(join(map, 'changelogs', 'default.txt'), `${tekst.nieuw}\n`);
    copyFileSync(join(wortel, 'android', 'store_icon.png'), join(map, 'images', 'icon.png'));
  }
}

// ---- de plaatjes -------------------------------------------------------------
// Schermafdrukken van 1080 bij 1920 (9:16, zoals de Play Store wil): een
// telefoon van 360 bij 640 met drie keer zoveel pixels. Donker, net als het
// icoon en de banner.
export const SCHERMEN = ['races', 'voorspellen', 'uitslag', 'stand'];

export async function schermafdrukken(code, map) {
  const { startPagina, meedoen } = await import('../test/hulp.mjs');
  const { vulPoule, POULENAAM } = await import('./voorbeeldpoule.mjs');
  const { page, stoppen } = await startPagina({ taal: code, schaal: 3 });
  await page.setViewportSize({ width: 360, height: 640 });
  await meedoen(page);
  await page.evaluate(vulPoule(), POULENAAM[code]);
  await page.reload();
  await page.waitForSelector('[data-weergave]');
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const kiek = async (nr, naam) => {
    await page.waitForTimeout(150);
    await page.mouse.move(0, 0);
    writeFileSync(join(map, `${nr}-${naam}.jpg`), await page.screenshot({ type: 'jpeg', quality: 88 }));
  };
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('.hero');
  await page.evaluate(() => window.scrollTo(0, 0));
  await kiek(1, 'races');
  // De kwalificatie van Shanghai, die staat open: de startgrid om je top 10
  // op te zetten (Danny heeft hem al ingevuld).
  await page.click('[data-race]:has(.nm:text-is("Shanghai"))');
  await page.waitForSelector('.grid10');
  await page.evaluate(() => window.scrollTo(0, 0));
  await kiek(2, 'voorspellen');
  await page.click('#terug');
  await page.click('[data-race]:has(.nm:text-is("Melbourne"))');
  await page.waitForSelector('.strip');
  await page.click('[data-tab="race"]');
  await page.waitForSelector('.score');
  await page.evaluate(() => {
    const kop = document.querySelector('.zijbalk')?.getBoundingClientRect().height ?? 0;
    window.scrollTo(0, document.querySelector('.score').getBoundingClientRect().top + window.scrollY - kop - 12);
  });
  await kiek(3, 'uitslag');
  await page.click('#terug');
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.podium');
  await page.evaluate(() => window.scrollTo(0, 0));
  await kiek(4, 'stand');
  await stoppen();
}

// De banner bovenaan de pagina in de Play Store: 1024 bij 500, zonder
// doorzichtigheid. Hetzelfde ontwerp als het deelplaatje van de site
// (scripts/maak-beelden.mjs), met de eerste schermafdruk op de telefoon.
export async function banner(code, telefoonPad, doel) {
  const { startPagina } = await import('../test/hulp.mjs');
  const t = teksten[code];
  const data = (pad, soort) => `data:${soort};base64,${readFileSync(pad).toString('base64')}`;
  const letter = (f) => data(join(wortel, 'lettertypen', f), 'font/woff2');
  const { page, stoppen } = await startPagina({ taal: code });
  await page.setViewportSize({ width: 1024, height: 500 });
  await page.setContent(`<!DOCTYPE html><html lang="${code}"><head><style>
    @font-face{font-family:K;src:url(${letter('barlow-condensed-700-latin.woff2')})}
    @font-face{font-family:K;src:url(${letter('barlow-condensed-700-latin-ext.woff2')});unicode-range:U+0100-02AF,U+1E00-1EFF}
    @font-face{font-family:M;src:url(${letter('space-mono-400-latin.woff2')})}
    *{box-sizing:border-box}body{margin:0;width:1024px;height:500px;overflow:hidden;background:#0b0b0c;color:#f2f3f5;position:relative}
    .gloed{position:absolute;inset:0;background:radial-gradient(60% 70% at 10% 10%,rgba(238,77,51,.28),transparent 60%)}
    .tekst{position:absolute;left:60px;top:58px;width:600px}
    .merk{display:flex;align-items:center;gap:12px;font-family:K;font-size:30px;text-transform:uppercase;letter-spacing:.03em}
    .merk img{width:34px;height:34px}
    h1{font-family:K;font-size:78px;line-height:.9;text-transform:uppercase;margin:44px 0 22px}
    h1 span{display:block}h1 span+span{color:#ee4d33}
    p{font-family:M;font-size:19px;letter-spacing:.12em;text-transform:uppercase;color:#7ee0a3;margin:0}
    .tel{position:absolute;right:70px;top:40px;width:220px;border-radius:28px;border:7px solid #1d1f24;overflow:hidden;
      transform:rotate(-3deg);box-shadow:0 40px 80px -20px rgba(0,0,0,.8)}
    .tel img{display:block;width:100%}
  </style></head><body><div class="gloed"></div>
    <div class="tekst"><div class="merk"><img src="${data(join(wortel, 'pictogrammen', 'predicttherace-logo.png'), 'image/png')}" alt="">Predict the Race</div>
      <h1>${t.hero.kop.map((r) => `<span>${r}</span>`).join('')}</h1><p>${t.hero.boven}</p></div>
    <div class="tel"><img src="${data(telefoonPad, 'image/jpeg')}"></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const kop = await page.evaluate(() => {
    const woorden = [...document.querySelectorAll('h1 span')].map((s) => {
      const r = document.createRange(); r.selectNodeContents(s); return r.getBoundingClientRect().right; });
    return { rechts: Math.max(...woorden), onder: document.querySelector('.tekst').getBoundingClientRect().bottom };
  });
  if (kop.rechts > 700 || kop.onder > 480) {
    throw new Error(`${code}: de kop van de banner past niet (${Math.round(kop.rechts)} breed, ${Math.round(kop.onder)} hoog)`);
  }
  writeFileSync(doel, await page.screenshot({ type: 'jpeg', quality: 90 }));
  await stoppen();
}

async function maak() {
  const uit = resolve(process.argv[2] ?? join(wortel, 'android', 'winkel'));
  teksten_(uit);
  if (process.argv.includes('--beelden')) {
    for (const code of TALEN) {
      const beelden = join(uit, WINKEL.talen[code].taal, 'images');
      const schermen = join(beelden, 'phoneScreenshots');
      mkdirSync(schermen, { recursive: true });
      await schermafdrukken(code, schermen);
      await banner(code, join(schermen, '1-races.jpg'), join(beelden, 'featureGraphic.jpg'));
      console.log(`${code}: teksten en plaatjes`);
    }
  }
  console.log(`Klaar: ${uit}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await maak();
