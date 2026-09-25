// Google Analytics, alleen met toestemming (toestemming.js).
//
// Aanleiding: "wellicht moeten we weer google analytics inbouwen zodat ik kan
// zien wat er gebeurt", met de keuze voor eigen statistieken én Google
// Analytics. In Nederland mag dat alleen na toestemming, en de site beloofde
// tot nu toe "geen trackers".
//
// Wat hier vastligt:
//   1. Zonder meet-ID gebeurt er niets: geen vraag, geen knop, niets van
//      Google. Zo staat het in de repo tot er een meet-ID is.
//   2. Met een meet-ID komt er één keer een vraag, in de taal van de pagina,
//      met "ja" en "nee" even groot. Zolang je niets kiest laadt er niets.
//   3. Nee: er laadt niets, en de vraag komt niet terug. Ja: Google Analytics
//      laadt, nu en bij een volgend bezoek, zonder opnieuw te vragen.
//   4. Van gedachten veranderen kan onderaan elke pagina en in de app onder
//      Profiel; nee na ja zet Google Analytics op deze pagina stil en haalt
//      zijn cookies weg.
//   5. De keuze geldt voor de site en de app samen (dezelfde herkomst).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startSite, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('google analytics met toestemming');
const bron = readFileSync(join(wortel, 'toestemming.js'), 'utf8');
const GTAG = /googletagmanager\.com\/gtag\/js\?id=G-TEST/;

// ---- 1. zonder meet-ID ---------------------------------------------------------
check('in de repo staat nog geen meet-ID', /const GA_ID = '';/.test(bron));
{
  const { page, url, extern, jsFouten, stoppen } = await startSite();
  await page.goto(url);
  await page.waitForLoadState('load');
  check('zonder meet-ID: geen vraag op de voorpagina', (await page.$('#toestemming')) === null);
  check('en geen knop "Statistieken en cookies" onderaan',
    await page.$eval('[data-toestemming]', (a) => a.hidden));
  check('en niets van Google', !extern.some((u) => /google/.test(u)), extern.join(' '));
  check('geen JavaScript-fouten (zonder meet-ID)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 2 t/m 5. met een meet-ID -----------------------------------------------------
// Dezelfde toestemming.js, met een meet-ID erin, alsof hij in de repo staat.
const metId = bron.replace("const GA_ID = '';", "const GA_ID = 'G-TEST';");
const { page, context, url, extern, jsFouten, stoppen } = await startSite({
  taal: 'nl',  // de app praat anders Engels in een testbrowser, en vraagt het dan in het Engels
  voorafAan: async (_p, ctx) => ctx.route('**/toestemming.js', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: metId })),
});
const gtag = () => extern.filter((u) => GTAG.test(u));
const naar = async (pad) => { await page.goto(url + pad); await page.waitForLoadState('load'); };

await naar('');
await page.waitForSelector('#toestemming');
{
  const knoppen = await page.$$eval('#toestemming button', (bs) => bs.map((b) => {
    const r = b.getBoundingClientRect(); return { tekst: b.textContent, b: Math.round(r.width), h: Math.round(r.height) }; }));
  check('met een meet-ID komt er een vraag, in het Nederlands op de Nederlandse pagina',
    (await page.textContent('#toestemming h2')) === 'Mogen we meetellen?', await page.textContent('#toestemming'));
  check('"ja" en "nee" zijn even groot', knoppen.length === 2 && knoppen[0].b === knoppen[1].b
    && knoppen[0].h === knoppen[1].h && knoppen.map((k) => k.tekst).join('/') === 'Ja, prima/Nee', JSON.stringify(knoppen));
  check('met een link naar de privacyverklaring',
    (await page.getAttribute('#toestemming a', 'href')).endsWith('/privacy/'));
  check('zolang je niets kiest laadt er niets van Google', gtag().length === 0, extern.join(' '));
}
await page.click('#toestemming [data-keuze="nee"]');
check('nee: de vraag gaat weg', (await page.$('#toestemming')) === null);
await naar('');
check('en komt bij een volgend bezoek niet terug', (await page.$('#toestemming')) === null);
check('en er laadt niets van Google', gtag().length === 0, extern.join(' '));

// In een andere taal: de vraag in die taal, en "meer weten" naar de Engelse verklaring.
await page.evaluate(() => localStorage.removeItem('ptr:analytics'));
await naar('de/');
await page.waitForSelector('#toestemming');
check('op de Duitse pagina in het Duits', (await page.textContent('#toestemming h2')) === 'Dürfen wir mitzählen?');
check('met de Engelse privacyverklaring erachter (die is er in het Nederlands en Engels)',
  (await page.getAttribute('#toestemming a', 'href')).endsWith('/en/privacy/'));

await page.click('#toestemming [data-keuze="ja"]');
await page.waitForTimeout(200);
check('ja: Google Analytics laadt, met de meet-ID', gtag().length === 1, extern.join(' '));
const voor = gtag().length;
await naar('');
await page.waitForTimeout(200);
check('bij een volgend bezoek laadt hij weer, zonder opnieuw te vragen',
  (await page.$('#toestemming')) === null && gtag().length === voor + 1, `${voor} → ${gtag().length}`);

// ---- 4. van gedachten veranderen --------------------------------------------------
check('onderaan de pagina staat nu "Statistieken en cookies"',
  await page.$eval('[data-toestemming]', (a) => !a.hidden && a.textContent === 'Statistieken en cookies'));
await context.addCookies([{ name: '_ga', value: 'GA1.1.123', url }, { name: '_ga_TEST', value: 'GS1', url }]);
await page.click('[data-toestemming]');
await page.waitForSelector('#toestemming');
await page.click('#toestemming [data-keuze="nee"]');
{
  const koekjes = (await context.cookies()).map((c) => c.name);
  check('nee na ja: Google Analytics staat stil en zijn cookies zijn weg',
    await page.evaluate(() => window['ga-disable-G-TEST'] === true) && !koekjes.some((n) => n.startsWith('_ga')),
    koekjes.join(','));
  check('en de keuze is nee', (await page.evaluate(() => localStorage.getItem('ptr:analytics'))) === 'nee');
}

// ---- 5. de app: dezelfde keuze, en de knop in Profiel ------------------------------
await naar('app/');
await page.waitForSelector('#code, [data-race]');
check('in de app geldt dezelfde keuze: geen vraag', (await page.$('#toestemming')) === null);
await page.fill('#code', 'RTM026');
await page.click('#mee');
await page.waitForSelector('[data-lid]');
await page.click('[data-lid]');
await page.waitForSelector('#koppelnunniet, [data-race]');
if (await page.$('#koppelnunniet')) await page.click('#koppelnunniet');
await page.click('[data-weergave="profiel"]');
await page.click('#privacyopen');
await page.waitForSelector('[data-toestemming]');
check('in Profiel, bij de privacyverklaring, staat "Statistieken en cookies"',
  await page.$eval('#app [data-toestemming]', (b) => !b.hidden));
await page.click('#app [data-toestemming]');
await page.waitForSelector('#toestemming');
check('en die opent de vraag opnieuw', (await page.textContent('#toestemming h2')) === 'Mogen we meetellen?');
const voorApp = gtag().length;
await page.click('#toestemming [data-keuze="ja"]');
await page.waitForTimeout(200);
check('ja in de app laadt Google Analytics', gtag().length === voorApp + 1, extern.join(' '));

check('geen JavaScript-fouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
