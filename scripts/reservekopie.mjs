// Een reservekopie van de database, versleuteld, voor als er iets misgaat.
//
// Supabase op het gratis plan maakt geen reservekopie die je zelf kunt
// terughalen. Gaat er iets mis (een fout in een migratie, een AI die de
// verkeerde rij weghaalt, iemand die binnenkomt met een gestolen sleutel),
// dan is er zonder dit niets om naar terug te gaan.
//
// Twee kanten:
//
//   node scripts/reservekopie.mjs
//       Haalt elke tabel uit public op met de service-sleutel (SUPABASE_URL,
//       SUPABASE_KEY), pakt het in en versleutelt het met RESERVEKOPIE_WACHTWOORD.
//       Schrijft naar reservekopie/reservekopie-JJJJ-MM-DD.ptrk (of UIT).
//
//   node scripts/reservekopie.mjs open <bestand>
//       Ontsleutelt met RESERVEKOPIE_WACHTWOORD en schrijft er twee bestanden
//       naast: .json (alles, leesbaar) en .sql (om terug te zetten in de SQL
//       Editor van Supabase). Zie BEDIENING.md, "Reservekopie".
//
// Versleuteld omdat de repo openbaar is: een bijlage van een workflow kan
// iedereen met een GitHub-account downloaden. Zonder het wachtwoord is het
// bestand ruis. AES-256-GCM, de sleutel via scrypt uit het wachtwoord; GCM
// merkt het ook als er met het bestand geknoeid is.

import { scryptSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

// Elke tabel die schema.sql aanmaakt, in de volgorde waarin hij terug moet
// (eerst waar andere naar wijzen). test/reservekopie.test.mjs houdt deze
// lijst gelijk met schema.sql: een nieuwe tabel die hier ontbreekt, laat
// de test zakken.
export const TABELLEN = [
  'races', 'questions', 'pools', 'pool_teams', 'pool_members', 'pool_questions',
  'answers', 'jokers', 'pool_eigen_vragen', 'pool_eigen_antwoorden', 'pool_periodes',
  'push_abonnementen', 'tikken', 'site_beheerders', 'sync_runs', 'bezoeken', 'actief',
  'verboden_woorden', 'aanmaak_log',
];

const KOP = Buffer.from('PTRK1');
const PER_KEER = 1000;

const sleutelUit = (wachtwoord, zout) => scryptSync(wachtwoord, zout, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 64 << 20 });

export function versleutel(gegevens, wachtwoord) {
  const zout = randomBytes(16), iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', sleutelUit(wachtwoord, zout), iv);
  const geheim = Buffer.concat([c.update(gzipSync(Buffer.from(JSON.stringify(gegevens)))), c.final()]);
  return Buffer.concat([KOP, zout, iv, c.getAuthTag(), geheim]);
}

export function ontsleutel(bestand, wachtwoord) {
  if (!bestand.subarray(0, KOP.length).equals(KOP)) throw new Error('dit is geen reservekopie van Predict the Race');
  let p = KOP.length;
  const zout = bestand.subarray(p, p += 16), iv = bestand.subarray(p, p += 12), tag = bestand.subarray(p, p += 16);
  const d = createDecipheriv('aes-256-gcm', sleutelUit(wachtwoord, zout), iv);
  d.setAuthTag(tag);
  let open;
  try { open = Buffer.concat([d.update(bestand.subarray(p)), d.final()]); }
  catch { throw new Error('verkeerd wachtwoord, of het bestand is beschadigd'); }
  return JSON.parse(gunzipSync(open).toString());
}

// Eén tabel, in stukken van duizend: PostgREST geeft er nooit meer tegelijk.
export async function haalTabel(url, sleutel, tabel, f = fetch) {
  const rijen = [];
  for (let van = 0; ; van += PER_KEER) {
    const r = await f(`${url}/rest/v1/${tabel}?select=*`, { headers: {
      apikey: sleutel, Authorization: `Bearer ${sleutel}`,
      'Range-Unit': 'items', Range: `${van}-${van + PER_KEER - 1}`,
    } });
    if (!r.ok) throw new Error(`${tabel}: ${r.status} ${await r.text()}`);
    const stuk = await r.json();
    rijen.push(...stuk);
    if (stuk.length < PER_KEER) return rijen;
  }
}

// Met de anon-sleutel (of de publishable) laten de policies bijna niets
// zien, en dat zonder foutmelding: je krijgt een kopie met de kalender en
// verder niets. Daarom eerst naar de sleutel zelf kijken. Een JWT zegt zijn
// rol in het midden; de nieuwe sleutels zeggen het in hun voorvoegsel.
export function isServiceSleutel(sleutel) {
  if (sleutel.startsWith('sb_secret_')) return true;
  if (sleutel.startsWith('sb_publishable_')) return false;
  try { return JSON.parse(Buffer.from(sleutel.split('.')[1], 'base64url').toString()).role === 'service_role'; }
  catch { return false; }
}

