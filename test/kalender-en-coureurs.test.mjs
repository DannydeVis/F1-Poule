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
import { deelnemersUit, hoortNietInDeKalender, VERVERS_VENSTER_DAGEN,
         rondeToewijzing, dubbeleRaces } from '../scripts/uitslagen.mjs';

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
  deelnemersUit(race({ race_result: ['1'], drivers: [{ nr: '1' }] }), NU) === null);

// De reparatie van wat er in Monza misging. In de database stond Hadjar (#6,
// die dit seizoen bij OpenF1 niet voorkomt), Lawson bij het verkeerde team en
// Tsunoda (#22) helemaal niet — terwijl die de race uitreed. Dat is uit de
// gegevens zelf vast te stellen: wie finisht, stond aan de start.
const monza = {
  quali_key: 11357, race_key: 11361,
  deadline_quali: dagen(-60), deadline_race: dagen(-60),
  drivers: [{ nr: '1' }, { nr: '30' }, { nr: '6' }],
  race_result: ['1', '22', '30'],
};
check('een gescoorde race met een onbekende naam in de uitslag wordt hersteld',
  deelnemersUit(monza, NU) === 11361);
check('en dan uit de rácesessie, want die zegt wie er echt gereden heeft',
  deelnemersUit(monza, NU) !== monza.quali_key);
check('klopt de lijst wel met de uitslag, dan blijft hij met rust',
  deelnemersUit({ ...monza, drivers: [{ nr: '1' }, { nr: '22' }, { nr: '30' }] }, NU) === null);
check('nummers als getal en als tekst zijn dezelfde coureur',
  deelnemersUit({ ...monza, drivers: [{ nr: 1 }, { nr: 22 }, { nr: 30 }],
                  race_result: [1, 22, 30] }, NU) === null);
check('zonder racesleutel valt er niets te herstellen',
  deelnemersUit({ ...monza, race_key: null }, NU) === null);
check('een lege deelnemerslijst bij een gereden race telt ook als kapot',
  deelnemersUit({ ...monza, drivers: null }, NU) === 11361);

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


// ------------------------------------------------------------------
//  Rondenummers zijn identiteit, geen volgnummers
// ------------------------------------------------------------------
//
// Dit is de fout die pas zichtbaar werd toen er voor het eerst echt een race
// uit de kalender viel. De upsert gaat op (season, round), dus het
// rondenummer is in de praktijk de identiteit van een rij — en aan die rij
// hangen via races.id alle voorspellingen. Doorgeteld over de overgebleven
// races schoof alles ná Kuala Lumpur een plaats op: de rij die Kuala Lumpur
// was werd Marina Bay, en de laatste ronde bleef als wees achter. Had er
// iemand al voor Marina Bay voorspeld, dan stond die voorspelling daarna bij
// Austin.

const sessie = (session_key, date_start) => ({ session_key, date_start });
const KALENDER = [
  sessie(11377, '2026-09-26'), sessie(11388, '2026-10-11'),
  sessie(11396, '2026-10-25'), sessie(11404, '2026-11-01'),
];

check('een lege database nummert gewoon op datum door',
  [...rondeToewijzing(KALENDER, []).values()].join(',') === '1,2,3,4',
  [...rondeToewijzing(KALENDER, []).values()].join(','));

// De situatie zoals hij was: Kuala Lumpur (11731) stond op ronde 18, en
// alles erachter een plaats verder.
const DB = [
  { round: 17, race_key: 11377 }, { round: 18, race_key: 11731 },
  { round: 19, race_key: 11388 }, { round: 20, race_key: 11396 },
  { round: 21, race_key: 11404 },
];
const nieuw = rondeToewijzing(KALENDER, DB);
check('Marina Bay houdt ronde 19 en schuift niet naar 18',
  nieuw.get('11388') === 19, String(nieuw.get('11388')));
check('en de rest schuift dus ook niet op',
  nieuw.get('11377') === 17 && nieuw.get('11396') === 20 && nieuw.get('11404') === 21,
  [...nieuw].map(([k, v]) => `${k}=${v}`).join(' '));

// Een race die er echt bij komt krijgt het laagste vrije nummer, en pakt
// nooit een nummer af van een race die al bestaat.
const metNieuwe = rondeToewijzing([...KALENDER, sessie(11500, '2026-12-06')], DB);
check('een nieuwe race telt door boven het hoogste bestaande nummer',
  metNieuwe.get('11500') === 22, String(metNieuwe.get('11500')));
check('en pakt dus geen nummer af van een race die al bestaat',
  ![17, 18, 19, 20, 21].includes(metNieuwe.get('11500')));

// Nadrukkelijk niet het laagste vrije nummer. Een gat is de plek waar ooit
// een race stond die eruit gehaald is; daar een nieuwe in schuiven maakt van
// dat gat weer een verwarring — en een race in december zou zo ronde 1
// kunnen krijgen.
const metGat = rondeToewijzing([sessie(11500, '2026-12-06')],
  [{ round: 20, race_key: 11396 }, { round: 21, race_key: 11404 }]);
check('een gat in de nummering wordt niet opgevuld',
  metGat.get('11500') === 22, String(metGat.get('11500')));

// Een rij zonder race_key is niet terug te vinden, maar zijn ronde is wel bezet.
const zonderKey = rondeToewijzing([sessie(999, '2026-03-01')], [{ round: 4, race_key: null }]);
check('een rij zonder race_key houdt zijn ronde bezet',
  zonderKey.get('999') === 5, String(zonderKey.get('999')));

// ------------------------------------------------------------------
//  Dubbele rijen naar dezelfde sessie
// ------------------------------------------------------------------
const geen = dubbeleRaces([{ round: 1, race_key: 1 }, { round: 2, race_key: 2 }]);
check('een gezonde kalender heeft geen dubbelen', geen.length === 0);

// Precies wat er in de database stond: Yas Marina op ronde 24 én 25.
const dubbel = dubbeleRaces([
  { round: 23, race_key: 11428, name: 'Lusail' },
  { round: 24, race_key: 11436, name: 'Yas Marina' },
  { round: 25, race_key: 11436, name: 'Yas Marina' },
]);
check('twee rijen naar dezelfde sessie worden gevonden', dubbel.length === 1);
check('de laagste ronde wordt gehouden, want daar hangen de voorspellingen aan',
  dubbel[0]?.houden.round === 24 && dubbel[0]?.weg.length === 1
    && dubbel[0]?.weg[0].round === 25,
  JSON.stringify(dubbel));

// Een race zonder race_key is niet dubbel met een andere zonder race_key —
// null is geen sleutel.
check('rijen zonder race_key tellen niet als dubbel',
  dubbeleRaces([{ round: 1, race_key: null }, { round: 2, race_key: null }]).length === 0);

process.exit(afronden() ? 0 : 1);
