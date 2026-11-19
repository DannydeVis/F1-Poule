// Hoe voorspelbaar was F1 in 2026: het rekenen (19 november, zoekplan GEO 3.1).
//
// scripts/statistiek.mjs rekent per race uit wat vier simpele voorspellingen
// hadden opgeleverd. Wat hier vastligt:
//   1. De punten zijn die van de app: punten() geeft hetzelfde als scoreLijst()
//      uit app/index.html, en het maximum is 50.
//   2. Een willekeurige top 10 is exact uitgerekend: 125 plekpunten gedeeld
//      door het aantal deelnemers (P11 en P12 tellen mee, zoals in de app),
//      minder als er minder finishten; nagerekend met scoreLijst().
//   3. De WK-stand vóór de race telt races en sprints, met terugtellen bij
//      gelijke punten.
//   4. Per race: de kwalificatie, de stand, de vorige race en willekeurig; de
//      eerste race heeft geen stand en geen vorige; een afgelaste race telt
//      niet en de race erna kijkt terug naar de laatste gereden race.
//   5. De gemiddelden, de drie voorspelbaarste en minst voorspelbare races,
//      en hoe vaak de poleman won.
//   6. De CSV: een kop en per race een regel, met aanhalingstekens waar nodig.
//   7. Het script schrijft het bestand uit een bestand met rijen, zonder
//      netwerk; met DROOG schrijft het niets.

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { maakControle, wortel } from './hulp.mjs';
import { knipUit } from '../scripts/knipsel.mjs';
import { punten, willekeurig, stand, voorspelbaarheid, csv, splits, MAX, BESTAND } from '../scripts/statistiek.mjs';

const { check, afronden } = maakControle('hoe voorspelbaar was F1: het rekenen');
const appBron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
const { scoreLijst } = await import(`data:text/javascript,${encodeURIComponent(knipUit(appBron, 'primitieven'))}`);

// ---- 1. de punten van de app ---------------------------------------------------------
{
  const nrs = Array.from({ length: 22 }, (_, i) => String(i + 1));
  let zaad = 7;
  const kans = () => { zaad = (zaad * 1103515245 + 12345) % 2147483648; return zaad / 2147483648; };
  const schud = (xs) => [...xs].sort(() => kans() - 0.5);
  let gelijk = true;
  for (let i = 0; i < 300; i++) {
    const v = schud(nrs).slice(0, 10);
    const u = schud(nrs).slice(0, 12 + (i % 10));
    if (punten(v, u) !== scoreLijst(v, u).totaal) { gelijk = false; break; }
  }
  check('punten() geeft hetzelfde als scoreLijst() uit de app, 300 keer', gelijk);
  check('het maximum is 50', MAX === 50 && punten(nrs.slice(0, 10), nrs) === 50);
}

// ---- 2. willekeurig ----------------------------------------------------------------------
// Plek 1: 5+3+1 = 9, plek 2: 3+5+3+1 = 12, plek 3 tot en met 10: 1+3+5+3+1 = 13
// elk, ook plek 9 en 10 (die tellen P11 en P12 mee, zoals scoreLijst()): 125.
check('een willekeurige top 10 uit 22 met 20 finishers: 125 plekpunten gedeeld door 22',
  Math.abs(willekeurig(22, Array(20).fill('x')) - 125 / 22) < 1e-9, String(willekeurig(22, Array(20).fill('x')) * 22));
{
  // Nagerekend met scoreLijst(): alle 22 × 21 × ... is te veel, dus elke
  // coureur op elke plek apart: de verwachting per plek is het gemiddelde.
  const deeln = Array.from({ length: 22 }, (_, i) => String(i + 1));
  const uit = deeln.slice(0, 17);
  let som = 0;
  for (let plek = 0; plek < 10; plek++) for (const nr of deeln) {
    const v = Array(10).fill('leeg'); v[plek] = nr;
    som += scoreLijst(v, uit).totaal;
  }
  check('en dat is precies wat scoreLijst() gemiddeld geeft, elke coureur op elke plek',
    Math.abs(willekeurig(22, uit) - som / 22) < 1e-9, `${willekeurig(22, uit)} · ${som / 22}`);
}
// Plek 1: 5+3+1, plek 2: 3+5+3+1, plek 3 tot en met 6: 1+3+5+3+1 = 13 elk; samen 73.
check('finishten er maar zes, dan alleen die zes plekken',
  Math.abs(willekeurig(20, Array(6).fill('x')) - 73 / 20) < 1e-9, String(willekeurig(20, Array(6).fill('x')) * 20));
