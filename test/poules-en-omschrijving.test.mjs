// Meer dan één poule op hetzelfde toestel, en een omschrijving per poule.
//
// Aanleiding: "Graag ook omschrijvingen aan de poule toevoegen. En mensen
// moeten meerdere poules kunnen beheren."
//
// Wat hier vastligt:
//   1. De poulebaas kan een omschrijving zetten en weer weghalen; leeg
//      opslaan is weghalen, niet een lege regel bewaren.
//   2. Poules waar je bij hoort blijven in een lijstje staan, ook na
//      "Andere poule" en na herladen — anders raak je ze kwijt door één keer
//      te kijken.
//   3. Wisselen kan zonder de code opnieuw in te tikken, en je bent aan de
//      andere kant meteen jezelf weer.
//   4. Een poule die niet meer bestaat verdwijnt uit het lijstje, met een
//      melding in plaats van een leeg scherm.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('meerdere poules en omschrijving');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const poulesInLijst = () => page.$$eval('[data-naar-poule]', (n) =>
  n.map((b) => b.dataset.naarPoule));

await meedoen(page);
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#pouleomschrijving');

// --- de omschrijving zetten -----------------------------------------------
check('een poule zonder omschrijving heeft een leeg veld',
  (await page.inputValue('#pouleomschrijving')) === '');
check('en opslaan kan pas als er iets veranderd is',
  await page.isDisabled('#omschrijvingBewaren'));

await page.fill('#pouleomschrijving', "Met de collega's, 5 euro inleg");
check('zodra je typt mag het wel', !(await page.isDisabled('#omschrijvingBewaren')));

await page.click('#omschrijvingBewaren');
await page.waitForSelector('.pouletekst');
check('de omschrijving staat onder de naam van de poule',
  (await tekst('.pouletekst')) === "Met de collega's, 5 euro inleg",
  await tekst('.pouletekst'));
check('en hij staat in de database',
  (await page.evaluate(() => globalThis.__db.pools[0].beschrijving))
    === "Met de collega's, 5 euro inleg");

// --- en weer weghalen ------------------------------------------------------
await page.fill('#pouleomschrijving', '   ');
await page.click('#omschrijvingBewaren');
await page.waitForSelector('.pouletekst', { state: 'detached' });
check('leeg opslaan haalt hem weg in plaats van een lege regel te bewaren',
  (await page.evaluate(() => globalThis.__db.pools[0].beschrijving)) === null);

await page.fill('#pouleomschrijving', 'Met de collega’s');
await page.click('#omschrijvingBewaren');
await page.waitForSelector('.pouletekst');

// --- een tweede poule ------------------------------------------------------
await page.evaluate(() => {
  globalThis.__db.pools.push({ id: 'pool-2', name: 'Buurtpoule', join_code: 'XYZ789',
    season: 2026, beschrijving: 'Met de buren, om de eer' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});

await page.click('#anderePoule');
await page.waitForSelector('#code');
check('"Andere poule" haalt je eigen poule niet uit het lijstje',
  (await poulesInLijst()).join(',') === 'pool-1', (await poulesInLijst()).join(','));
check('en die staat er met zijn omschrijving bij',
  (await tekst('[data-naar-poule="pool-1"]')).includes('Met de collega'),
  await tekst('[data-naar-poule="pool-1"]'));

await page.fill('#code', 'XYZ789');
await page.click('#mee');
await page.waitForSelector('#naam');
await page.fill('#naam', 'Danny');
await page.click('#maak');
await page.waitForSelector('[data-race]');

await page.click('[data-weergave="poule"]');
await page.waitForSelector('#pouleomschrijving');
check('de omschrijving van de nieuwe poule staat er meteen',
  (await tekst('.pouletekst')) === 'Met de buren, om de eer', await tekst('.pouletekst'));
check('en je eerste poule staat eronder als andere poule',
  (await poulesInLijst()).join(',') === 'pool-1', (await poulesInLijst()).join(','));

// --- wisselen zonder de code opnieuw in te tikken --------------------------
await page.click('[data-naar-poule="pool-1"]');
await page.waitForSelector('[data-race]');
check('je bent terug in de eerste poule',
  (await tekst('.merkpoule')) === 'Vrijdagmiddagpoule', await tekst('.merkpoule'));
check('en je hoefde niet opnieuw te zeggen wie je bent',
  (await page.$('#lijst')) === null && (await page.$('[data-weergave]')) !== null);

// --- het lijstje overleeft herladen ----------------------------------------
await page.reload();
await page.waitForSelector('[data-race]');
await page.click('[data-weergave="poule"]');
const onthouden = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('poule:poules') ?? '[]').map((p) => p.id).sort().join(','));
check('na herladen staan allebei je poules nog in het geheugen',
  onthouden === 'pool-1,pool-2', onthouden);
check('en de andere staat weer onder deze',
  (await poulesInLijst()).join(',') === 'pool-2', (await poulesInLijst()).join(','));

// --- een poule die weg is --------------------------------------------------
// Zonder dit bleef hij eeuwig in het lijstje staan en liep je elke keer tegen
// een leeg scherm aan.
await page.evaluate(() => {
  globalThis.__db.pools = globalThis.__db.pools.filter((p) => p.id !== 'pool-2');
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.click('[data-naar-poule="pool-2"]');
await page.waitForSelector('.melding');
check('een poule die niet meer bestaat zegt dat',
  (await tekst('.melding')).includes('bestaat niet meer'), await tekst('.melding'));
check('en verdwijnt uit het lijstje',
  (await poulesInLijst()).length === 0, (await poulesInLijst()).join(','));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
