// Je account meenemen naar een tweede toestel, met een mailadres.
//
// Zonder dit blijft je account op één browser staan. Dat is nu nog niet erg —
// de policies staan open, dus je kunt overal meespelen — maar zodra die
// dichtgaan is het het verschil tussen "ik speel ook op mijn laptop" en "op
// mijn laptop kan ik niets meer opslaan". Het is nadrukkelijk optioneel: wie
// geen mailadres koppelt speelt gewoon door.
//
// Het scherpste punt zit niet in de mail maar in de adresbalk. Supabase
// stuurt je na een inloglink terug met `?code=<lange sleutel>`, en dat is
// precies de parameter waar deze app zijn poulecode in zet. Zonder onderscheid
// zou de app na het inloggen roepen dat die poulecode niet bestaat.
//
// De nabootsing doet de mailbox na: __mail.laatsteLink() geeft de link die
// verstuurd zou zijn, en die openen is hier "op de link klikken".

import { maakControle, startPagina } from './hulp.mjs';

const { check, afronden } = maakControle('mailadres koppelen en inloggen');
const { page, jsFouten, stoppen, url } = await startPagina();

const accounts = () => page.evaluate(() => globalThis.__db.auth_users);
const speler = (naam) => page.evaluate((n) =>
  globalThis.__db.pool_members.find((l) => l.display_name === n) ?? null, naam);
const link = () => page.evaluate(() => globalThis.__mail.laatsteLink());
const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

const meedoenAls = async (naam) => {
  await page.waitForSelector('#code');
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click(`[data-lid]:has(.nm:text-is("${naam}"))`);
  await page.waitForSelector('[data-race]');
};

// --- toestel 1: meespelen en een mailadres koppelen ------------------------
await meedoenAls('Danny');
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#mailopen');
check('onder Poule staat het aanbod om een mailadres te koppelen',
  (await tekst('#mailopen')) === 'Mailadres koppelen');

await page.click('#mailopen');
await page.waitForSelector('#mailveld');
await page.click('#mailstuur');
check('zonder adres wordt er niets verstuurd',
  (await tekst('#mailfout')).includes('Vul je mailadres in')
    && (await page.evaluate(() => globalThis.__mail.aantalVerstuurd())) === 0,
  await tekst('#mailfout'));

await page.fill('#mailveld', 'nietsmet apenstaart');
await page.click('#mailstuur');
await page.waitForSelector('#mailfout');
check('een adres dat geen adres is krijgt daar antwoord op',
  (await tekst('#mailfout')).includes('geldig mailadres'), await tekst('#mailfout'));

await page.fill('#mailveld', 'danny@voorbeeld.nl');
await page.click('#mailstuur');
await page.waitForSelector('#mailopnieuw');
check('na versturen staat er dat er een mail onderweg is, niet dat het gelukt is',
  (await tekst('.kolom, #app')).includes('We hebben een mail gestuurd naar danny@voorbeeld.nl'));
check('en het adres hangt nog niet definitief aan het account',
  (await accounts())[0].email === null, JSON.stringify((await accounts())[0]));

// De bevestigingslink openen. Dit is wat er gebeurt als je in je mailbox
// klikt: het adres wordt definitief en je blijft gewoon waar je was.
const bevestig = await link();
await page.goto(bevestig);
await page.waitForSelector('[data-weergave], #code');
check('na het klikken op de bevestigingslink hoort het adres bij het account',
  (await accounts())[0].email === 'danny@voorbeeld.nl',
  JSON.stringify((await accounts())[0]));
check('en de sleutel uit de link is niet als poulecode gelezen',
  !(await page.$('.err')) || !(await tekst('.err')).includes('bestaat niet'),
  await page.$('.err') ? await tekst('.err') : '(geen foutregel)');

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf');
check('en je bent nog steeds dezelfde speler',
  (await tekst('.speler.zelf .nm')) === 'Danny', await tekst('.speler.zelf .nm'));
check('het scherm zegt nu dat je account gekoppeld is',
  (await tekst('#app')).includes('Je account hangt aan danny@voorbeeld.nl'));

// --- toestel 2: leeg, en toch bij je poule komen ---------------------------
await page.evaluate(() => localStorage.clear());
await page.goto(url);
await page.waitForSelector('#code');
check('een leeg toestel begint gewoon bij de poulecode',
  (await page.$('[data-race]')) === null);

await page.click('#inlogopen');
await page.waitForSelector('#inlogveld');
await page.fill('#inlogveld', 'onbekend@voorbeeld.nl');
await page.click('#inlogstuur');
await page.waitForSelector('#inlogfout');
check('een adres dat nergens bij hoort maakt geen nieuw leeg account aan',
  (await tekst('#inlogfout')).includes('nog geen account')
    && (await accounts()).length === 1,
  await tekst('#inlogfout'));

await page.fill('#inlogveld', 'danny@voorbeeld.nl');
await page.click('#inlogstuur');
await page.waitForFunction(() => !document.querySelector('#inlogveld'));
check('bij een bekend adres gaat er een inloglink de deur uit',
  (await tekst('#app')).includes('We hebben een mail gestuurd naar danny@voorbeeld.nl'));

const inlog = await link();
await page.goto(inlog);
await page.waitForSelector('[data-weergave], #code');

const inGepoule = (await page.$('[data-race]')) !== null;
check('de inloglink brengt je meteen in je poule, zonder poulecode', inGepoule,
  inGepoule ? '' : (await page.$('#code') ? 'nog op het codescherm' : 'onbekend scherm'));
check('er is geen tweede account bijgekomen', (await accounts()).length === 1);

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf');
check('en je bent daar dezelfde speler als op je eerste toestel',
  (await tekst('.speler.zelf .nm')) === 'Danny', await tekst('.speler.zelf .nm'));
check('zonder dat er een tweede speler is aangemaakt',
  (await page.evaluate(() => globalThis.__db.pool_members.length)) === 1);
check('en die speler hangt nog steeds aan hetzelfde account',
  (await speler('Danny')).user_id === (await accounts())[0].id);

// --- het account wint van wat dit toestel toevallig wist -------------------
// Speelde je op dit toestel eerder als iemand anders mee, dan is inloggen een
// duidelijke uitspraak: je bedoelt jezelf, niet de laatste die hier koos.
await page.evaluate(() => {
  globalThis.__db.pool_members.push(
    { member_id: 'lid-9', pool_id: 'pool-1', display_name: 'Logeergast', user_id: null });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
  localStorage.clear();
});
await page.goto(url);
await meedoenAls('Logeergast');
check('als logeergast speel je gewoon mee', (await speler('Logeergast')) !== null);

await page.click('[data-weergave="poule"]');
await page.waitForSelector('#inlogopen, #mailopen');
// Uitloggen bestaat niet in de app; de weg terug naar jezelf is de inloglink.
// Die vragen we hier aan vanaf het beginscherm.
await page.click('#anderePoule');
await page.waitForSelector('#inlogopen');
await page.click('#inlogopen');
await page.fill('#inlogveld', 'danny@voorbeeld.nl');
await page.click('#inlogstuur');
await page.waitForFunction(() => !document.querySelector('#inlogveld'));
await page.goto(await link());
await page.waitForSelector('[data-weergave], #code');
await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf');
check('na het inloggen ben je jezelf, niet de speler die dit toestel onthield',
  (await tekst('.speler.zelf .nm')) === 'Danny', await tekst('.speler.zelf .nm'));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
