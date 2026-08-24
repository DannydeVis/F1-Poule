// Wat ziet de speler als de database de unieke sleutel op
// (pool_id, race_id, member_id) mist?
//
// Zonder die sleutel maakt elke "wijziging" een nieuwe rij aan en lijkt
// bewaren willekeurig wel en niet te werken. Dat moet een leesbare melding
// geven die naar schema.sql wijst, en de ingevulde top 10 mag niet weg zijn.

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
check('de melding wijst naar schema.sql', melding.includes('schema.sql'), melding);

const rijen = await page.evaluate(() => globalThis.__db.predictions.length);
check('er wordt niets stilzwijgend weggeschreven', rijen === 0, `${rijen} rijen`);

const nogIngevuld = await page.$$eval('.slot.vol', (n) => n.length);
check('de top 10 blijft staan na een mislukte poging', nogIngevuld === 10, `${nogIngevuld}/10`);

await stoppen();
process.exit(afronden() ? 0 : 1);
