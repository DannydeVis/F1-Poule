// Slechtste weekenden wegstrepen.
//
// Uit de routekaart: "Bij 24 races tellen de beste 22. Vangt één vakantie en
// één ramprace op." Het punt erachter staat bovenaan diezelfde lijst — wat een
// vriendenpoule kapot maakt is niet een tekort aan vraagsoorten, maar dat
// iemand na acht races onbereikbaar achterstaat en afhaakt. Eén gemiste race
// kost vijftig tot honderd punten en die haal je niet meer in.
//
// Twee dingen die deze test vasthoudt en die makkelijk fout gaan:
//
// 1. De regel groeit mee. Zou je vanaf race één al twee weekenden wegstrepen,
//    dan telt er na drie races nog één mee en is de stand onzin.
// 2. Dezelfde invoer wijst altijd hetzelfde weekend aan. Zonder tweede
//    sorteersleutel wisselt de zin "weggestreept: Monza" bij elke keer
//    verversen van race, terwijl er niets veranderd is.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const bron = readFileSync(join(wortel, 'index.html'), 'utf8');
const knip = bron.match(/export function zonderSlechtste[\s\S]*?\n\}/);
if (!knip) {
  console.error('FOUT: zonderSlechtste() niet gevonden in index.html');
  process.exit(2);
}
const map = mkdtempSync(join(tmpdir(), 'poule-streep-'));
writeFileSync(join(map, 'streep.mjs'), knip[0]);
const { zonderSlechtste } = await import(join(map, 'streep.mjs'));

const { check, afronden } = maakControle('slechtste weekenden wegstrepen');

/** n weekenden met de punten die je meegeeft, aangevuld tot n met 50. */
const seizoen = (n, ...punten) => Array.from({ length: n }, (_, i) => ({
  naam: `race ${i + 1}`, punten: punten[i] ?? 50,
}));

// ------------------------------------------------------------------
//  De regel groeit mee met het seizoen
// ------------------------------------------------------------------
const drie = zonderSlechtste(seizoen(3, 50, 50, 0));
check('na drie races valt er niets weg', drie.weg.length === 0);
check('en telt het volle totaal', drie.totaal === 100 && drie.volledig === 100);

const elf = zonderSlechtste(seizoen(11, 0));
check('na elf races nog steeds niets', elf.weg.length === 0, String(elf.totaal));

const twaalf = zonderSlechtste(seizoen(12, 0));
check('vanaf twaalf races valt je slechtste weekend weg', twaalf.weg.length === 1);
check('en dat is de nul, niet een van de vijftigen',
  twaalf.weg[0].punten === 0, JSON.stringify(twaalf.weg));
check('het totaal blijft dus 11 × 50', twaalf.totaal === 550, String(twaalf.totaal));
check('terwijl het volle totaal daar gelijk aan is — de nul telde toch niet mee',
  twaalf.volledig === 550);

const drieentwintig = zonderSlechtste(seizoen(23, 0, 10));
check('bij drieëntwintig races nog steeds maar één', drieentwintig.weg.length === 1);

const vol = zonderSlechtste(seizoen(24, 0, 10));
check('bij een heel seizoen van 24 vallen er twee weg', vol.weg.length === 2,
  String(vol.weg.length));
check('en dat zijn de twee laagste', vol.weg.map(w => w.punten).join() === '0,10',
  JSON.stringify(vol.weg));
check('22 × 50 blijft over', vol.totaal === 1100, String(vol.totaal));
check('en telt dat er nog 22 meetellen', vol.telt === 22, String(vol.telt));

// Ook bij een langer seizoen blijven het er twee: het is een vangnet voor een
// gemiste race, geen glijdende schaal die de stand betekenisloos maakt.
const lang = zonderSlechtste(seizoen(36, 0, 0, 0));
check('bij 36 races blijft het bij twee', lang.weg.length === 2, String(lang.weg.length));

