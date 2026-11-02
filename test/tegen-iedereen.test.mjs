// "Beter dan p% van alle spelers" in de app (Danny, 1 november), in de browser.
//
// "In de app na elke sessie bij je score: Beter dan {p}% van alle spelers."
// De sync zet de cijfers over alle spelers samen in de openbare tabel
// spelerscijfers (scripts/spelerscijfers.mjs); de app rekent met de verdeling
// van de punten op de top 10 uit hoeveel procent lager scoorde. Wat hier
// vastligt:
//   1. Op het uitslagscherm staat bij je punten "Je top 10: beter dan p% van
//      alle spelers", met p naar beneden afgerond, per sessie (de kwalificatie
//      en de race elk met hun eigen verdeling). De som is die van de sync.
//   2. Niet bij een sessie zonder cijfers (onder de drempel), niet als je
//      niemand voorbij was, en niet bij een lijst die de app automatisch
//      invulde.
//   3. In het Engels. En een database zonder de tabel: geen regel en geen fout.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';
import { beterDan, topPunten } from '../scripts/spelerscijfers.mjs';

const { check, afronden } = maakControle('beter dan p% van alle spelers, in de app');
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
const MIJN_RACE = UIT.slice(0, 10);
const MIJN_QUALI = ['4', '1', '16', '63', '81', '44', '12', '14', '10', '18'];
const RACE_VERDELING = { 0: 10, 30: 20, 50: 30 };
const QUALI_VERDELING = { 10: 15, 30: 15, 42: 20, 46: 10 };

const vangen = (p) => p.addInitScript(() => {
  try { localStorage.setItem('poule:verhaal', 'uit'); } catch { /* niets */ }
});

// Melbourne gereden, met een uitslag; Danny vulde de kwalificatie en de race
// zelf in. Cijfers voor allebei; Shanghai is gereden zonder cijfers.
const zet = (page, { cijfers = true, eigen = true, autofill = false, zonderTabel = false } = {}) => page.evaluate(
  ({ UIT, MIJN_RACE, MIJN_QUALI, RACE_VERDELING, QUALI_VERDELING, cijfers, eigen, autofill, zonderTabel }) => {
    const db = globalThis.__db;
    const [mel, sha] = db.races;
    for (const [i, r] of [[0, mel], [1, sha]]) {
      r.quali_result = UIT; r.race_result = UIT;
      r.deadline_quali = new Date(Date.now() - (60 - i * 10) * 36e5).toISOString();
      r.deadline_race = new Date(Date.now() - (40 - i * 10) * 36e5).toISOString();
    }
    db.answers = eigen ? [
      { pool_id: 'pool-1', race_id: mel.id, member_id: 'lid-1', question_id: 'race_top10', waarde: MIJN_RACE },
      { pool_id: 'pool-1', race_id: mel.id, member_id: 'lid-1', question_id: 'quali_top10', waarde: MIJN_QUALI },
      { pool_id: 'pool-1', race_id: sha.id, member_id: 'lid-1', question_id: 'race_top10', waarde: MIJN_RACE },
    ] : [];
    db.pools[0].autofill_vanaf = autofill ? new Date(Date.now() - 900 * 36e5).toISOString() : null;
    db.spelerscijfers = cijfers ? [
      { seizoen: mel.season, ronde: mel.round, sessie: 'race', spelers: 60, poules: 6, cijfers: { verdeling: RACE_VERDELING } },
      { seizoen: mel.season, ronde: mel.round, sessie: 'quali', spelers: 60, poules: 6, cijfers: { verdeling: QUALI_VERDELING } },
    ] : [];
    if (zonderTabel) delete db.spelerscijfers;
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { UIT, MIJN_RACE, MIJN_QUALI, RACE_VERDELING, QUALI_VERDELING, cijfers, eigen, autofill, zonderTabel });

const regel = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-tegen-iedereen]');
  return el ? { tekst: el.textContent.replace(/\s+/g, ' ').trim(), p: el.dataset.tegenIedereen } : null;
});
const tab = async (page, welk) => {
  await page.click(`.tabs button[data-tab="${welk}"]`);
  await page.waitForSelector('#paneel .scorekaart');
};

