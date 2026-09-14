// "Wellicht ook iets doen met publieke en prive poules?"
//
// De keus die dit maakt: "privé" blijft precies wat het al was — wie de
// code heeft, kan alles zien en meedoen. Dat verandert hier niet, en de
// database controleerde dat toch al niet af (pools_lezen stond al open).
// "Openbaar" voegt alleen een nieuwe manier toe om een poule te *vinden*:
// een lijst op het beginscherm, voor wie geen code heeft. Alleen de
// poulebaas zet die knop om, net als bij de omschrijving en de vragenset.

import { maakControle, startPagina, meedoen, naDeClaim } from './hulp.mjs';

const { check, afronden } = maakControle('openbare poules: meedoen zonder code');
const { page, jsFouten, stoppen, url } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const isPublic = () => page.evaluate(() => globalThis.__db.pools[0].is_public);

await meedoen(page);
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#openbaarKnop');
check('een poule is standaard niet openbaar', !(await isPublic()));
check('de knop biedt aan om hem openbaar te maken',
  (await tekst('#openbaarKnop')) === 'Maak openbaar');

// --- openbaar maken en weer terug -------------------------------------------
await page.click('#openbaarKnop');
await page.waitForSelector('.melding');
check('de melding zegt dat het gelukt is',
  (await tekst('.melding')).includes('nu openbaar'), await tekst('.melding'));
check('en de database is bijgewerkt', await isPublic());
check('de knop biedt nu aan om weer privé te maken',
  (await tekst('#openbaarKnop')) === 'Maak weer privé');

await page.click('#openbaarKnop');
await page.waitForSelector('.melding');
check('privé maken werkt ook, en de database volgt', !(await isPublic()),
  await tekst('.melding'));

// Terug naar openbaar, en er komt een tweede, NIET-openbare poule bij: de
// lijst hoort alleen de eerste te tonen.
await page.click('#openbaarKnop');
await page.waitForSelector('.melding');
await page.evaluate(() => {
  globalThis.__db.pools.push({ id: 'pool-2', name: 'Geheime buurtpoule',
    join_code: 'GEH123', season: 2026, is_public: false });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});

// --- een vers toestel vindt de poule zonder de code -------------------------
await page.evaluate(() => localStorage.clear());
await page.goto(url);
await page.waitForSelector('#code');
check('een vers toestel begint gewoon bij de poulecode, geen lijst nog open',
  (await page.$('[data-naar-poule]')) === null);

await page.click('#openbareOpen');
await page.waitForSelector('[data-naar-poule]');
const namen = await page.$$eval('[data-naar-poule] .nm', (n) => n.map((x) => x.textContent.trim()));
check('de openbare poule staat in de lijst',
  namen.includes('Vrijdagmiddagpoule'), namen.join(', '));
check('de niet-openbare poule staat er niet bij',
  !namen.includes('Geheime buurtpoule'), namen.join(', '));

await page.click('[data-naar-poule]');
await page.waitForSelector('[data-lid]');
check('een klik brengt je meteen bij de spelerslijst, zonder de code te tikken',
  (await page.$('[data-lid]')) !== null && (await page.$('#code')) === null);

await page.click('[data-lid]:has(.nm:text-is("Danny"))');
await naDeClaim(page);
check('en je kunt jezelf daar gewoon aanwijzen', (await page.$('[data-race]')) !== null);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
