// Het seizoen is pas klaar als de laatste race gereden is.
//
// Tot 21 oktober telde een race als gereden zodra één sessie een uitslag had
// (heeftUitslag()). Na de kwalificatie van de laatste race was het seizoen dus
// "klaar" terwijl de race nog moest: "Begin aan 2027" was klikbaar (en
// doorschuiven haalde de finale uit beeld voor de hele poule), "Bekijk je
// seizoen 2026" stond er al, het seizoensverhaal speelde vanzelf af, en de
// seizoensvragen werden gescoord op een WK-stand zonder de finale. De regel is
// nu: elke race heeft een race-uitslag of is afgelast, dezelfde maatstaf als
// weekendVoorbij(). Zie ook test/seizoenslaag.test.sql voor de database.
//
// Wat hier vastligt, voor een laatste race met alleen een kwalificatie én voor
// een laatste race met alleen een sprint:
//   1. geen knop om door te schuiven (racesoverzicht en Poule), geen "seizoen
//      rond";
//   2. geen "Bekijk je seizoen", en het verhaal speelt niet vanzelf;
//   3. de seizoensvragen zijn nog niet gescoord;
//   4. en zodra de race-uitslag er is, is het er allemaal wel.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('het seizoen is pas klaar na de laatste race');
const tekst = async (page, kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];

// Alle races gereden, behalve de race van de laatste: die is morgen. Danny
// koos Verstappen (1) als kampioen, en Verstappen wint elke race.
async function bijnaKlaar(page, laatste) {
  await page.evaluate(({ uit, laatste }) => {
    const d = globalThis.__db;
    const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
    const drivers = d.races[0].drivers;
    for (const [i, r] of d.races.entries()) {
      Object.assign(r, { drivers, deadline_quali: u(-400 + i * 100), deadline_race: u(-399 + i * 100),
        quali_result: uit, race_result: uit, deadline_sprint: null, sprint_result: null });
    }
    const r = d.races.at(-1);
    Object.assign(r, { race_result: null, deadline_race: u(24) });
    if (laatste === 'quali') Object.assign(r, { deadline_quali: u(-2), quali_result: uit });
    else Object.assign(r, { deadline_sprint: u(-2), sprint_result: uit.slice(0, 8),
                            deadline_quali: u(4), quali_result: null });
    for (const r2 of d.races.slice(0, -1))
      for (const q of ['quali_top10', 'race_top10'])
        d.answers.push({ pool_id: 'pool-1', race_id: r2.id, member_id: 'lid-1', question_id: q, waarde: uit.slice(0, 10) });
    d.answers.push({ pool_id: 'pool-1', race_id: d.races[0].id, member_id: 'lid-1', question_id: 'kampioen', waarde: '1' });
    d.pools[0].owner_member_id = 'lid-1';
    sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
  }, { uit: UIT, laatste });
}
const finaleGereden = (page) => page.evaluate((uit) => {
  const d = globalThis.__db;
  const r = d.races.at(-1);
  Object.assign(r, { race_result: uit, deadline_race: new Date(Date.now() - 3600e3).toISOString() });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(d));
}, UIT);

async function bekijk(page) {
  await page.reload();
  await page.waitForSelector('[data-weergave]');
  if (await page.isVisible('#terug')) await page.click('#terug');
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('.kalender');
  // Speelt het verhaal vanzelf? Dat gebeurt op het racesoverzicht.
  const verhaal = await page.waitForSelector('.verhaal', { timeout: 4000 }).then(() => true, () => false);
  if (verhaal) {
    await page.click('[data-verhaal-sla]');
    await page.waitForFunction(() => !document.querySelector('.verhaal'));
  }
  const doorschuiven = (await page.$('#doorschuiven')) !== null;
  const rond = (await tekst(page, '.kalender')).includes('seizoen rond');
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.seizoenslaag');
  const verhaalKnop = (await page.$('[data-seizoenverhaal]')) !== null;
  const laag = await tekst(page, '.seizoenslaag');
  const gescoord = /\d+ punten/.test(await tekst(page, '.seizoenslaag .label'));
  await page.click('[data-weergave="poule"]');
  await page.waitForSelector('#nieuwSeizoenKnop');
  const pouleKnop = !(await page.$eval('#nieuwSeizoenKnop', (b) => b.disabled));
  return { verhaal, doorschuiven, rond, verhaalKnop, gescoord, pouleKnop, laag };
}

for (const [laatste, naam] of [['quali', 'de kwalificatie'], ['sprint', 'de sprint']]) {
  const { page, jsFouten, stoppen } = await startPagina({ verhaal: true });
  await meedoen(page);
  await bijnaKlaar(page, laatste);
  const v = await bekijk(page);
  check(`na ${naam} van de laatste race: geen knop om door te schuiven op het racesoverzicht`, !v.doorschuiven);
  check(`na ${naam}: en ook niet onder Poule`, !v.pouleKnop);
  check(`na ${naam}: geen "seizoen rond"`, !v.rond);
  check(`na ${naam}: geen "Bekijk je seizoen" onder de stand`, !v.verhaalKnop);
  check(`na ${naam}: het seizoensverhaal speelt niet vanzelf`, !v.verhaal);
  check(`na ${naam}: de seizoensvragen zijn nog niet gescoord`, !v.gescoord, v.laag.slice(0, 160));

  await finaleGereden(page);
  const n = await bekijk(page);
  check(`en met de race-uitslag erbij (na ${naam}): het verhaal speelt vanzelf`, n.verhaal);
  check(`het racesoverzicht heeft de knop en "seizoen rond"`, n.doorschuiven && n.rond);
  check('onder Poule kan het ook, en onder de stand staat "Bekijk je seizoen"', n.pouleKnop && n.verhaalKnop);
  check('en de seizoensvragen zijn gescoord', n.gescoord, n.laag.slice(0, 160));
  check(`geen javascriptfouten (${naam})`, jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
