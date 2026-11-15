// Het drieluik op het uitslagscherm (15 november).
//
// Je punten stonden er groot, maar niet wat ze je brachten. Onder de punten
// staat nu je plek van dit weekend, en bij de laatst gereden race ook je plek
// in de stand en of je steeg of zakte. Wat hier vastligt:
//   1. Na de race, met medespelers: je plek dit weekend en in de stand.
//   2. Het derde vak (gestegen, gezakt, gelijk) pas vanaf de tweede race.
//   3. Bij een oudere race alleen het weekend: de stand van nu zegt niets
//      over toen.
//   4. Niet in je eentje, en niet zolang het weekend nog loopt.
//   5. Het past op een telefoon.

import { maakControle, startPagina, meedoen, naarLijst } from './hulp.mjs';

const { check, afronden } = maakControle('het drieluik op het uitslagscherm');
const { page, jsFouten, stoppen } = await startPagina();
await page.setViewportSize({ width: 390, height: 844 });
const LIJST = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];
const OM = [...LIJST].reverse();
const DAG = 24 * 3600e3;

// races: { id: { mijn, sanne, joe } } met per speler een lijst of null; een
// race in de lijst is gereden. raceUit: false laat alleen de kwalificatie binnen.
async function zet(races, { spelers = true, open = 1, raceUit = true } = {}) {
  await page.evaluate(({ races, spelers, LIJST, DAG, raceUit }) => {
    const db = globalThis.__db;
    db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
    if (spelers) db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Sanne', user_id: null },
      { member_id: 'lid-3', pool_id: 'pool-1', display_name: 'Joe', user_id: null });
    db.answers = [];
    for (const r of db.races) {
      const wat = races[r.id];
      r.quali_result = null; r.race_result = null;
      if (!wat) continue;
      r.drivers ??= db.races[0].drivers;
      const start = Date.now() - (40 - Number(r.round) * 7) * DAG;
      r.deadline_quali = new Date(start - DAG).toISOString();
      r.deadline_race = new Date(start).toISOString();
      r.quali_result = LIJST; r.race_result = raceUit ? LIJST : null;
      for (const [lid, lijst] of [['lid-1', wat.mijn], ['lid-2', wat.sanne], ['lid-3', wat.joe]]) {
        if (!lijst || !db.pool_members.some((m) => m.member_id === lid)) continue;
        for (const q of ['quali_top10', 'race_top10']) {
          db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: lid, question_id: q, waarde: lijst });
        }
      }
    }
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { races, spelers, LIJST, DAG, raceUit });
  await page.reload();
  await page.waitForSelector('.shell');
  await naarLijst(page);      // na herladen staat het racescherm van daarnet nog open
  await page.click(`[data-race="${open}"]`);
  await page.waitForSelector('#paneel');
  // Het tabblad van de race: daar staan de punten van het hele weekend bij.
  if (await page.isVisible('[data-tab="race"]')) await page.click('[data-tab="race"]');
  await page.locator('#paneel .scorekaart, #paneel .leeg, #paneel [data-grid], #paneel .grid10').first().waitFor({ timeout: 8000 }).catch(() => {});
}
const vakken = () => page.$$eval('[data-drieluik] [data-vak]', (v) => v.map((e) =>
  `${e.dataset.vak}:${e.querySelector('b').textContent}:${e.querySelector('i').textContent}`));

await meedoen(page);

// --- één race gereden: weekend en stand, nog geen wissel -------------------------
await zet({ 1: { mijn: LIJST, sanne: OM, joe: null } });
let v = await vakken();
check('na de race staat onder je punten je plek van dit weekend en je plek in de stand',
  v.length === 2 && v[0] === 'weekend:1e:van 3 dit weekend' && v[1] === 'stand:1e:in de stand', v.join(' | '));
check('het drieluik staat direct onder de kaart met je punten', await page.evaluate(() => {
  const s = document.querySelector('.scorekaart').getBoundingClientRect(), d = document.querySelector('.drieluik').getBoundingClientRect();
  return d.top >= s.bottom && d.top - s.bottom < 40;
}));

// --- twee races: de laatste heeft ook de wissel -----------------------------------
await zet({ 1: { mijn: OM, sanne: LIJST, joe: null }, 2: { mijn: LIJST, sanne: OM, joe: null } }, { open: 2 });
v = await vakken();
check('vanaf de tweede race staat er ook of je steeg: van 2e naar gedeeld 1e is +1',
  v.length === 3 && v[0] === 'weekend:1e:van 3 dit weekend' && v[1] === 'stand:1e:in de stand'
    && v[2] === 'wissel:+1:gestegen sinds vorige race', v.join(' | '));
// Sanne had in race 1 de eerste vijf goed en wint race 2: zij gaat erover.
await zet({ 1: { mijn: LIJST, sanne: [...LIJST.slice(0, 5), ...LIJST.slice(5).reverse()], joe: null },
  2: { mijn: OM, sanne: LIJST, joe: null } }, { open: 2 });
v = await vakken();
check('wie zakt ziet een min en "gezakt"', v[2]?.startsWith('wissel:-1:gezakt sinds vorige race') && v[0].startsWith('weekend:2e'), v.join(' | '));
await zet({ 1: { mijn: LIJST, sanne: OM, joe: null }, 2: { mijn: LIJST, sanne: OM, joe: null } }, { open: 2 });
v = await vakken();
check('en wie blijft staan ziet 0 en "gelijk gebleven"', v[2] === 'wissel:0:gelijk gebleven', v.join(' | '));

// --- een oudere race: alleen het weekend -------------------------------------------
await zet({ 1: { mijn: OM, sanne: LIJST, joe: null }, 2: { mijn: LIJST, sanne: OM, joe: null } }, { open: 1 });
v = await vakken();
check('bij een oudere race staat alleen het weekend, niet de stand van nu',
  v.length === 1 && v[0] === 'weekend:2e:van 3 dit weekend', v.join(' | '));

// --- wanneer niet ---------------------------------------------------------------------
await zet({ 1: { mijn: LIJST } }, { spelers: false });
check('in je eentje is er geen drieluik', (await page.$('[data-drieluik]')) === null && (await page.$('.scorekaart')) !== null);
await zet({ 1: { mijn: LIJST, sanne: OM, joe: null } }, { raceUit: false });
check('zolang alleen de kwalificatie binnen is ook niet', (await page.$('[data-drieluik]')) === null);

// --- op het scherm ----------------------------------------------------------------------
await page.setViewportSize({ width: 360, height: 760 });
await zet({ 1: { mijn: OM, sanne: LIJST, joe: null }, 2: { mijn: LIJST, sanne: OM, joe: null } }, { open: 2 });
check('op 360 pixels passen de drie vakken zonder horizontale scroll', await page.evaluate(() => {
  const k = [...document.querySelectorAll('[data-drieluik] [data-vak]')].map((e) => e.getBoundingClientRect());
  return k.length === 3 && k.every((r) => r.right <= 360) && document.documentElement.scrollWidth <= 360;
}));

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
