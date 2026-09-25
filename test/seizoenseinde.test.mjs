// Het seizoen zit erop: wat ziet wie de app opent?
//
// Doorschuiven naar het volgende seizoen kon al (test/seizoensarchief.test.mjs),
// maar alleen onder Poule, helemaal onderaan bij het beheer. Wie in januari de
// app opende zag op het racesoverzicht "seizoen rond" en verder niets -- ook
// als de kalender van volgend jaar allang klaarstond. Sinds de sync die
// kalender zelf ophaalt (scripts/seizoenen.mjs) is dit het moment waarop het
// zichtbaar moet worden.
//
// Wat hier vastligt:
//   1. Zolang er nog een race komt, staat er niets over doorschuiven.
//   2. Is alles gereden, dan krijgt de poulebaas op het racesoverzicht de knop,
//      en leest de rest waar het op wacht.
//   3. Doorschuiven zonder kalender van volgend jaar zegt eerlijk dat die nog
//      komt; mét kalender staat hij er meteen.
//   4. Terugbladeren naar het oude jaar biedt niet opnieuw doorschuiven aan.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('het seizoen zit erop');

const tekst = async (page, kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

// Alle races van 2026 gereden. Eigenaar is standaard Danny zelf (lid-1).
async function seizoenVoorbij(page, { eigenaar = 'lid-1', volgendJaar = false, eenTeGaan = false } = {}) {
  await page.evaluate(({ eigenaar, volgendJaar, eenTeGaan }) => {
    const db = globalThis.__db;
    const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
    const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
    const drivers = db.races[0].drivers;
    for (const [i, r] of db.races.entries()) {
      Object.assign(r, { drivers, deadline_quali: u(-500 + i * 100), deadline_race: u(-499 + i * 100),
        quali_result: uitslag, race_result: uitslag });
    }
    if (eenTeGaan) {
      Object.assign(db.races[2], { deadline_quali: u(24), deadline_race: u(48),
        quali_result: null, race_result: null });
    }
    if (volgendJaar) {
      db.races.push({ ...db.races[0], id: 101, season: 2027, round: 1, name: 'Melbourne',
        deadline_quali: u(24 * 90), deadline_race: u(24 * 91), quali_result: null, race_result: null });
      db.races.push({ ...db.races[0], id: 102, season: 2027, round: 2, name: 'Shanghai',
        deadline_quali: u(24 * 104), deadline_race: u(24 * 105), quali_result: null, race_result: null });
    }
    // Danny deed mee in Melbourne. Zonder één antwoord telt 2026 niet als
    // gespeeld en staat het na doorschuiven niet in de seizoenskeuze
    // (gespeeldeSeizoenen() in index.html).
    for (const q of ['quali_top10', 'race_top10']) {
      db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: 'lid-1',
                        question_id: q, waarde: uitslag.slice(0, 10) });
    }
    db.pools[0].owner_member_id = eigenaar;
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { eigenaar, volgendJaar, eenTeGaan });
  await page.reload();
  await page.waitForSelector('[data-weergave]');
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('.kalender');
}

// ---- 1. er komt nog een race ------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await seizoenVoorbij(page, { eenTeGaan: true });
  check('met nog een race te gaan staat er geen knop om door te schuiven',
    (await page.$('#doorschuiven')) === null);
  check('en ook geen "seizoen rond"',
    !(await tekst(page, '.kol.links')).includes('seizoen rond'));
  check('geen javascriptfouten (1)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 2 en 3. de poulebaas, zonder kalender van volgend jaar -----------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await seizoenVoorbij(page);
  await page.waitForSelector('#doorschuiven');
  const blok = await tekst(page, '.kalender .leeg');
  check('de poulebaas leest dat 2026 erop zit en dat hij door kan schuiven',
    blok.includes('Alle races van 2026 zijn gereden. Schuif door naar 2027'), blok);
  check('met de knop meteen erbij, op het racesoverzicht',
    (await tekst(page, '#doorschuiven')) === 'Begin aan 2027', await tekst(page, '#doorschuiven'));

  await page.click('#doorschuiven');
  await page.waitForSelector('.melding');
  check('doorschuiven bevestigt het nieuwe seizoen',
    (await tekst(page, '.melding')).startsWith('Jullie spelen nu seizoen 2027'),
    await tekst(page, '.melding'));
  const poule = await page.evaluate(() => globalThis.__db.pools[0].season);
  check('en zet de poule echt op 2027', poule === 2027, String(poule));
  const leeg = await tekst(page, '.kalender .leeg');
  check('zonder kalender van 2027 zegt het overzicht eerlijk dat die nog komt',
    leeg.includes('nog geen races') && leeg.includes('De kalender verschijnt hier vanzelf'), leeg);
  check('en biedt het niet nog een keer doorschuiven aan', (await page.$('#doorschuiven')) === null);
  check('geen javascriptfouten (2)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 3 en 4. mét kalender van volgend jaar, en terugbladeren ------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await seizoenVoorbij(page, { volgendJaar: true });
  await page.click('#doorschuiven');
  await page.waitForSelector('.melding');
  await page.waitForSelector('[data-race]');
  const namen = await page.$$eval('.kalender [data-race] .nm', (n) => n.map((e) => e.textContent.trim()));
  check('met de kalender van 2027 in de database staat hij er meteen',
    namen.join(',') === 'Melbourne,Shanghai', namen.join(','));

  await page.selectOption('#seizoenkeuze', '2026');
  await page.waitForSelector('.kalender .leeg');
  const oud = await tekst(page, '.kalender .leeg');
  check('terug in 2026 staat gewoon dat alles gereden is',
    oud.includes('Alle races zijn gereden'), oud);
  check('zonder opnieuw doorschuiven aan te bieden', (await page.$('#doorschuiven')) === null);
  check('geen javascriptfouten (3)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 2. een gewone speler ------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await meedoen(page);
  await seizoenVoorbij(page, { eigenaar: 'iemand-anders' });
  const blok = await tekst(page, '.kalender .leeg');
  check('een speler die niet de poulebaas is leest waar het op wacht',
    blok.includes('Zodra de poulebaas doorschuift naar 2027'), blok);
  check('en krijgt geen knop die hij toch niet mag gebruiken', (await page.$('#doorschuiven')) === null);
  check('geen javascriptfouten (4)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
