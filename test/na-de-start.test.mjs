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
//      race een knop naar de uitslag en punten van de vorige (niet van een
//      ouder weekend als die uitslag uitblijft).
//   6. Staat de app open terwijl die tijd verstrijkt, dan tekent hij de
//      races zelf opnieuw.

import { maakControle, startPagina, meedoen, naarLijst } from './hulp.mjs';

const { check, afronden } = maakControle('de kaart van het weekend van nu');
const tekst = async (page, kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();
const kaart = (page) => page.$('[data-lopend]');
const UUR = 3600e3;
const LIJST = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];

async function zet(page, { start, quali = null, race = null, volgende = 10 * 24 * UUR, alleen = false }) {
  await page.evaluate(({ start, quali, race, volgende, alleen, LIJST }) => {
    const db = globalThis.__db;
    const r = db.races.find((x) => x.id === 1);
    r.deadline_quali = new Date(Date.now() + start - 24 * 3600e3).toISOString();
    r.deadline_race = new Date(Date.now() + start).toISOString();
    r.quali_result = quali; r.race_result = race;
    const v = db.races.find((x) => x.id === 2);
    v.deadline_quali = new Date(Date.now() + volgende).toISOString();
    v.deadline_race = new Date(Date.now() + volgende + 24 * 3600e3).toISOString();
    v.quali_result = null; v.race_result = null;
    // De race daarna ver weg, zodat "de volgende race" altijd ronde 2 is.
    const d = db.races.find((x) => x.id === 3);
    d.deadline_quali = new Date(Date.now() + 30 * 24 * 3600e3).toISOString();
    d.deadline_race = new Date(Date.now() + 31 * 24 * 3600e3).toISOString();
    db.pool_members = db.pool_members.filter((m) => m.member_id !== 'lid-2');
    if (!alleen) db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Sanne', user_id: null });
    db.answers = db.answers.filter((a) => a.race_id !== 1);
    for (const q of ['quali_top10', 'race_top10']) {
      db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: 'lid-1', question_id: q, waarde: LIJST });
    }
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { start, quali, race, volgende, alleen, LIJST });
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

await zet(page, { start: -3 * UUR, quali: LIJST, race: LIJST, alleen: true });
const solo = await tekst(page, '[data-lopend="uitslag"] .kaartvoet');
check('in je eentje: je punten dit weekend en je totaal, zonder plek',
  solo.includes('+100') && solo.includes('100punten') && !solo.includes('in de stand'), solo);

await zet(page, { start: -40 * UUR, quali: LIJST, race: LIJST, volgende: 49 * UUR });
check('sluit de volgende race over 49 uur, dan nog steeds alleen', (await kaart(page)) !== null && (await page.$('.hero')) === null);

await zet(page, { start: -40 * UUR, quali: LIJST, race: LIJST, volgende: 47 * UUR });
check('sluit de volgende race binnen twee dagen, dan staat die eronder', await page.evaluate(() => {
  const k = document.querySelector('[data-lopend]'); const h = document.querySelector('.hero');
  return !!k && !!h && h.querySelector('.heronaam').textContent.trim() === 'Shanghai'
    && !!(k.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING);
}));
check('en dan zonder de knop naar de vorige uitslag, want die staat erboven', (await page.$('.hero [data-vorige-uitslag]')) === null);

await zet(page, { start: -49 * UUR, quali: LIJST, race: LIJST });
check('twee dagen na de start is hij weg en staat de volgende race er weer', (await kaart(page)) === null && (await page.$('.hero')) !== null);
const vorige = await tekst(page, '.hero [data-vorige-uitslag]');
check('met een duidelijke knop naar de punten van de vorige race', vorige === 'Uitslag en punten Melbourne', vorige);
check('de kaart van de volgende race heeft één knop naar die race zelf',
  (await page.$$('.hero [data-naar-race]')).length === 1);
await page.click('.hero [data-vorige-uitslag]');
await page.waitForSelector('#paneel');
check('die de vorige race opent', (await tekst(page, '#paneel')).includes('Melbourne'));

// Blijft de uitslag uit, dan wijst de knop niet naar een ouder weekend.
await zet(page, { start: -49 * UUR, quali: LIJST });
check('zonder uitslag van de vorige race geen knop', (await page.$('.hero')) !== null
  && (await page.$('.hero [data-vorige-uitslag]')) === null);

// De app blijft openstaan terwijl de twee dagen verstrijken: de klok van de
// app (elke 30 seconden) tekent de races dan zelf opnieuw.
// (De nepklok eerst: hij vangt alleen de timers die daarna gezet worden.)
await page.clock.install();
await zet(page, { start: -48 * UUR + 90e3, quali: LIJST, race: LIJST });
check('anderhalve minuut voor het eind staat de kaart er nog', (await kaart(page)) !== null && (await page.$('.hero')) === null);
await page.clock.fastForward(150e3);
await page.waitForSelector('.hero', { timeout: 5000 }).catch(() => {});
check('en zonder een tik maakt hij plaats voor de volgende race',
  (await kaart(page)) === null && (await page.$('.hero')) !== null);

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
