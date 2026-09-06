// Twee dingen die de sync klakkeloos van OpenF1 overnam.
//
// 1. "Ik weet niet hoe je aan Kuala Lumpur komt maar volgens mij is dat geen
//    race." Klopt: OpenF1 heeft in 2026 een testrecord tussen de races staan,
//    met de officiële naam "FORMULA 1 GULF AIR BAHRAIN GRAND PRIX IN MALAYSIA
//    2026" en een meeting_key (1308) buiten de hele reeks van het seizoen
//    (1279 t/m 1302). De kalender nam het gewoon over.
//
// 2. "Soms valt er wel eens een coureur uit. Dan komt er een reserve coureur
//    of ze gaan wisselen van team. Dat zag ik niet gebeuren." De sync haalde
//    de deelnemerslijst één keer op en bevroor hem daarna.
//
// De kalender hieronder is de echte van 2026, met de datums en meeting_keys
// zoals OpenF1 ze op 6 september 2026 teruggaf.

import { maakControle } from './hulp.mjs';
import { deelnemersUit, hoortNietInDeKalender, VERVERS_VENSTER_DAGEN }
  from '../scripts/uitslagen.mjs';

const { check, afronden } = maakControle('kalender en deelnemerslijst');

// ------------------------------------------------------------------
//  De echte kalender van 2026, zoals OpenF1 hem geeft
// ------------------------------------------------------------------
const ECHT = [
  ['2026-03-08', 1279, 'Melbourne'],        ['2026-03-15', 1280, 'Shanghai'],
  ['2026-03-29', 1281, 'Suzuka'],           ['2026-04-12', 1282, 'Sakhir'],
  ['2026-04-19', 1283, 'Jeddah'],           ['2026-05-03', 1284, 'Miami Gardens'],
  ['2026-05-24', 1285, 'Montréal'],         ['2026-06-07', 1286, 'Monte Carlo'],
  ['2026-06-14', 1287, 'Barcelona'],        ['2026-06-28', 1288, 'Spielberg'],
  ['2026-07-05', 1289, 'Silverstone'],      ['2026-07-19', 1290, 'Spa-Francorchamps'],
  ['2026-07-26', 1291, 'Budapest'],         ['2026-08-23', 1292, 'Zandvoort'],
  ['2026-09-06', 1293, 'Monza'],            ['2026-09-13', 1294, 'Madrid'],
  ['2026-09-26', 1295, 'Baku'],             ['2026-10-11', 1296, 'Marina Bay'],
  ['2026-10-25', 1297, 'Austin'],           ['2026-11-01', 1298, 'Mexico City'],
  ['2026-11-08', 1299, 'São Paulo'],        ['2026-11-22', 1300, 'Las Vegas'],
  ['2026-11-29', 1301, 'Lusail'],           ['2026-12-06', 1302, 'Yas Marina'],
].map(([date_start, meeting_key, location]) => ({ date_start, meeting_key, location }));

const KUALA = { date_start: '2026-10-04', meeting_key: 1308, location: 'Kuala Lumpur' };

const namen = (rijen) => rijen.map((r) => r.location).join(', ');

check('de echte kalender van 24 races is helemaal in orde',
  hoortNietInDeKalender(ECHT).length === 0, namen(hoortNietInDeKalender(ECHT)));

const metKuala = [...ECHT, KUALA];
const eruit = hoortNietInDeKalender(metKuala);
check('Kuala Lumpur wordt eruit gepikt en verder niemand',
  eruit.length === 1 && eruit[0].location === 'Kuala Lumpur', namen(eruit));

// Het scherpe punt: de buren van het verdwaalde record mogen niet mee. Baku
// en Marina Bay staan er direct naast en zijn wél echt.
check('Baku en Marina Bay blijven staan',
  !eruit.some((r) => ['Baku', 'Marina Bay'].includes(r.location)), namen(eruit));

