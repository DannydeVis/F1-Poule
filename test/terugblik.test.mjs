// De terugblik op de standpagina: je blinde vlek en het zwaarste weekend.
//
// Deze twee bestaan alleen omdat élke voorspelling bewaard blijft — het is
// niet meer dan een gemiddelde over rijen die er al staan. Maar juist daarom
// is het gevaarlijk: een gemiddelde over twee weekenden is toeval, en een app
// die dat met gezag als "patroon" presenteert verzint iets.
//
// Wat hier vooral vastligt zijn dus de drempels: wanneer de app zijn mond
// houdt. De functies worden uit index.html geknipt, net als scoreLijst().

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel, startPagina, meedoen } from './hulp.mjs';

const bron = readFileSync(join(wortel, 'index.html'), 'utf8');
const stukken = [
  /export function blindeVlek[\s\S]*?\n\}/,
  /export const PLEKBANDEN[\s\S]*?\n\];/,
  /export function sterkstePlekken[\s\S]*?\n\}/,
  /export function raceGemiddelden[\s\S]*?\n\}/,
].map((re) => bron.match(re));
if (stukken.some((x) => !x)) {
  console.error('FOUT: een van de terugblikfuncties is niet gevonden in index.html');
  process.exit(2);
}
const map = mkdtempSync(join(tmpdir(), 'poule-terugblik-'));
writeFileSync(join(map, 'terugblik.mjs'), stukken.map((x) => x[0]).join('\n\n'));
const { blindeVlek, sterkstePlekken, raceGemiddelden } = await import(join(map, 'terugblik.mjs'));

const { check, afronden } = maakControle('terugblik: blinde vlek en zwaarste weekend');

// Zes lijsten waarin coureur 1 steeds twee plekken te hoog staat: jij zet hem
// op P1, hij wordt P3.
const uitslag = ['9', '8', '1', '7', '6'];
const mijne   = ['1', '9', '8', '7', '6'];
const zes = Array.from({ length: 6 }, () => ({ voorspeld: mijne, werkelijk: uitslag }));

// --- de blinde vlek --------------------------------------------------------
const vlek = blindeVlek(zes);
check('de coureur die je steeds te hoog zet komt bovenaan',
  vlek[0]?.nr === '1', JSON.stringify(vlek[0]));
check('de afwijking is negatief: te hoog ingeschat',
  vlek[0]?.afwijking === -2, String(vlek[0]?.afwijking));
check('en hij is zes keer voorspeld', vlek[0]?.keer === 6, String(vlek[0]?.keer));

// Andersom: te laag zetten geeft een positieve afwijking.
const telaag = Array.from({ length: 6 }, () => ({
  voorspeld: ['9', '8', '7', '6', '1'], werkelijk: ['1', '9', '8', '7', '6'] }));
check('te laag zetten geeft een positieve afwijking',
  blindeVlek(telaag)[0]?.afwijking === 4, String(blindeVlek(telaag)[0]?.afwijking));

// --- de drempels: wanneer de app zijn mond houdt ---------------------------
check('na twee lijsten beweert de app niets',
  blindeVlek(zes.slice(0, 2)).length === 0);
check('en een coureur die je maar twee keer voorspelde telt niet mee',
  blindeVlek(zes, { minKeer: 7 }).length === 0);
// Wie je gemiddeld minder dan een hele plek misschat heeft geen blinde vlek,
// die is gewoon goed bezig.
const bijnaGoedGenoeg = Array.from({ length: 6 }, (_, i) => ({
  voorspeld: i % 2 ? ['1', '9'] : ['9', '1'], werkelijk: ['1', '9'] }));
check('een halve plek afwijking is geen blinde vlek',
  bijnaGoedGenoeg.length === 6 && blindeVlek(bijnaGoedGenoeg).length === 0,
  JSON.stringify(blindeVlek(bijnaGoedGenoeg)));

// Een coureur die niet in de uitslag staat is uitgevallen; daar valt geen
// afwijking uit af te leiden.
const metUitvaller = Array.from({ length: 6 }, () => ({
  voorspeld: ['5', '1'], werkelijk: ['9', '1'] }));
check('een uitgevallen coureur levert geen blinde vlek op',
  !blindeVlek(metUitvaller).some((x) => x.nr === '5'),
  JSON.stringify(blindeVlek(metUitvaller)));

// --- waar ben je scherp ----------------------------------------------------
// P1 tot P3 heb ik hier exact goed, P4 en P5 zit ik naast.
const scherp = Array.from({ length: 6 }, () => ({
  voorspeld: ['1', '2', '3', '4', '5'], werkelijk: ['1', '2', '3', '5', '4'] }));
const banden = sterkstePlekken(scherp);
check('de band waarin je exact zit staat bovenaan',
  banden[0]?.naam === 'P1 tot P3', JSON.stringify(banden[0]));
check('met het volle aantal punten per plek',
  banden[0]?.gemiddelde === 5, String(banden[0]?.gemiddelde));
