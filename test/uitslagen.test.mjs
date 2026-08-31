// De vier losse uitslagen uit de gegevens van OpenF1.
//
// De berichten hieronder zijn niet verzonnen: ze komen letterlijk uit
// race_control van het seizoen 2026, opgehaald met scripts/verkennen.mjs.
// Dat is het punt van deze test — het filter is gebouwd op wat er echt
// langskomt, en hier ligt vast dat het daar ook op blijft passen.
//
// Wat er misgaat als je op het losse woord "safety car" zoekt: Monte Carlo
// had achttien berichten met dat woord erin en één echte safety car. De rest
// waren stewards die een straf uitdeelden voor een "SAFETY CAR INFRINGEMENT".

import { telSafetyCars, hadRodeVlag, snelsteRonde, snelstePitstop }
  from '../scripts/uitslagen.mjs';
import { maakControle } from './hulp.mjs';

const { check, afronden } = maakControle('de vier losse uitslagen');

const bericht = (lap, category, message) => ({ lap_number: lap, category, message,
  flag: null, date: `2026-08-23T${String(10 + lap).padStart(2, '0')}:00:00+00:00` });

// --- safety cars ----------------------------------------------------------

// Zandvoort, precies zoals het binnenkwam: twee echte safety cars en twee
// virtuals, met een rode vlag ertussen.
const zandvoort = [
  bericht(1,  'Other',     'SAFETY CAR LIGHTS ON'),
  bericht(2,  'Other',     'RED FLAG - RACE SUSPENDED'),
  bericht(3,  'Other',     'SAFETY CAR LIGHTS ON'),
  bericht(55, 'SafetyCar', 'VSC DEPLOYED'),
  bericht(57, 'SafetyCar', 'VSC ENDING'),
  bericht(70, 'SafetyCar', 'VSC DEPLOYED'),
  bericht(70, 'SafetyCar', 'VSC ENDING'),
  bericht(72, 'Flag',      'CHEQUERED FLAG'),
];
check('Zandvoort: twee safety cars en twee virtuals is vier',
  telSafetyCars(zandvoort) === 4, String(telSafetyCars(zandvoort)));

// Alles wat het woord bevat maar geen safety car ís. Stuk voor stuk echte
// berichten uit 2026.
const geruis = [
  bericht(1, 'Other', 'LAPPED CARS MAY NOW OVERTAKE THE SAFETY CAR: 77'),
  bericht(2, 'Other', 'SAFETY CAR WILL USE START/FINISH STRAIGHT'),
  bericht(3, 'Other', 'INCIDENT INVOLVING CARS 77 (BOT) AND 18 (STR) NOTED - '
    + 'STARTING PROCEDURE INFRINGEMENT - OUT OF POSITION AT SAFETY CAR LINE'),
  bericht(4, 'Other', 'FIA STEWARDS: INCIDENT INVOLVING CAR 6 (HAD) UNDER '
    + 'INVESTIGATION - SAFETY CAR INFRINGEMENT'),
  bericht(5, 'Other', 'INCIDENT INVOLVING CAR 5 (BOR) NOTED - VSC INFRINGEMENT'),
  bericht(6, 'Other', 'INCIDENT INVOLVING CAR 23 (ALB) NOTED - CAR SAFETY LIGHTS (14:22:09)'),
];
check('stewards en rondende auto’s tellen niet mee',
  telSafetyCars(geruis) === 0, String(telSafetyCars(geruis)));

check('een race zonder safety car geeft nul en niet niks',
  telSafetyCars([bericht(1, 'Flag', 'GREEN'), bericht(50, 'Flag', 'CHEQUERED FLAG')]) === 0);
check('en een lege lijst ook', telSafetyCars([]) === 0);

// Twee zinnen over hetzelfde moment. Niet elke wedstrijdleiding gebruikt
// dezelfde woorden, en als ze allebei langskomen is het één safety car.
check('twee meldingen in dezelfde ronde zijn samen één safety car',
  telSafetyCars([
    bericht(12, 'Other',     'SAFETY CAR LIGHTS ON'),
    bericht(12, 'SafetyCar', 'SAFETY CAR DEPLOYED'),
  ]) === 1);

check('de derde zin voor een begin telt ook mee',
  telSafetyCars([bericht(9, 'SafetyCar', 'SAFETY CAR DEPLOYED')]) === 1);

// --- rode vlag ------------------------------------------------------------

check('een stilgelegde race is een rode vlag', hadRodeVlag(zandvoort));
check('een straf voor een rode-vlagovertreding is er geen',
  !hadRodeVlag([bericht(1, 'Other',
    'INCIDENT INVOLVING CAR 6 (HAD) NOTED - RED FLAG INFRINGEMENT')]));
check('een race zonder rode vlag geeft false en niet niks',
  hadRodeVlag([bericht(1, 'Flag', 'GREEN')]) === false);
check('de vlagkolom is de tweede weg erheen',
  hadRodeVlag([{ flag: 'RED', scope: 'Track', message: 'RED', lap_number: 4 }]));

// --- snelste ronde --------------------------------------------------------

const rondes = [
  { driver_number: 16, lap_number: 60, lap_duration: 74.23 },
  { driver_number: 1,  lap_number: 49, lap_duration: 74.321 },
  { driver_number: 81, lap_number: 59, lap_duration: 74.321 },
  { driver_number: 44, lap_number: 12, lap_duration: null },
];
check('de snelste ronde is de kortste tijd', snelsteRonde(rondes) === '16');
check('bij een gelijke tijd wint wie hem het eerst reed',
  snelsteRonde(rondes.slice(1)) === '1', String(snelsteRonde(rondes.slice(1))));
check('zonder rondetijden komt er niets uit', snelsteRonde([]) === null);
check('een lijst met alleen lege tijden ook niet',
  snelsteRonde([{ driver_number: 4, lap_number: 1, lap_duration: null }]) === null);
check('en een tijd van nul telt niet als snelste ronde',
  snelsteRonde([{ driver_number: 4, lap_number: 1, lap_duration: 0 },
                { driver_number: 7, lap_number: 2, lap_duration: 80 }]) === '7');

// --- snelste pitstop ------------------------------------------------------

const stops = [
  { driver_number: 43, lap_number: 8,  pit_duration: 12 },
  { driver_number: 41, lap_number: 5,  pit_duration: 12.3 },
  { driver_number: 27, lap_number: 19, pit_duration: 17 },
];
check('de snelste pitstop is de kortste tijd', snelstePitstop(stops) === '43');
check('ook hier wint bij gelijk de eerste',
  snelstePitstop([
    { driver_number: 5,  lap_number: 30, pit_duration: 12 },
    { driver_number: 63, lap_number: 14, pit_duration: 12 },
  ]) === '63');
check('zonder pitstops komt er niets uit', snelstePitstop([]) === null);

process.exit(afronden() ? 0 : 1);
