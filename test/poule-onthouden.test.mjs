// Twee klachten uit de praktijk:
//
//   "Ik moet iedere keer de code opnieuw invullen van de poule"
//   "Het opslaan lukt niet"
//
// De app onthield alleen wie je was *binnen* een poule, maar nooit welke
// poule dat was, dus elke keer begon je op het codescherm. En kwam je op
// het "Wie ben jij?"-scherm en typte je je naam in plaats van hem aan te
// klikken, dan maakte de app een tweede speler aan. Je voorspellingen
// hingen aan het oude member_id en waren daarmee onvindbaar — precies het
// beeld van "opslaan lukt niet".

import { maakControle, startPagina, meedoen, openRace, kiesTien } from './hulp.mjs';

const { check, afronden } = maakControle('poule en speler onthouden');
const { page, jsFouten, stoppen } = await startPagina();

// --- eenmalig meedoen en een voorspelling opslaan --------------------------
await meedoen(page);
await openRace(page, 'Melbourne');
await kiesTien(page);
await page.click('#opslaan');
await page.waitForSelector('[data-race]');
check('voorspelling opgeslagen als startpunt',
  (await page.evaluate(() => globalThis.__db.predictions.length)) === 1);

// --- na herladen niet opnieuw de code hoeven typen -------------------------
await page.reload();
await page.waitForSelector('[data-race], #code');
check('na herladen meteen terug in de poule, geen codescherm',
  (await page.$('#code')) === null && (await page.$('[data-race]')) !== null);

const vinkjes = await page.$$eval('[data-race]:has(.nm:text-is("Melbourne")) .mk i',
  (n) => n.map((x) => x.textContent + ':' + (x.className || 'uit')));
check('de voorspelling hoort nog steeds bij mij', vinkjes[0] === 'Q:aan', vinkjes.join(' '));

// --- ander toestel: wel de code, maar geen onthouden speler ---------------
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('#code');
check('zonder onthouden poule begint de app weer bij de code', true);

await meedoen(page);   // code invoeren en de bestaande naam aanklikken
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('#code');
await page.fill('#code', 'RTM026');
await page.click('#mee');
await page.waitForSelector('#naam');

// De naam intypen in plaats van aanklikken: dit maakte vroeger een tweede
// speler aan en daarmee raakte je je voorspellingen kwijt.
await page.fill('#naam', 'danny');           // ook nog met andere hoofdletters
await page.click('#maak');
await page.waitForSelector('[data-race]');

const spelers = await page.evaluate(() => globalThis.__db.pool_members.length);
check('bestaande naam intypen maakt geen tweede speler aan', spelers === 1, `${spelers} spelers`);

const naVinkjes = await page.$$eval('[data-race]:has(.nm:text-is("Melbourne")) .mk i',
  (n) => n.map((x) => x.textContent + ':' + (x.className || 'uit')));
check('en de eerdere voorspelling is er nog', naVinkjes[0] === 'Q:aan', naVinkjes.join(' '));

await openRace(page, 'Melbourne');
const ingevuld = await page.$$eval('.slot.vol', (n) => n.length);
check('de top 10 staat weer volledig ingevuld', ingevuld === 10, `${ingevuld}/10`);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
