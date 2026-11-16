// Reacties op elkaars weekend (15 november).
//
// Onder elke speler in "De poule" op het uitslagscherm kun je een van vijf
// vaste reacties zetten. Danny: hier mogen emoji. Geen vrije tekst, dus niets
// om te modereren. Wat hier vastligt:
//   1. Na een uitslag staat onder elke medespeler een plusje; een tik erop
//      laat de vijf reacties zien.
//   2. Een reactie kiezen zet hem erbij met een teller, gaat naar de database
//      en sluit de keuze. Nog een keer tikken haalt hem weg, een andere kiezen
//      wisselt.
//   3. Reacties van anderen tellen op, met de namen erbij voor wie niet kan
//      zien.
//   4. Onder je eigen regel staat wat je kreeg, zonder knoppen: op jezelf
//      reageren kan niet.
//   5. Zolang er geen uitslag is, staan er geen reacties.
//   6. Weigert de database, dan staat dat erbij.
//   7. De knoppen zijn groot genoeg en het past op een telefoon.

import { maakControle, startPagina, meedoen, naarLijst } from './hulp.mjs';

const { check, afronden } = maakControle('reacties op elkaars weekend');
const { page, jsFouten, stoppen } = await startPagina();
await page.setViewportSize({ width: 390, height: 844 });
const LIJST = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];
const DAG = 24 * 3600e3;

// Melbourne gereden (of niet), met Sanne en Joe erbij, en wat er al aan
// reacties in de database staat.
async function zet({ uitslag = true, reacties = [], herlaad = true } = {}) {
  await page.evaluate(({ uitslag, reacties, LIJST, DAG }) => {
    const db = globalThis.__db;
    if (!db.pool_members.some((m) => m.member_id === 'lid-2')) {
      db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Sanne', user_id: null },
        { member_id: 'lid-3', pool_id: 'pool-1', display_name: 'Joe', user_id: null });
    }
    const r = db.races.find((x) => x.id === 1);
    r.deadline_quali = new Date(Date.now() + (uitslag ? -3 : 2) * DAG).toISOString();
    r.deadline_race = new Date(Date.now() + (uitslag ? -2 : 3) * DAG).toISOString();
    r.quali_result = uitslag ? LIJST : null; r.race_result = uitslag ? LIJST : null;
    db.answers = db.answers.filter((a) => a.race_id !== 1);
    for (const lid of ['lid-1', 'lid-2']) {
      for (const q of ['quali_top10', 'race_top10']) {
        db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: lid, question_id: q,
          waarde: lid === 'lid-1' ? LIJST : [...LIJST].reverse() });
      }
    }
    db.reacties = reacties.map(([van, aan, soort]) => ({ race_id: 1, van_member: van, aan_member: aan, soort }));
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { uitslag, reacties, LIJST, DAG });
  if (!herlaad) return;
  await page.reload();
  await page.waitForSelector('.shell');
  await naarLijst(page);
  await page.click('[data-race="1"]');
  await page.waitForSelector('#paneel .poulekaart');
}
const inDb = () => page.evaluate(() => (globalThis.__db.reacties ?? [])
  .map((x) => `${x.van_member}>${x.aan_member}:${x.soort}`).sort().join(' '));
const strook = (lid) => page.$$eval(`[data-reacties="${lid}"] .reactie`, (l) => l.map((e) => ({
  soort: e.dataset.reactie ?? e.dataset.reactieSoort ?? (e.dataset.reactieOpen ? 'plus' : '?'), knop: e.tagName === 'BUTTON',
  aan: e.getAttribute('aria-pressed'), label: e.getAttribute('aria-label'),
  aantal: e.querySelector('.aantal')?.textContent ?? '' })));

await meedoen(page);

// --- 5. zonder uitslag ------------------------------------------------------------
await zet({ uitslag: false });
check('zolang er geen uitslag is staan er geen reacties in De poule', (await page.$('[data-reacties]')) === null);

// --- 1. na de uitslag: een plusje onder elke medespeler -------------------------------
await zet({});
let s = await strook('lid-2');
check('na de uitslag staat onder een medespeler een plusje om te reageren',
  s.length === 1 && s[0].soort === 'plus' && s[0].knop && s[0].label === 'Reageer op Sanne', JSON.stringify(s));
check('onder je eigen regel staat niets zolang niemand reageerde', (await page.$('[data-reacties="lid-1"]')) === null);
check('de strook staat direct onder de regel van die speler', await page.evaluate(() => {
  const st = document.querySelector('[data-reacties="lid-2"]');
  return st.previousElementSibling?.dataset.bekijk === 'lid-2';
}));

await page.click('[data-reactie-open="lid-2"]');
await page.waitForSelector('[data-reactie="vuur"][data-reactie-aan="lid-2"]');
s = await strook('lid-2');
check('een tik op het plusje laat de vijf reacties zien, elk met een naam voor de voorlezer',
  s.filter((x) => x.soort !== 'plus').map((x) => x.soort).join() === 'klap,vuur,lach,schrik,schedel'
    && s.find((x) => x.soort === 'vuur').label === 'in vorm' && s.every((x) => x.knop), JSON.stringify(s));
