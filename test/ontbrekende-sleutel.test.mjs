// Wat ziet de speler als de database de unieke sleutel op
// (pool_id, race_id, member_id, question_id) op answers mist?
//
// Zonder die sleutel maakt elke "wijziging" een nieuwe rij aan en lijkt
// bewaren willekeurig wel en niet te werken. Dat moet een leesbare melding
// geven, en de ingevulde top 10 mag niet weg zijn.
//
// Leesbaar voor een speler: die kan niets met "draai schema.sql" of een
// tabelnaam. Hij krijgt te horen dat het aan ons ligt, met de foutcode erbij;
// wat die code betekent staat voor de beheerder in BEDIENING.md.

import { maakControle, startPagina, meedoen, openRace, kiesTien } from './hulp.mjs';

const { check, afronden } = maakControle('database zonder unieke sleutel');

const { page, stoppen } = await startPagina({
  aanpassen: (bron) => bron.replace(/const UNIEK = \{[^}]*\};/, 'const UNIEK = {};'),
});

await meedoen(page);
await openRace(page, 'Melbourne');
await kiesTien(page);
await page.click('#opslaan');

await page.waitForSelector('.err:not(:empty)', { timeout: 10000 });
const melding = (await page.textContent('.err')).trim();
check('de melding zegt in gewone woorden dat het aan ons ligt, met de foutcode erbij',
  melding.includes('storing aan onze kant') && melding.includes('(42P10)'), melding);
check('zonder tabelnamen of "schema.sql"',
  !/schema\.sql|answers|pool_id|supabase|database/i.test(melding), melding);

const rijen = await page.evaluate(() => globalThis.__db.answers.length);
check('er wordt niets stilzwijgend weggeschreven', rijen === 0, `${rijen} rijen`);

const nogIngevuld = await page.$$eval('.slot.vol', (n) => n.length);
check('de top 10 blijft staan na een mislukte poging', nogIngevuld === 10, `${nogIngevuld}/10`);

await stoppen();
process.exit(afronden() ? 0 : 1);
