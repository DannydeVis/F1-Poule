/**
 * Wat staat er nu echt in de races-tabel?
 *
 * Alleen lezen, geen geheime sleutel nodig. Nodig omdat een fout in de
 * kalender pas zichtbaar wordt als je de rijen naast elkaar ziet: dubbele
 * rondes, gaten, of twee rijen die naar dezelfde OpenF1-sessie wijzen.
 *
 *   node scripts/controle-kalender.mjs
 */

import { readFileSync } from 'node:fs';

const SEIZOEN = Number(process.env.SEIZOEN ?? 2026);
const bron = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SUPABASE_URL = bron.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const SUPABASE_ANON_KEY = bron.match(/const SUPABASE_ANON_KEY = '([^']+)'/)?.[1];

async function sb(pad) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase gaf ${res.status} op ${pad}`);
  return res.json();
}

const races = await sb(`races?season=eq.${SEIZOEN}&select=*&order=round`);
const antwoorden = await sb(`answers?select=race_id`);
const perRace = new Map();
for (const a of antwoorden) perRace.set(String(a.race_id), (perRace.get(String(a.race_id)) ?? 0) + 1);

console.log(`${races.length} rijen in races voor ${SEIZOEN}\n`);
console.log(`  ${'rnd'.padEnd(4)} ${'id'.padEnd(38)} ${'race_key'.padEnd(9)}`
  + ` ${'naam'.padEnd(20)} ${'deadline'.padEnd(11)} vlag  antw  uitslag`);
for (const r of races) {
  console.log(`  ${String(r.round).padEnd(4)} ${String(r.id).padEnd(38)}`
    + ` ${String(r.race_key ?? '-').padEnd(9)} ${String(r.name).padEnd(20)}`
    + ` ${String(r.deadline_race ?? '-').slice(0, 10).padEnd(11)}`
    + ` ${r.afgelast ? 'AFG ' : '    '}  ${String(perRace.get(String(r.id)) ?? 0).padEnd(4)}`
    + `  ${r.race_result ? 'race' : ''}${r.quali_result ? ' quali' : ''}`);
}

// De drie dingen die na een kalenderwijziging mis kunnen zijn.
const tel = (lijst) => lijst.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map());
const dubbel = (naam, m) => {
  const raak = [...m].filter(([, n]) => n > 1);
  console.log(raak.length ? `\n  DUBBEL op ${naam}: ${raak.map(([k, n]) => `${k} (${n}x)`).join(', ')}`
                          : `\n  geen dubbele ${naam}`);
};
dubbel('round', tel(races.map((r) => r.round)));
dubbel('race_key', tel(races.filter((r) => r.race_key).map((r) => r.race_key)));
dubbel('naam', tel(races.map((r) => r.name)));

const rondes = races.map((r) => r.round).sort((a, b) => a - b);
const gaten = rondes.filter((n, i) => i && n !== rondes[i - 1] + 1);
console.log(gaten.length ? `  GAT in de rondes vóór: ${gaten.join(', ')}` : '  de rondes lopen door zonder gat');
