// Wat een vreemde niet te zien krijgt — nu vanuit de app.
//
// De databasekant staat in test/afscherming.test.sql. Dit bestand doet de
// andere helft: dat de app zelf nog werkt nu de leespolicies dichtstaan, en
// dat hij dat doet langs de functies en niet langs een achterdeur.
//
// Waarom dat een eigen test verdient: als index.html per ongeluk weer een
// gewone `select` op pools gaat doen, blijft alles het in de nabootsing
// gewoon doen zolang je zelf lid bent. Je merkt het pas op het echte domein,
// bij iemand anders. Deze test zet daarom een tweede poule neer waar de
// speler niets mee te maken heeft.

import { maakControle, startPagina, meedoen, naDeClaim } from './hulp.mjs';

const { check, afronden } = maakControle('afscherming: wat een vreemde niet ziet');
const { page, jsFouten, stoppen, url } = await startPagina();

await meedoen(page);

// Een poule van iemand anders, met een speler en een inzending erin.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pools.push({ id: 'pool-geheim', name: 'Geheime buurtpoule',
                  join_code: 'GEH999', season: 2026, is_public: false });
  db.pool_members.push({ member_id: 'lid-geheim', pool_id: 'pool-geheim',
                         display_name: 'Onbekende buurman', user_id: 'iemand-anders' });
  db.answers.push({ pool_id: 'pool-geheim', race_id: 1, member_id: 'lid-geheim',
                    question_id: 'winnaar', waarde: '1' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});

const alsClient = (fn) => page.evaluate(async (bron) => {
  const { createClient } = await import('./nabootsing-supabase.mjs');
  return new Function('db', `return (${bron})(db)`)(createClient());
}, fn.toString());

// ---- de tabellen zelf geven niets prijs ---------------------------
const poules = await alsClient(async (db) =>
  (await db.from('pools').select('*')).data.map((p) => p.name));
check('een gewone select op pools geeft alleen je eigen poule',
  !poules.includes('Geheime buurtpoule'), poules.join(', '));

const namen = await alsClient(async (db) =>
  (await db.from('pool_members').select('*')).data.map((m) => m.display_name));
check('en geen spelersnamen uit een poule waar je niet in zit',
  !namen.includes('Onbekende buurman'), namen.join(', '));

const vreemd = await alsClient(async (db) =>
  (await db.from('answers').select('*')).data.filter((a) => a.pool_id === 'pool-geheim').length);
check('en geen inzendingen uit die poule', vreemd === 0, `${vreemd} gevonden`);

// Dit is de aanval waar het allemaal om begon: de hele tabel leegvissen met
// de anon key, zonder ook maar één code te kennen.
check('kortom, de poulestabel is niet leeg te vissen', poules.length <= 1,
  `${poules.length} poules zichtbaar`);

// ---- maar met de code kom je er gewoon in ------------------------
const metCode = await alsClient(async (db) =>
  (await db.rpc('poule_ophalen', { p_code: 'GEH999' })).data?.poule?.name ?? null);
check('met de poulecode krijg je hem wél, want dat is de bedoeling',
  metCode === 'Geheime buurtpoule', String(metCode));

const verzonnen = await alsClient(async (db) =>
  (await db.rpc('poule_ophalen', { p_code: 'BESTAATNIET' })).data);
check('een verzonnen code levert niets op', verzonnen === null, JSON.stringify(verzonnen));

// ---- en de app doet het nog gewoon -------------------------------
check('je eigen poule staat er nog steeds', await page.isVisible('[data-race]'));

const eigen = await page.$$eval('[data-weergave]', (n) => n.length);
check('de navigatie werkt', eigen > 0);

// Binnenkomen op een verse sessie, met alleen de code: de hele weg die de
// policies niet mogen blokkeren.
await page.evaluate(() => { localStorage.clear(); });
await page.goto(url);
await page.waitForSelector('#code');
await page.fill('#code', 'GEH999');
await page.click('#mee');
await page.waitForSelector('[data-lid]');
const lijst = await page.$$eval('[data-lid]', (n) => n.map((e) => e.textContent.trim()));
check('een vers toestel komt met de code binnen en ziet de spelerslijst',
  lijst.some((t) => t.includes('Onbekende buurman')), lijst.join(' | '));

await page.fill('#naam', 'Danny');
await page.click('#maak');
await naDeClaim(page);
check('en kan zich als nieuwe speler inschrijven', await page.isVisible('[data-race]'));

// De inschrijving gaat langs poule_meedoen(), dus hij moet ook echt in de
// database staan en aan dit account hangen.
const verse = await page.evaluate(() => {
  const db = globalThis.__db;
  return db.pool_members.filter((m) => m.pool_id === 'pool-geheim')
    .map((m) => ({ naam: m.display_name, account: !!m.user_id }));
});
check('de nieuwe speler staat in de database, met dit account eraan',
  verse.some((m) => m.naam === 'Danny' && m.account), JSON.stringify(verse));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