const pRace = beterDan(RACE_VERDELING, topPunten(MIJN_RACE, UIT, 'race'));
const pQuali = beterDan(QUALI_VERDELING, topPunten(MIJN_QUALI, UIT, 'quali'));

{
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: vangen });
  await meedoen(page);
  await zet(page);
  await page.reload();
  await openRace(page, 'Melbourne');
  await tab(page, 'race');
  const r = await regel(page);
  check(`bij de race: "Je top 10: beter dan ${pRace}% van alle spelers"`,
    pRace === 50 && r?.tekst === `Je top 10: beter dan ${pRace}% van alle spelers`, JSON.stringify(r));
  await tab(page, 'quali');
  const q = await regel(page);
  check(`bij de kwalificatie de eigen verdeling: ${pQuali}%`,
    pQuali === 83 && q?.tekst === `Je top 10: beter dan ${pQuali}% van alle spelers`, JSON.stringify(q));
  check('dezelfde som als de sync (beterDan in scripts/spelerscijfers.mjs)',
    Number(r?.p) === pRace && Number(q?.p) === pQuali, `${r?.p} ${q?.p}`);

  // Shanghai heeft geen cijfers: onder de drempel staat er niets.
  await openRace(page, 'Shanghai');
  await tab(page, 'race');
  check('een sessie zonder cijfers: geen regel', (await regel(page)) === null);

  // Niemand voorbij: de laagste score in de verdeling.
  await page.evaluate(({ UIT }) => {
    const db = globalThis.__db;
    db.spelerscijfers[0].cijfers.verdeling = { 50: 40, 60: 20 };
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { UIT });
  await page.reload();
  await openRace(page, 'Melbourne');
  await tab(page, 'race');
  check('wie niemand voorbij was: geen "beter dan 0%"', (await regel(page)) === null, JSON.stringify(await regel(page)));
  check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

{
  // Automatisch ingevuld: Danny vulde niets in, de poule vult aan. De punten
  // staan er, maar de vergelijking niet: die lijst telt bij iedereen ook niet mee.
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: vangen });
  await meedoen(page);
  await zet(page, { eigen: false, autofill: true });
  await page.reload();
  await openRace(page, 'Melbourne');
  await tab(page, 'race');
  const auto = await page.evaluate(() => !!document.querySelector('#paneel')?.textContent.includes('automatisch ingevuld'));
  check('een automatisch ingevulde lijst: geen regel', auto && (await regel(page)) === null,
    `${auto} ${JSON.stringify(await regel(page))}`);
  check('geen javascriptfouten bij automatisch invullen', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

{
  const { page, jsFouten, stoppen } = await startPagina({ taal: 'en', voorafAan: vangen });
  await meedoen(page);
  await zet(page);
  await page.reload();
  await openRace(page, 'Melbourne');
  await tab(page, 'race');
  const r = await regel(page);
  check('in het Engels', r?.tekst === `Your top 10: better than ${pRace}% of all players`, JSON.stringify(r));
  check('geen javascriptfouten in het Engels', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

{
  // Een database zonder de tabel (schema.sql nog niet opnieuw gedraaid).
  const { page, jsFouten, stoppen } = await startPagina({ voorafAan: vangen });
  await meedoen(page);
  await zet(page, { zonderTabel: true });
  await page.reload();
  await openRace(page, 'Melbourne');
  await tab(page, 'race');
  const punten = await page.evaluate(() => document.querySelector('.scorekaart .getal')?.textContent.trim());
  check('zonder de tabel: de uitslag gewoon, zonder regel en zonder fout',
    punten && (await regel(page)) === null && jsFouten.length === 0, `${punten} · ${jsFouten.join(' | ')}`);
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
