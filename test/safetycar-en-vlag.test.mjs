// De laatste twee vragen: het aantal safety cars en de rode vlag. Ze zijn de
// enige die niet over een coureur gaan, en daar zit meteen het addertje.
//
// "Nul safety cars" en "nee, geen rode vlag" zijn échte antwoorden. Wie ze
// als leeg behandelt — met || in plaats van ?? — wist de rij bij het opslaan
// en scoort ze als niet meegedaan. Dat is niet aan het scherm te zien; je
// merkt het pas als de punten niet kloppen.

import { maakControle, startPagina, meedoen, openRace, naarDeel } from './hulp.mjs';

const { check, afronden } = maakControle('safety cars en rode vlag');
const { page, jsFouten, stoppen } = await startPagina();

const antwoorden = () => page.evaluate(() => globalThis.__db.answers);
const race1 = () => page.evaluate(() =>
  globalThis.__db.races.find((r) => String(r.id) === '1'));
const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const vraag = async (id) => (await antwoorden()).find((a) => a.question_id === id);

await meedoen(page);
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
// De losse vragen zitten achter hun eigen tabblad naast de top 10.
await naarDeel(page, 'vragen');
await page.waitForSelector('[data-extra="safety_cars"]');

// --- de twee kiezers -------------------------------------------------------
const aantallen = await page.$$eval('[data-extra="safety_cars"]',
  (n) => n.map((b) => b.textContent.trim()));
check('safety cars is een rij aantallen, met een open bovenkant',
  aantallen[0] === '0' && aantallen.at(-1) === '6+', aantallen.join(' '));

const vlagKnoppen = await page.$$eval('[data-extra="rode_vlag"]',
  (n) => n.map((b) => b.textContent.trim()));
check('de rode vlag is ja of nee', vlagKnoppen.join('/') === 'ja/nee', vlagKnoppen.join('/'));

// --- nul en nee zijn antwoorden -------------------------------------------
await page.click('[data-extra="safety_cars"][data-waarde="0"]');
await page.click('[data-extra="rode_vlag"][data-waarde="false"]');
check('nul en nee zijn aan te tikken',
  (await page.$$eval('.extraknop.gekozen', (n) => n.length)) === 2);

await page.click('#opslaan');
await page.waitForSelector('[data-race]');
check('nul safety cars wordt bewaard, niet weggegooid',
  (await vraag('safety_cars'))?.waarde === 0,
  JSON.stringify((await vraag('safety_cars'))?.waarde));
check('en "nee" op de rode vlag ook',
  (await vraag('rode_vlag'))?.waarde === false,
  JSON.stringify((await vraag('rode_vlag'))?.waarde));

await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await naarDeel(page, 'vragen');
await page.waitForSelector('[data-extra="safety_cars"]');
const terug = await page.$$eval('.extraknop.gekozen',
  (n) => n.map((b) => `${b.dataset.extra}=${b.dataset.waarde}`));
check('ze staan er nog na opnieuw openen',
  terug.includes('safety_cars=0') && terug.includes('rode_vlag=false'), terug.join(' '));

// Nog een keer op hetzelfde tikken neemt de keuze terug, en dan hoort de rij
// wél weg te gaan.
await page.click('[data-extra="safety_cars"][data-waarde="0"]');
await page.click('#opslaan');
await page.waitForSelector('[data-race]');
check('een teruggenomen antwoord laat geen lege rij achter',
  (await vraag('safety_cars')) === undefined && (await vraag('rode_vlag'))?.waarde === false,
  (await antwoorden()).map((a) => a.question_id).join(', '));

// --- opnieuw invullen, nu met een aantal dat te scoren is -----------------
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await naarDeel(page, 'vragen');
await page.click('[data-extra="safety_cars"][data-waarde="2"]');
await page.click('#opslaan');
await page.waitForSelector('[data-race]');

// --- de uitslag komt binnen ------------------------------------------------
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  r.race_result = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18', '6', '43'];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('.score');
check('zolang het aantal niet bekend is staat er geen verwijt',
  !(await tekst('#paneel')).includes('geen aantal gekozen'));

// --- zelf invullen ---------------------------------------------------------
await page.click('[data-losse-start="safety_cars"]');
await page.waitForSelector('[data-losse-extra="safety_cars"]');
check('zelf invullen gebruikt dezelfde aantallen',
  (await page.$$eval('[data-losse-extra="safety_cars"]', (n) => n.length)) === 7);
// Eén ernaast: dat hoort de helft op te leveren, niet nul.
await page.click('[data-losse-extra="safety_cars"][data-waarde="3"]');
await page.click('#losseOpslaan');
await page.waitForSelector('.melding');

const na = await race1();
check('het aantal staat in de database', na.safety_cars === 3, String(na.safety_cars));
check('en is gemarkeerd als handmatig ingevuld', na.safety_cars_handmatig === true);

await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('.score');
const scherm = await tekst('#paneel');
check('eentje ernaast levert de helft van de punten op',
  /safety cars · 12 punten · handmatig ingevuld SC 2 het werd 3 safety cars 6/.test(scherm),
  scherm.match(/safety cars .{0,70}/)?.[0] ?? 'die regel staat er niet');

// --- de rode vlag, alles of niets -----------------------------------------
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  r.rode_vlag = true;                    // de speler zei nee
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('.score');
const vlagScherm = await tekst('#paneel');
check('een fout ja-of-nee levert niets op, en zegt wat het wel werd',
  /rode vlag · 20 punten RV nee het werd ja, rode vlag 0/.test(vlagScherm),
  vlagScherm.match(/rode vlag .{0,60}/)?.[0] ?? 'die regel staat er niet');

// --- ook wie niets voorspelde mag een ontbrekende uitslag aanvullen -------
// Suzuka heeft geen enkele voorspelling. Zonder dit blok kan niemand er meer
// bij zodra de hele poule een race heeft overgeslagen — en dan blijft die
// uitslag voor iedereen leeg.
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '3');
  r.drivers = globalThis.__db.races.find((x) => String(x.id) === '1').drivers;
  r.race_result = ['1', '12', '63'];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await openRace(page, 'Suzuka');
await page.click('[data-tab="race"]');
await page.waitForSelector('#paneel');
const leeg = await tekst('#paneel');
check('een race waarin je niets invulde zegt dat ook',
  leeg.includes('Je hebt hier niks ingevuld'), leeg.slice(0, 70) + '...');
check('maar de ontbrekende uitslagen zijn er wel in te vullen',
  (await page.$('[data-losse-start="safety_cars"]')) !== null
    && (await page.$('[data-losse-start="snelste_ronde"]')) !== null,
  leeg.slice(0, 110) + '...');

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
