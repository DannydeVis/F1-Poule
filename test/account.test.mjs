// Elke speler hoort voortaan bij een account.
//
// Waarom dat moet: de anon key staat gewoon in index.html — dat hóórt zo,
// hij is publiek — maar zonder iets om op te controleren betekent het dat
// iedereen die de poulecode heeft andermans voorspelling kan overschrijven.
// De database heeft een "jij" nodig, en die komt van Supabase: een anoniem
// account, zonder inlogscherm, zonder wachtwoord, zonder mail.
//
// Wat hier vastligt is vooral wat er *niet* gebeurt. Rondkijken maakt geen
// account aan. Een speler die al van iemand is wordt nooit overgenomen. En
// een gedeeld toestel — één telefoon die rondgaat bij het inschrijven —
// blijft werken, ook al mag één account maar één speler per poule zijn.
//
// De nabootsing bewaart de sessie in localStorage, net als supabase-js
// zelf, en de accounts in de "database". Een test die localStorage wist
// bootst daarmee een ander toestel na en krijgt ook echt een ander account.

import { maakControle, startPagina } from './hulp.mjs';

const { check, afronden } = maakControle('account: wie ben je, en van wie is deze speler');
const { page, jsFouten, stoppen } = await startPagina();

const accounts = () => page.evaluate(() => globalThis.__db.auth_users.map((u) => u.id));
const speler = (naam) => page.evaluate((n) =>
  globalThis.__db.pool_members.find((l) => l.display_name === n) ?? null, naam);

const kiesSpeler = async (naam) => {
  await page.waitForSelector('[data-lid]');
  await page.click(`[data-lid]:has(.nm:text-is("${naam}"))`);
  await page.waitForSelector('[data-race]');
};
const voerCodeIn = async () => {
  await page.waitForSelector('#code');
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
};

// --- rondkijken kost niets -------------------------------------------------
// Deze pagina is straks publiek. Zou hij bij het openen al een account
// aanmaken, dan stond er binnen een week een rij accounts in de database
// voor elke bot die langskwam.
await page.waitForSelector('#code');
check('rondkijken maakt nog geen account aan', (await accounts()).length === 0);

// --- meedoen wel -----------------------------------------------------------
await voerCodeIn();
await kiesSpeler('Danny');

const eerste = await accounts();
check('meedoen maakt precies één account aan', eerste.length === 1, `${eerste.length}`);
const danny = await speler('Danny');
check('en de speler die je aanwijst hoort daarna bij dat account',
  danny.user_id === eerste[0], `${danny.user_id} tegen ${eerste[0]}`);

await page.reload();
await page.waitForSelector('[data-race]');
check('een herlaadbeurt hergebruikt de sessie en maakt er geen tweede bij',
  (await accounts()).length === 1);

// --- een gedeeld toestel ---------------------------------------------------
// Danny geeft zijn telefoon door zodat Joey zich kan inschrijven. Eén account
// kan maar één speler per poule zijn (die sleutel staat in schema.sql), dus
// Joey krijgt er geen. Hij doet gewoon mee; hij hangt alleen nog aan niemand,
// tot hij de app op zijn eigen toestel opent. Een foutmelding zou hier veel
// erger zijn dan een speler die nog geclaimd moet worden.
await page.click('#wissel');
await page.waitForSelector('#naam');
await page.fill('#naam', 'Joey');
await page.click('#maak');
await page.waitForSelector('[data-race]');

const joey = await speler('Joey');
check('een tweede speler vanaf hetzelfde toestel mag gewoon meedoen', joey !== null);
check('maar hij hangt nog aan niemand', joey && joey.user_id === null,
  JSON.stringify(joey));
check('en de eerste speler blijft van het eerste account',
  (await speler('Danny')).user_id === eerste[0]);
check('er is geen tweede account voor bijgemaakt', (await accounts()).length === 1);
check('en er staat geen foutmelding', (await page.$('#f')) === null);

// --- het account herkent je, ook als het toestel niets meer weet -----------
// Alleen de poule-geheugens weg, de sessie blijft staan. Dat is de situatie
// van een tweede toestel waarop je je account meeneemt.
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('poule:')) localStorage.removeItem(k);
  }
});
await page.reload();
await voerCodeIn();
await page.waitForSelector('[data-race], [data-lid]');
check('het account herkent je zonder dat het toestel weet wie je bent',
  (await page.$('[data-lid]')) === null && (await page.$('[data-race]')) !== null);

await page.click('[data-weergave="poule"]');
await page.waitForSelector('.speler.zelf');
check('en dat is de speler van dít account, niet de laatst aangeklikte',
  (await page.textContent('.speler.zelf .nm')).trim() === 'Danny',
  await page.textContent('.speler.zelf .nm'));

// --- een ander toestel neemt niemand over ---------------------------------
// Dit is het punt van de hele oefening. Wie de poulecode heeft komt in het
// "Wie ben jij?"-scherm en kan daar op elke naam klikken — dat kon altijd al
// en dat blijft zo — maar hij wordt daarmee niet de eigenaar van die speler.
await page.evaluate(() => localStorage.clear());
await page.reload();
await voerCodeIn();
await kiesSpeler('Danny');

check('een leeg toestel neemt een geclaimde speler niet over',
  (await speler('Danny')).user_id === eerste[0],
  String((await speler('Danny')).user_id));
check('en maakt daar ook geen account voor aan, want dat helpt niemand',
  (await accounts()).length === 1);

// Een speler die nog van niemand is, is er wel eentje om te claimen — en
// dán is er pas een account nodig.
await page.click('#wissel');
await kiesSpeler('Joey');

const twee = await accounts();
check('een speler zonder eigenaar wordt wél geclaimd', twee.length === 2, `${twee.length}`);
check('en krijgt het account van dit toestel',
  (await speler('Joey')).user_id === twee[1],
  `${(await speler('Joey')).user_id} tegen ${twee[1]}`);
check('zonder de eerste speler aan te raken',
  (await speler('Danny')).user_id === eerste[0]);

// --- een poule aanmaken ---------------------------------------------------
// De sleutel geldt per poule, niet per account. Dit toestel is al Joey in de
// eerste poule; in een nieuwe poule mag het gewoon weer meedoen.
await page.click('#anderePoule');
await page.waitForSelector('#nieuw');
await page.click('#nieuw');
await page.waitForSelector('#pnaam');
await page.fill('#pnaam', 'Donderdagavondpoule');
await page.click('#verder');
await page.waitForSelector('#snaam');
await page.fill('#snaam', 'Joey');
await page.click('#verder');
await page.waitForSelector('[data-preset]');
await page.click('#verder');
await page.waitForSelector('#klaar');

const nieuwePoule = await page.evaluate(() =>
  globalThis.__db.pools.find((p) => p.name === 'Donderdagavondpoule') ?? null);
check('de nieuwe poule staat in de database', !!nieuwePoule);
const baas = await page.evaluate((id) =>
  globalThis.__db.pool_members.find((l) => l.pool_id === id) ?? null, nieuwePoule?.id);
check('wie een poule aanmaakt hangt meteen aan zijn eigen account',
  baas && baas.user_id === twee[1], JSON.stringify(baas));
check('en dat is hetzelfde account dat in de andere poule al meespeelde',
  (await speler('Joey')).user_id === baas.user_id);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
