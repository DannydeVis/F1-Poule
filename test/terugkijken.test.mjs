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

// ------------------------------------------------------------------
// 6. Layout van de kop: de naam en score mogen niet van het scherm lopen.
// ------------------------------------------------------------------
//
// Aanleiding: een screenshot waarin de terugknop de hele breedte van de rij
// innam en de score ver naar rechts uit beeld verdween. .knop is standaard
// width:100%, en zonder een expliciete override in .inkijkkop bleef dat zo.
const kopMaten = await page.evaluate(() => {
  const kop = document.querySelector('.inkijkkop');
  const knop = kop.querySelector('.knop');
  const naam = kop.querySelector('.nm');
  const score = kop.querySelector('.t');
  return {
    kopBreedte: kop.getBoundingClientRect().width,
    knopBreedte: knop.getBoundingClientRect().width,
    naamZichtbaar: naam.getBoundingClientRect().width > 0,
    scoreRechts: score.getBoundingClientRect().right,
    vensterBreedte: window.innerWidth,
  };
});
check('de terugknop neemt niet de hele breedte van de kop in',
  kopMaten.knopBreedte < kopMaten.kopBreedte * 0.5,
  `knop ${kopMaten.knopBreedte} van ${kopMaten.kopBreedte}`);
check('de naam is zichtbaar naast de knop', kopMaten.naamZichtbaar);
check('de score valt binnen het scherm, niet erbuiten',
  kopMaten.scoreRechts <= kopMaten.vensterBreedte,
  `score eindigt op ${kopMaten.scoreRechts}, venster is ${kopMaten.vensterBreedte} breed`);

await page.click('#inkijkterug');
await page.waitForSelector('[data-bekijk]');

// ------------------------------------------------------------------
// 7. Geen top 10 ingevuld is ook een antwoord, en verdient een regel.
// ------------------------------------------------------------------
//
// Aanleiding: een speler had wel de winnaar en een duel ingevuld, maar geen
// top 10 — en dan liet het scherm daar helemaal niets van zien. Geen top 10,
// maar ook geen woord erover, dus leek het alsof er iets mislukt was in
// plaats van dat er simpelweg niets ingeleverd was.
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  r.race_result = ['1', '6', '63', '16', '44', '4', '81', '10', '14', '18', '12', '43'];
  globalThis.__db.answers.push(
    { pool_id: 'pool-1', race_id: 1, member_id: 'lid-2', question_id: 'winnaar', waarde: '1' },
    { pool_id: 'pool-1', race_id: 1, member_id: 'lid-2', question_id: 'teamgenoot_duels', waarde: ['1'] });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('[data-bekijk]');
await page.click('button.rest[data-bekijk="lid-2"]');
await page.waitForSelector('#inkijkterug');

const raceTekst = await page.textContent('#paneel');
check('winnaar en duel staan er wel', raceTekst.includes('won de race'));
check('top 10 laat weten dat er niets is ingevuld, in plaats van niets te zeggen',
  raceTekst.includes('top 10') && raceTekst.includes('niets ingevuld'));
// Het duelblok tekent ook een <ul class="strip">, dus dat element bestaat
// hier wel — de top 10 is te herkennen aan zijn "P1".."P10"-labels.
const posLabels = await page.$$eval('.sr .pos', (els) => els.map((e) => e.textContent.trim()));
check('geen top-10-rijen aanwezig, want die is niet ingevuld',
  !posLabels.some((p) => /^P\d+$/.test(p)), posLabels.join(', '));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