// ------------------------------------------------------------------
//  Dit is waar het voor bedoeld is
// ------------------------------------------------------------------
// Twaalf races, elf keer netjes meegedaan en één keer op vakantie geweest.
const vakantie = zonderSlechtste(seizoen(12, 0).map((w, i) =>
  ({ ...w, punten: i === 4 ? 0 : 60 })));
check('de gemiste race is precies het weekend dat wegvalt',
  vakantie.weg.length === 1 && vakantie.weg[0].naam === 'race 5',
  JSON.stringify(vakantie.weg));
check('en de gemiste race kost je daarna niets meer',
  vakantie.totaal === 660 && vakantie.volledig === 660,
  `${vakantie.totaal} van ${vakantie.volledig}`);
// Waar het om gaat: naast iemand die alle twaalf meedeed sta je nu gelijk op
// elf weekenden in plaats van honderd punten achter op twaalf.
check('terwijl wie alles meedeed er één van 60 inlevert',
  zonderSlechtste(seizoen(12, 60).map(w => ({ ...w, punten: 60 }))).totaal === 660);

// Iemand die élk weekend meedeed levert juist wél punten in. Dat hoort zo: het
// vangnet is voor iedereen gelijk, anders is het een beloning voor wegblijven.
const trouw = zonderSlechtste(seizoen(12, 40));
check('wie altijd meedeed raakt zijn slechtste weekend ook kwijt',
  trouw.weg.length === 1 && trouw.weg[0].punten === 40);
check('en levert dus 40 punten in', trouw.totaal === 550 && trouw.volledig === 590,
  `${trouw.totaal} van ${trouw.volledig}`);

// ------------------------------------------------------------------
//  Dezelfde invoer, dezelfde uitkomst
// ------------------------------------------------------------------
const gelijk = Array.from({ length: 12 }, (_, i) => ({ naam: `race ${12 - i}`, punten: 7 }));
const a = zonderSlechtste(gelijk);
const b = zonderSlechtste(gelijk);
check('bij twaalf gelijke weekenden wijst hij twee keer hetzelfde aan',
  a.weg[0].naam === b.weg[0].naam, `${a.weg[0].naam} en ${b.weg[0].naam}`);
check('en dat is er één, niet willekeurig meer', a.weg.length === 1);

// ------------------------------------------------------------------
//  Rommel erin mag de stand niet omgooien
// ------------------------------------------------------------------
check('een lege lijst geeft nul en geen fout',
  zonderSlechtste([]).totaal === 0 && zonderSlechtste([]).weg.length === 0);
check('en geen lijst ook',
  zonderSlechtste().totaal === 0 && zonderSlechtste(null).totaal === 0);

const rommel = zonderSlechtste([
  { naam: 'a', punten: 10 }, null, { naam: 'b', punten: 'veel' },
  { naam: 'c', punten: 20 }, undefined,
]);
check('rijen zonder bruikbaar getal tellen niet mee', rommel.volledig === 30,
  String(rommel.volledig));
check('en zonder twaalf geldige weekenden valt er niets weg', rommel.weg.length === 0);

// Negatieve punten bestaan nu niet, maar een toekomstige strafvraag zou ze
// kunnen opleveren. Dan moet de slechtste race nog steeds de slechtste zijn.
const straf = zonderSlechtste(seizoen(12, -20, 0));
check('een negatief weekend is het slechtste weekend',
  straf.weg[0].punten === -20, JSON.stringify(straf.weg[0]));
check('en wegstrepen maakt je totaal dan hoger, niet lager',
  straf.totaal === 500 && straf.volledig === 480, `${straf.totaal} van ${straf.volledig}`);

// ------------------------------------------------------------------
//  De knoppen staan waar ze horen
// ------------------------------------------------------------------
check('met perAantal 6 valt het eerste weekend al na zes races weg',
  zonderSlechtste(seizoen(6, 0), { perAantal: 6 }).weg.length === 1);
check('en met maxWeg 0 nooit iets',
  zonderSlechtste(seizoen(24, 0), { maxWeg: 0 }).weg.length === 0);

process.exit(afronden() ? 0 : 1);
