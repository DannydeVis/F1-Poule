// Inleg en betaalverzoek per poule.
//
// Aanleiding, uit de groepsapp: "Doe gelijk een betaalverzoek er in 😉 Of ook
// wat de inleg moet zijn enzo."
//
// Wat hier vastligt:
//   1. Een poule zonder inleg laat er niets van zien. Om de eer spelen is de
//      gewone poule.
//   2. Het bedrag mag als 5, 5,00 of € 12,50 ingetypt worden.
//   3. De betaallink wordt alleen als link getoond als het een http(s)-adres
//      is — en ook een adres dat al in de database stond wordt gecontroleerd,
//      want daar kan iedereen met de anon key in schrijven.
//   4. De inleg gaat mee in de uitnodiging, want anders is dat de eerste
//      vraag in de groepsapp.
//   5. De poulebaas kan afvinken wie betaald heeft.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('inleg en betaalverzoek');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const poule = () => page.evaluate(() => globalThis.__db.pools[0]);

await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
await meedoen(page);
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#inlegbedrag');

// --- een poule zonder inleg ------------------------------------------------
check('zonder inleg staat er geen bedrag', (await page.$('.inlegbedrag')) === null);
check('en geen betaalknop', (await page.$('#betalen')) === null);
check('en de spelers krijgen geen open/betaald erbij',
  (await page.$('.betaalvink')) === null);
check('opslaan kan pas als er iets ingevuld is',
  await page.isDisabled('#inlegBewaren'));

// --- een bedrag dat geen bedrag is ----------------------------------------
await page.fill('#inlegbedrag', 'vijf euro');
await page.click('#inlegBewaren');
check('"vijf euro" is geen bedrag en zegt dat',
  (await tekst('#inlegfout')).includes('geen bedrag'), await tekst('#inlegfout'));
check('en er gaat niets naar de database', (await poule()).inleg === undefined);

// --- een betaallink die geen webadres is ----------------------------------
// Dit is het geval waar het echt om gaat: een javascript:-adres in dit veld
// wordt uitgevoerd zodra een lid op de betaalknop tikt.
await page.fill('#inlegbedrag', '5');
await page.fill('#inleglink', 'javascript:alert(1)');
await page.click('#inlegBewaren');
check('een javascript-adres wordt geweigerd',
  (await tekst('#inlegfout')).includes('geen webadres'), await tekst('#inlegfout'));
check('en belandt niet in de database',
  (await poule()).betaallink !== 'javascript:alert(1)', String((await poule()).betaallink));

// --- wel goed --------------------------------------------------------------
await page.fill('#inlegbedrag', '€ 12,50');
await page.fill('#inleglink', 'tikkie.me/pay/abc');
await page.click('#inlegBewaren');
await page.waitForSelector('.inlegbedrag');
check('een bedrag met euroteken en komma komt als getal in de database',
  (await poule()).inleg === 12.5, String((await poule()).inleg));
check('een adres zonder https ervoor wordt aangevuld',
  (await poule()).betaallink === 'https://tikkie.me/pay/abc', (await poule()).betaallink);
check('het bedrag staat in het Nederlands op het scherm',
  (await tekst('.inlegbedrag')).startsWith('€ 12,50'), await tekst('.inlegbedrag'));
check('en er staat een betaalknop die daarheen gaat',
  (await page.getAttribute('#betalen', 'href')) === 'https://tikkie.me/pay/abc',
  await page.getAttribute('#betalen', 'href'));
check('die knop opent een nieuw tabblad zonder de poule mee te geven',
  (await page.getAttribute('#betalen', 'rel')) === 'noopener noreferrer');

// --- de uitnodiging vertelt het mee ---------------------------------------
await page.click('#uitnodiging');
await page.waitForTimeout(200);
// Het euroteken staat met een harde spatie aan het bedrag vast — dat hoort
// zo in het Nederlands — dus die spaties eerst gelijktrekken.
const klembord = (await page.evaluate(() => navigator.clipboard.readText()))
  .replace(/\s/g, ' ');
check('de uitnodiging noemt de inleg en waar je hem naartoe stuurt',
  klembord.includes('Inleg: € 12,50') && klembord.includes('Betalen: https://tikkie.me/pay/abc'),
  JSON.stringify(klembord));

// --- afvinken wie betaald heeft -------------------------------------------
check('bij elke speler staat nu open of betaald',
  (await tekst('.betaalvink')) === 'open', await tekst('.betaalvink'));
await page.click('[data-betaald]');
await page.waitForSelector('.betaalvink.af');
check('afvinken gaat naar de database',
  (await page.evaluate(() => globalThis.__db.pool_members[0].betaald)) === true);
check('en je ziet van jezelf dat je afgevinkt staat',
  (await page.textContent('.kol.links, body')).includes('Jij staat afgevinkt'));
await page.click('[data-betaald]');
await page.waitForSelector('.betaalvink:not(.af)');
check('en het gaat er ook weer af',
  (await page.evaluate(() => globalThis.__db.pool_members[0].betaald)) === false);

// --- een link die buitenom in de database is gezet ------------------------
// De app controleert bij het opslaan, maar iedereen met de anon key kan er
// rechtstreeks in schrijven. Dus wordt er ook bij het tonen gecontroleerd.
await page.evaluate(() => {
  globalThis.__db.pools[0].betaallink = 'javascript:alert(1)';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');
await page.click('[data-weergave="poule"]');
await page.waitForSelector('.inlegbedrag');
check('een javascript-adres uit de database wordt niet als knop getoond',
  (await page.$('#betalen')) === null);
check('en er staat uitgelegd waarom er geen knop is',
  (await page.textContent('body')).includes('niet als adres te lezen'));

// --- de inleg weer weghalen ------------------------------------------------
await page.fill('#inlegbedrag', '');
await page.fill('#inleglink', '');
await page.click('#inlegBewaren');
await page.waitForSelector('.inlegbedrag', { state: 'detached' });
check('leeg opslaan haalt de inleg weg',
  (await poule()).inleg === null && (await poule()).betaallink === null,
  JSON.stringify([(await poule()).inleg, (await poule()).betaallink]));
check('en dan verdwijnt open/betaald ook weer', (await page.$('.betaalvink')) === null);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