check('de vijf zijn emoji, voor de voorlezer verborgen', await page.$$eval('[data-reacties="lid-2"] [data-reactie] span[aria-hidden]',
  (l) => l.length === 5 && l.every((e) => /\p{Extended_Pictographic}/u.test(e.textContent))));

// --- 2. kiezen, weghalen, wisselen -------------------------------------------------------
await page.click('[data-reactie="vuur"][data-reactie-aan="lid-2"]');
await page.waitForSelector('[data-reactie="vuur"][aria-pressed="true"]');
s = await strook('lid-2');
check('kiezen zet de reactie erbij met een teller, als de jouwe gemarkeerd, en sluit de keuze',
  s.map((x) => x.soort).join() === 'vuur,plus' && s[0].aantal === '1' && s[0].aan === 'true'
    && s[0].label === 'in vorm: Danny', JSON.stringify(s));
check('en hij staat in de database', (await inDb()) === 'lid-1>lid-2:vuur', await inDb());
await zet({ reacties: [['lid-1', 'lid-2', 'vuur']] });
check('na herladen staat hij er nog', (await strook('lid-2'))[0]?.aan === 'true');
await page.click('[data-reactie-open="lid-2"]');
await page.click('[data-reactie="lach"][data-reactie-aan="lid-2"]');
await page.waitForSelector('[data-reactie="lach"][aria-pressed="true"]');
check('een andere kiezen wisselt: één reactie per speler per weekend',
  (await inDb()) === 'lid-1>lid-2:lach' && (await strook('lid-2')).map((x) => x.soort).join() === 'lach,plus', await inDb());
await page.click('[data-reactie="lach"][data-reactie-aan="lid-2"]');
await page.waitForFunction(() => !document.querySelector('[data-reactie="lach"]'));
check('nog een keer tikken op je eigen reactie haalt hem weg', (await inDb()) === '', await inDb());

// --- 3 en 4. van anderen ---------------------------------------------------------------------
await zet({ reacties: [['lid-2', 'lid-1', 'klap'], ['lid-3', 'lid-1', 'klap'], ['lid-3', 'lid-2', 'schedel'], ['lid-1', 'lid-2', 'schedel']] });
s = await strook('lid-1');
check('onder je eigen regel staat wat je kreeg, met de teller en de namen, zonder knoppen',
  s.length === 1 && s[0].soort === 'klap' && !s[0].knop && s[0].aantal === '2' && s[0].label === 'applaus: Sanne, Joe',
  JSON.stringify(s));
s = await strook('lid-2');
check('reacties van meer spelers tellen op, en de jouwe is gemarkeerd',
  s[0].soort === 'schedel' && s[0].aantal === '2' && s[0].aan === 'true' && s[0].label === 'pijnlijk: Joe, Danny', JSON.stringify(s));
check('wie niets kreeg heeft alleen het plusje', (await strook('lid-3')).map((x) => x.soort).join() === 'plus');

// --- 6. de database weigert --------------------------------------------------------------------
await page.click('[data-reactie-open="lid-3"]');
await page.waitForSelector('[data-reactie="klap"][data-reactie-aan="lid-3"]');
await page.evaluate(() => {
  const db = globalThis.__db;
  const r = db.races.find((x) => x.id === 1);
  r.quali_result = null; r.race_result = null;
});
await page.click('[data-reactie="klap"][data-reactie-aan="lid-3"]');
await page.waitForFunction(() => document.querySelector('[data-reacties="lid-3"] .amber') !== null);
check('weigert de database, dan staat dat erbij en is er niets bijgekomen',
  (await page.textContent('[data-reacties="lid-3"] .amber')).includes('uitslag')
    && !(await inDb()).includes('lid-1>lid-3'), await inDb());

// --- 7. op het scherm ------------------------------------------------------------------------------
await page.setViewportSize({ width: 360, height: 760 });
await zet({ reacties: [['lid-2', 'lid-1', 'klap'], ['lid-1', 'lid-2', 'vuur']] });
await page.click('[data-reactie-open="lid-3"]');
await page.waitForSelector('[data-reactie="klap"][data-reactie-aan="lid-3"]');
check('elke knop is minstens 44 bij 44 pixels, en op 360 pixels is er geen horizontale scroll', await page.evaluate(() => {
  const k = [...document.querySelectorAll('.reacties button')].map((b) => b.getBoundingClientRect());
  return k.length >= 7 && k.every((r) => r.height >= 44 && r.width >= 44 && r.right <= 360)
    && document.documentElement.scrollWidth <= 360;
}));
check('de regel van de speler erboven opent nog steeds zijn voorspelling', await (async () => {
  await page.click('[data-bekijk="lid-2"]');
  await page.waitForTimeout(400);
  return (await page.$('[data-reacties]')) === null || (await page.$('#terug, [data-sluit], dialog[open], .blad')) !== null;
})());

await page.addInitScript(() => { try { localStorage.setItem('poule:taal', 'en'); } catch { /* niets */ } });
await zet({ reacties: [['lid-2', 'lid-1', 'klap']] });
check('in het Engels zijn de namen Engels',
  (await strook('lid-1'))[0]?.label === 'applause: Sanne' && (await strook('lid-2'))[0]?.label === 'React to Sanne',
  JSON.stringify(await strook('lid-1')));

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
