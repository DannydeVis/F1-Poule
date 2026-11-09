// De kaart van het weekend van nu, bovenaan de races (8 november).
//
// Danny, tijdens de race in São Paulo: liever een uurtje of een dag iets
// anders bovenaan dan de volgende race, "zodat mensen hun uitslag bovenaan
// zien staan". Wat hier vastligt:
//   1. Vóór de start van de race geen kaart.
//   2. Na de start, zonder uitslag: "nu bezig", met je top 3 voor de race
//      (codes niet vertaalbaar), de punten van de kwalificatie tot nu toe, en
//      een knop naar je voorspelling. De kaart staat boven de volgende race.
//   3. Met de uitslag: je punten dit weekend, je plek dat weekend en in de
//      stand, en wie het weekend won.
//   4. Zolang hij er staat, staat de volgende race er niet onder, tenzij die
//      binnen twee dagen sluit.
//   5. Twee dagen (48 uur) na de start is hij weg; dan staat bij de volgende
//      race een knop naar de uitslag en punten van de vorige.

import { maakControle, startPagina, meedoen, naarLijst } from './hulp.mjs';

const { check, afronden } = maakControle('de kaart van het weekend van nu');
const tekst = async (page, kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();
const kaart = (page) => page.$('[data-lopend]');
const UUR = 3600e3;
const LIJST = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];

async function zet(page, { start, quali = null, race = null, volgende = 10 * 24 * UUR }) {
  await page.evaluate(({ start, quali, race, volgende, LIJST }) => {
    const db = globalThis.__db;
    const r = db.races.find((x) => x.id === 1);
    r.deadline_quali = new Date(Date.now() + start - 24 * 3600e3).toISOString();
    r.deadline_race = new Date(Date.now() + start).toISOString();
    r.quali_result = quali; r.race_result = race;
    const v = db.races.find((x) => x.id === 2);
    v.deadline_quali = new Date(Date.now() + volgende).toISOString();
    v.deadline_race = new Date(Date.now() + volgende + 24 * 3600e3).toISOString();
    v.quali_result = null; v.race_result = null;
    db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Sanne', user_id: null });
    db.pool_members = db.pool_members.filter((m, i, a) => a.findIndex((x) => x.member_id === m.member_id) === i);
    db.answers = db.answers.filter((a) => a.race_id !== 1);
    for (const q of ['quali_top10', 'race_top10']) {
      db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: 'lid-1', question_id: q, waarde: LIJST });
    }
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { start, quali, race, volgende, LIJST });
  await page.reload();
  await page.waitForSelector('.shell');
  await naarLijst(page);
}

const { page, jsFouten, stoppen } = await startPagina();
await meedoen(page);

await zet(page, { start: 2 * UUR });
check('vóór de start van de race geen kaart', (await kaart(page)) === null);

await zet(page, { start: -1 * UUR, quali: LIJST });
const bezig = await tekst(page, '[data-lopend="bezig"]');
check('na de start: "nu bezig", met je top 3 voor de race',
  bezig.includes('nu bezig · ronde 01') && bezig.includes('Melbourne') && bezig.includes('VER · ANT · RUS'), bezig);
check('de codes zijn niet vertaalbaar', await page.$eval('[data-lopend] b.code', (b) => b.closest('[translate="no"]') !== null));
check('met de punten van de kwalificatie tot nu toe', bezig.includes('+50') && bezig.includes('tot nu toe'), bezig);
check('en een knop naar je voorspelling', bezig.includes('Je voorspelling bekijken'));
check('alleen deze kaart: de volgende race staat er niet onder', (await page.$('.hero')) === null);
await page.click('[data-lopend] [data-naar-race]');
await page.waitForSelector('#paneel');
check('de knop opent de race', (await tekst(page, '#paneel')).includes('Melbourne'));

await zet(page, { start: -3 * UUR, quali: LIJST, race: LIJST });
const uitslag = await tekst(page, '[data-lopend="uitslag"]');
check('met de uitslag: je punten, je plek dat weekend en in de stand',
  uitslag.includes('uitslag · ronde 01') && uitslag.includes('+100') && uitslag.includes('1e')
    && uitslag.includes('van 2 dit weekend') && uitslag.includes('in de stand'), uitslag);
check('en wie het weekend won', uitslag.includes('Weekendwinst: Danny.'), uitslag);

await zet(page, { start: -40 * UUR, quali: LIJST, race: LIJST });
check('op maandag staat hij er nog, en nog steeds alleen', (await kaart(page)) !== null && (await page.$('.hero')) === null);

await zet(page, { start: -40 * UUR, quali: LIJST, race: LIJST, volgende: 30 * UUR });
check('sluit de volgende race binnen twee dagen, dan staat die eronder', await page.evaluate(() => {
  const k = document.querySelector('[data-lopend]'); const h = document.querySelector('.hero');
  return !!k && !!h && !!(k.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING);
}));
check('en dan zonder de knop naar de vorige uitslag, want die staat erboven', (await page.$('.hero [data-vorige-uitslag]')) === null);

await zet(page, { start: -49 * UUR, quali: LIJST, race: LIJST });
check('twee dagen na de start is hij weg en staat de volgende race er weer', (await kaart(page)) === null && (await page.$('.hero')) !== null);
const vorige = await tekst(page, '.hero [data-vorige-uitslag]');
check('met een duidelijke knop naar de punten van de vorige race', vorige === 'Uitslag en punten Melbourne', vorige);
await page.click('.hero [data-vorige-uitslag]');
await page.waitForSelector('#paneel');
check('die de vorige race opent', (await tekst(page, '#paneel')).includes('Melbourne'));

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
