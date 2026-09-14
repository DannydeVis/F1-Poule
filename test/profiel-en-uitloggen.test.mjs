// "Als ik ingelogd ben, staat er nog steeds een optie inloggen via....
// ik denk dat we een profiel functie moeten bouwen zodat je daar alles kan
// veranderen en eventueel uitloggen."
//
// Twee dingen zaten hier los van elkaar: het beginscherm bood "Inloggen
// met..." aan ongeacht of dit toestel al een gekoppeld account had, en alles
// wat over je account ging (koppelen, je eigen link, privacy) stond
// verspreid onder Poule, tussen de spelerslijst en de vragenset.
//
// Het scherpe punt zit in het uitloggen zelf. Zonder gekoppeld mailadres of
// Google-account is er na het uitloggen geen weg terug naar je speler — dat
// is precies waarom de app dat eerder niet aanbood. De knop mag er dus
// alleen zijn als kanTerugkomen() dat ook echt waarmaakt.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('profiel: koppelen, weten wie je bent, en uitloggen');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

await meedoen(page);

// --- de Profiel-tab bundelt wie je bent -------------------------------------
await page.click('[data-weergave="profiel"]');
await page.waitForSelector('#eigenlink');
const profiel1 = await tekst('#app');
check('de Profiel-tab zegt als wie je speelt',
  profiel1.includes('Je speelt hier als') && profiel1.includes('Danny'));
check('zonder gekoppeld account staat er nog geen uitlogknop',
  (await page.$('#uitloggen')) === null);
check('maar wel een uitleg waarom niet',
  profiel1.includes('geen weg terug'), profiel1);

// --- koppel een mailadres, zodat er wél een weg terug is --------------------
await page.click('#mailopen');
await page.waitForSelector('#mailveld');
await page.fill('#mailveld', 'danny@voorbeeld.nl');
await page.click('#mailstuur');
await page.waitForSelector('#mailopnieuw');
const bevestig = await page.evaluate(() => globalThis.__mail.laatsteLink());
await page.goto(bevestig);
await page.waitForSelector('[data-weergave], #code');

await page.click('[data-weergave="profiel"]');
await page.waitForSelector('#uitloggen');
check('na koppelen staat de uitlogknop er wel', (await page.$('#uitloggen')) !== null);

// --- het beginscherm biedt geen dubbele inlog meer aan ----------------------
await page.click('#anderePoule');
await page.waitForSelector('#code');
const start = await tekst('#app');
check('het beginscherm zegt dat je al ingelogd bent',
  start.includes('Je bent al ingelogd'), start);
check('en biedt niet nóg een keer "Inloggen met..." aan',
  (await page.$('#googleinlog')) === null && (await page.$('#inlogopen')) === null);

// Terug naar de poule: de gekoppelde sessie herkent je automatisch, geen
// "Wie ben jij?" nodig.
await page.click('[data-naar-poule]');
await page.waitForSelector('[data-race]');
check('terug in de poule ben je zonder iets aan te klikken gewoon weer Danny',
  (await page.evaluate(() => globalThis.__db.pool_members[0].user_id)) !== null);

// --- uitloggen vraagt eerst een bevestiging ---------------------------------
await page.click('[data-weergave="profiel"]');
await page.waitForSelector('#uitloggen');
await page.click('#uitloggen');
check('één tik vraagt eerst', (await tekst('#uitloggen')).includes('Zeker'));

await page.click('#uitloggen');
await page.waitForSelector('#naam, #code, [data-lid]');

check('de lokale sessie is na uitloggen weg',
  (await page.evaluate(() => localStorage.getItem('nabootsing:sessie'))) === null);
check('het account zelf bestaat nog gewoon, alleen de sessie is weg',
  (await page.evaluate(() => globalThis.__db.auth_users.length)) === 1);
check('dit toestel herkent je niet langer automatisch',
  (await page.$('[data-race]')) === null);

// --- terugkomen kan alleen nog met de inloglink -----------------------------
if (await page.$('[data-lid]')) {
  await page.click('[data-lid]:has(.nm:text-is("Danny"))');
  await page.waitForSelector('[data-race]');
  check('je eigen naam aanklikken alleen laat weten dat je moet inloggen',
    (await tekst('#app')).includes('Log in met je mailadres'));
}

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
