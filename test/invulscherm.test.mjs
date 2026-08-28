// Het invulscherm: alles op één scherm, en kiezen gaat via het keuzeblad.
//
// Aanleiding is feedback uit de poule zelf: "ik vind het opstellen van de top
// 10 een beetje onduidelijk", "is veel te groot", en het voorstel "als je
// drukt op het lege vak dat je dan iemand kan kiezen en alles op 1 scherm".
//
// Wat hier vastligt:
//   1. Er staat nergens een lijst van twaalf coureurs open; je tikt de plek
//      of de vraag aan die je bedoelt en pas dán gaat het blad open.
//   2. Je kunt P7 invullen zonder eerst P1 tot P6 te doen.
//   3. Dezelfde coureur kan niet op twee plekken in je top 10 staan.
//   4. Een halve top 10 wordt niet bewaard — tien plekken of niets.
//   5. Een poule zonder top 10 krijgt er ook geen te zien.

import { maakControle, startPagina, meedoen, openRace, kiesTien, kiesVoor, opPlek }
  from './hulp.mjs';

const { check, afronden } = maakControle('invulscherm en keuzeblad');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const plek = (i) => `[data-plek="${i}"]`;

await meedoen(page);
await openRace(page, 'Melbourne');

// --- alles staat op één scherm --------------------------------------------
check('de tien plekken en de losse vragen staan samen op één scherm',
  (await page.$$eval('[data-plek]', (n) => n.length)) === 10
    && (await page.$('[data-vraagplek="pole"]')) !== null);
check('en er staat geen coureurlijst open te wachten',
  (await page.$('.kieslijst')) === null);
check('de teller zegt hoeveel plekken je al hebt', (await tekst('.topkop')).includes('0/10'),
  await tekst('.topkop'));

// --- een plek aantikken opent het blad ------------------------------------
await page.click(plek(6));                       // P7, midden in de lijst
await page.waitForSelector('#kiesblad');
check('het blad zegt welke plek je invult',
  (await tekst('.kiesblad-kop')).includes('wie wordt P7?'), await tekst('.kiesblad-kop'));
check('en de coureurs staan er pas dán in',
  (await page.$$eval('#kiesblad .kiesknop', (n) => n.length)) === 12);

// Naast het blad tikken sluit het weer, zonder iets te kiezen.
await page.click('#kiesblad', { position: { x: 5, y: 5 } });
await page.waitForSelector('#kiesblad', { state: 'detached' });
check('naast het blad tikken sluit het zonder te kiezen',
  (await opPlek(page, plek(6))) === '');

// --- P7 invullen zonder P1 tot P6 -----------------------------------------
const nummers = await page.evaluate(() => globalThis.__db.races
  .find((r) => String(r.id) === '1').drivers.map((d) => d.nr));
await kiesVoor(page, plek(6), nummers[3]);
check('je kunt P7 invullen zonder eerst de plekken ervoor te doen',
  (await opPlek(page, plek(6))) !== '' && (await opPlek(page, plek(0))) === '',
  `P7=${await opPlek(page, plek(6))}, P1=${await opPlek(page, plek(0))}`);
check('de teller telt die ene plek mee', (await tekst('.topkop')).includes('1/10'),
  await tekst('.topkop'));

// --- dezelfde coureur kan niet twee keer -----------------------------------
await page.click(plek(0));
await page.waitForSelector('#kiesblad');
const geblokkeerd = await page.$$eval('#kiesblad .kiesknop[disabled]',
  (n) => n.map((b) => b.dataset.kiesdrv));
check('wie al op een plek staat is niet nog eens te kiezen',
  geblokkeerd.length === 1 && geblokkeerd[0] === nummers[3], geblokkeerd.join(', '));
await page.click('#kiesdicht');
await page.waitForSelector('#kiesblad', { state: 'detached' });

// --- een gevulde plek is te wijzigen en leeg te maken ---------------------
await page.click(plek(6));
await page.waitForSelector('#kiesblad');
check('de coureur die er staat is gemarkeerd in het blad',
  (await page.$eval('#kiesblad .kiesknop.gekozen', (b) => b.dataset.kiesdrv)) === nummers[3]);
await page.click('#kiesleeg');
await page.waitForSelector('#kiesblad', { state: 'detached' });
check('een plek is weer leeg te maken',
  (await opPlek(page, plek(6))) === '' && (await tekst('.topkop')).includes('0/10'),
  await tekst('.topkop'));

// --- een halve top 10 gaat er niet in --------------------------------------
await kiesVoor(page, plek(0), nummers[0]);
check('een halve top 10 zegt dat hij afgemaakt moet worden',
  (await tekst('#opslaan')).includes('Maak de top 10 af'), await tekst('#opslaan'));

await kiesTien(page);
check('afgemaakt kan hij wel opgeslagen worden',
  (await tekst('#opslaan')) === 'Opslaan', await tekst('#opslaan'));

// --- de losse vraag zit in hetzelfde blad ---------------------------------
await kiesVoor(page, '[data-vraagplek="pole"]');
check('een losse vraag kiest via hetzelfde blad',
  (await opPlek(page, '[data-vraagplek="pole"]')) !== '',
  await opPlek(page, '[data-vraagplek="pole"]'));

await page.click('#opslaan');
await page.waitForSelector('[data-race]');
const bewaard = await page.evaluate(() => globalThis.__db.answers);
const top10 = bewaard.find((a) => a.question_id === 'quali_top10')?.waarde;
check('de volle top 10 gaat als tien namen naar de database',
  Array.isArray(top10) && top10.length === 10 && top10.every(Boolean),
  JSON.stringify(top10));
check('en de losse vraag gaat in dezelfde beweging mee',
  !!bewaard.find((a) => a.question_id === 'pole'),
  bewaard.map((a) => a.question_id).join(', '));

// --- alles staat er nog na opnieuw openen ---------------------------------
await openRace(page, 'Melbourne');
check('je top 10 staat er nog na opnieuw openen',
  (await page.$$eval('.slot.vol', (n) => n.length)) === 10);

// --- een poule zonder top 10 op deze tab ----------------------------------
// Vroeger kreeg je dan alsnog het volledige raster te zien, vulde je hem in,
// en werd hij bij het opslaan stilzwijgend overgeslagen omdat de vraag niet
// meedeed. Nu staat hij er niet.
await page.evaluate(() => {
  globalThis.__db.pool_questions = [
    { pool_id: 'pool-1', question_id: 'pole' },
    { pool_id: 'pool-1', question_id: 'race_top10' }];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await openRace(page, 'Melbourne');
check('een uitgezette top 10 is niet in te vullen',
  (await page.$('[data-plek]')) === null);
check('en de vraag die wél meedoet staat er gewoon',
  (await page.$('[data-vraagplek="pole"]')) !== null);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
