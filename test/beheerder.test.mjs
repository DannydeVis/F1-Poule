// Wie mag de poule aanpassen?
//
// Poules van vóór het aanmaakscherm hebben geen owner_member_id, en
// magBeheren() laat dan iedereen erbij — bewust, want anders kon niemand
// meer bij de vragenset van een oude poule. Maar "iedereen mag" is geen
// eindtoestand: er hoort een uitweg te zijn waarmee zo'n poule alsnog een
// poulebaas krijgt. Deze test controleert dat die knop er is, dat hij doet
// wat hij belooft, en dat de poule daarna weer normaal op slot zit voor de
// rest.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('poulebaas worden');
const { page, jsFouten, stoppen, url } = await startPagina();

const eigenaar = () => page.evaluate(() => globalThis.__db.pools[0].owner_member_id);
const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

// --- meedoen en de beheersectie openen -------------------------------------
await meedoen(page);
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#pouleClaimen');

check('een poule zonder poulebaas legt dat uit', (await tekst('#app')).includes('geen'));
check('en heeft nog geen eigenaar in de database', (await eigenaar()) == null);

// --- claimen ----------------------------------------------------------------
await page.click('#pouleClaimen');
await page.waitForSelector('#pouleClaimen', { state: 'detached' });

check('de melding zegt dat het gelukt is',
  (await tekst('#app')).includes('Je bent nu de poulebaas'));

const mijnId = await page.evaluate(() => globalThis.__db.pool_members[0].member_id);
check('en de database heeft nu een owner_member_id staan',
  (await eigenaar()) === mijnId, String(await eigenaar()));

// --- de knop is weg, en de uitleg ook ---------------------------------------
await page.click('[data-weergave="poule"]');
check('de knop verschijnt niet nog een keer', (await page.$('#pouleClaimen')) === null);
check('en de "geen poulebaas"-uitleg is verdwenen',
  !(await tekst('#app')).includes('heeft geen poulebaas'));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
