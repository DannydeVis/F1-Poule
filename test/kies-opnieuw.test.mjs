// Kies opnieuw: een gekozen coureur of team dat niet meer in de lijst staat.
//
// Tot OpenF1 de coureurs van een nieuw seizoen heeft, staat bij elke race een
// geleende lijst. Komt de echte, dan zet de database de open antwoorden om
// (test/coureurlijsten.test.sql). Wat daarna nog naar iemand wijst die er niet
// meer in staat, scoort niets. Wat hier vastligt:
//
//   1. het racesoverzicht zegt "actie nodig" zolang de sessie open is, en niet
//      meer als die dicht is;
//   2. het invulscherm zegt welke keuze opnieuw moet, ook bij "weg:TSU" (een
//      coureur wiens nummer nu van een ander is), en alleen op die tab;
//   3. de seizoensvragen zeggen het vóór de eerste race, bij coureur en team;
//   4. met geldige keuzes staat er nergens iets;
//   5. "tijd voorlopig" als de kwalificatie bij minstens de helft van het
//      seizoen precies 24 uur voor de race staat, en anders niet;
//   6. in het Engels.

import { maakControle, startPagina, meedoen, naarLijst } from './hulp.mjs';

const { check, afronden } = maakControle('kies opnieuw');
const tekst = async (page, kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

// Antwoorden en races in de nagebootste database zetten, en herladen.
async function zet(page, werk) {
  await page.evaluate(werk);
  await page.evaluate(() => sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db)));
  await page.reload();
  // Na herladen staat de app op de laatst bekeken weergave; terug naar de races.
  await page.waitForSelector('[data-weergave="races"]');
  await page.click('[data-weergave="races"]');
  await naarLijst(page);
}

