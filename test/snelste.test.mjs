// De snelste ronde en de snelste pitstop. Twee dingen maken ze anders dan de
// winnaar en de pole:
//
//   1. Ze staan niet in de finishvolgorde. Er is een eigen kolom op races,
//      en die is los in te vullen als OpenF1 hem niet heeft.
//   2. De "uitslag" is één naam lang. "Werd P4" zegt dan niets; wie het wél
//      werd is wat je wilt weten.

import { maakControle, startPagina, meedoen, openRace, kiesVoor, opPlek } from './hulp.mjs';

const { check, afronden } = maakControle('snelste ronde en snelste pitstop');
const { page, jsFouten, stoppen } = await startPagina();

const antwoorden = () => page.evaluate(() => globalThis.__db.answers);
const race1 = () => page.evaluate(() =>
  globalThis.__db.races.find((r) => String(r.id) === '1'));
const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

await meedoen(page);
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('[data-vraagplek="snelste_ronde"]');

// --- kiezen en opslaan -----------------------------------------------------
const regels = await page.$$eval('[data-vraagplek]', (n) => n.map((b) => b.dataset.vraagplek));
check('beide vragen staan op de race-tab',
  regels.includes('snelste_ronde') && regels.includes('snelste_pitstop'),
  regels.join(' | '));
check('en niet op de kwalificatie-tab', !regels.includes('pole'));

// Twee verschillende coureurs, zodat de twee vragen niet door elkaar lopen.
const nummers = await page.evaluate(() => globalThis.__db.races
  .find((r) => String(r.id) === '1').drivers.map((d) => d.nr));
const ronde = nummers[0], pit = nummers[1];
await kiesVoor(page, '[data-vraagplek="snelste_ronde"]', ronde);
await kiesVoor(page, '[data-vraagplek="snelste_pitstop"]', pit);

await page.click('#opslaan');
await page.waitForSelector('[data-race]');
const rijen = await antwoorden();
const vraag = (id) => rijen.find((a) => a.question_id === id);
check('allebei krijgen ze een eigen rij',
  vraag('snelste_ronde')?.waarde === ronde && vraag('snelste_pitstop')?.waarde === pit,
  `ronde ${vraag('snelste_ronde')?.waarde}, pitstop ${vraag('snelste_pitstop')?.waarde}`);
check('en ze zijn niet door elkaar geraakt', ronde !== pit, `${ronde} / ${pit}`);

await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('[data-vraagplek="snelste_ronde"]');
const rondeCode = await page.evaluate((nr) => globalThis.__db.races
  .find((r) => String(r.id) === '1').drivers.find((d) => d.nr === nr).code, ronde);
const terug = await opPlek(page, '[data-vraagplek="snelste_ronde"]');
check('ze staan er nog na opnieuw openen', terug === rondeCode, `${terug} tegen ${rondeCode}`);

// --- de uitslag komt binnen, maar zonder snelste ronde --------------------
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  r.race_result = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18', '6', '43'];
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('.score');

const wachten = await tekst('#paneel');
check('een uitslag die er nog niet is zegt dat hij vanzelf komt',
  wachten.includes('nog niet bekend') && wachten.includes('sync'),
  wachten.slice(0, 90) + '...');
check('en er staat niet dat je punten hebt laten liggen',
  !wachten.includes('geen snelste ronde gekozen'), wachten.slice(0, 90) + '...');

// --- zelf invullen ---------------------------------------------------------
await page.click('[data-losse-start="snelste_ronde"]');
await page.waitForSelector('[data-losse]');
check('zelf invullen waarschuwt dat het voor iedereen geldt',
  (await tekst('#paneel')).includes('niet alleen voor jouw poule'));
check('opslaan kan pas als je iemand hebt aangewezen',
  await page.$eval('#losseOpslaan', (b) => b.disabled));

// Bewust dezelfde coureur als de speler koos, zodat de punten zichtbaar worden.
await page.click(`[data-losse="${ronde}"]`);
await page.click('#losseOpslaan');
await page.waitForSelector('.melding');

const na = await race1();
check('de snelste ronde staat in de database', na.fastest_lap === ronde, String(na.fastest_lap));
check('en is gemarkeerd als handmatig ingevuld', na.fastest_lap_handmatig === true);
check('de snelste pitstop is niet aangeraakt', na.fastest_pitstop === null,
  String(na.fastest_pitstop));

// --- en dan de punten ------------------------------------------------------
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('.score');
const scherm = await tekst('#paneel');
check('de goede gok levert 10 punten op',
  /snelste ronde · 10 punten · handmatig ingevuld/.test(scherm),
  scherm.match(/snelste ronde[^A-Z]*/)?.[0] ?? 'die regel staat er niet');
check('de snelste pitstop wacht nog steeds op zijn uitslag',
  scherm.includes('nog niet bekend'));

// --- een misser noemt wie het wél werd -------------------------------------
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  // Iemand anders dan de speler koos: 43 staat onderaan de uitslag.
  r.fastest_pitstop = '43';
  r.fastest_pitstop_handmatig = false;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await openRace(page, 'Melbourne');
await page.click('[data-tab="race"]');
await page.waitForSelector('.score');
const misser = await tekst('#paneel');
check('een misser zegt wie het wel werd, niet op welke plek hij eindigde',
  misser.includes('het werd COL') && !/snelste pitstop[\s\S]{0,80}werd P/.test(misser),
  misser.match(/snelste pitstop .{0,60}/)?.[0] ?? 'die regel staat er niet');

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
