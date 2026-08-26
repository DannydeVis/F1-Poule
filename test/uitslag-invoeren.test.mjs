// Handmatig een uitslag invullen als OpenF1 er geen heeft.
//
// Twee dingen moeten kloppen. De uitslag komt in de database te staan met de
// vlag dat hij met de hand is ingevoerd — de sync vult alleen lege uitslagen,
// dus zonder die vlag is later niet meer te zien welke niet uit de API komen.
// En een uitslag die er al staat mag nooit overschreven worden: races zijn
// gedeeld met elke poule in de database.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('uitslag handmatig invoeren');
const { page, jsFouten, stoppen } = await startPagina();

await meedoen(page);

// Shanghai: kwalificatie is dicht (uur(-2)) en er staat geen uitslag.
await openRace(page, 'Shanghai');
await page.click('[data-tab="quali"]');
await page.waitForSelector('#paneel');

check('gesloten sessie biedt aan de uitslag zelf in te vullen',
  (await page.$('#zelfinvullen')) !== null);

// Melbourne staat nog open, daar hoort de knop niet te zijn.
await openRace(page, 'Melbourne');
await page.waitForSelector('#paneel');
check('een sessie die nog openstaat biedt dat niet aan',
  (await page.$('#zelfinvullen')) === null);

await openRace(page, 'Shanghai');
await page.click('[data-tab="quali"]');
await page.click('#zelfinvullen');
await page.waitForSelector('#uitslagOpslaan');

const aantal = await page.$$eval('.drv', (n) => n.length);
const knopVoor = (await page.textContent('#uitslagOpslaan')).trim();
check('opslaan staat uit zolang er coureurs open staan',
  knopVoor === `Nog ${aantal} te plaatsen`, `knop: "${knopVoor}"`);

for (let i = 0; i < aantal; i++) await page.click('.drv:not([disabled])');
const knopNa = (await page.textContent('#uitslagOpslaan')).trim();
check('opslaan kan zodra iedereen een plek heeft',
  knopNa === 'Uitslag opslaan', `knop: "${knopNa}"`);

// --- eerst: iemand anders was je voor ------------------------------------
// Terwijl dit scherm openstond heeft een tweede speler de uitslag al
// ingevuld. Daar mag niet overheen geschreven worden: races zijn gedeeld
// met elke poule in de database.
const schrijfInDb = (patch) => page.evaluate((p) => {
  const race = globalThis.__db.races.find((r) => String(r.id) === '2');
  Object.assign(race, p);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
}, patch);

await schrijfInDb({ quali_result: ['1', '4'] });
await page.click('#uitslagOpslaan');
await page.waitForSelector('.err:not(:empty)');
const fout = (await page.textContent('.err')).trim();
check('een uitslag die er al staat wordt niet overschreven',
  fout.toLowerCase().includes('inmiddels'), fout);

const naBotsing = await page.evaluate(() =>
  globalThis.__db.races.find((r) => String(r.id) === '2'));
check('de bestaande uitslag staat er onveranderd',
  naBotsing.quali_result.join() === '1,4', JSON.stringify(naBotsing.quali_result));
check('en is niet als handmatig gemarkeerd', !naBotsing.quali_handmatig);

// --- daarna: het gewone geval, met een lege uitslag ----------------------
await schrijfInDb({ quali_result: null });
await page.reload();
await page.waitForSelector('[data-race]');
await openRace(page, 'Shanghai');
await page.click('[data-tab="quali"]');
await page.click('#zelfinvullen');
await page.waitForSelector('#uitslagOpslaan');
for (let i = 0; i < aantal; i++) await page.click('.drv:not([disabled])');

const volgorde = await page.$$eval('.slot.vol .who',
  (n) => n.map((x) => x.firstChild.textContent.trim()));

await page.click('#uitslagOpslaan');
await page.waitForSelector('.melding, .err:not(:empty)');

const race = await page.evaluate(() =>
  globalThis.__db.races.find((r) => String(r.id) === '2'));
check('de uitslag staat in de database',
  race?.quali_result?.length === aantal, `${race?.quali_result?.length} van ${aantal}`);
check('en is gemarkeerd als handmatig ingevoerd',
  race?.quali_handmatig === true, `quali_handmatig: ${race?.quali_handmatig}`);
check('de race-uitslag is niet aangeraakt',
  race?.race_result === null && !race?.race_handmatig,
  `race_result: ${JSON.stringify(race?.race_result)}`);
check('de volgorde is bewaard zoals ingevoerd',
  race.quali_result.length === volgorde.length, volgorde.slice(0, 3).join(' '));

// --- de uitslag is nu zichtbaar, en als handmatig herkenbaar -------------
await openRace(page, 'Shanghai');
await page.click('[data-tab="quali"]');
await page.waitForSelector('#paneel');
const paneel = (await page.textContent('#paneel')).replace(/\s+/g, ' ').toLowerCase();
check('het scherm zegt dat deze uitslag met de hand is ingevoerd',
  paneel.includes('handmatig ingevuld'), paneel.slice(0, 70) + '...');
check('en biedt niet aan hem nog eens in te vullen',
  (await page.$('#zelfinvullen')) === null);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
