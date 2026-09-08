// Wat de app van je weet, en hoe je het weer weg krijgt.
//
// Sinds er mailadressen aan accounts kunnen hangen slaat deze app een
// persoonsgegeven op. Dan hoort er te staan wat er bewaard wordt, en hoort er
// een knop te zijn die het weghaalt — niet als vinkje, maar als iets dat het
// ook echt doet.
//
// Het scherpe punt zit in de twee smaken. "Alles weg" is in een poule niet
// vanzelf de vriendelijke keuze: je voorspellingen zitten in de stand van je
// medespelers, en die klopt daarna niet meer. Het scherm moet dat verschil
// vóóraf zeggen, en de knoppen moeten het waarmaken.

import { maakControle, startPagina, meedoen, openRace, kiesTien } from './hulp.mjs';

const { check, afronden } = maakControle('wat de app van je weet');
const { page, jsFouten, stoppen, url } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const speler = (naam) => page.evaluate((n) =>
  globalThis.__db.pool_members.find((l) => l.display_name === n) ?? null, naam);
const accounts = () => page.evaluate(() => globalThis.__db.auth_users.length);

// --- meedoen, iets invullen, en dan de verklaring lezen -------------------
await meedoen(page);
await openRace(page, 'Melbourne');
await kiesTien(page);
await page.click('#opslaan');
await page.waitForSelector('[data-race]');

await page.click('[data-weergave="poule"]');
await page.waitForSelector('#privacyopen');
check('de verklaring staat dichtgeklapt onder Poule',
  (await page.$('#wegaccount')) === null);

await page.click('#privacyopen');
await page.waitForSelector('#wegaccount');
const verklaring = await tekst('#app');
check('hij zegt dat een mailadres alleen bewaard wordt als je het koppelt',
  verklaring.includes('alleen als je het zelf koppelt'));
check('en waar de gegevens staan', verklaring.includes('Supabase'));
check('en dat er geen trackers in zitten',
  verklaring.includes('geen trackers') || verklaring.includes('geen analytics'));
check('en dat de lettertypen in de app zelf zitten',
  verklaring.includes('lettertypen staan in de app zelf'));
check('en het is eerlijk over het enige dat nog van buiten komt',
  verklaring.includes('esm.sh') && verklaring.includes('IP-adres'));
// De verklaring mag dit pas beweren zolang het waar is. Deze controle kijkt
// naar de markup: geen <link>, <script src> of <img> naar een vreemde host.
// Zou er weer een verwijzing naar Google Fonts in sluipen, dan valt deze test
// om — en dat is precies de bedoeling. De dynamische import van de
// supabase-client staat niet in de markup en is hier vervangen door de
// nabootsing; die staat wél in de verklaring genoemd.
const vreemd = await page.evaluate(() => [...document.querySelectorAll('link[href], script[src], img[src]')]
  .map((e) => e.getAttribute('href') || e.getAttribute('src'))
  .filter((u) => /^https?:\/\//.test(u ?? '')));
check('en dat klopt: de pagina haalt niets bij een andere host op',
  vreemd.length === 0, vreemd.join(' | ') || '(niets)');
check('het verschil tussen de twee manieren van weggaan staat erbij',
  verklaring.includes('zodat de stand van de anderen blijft kloppen')
    && verklaring.includes('niet terug te draaien'));

// --- één tik verwijdert nog niets -----------------------------------------
await page.click('#wegaccount');
check('één tik vraagt eerst, en verwijdert nog niets',
  (await tekst('#wegaccount')).includes('nog een keer') && (await accounts()) === 1,
  await tekst('#wegaccount'));

// --- alleen het account: de poule blijft heel -----------------------------
await page.click('#wegaccount');
await page.waitForSelector('#code, [data-lid], [data-race]');
check('het account is weg', (await accounts()) === 0);
check('maar de speler staat er nog, zodat de stand van de anderen klopt',
  (await speler('Danny')) !== null);
check('en hangt aan niemand meer',
  (await speler('Danny')).user_id === null, JSON.stringify(await speler('Danny')));
check('de voorspelling is niet weggegooid',
  (await page.evaluate(() => globalThis.__db.answers.length)) > 0);

// --- en je kunt gewoon weer meedoen ---------------------------------------
await page.waitForSelector('#code, [data-race], [data-lid]');
if (await page.$('#code')) {
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
}
await page.waitForSelector('[data-lid], [data-race]');
if (await page.$('[data-lid]')) await page.click('[data-lid]:has(.nm:text-is("Danny"))');
await page.waitForSelector('[data-race], .speler');
check('na het verwijderen kun je jezelf gewoon weer aanwijzen',
  (await speler('Danny')).user_id !== null, JSON.stringify(await speler('Danny')));

// --- alles weg: nu gaat de speler wél mee ---------------------------------
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#privacyopen, #wegalles');
if (await page.$('#privacyopen')) {
  await page.click('#privacyopen');
  await page.waitForSelector('#wegalles');
}
await page.click('#wegalles');
await page.click('#wegalles');
// Er is nu geen speler meer in deze poule, dus het "Wie ben jij?"-scherm
// heeft niemand om aan te wijzen en biedt alleen het naamveld aan.
await page.waitForSelector('#naam, #code, [data-lid], [data-race]');

check('bij "alles" gaat de speler wel mee', (await speler('Danny')) === null);
check('en zijn voorspellingen ook',
  (await page.evaluate(() => globalThis.__db.answers.length)) === 0);
check('de poule zelf blijft bestaan',
  (await page.evaluate(() => globalThis.__db.pools.length)) >= 1);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
