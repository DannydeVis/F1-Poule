// "Het verwisselen naar een andere poule zit ver weg en is niet duidelijk."
//
// De knop stond eerst onderaan het Races- én het Poule-tabblad, tussen een
// stapel andere blokken — nooit op de Standpagina, en nergens zichtbaar
// zolang je een racescherm open had staan. Wie in een tweede poule speelt
// moest daar dus specifiek naar op zoek.
//
// De oplossing zit niet in een nieuwe knop maar in een nieuwe plek: dezelfde
// #anderePoule, verhuisd naar de vaste zijbalk (toonApp()), die op elk
// tabblad en in elk racescherm blijft staan. Deze test controleert dat "elk"
// ook echt "elk" is, en dat de knop nog steeds hetzelfde doet als voorheen.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('andere poule: overal bereikbaar');
const { page, jsFouten, stoppen } = await startPagina();

await meedoen(page);

check('op het racesoverzicht staat de knop in de zijbalk',
  (await page.$('.merk #anderePoule')) !== null);

await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-weergave="stand"][aria-current="true"]');
check('en ook op de standpagina, die hem eerder helemaal niet had',
  (await page.$('.merk #anderePoule')) !== null);

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf');
check('en op de poulepagina', (await page.$('.merk #anderePoule')) !== null);

await page.click('[data-weergave="races"]');
await openRace(page, 'Melbourne');
check('en zelfs middenin een racescherm', (await page.$('.merk #anderePoule')) !== null);

// --- de knop doet nog steeds wat hij deed -----------------------------------
await page.click('#anderePoule');
await page.waitForSelector('#code');
check('klikken brengt je terug naar het codescherm', (await page.$('#code')) !== null);

const bekend = await page.evaluate(() => JSON.parse(localStorage.getItem('poule:poules') ?? '[]'));
check('de poule zelf blijft in het lijstje van bekende poules staan',
  bekend.some((p) => p.join_code === 'RTM026'), JSON.stringify(bekend));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
