// De rekenkern die scripts/controle-stand.mjs uit index.html knipt, moet
// blijven werken.
//
// Aanleiding: die controle knipte op regelnummers, en die schoven mee met
// elke bewerking erboven. Na een wijziging van 247 regels begon het geknipte
// blok midden in een functie en viel het hele script om op "Illegal return
// statement" — pas zichtbaar toen het op een GitHub-runner draaide, want
// hier is Supabase niet bereikbaar.
//
// Daarom staat de knip nu op merktekens in plaats van regelnummers, en test
// dit bestand hem hier: het knipt op dezelfde manier, plakt er een verzonnen
// database omheen, en rekent een uitkomst na die met de hand na te rekenen
// is. Zakt dit, dan is de audit stuk — nog voor iemand hem start.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { knipUit, rekenkern, BLOKKEN } from '../scripts/knipsel.mjs';

const { check, afronden } = maakControle('knipsel: de rekenkern uit index.html');
const bron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');

// ------------------------------------------------------------------
// 1. Alle vier de blokken zijn er, en ze bevatten wat ze horen te bevatten.
// ------------------------------------------------------------------
for (const naam of BLOKKEN) {
  let stuk = '';
  try { stuk = knipUit(bron, naam); } catch (e) { check(`blok "${naam}"`, false, e.message); continue; }
  check(`blok "${naam}" is te knippen`, stuk.trim().length > 0);
}

const moetErin = {
  primitieven: ['scoreLijst', 'duelStand', 'scoreEerste', 'scoreDuels', 'teamParen'],
  vragen: ['COUREURVRAAG', 'EXTRAVRAAG', 'coureurVragen', 'scoreTab', 'scoreWeekend'],
  zoeken: ['zelfde', 'vindPred', 'vindAntwoord'],
  optellen: ['bouwPreds', 'vraagActief', 'puntenVoor', 'standRijen',
             'weekendWinnaars', 'heeftVoorspeld', 'duels', 'weekendOverwinningen'],
};
for (const [naam, namen] of Object.entries(moetErin)) {
  const stuk = knipUit(bron, naam);
  const mist = namen.filter((n) => !stuk.includes(n));
  check(`blok "${naam}" bevat ${namen.length} verwachte namen`, mist.length === 0,
    mist.length ? `mist ${mist.join(', ')}` : '');
}

// Een merkteken dat niet bestaat hoort een duidelijke fout te geven en niet
// stilletjes een leeg blok. Dat verschil was precies wat de vorige keer miste.
let gemeld = '';
try { knipUit(bron, 'bestaatniet'); } catch (e) { gemeld = e.message; }
check('een onbekend merkteken geeft een leesbare fout',
  gemeld.includes('bestaatniet') && gemeld.includes('ontbreekt'), gemeld);

// ------------------------------------------------------------------
// 2. De vier blokken samen zijn een module die draait.
// ------------------------------------------------------------------
const DRIVERS = [
  { nr:'1',  code:'VER', naam:'Max Verstappen',  team:'Red Bull', kleur:'#3671C6' },
  { nr:'6',  code:'HAD', naam:'Isack Hadjar',    team:'Red Bull', kleur:'#3671C6' },
  { nr:'16', code:'LEC', naam:'Charles Leclerc', team:'Ferrari',  kleur:'#E8002D' },
  { nr:'44', code:'HAM', naam:'Lewis Hamilton',  team:'Ferrari',  kleur:'#E8002D' },
];
const vragen = [
  { id:'quali_top10', naam:'Top 10 kwalificatie', punten:50, sessie:'quali', soort:'top10',   gok:false, volgorde:10 },
  { id:'race_top10',  naam:'Top 10 race',         punten:50, sessie:'race',  soort:'top10',   gok:false, volgorde:20 },
  { id:'winnaar',     naam:'Winnaar',             punten:25, sessie:'race',  soort:'coureur', gok:false, volgorde:30 },
];
const races = [{
  id: 1, season: 2026, round: 1, name: 'Melbourne', drivers: DRIVERS,
  deadline_quali: '2026-01-01T00:00:00Z', deadline_race: '2026-01-02T00:00:00Z',
  quali_result: null, race_result: ['1', '44', '16', '6'],
}];
const leden = [
  { member_id: 'a', display_name: 'Ik' },
  { member_id: 'b', display_name: 'Jij' },
];
// Ik heb de winnaar goed (25 punten). Jij niet (0). Verder niets ingevuld,
// dus dat is de hele stand — met de hand na te rekenen.
const antwoorden = [
  { pool_id:'p', race_id:1, member_id:'a', question_id:'winnaar', waarde:'1' },
  { pool_id:'p', race_id:1, member_id:'b', question_id:'winnaar', waarde:'44' },
];

const map = mkdtempSync(join(tmpdir(), 'poule-knipsel-'));
const pad = join(map, 'rekenen.mjs');
writeFileSync(pad, `${rekenkern(bron, {
  leden, races, antwoorden, vragen, poule: {}, jokers: [],
  poulevragen: ['winnaar'],
  ik: { id: 'a' },
})}
export const uit = {
  stand: standRijen(),
  winnaars: weekendWinnaars(S.races[0]).map(w => w.naam),
  duels: duels(),
  mijnScore: scoreWeekend(vindPred(1, 'a'), S.races[0]),
  jouwScore: scoreWeekend(vindPred(1, 'b'), S.races[0]),
};
`);

let uit;
try { ({ uit } = await import(pad)); }
catch (e) { check('de geknipte rekenkern draait als module', false, String(e).split('\n')[0]); }
check('de geknipte rekenkern draait als module', !!uit);