{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await naarLijst(page);

  // ---- 4 (eerst): niets aan de hand -------------------------------------------
  check('zonder verdwenen keuzes staat er nergens "actie nodig"', (await page.$('[data-actie-nodig]')) === null);
  check('en met de gewone kalender van de nabootsing nergens "tijd voorlopig"',
    (await page.$('[data-tijd-voorlopig]')) === null);

  // ---- 1 en 2: een race met keuzes die er niet meer zijn ------------------------
  await zet(page, () => {
    const d = globalThis.__db;
    const nrs = d.races.find((r) => r.id === 1).drivers.map((d) => d.nr);
    const a = (race_id, question_id, waarde) => ({ pool_id: 'pool-1', race_id, member_id: 'lid-1', question_id, waarde });
    d.answers.push(
      // Melbourne: alles open. Race-top 10 met #99, winnaar weg:TSU; de kwalificatie klopt.
      a(1, 'race_top10', [nrs[0], '99', ...nrs.slice(1, 9)]),
      a(1, 'winnaar', 'weg:TSU'),
      a(1, 'quali_top10', nrs.slice(0, 10)),
      // Shanghai: de kwalificatie is dicht. Een gesloten #99 is geen actie meer.
      a(2, 'quali_top10', ['99', ...nrs.slice(0, 9)]),
      a(2, 'race_top10', nrs.slice(0, 10)));
  });
  check('Melbourne (open, met #99 en weg:TSU) heeft "actie nodig" in het racesoverzicht',
    (await page.$('[data-race="1"] [data-actie-nodig]')) !== null, await tekst(page, '[data-race="1"]'));
  check('Shanghai (alleen een gesloten kwalificatie met #99) niet',
    (await page.$('[data-race="2"] [data-actie-nodig]')) === null, await tekst(page, '[data-race="2"]'));

  await page.click('[data-race="1"]');
  await page.click('[data-tab="race"]');
  await page.waitForSelector('[data-kies-opnieuw]');
  const banner = await tekst(page, '[data-kies-opnieuw]');
  check('op het invulscherm van de race staat "kies opnieuw", met #99 en TSU',
    banner.includes('kies opnieuw') && banner.includes('#99') && banner.includes('TSU')
      && banner.includes('staan niet meer in de deelnemerslijst'), banner);
  check('en de winnaar heet TSU, niet "weg:TSU"', !(await tekst(page, '#paneel')).includes('weg:'));
  await page.click('[data-tab="quali"]');
  await page.waitForSelector('#paneel .grid10');
  check('op de kwalificatie (die klopt) staat het niet', (await page.$('[data-kies-opnieuw]')) === null);

  // ---- 3: de seizoensvragen ---------------------------------------------------------
  await naarLijst(page);
  await zet(page, () => {
    const d = globalThis.__db;
    d.answers = d.answers.filter((a) => a.race_id !== 1 || !['race_top10', 'winnaar'].includes(a.question_id));
    d.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: 'lid-1', question_id: 'kampioen', waarde: '77' },
                   { pool_id: 'pool-1', race_id: 1, member_id: 'lid-1', question_id: 'constructeur', waarde: 'Kick Sauber' },
                   { pool_id: 'pool-1', race_id: 1, member_id: 'lid-1', question_id: 'vierde_team', waarde: 'McLaren' });
  });
  check('ronde 1 heeft "actie nodig" om de seizoensvragen, ook al klopt de race nu',
    (await page.$('[data-race="1"] [data-actie-nodig]')) !== null, await tekst(page, '[data-race="1"]'));
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('[data-kies-opnieuw-seizoen]');
  const seizoen = await tekst(page, '[data-kies-opnieuw-seizoen]');
  check('bij de seizoensvragen: kies opnieuw voor wereldkampioen en constructeurstitel, niet voor het vierde team',
    seizoen.includes('wereldkampioen') && seizoen.includes('constructeurstitel') && !seizoen.includes('vierde team'), seizoen);

  // Na de eerste race ligt een seizoensantwoord vast: dan valt er niets meer te kiezen.
  await zet(page, () => {
    const r = globalThis.__db.races.find((x) => x.id === 1);
    r.deadline_quali = new Date(Date.now() - 36e5).toISOString();
  });
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.seizoenslaag');
  check('na de start van het seizoen geen "kies opnieuw" meer bij de seizoensvragen',
    (await page.$('[data-kies-opnieuw-seizoen]')) === null);

  // ---- 5: tijd voorlopig --------------------------------------------------------------
  await page.click('[data-weergave="races"]');
  await zet(page, () => {
    const d = globalThis.__db;
    const dag = (n, u) => new Date(Date.now() + n * 864e5 + u * 36e5).toISOString();
    d.races.find((r) => r.id === 1).deadline_quali = dag(1, 0);
    d.races.find((r) => r.id === 1).deadline_race = dag(2, 0);
    // Vier races, drie met de kwalificatie precies 24 uur voor de race.
    d.races.push({ id: 4, season: 2026, round: 4, name: 'Bahrain', drivers: d.races[0].drivers,
      deadline_quali: dag(20, 0), deadline_race: dag(21, 0), quali_result: null, race_result: null,
      deadline_sprint: null, sprint_result: null, sprint_key: null,
      fastest_lap: null, fastest_pitstop: null, safety_cars: null, rode_vlag: null });
  });
  check('bij een seizoen dat zo neergezet is: "tijd voorlopig" bij de races met precies 24 uur',
    (await page.$('[data-race="1"] [data-tijd-voorlopig]')) !== null
      && (await page.$('[data-race="4"] [data-tijd-voorlopig]')) !== null
      && (await page.$('[data-race="2"] [data-tijd-voorlopig]')) === null,
    await tekst(page, '.kalender'));
  await page.click('[data-race="4"]');
  await page.waitForSelector('#paneel [data-tijd-voorlopig]');
  check('en op het invulscherm een zin die zegt dat de tijden nog bijgewerkt worden',
    (await tekst(page, '#paneel [data-tijd-voorlopig]')).includes('nog voorlopig'));
  await naarLijst(page);
  await zet(page, () => {
    const d = globalThis.__db;
    for (const r of d.races.filter((x) => x.id !== 1)) r.deadline_race = new Date(Date.parse(r.deadline_quali) + 23 * 36e5).toISOString();
  });
  check('staat minder dan de helft zo, dan is het een echte kalender en staat het er niet',
    (await page.$('[data-tijd-voorlopig]')) === null, await tekst(page, '.kalender'));

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 6: in het Engels ----------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ taal: 'en' });
  await meedoen(page);
  await naarLijst(page);
  await zet(page, () => {
    const d = globalThis.__db;
    d.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: 'lid-1', question_id: 'winnaar', waarde: '99' });
  });
  check('in het Engels: "action needed"', (await tekst(page, '[data-race="1"] [data-actie-nodig]')) === 'action needed');
  await page.click('[data-race="1"]');
  await page.click('[data-tab="race"]');
  await page.waitForSelector('[data-kies-opnieuw]');
  check('en "choose again" op het invulscherm',
    (await tekst(page, '[data-kies-opnieuw]')).includes('choose again')
      && (await tekst(page, '[data-kies-opnieuw]')).includes('#99 is no longer in the line-up'),
    await tekst(page, '[data-kies-opnieuw]'));
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
