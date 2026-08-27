// De pole en de teamgenoot-duels in de app zelf: kiezen, opslaan, en terug
// zien staan als je de race opnieuw opent.
//
// Twee dingen die makkelijk mis kunnen gaan en die je in de puntentelling
// niet ziet:
//
//   1. Wie alleen de pole invult heeft wél iets in te leveren. De opslaanknop
//      hing aan "tien coureurs gekozen" en zou dat wegdrukken.
//   2. Binnen één team kan er maar één de teamgenoot verslaan. Op de tweede
//      knop van hetzelfde team tikken hoort de eerste te vervangen, niet
//      allebei mee te sturen.

import { maakControle, startPagina, meedoen, openRace, kiesTien } from './hulp.mjs';

const { check, afronden } = maakControle('pole en duels in de app');
const { page, jsFouten, stoppen } = await startPagina();

const antwoorden = () => page.evaluate(() => globalThis.__db.answers);
const vraag = (rijen, id) => rijen.find((a) => a.question_id === id);

await meedoen(page);
await openRace(page, 'Melbourne');          // kwalificatie staat open

// --- alleen de pole, zonder top 10 ----------------------------------------
const leegKnop = (await page.textContent('#opslaan')).trim();
check('zonder iets gekozen kun je niet opslaan', leegKnop === 'Nog niets gekozen', leegKnop);

await page.click('[data-vraag="pole"]');
const pole = await page.getAttribute('.wknop.gekozen', 'data-kies');
const poleKnop = (await page.textContent('#opslaan')).trim();
check('alleen de pole invullen is genoeg om op te slaan', poleKnop === 'Opslaan', poleKnop);

await page.click('#opslaan');
await page.waitForSelector('[data-race]');
let rijen = await antwoorden();
check('de pole staat als eigen rij in de database',
  rijen.length === 1 && vraag(rijen, 'pole')?.waarde === pole,
  `${rijen.length} rij(en): ${rijen.map((a) => a.question_id).join(', ')}`);

// --- de pole staat er nog, en de top 10 komt erbij -------------------------
await openRace(page, 'Melbourne');
const terug = await page.getAttribute('.wknop.gekozen', 'data-kies');
check('de pole staat er nog na opnieuw openen', terug === pole, `${terug} tegen ${pole}`);

await kiesTien(page);
await page.click('#opslaan');
await page.waitForSelector('[data-race]');
rijen = await antwoorden();
check('de top 10 komt erbij zonder de pole te raken',
  rijen.length === 2 && vraag(rijen, 'pole')?.waarde === pole
    && vraag(rijen, 'quali_top10')?.waarde?.length === 10,
  rijen.map((a) => a.question_id).join(', '));

// --- nog een keer op dezelfde tikken haalt de keuze weg --------------------
await openRace(page, 'Melbourne');
await page.click(`[data-vraag="pole"][data-kies="${pole}"]`);
check('op je eigen pole tikken haalt hem weer weg',
  (await page.$('.wknop.gekozen')) === null);
await page.click('#opslaan');
await page.waitForSelector('[data-race]');
rijen = await antwoorden();
check('een weggehaalde pole laat geen lege rij achter',
  vraag(rijen, 'pole') === undefined && rijen.length === 1,
  rijen.map((a) => a.question_id).join(', '));

// --- de duels op de race-tab ----------------------------------------------
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('[data-duel]');

const duels = await page.$$eval('.duel', (n) => n.length);
check('elk team met twee coureurs krijgt een duel', duels === 6, `${duels} duels`);

// De eerste twee duels invullen, de rest bewust laten staan.
const knoppen = await page.$$eval('[data-duel]', (n) =>
  n.map((b) => ({ nr: b.dataset.duel, tegen: b.dataset.tegen })));
await page.click(`[data-duel="${knoppen[0].nr}"]`);
await page.click(`[data-duel="${knoppen[2].nr}"]`);

const gekozen = await page.$$eval('.duelknop.gekozen', (n) => n.map((b) => b.dataset.duel));
check('twee duels gekozen, de rest leeg', gekozen.length === 2, gekozen.join(', '));

// Op de teamgenoot tikken vervangt de keuze binnen dat team.
await page.click(`[data-duel="${knoppen[0].tegen}"]`);
const naWissel = await page.$$eval('.duelknop.gekozen', (n) => n.map((b) => b.dataset.duel));
check('de teamgenoot kiezen vervangt je eerdere keuze in dat duel',
  naWissel.length === 2 && naWissel.includes(knoppen[0].tegen)
    && !naWissel.includes(knoppen[0].nr),
  naWissel.join(', '));

const teller = await page.textContent('.duelteller');
check('de teller zegt hoeveel duels je hebt ingevuld',
  /2 van de\s+6 duels/.test(teller.replace(/\s+/g, ' ')), teller.trim());

await page.click('#opslaan');
await page.waitForSelector('[data-race]');
rijen = await antwoorden();
const bewaard = vraag(rijen, 'teamgenoot_duels')?.waarde;
check('alleen de ingevulde duels gaan mee naar de database',
  Array.isArray(bewaard) && bewaard.length === 2 && bewaard.includes(knoppen[0].tegen),
  JSON.stringify(bewaard));

// --- en ze staan er nog na opnieuw openen ----------------------------------
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('[data-duel]');
const naHerlaad = await page.$$eval('.duelknop.gekozen', (n) => n.map((b) => b.dataset.duel));
check('de duels staan er nog na opnieuw openen',
  naHerlaad.length === 2 && naHerlaad.every((nr) => bewaard.includes(nr)),
  naHerlaad.join(', '));

// --- en hoe het eruitziet als de uitslag binnen is -------------------------
// Een uitslag wint van de deadline, dus een race met een uitslag laat het
// puntenscherm zien. Zo komen coureurUitslag() en duelUitslag() ook echt aan
// bod in plaats van alleen de invulkant.
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  r.quali_result = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18', '6', '43'];
  r.race_result  = ['12', '1', '16', '63', '44', '81', '4', '10', '18', '14', '6', '43'];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await openRace(page, 'Melbourne');

const zonderPole = (await page.textContent('#paneel')).replace(/\s+/g, ' ');
check('een niet ingevulde pole zegt wat je laat liggen',
  zonderPole.includes('geen pole gekozen · 10 punten laten liggen'),
  zonderPole.slice(0, 80) + '...');

await page.click('[data-tab="race"]');
await page.waitForSelector('.score');
const raceScherm = (await page.textContent('#paneel')).replace(/\s+/g, ' ');
check('de duels krijgen een eigen kopje met hun punten',
  /teamgenoot-duels · \d+ van 15 punten/.test(raceScherm),
  raceScherm.slice(0, 90) + '...');

const duelRegels = await page.$$eval('.strip', (n) => n.map((u) => u.children.length));
check('alleen de twee ingevulde duels staan in de uitslag',
  duelRegels[0] === 2, duelRegels.join(' / '));

// Zonder race-top-10 maar mét duels hoort hier geen "je hebt hier niks
// ingevuld" te staan: er ligt wel degelijk iets ingeleverd.
check('wie alleen duels invulde krijgt zijn punten te zien',
  !raceScherm.includes('Je hebt hier niks ingevuld')
    && (await page.$('.score .getal')) !== null,
  raceScherm.slice(0, 90) + '...');

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
