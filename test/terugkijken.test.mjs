// Wat je hebt ingeleverd moet je kunnen terugkijken — en wat de anderen
// hebben ingeleverd pas nadat het gesloten is.
//
// Aanleiding, twee klachten die eigenlijk één ding zijn:
//
//   "Als de kwalificatie begint kan ik niet meer zien wat ik gekozen had.
//    Maak een scherm die niet gewijzigd kan worden maar nog wel bekeken."
//   "Ik wil zien wat de andere spelers gekozen hebben. (...) Dit kan alleen
//    gezien worden nadat het gesloten is."
//
// Wat hier vastligt:
//   1. Na de deadline staat je eigen inzending nog gewoon op het scherm.
//   2. Daar zit geen enkele knop bij waarmee je hem nog kunt wijzigen.
//   3. Een andere speler aantikken laat zijn inzending zien, met de score
//      als de uitslag binnen is.
//   4. Zolang de tab nog openstaat kan dat niet — dan is het geheim.

import { maakControle, startPagina, meedoen, openRace, kiesTien, kiesVoor }
  from './hulp.mjs';

const { check, afronden } = maakControle('terugkijken: je eigen en andermans inzending');
const { page, jsFouten, stoppen } = await startPagina();

await meedoen(page);

// Een tweede speler, zodat "de rest" iets te tonen heeft.
await page.evaluate(() => {
  globalThis.__db.pool_members.push(
    { member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Joey' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');

// ------------------------------------------------------------------
// 1. Invullen terwijl het nog open is, en dan de deadline laten passeren.
// ------------------------------------------------------------------
await openRace(page, 'Melbourne');
await kiesTien(page);
await kiesVoor(page, '[data-vraagplek="pole"]', '16');   // Leclerc
const mijnTop = await page.$$eval('.slot.vol .code', (els) => els.map((e) => e.textContent.trim()));
await page.click('#opslaan');
await page.waitForSelector('[data-race]');

check('tien plekken ingevuld voor de kwalificatie', mijnTop.length === 10, mijnTop.join(','));

// Deadline naar het verleden schuiven: nu is de kwalificatie gesloten, maar
// de uitslag is er nog niet. Precies het gat waar eerst niets stond.
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  r.deadline_quali = new Date(Date.now() - 3600e3).toISOString();
  globalThis.__db.answers.push(
    { pool_id:'pool-1', race_id:1, member_id:'lid-2', question_id:'quali_top10',
      waarde: ['44','1','63','16','4','81','10','14','18','12'] },
    { pool_id:'pool-1', race_id:1, member_id:'lid-2', question_id:'pole', waarde:'44' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');
await openRace(page, 'Melbourne');
// Een race openen springt naar de tab die nog openstaat, dus na de deadline
// naar de race. Wij willen juist de gesloten kwalificatie zien.
await page.click('[data-tab="quali"]');
await page.waitForSelector('#paneel');

check('de kwalificatie staat op gesloten',
  (await page.textContent('#paneel')).includes('Inzendingen zijn gesloten'));

// ------------------------------------------------------------------
// 2. Je eigen inzending is nog te zien, en niet meer te wijzigen.
// ------------------------------------------------------------------
const terugTop = await page.$$eval('#paneel .strip .sr .code', (els) => els.map((e) => e.textContent.trim()));
check('je eigen top 10 staat er nog, in dezelfde volgorde',
  terugTop.slice(0, 10).join(',') === mijnTop.join(','),
  `${terugTop.slice(0, 10).join(',')} tegen ${mijnTop.join(',')}`);
check('en de losse vraag die je invulde ook',
  (await page.textContent('#paneel')).includes('LEC'));

// Het scherpe punt: nergens meer een manier om er nog aan te zitten.
check('geen opslaanknop meer', (await page.$('#opslaan')) === null);
check('geen lege plek meer om aan te tikken', (await page.$('[data-plek]')) === null);
check('geen keuzeknop meer bij een vraag', (await page.$('[data-vraagplek]')) === null);
check('geen wis-allesknop meer', (await page.$('#wisalles')) === null);

// ------------------------------------------------------------------
// 3. Andermans inzending zit achter zijn naam.
// ------------------------------------------------------------------
check('de andere speler staat er als knop, niet als dood tekstje',
  (await page.$('button.rest[data-bekijk="lid-2"]')) !== null);

await page.click('button.rest[data-bekijk="lid-2"]');
await page.waitForSelector('#inkijkterug');
check('de naam van wie je inkijkt staat bovenaan',
  (await page.textContent('.inkijkkop .nm')).trim() === 'Joey');
const zijnTop = await page.$$eval('#paneel .strip .sr .code', (els) => els.map((e) => e.textContent.trim()));
check('en dit is zíjn top 10, niet die van jou',
  zijnTop[0] === 'HAM' && zijnTop.slice(0, 10).join(',') !== mijnTop.join(','),
  zijnTop.slice(0, 10).join(','));
check('ook in andermans scherm valt er niets te wijzigen',
  (await page.$('#opslaan')) === null && (await page.$('[data-plek]')) === null);

await page.click('#inkijkterug');
await page.waitForSelector('[data-bekijk]');
check('en je komt weer terug bij je eigen scherm',
  (await page.textContent('#paneel')).includes('jouw inzending'));

// ------------------------------------------------------------------
// 4. Zolang het openstaat is het geheim.
// ------------------------------------------------------------------
await page.click('[data-tab="race"]');
await page.waitForSelector('#paneel');
check('de race staat nog open, dus daar is niemand in te kijken',
  (await page.$('[data-bekijk]')) === null && (await page.$('#opslaan')) !== null);

// ------------------------------------------------------------------
// 5. Met een uitslag erbij hoort de score van de ander erbij te staan.
// ------------------------------------------------------------------
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  r.quali_result = ['44','1','63','16','4','81','10','14','18','12','6','43'];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');
await openRace(page, 'Melbourne');
await page.click('[data-tab="quali"]');
await page.waitForSelector('[data-bekijk]');

// Joey heeft de uitslag exact goed: tien keer vijf punten voor de top 10,
// plus tien voor de pole. Dat kunnen we uitrekenen, dus dat controleren we.
const joeyRij = await page.textContent('button.rest[data-bekijk="lid-2"] .t');
check('de score van de ander staat in de lijst', joeyRij.trim() === '60', joeyRij);

await page.click('button.rest[data-bekijk="lid-2"]');
await page.waitForSelector('#inkijkterug');
check('en ook boven zijn inzending',
  (await page.textContent('.inkijkkop .t')).trim() === '60');
const punten = await page.$$eval('#paneel .strip .sr .pts', (els) => els.map((e) => e.textContent.trim()));
check('met per regel wat het opleverde',
  punten.slice(0, 10).every((p) => p === '5'), punten.join(','));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
