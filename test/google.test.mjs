// Inloggen met Google.
//
// Waarom dit erbij is gekomen naast de maillink: "open je mail, zoek het
// bericht, klik de link" zijn drie handelingen waar er één had gekund. En het
// scheelt een eigen mailserver, wat voor een poule-app een scheve verhouding
// is.
//
// Wat hier vooral vastligt is wat het níét is. De voordeur blijft een
// poulecode: Google staat op precies dezelfde plek als de mailkoppeling, bij
// "je account meenemen", en is even optioneel. En de mailweg blijft bestaan —
// wie geen Google wil of heeft mag niet buiten de boot vallen.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('inloggen met Google');
const { page, jsFouten, stoppen, url } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const accounts = () => page.evaluate(() => globalThis.__db.auth_users);
const speler = (naam) => page.evaluate((n) =>
  globalThis.__db.pool_members.find((l) => l.display_name === n) ?? null, naam);
const link = () => page.evaluate(() => globalThis.__mail.laatsteLink());

// --- de voordeur verandert niet -------------------------------------------
await page.waitForSelector('#code');
check('het beginscherm vraagt nog steeds gewoon om een poulecode',
  (await page.$('#code')) !== null);
check('en Google staat onderaan bij het inloggen, niet als voordeur',
  (await page.$('#googleinlog')) !== null && (await page.$('#inlogopen')) !== null);

// --- toestel 1: meespelen en Google koppelen ------------------------------
await meedoen(page);
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#googlekoppel');
check('onder Poule staat Google als eerste keuze',
  (await tekst('#googlekoppel')).includes('Google'));
check('en de mailweg staat er gewoon naast',
  (await tekst('#mailopen')).includes('mailadres'));

await page.click('#googlekoppel');
await page.waitForTimeout(300);
check('er gaat een koppelverzoek de deur uit',
  (await page.evaluate(() => globalThis.__mail.aantalVerstuurd())) === 1);
check('maar er is nog niets gekoppeld tot je terugkomt',
  ((await accounts())[0].identities ?? []).every((i) => i.provider !== 'google'),
  JSON.stringify((await accounts())[0].identities));

// Terugkomen van Google is hetzelfde als op een maillink klikken: de sleutel
// staat in ?code= en supabase-js wisselt hem in.
await page.goto(await link());
await page.waitForSelector('[data-weergave], #code');
const na = (await accounts())[0];
check('na terugkomst hangt Google aan hetzelfde account',
  (na.identities ?? []).some((i) => i.provider === 'google'), JSON.stringify(na.identities));
check('en het account is niet anoniem meer', na.is_anonymous === false);
check('er is geen tweede account bijgekomen', (await accounts()).length === 1);
check('en je speler hangt nog steeds aan datzelfde account',
  (await speler('Danny')).user_id === na.id);

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler');
const poule = await tekst('#app');
const noemtAdres = poule.includes('danny@gmail.voorbeeld');
check('het scherm zegt waar je account aan hangt', noemtAdres,
  noemtAdres ? '' : poule.slice(0, 200));
check('en biedt niet nóg een keer aan om te koppelen',
  (await page.$('#googlekoppel')) === null && (await page.$('#mailopen')) === null);

// --- toestel 2: leeg, en toch bij je poule komen --------------------------
await page.evaluate(() => localStorage.clear());
await page.goto(url);
await page.waitForSelector('#googleinlog');
await page.click('#googleinlog');
await page.waitForTimeout(300);
await page.goto(await link());
await page.waitForSelector('[data-weergave], #code, [data-lid]');

const binnen = (await page.$('[data-race]')) !== null || (await page.$('[data-weergave]')) !== null;
check('de Google-inlog brengt je meteen in je poule, zonder poulecode', binnen,
  binnen ? '' : (await page.$('#code') ? 'nog op het codescherm' : 'onbekend scherm'));
check('en er is nog steeds maar één account', (await accounts()).length === 1);

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf');
check('je bent daar dezelfde speler als op je eerste toestel',
  (await tekst('.speler.zelf .nm')) === 'Danny', await tekst('.speler.zelf .nm'));
check('zonder dat er een tweede speler is aangemaakt',
  (await page.evaluate(() => globalThis.__db.pool_members.length)) === 1);

// --- iemand anders zijn Google-account -------------------------------------
// Twee mensen op één toestel mogen niet in elkaars account belanden.
await page.evaluate(() => {
  localStorage.clear();
  globalThis.__mail.googleAls('joey@gmail.voorbeeld');
});
await page.goto(url);
await page.waitForSelector('#googleinlog');
await page.click('#googleinlog');
await page.waitForTimeout(300);
await page.goto(await link());
await page.waitForSelector('[data-weergave], #code, [data-lid]');
const twee = await accounts();
check('een onbekend Google-account krijgt zijn eigen account', twee.length === 2,
  String(twee.length));
check('en komt niet in de speler van een ander terecht',
  (await speler('Danny')).user_id === twee[0].id,
  `${(await speler('Danny')).user_id} tegen ${twee[0].id}`);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
