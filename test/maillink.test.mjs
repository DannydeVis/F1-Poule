// De link in onze eigen mails wijst naar de app, niet naar Supabase.
//
// Danny kreeg de mail in Outlook bij Ongewenst. Een van de redenen: de knop in
// een mail van predicttherace.com ging naar een adres op supabase.co. En
// Outlook opent links vooraf om ze te controleren; een link die bij openen al
// inlogt, is dan op voordat de speler erop tikt. Daarom staat in de sjablonen
// (docs/mail/) nu https://predicttherace.com/app/?token_hash=…&type=…, en
// wisselt de app die sleutel zelf in met verifyOtp.
//
// __mail.laatsteMaillink() geeft de link zoals onze sjablonen hem maken; die
// openen is hier "op de knop in de mail tikken".

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakControle, startPagina, naDeClaim } from './hulp.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
const { check, afronden } = maakControle('de link uit de mail, op het eigen domein');

// --- de sjablonen zelf ------------------------------------------------------
// Wat Danny in Supabase plakt. Elke knop gaat naar de app met de sleutel van
// Supabase erin, en het type is er een dat de app ook echt inwisselt.
const index = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
const soorten = index.match(/\['email', 'email_change'\]\.includes\(soort\)/)
  ? ['email', 'email_change'] : [];
check('de app noemt de soorten links die hij inwisselt', soorten.length === 2);

const sjablonen = [
  ['inloggen.html', 'email'],
  ['account-maken.html', 'email'],
  ['mailadres-koppelen.html', 'email_change'],
];
for (const [bestand, soort] of sjablonen) {
  const html = readFileSync(join(wortel, 'docs', 'mail', bestand), 'utf8');
  const link = `https://predicttherace.com/app/?token_hash={{ .TokenHash }}&amp;type=${soort}`;
  check(`${bestand}: de knop gaat naar de app, met type=${soort}`,
    html.includes(`href="${link}"`) && soorten.includes(soort));
  check(`${bestand}: en nergens meer de link van Supabase zelf`,
    !html.includes('ConfirmationURL'));
  // De eerste tekst in de mail is wat een mailprogramma als voorvertoning
  // laat zien. Zonder deze regel was dat het adres van het logo.
  check(`${bestand}: begint met een korte voorvertoning, vóór het logo`,
    /<div[^>]*display:none[^>]*>[^<]{20,}<\/div>/.test(html)
      && html.indexOf('display:none') < html.indexOf('<img'));
}

// --- een mailadres koppelen -------------------------------------------------
const { page, jsFouten, stoppen, url } = await startPagina();
const accounts = () => page.evaluate(() => globalThis.__db.auth_users);
const maillink = () => page.evaluate(() => globalThis.__mail.laatsteMaillink());
const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

await page.waitForSelector('#code');
await page.fill('#code', 'RTM026');
await page.click('#mee');
await page.waitForSelector('[data-lid]');
await page.click('[data-lid]:has(.nm:text-is("Danny"))');
await naDeClaim(page);
await page.click('[data-weergave="profiel"]');
await page.waitForSelector('#mailopen');
await page.click('#mailopen');
await page.waitForSelector('#mailveld');
await page.fill('#mailveld', 'danny@voorbeeld.nl');
await page.click('#mailstuur');
await page.waitForSelector('#mailopnieuw');

const koppel = await maillink();
check('de koppelmail heeft een link naar de app met type=email_change',
  /\?token_hash=[^&]+&type=email_change$/.test(koppel ?? ''), koppel);
await page.goto(koppel);
await page.waitForSelector('[data-weergave]');
check('na de knop in de mail hoort het adres bij het account',
  (await accounts())[0].email === 'danny@voorbeeld.nl', JSON.stringify((await accounts())[0]));
check('en de sleutel staat niet meer in de adresbalk',
  !page.url().includes('token_hash'), page.url());
await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf');
check('je bent nog steeds dezelfde speler',
  (await tekst('.speler.zelf .nm')) === 'Danny', await tekst('.speler.zelf .nm'));

// Dezelfde link nog een keer: hij werkt één keer. Dat moet de speler horen,
// in plaats van een scherm alsof er niets gebeurd is.
await page.goto(koppel);
await page.waitForSelector('[data-weergave], #code');
const melding = (await page.$('.melding')) ? await tekst('.melding') : '(geen melding)';
check('een link die al gebruikt is, zegt dat in gewone taal',
  melding.includes('Die link is al gebruikt of verlopen'), melding);
check('en ook dan is de adresbalk leeg',
  !page.url().includes('token_hash'), page.url());

// --- inloggen op een leeg toestel -------------------------------------------
await page.evaluate(() => localStorage.clear());
await page.goto(url);
await page.waitForSelector('#inlogopen');
await page.click('#inlogopen');
await page.fill('#inlogveld', 'danny@voorbeeld.nl');
await page.click('#inlogstuur');
await page.waitForSelector('#inlogcode');
const inlog = await maillink();
check('de inlogmail heeft een link naar de app met type=email',
  /\?token_hash=[^&]+&type=email$/.test(inlog ?? ''), inlog);
await page.goto(inlog);
await page.waitForSelector('[data-weergave], #code');
const inPoule = (await page.$('[data-race]')) !== null;
check('de knop in de inlogmail brengt je meteen in je poule', inPoule,
  inPoule ? '' : ((await page.$('#code')) ? 'nog op het codescherm' : 'onbekend scherm'));
check('zonder tweede account voor Danny',
  (await accounts()).filter((u) => u.email === 'danny@voorbeeld.nl').length === 1);
await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf');
check('en als dezelfde speler',
  (await tekst('.speler.zelf .nm')) === 'Danny', await tekst('.speler.zelf .nm'));

// --- een nieuw account ------------------------------------------------------
await page.evaluate(() => localStorage.clear());
await page.goto(url);
await page.waitForSelector('#inlogopen');
await page.click('#inlogopen');
await page.fill('#inlogveld', 'femke@voorbeeld.nl');
await page.click('#inlogstuur');
await page.waitForSelector('#inlogcode');
const nieuw = await maillink();
await page.goto(nieuw);
await page.waitForSelector('#code');
await page.waitForFunction(() => document.querySelector('#app')?.textContent.includes('Je bent al ingelogd'));
check('een nieuw adres: na de knop in de mail ben je ingelogd en kies je een poule',
  (await tekst('#app')).includes('Je bent al ingelogd'));
check('met een account op dat adres',
  (await accounts()).filter((u) => u.email === 'femke@voorbeeld.nl').length === 1);

// Dezelfde link op een leeg toestel, bijvoorbeeld omdat een scanner hem al
// gebruikte. Op het beginscherm komt de melding in de foutregel.
await page.evaluate(() => localStorage.clear());
await page.goto(nieuw);
await page.waitForSelector('#code');
check('een gebruikte link op een leeg toestel zegt dat ook, op het beginscherm',
  (await tekst('#f')).includes('Die link is al gebruikt of verlopen'), await tekst('#f'));

// --- een link van een soort die de app niet verstuurt -----------------------
// Een herstelmail voor een wachtwoord kent deze app niet. Zo'n link hoort
// niets te doen, en zeker geen foutmelding te geven over iets wat de speler
// nooit aanvroeg.
await page.evaluate(() => localStorage.clear());
const ervoor = (await accounts()).length;
await page.goto(url + '?token_hash=onzin&type=recovery');
await page.waitForSelector('#code');
check('een onbekende soort link wordt genegeerd',
  (await page.$('.melding')) === null && (await tekst('#f')) === ''
    && (await accounts()).length === ervoor, await tekst('#f'));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