if (uit) {
  check('wie de winnaar goed had krijgt de 25 punten van die vraag',
    uit.mijnScore === 25, String(uit.mijnScore));
  check('wie hem fout had krijgt er nul', uit.jouwScore === 0, String(uit.jouwScore));
  check('de stand zet mij bovenaan met 25',
    uit.stand[0]?.naam === 'Ik' && uit.stand[0]?.punten === 25,
    JSON.stringify(uit.stand));
  check('en het weekend is van mij', uit.winnaars.join(',') === 'Ik', uit.winnaars.join(','));
  check('het onderlinge duel staat 1-0 voor mij',
    uit.duels[0]?.ik === 1 && uit.duels[0]?.ander === 0,
    JSON.stringify(uit.duels));
}

// ------------------------------------------------------------------
// 3. De jokers moeten erin, anders is het een andere stand.
// ------------------------------------------------------------------
// Zonder de poule staan de jokers uit en telt elk weekend enkel. Dat rekende
// scripts/controle-stand.mjs een tijd lang: een stand die er geloofwaardig
// uitzag en niet die van de app was.
let zonder = '';
try { rekenkern(bron, { leden, races, antwoorden, vragen, poulevragen: [], ik: { id: 'a' } }); }
catch (e) { zonder = e.message; }
check('zonder poule en jokers weigert de rekenkern, in plaats van stil een andere stand te geven',
  zonder.includes('poule') && zonder.includes('jokers'), zonder || 'geen fout');

// ------------------------------------------------------------------
// 4. Een heel seizoen, met jokers: de seizoensvragen tellen één keer.
// ------------------------------------------------------------------
// Danny: "Dubbel check even dat die eindvragen niet verdubbeld worden als
// iemand de joker heeft ingezet bij de laatste race."
//
// Twee spelers vullen precies hetzelfde in: twee keer de goede winnaar (25)
// en de goede wereldkampioen (50). Alleen 'a' heeft jokers, op de eerste race
// en op de laatste. De eerste omdat de seizoensantwoorden daaraan hangen (dat
// is hun deadline), de laatste omdat daar het seizoen eindigt en de
// seizoensvragen gescoord worden. Allebei zijn plekken waar een joker per
// ongeluk de seizoenslaag zou kunnen raken.
//
//   a: 25×2 + 25×2 + 50 = 150     b: 25 + 25 + 50 = 100
//
// Een verdubbelde seizoenslaag zou 'a' op 200 zetten.
{
  const seizoenRaces = [
    { id: 11, season: 2026, round: 1, name: 'Melbourne', drivers: DRIVERS,
      deadline_quali: '2026-03-07T05:00:00Z', deadline_race: '2026-03-08T04:00:00Z',
      quali_result: null, race_result: ['1', '44', '16', '6'] },
    { id: 12, season: 2026, round: 2, name: 'Abu Dhabi', drivers: DRIVERS,
      deadline_quali: '2026-12-05T14:00:00Z', deadline_race: '2026-12-06T13:00:00Z',
      quali_result: null, race_result: ['1', '16', '44', '6'] },
  ];
  const seizoenVragen = [...vragen,
    { id: 'kampioen', naam: 'Wereldkampioen', punten: 50, sessie: 'seizoen', soort: 'coureur', gok: false, volgorde: 210 }];
  const seizoenAntwoorden = ['a', 'b'].flatMap((m) => [
    { pool_id: 'p', race_id: 11, member_id: m, question_id: 'winnaar', waarde: '1' },
    { pool_id: 'p', race_id: 12, member_id: m, question_id: 'winnaar', waarde: '1' },
    { pool_id: 'p', race_id: 11, member_id: m, question_id: 'kampioen', waarde: '1' },
  ]);
  const pad2 = join(map, 'seizoen.mjs');
  writeFileSync(pad2, `${rekenkern(bron, {
    leden, races: seizoenRaces, antwoorden: seizoenAntwoorden, vragen: seizoenVragen,
    poule: { jokers_vanaf: '2026-01-01T00:00:00Z' },
    jokers: [{ pool_id: 'p', race_id: 11, member_id: 'a' }, { pool_id: 'p', race_id: 12, member_id: 'a' }],
    poulevragen: ['winnaar', 'kampioen'],
    ik: { id: 'a' },
  })}
export const draai = () => ({
  eerste: scoreWeekend(vindPred(11, 'a'), S.races[0]),
  laatste: scoreWeekend(vindPred(12, 'a'), S.races[1]),
  seizoenA: scoreSeizoen('a'),
  seizoenB: scoreSeizoen('b'),
  stand: Object.fromEntries(standRijen().map((r) => [r.id, r.punten])),
});
`);
  let s4;
  try { s4 = (await import(pad2)).draai(); }
  catch (e) { check('een afgelopen seizoen rekent door, seizoensvragen en al', false, String(e).split('\n')[0]); }
  if (s4) {
    check('een afgelopen seizoen rekent door, seizoensvragen en al', true);
    check('de joker verdubbelt het eerste weekend', s4.eerste === 50, String(s4.eerste));
    check('en het laatste', s4.laatste === 50, String(s4.laatste));
    check('de seizoensvragen leveren met en zonder joker hetzelfde op: 50',
      s4.seizoenA === 50 && s4.seizoenB === 50, `${s4.seizoenA} en ${s4.seizoenB}`);
    check('in de stand tellen ze één keer mee, niet dubbel: 150 en 100',
      s4.stand.a === 150 && s4.stand.b === 100, JSON.stringify(s4.stand));
  }
}

process.exit(afronden() ? 0 : 1);
