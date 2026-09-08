// De belofte waarvoor de hele login gebouwd is: jouw voorspelling is van jou.
//
// De anon key staat publiek in index.html — dat hoort zo — en tot nu toe was
// dat genoeg om andermans top 10 te overschrijven. Sinds de policies dicht
// staan kan dat niet meer. Deze test controleert niet de policies zelf (dat
// doet test/policies.test.sql tegen een echte PostgreSQL), maar wat de app
// ervan laat zien. Dat is minstens zo belangrijk: RLS geeft namelijk géén
// foutmelding, een geblokkeerde schrijfactie raakt gewoon nul rijen. Zonder
// uitleg op het scherm is dat een app die zwijgend niets opslaat.
//
// Ook getest: de enige uitweg uit een verkeerde claim. Eén misklik op het
// "Wie ben jij?"-scherm hangt iemands hele seizoen aan het verkeerde account,
// en de database laat dat met opzet niet terugdraaien. De poulebaas kan de
// speler losmaken; daarna claimt de volgende die zich aanmeldt hem opnieuw.

import { maakControle, startPagina, meedoen, openRace, kiesTien } from './hulp.mjs';

const { check, afronden } = maakControle('van wie is deze inzending');
const { page, jsFouten, stoppen } = await startPagina();

const speler = (naam) => page.evaluate((n) =>
  globalThis.__db.pool_members.find((l) => l.display_name === n) ?? null, naam);
const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

// --- Danny doet mee en claimt zichzelf ------------------------------------
await meedoen(page);
const danny = await speler('Danny');
check('Danny hangt aan het account van dit toestel', !!danny.user_id, JSON.stringify(danny));

await openRace(page, 'Melbourne');
await kiesTien(page);
await page.click('#opslaan');
await page.waitForSelector('[data-race]');
check('en kan zijn eigen voorspelling gewoon opslaan',
  (await page.evaluate(() => globalThis.__db.answers.length)) === 1);

// --- Joey hoort bij een ander toestel -------------------------------------
// Zo ziet het eruit als iemand anders zich al als Joey heeft aangemeld: zijn
// speler hangt aan een account dat hier niet is.
await page.evaluate(() => {
  globalThis.__db.auth_users.push(
    { id: 'account-9', is_anonymous: true, email: null, new_email: null });
  globalThis.__db.pool_members.push(
    { member_id: 'lid-9', pool_id: 'pool-1', display_name: 'Joey', user_id: 'account-9' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race], #paneel');

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler');
const knoppen = await page.$$eval('.speler', (n) => n.map((e) => ({
  naam: e.querySelector('.nm').textContent.trim(),
  los: !!e.querySelector('[data-losmaken]'),
})));
check('bij een speler van een ander toestel staat een losmaakknop',
  knoppen.find((k) => k.naam === 'Joey')?.los === true, JSON.stringify(knoppen));
check('en bij je eigen speler niet — daar valt niets los te maken',
  knoppen.find((k) => k.naam === 'Danny')?.los === false, JSON.stringify(knoppen));

// --- als Joey spelen mag, opslaan niet ------------------------------------
await page.click('#wissel');
await page.waitForSelector('[data-lid]');
await page.click('[data-lid]:has(.nm:text-is("Joey"))');
// We kwamen vanuit de poulepagina, dus daar landen we ook weer.
await page.waitForSelector('.meldingbalk, [data-race]');
check('de app zegt meteen dat deze speler bij een ander toestel hoort',
  (await tekst('#app')).includes('Joey hoort bij een ander toestel'),
  (await tekst('.meldingbalk').catch(() => '')) || '(geen melding)');

await page.click('[data-weergave="races"]');
await openRace(page, 'Shanghai');
await page.click('[data-tab="race"]');
await page.waitForSelector('#paneel');
await kiesTien(page);
await page.click('#opslaan');
await page.waitForSelector('.err');
const fout = await tekst('.err');
check('en opslaan mislukt met uitleg in plaats van in stilte',
  fout.includes('Joey hoort bij een ander toestel')
    && fout.includes('mailadres'), fout || '(geen foutmelding)');
check('er is niets van Joey weggeschreven',
  (await page.evaluate(() => globalThis.__db.answers
    .filter((a) => a.member_id === 'lid-9').length)) === 0);
check('en de voorspelling van Danny is onaangeraakt',
  (await page.evaluate(() => globalThis.__db.answers
    .filter((a) => a.member_id === 'lid-1').length)) === 1);

// --- de poulebaas maakt hem los -------------------------------------------
await page.click('[data-weergave="races"]');
await page.waitForSelector('[data-race]');
await page.click('#wissel');
await page.waitForSelector('[data-lid]');
await page.click('[data-lid]:has(.nm:text-is("Danny"))');
await page.waitForSelector('[data-race], .speler');
await page.click('[data-weergave="poule"]');
await page.waitForSelector('[data-losmaken]');

// Eén tik vraagt om bevestiging: een confirm() wordt weggeklikt, deze vraag
// niet.
await page.click('[data-losmaken="lid-9"]');
check('één tik maakt nog niets los, hij vraagt eerst',
  (await tekst('[data-losmaken="lid-9"]')) === 'zeker weten?'
    && (await speler('Joey')).user_id === 'account-9',
  await tekst('[data-losmaken="lid-9"]'));

await page.click('[data-losmaken="lid-9"]');
await page.waitForFunction(() => !document.querySelector('[data-losmaken="lid-9"]'));
check('de tweede tik maakt Joey los van dat account',
  (await speler('Joey')).user_id === null, JSON.stringify(await speler('Joey')));
check('en het scherm legt uit wat er nu gebeurt',
  (await tekst('#app')).includes('Joey is losgemaakt'));

// --- en dan kan er weer voor hem ingevuld worden --------------------------
// Een speler die van niemand is blijft beschrijfbaar. Dat is met opzet: op de
// dag dat de policies dichtgingen had nog niet iedereen zichzelf geclaimd, en
// die mensen mogen niet buiten komen te staan.
await page.click('#wissel');
await page.waitForSelector('[data-lid]');
await page.click('[data-lid]:has(.nm:text-is("Joey"))');
await page.waitForSelector('[data-race], .speler');
await page.click('[data-weergave="races"]');
await openRace(page, 'Shanghai');
await page.click('[data-tab="race"]');
await page.waitForSelector('#paneel');
await kiesTien(page);
await page.click('#opslaan');
await page.waitForSelector('[data-race]');
check('een losgemaakte speler kan weer gewoon invullen',
  (await page.evaluate(() => globalThis.__db.answers
    .filter((a) => a.member_id === 'lid-9').length)) > 0);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
