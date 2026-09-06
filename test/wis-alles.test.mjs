// Opnieuw beginnen zonder tien keer een kruisje te zoeken.
//
// Aanleiding: "Ik wilde een nieuwe voorspelling doen maar er stond geen wis
// alles knop. Ik moest het 1 voor 1."
//
// Wat hier vastligt:
//   1. De knop is er zodra er iets te wissen valt, en niet daarvoor.
//   2. Eén tik wist nog niets — hij vraagt eerst of je het zeker weet.
//   3. De tweede tik wist de top 10 én de losse vragen én de duels.
//   4. Hij wist alleen de tab waar je op staat. De kwalificatie en de race
//      zijn twee losse inzendingen; wie zijn race overdoet mag zijn
//      kwalificatie niet kwijtraken.

import { maakControle, startPagina, meedoen, openRace, kiesTien, kiesVoor, opPlek }
  from './hulp.mjs';

const { check, afronden } = maakControle('wis alles: opnieuw beginnen');
const { page, jsFouten, stoppen } = await startPagina();

await meedoen(page);
await openRace(page, 'Melbourne');

// ------------------------------------------------------------------
// 1. Niets ingevuld, dus niets te wissen.
// ------------------------------------------------------------------
check('zonder ingevulde keuze is er geen wis-allesknop',
  (await page.$('#wisalles')) === null);

// ------------------------------------------------------------------
// 2. Eén plek is al genoeg om de knop te laten verschijnen.
// ------------------------------------------------------------------
await kiesVoor(page, '[data-plek="0"]', '1');
check('één ingevulde plek laat de knop verschijnen',
  (await page.$('#wisalles')) !== null);

await kiesTien(page);
await kiesVoor(page, '[data-vraagplek="pole"]', '16');
check('de top 10 staat vol',
  (await page.textContent('.topkop .mono')).trim() === '10/10');
check('en de pole is gekozen', (await opPlek(page, '[data-vraagplek="pole"]')) === 'LEC');

// ------------------------------------------------------------------
// 3. Eén tik wist nog niets.
// ------------------------------------------------------------------
await page.click('#wisalles');
check('na één tik vraagt de knop eerst of je het echt bedoelt',
  (await page.textContent('#wisalles')).includes('nog een keer')
    && await page.$eval('#wisalles', (b) => b.classList.contains('zeker')),
  await page.textContent('#wisalles'));
check('en er is nog niets weg',
  (await page.textContent('.topkop .mono')).trim() === '10/10');

// ------------------------------------------------------------------
// 4. De tweede tik wist alles van deze tab.
// ------------------------------------------------------------------
await page.click('#wisalles');
check('na de tweede tik is de top 10 leeg',
  (await page.textContent('.topkop .mono')).trim() === '0/10');
check('en de losse vraag ook',
  (await page.textContent('[data-vraagplek="pole"]')).includes('kies'));
check('de knop is weer verdwenen, want er valt niets meer te wissen',
  (await page.$('#wisalles')) === null);
check('en opslaan kan niet meer',
  await page.$eval('#opslaan', (b) => b.disabled));

// ------------------------------------------------------------------
// 5. De andere tab blijft staan.
// ------------------------------------------------------------------
await kiesTien(page);                                  // kwalificatie weer vol
await page.click('[data-tab="race"]');
await page.waitForSelector('#paneel');
await kiesTien(page);
await kiesVoor(page, '[data-vraagplek="winnaar"]', '1');
// Een duel erbij: die hangen aan de race en horen dus ook mee te gaan.
await page.click('.duelknop');
check('op de race staat nu ook een duel aan',
  (await page.$('.duelknop.gekozen')) !== null);

await page.click('#wisalles');
await page.click('#wisalles');
check('de race is leeg', (await page.textContent('.topkop .mono')).trim() === '0/10');
check('de winnaar is weg',
  (await page.textContent('[data-vraagplek="winnaar"]')).includes('kies'));
check('en het duel ook', (await page.$('.duelknop.gekozen')) === null);

await page.click('[data-tab="quali"]');
await page.waitForSelector('#paneel');
check('maar de kwalificatie staat er nog gewoon',
  (await page.textContent('.topkop .mono')).trim() === '10/10');

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
