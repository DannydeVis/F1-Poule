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
const bron = readFileSync(join(wortel, 'index.html'), 'utf8');

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
  zoeken: ['zelfde', 'vindPred'],
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
  leden, races, antwoorden, vragen,
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

process.exit(afronden() ? 0 : 1);
