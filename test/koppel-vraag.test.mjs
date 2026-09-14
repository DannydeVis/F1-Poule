// Eén keer gevraagd: wil je koppelen?
//
// "Ik denk wel dat als mensen de app openen voor de 1e keer, dat moeten ze de
// keuze krijgen of ze willen inloggen of niet." Tot nu toe stond die keuze
// verstopt op het Poule-tabblad — precies het scherm dat iemand die net drie
// tikken verder is (poulecode, naam, klaar) nog nooit gezien heeft.
//
// Wat hier vastligt is vooral wanneer dit scherm wél en niet verschijnt. Wél:
// bij een verse, eigen claim. Niet: bij een tweede keer (nooit nogmaals
// vragen), niet als er al iets gekoppeld is, en — het scherpste geval — niet
// als een gedeeld toestel een tweede speler aanmaakt die aan niemand komt te
// hangen. Dat laatste zou anders Google aan de verkeerde persoon hangen.

import { maakControle, startPagina, naDeClaim } from './hulp.mjs';

const { check, afronden } = maakControle('eenmalig gevraagd: wil je koppelen');

// ------------------------------------------------------------------
//  Een verse claim krijgt de vraag, in enkelvoud, met de eigen naam erin
// ------------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await page.waitForSelector('#koppelnunniet');
  const tekst = (await page.textContent('#app')).replace(/\s+/g, ' ').trim();
  check('de vraag verschijnt direct na de claim, met de eigen naam',
    tekst.includes('Welkom,') && tekst.includes('Danny'), tekst.slice(0, 200));
  check('en biedt zowel Google als een mailadres aan, zoals onder Poule',
    (await page.$('#googlekoppel')) !== null && (await page.$('#mailopen')) !== null);
  check('"nu niet" is een net zo bereikbare knop als de andere twee',
    (await page.textContent('#koppelnunniet')).includes('Nu niet'));

  await page.click('#koppelnunniet');
  await page.waitForSelector('[data-race]');
  check('en daarna sta je gewoon in de poule, niets is verplicht geweest',
    (await page.$('[data-race]')) !== null);

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ------------------------------------------------------------------
//  Nooit een tweede keer op hetzelfde toestel
// ------------------------------------------------------------------
{
  const { page, stoppen } = await startPagina();
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await naDeClaim(page);

  // Terug naar "Wie ben jij?" en jezelf nogmaals aanwijzen — dezelfde claim,
  // geen nieuwe. De vraag mag hier niet nog een keer verschijnen.
  await page.click('#wissel');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await page.waitForSelector('[data-race]');
  check('een tweede keer jezelf aanwijzen laat de vraag niet terugkomen',
    (await page.$('#koppelnunniet')) === null);

  await stoppen();
}

// ------------------------------------------------------------------
//  Al gekoppeld? Dan is er niets meer te vragen.
// ------------------------------------------------------------------
{
  const { page, stoppen } = await startPagina();
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await page.waitForSelector('#koppelnunniet');
  await page.click('#googlekoppel');
  await page.waitForTimeout(300);
  const link = await page.evaluate(() => globalThis.__mail.laatsteLink());
  await page.goto(link);
  await page.waitForSelector('[data-weergave], #code, [data-lid]');
  check('na het koppelen zelf sta je niet meer voor de vraag',
    (await page.$('#koppelnunniet')) === null);
  await stoppen();
}

// ------------------------------------------------------------------
//  Het scherpe geval: een gedeeld toestel, een tweede speler
// ------------------------------------------------------------------
// Eén account mag maar één speler per poule zijn. Wie zijn telefoon
// doorgeeft aan een tweede speler ziet die speler wél aangemaakt worden,
// maar hij hangt aan niemand — en dan zou "wil je koppelen" Google aan de
// eerste speler hangen, niet aan de tweede. Zie isNuVanMij() in index.html.
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await naDeClaim(page);

  await page.click('#wissel');
  await page.waitForSelector('#naam');
  await page.fill('#naam', 'Joey');
  await page.click('#maak');
  await page.waitForSelector('[data-race]');
  check('de tweede speler op hetzelfde toestel krijgt de vraag niet',
    (await page.$('#koppelnunniet')) === null);

  const joey = await page.evaluate(() =>
    globalThis.__db.pool_members.find((l) => l.display_name === 'Joey'));
  check('want die speler hangt aan niemand — dat is precies de reden',
    joey && joey.user_id === null, JSON.stringify(joey));

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
