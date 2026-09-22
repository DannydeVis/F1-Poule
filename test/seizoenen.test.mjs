// Meer dan één seizoen.
//
// `SEIZOEN` stond hardgecodeerd op 2026 in index.html. Dat werkt precies tot
// 1 januari 2027: dan filtert de app de kalender op een jaar dat voorbij is,
// ziet iedereen een leeg racesoverzicht, en is er niets op het scherm dat
// uitlegt waarom. Het soort fout dat een jaar stil ligt te wachten.
//
// Een poule hoort bij het seizoen waarin hij is aangemaakt (`pools.season`),
// en dát bepaalt welke races je ziet. Een poule uit 2026 blijft dus ook in
// 2027 de races van 2026 tonen — hij is niet leeg, hij is afgelopen.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('meer dan één seizoen');
const { page, jsFouten, stoppen, url } = await startPagina();

await meedoen(page);

// Een tweede seizoen in de kalender, en een poule die daarbij hoort.
await page.evaluate(() => {
  const db = globalThis.__db;
  const bron = db.races[0];
  for (let i = 0; i < 3; i++) {
    db.races.push({ id: 900 + i, season: 2027, round: i + 1,
      name: ['Sakhir', 'Jeddah', 'Melbourne'][i], drivers: bron.drivers,
      deadline_quali: new Date(Date.now() + (10 + i) * 36e5).toISOString(),
      deadline_race: new Date(Date.now() + (11 + i) * 36e5).toISOString(),
      quali_result: null, race_result: null,
      fastest_lap: null, fastest_pitstop: null, safety_cars: null, rode_vlag: null });
  }
  db.pools.push({ id: 'pool-2027', name: 'Nieuw seizoen', join_code: 'NW2027',
                  season: 2027, is_public: false });
  db.pool_members.push({ member_id: 'lid-2027', pool_id: 'pool-2027',
                         display_name: 'Danny', user_id: null });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});

// ---- de poule van 2026 blijft 2026 tonen --------------------------
await page.reload();
await page.waitForSelector('[data-race]');
const namen2026 = await page.$$eval('[data-race] .nm', (n) => n.map((e) => e.textContent.trim()));
check('een poule uit 2026 toont de races van 2026',
  namen2026.includes('Melbourne') && namen2026.includes('Shanghai'), namen2026.join(', '));
check('en niet die van 2027',
  !namen2026.includes('Sakhir') && !namen2026.includes('Jeddah'), namen2026.join(', '));

await page.click('[data-weergave="poule"]');
await page.waitForSelector('#anderePoule');
const kop2026 = await page.textContent('#app');
check('het jaartal op het scherm komt van de poule', kop2026.includes('2026'));

// ---- en de poule van 2027 toont 2027 ------------------------------
await page.evaluate(() => localStorage.clear());
await page.goto(url);
await page.waitForSelector('#code');
await page.fill('#code', 'NW2027');
await page.click('#mee');
await page.waitForSelector('[data-lid]');
await page.click('[data-lid]');
await page.waitForSelector('[data-race], #koppelnunniet');
if (await page.$('#koppelnunniet')) await page.click('#koppelnunniet');
await page.waitForSelector('[data-race]');

const namen2027 = await page.$$eval('[data-race] .nm', (n) => n.map((e) => e.textContent.trim()));
check('een poule uit 2027 toont de races van 2027',
  namen2027.includes('Sakhir') && namen2027.includes('Jeddah'), namen2027.join(', '));
check('en niet die van 2026',
  !namen2027.includes('Shanghai'), namen2027.join(', '));
check('het aantal races klopt met dat seizoen', namen2027.length === 3,
  `${namen2027.length} races`);

// Dit is de kern: zonder deze regel zou de app hier een lege kalender laten
// zien zodra de hardgecodeerde 2026 achterhaald is.
check('een nieuw seizoen levert dus geen leeg racesoverzicht op',
  namen2027.length > 0);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