export async function maakKopie(url, sleutel, f = fetch, nu = new Date()) {
  if (!isServiceSleutel(sleutel)) {
    throw new Error('SUPABASE_KEY is niet de service-sleutel (service_role): met de anon-sleutel zie je door de policies bijna niets');
  }
  const tabellen = {};
  for (const t of TABELLEN) tabellen[t] = await haalTabel(url, sleutel, t, f);
  // Zonder races is er iets mis met de sleutel of het adres, niet met de
  // database: de kalender staat er altijd in. Liever een rode run dan een
  // lege kopie die er als een goede uitziet.
  if (!tabellen.races.length) throw new Error('de tabel races is leeg: klopt SUPABASE_KEY (de service-sleutel)?');
  // En als de sleutel het wel zegt maar de policies toch dichtzitten: een
  // kopie met poules maar zonder één speler is geen goede kopie.
  if (tabellen.pools.length && !tabellen.pool_members.length) {
    throw new Error('wel poules maar geen spelers: de sleutel ziet niet alles');
  }
  return { gemaakt: nu.toISOString(), tabellen };
}

// SQL om terug te zetten. Aanvullen, niet overschrijven: wat er nog staat
// blijft staan, wat weg is komt terug. session_replication_role = replica
// zet de triggers uit (die zouden een antwoord na de deadline weigeren) en
// de verwijzingen naar auth.users, die niet in de kopie zitten.
export function terugzetSql(kopie) {
  const json = JSON.stringify(kopie.tabellen);
  let tag = 'reservekopie';
  while (json.includes(`$${tag}$`)) tag += 'x';
  const regels = [
    `-- Reservekopie van ${kopie.gemaakt}. Vult aan: bestaande rijen blijven staan.`,
    '-- Wil je een tabel helemaal terug naar dit moment, haal hem dan eerst leeg',
    '-- (delete from public.<tabel>;) en draai daarna dit bestand.',
    'begin;',
    'set local session_replication_role = replica;',
  ];
  for (const t of TABELLEN) {
    const rijen = kopie.tabellen[t] ?? [];
    if (!rijen.length) continue;
    regels.push(`insert into public.${t} select * from jsonb_populate_recordset(null::public.${t}, $${tag}$${JSON.stringify(rijen)}$${tag}$::jsonb) on conflict do nothing;`);
  }
  // races, sync_runs en tikken nummeren zelf door. Na het terugzetten moet de
  // teller voorbij het hoogste nummer staan, anders botst de volgende nieuwe rij.
  for (const t of ['races', 'sync_runs', 'tikken']) {
    regels.push(`select setval(pg_get_serial_sequence('public.${t}', 'id'), greatest((select max(id) from public.${t}), 1));`);
  }
  regels.push('commit;');
  for (const t of TABELLEN) regels.push(`select '${t}' as tabel, count(*) as rijen from public.${t}${t === TABELLEN.at(-1) ? ';' : ' union all'}`);
  return regels.join('\n') + '\n';
}

async function hoofd() {
  const wachtwoord = process.env.RESERVEKOPIE_WACHTWOORD;
  if (!wachtwoord) {
    console.error('RESERVEKOPIE_WACHTWOORD ontbreekt. Zet hem als secret in GitHub (Settings, Secrets and variables, Actions); zie BEDIENING.md, "Reservekopie".');
    process.exit(1);
  }
  if (wachtwoord.length < 16) {
    console.error('RESERVEKOPIE_WACHTWOORD is te kort: neem er een van minstens 16 tekens.');
    process.exit(1);
  }

  if (process.argv[2] === 'open') {
    const pad = process.argv[3];
    if (!pad) { console.error('gebruik: node scripts/reservekopie.mjs open <bestand>'); process.exit(1); }
    const kopie = ontsleutel(readFileSync(pad), wachtwoord);
    const basis = pad.replace(/\.ptrk$/, '');
    writeFileSync(`${basis}.json`, JSON.stringify(kopie, null, 1) + '\n');
    writeFileSync(`${basis}.sql`, terugzetSql(kopie));
    console.log(`Reservekopie van ${kopie.gemaakt}`);
    for (const t of TABELLEN) console.log(`  ${t.padEnd(22)} ${kopie.tabellen[t]?.length ?? 0}`);
    console.log(`Geschreven: ${basis}.json en ${basis}.sql`);
    return;
  }

  const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
  const sleutel = process.env.SUPABASE_KEY;
  if (!url || !sleutel) { console.error('SUPABASE_URL en SUPABASE_KEY zijn nodig.'); process.exit(1); }
  const kopie = await maakKopie(url, sleutel);
  const uit = process.env.UIT ?? `reservekopie/reservekopie-${kopie.gemaakt.slice(0, 10)}.ptrk`;
  mkdirSync(dirname(uit), { recursive: true });
  writeFileSync(uit, versleutel(kopie, wachtwoord));
  for (const t of TABELLEN) console.log(`${t.padEnd(22)} ${kopie.tabellen[t].length}`);
  console.log(`Versleuteld weggeschreven: ${uit}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  hoofd().catch((e) => { console.error(e.message); process.exit(1); });
}