check('zonder deelnemers niets', willekeurig(0, ['1']) === null);

// ---- 3. de stand ---------------------------------------------------------------------------
{
  const s = stand([
    { race_result: ['1', '2', '3', '4'] },
    { race_result: ['2', '1', '3', '4'], sprint_result: ['3', '4'] },
  ]);
  // 1: 25+18 = 43, 2: 18+25 = 43 (terugtellen: allebei een keer eerste en een keer tweede, dan het nummer),
  // 3: 15+15+8 = 38, 4: 12+12+7 = 31.
  check('de stand telt races en sprints', s.join() === '1,2,3,4', s.join());
  const t = stand([{ race_result: ['5', '6'] }, { race_result: ['6', '7', '5'] }]);
  // 5: 25+15 = 40, 6: 18+25 = 43, 7: 18.
  check('de meeste punten bovenaan', t.join() === '6,5,7', t.join());
  const u = stand([{ race_result: ['8', '9', '10'] }, { race_result: ['10', '11', '9', '8'] }]);
  // 8: 25+12 = 37, 9: 18+15 = 33, 10: 15+25 = 40, 11: 18.
  check('ook als iemand inhaalt', u.join() === '10,8,9,11', u.join());
  const w = stand([{ race_result: ['12', '13'] }, { race_result: ['13', '12'] }, { race_result: ['14', '15', '12', '13'] }]);
  // 12: 25+18+15 = 58, 13: 18+25+12 = 55, 14: 25, 15: 18.
  check('drie races achter elkaar', w.join() === '12,13,14,15', w.join());
  const t2 = stand([{ race_result: ['31', '40', '32'] }, { race_result: ['40', '41', '42', '43', '32'] }]);
  // 31: 25. 32: 15+10 = 25. 40: 18+25 = 43. Gelijk tussen 31 en 32: 31 won een keer.
  check('bij gelijke punten wint wie vaker hoger eindigde (terugtellen)', t2.indexOf('31') < t2.indexOf('32'), t2.join());
  const g = stand([{ race_result: ['21', '20'], sprint_result: ['20'] }, { race_result: ['20', '22', '21'] }]);
  // 21: 25+15 = 40, 20: 18+8+25 = 51, 22: 18.
  check('sprintpunten tellen mee', g.join() === '20,21,22', g.join());
}

// ---- 4 en 5. per race ---------------------------------------------------------------------
const deelnemers = Array.from({ length: 20 }, (_, i) => String(i + 1));
const uitslag = (eerst) => [...eerst, ...deelnemers.filter((n) => !eerst.includes(n))];
const RIJEN = [
  { season: 2026, round: 1, name: 'Eerste', country: 'Australia', afgelast: false, deadline_race: '2026-03-08T04:00:00+00:00',
    drivers: deelnemers, quali_result: uitslag([]), race_result: uitslag([]) },
  { season: 2026, round: 2, name: 'Afgelast', afgelast: true, drivers: deelnemers, quali_result: null, race_result: null },
  { season: 2026, round: 3, name: 'Derde', afgelast: false, deadline_race: '2026-03-29T05:00:00+00:00',
    drivers: deelnemers, quali_result: uitslag(['2', '1']), race_result: uitslag(['3', '1', '2']), sprint_result: null },
  { season: 2026, round: 4, name: 'Nog niet', afgelast: false, drivers: deelnemers, quali_result: null, race_result: null },
  { season: 2025, round: 9, name: 'Ander jaar', afgelast: false, drivers: deelnemers, quali_result: uitslag([]), race_result: uitslag([]) },
];
const COUREURS = { 1: { naam: 'Een EERSTE', team: 'Team A' }, 3: { naam: 'Drie DERDE', team: 'Team B' } };
const d = voorspelbaarheid(RIJEN, COUREURS);
{
  const [r1, r3] = d.races;
  check('alleen gereden races van het seizoen', d.races.length === 2 && d.gereden === 2 && r1.ronde === 1 && r3.ronde === 3
    && d.afgelast.join() === 'Afgelast', d.races.map((r) => r.naam).join());
  check('de eerste race: kwalificatie is de uitslag, en geen stand of vorige race',
    r1.punten.kwalificatie === 50 && r1.punten.stand === null && r1.punten.vorige === null
      && r1.punten.willekeurig === 6.3, JSON.stringify(r1.punten));
  // Uitslag 3: 3,1,2,4,5,...; kwali 2,1,3,4,... → 2: P1 vs P3 = 1, 1: P2 = 5, 3: P3 vs P1 = 1, rest 7 × 5 = 35 → 42.
  // Stand na race 1 = 1,2,3,...: 1 P1 vs P2 = 3, 2 P2 vs P3 = 3, 3 P3 vs P1 = 1, 35 → 42.
  // De vorige race is race 1 (de afgelaste telt niet): dezelfde lijst als de stand.
  check('de derde race: kwalificatie, stand en de vorige gereden race, met de punten van de app',
    r3.punten.kwalificatie === 42 && r3.punten.stand === 42 && r3.punten.vorige === 42, JSON.stringify(r3.punten));
  check('met winnaar, pole en datum', r3.winnaar.nr === '3' && r3.winnaar.naam === 'Drie DERDE' && r3.winnaar.team === 'Team B'
    && r3.pole === '2' && r3.datum === '2026-03-29', JSON.stringify(r3.winnaar));
  check('de gemiddelden, met het aantal races erbij', d.gemiddeld.kwalificatie.gemiddeld === 46 && d.gemiddeld.kwalificatie.races === 2
    && d.gemiddeld.stand.gemiddeld === 42 && d.gemiddeld.stand.races === 1 && d.gemiddeld.willekeurig.gemiddeld === 6.3,
    JSON.stringify(d.gemiddeld));
  check('de voorspelbaarste en minst voorspelbare races, op de kwalificatie',
    d.best[0].naam === 'Eerste' && d.slechtst[0].naam === 'Derde' && d.best.length === 2, JSON.stringify([d.best, d.slechtst]));
  check('hoe vaak de poleman won', d.pole.gewonnen === 1 && d.pole.races === 2, JSON.stringify(d.pole));
  check('de laatste race en het maximum staan erbij', d.laatste.naam === 'Derde' && d.max === 50 && d.jaar === 2026);
}

