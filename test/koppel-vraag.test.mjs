// Eén keer gevraagd: wil je koppelen?
//
// "Ik denk wel dat als mensen de app openen voor de 1e keer, dat moeten ze de
// keuze krijgen of ze willen inloggen of niet." Tot nu toe stond die keuze
// verstopt op het Poule-tabblad — precies het scherm dat iemand die net drie
// tikken verder is (poulecode, naam, klaar) nog nooit gezien heeft.
//
// Wat hier vastligt is vooral wanneer dit scherm wél en niet verschijnt. Wél:
// bij een verse, eigen claim. Niet: bij een tweede keer (nooit nogmaals
// vragen), en niet als er al iets gekoppeld is. Het scherpste geval — een
// gedeeld toestel dat een tweede speler aanmaakt die aan niemand komt te
// hangen, want anders zou "wil je koppelen" Google aan de verkeerde persoon
// hangen — bestaat nog in de code, maar is sinds het verwijderen van "Speler
// wisselen" niet meer via een browsertest te bereiken; zie de toelichting
// verderop in dit bestand en OVERDRACHT.md.

import { maakControle, startPagina } from './hulp.mjs';

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
// Dit toetste jezelf nogmaals aanwijzen via "Wie ben jij?" zonder een nieuwe
// claim (eersteKeer moet dan false zijn, dus geen koppel-vraag). Dat kon
// alleen via "Speler wisselen", terug naar de picker zonder de sessie kwijt
// te raken — die knop is verwijderd, en daarmee ook de enige weg om dit na
// te bootsen. Zie OVERDRACHT.md. Het aangrenzende geval — een leeg toestel
// dat een al-geclaimde naam aanklikt — staat wel nog in test/account.test.mjs.

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
//
// Dit kon alleen getoetst worden door na een verse claim via "Speler
// wisselen" terug te gaan naar "Wie ben jij?" en daar een tweede naam aan te
// maken, zonder de eerste sessie kwijt te raken. Die knop is verwijderd, en
// het gedeeld-toestel-moment dat hij simuleerde is daarmee niet meer via de
// UI te bereiken — zie OVERDRACHT.md. De kern die dit beschermde,
// maakSpeler()'s terugval op user_id: null zodra een tweede claim in
// dezelfde poule botst, staat nog gewoon in index.html; hij is alleen niet
// meer vanuit een browsertest te prikkelen.

process.exit(afronden() ? 0 : 1);
