/**
 * Klopt de stand wel? Een controle tegen de echte database, met de echte
 * scoreregels — niet een kopie ervan.
 *
 * Aanleiding: "er worden al conclusies gemaakt zoals weekwinnaar en 1-0
 * terwijl ik voor sta. Klopt dit wel?" Een screenshot van de app bewijst
 * alleen dat de app laat zien wat hij zelf berekend heeft — niet dat die
 * berekening klopt met de echte uitslagen en de echte voorspellingen.
 *
 * Dit script knipt de rekenfuncties (scoreLijst, scoreTab, scoreWeekend,
 * standRijen, duels, weekendOverwinningen, ...) letterlijk uit index.html —
 * dezelfde manier waarop de tests dat al deden voor de losse functies — en
 * voedt ze met een verse kopie van de echte database. Geen tweede waarheid
 * die uit de pas kan lopen: het is de productiecode, alleen dan zonder
 * browser eromheen, met een print van elke tussenstap.
 *
 * Nodig op een GitHub-runner: Supabase is net als OpenF1 niet vanaf elke
 * plek bereikbaar, en de anon key staat toch al open in index.html.
 *
 *   POULE="Vrijdagmiddagpoule" IK="danny" node scripts/controle-stand.mjs
 */

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const POULE = process.env.POULE ?? 'Vrijdagmiddagpoule';
const IK = (process.env.IK ?? 'danny').toLowerCase();

const bron = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const regels = bron.split('\n');
// sed/awk-stijl 1-op-1 met de regelnummers hierboven: eind exclusief.
const knip = (van, tot) => regels.slice(van - 1, tot).join('\n');

// Vier stukken, in de volgorde waarin ze in index.html staan. Verderop
// worden ze aan elkaar geplakt; volgorde onderling doet er niet toe, want
// geen van deze consts roept een andere aan op het moment van declareren —
// pas als straks standRijen() enzovoort echt worden aangeroepen, staat alles
// er al.
const primitieven = knip(675, 769);   // scoreLijst, duelStand, scoreEerste,
                                       // scoreDuels, scoreGetal, scoreJaNee,
                                       // teamParen — puur, geen S nodig.
const vragenBlok  = knip(779, 889);   // COUREURVRAAG, EXTRAVRAAG, leegAntwoord,
                                       // coureurVragen, scoreTab, scoreWeekend.
const zelfdeEnPred = knip(997, 999);  // zelfde, vindPred.
const optelBlok    = knip(1129, 1390); // VRAAG_VELD, GEBOUWD, bouwPreds,
                                        // vraagActief, puntenVoor, standRijen,
                                        // weekendUitslag, weekendWinnaars,
                                        // heeftVoorspeld, duels,
                                        // weekendOverwinningen.

for (const [naam, stuk] of Object.entries(
  { primitieven, vragenBlok, zelfdeEnPred, optelBlok })) {
  if (!stuk.trim()) { console.error(`FOUT: ${naam} is leeg — regelnummers kloppen niet meer`); process.exit(2); }
}

const SUPABASE_URL = bron.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const SUPABASE_ANON_KEY = bron.match(/const SUPABASE_ANON_KEY = '([^']+)'/)?.[1];
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('FOUT: Supabase-sleutel niet gevonden in index.html'); process.exit(2);
}

