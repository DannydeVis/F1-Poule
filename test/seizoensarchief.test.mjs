// Terugbladeren naar een vorig seizoen.
//
// Het eerste punt uit fase 5, en het minst speculatieve van de vijf: de
// gegevens stonden er al. Elke race draagt zijn `season` en elk antwoord hangt
// aan een race, dus een vorig seizoen was nooit weg — het werd alleen
// weggefilterd bij het ophalen. Dit is daarom geen archief met een eigen vorm
// maar een andere snede door wat er al is.
//
// Wat hier vastligt:
//   1. Eén seizoen laat geen keuzelijst zien. Een keuze uit één is geen keuze.
//   2. Zodra er twee zijn kun je wisselen, en dan wisselt álles mee: de
//      kalender, de stand en het aantal races.
//   3. Doorschuiven naar een nieuw seizoen kan pas als dit seizoen erop zit.
//   4. En doorschuiven gooit niets weg.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('terugbladeren naar een vorig seizoen');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const namen = () => page.$$eval('[data-race] .nm', (n) => n.map((e) => e.textContent.trim()));
const naarStand = async () => {
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.strij');
};
const naarRaces = async () => {
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('[data-race]');
};

await meedoen(page);

// --- 1. één seizoen, geen keuzelijst --------------------------------------
check('met één seizoen staat er geen keuzelijst',
  (await page.$('#seizoenkeuze')) === null);

// Het seizoen 2026 helemaal afmaken, en er een tweede naast zetten. Danny
// scoorde in 2026 een perfecte Melbourne (100 punten) en in 2027 nog niets.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  const drivers = db.races[0].drivers;
  for (const [i, r] of db.races.entries()) {
    Object.assign(r, { drivers, deadline_quali: u(-50 + i), deadline_race: u(-49 + i),
      quali_result: uitslag, race_result: uitslag });
  }
  // Alleen in Melbourne deed Danny mee.
  for (const q of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: 'lid-1',
                      question_id: q, waarde: uitslag.slice(0, 10) });
  }
  db.pools[0].owner_member_id = 'lid-1';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');

// --- 3. doorschuiven kan pas als het seizoen erop zit ---------------------
// Eerst zonder kalender voor 2027: dan is er niets om naartoe te schuiven,
// maar de knop hoort er wel te staan en aan te zijn — alle races van 2026
// zijn gereden.
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#nieuwSeizoenKnop');
check('met een afgelopen seizoen mag je doorschuiven',
  await page.$eval('#nieuwSeizoenKnop', (b) => !b.disabled));
check('en de knop noemt het volgende jaar',
  (await tekst('#nieuwSeizoenKnop')) === 'Begin aan 2027', await tekst('#nieuwSeizoenKnop'));

// En nu een race die nog moet komen: dan mag het niet.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.races[2].quali_result = null;
  db.races[2].race_result = null;
  db.races[2].deadline_quali = new Date(Date.now() + 24 * 3600e3).toISOString();
  db.races[2].deadline_race = new Date(Date.now() + 48 * 3600e3).toISOString();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#nieuwSeizoenKnop');
check('zolang er nog gereden moet worden kan doorschuiven niet',
  await page.$eval('#nieuwSeizoenKnop', (b) => b.disabled));
check('en het scherm zegt waarom',
  (await tekst('.veldblok:has(#nieuwSeizoenKnop), #app')).includes('moet nog gereden worden'));

// Race 3 alsnog afmaken, en de kalender van 2027 erbij.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  Object.assign(db.races[2], { deadline_quali: u(-2), deadline_race: u(-1),
    quali_result: uitslag, race_result: uitslag });
  for (let i = 0; i < 3; i++) {
    db.races.push({ id: 700 + i, season: 2027, round: i + 1,
      name: ['Sakhir', 'Jeddah', 'Imola'][i], drivers: db.races[0].drivers,
      deadline_quali: u(200 + i * 24), deadline_race: u(210 + i * 24),
      deadline_sprint: null, quali_result: null, race_result: null, sprint_result: null,
      fastest_lap: null, fastest_pitstop: null, safety_cars: null, rode_vlag: null });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
// De app onthoudt op welk scherm je stond, dus na dit herladen sta je nog bij
// Poule; even terug naar de kalender.
await page.reload();
await naarRaces();

const van2026 = await namen();
check('voor het doorschuiven staat 2026 in de kalender',
  van2026.includes('Melbourne') && !van2026.includes('Sakhir'), van2026.join(', '));
await naarStand();
const stand2026 = Number(await tekst('.strij .t'));
check('en de stand van 2026 telt de perfecte Melbourne', stand2026 === 100, String(stand2026));

// --- 4. doorschuiven ------------------------------------------------------
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#nieuwSeizoenKnop');
await page.click('#nieuwSeizoenKnop');
await page.waitForSelector('.melding');
check('doorschuiven zegt wat er gebeurd is',
  (await tekst('.melding')).includes('2027') && (await tekst('.melding')).includes('2026'),
  await tekst('.melding'));
check('en de poule staat nu op het nieuwe seizoen',
  (await page.evaluate(() => globalThis.__db.pools[0].season)) === 2027);

await naarRaces();
const van2027 = await namen();
check('de kalender is die van 2027',
  van2027.includes('Sakhir') && !van2027.includes('Melbourne'), van2027.join(', '));

// --- 2. en 2026 is niet weg -----------------------------------------------
check('nu er twee seizoenen zijn staat er een keuzelijst',
  (await page.$('#seizoenkeuze')) !== null);
const opties = await page.$$eval('#seizoenkeuze option', (n) =>
  n.map((o) => ({ waarde: o.value, tekst: o.textContent.trim() })));
check('met allebei de seizoenen erin, nieuwste eerst',
  opties.length === 2 && opties[0].waarde === '2027' && opties[1].waarde === '2026',
  opties.map((o) => o.tekst).join(' | '));
check('en het afgelopen seizoen staat als zodanig gemarkeerd',
  opties[1].tekst.includes('afgelopen'), opties[1].tekst);

await page.selectOption('#seizoenkeuze', '2026');
await page.waitForSelector('[data-race]');
const terug2026 = await namen();

check('terugbladeren geeft de kalender van 2026 weer',
  terug2026.includes('Melbourne') && !terug2026.includes('Sakhir'), terug2026.join(', '));

await naarStand();
check('en de stand van 2026 staat er nog precies zo',
  Number(await tekst('.strij .t')) === 100, await tekst('.strij .t'));
check('het aantal races hoort ook bij dat seizoen',
  (await tekst('.strij')) !== '' && (await page.textContent('#app')).includes('na 3 van 3'),
  (await page.textContent('#app')).match(/na \d+ van \d+/)?.[0] ?? 'niet gevonden');

// Vooruit weer naar 2027: leeg, want er is nog niets gereden. We staan nu op
// de standpagina, dus daar staat geen [data-race] om op te wachten.
await page.selectOption('#seizoenkeuze', '2027');
await page.waitForFunction(() => document.body.textContent.includes('na 0 van 3'));
check('vooruit weer naar 2027 geeft een verse stand',
  (await page.textContent('#app')).includes('na 0 van 3'),
  (await page.textContent('#app')).match(/na \d+ van \d+/)?.[0] ?? 'niet gevonden');
await naarRaces();
check('en de kalender van 2027', (await namen()).includes('Sakhir'), (await namen()).join(', '));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
