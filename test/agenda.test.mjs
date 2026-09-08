// De agenda met alle deadlines. Draait zonder browser, net als
// uitslagen.test.mjs: dit is een pure functie die tekst maakt.
//
// Wat hier vastligt is vooral het soort ding dat je pas maanden later merkt:
// een agenda die elke keer nét iets anders is, een item dat na een verzetting
// dubbel in je agenda staat, of een regel van 200 tekens die de helft van de
// agenda-apps laat afhaken.

import { maakControle } from './hulp.mjs';
import { maakAgenda, vouw, ontsnap, stempel } from '../scripts/agenda.mjs';

const { check, afronden } = maakControle('de agenda met de deadlines');

const RACES = [
  { round: 1, name: 'Melbourne', country: 'Australia', race_key: 1001,
    deadline_quali: '2026-03-14T05:00:00+00:00', deadline_race: '2026-03-15T05:00:00+00:00' },
  { round: 2, name: 'Shanghai', country: 'China', race_key: 1002,
    deadline_quali: '2026-03-21T07:00:00+00:00', deadline_race: '2026-03-22T07:00:00+00:00' },
];
const ics = maakAgenda(RACES, { url: 'https://voorbeeld.nl/poule/', naam: 'F1 Poule 2026' });
const regels = ics.split('\r\n');

// --- de vorm ---------------------------------------------------------------
check('het is een geldige agenda met begin en eind',
  regels[0] === 'BEGIN:VCALENDAR' && regels.includes('END:VCALENDAR'));
check('en gebruikt de regeleindes die de standaard voorschrijft',
  ics.includes('\r\n') && !/[^\r]\n/.test(ics));
check('twee momenten per raceweekend: de kwalificatie en de race',
  regels.filter((r) => r === 'BEGIN:VEVENT').length === 4);
check('elk item wordt netjes afgesloten',
  regels.filter((r) => r === 'BEGIN:VEVENT').length
    === regels.filter((r) => r === 'END:VEVENT').length);

// --- het detail dat een dubbele agenda voorkomt ----------------------------
// Zonder een vaste UID zet een agenda-app bij elke verversing een nieuw item
// naast het oude, in plaats van het te vervangen.
const uids = regels.filter((r) => r.startsWith('UID:'));
check('elk item heeft een eigen, vaste UID',
  uids.length === 4 && new Set(uids).size === 4, uids.join(' '));
check('en die hangt aan de sessie, niet aan het moment van maken',
  uids.includes('UID:quali-1001@f1-poule') && uids.includes('UID:race-1001@f1-poule'),
  uids.join(' '));

// --- het detail dat elk uur een commit voorkomt ----------------------------
// De sync draait elk uur. Zou het bestand elke keer van zichzelf verschillen
// — bijvoorbeeld door een DTSTAMP van "nu" — dan legde hij elk uur een
// wijziging vast die er niet is.
const nogmaals = maakAgenda(RACES, { url: 'https://voorbeeld.nl/poule/', naam: 'F1 Poule 2026' });
check('dezelfde races geven byte voor byte hetzelfde bestand', ics === nogmaals);

// --- geen regel te lang ----------------------------------------------------
const telang = regels.filter((r) => Buffer.from(r, 'utf8').length > 75);
check('geen enkele regel is langer dan de standaard toestaat',
  telang.length === 0, telang.slice(0, 2).join(' | '));
check('en een gevouwen regel gaat verder met een spatie',
  ics.includes('\r\n ') || regels.every((r) => Buffer.from(r, 'utf8').length <= 75));

// Een lange naam met accenten moet op een tekengrens breken, niet middenin
// een é — anders staat er onleesbare rommel in de agenda.
const lang = vouw('SUMMARY:' + 'é'.repeat(80));
check('vouwen knipt nooit een teken doormidden',
  !lang.split('\r\n').some((deel) => deel.includes('�'))
    && Buffer.from(lang.split('\r\n')[0], 'utf8').length <= 75,
  String(Buffer.from(lang.split('\r\n')[0], 'utf8').length));

// --- ontsnappen ------------------------------------------------------------
check('een komma in een circuitnaam breekt de agenda niet',
  ics.includes('LOCATION:Melbourne\\, Australia'),
  regels.find((r) => r.startsWith('LOCATION')) ?? '(geen)');
check('en een puntkomma en backslash ook niet',
  ontsnap('a;b') === 'a\\;b' && ontsnap('a\\b') === 'a\\\\b',
  `${ontsnap('a;b')} / ${ontsnap('a\\b')}`);
check('een regeleinde wordt een \\n en geen echte regel',
  ontsnap('een\ntwee') === 'een\\ntwee', ontsnap('een\ntwee'));

// --- tijden ----------------------------------------------------------------
check('een tijdstip wordt de UTC-vorm die de standaard wil',
  stempel('2026-03-14T05:00:00+00:00') === '20260314T050000Z',
  String(stempel('2026-03-14T05:00:00+00:00')));
check('en een tijdzone wordt netjes omgerekend',
  stempel('2026-03-14T06:00:00+01:00') === '20260314T050000Z',
  String(stempel('2026-03-14T06:00:00+01:00')));
check('een onzinnige datum levert niets op in plaats van een kapot item',
  stempel('geen datum') === null);
// null is níét ongeldig voor new Date(): dat is 1 januari 1970. Zonder deze
// controle zou een race waarvan de kwalificatietijd nog niet bekend is een
// item in ieders agenda zetten in 1970.
check('en een lege tijd ook niet — die is geen 1970',
  stempel(null) === null && stempel(undefined) === null && stempel('') === null,
  `${stempel(null)} / ${stempel('')}`);

// --- een afgelaste race ----------------------------------------------------
// Weglaten zou het item in de agenda van de abonnee laten staan alsof er niets
// aan de hand is; als afgezegd markeren haalt hem er juist uit.
const metAfgelast = maakAgenda(
  [{ ...RACES[0], afgelast: true }], { url: '' }).split('\r\n');
check('een afgelaste race staat er als afgezegd in, niet weggelaten',
  metAfgelast.filter((r) => r === 'STATUS:CANCELLED').length === 2
    && metAfgelast.includes('UID:quali-1001@f1-poule'));

// --- een race zonder deadline ----------------------------------------------
const half = maakAgenda([{ round: 3, name: 'Suzuka', race_key: 1003,
  deadline_quali: null, deadline_race: '2026-04-05T05:00:00+00:00' }], {}).split('\r\n');
check('een race zonder kwalificatietijd levert alleen het race-item op',
  half.filter((r) => r === 'BEGIN:VEVENT').length === 1
    && half.includes('UID:race-1003@f1-poule'));

// --- leeg is ook geldig ----------------------------------------------------
// Dit is wat er in de repo staat voordat de sync voor het eerst gedraaid heeft.
const leeg = maakAgenda([], {}).split('\r\n');
check('een lege agenda is nog steeds een geldige agenda',
  leeg[0] === 'BEGIN:VCALENDAR' && leeg.includes('END:VCALENDAR')
    && !leeg.includes('BEGIN:VEVENT'));

// --- de volgorde -----------------------------------------------------------
const eersteMelbourne = ics.indexOf('UID:quali-1001');
const eersteShanghai = ics.indexOf('UID:quali-1002');
check('de races staan op volgorde van ronde',
  eersteMelbourne > 0 && eersteShanghai > eersteMelbourne);

process.exit(afronden() ? 0 : 1);