// Een tweede testrecord erbij verandert daar niets aan.
const tweeFout = [...ECHT, KUALA,
  { date_start: '2026-05-10', meeting_key: 1350, location: 'Verweggistan' }];
const eruit2 = hoortNietInDeKalender(tweeFout);
check('twee verdwaalde records worden allebei gevonden',
  eruit2.length === 2
    && eruit2.some((r) => r.location === 'Kuala Lumpur')
    && eruit2.some((r) => r.location === 'Verweggistan'), namen(eruit2));

// Een kalender die van achteren naar voren genummerd is, is niet fout — dan
// is er geen enkele race die uit de toon valt, alleen een andere volgorde.
const omgekeerd = ECHT.map((r, i) => ({ ...r, meeting_key: 2000 - i }));
check('een kalender die aflopend genummerd is levert geen valse alarmen',
  hoortNietInDeKalender(omgekeerd).length === 0,
  namen(hoortNietInDeKalender(omgekeerd)));

check('een handjevol races is te weinig om iets over te zeggen',
  hoortNietInDeKalender(ECHT.slice(0, 3)).length === 0);
check('en een lege kalender ook', hoortNietInDeKalender([]).length === 0);

// ------------------------------------------------------------------
//  Deelnemerslijst: wanneer opnieuw ophalen?
// ------------------------------------------------------------------
const NU = new Date('2026-09-06T12:00:00Z').getTime();
const dagen = (n) => new Date(NU + n * 86400e3).toISOString();
const race = (extra) => ({
  quali_key: 11357, race_key: 11361, drivers: [{ nr: '1' }],
  deadline_quali: dagen(1), deadline_race: dagen(2),
  race_result: null, ...extra,
});

check('zonder deelnemerslijst wordt hij hoe dan ook opgehaald',
  deelnemersUit(race({ drivers: null, deadline_quali: dagen(200) }), NU) === 11357);
check('en een lege lijst telt als geen lijst',
  deelnemersUit(race({ drivers: [], deadline_quali: dagen(200) }), NU) === 11357);

check('een weekend dat er zo aankomt wordt ververst',
  deelnemersUit(race(), NU) === 11357);
check('een weekend dat net bezig is ook — de race moet nog komen',
  deelnemersUit(race({ deadline_quali: dagen(-1) }), NU) === 11357);
check(`een race over ${VERVERS_VENSTER_DAGEN + 30} dagen niet, die kost alleen verzoeken`,
  deelnemersUit(race({ deadline_quali: dagen(VERVERS_VENSTER_DAGEN + 30) }), NU) === null);

// Het punt van de hele wijziging: een gereden race wordt met rust gelaten.
// Op dat moment heeft sync.mjs hem al uit de rácesessie gehaald, en dat is
// de enige lijst die zegt wie er echt gereden heeft.
check('een gereden race wordt niet meer ververst',
  deelnemersUit(race({ race_result: ['1', '44'] }), NU) === null);
check('ook niet als de deelnemerslijst leeg is — er valt niets meer te kiezen',
  deelnemersUit(race({ race_result: ['1'], drivers: null }), NU) === null);

check('zonder session_key valt er niets op te halen',
  deelnemersUit(race({ quali_key: null, race_key: null, drivers: null }), NU) === null);
check('zonder kwalificatiesleutel pakt hij de racesessie',
  deelnemersUit(race({ quali_key: null, drivers: null }), NU) === 11361);

// Dezelfde valkuil als bij lijktAfgelast(): new Date(null) is 1 januari 1970,
// een keurig eindig getal dat ruim binnen elk venster valt.
check('een race zonder geplande tijd wordt niet elk uur opnieuw opgehaald',
  deelnemersUit(race({ deadline_quali: null, deadline_race: null }), NU) === null);
check('en een onleesbare datum ook niet',
  deelnemersUit(race({ deadline_quali: 'ergens in oktober', deadline_race: null }), NU) === null);

process.exit(afronden() ? 0 : 1);
