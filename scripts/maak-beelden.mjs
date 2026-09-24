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
// iemand een link naar de site deelt. Het ontwerp is van Danny: de baan uit
// site/bron/baan.webp met rechts de bocht, links PREDICT THE RACE met de rode
// streep, een korte regel in de taal van de pagina (ogRegel in teksten.mjs) en
// het domein. De maten zijn nagemeten op zijn voorbeeld.
//
// In DejaVu Sans, niet in de letters van de site: zo zag het voorbeeld eruit.
// Die letter staat op elke Linux (en in deze omgeving), maar niet op een Mac;
// daarom stopt het script als hij ontbreekt, in plaats van stilletjes in een
// andere letter te tekenen. 1200×630 en ruim onder de 300 kB, want daarboven
// laat WhatsApp het plaatje weg.
const baan = `data:image/webp;base64,${readFileSync(join(wortel, 'site', 'bron', 'baan.webp')).toString('base64')}`;
const { page, stoppen } = await startPagina({ taal: 'nl' });
await page.setViewportSize({ width: 1200, height: 630 });
for (const code of TALEN) {
  const t = teksten[code];
  await page.setContent(`<!DOCTYPE html><html lang="${code}"><head><style>
    *{box-sizing:border-box}
    body{margin:0;width:1200px;height:630px;overflow:hidden;position:relative;
      background:#f6f3ee url(${baan}) center/cover no-repeat;font-family:'DejaVu Sans'}
    .streep{position:absolute;left:76px;top:161px;width:14px;height:110px;border-radius:7px;background:#e5402a}
    h1{position:absolute;left:117px;top:161px;margin:0;font-size:58px;line-height:66px;font-weight:700;color:#152231}
    p{position:absolute;left:79px;top:323px;margin:0;font-size:30.8px;color:#344252}
    .domein{position:absolute;left:79px;top:505px;font-size:24px;font-weight:700;color:#df4527}
  </style></head><body><div class="streep"></div><h1>PREDICT<br>THE RACE</h1>
    <p>${t.ogRegel}</p><div class="domein">predicttherace.com</div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  // Of een systeemletter er is zie je alleen aan de maat: ontbreekt hij, dan
  // valt de browser terug op de volgende in de rij en wordt de tekst anders
  // breed. document.fonts.check() zegt bij systeemletters altijd ja.
  const erIs = await page.evaluate(() => {
    const maat = (f) => { const c = document.createElement('canvas').getContext('2d');
      c.font = `700 58px ${f}`; return c.measureText('PREDICT THE RACE').width; };
    return maat("'DejaVu Sans', monospace") !== maat('monospace')
      && maat("'DejaVu Sans', serif") !== maat('serif');
  });
  if (!erIs) throw new Error('DejaVu Sans ontbreekt; draai dit op Linux');
  // Past de regel? Hij mag niet onder de baan doorlopen.
  const breed = await page.evaluate(() => document.querySelector('p').getBoundingClientRect().right);
  if (breed > 560) throw new Error(`${code}: de regel "${t.ogRegel}" is te lang (${Math.round(breed)} px)`);
  await page.waitForTimeout(50);
  writeFileSync(join(wortel, 'site', 'og', `og-${code}.jpg`),
    await page.screenshot({ type: 'jpeg', quality: 86 }));
}
await stoppen();
console.log('Beelden gemaakt in site/beeld en site/og.');
