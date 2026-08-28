// Regressietest voor de bug waarbij een opgeslagen voorspelling verdween
// zodra je terugging naar het overzicht en de race opnieuw opende.
//
// De oude versie schreef de rij wel naar de database maar werkte S.preds in
// het geheugen niet bij; het scherm las daarna nog de oude, lege stand.
// Deze test zakte op de oude versie met 0 van de 10 plekken ingevuld.

import { maakControle, startPagina, meedoen, openRace, kiesTien, naarDeel } from './hulp.mjs';

const { check, afronden } = maakControle('voorspelling bewaren');
const { page, jsFouten, stoppen } = await startPagina();

await meedoen(page);
check('poule openen en speler kiezen', true);

// --- invullen en opslaan --------------------------------------------------
await openRace(page, 'Melbourne');
await kiesTien(page);
const knop = (await page.textContent('#opslaan')).trim();
check('opslaanknop actief na 10 keuzes', knop === 'Opslaan', `knop: "${knop}"`);

const gekozen = await page.$$eval('.slot.vol .who', (n) => n.map((x) => x.firstChild.textContent.trim()));
await page.click('#opslaan');
await page.waitForSelector('[data-race]');

const melding = await page.$('.melding');
check('bevestiging na opslaan', !!melding, melding ? (await melding.textContent()).trim() : 'geen melding');

// answers bewaart een rij per vraag, dus één rij voor de kwalificatie-top-10.
const inDb = await page.evaluate(() => globalThis.__db.answers);
check('rij staat in de database',
  inDb.length === 1 && inDb[0].question_id === 'quali_top10'
    && inDb[0].waarde?.length === 10,
  `${inDb.length} rij(en): ${inDb.map((a) => a.question_id).join(', ')}`);

const vinkjes = await page.$$eval('[data-race]:has(.nm:text-is("Melbourne")) .mk i',
  (n) => n.map((x) => x.textContent + ':' + (x.className || 'uit')));
check('Q-vinkje aan op het overzicht', vinkjes[0] === 'Q:aan', vinkjes.join(' '));

// --- de kern: staat het er nog na opnieuw openen? -------------------------
await openRace(page, 'Melbourne');
const terug = await page.$$eval('.slot.vol .who', (n) => n.map((x) => x.firstChild.textContent.trim()));
check('voorspelling staat er nog na opnieuw openen',
  terug.length === 10 && terug.join() === gekozen.join(), `${terug.length} van 10 ingevuld`);

// --- wijzigen maakt geen tweede rij ---------------------------------------
await page.click('.slot.vol .x');            // haal P1 weg
await page.click('.drv:not([disabled])');    // kies een andere
await page.click('#opslaan');
await page.waitForSelector('[data-race]');
const na = await page.evaluate(() => globalThis.__db.answers);
check('wijzigen maakt geen tweede rij aan', na.length === 1, `${na.length} rijen`);

// --- kwalificatie dicht, race nog open ------------------------------------
await openRace(page, 'Shanghai');
await page.click('[data-tab="race"]');
await page.waitForSelector('.drv');

// De losse winnaar staat op dezelfde tab en hangt aan dezelfde deadline,
// maar wel achter het vragen-tabblad naast de top 10.
await naarDeel(page, 'vragen');
await page.click('[data-vraag="winnaar"]');
const winnaar = await page.getAttribute('.wknop.gekozen', 'data-kies');
await kiesTien(page);
await page.click('#opslaan');
await page.waitForSelector('[data-race]');
const shanghai = await page.evaluate(() =>
  globalThis.__db.answers.filter((a) => String(a.race_id) === '2'));
const vraag = (id) => shanghai.find((a) => a.question_id === id);

check('race-top-10 opslaan lukt terwijl de kwalificatie dicht is',
  vraag('race_top10')?.waarde?.length === 10, JSON.stringify(vraag('race_top10')?.waarde));
// De kwalificatie is dicht, dus daar hoort helemaal geen rij voor te komen.
// Een lege rij wegschrijven zou als "alles fout" scoren in plaats van als
// "niet meegedaan".
check('gesloten kwalificatie krijgt geen rij in plaats van een lege',
  vraag('quali_top10') === undefined,
  `rijen voor race 2: ${shanghai.map((a) => a.question_id).join(', ')}`);
check('de apart gekozen winnaar wordt meegeslagen',
  vraag('winnaar')?.waarde === winnaar && !!winnaar,
  `winnaar: ${vraag('winnaar')?.waarde}, gekozen: ${winnaar}`);

// --- race zonder deelnemerslijst ------------------------------------------
await openRace(page, 'Suzuka');
// witruimte platslaan: textContent houdt de regelafbrekingen uit de HTML,
// dus een zin die over twee regels loopt matcht anders nooit
const uitleg = (await page.textContent('#paneel')).replace(/\s+/g, ' ').trim();
check('race zonder deelnemerslijst legt uit dat de lijst nog komt',
  uitleg.includes('automatisch opgehaald'), uitleg.slice(0, 70) + '...');

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
