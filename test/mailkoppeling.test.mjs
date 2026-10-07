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

import { maakControle, startPagina, naDeClaim } from './hulp.mjs';

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
  await naDeClaim(page);
};

// --- toestel 1: meespelen en een mailadres koppelen ------------------------
await meedoenAls('Danny');
await page.click('[data-weergave="profiel"]');
await page.waitForSelector('#mailopen');
// Google staat er sinds kort als eerste keuze; de mailweg is de tweede knop.
// Dat die er nog steeds is, is het punt: wie geen Google wil of heeft mag niet
// buiten de boot vallen.
check('onder Profiel kun je nog steeds voor een mailadres kiezen',
  (await tekst('#mailopen')).includes('mailadres'), await tekst('#mailopen'));

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

// Supabase zonder eigen mailserver mailt alleen het eigen team. Dan zegt
// de app dat het niet aan het adres ligt, en wat je wel kunt.
await page.evaluate(() => globalThis.__mail.alleenTeam(true));
await page.fill('#mailveld', 'danny@voorbeeld.nl');
await page.click('#mailstuur');
await page.waitForFunction(() => document.querySelector('#mailfout')?.textContent.includes('nog niet'));
check('mailt Supabase alleen het eigen team, dan zegt de app dat in gewone taal',
  (await tekst('#mailfout')).includes('Met een mailadres lukt het nu nog niet')
    && (await tekst('#mailfout')).includes('Gebruik Google'), await tekst('#mailfout'));
await page.evaluate(() => globalThis.__mail.alleenTeam(false));

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

await page.click('[data-weergave="profiel"]');
await page.waitForSelector('#eigenlink');
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
// Een adres dat nergens bij hoort, op een leeg toestel: dan maken we een
// account (Danny: "Kan toch gewoon eerst een account/profiel aanmaken en dan
// een poule"). Het bestaande account van Danny raakt dat niet.
await page.fill('#inlogveld', 'nieuw@voorbeeld.nl');
await page.click('#inlogstuur');
await page.waitForSelector('#inlogopnieuw');
check('een nieuw adres op een leeg toestel maakt een account, en het scherm zegt dat',
  (await tekst('#app')).includes('hing nog geen account, dus maken we er een')
    && (await accounts()).some((u) => u.email === 'nieuw@voorbeeld.nl'),
  await tekst('#app'));
check('met een code om in te tikken, net als bij inloggen',
  (await page.$('#inlogcode')) !== null);
check('en het account van Danny blijft wat het was',
  (await accounts()).filter((u) => u.email === 'danny@voorbeeld.nl').length === 1);
await page.click('#inlogopnieuw');
await page.waitForSelector('#inlogveld');

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
check('er is voor Danny geen tweede account bijgekomen',
  (await accounts()).filter((u) => u.email === 'danny@voorbeeld.nl').length === 1);

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf');
check('en je bent daar dezelfde speler als op je eerste toestel',
  (await tekst('.speler.zelf .nm')) === 'Danny', await tekst('.speler.zelf .nm'));
check('zonder dat er een tweede speler is aangemaakt',
  (await page.evaluate(() => globalThis.__db.pool_members.length)) === 1);
check('en die speler hangt nog steeds aan hetzelfde account',
  (await speler('Danny')).user_id === (await accounts()).find((u) => u.email === 'danny@voorbeeld.nl').id);

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

// Uitloggen zou hier ook kunnen, maar Logeergast is nooit gekoppeld
// geweest — dus is de weg terug naar Danny de inloglink, aangevraagd
// vanaf het beginscherm waar #anderePoule je naartoe brengt.
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

// --- eerst een account, dan een poule ---------------------------------------
// Een leeg toestel, een nieuw adres, de code uit de mail, en daarna zelf een
// poule maken. De poule hangt dan aan dat account, en de rondleiding vraagt
// niet meer om te koppelen.
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.waitForSelector('#inlogopen');
  await page.click('#inlogopen');
  await page.fill('#inlogveld', 'femke@voorbeeld.nl');
  await page.click('#inlogstuur');
  await page.waitForSelector('#inlogcode');
  await page.fill('#inlogcode', await page.evaluate(() => globalThis.__mail.laatsteCode()));
  await page.click('#inlogcodeknop');
  await page.waitForSelector('#code');
  await page.waitForFunction(() => document.querySelector('#app')?.textContent.includes('Je bent al ingelogd'));
  check('met de code van een nieuw account sta je ingelogd op het beginscherm, klaar voor een poule',
    (await page.textContent('#app')).includes('femke@voorbeeld.nl'));

  await page.click('#nieuw');
  await page.fill('#pnaam', 'Femkes poule');
  await page.click('#verder');
  await page.fill('#snaam', 'Femke');
  await page.click('#verder');
  await page.waitForSelector('[data-preset]');
  await page.click('#verder');
  await page.waitForSelector('#klaar');
  await page.click('#klaar');
  await page.waitForSelector('[data-race], [data-rondleiding]');
  check('wie al een account heeft krijgt na het aanmaken geen koppelstap',
    (await page.$('[data-rondleiding="account"]')) === null);
  const [lid, acc] = await page.evaluate(() => [
    globalThis.__db.pool_members.find((l) => l.display_name === 'Femke'),
    globalThis.__db.auth_users.find((u) => u.email === 'femke@voorbeeld.nl')]);
  check('en de nieuwe poule hangt aan dat account', lid?.user_id === acc?.id, JSON.stringify(lid));
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// --- al meespelen op dit toestel, en dan een nieuw adres -------------------
// Dan komt het adres aan het account dat er al is, zodat de speler meegaat,
// in plaats van een tweede, leeg account.
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.waitForSelector('#code');
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]:has(.nm:text-is("Danny"))');
  await naDeClaim(page);
  await page.click('#anderePoule');
  await page.waitForSelector('#inlogopen');
  await page.click('#inlogopen');
  await page.fill('#inlogveld', 'danny.nieuw@voorbeeld.nl');
  await page.click('#inlogstuur');
  await page.waitForSelector('#inlogopnieuw');
  check('wie op dit toestel al meespeelt, koppelt een nieuw adres aan zichzelf',
    (await page.textContent('#app')).includes('We koppelen het aan wie je op dit toestel al bent'));
  const accs = await page.evaluate(() => globalThis.__db.auth_users);
  check('en er komt geen tweede account bij; het adres wacht op de klik in de mail',
    accs.length === 1 && accs[0].new_email === 'danny.nieuw@voorbeeld.nl', JSON.stringify(accs));
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