async function sb(pad) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase gaf ${res.status} op ${pad}: ${await res.text()}`);
  return res.json();
}

console.log(`Poule "${POULE}" ophalen...`);
const pools = await sb(`pools?name=eq.${encodeURIComponent(POULE)}&select=*`);
if (!pools.length) { console.error(`Geen poule gevonden met de naam "${POULE}"`); process.exit(1); }
if (pools.length > 1) {
  console.log(`  let op: ${pools.length} poules heten zo, ik pak de eerste (${pools[0].id}).`);
}
const poule = pools[0];

const [leden, poulevragen, vragen, races, antwoorden] = await Promise.all([
  sb(`pool_members?pool_id=eq.${poule.id}&select=*`),
  sb(`pool_questions?pool_id=eq.${poule.id}&select=question_id`),
  sb(`questions?select=*`),
  sb(`races?season=eq.2026&select=*&order=round`),
  sb(`answers?pool_id=eq.${poule.id}&select=*`),
]);

const ikLid = leden.find((l) => (l.display_name ?? '').toLowerCase().includes(IK));
if (!ikLid) {
  console.error(`Geen speler gevonden met "${IK}" in de naam. Spelers in deze poule:`);
  for (const l of leden) console.error(`  - ${l.display_name}`);
  process.exit(1);
}

console.log(`Poule: ${poule.name} (${poule.id})`);
console.log(`Spelers: ${leden.map((l) => l.display_name).join(', ')}`);
console.log(`Jij: ${ikLid.display_name} (${ikLid.member_id})`);
console.log(`Vragen aan: ${poulevragen.length ? poulevragen.map((q) => q.question_id).join(', ') : 'alles (geen keuze gemaakt)'}`);
console.log(`Races: ${races.length}, waarvan gescoord: ${races.filter((r) => r.quali_result || r.race_result).length}`);

// De module die de echte code draait, met de echte data erin.
const map = mkdtempSync(join(tmpdir(), 'poule-controle-'));
const pad = join(map, 'rekenen.mjs');
writeFileSync(pad, `
const S = {
  leden: ${JSON.stringify(leden)},
  races: ${JSON.stringify(races)},
  antwoorden: ${JSON.stringify(antwoorden)},
  poulevragen: ${JSON.stringify(poulevragen.map((q) => q.question_id))},
  vragen: ${JSON.stringify(vragen)},
  ik: { id: ${JSON.stringify(ikLid.member_id)} },
  preds: [],
};

${primitieven}

${vragenBlok}

${zelfdeEnPred}

${optelBlok}

bouwPreds();

export function draai() {
  return {
    stand: standRijen(),
    weekendOverwinningen: weekendOverwinningen(),
    duels: duels(),
    perRace: S.races
      .filter((r) => r.quali_result || r.race_result)
      .map((r) => ({
        ronde: r.round, naam: r.name,
        spelers: S.leden.map((l) => ({
          naam: l.display_name,
          quali: scoreTab(vindPred(r.id, l.member_id), r, 'quali'),
          race: scoreTab(vindPred(r.id, l.member_id), r, 'race'),
          totaal: scoreWeekend(vindPred(r.id, l.member_id), r),
        })),
      })),
  };
}
`);

const { draai } = await import(pad);
const { stand, weekendOverwinningen, duels, perRace } = draai();

console.log('\n=== per race, opnieuw berekend uit de ruwe data ===');
for (const r of perRace) {
  console.log(`  ronde ${r.ronde} ${r.naam}: ${r.spelers.map((s) =>
    `${s.naam}=${s.totaal} (Q${s.quali}+R${s.race})`).join(', ')}`);
}

console.log('\n=== seizoensstand (herberekend) ===');
for (const [i, s] of stand.entries()) {
  console.log(`  ${i + 1}. ${s.naam}: ${s.punten} ptn${s.mij ? '  <- jij' : ''}`);
}

console.log('\n=== weekendoverwinningen (herberekend) ===');
if (!weekendOverwinningen.length) console.log('  niemand nog');
for (const w of weekendOverwinningen) {
  console.log(`  ${w.naam}: ${w.aantal}x${w.mij ? '  <- jij' : ''}`);
}

console.log('\n=== onderlinge duels (herberekend, jij tegen) ===');
if (!duels.length) console.log('  nog geen gespeeld weekend samen met iemand');
for (const d of duels) {
  console.log(`  tegen ${d.naam}: ${d.ik}-${d.ander} (${d.gelijk} gelijk, ${d.gespeeld} gespeeld)`);
}

console.log('\nDit is de productiecode (scoreLijst t/m weekendOverwinningen, letterlijk uit');
console.log('index.html geknipt), losgelaten op een verse kopie van de echte database.');
console.log('Komt dit overeen met wat de app op je scherm laat zien? Dan is de rekenkern');
console.log('bewezen consistent — vergelijk de rijtjes hierboven zelf met wat er echt');
console.log('gebeurd is in elke race om te zien of de conclusie ook inhoudelijk klopt.');
