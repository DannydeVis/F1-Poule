// Onderlinge duels: per raceweekend wie van twee spelers meer punten pakte,
// opgeteld over het seizoen.
//
// Het scherp punt zit in wat níét meetelt. Een weekend waarin geen van beiden
// iets heeft ingeleverd is geen gelijkspel maar een weekend dat er voor dit
// duel niet was; anders staat er na een winterstop 12-12 zonder dat er iets
// gebeurd is.
//
// duelStand() wordt uit index.html geknipt, zodat de test de echte code
// controleert en niet een kopie die uit de pas kan lopen.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const bron = readFileSync(join(wortel, 'index.html'), 'utf8');
const stuk = bron.match(/export function duelStand[\s\S]*?\n\}/);
if (!stuk) { console.error('FOUT: duelStand() niet gevonden in index.html'); process.exit(2); }

const map = mkdtempSync(join(tmpdir(), 'poule-duel-'));
writeFileSync(join(map, 'duel.mjs'), stuk[0]);
const { duelStand } = await import(join(map, 'duel.mjs'));

const { check, afronden } = maakControle('onderlinge duels');
const weekend = (ik, ander, meegedaan = true) => ({ ik, ander, meegedaan });
const toon = (d) => `${d.ik}-${d.ander} (${d.gelijk} gelijk, ${d.gespeeld} gespeeld)`;

let d = duelStand([weekend(50, 30), weekend(20, 40), weekend(35, 10)]);
check('wie het weekend wint krijgt het streepje',
  d.ik === 2 && d.ander === 1, toon(d));

d = duelStand([]);
check('zonder gereden weekenden staat het 0-0', d.ik === 0 && d.ander === 0 && d.gespeeld === 0, toon(d));

d = duelStand([weekend(25, 25), weekend(40, 10)]);
check('evenveel punten in een weekend is gelijkspel',
  d.ik === 1 && d.ander === 0 && d.gelijk === 1, toon(d));

d = duelStand([weekend(0, 0, false), weekend(0, 0, false)]);
check('weekenden waarin niemand meedeed tellen niet mee',
  d.gespeeld === 0 && d.gelijk === 0, toon(d));

d = duelStand([weekend(30, 0), weekend(0, 0, false)]);
check('een weekend waarin er één meedeed telt wel',
  d.ik === 1 && d.gespeeld === 1, toon(d));

d = duelStand([weekend(0, 22)]);
check('nul punten tegen punten is verlies, geen gelijkspel',
  d.ander === 1 && d.gelijk === 0, toon(d));

// Meegedaan maar allebei niets goed: dat is een echt gelijkspel, geen
// weekend dat overgeslagen mag worden.
d = duelStand([weekend(0, 0, true)]);
check('allebei meegedaan en allebei nul is wel gelijkspel',
  d.gelijk === 1 && d.gespeeld === 1, toon(d));

d = duelStand([weekend(10, 5), weekend(5, 10), weekend(7, 7), weekend(1, 1, false)]);
check('gespeeld telt winst, verlies en gelijkspel bij elkaar op',
  d.gespeeld === 3 && d.ik === 1 && d.ander === 1 && d.gelijk === 1, toon(d));

check('duelStand raakt de meegegeven regels niet aan', (() => {
  const regels = [weekend(9, 3)];
  duelStand(regels);
  return regels.length === 1 && regels[0].ik === 9;
})());

await Promise.resolve();
process.exit(afronden() ? 0 : 1);