// ---- 6. de CSV ---------------------------------------------------------------------------------
{
  const c = csv({ races: [{ ronde: 1, naam: 'Een, met komma', datum: '2026-03-08', winnaar: { naam: 'Een "Snelle" EERSTE' },
    punten: { kwalificatie: 40, stand: null, vorige: null, willekeurig: 5.5 } }] });
  check('de CSV: een kop, en aanhalingstekens waar nodig; leeg waar niets is',
    c === 'round,race,date,winner,qualifying,standings_before,previous_race,random_expected\n'
      + '1,"Een, met komma",2026-03-08,"Een ""Snelle"" EERSTE",40,,,5.5\n', c);
}

// ---- 7. het script ------------------------------------------------------------------------------
{
  const s = splits([{ round: 1, drivers: [{ nr: '1', naam: 'Een EERSTE', team: 'Team A' }, { nr: '3' }] }]);
  check('splits: de nummers uit de deelnemers, de namen apart', s.races[0].drivers.join() === '1,3'
    && s.coureurs['1'].naam === 'Een EERSTE' && s.coureurs['3'].naam === null);
  const map = mkdtempSync(join(tmpdir(), 'statistiek-'));
  cpSync(join(wortel, 'scripts'), join(map, 'scripts'), { recursive: true });
  mkdirSync(join(map, 'app'));
  cpSync(join(wortel, 'app', 'index.html'), join(map, 'app', 'index.html'));
  const bron = join(map, 'rijen.json');
  writeFileSync(bron, JSON.stringify(RIJEN.map((r) => ({ ...r, drivers: r.drivers.map((nr) => ({ nr, ...(COUREURS[nr] ?? {}) })) }))));
  const droog = spawnSync('node', [join(map, 'scripts', 'statistiek.mjs')], { env: { ...process.env, STATISTIEK_BRON: bron, DROOG: '1' }, encoding: 'utf8' });
  check('met DROOG alleen in de log', droog.status === 0 && !existsSync(join(map, BESTAND)) && droog.stdout.includes('2 races'),
    droog.stderr || droog.stdout);
  const echt = spawnSync('node', [join(map, 'scripts', 'statistiek.mjs')], { env: { ...process.env, STATISTIEK_BRON: bron, DROOG: '' }, encoding: 'utf8' });
  const geschreven = existsSync(join(map, BESTAND)) ? JSON.parse(readFileSync(join(map, BESTAND), 'utf8')) : null;
  check('zonder DROOG schrijft het site/data/statistiek-2026.json, met de namen',
    echt.status === 0 && geschreven?.races.length === 2 && geschreven.races[1].winnaar.naam === 'Drie DERDE', echt.stderr);
  rmSync(map, { recursive: true, force: true });
}

process.exit(afronden() ? 0 : 1);
