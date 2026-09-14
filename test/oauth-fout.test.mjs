// Een foutmelding die pas ná de omweg via Google terugkomt.
//
// Aanleiding: "Ik heb het net geprobeerd en werkt niet. Gaat gelijk weer
// terug naar het beginscherm." Geen foutmelding, gewoon een leeg scherm. De
// oorzaak: Google en Supabase kunnen ook terugkomen met een foutmelding in
// plaats van een geldige sleutel — bijvoorbeeld omdat dit Google-account al
// aan een andere speler hangt — en de app keek daar helemaal niet naar.
// `koppelGoogle()`/`inloggenMetGoogle()` vangen alleen fouten op die vóór het
// vertrek naar Google optreden; een botsende identiteit ontdekt Supabase pas
// ná Google, en dat komt terug in de adresbalk, niet in de foutmelding van de
// aanroep zelf. `uitlegAuth()` wist daar al een goed antwoord op — hij werd
// alleen nooit voor dit geval aangeroepen.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('een foutmelding van na de omweg via Google');
const { page, jsFouten, stoppen, url } = await startPagina();

const tekst = async () => (await page.textContent('#app')).replace(/\s+/g, ' ').trim();
const accounts = () => page.evaluate(() => globalThis.__db.auth_users);
const link = () => page.evaluate(() => globalThis.__mail.laatsteLink());

// ------------------------------------------------------------------
//  Losstaand: een simpele foutcode in de adresbalk wordt uitgelegd
// ------------------------------------------------------------------
// Zonder de mail-koppelroute erbij te halen: gewoon rechtstreeks een link
// bezoeken zoals Google die zou kunnen sturen als iemand de toestemming
// weigert. Dit toetst alleen het uitlezen van de adresbalk, niet de rest
// van de koppelflow.
//
// Als query-parameter, niet als hash: een adreswijziging die alleen het
// #stukje verandert laadt de pagina in een browser niet opnieuw, en dan
// draait de controle uit dit bestand nooit. In het echt maakt dat niets uit
// — die terugkomst is altijd een volledig nieuwe laadbeurt, vanaf Google's
// eigen domein — maar in deze test, die op hetzelfde adres blijft, moet de
// wijziging groot genoeg zijn om een echte herlaadactie af te dwingen.
await page.goto(`${url}?error=access_denied&error_description=${
  encodeURIComponent('The user denied the request')}`);
await page.waitForSelector('#code');
const geweigerd = await tekst();
check('een geweigerde toestemming krijgt een leesbare melding',
  geweigerd.includes('The user denied the request'),
  geweigerd.slice(0, 200));
check('en de adresbalk is opgeschoond, anders blijft de melding bij elke herlaadactie terugkomen',
  !String(page.url()).includes('error='), page.url());

// ------------------------------------------------------------------
//  De echte aanleiding: koppelen met een Google-adres dat al bezet is
// ------------------------------------------------------------------
// Dit speelt precies na wat er misging: er bestaat al een ander account met
// dit Google-adres — bijvoorbeeld omdat iemand eerder per ongeluk "Inloggen
// met Google" gebruikte op een leeg toestel in plaats van "Google koppelen"
// op het toestel waar de poule al stond. Dat tweede, losse account bestaat
// dus al voordat de koppelpoging hieronder begint.
await page.evaluate(() => {
  globalThis.__db.auth_users.push({
    id: 'account-los', is_anonymous: false, email: 'danny@gmail.voorbeeld', new_email: null,
    identities: [{ provider: 'google', identity_data: { email: 'danny@gmail.voorbeeld' } }],
  });
  globalThis.__mail.googleAls('danny@gmail.voorbeeld');
});

await meedoen(page);
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#googlekoppel');
await page.click('#googlekoppel');
await page.waitForTimeout(300);
check('er gaat wél een koppelverzoek de deur uit — de botsing is nog niet',
  (await page.evaluate(() => globalThis.__mail.aantalVerstuurd())) === 1);

// Terugkomen van Google, maar deze keer met de botsing die pas op dit moment
// aan het licht komt.
await page.goto(await link());
await page.waitForSelector('[data-weergave], #code');

const na = await tekst();
check('de speler krijgt te horen dat dit Google-account al bij een speler hoort',
  na.includes('Dat Google-account hoort al bij een speler'), na.slice(0, 300));
check('en niet een leeg scherm zonder uitleg, wat er hiervoor gebeurde', na.length > 0);

const iedereen = await accounts();
check('het eigen account is niet stiekem toch aangepast', iedereen.length === 2,
  String(iedereen.length));
const eigen = iedereen.find((u) => u.id !== 'account-los');
check('en heeft nog steeds geen Google gekoppeld — de koppeling is echt mislukt',
  (eigen.identities ?? []).every((i) => i.provider !== 'google'),
  JSON.stringify(eigen.identities));

// Je eigen poule en speler mogen door deze mislukking niet kwijtraken: je
// stond er al, en een mislukte koppelpoging is geen reden om je eruit te
// gooien.
check('je bent nog steeds in je eigen poule, niet teruggezet naar het codescherm',
  (await page.$('[data-weergave]')) !== null,
  (await page.$('#code')) ? 'stond alsnog op het codescherm' : 'poule gevonden, zoals het hoort');

check('en de adresbalk is ook hier weer opgeschoond',
  !String(page.url()).includes('error='), page.url());

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
