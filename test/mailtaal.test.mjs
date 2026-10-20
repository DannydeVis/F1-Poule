// De mails van Supabase in de taal van de speler.
//
// De sjablonen (docs/mail/, test/mailsjablonen.test.mjs) kiezen hun taal op
// {{ .Data.taal }}: user_metadata.taal van het account. Wat hier vastligt is
// dat de app die taal daar zet, en wanneer dat wel en niet kan:
//
//   1. een anoniem account krijgt de taal mee bij het aanmaken;
//   2. een taalwissel onder Profiel zet hem bij (updateUser);
//   3. de koppelmail gaat in die taal;
//   4. een inloglink naar een bestaand account: Supabase negeert options.data
//      dan, dus die mail gaat in de taal waarin het account het laatst speelde,
//      en na het inloggen zet de app de taal van dit toestel;
//   5. een nieuw account via de inlogmail krijgt de taal van dit toestel.
//
// __mail.laatsteTaal() is wat er bij het versturen in user_metadata.taal stond.

import { maakControle, startPagina, naDeClaim } from './hulp.mjs';

const { check, afronden } = maakControle('mails in de taal van de speler');
const { page, jsFouten, stoppen, url } = await startPagina({ taal: '' });

const metadata = () => page.evaluate(() => globalThis.__mail.metadata());
const laatsteTaal = () => page.evaluate(() => globalThis.__mail.laatsteTaal());
const accounts = () => page.evaluate(() => globalThis.__db.auth_users);
const opTaal = async (taal) => {
  await page.evaluate((t) => localStorage.setItem('poule:taal', t), taal);
  await page.goto(url);
};
const wachtOp = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 5000 }).then(() => true, () => false);

// ---- 1: een anoniem account, in het Duits ------------------------------------
await opTaal('de');
await page.waitForSelector('#code');
await page.fill('#code', 'RTM026');
await page.click('#mee');
await page.waitForSelector('[data-lid]');
await page.click('[data-lid]:has(.nm:text-is("Danny"))');
await naDeClaim(page);
check('het anonieme account krijgt de taal mee bij het aanmaken',
  (await metadata())?.taal === 'de', JSON.stringify(await metadata()));

// ---- 2: de taal wisselen onder Profiel ---------------------------------------
await page.click('[data-weergave="profiel"]');
await page.waitForSelector('[data-taal="fr"]');
await page.click('[data-taal="fr"]');
check('een taalwissel onder Profiel zet de taal in het account',
  await wachtOp(() => globalThis.__mail.metadata()?.taal === 'fr'), JSON.stringify(await metadata()));

// ---- 3: de koppelmail ---------------------------------------------------------
await page.waitForSelector('#mailopen');
await page.click('#mailopen');
await page.waitForSelector('#mailveld');
await page.fill('#mailveld', 'speler@voorbeeld.nl');
await page.click('#mailstuur');
await page.waitForSelector('#mailopnieuw');
check('de koppelmail gaat in het Frans', (await laatsteTaal()) === 'fr', String(await laatsteTaal()));
await page.goto(await page.evaluate(() => globalThis.__mail.laatsteMaillink()));
await page.waitForSelector('[data-weergave]');
const danny = (await accounts()).find((u) => u.email === 'speler@voorbeeld.nl');
check('na de knop in de mail hoort het adres bij het account', !!danny);

// ---- 4: een tweede toestel, in het Spaans --------------------------------------
await page.evaluate(() => localStorage.clear());
await opTaal('es');
await page.waitForSelector('#inlogopen');
await page.click('#inlogopen');
await page.waitForSelector('#inlogveld');
await page.fill('#inlogveld', 'speler@voorbeeld.nl');
await page.click('#inlogstuur');
await page.waitForFunction(() => !document.querySelector('#inlogveld'));
check('de inlogmail naar een bestaand account gaat in de taal waarin dat account het laatst speelde',
  (await laatsteTaal()) === 'fr', String(await laatsteTaal()));
await page.goto(await page.evaluate(() => globalThis.__mail.laatsteMaillink()));
await page.waitForSelector('[data-weergave]');
check('na het inloggen zet de app de taal van dit toestel in het account',
  await wachtOp((id) => globalThis.__mail.metadata(id)?.taal === 'es', danny.id),
  JSON.stringify(await page.evaluate((id) => globalThis.__mail.metadata(id), danny.id)));

// ---- 5: een nieuw account via de inlogmail, in het Italiaans -------------------
await page.evaluate(() => localStorage.clear());
await opTaal('it');
await page.waitForSelector('#inlogopen');
await page.click('#inlogopen');
await page.waitForSelector('#inlogveld');
await page.fill('#inlogveld', 'nieuw@voorbeeld.nl');
await page.click('#inlogstuur');
await page.waitForSelector('#inlogopnieuw');
const nieuw = (await accounts()).find((u) => u.email === 'nieuw@voorbeeld.nl');
check('een nieuw account krijgt de taal van dit toestel, en de mail gaat in het Italiaans',
  nieuw?.user_metadata?.taal === 'it' && (await laatsteTaal()) === 'it',
  `${JSON.stringify(nieuw?.user_metadata)} · ${await laatsteTaal()}`);
check('en het bestaande account blijft in het Spaans',
  (await page.evaluate((id) => globalThis.__mail.metadata(id), danny.id))?.taal === 'es');

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
