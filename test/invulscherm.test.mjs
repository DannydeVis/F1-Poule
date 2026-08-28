// Het invulscherm in twee helften: de top 10 en de losse vragen.
//
// Aanleiding is feedback uit de poule zelf: "ik vind het opstellen van de top
// 10 een beetje onduidelijk" en "is veel te groot". Met alle negen vragen aan
// stond er op een telefoon ruim duizend pixels aan vragen bóven de top 10, en
// de coureurlijst stond daar nog eens zeshonderd pixels ónder. Je tikte een
// coureur aan en zag niet waar hij landde.
//
// Wat hier vastligt:
//   1. De twee helften zitten achter hun eigen tabblad, met een teller.
//   2. De coureurlijst staat bóven de top 10, zodat je je keuze ziet landen.
//   3. Het scherm zegt welke plek je nu invult, en markeert die plek.
//   4. Een poule zonder top 10 krijgt er ook geen te zien — en kan dus geen
//      lijst invullen die toch niet bewaard wordt.

import { maakControle, startPagina, meedoen, openRace, kiesTien, naarDeel } from './hulp.mjs';

const { check, afronden } = maakControle('invulscherm in twee helften');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

await meedoen(page);
await openRace(page, 'Melbourne');

// --- de twee tabbladen -----------------------------------------------------
const tabjes = await page.$$eval('[data-deel]', (n) =>
  n.map((b) => b.textContent.replace(/\s+/g, ' ').trim()));
check('de top 10 en de vragen hebben elk een eigen tabblad',
  tabjes.length === 2 && tabjes[0].startsWith('Top 10') && tabjes[1].startsWith('Vragen'),
  tabjes.join(' | '));
check('de tellers zeggen wat er nog open staat',
  tabjes[0].includes('0/10') && tabjes[1].includes('0/1'), tabjes.join(' | '));

check('de top 10 staat open als je binnenkomt',
  (await page.getAttribute('[data-deel="top10"]', 'aria-selected')) === 'true');
check('en de vragen staan dus niet in de weg',
  (await page.$('[data-vraag="pole"]')) === null);

// --- de volgorde binnen de top 10 -----------------------------------------
// De coureurlijst hoort bóven de slots te staan: tik je iemand aan, dan zie je
// hem landen zonder te scrollen.
const volgorde = await page.$$eval('#paneel > *', (n) =>
  n.map((x) => x.className || x.tagName.toLowerCase()));
const lijstIndex = volgorde.findIndex((c) => c.includes('coureurs'));
const gridIndex = volgorde.findIndex((c) => c.includes('grid10'));
check('de coureurlijst staat boven de top 10, niet eronder',
  lijstIndex >= 0 && gridIndex >= 0 && lijstIndex < gridIndex,
  `coureurs op ${lijstIndex}, grid10 op ${gridIndex}`);

check('het scherm zegt welke plek je nu invult',
  (await tekst('#paneel')).includes('tik aan wie P1 wordt'),
  (await tekst('#paneel')).slice(0, 60) + '...');
const beurt = await page.$$eval('.slot.beurt .pos', (n) => n.map((x) => x.textContent));
check('en markeert precies één plek als de beurt',
  beurt.length === 1 && beurt[0] === 'P1', beurt.join(', '));

await page.click('.drv:not([disabled])');
check('na één keuze schuift de beurt op naar P2',
  (await tekst('#paneel')).includes('tik aan wie P2 wordt')
    && (await page.$eval('.slot.beurt .pos', (x) => x.textContent)) === 'P2');
check('en de teller op het tabblad telt mee',
  (await tekst('[data-deel="top10"]')).includes('1/10'),
  await tekst('[data-deel="top10"]'));

// --- de opslaanknop legt uit waar hij op wacht ----------------------------
check('een halve top 10 zegt dat hij afgemaakt moet worden',
  (await tekst('#opslaan')).includes('Maak de top 10 af'), await tekst('#opslaan'));

// --- wisselen naar de vragen ----------------------------------------------
await naarDeel(page, 'vragen');
check('de polekiezer staat achter het vragen-tabblad',
  (await page.$('[data-vraag="pole"]')) !== null);
check('en de top 10 is dan niet meer in beeld',
  (await page.$('.grid10')) === null);
check('de opslaanknop blijft op allebei staan', (await page.$('#opslaan')) !== null);

await page.click('[data-vraag="pole"]');
check('de vragenteller telt ook mee',
  (await tekst('[data-deel="vragen"]')).includes('1/1'),
  await tekst('[data-deel="vragen"]'));

// De halve top 10 blijft bewaard terwijl je aan de andere kant bezig bent.
await naarDeel(page, 'top10');
check('je halve top 10 staat er nog na het wisselen',
  (await page.$$eval('.slot.vol', (n) => n.length)) === 1);

// --- afmaken en opslaan ----------------------------------------------------
await kiesTien(page);
check('de lijst is vol en zegt dat ook',
  (await tekst('#paneel')).includes('je top 10 is compleet'));
check('er is dan geen beurt-plek meer over',
  (await page.$('.slot.beurt')) === null);
check('en er valt niets meer bij te kiezen',
  (await page.$('.drv:not([disabled])')) === null);

await page.click('#opslaan');
await page.waitForSelector('[data-race]');
const bewaard = await page.evaluate(() => globalThis.__db.answers);
check('top 10 en losse vraag gaan samen in één keer mee',
  bewaard.length === 2
    && bewaard.find((a) => a.question_id === 'quali_top10')?.waarde?.length === 10
    && !!bewaard.find((a) => a.question_id === 'pole'),
  bewaard.map((a) => a.question_id).join(', '));

// --- een poule zonder losse vragen op deze tab ----------------------------
// Dan valt er niets te wisselen en horen de tabjes weg te blijven; anders
// staat er een leeg tabblad naast de top 10.
await page.evaluate(() => {
  globalThis.__db.pool_questions.push(
    { pool_id: 'pool-1', question_id: 'quali_top10' },
    { pool_id: 'pool-1', question_id: 'race_top10' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await openRace(page, 'Melbourne');
check('zonder losse vragen op deze tab zijn er geen tabjes',
  (await page.$('[data-deel]')) === null);
check('maar de top 10 staat er gewoon', (await page.$('.grid10')) !== null);

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
  (await page.$('.grid10')) === null);
check('en de vraag die wél meedoet staat er meteen',
  (await page.$('[data-vraag="pole"]')) !== null);
check('er zijn ook geen tabjes, want er valt niets te wisselen',
  (await page.$('[data-deel]')) === null);

// De pole van hierboven staat er nog, dus deze tik zet hem juist uit. De knop
// mag dan niet over een top 10 beginnen die deze poule niet eens heeft.
await page.click('[data-vraag="pole"]');
check('zonder top 10 gaat de knop ook niet over een top 10',
  (await tekst('#opslaan')) === 'Nog niets gekozen', await tekst('#opslaan'));

const anders = await page.$$eval('[data-vraag="pole"]', (n) =>
  n.filter((b) => !b.classList.contains('gekozen'))[0].dataset.kies);
await page.click(`[data-vraag="pole"][data-kies="${anders}"]`);
check('opslaan kan gewoon zonder top 10',
  (await tekst('#opslaan')) === 'Opslaan', await tekst('#opslaan'));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
