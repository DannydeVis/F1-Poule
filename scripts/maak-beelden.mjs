#!/usr/bin/env node
/**
 * De plaatjes voor de landingspagina: schermafdrukken van de app en een
 * deelplaatje (Open Graph) per taal.
 *
 *   node scripts/maak-beelden.mjs        schermafdrukken én deelplaatjes
 *   node scripts/maak-beelden.mjs og     alleen de deelplaatjes
 *
 * Geen onderdeel van de gewone gang van zaken: draai dit als de app er anders
 * uit is gaan zien, en zet de nieuwe plaatjes in de repo. Het gebruikt de
 * nabootsing uit de tests, dus er is geen database en geen internet voor
 * nodig, en de namen in beeld zijn verzonnen.
 *
 *   site/beeld/{races,uitslag,stand}-{nl,en}-{licht,donker}.jpg
 *   site/og/og-{taal}.jpg
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPagina, meedoen } from '../test/hulp.mjs';
import { teksten, TALEN } from '../site/teksten.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(wortel, 'site', 'beeld'), { recursive: true });
mkdirSync(join(wortel, 'site', 'og'), { recursive: true });

// Een poule halverwege het seizoen: Melbourne gereden, Shanghai staat open.
const vulPoule = (naam) => (poulenaam) => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  Object.assign(db.races[0], { deadline_quali: u(-60), deadline_race: u(-40),
    quali_result: uitslag, race_result: uitslag, winnaar: null });
  Object.assign(db.races[1], { deadline_quali: u(46), deadline_race: u(70) });
  for (const r of db.races.slice(2)) if (!(r.drivers ?? []).length) r.drivers = db.races[0].drivers;
  db.pools[0].name = poulenaam;
  // Alleen de twee top 10's: dan staat er in de uitslag geen rij "komt nog"
  // voor losse vragen, en gaat het plaatje over waar het om draait.
  db.pool_questions = (db.pool_questions ?? []).filter((q) => q.pool_id !== 'pool-1')
    .concat([{ pool_id: 'pool-1', question_id: 'quali_top10' }, { pool_id: 'pool-1', question_id: 'race_top10' }]);
  const spelers = [['lid-2', 'Sophie'], ['lid-3', 'Michael'], ['lid-4', 'Lotte'], ['lid-5', 'Joey']];
  for (const [id, n] of spelers) {
    db.pool_members.push({ member_id: id, pool_id: 'pool-1', display_name: n, user_id: null });
  }
  const tips = {
    'lid-1': ['4', '1', '16', '81', '63', '12', '44', '10', '14', '18'],
    'lid-2': ['1', '4', '16', '63', '81', '44', '14', '12', '18', '10'],
    'lid-3': ['16', '1', '4', '44', '63', '81', '12', '10', '6', '14'],
    'lid-4': ['1', '16', '4', '81', '44', '63', '10', '12', '14', '43'],
    'lid-5': ['4', '16', '1', '63', '44', '12', '81', '18', '6', '10'],
  };
  for (const [lid, v] of Object.entries(tips)) {
    for (const q of ['quali_top10', 'race_top10']) {
      db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: lid, question_id: q,
        waarde: v, updated_at: u(-70) });
    }
  }
  // Danny heeft de kwalificatie van Shanghai al ingevuld: dan staat er een
  // vinkje bij de sessie op de weekendkaart.
  db.answers.push({ pool_id: 'pool-1', race_id: 2, member_id: 'lid-1', question_id: 'quali_top10',
    waarde: tips['lid-1'], updated_at: u(-1) });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
};

async function schermen(taal, poulenaam) {
  const { page, stoppen } = await startPagina({ taal });
  await page.setViewportSize({ width: 390, height: 844 });
  await meedoen(page);
  await page.evaluate(vulPoule(), poulenaam);
  await page.reload();
  await page.waitForSelector('[data-weergave]');
  for (const [thema, schema] of [['licht', 'light'], ['donker', 'dark']]) {
    await page.emulateMedia({ colorScheme: schema, reducedMotion: 'reduce' });
    const kiek = async (naam) => {
      await page.waitForTimeout(150);
      await page.mouse.move(0, 0);
      const buf = await page.screenshot({ type: 'jpeg', quality: 78 });
      writeFileSync(join(wortel, 'site', 'beeld', `${naam}-${taal}-${thema}.jpg`), buf);
    };
    await page.click('[data-weergave="races"]');
    await page.waitForSelector('.hero');
    await page.evaluate(() => window.scrollTo(0, 0));
    await kiek('races');
    await page.click('[data-race]:has(.nm:text-is("Melbourne"))');
    await page.waitForSelector('.strip');
    await page.click('[data-tab="race"]');
    await page.waitForSelector('.score');
    await page.evaluate(() => window.scrollTo(0, 0));
    await kiek('uitslag');
    await page.click('#terug');
    await page.click('[data-weergave="stand"]');
    await page.waitForSelector('.podium');
    await page.evaluate(() => window.scrollTo(0, 0));
    await kiek('stand');
  }
  await stoppen();
}

const ALLEEN_OG = process.argv.includes('og');
if (!ALLEEN_OG) {
  await schermen('nl', 'Vrijdagmiddagpoule');
  await schermen('en', 'Sunday Grid Club');
}

// ---- deelplaatjes ----------------------------------------------------------
// Eén per taal: wat WhatsApp, Google, LinkedIn en de rest laten zien als
// iemand een link naar de site deelt. Donker, met de kop van de landingspagina
// ("Voorspel de grid. Versla je vrienden.") en een telefoon met de app zelf
// ernaast: zo zie je meteen wat het is. In HTML getekend met de letters van de
// app, en dan gefotografeerd.
//
// Er heeft even een licht plaatje gestaan (een racebaan met "Voorspel. Speel.
// Win."), maar dat zei te weinig over wat de app doet; dit is het terug, nu met
// het logo in plaats van het rode blokje.
//
// 1200×630 en ruim onder de 300 kB, want daarboven laat WhatsApp het plaatje
// weg. De telefoon is de donkere schermafdruk hierboven, dus draai dit na een
// verandering in de app zonder "og", anders staat de oude app erop.
const lettertype = (bestand) =>
  `data:font/woff2;base64,${readFileSync(join(wortel, 'lettertypen', bestand)).toString('base64')}`;
const logo = `data:image/png;base64,${readFileSync(join(wortel, 'pictogrammen', 'predicttherace-logo.png')).toString('base64')}`;
const { page, stoppen } = await startPagina({ taal: 'nl' });
await page.setViewportSize({ width: 1200, height: 630 });
for (const code of TALEN) {
  const t = teksten[code];
  const telefoon = `data:image/jpeg;base64,${readFileSync(join(wortel, 'site', 'beeld',
    `races-${t.schermen}-donker.jpg`)).toString('base64')}`;
  await page.setContent(`<!DOCTYPE html><html lang="${code}"><head><style>
    @font-face{font-family:K;src:url(${lettertype('barlow-condensed-700-latin.woff2')})}
    @font-face{font-family:K;src:url(${lettertype('barlow-condensed-700-latin-ext.woff2')});
      unicode-range:U+0100-02AF,U+1E00-1EFF}
    @font-face{font-family:B;src:url(${lettertype('barlow-600-latin.woff2')})}
    @font-face{font-family:M;src:url(${lettertype('space-mono-400-latin.woff2')})}
    *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#0b0b0c;color:#f2f3f5;
      font-family:B;position:relative}
    .gloed{position:absolute;inset:0;background:radial-gradient(60% 70% at 10% 10%,rgba(238,77,51,.28),transparent 60%)}
    .p1{position:absolute;right:250px;top:-70px;font-family:K;font-size:520px;line-height:1;color:#fff;opacity:.04}
    .tekst{position:absolute;left:72px;top:70px;width:660px}
    .merk{display:flex;align-items:center;gap:14px;font-family:K;font-size:34px;text-transform:uppercase;letter-spacing:.03em}
    .blok{width:38px;height:38px;display:block}
    h1{font-family:K;font-size:94px;line-height:.9;text-transform:uppercase;margin:58px 0 26px}
    h1 span{display:block}h1 span+span{color:#ee4d33}
    p{font-family:M;font-size:22px;letter-spacing:.12em;text-transform:uppercase;color:#7ee0a3;margin:0}
    .tel{position:absolute;right:86px;top:56px;width:260px;border-radius:32px;border:8px solid #1d1f24;overflow:hidden;
      transform:rotate(-3deg);box-shadow:0 40px 80px -20px rgba(0,0,0,.8)}
    .tel img{display:block;width:100%}
  </style></head><body><div class="gloed"></div><div class="p1">P1</div>
    <div class="tekst"><div class="merk"><img class="blok" src="${logo}" alt="">Predict the Race</div>
      <h1>${t.hero.kop.map((r) => `<span>${r}</span>`).join('')}</h1><p>${t.hero.boven}</p></div>
    <div class="tel"><img src="${telefoon}"></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  // De kop mag niet onder de telefoon doorlopen, en niet onderuit.
  const kop = await page.evaluate(() => {
    const vak = document.querySelector('.tekst').getBoundingClientRect();
    const woorden = [...document.querySelectorAll('h1 span')].map((s) => {
      const r = document.createRange(); r.selectNodeContents(s); return r.getBoundingClientRect().right; });
    return { rechts: Math.max(...woorden), onder: vak.bottom };
  });
  if (kop.rechts > 820 || kop.onder > 600) {
    throw new Error(`${code}: de kop past niet (${Math.round(kop.rechts)} breed, ${Math.round(kop.onder)} hoog)`);
  }
  await page.waitForTimeout(100);
  writeFileSync(join(wortel, 'site', 'og', `og-${code}.jpg`),
    await page.screenshot({ type: 'jpeg', quality: 86 }));
}
await stoppen();
console.log('Beelden gemaakt in site/beeld en site/og.');
