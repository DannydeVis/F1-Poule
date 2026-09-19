// De paars-groen-geel van een timingscherm, op je eigen voorspelling.
//
// "Wat vind je ervan dat we dezelfde kleuren als F1. Dus paars, groen en
// geel. Dus bijvoorbeeld als je het goed heb geraden dan word het paars?"
//
// Er was al een puntenschaal (.v5/.v3/.v1/.v0), maar die had stilletjes een
// trede minder dan de score zelf: één plek ernaast (3 punten) en twee plekken
// ernaast (1 punt) waren allebei amber. Dat is wat hier vastligt — vier
// scores, vier kleuren, en paars alleen voor raak.
//
// De kleuren zelf staan als variabele in de CSS en mogen best een andere tint
// krijgen; wat niet mag veranderen is wélke trede welke variabele pakt.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('punten in F1-kleuren');
const { page, jsFouten, stoppen } = await startPagina();

await meedoen(page);

// Eén uitslag met alle vier de treden erin: exact, één ernaast, twee ernaast
// en een coureur die niet eens finishte.
await page.evaluate(() => {
  const db = globalThis.__db;
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
  const gok     = ['1', '16', '81', '6', '44', '63', '12', '43', '10', '18'];
  const r = db.races[0];
  r.quali_result = uitslag;
  r.race_result = uitslag;
  r.deadline_quali = new Date(Date.now() - 6e6).toISOString();
  r.deadline_race = new Date(Date.now() - 5e6).toISOString();
  for (const vraag of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1',
      question_id: vraag, waarde: gok });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});

await page.reload();
await openRace(page, 'Melbourne');
await page.waitForSelector('#paneel .sr .pts');

const regels = await page.$$eval('#paneel .strip .sr .pts', (els) => els.map((e) => ({
  punten: e.textContent.trim(),
  kleur: getComputedStyle(e).color,
})));
const tint = (naam) => page.evaluate((n) =>
  getComputedStyle(document.documentElement).getPropertyValue(n).trim(), naam);

// De variabelen omrekenen naar hoe de browser ze teruggeeft, zodat de test
// over de kóppeling gaat en niet over de exacte tint.
const alsRgb = (hex) => page.evaluate((h) => {
  const d = document.createElement('span');
  d.style.color = h;
  document.body.append(d);
  const uit = getComputedStyle(d).color;
  d.remove();
  return uit;
}, hex);

const paars = await alsRgb(await tint('--paars'));
const groen = await alsRgb(await tint('--groen'));
const amber = await alsRgb(await tint('--amber'));

const van = (punten) => regels.find((r) => r.punten === punten)?.kleur;

check('alle vier de treden staan in deze uitslag',
  ['5', '3', '1', '0'].every((p) => regels.some((r) => r.punten === p)),
  regels.map((r) => r.punten).join(','));

check('exact voorspeld wordt paars', van('5') === paars, `${van('5')} tegen ${paars}`);
check('één plek ernaast wordt groen', van('3') === groen, `${van('3')} tegen ${groen}`);
check('twee plekken ernaast wordt geel', van('1') === amber, `${van('1')} tegen ${amber}`);

// Dit was de fout: 3 en 1 punt deelden dezelfde kleur, dus de schaal had een
// trede minder dan de score.
const kleuren = new Set(['5', '3', '1', '0'].map(van));
check('vier scores zijn ook echt vier kleuren', kleuren.size === 4,
  [...kleuren].join(' | '));

check('en paars is alleen voor raak, niet voor bijna',
  regels.filter((r) => r.kleur === paars).every((r) => r.punten === '5'),
  regels.filter((r) => r.kleur === paars).map((r) => r.punten).join(','));

// Groen en geel zijn precies het paar dat een kleurenblinde niet uit elkaar
// houdt. Zolang het getal ernaast staat is de kleur een extraatje en niet de
// enige drager van de informatie.
check('het aantal punten staat er altijd bij, kleur is nooit het enige signaal',
  regels.every((r) => /^\d+$/.test(r.punten)), regels.map((r) => r.punten).join(','));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