check('en de band waarin je naast zit staat lager',
  banden[1]?.gemiddelde === 3, JSON.stringify(banden[1]));
check('ook hier houdt de app zijn mond bij te weinig lijsten',
  sterkstePlekken(scherp.slice(0, 3)).length === 0);
check('een band waarin je nooit iets invulde komt er niet in',
  banden.every((b) => b.plekken > 0) && banden.length === 2,
  JSON.stringify(banden.map((b) => b.naam)));

// --- het zwaarste weekend --------------------------------------------------
const races = raceGemiddelden([
  { naam: 'Melbourne', punten: [50, 60, 70] },
  { naam: 'Monza',     punten: [10, 20, 30] },
  { naam: 'Suzuka',    punten: [40, 40, 40] },
]);
check('het zwaarste weekend staat vooraan',
  races[0]?.naam === 'Monza' && races[0]?.gemiddelde === 20, JSON.stringify(races[0]));
check('en het makkelijkste achteraan',
  races[races.length - 1]?.naam === 'Melbourne', JSON.stringify(races[races.length - 1]));
check('een race waar maar één speler aan meedeed is geen poulegemiddelde',
  raceGemiddelden([{ naam: 'Alleen', punten: [10] }]).length === 0);
check('en een race zonder inzendingen ook niet',
  raceGemiddelden([{ naam: 'Niemand' }]).length === 0);

// --- en of het op het scherm komt -----------------------------------------
const { page, jsFouten, stoppen } = await startPagina();
await meedoen(page);

// Eén gescoorde race is te weinig voor een uitspraak: de app hoort dan alleen
// over het zwaarste weekend te praten, niet over patronen in jouw spel.
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  r.deadline_quali = new Date(Date.now() - 3600e3).toISOString();
  r.quali_result = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];
  globalThis.__db.pool_members.push(
    { member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Joey', user_id: null });
  globalThis.__db.answers.push(
    { pool_id: 'pool-1', race_id: 1, member_id: 'lid-1', question_id: 'quali_top10',
      waarde: ['1', '63', '12', '44', '16', '4', '81', '10', '14', '18'] },
    { pool_id: 'pool-1', race_id: 1, member_id: 'lid-2', question_id: 'quali_top10',
      waarde: ['12', '1', '63', '16', '44', '4', '81', '10', '14', '18'] });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race], #paneel');
await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-weergave="stand"][aria-current="true"]');
const kort = (await page.textContent('#app')).replace(/\s+/g, ' ');
const zwijgt = !kort.includes('Je zet') && !kort.includes('scherpst');
check('met één gescoorde race zegt de app niets over jouw patronen', zwijgt,
  zwijgt ? '' : kort.slice(0, 200));
const zwaarsteEr = kort.includes('zwaarste weekend voor de poule');
check('maar het zwaarste weekend mag hij wel noemen', zwaarsteEr,
  zwaarsteEr ? '' : (kort.includes('terugblik') ? 'terugblik zonder die zin' : 'geen terugblik'));

// En met genoeg gespeeld mág hij wel iets beweren. Drie races met allebei de
// sessies gescoord zijn zes ingeleverde lijsten, precies de drempel.
await page.evaluate(() => {
  const echt = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];
  // Ik zet coureur 44 elke keer vier plekken te hoog: bij mij P1, in het
  // echt P5.
  const mijn = ['44', '1', '12', '63', '16', '4', '81', '10', '14', '18'];
  for (const r of globalThis.__db.races) {
    r.deadline_quali = new Date(Date.now() - 7200e3).toISOString();
    r.deadline_race  = new Date(Date.now() - 3600e3).toISOString();
    r.drivers ??= globalThis.__db.races[0].drivers;
    r.quali_result = echt;
    r.race_result = echt;
  }
  globalThis.__db.answers = globalThis.__db.answers.filter((a) => a.question_id !== 'quali_top10');
  for (const r of globalThis.__db.races) {
    for (const vraag of ['quali_top10', 'race_top10']) {
      globalThis.__db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1',
        question_id: vraag, waarde: mijn });
      globalThis.__db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-2',
        question_id: vraag, waarde: echt });
    }
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-weergave="stand"]');
await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-weergave="stand"][aria-current="true"]');
const lang = (await page.textContent('#app')).replace(/\s+/g, ' ');

const vlekEr = /Je zet HAM gemiddeld 4,0 plekken te hoog, over 6 voorspellingen/.test(lang);
check('met genoeg gespeeld noemt hij je blinde vlek, met coureur en aantal',
  vlekEr, vlekEr ? '' : (lang.match(/Je zet[^.]*\./)?.[0] ?? 'geen blindevlekzin'));
const sterkEr = /Je bent het scherpst op P\d/.test(lang);
check('en waar je juist scherp bent', sterkEr,
  sterkEr ? '' : (lang.match(/scherpst[^.]*\./)?.[0] ?? 'geen scherpst-zin'));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
