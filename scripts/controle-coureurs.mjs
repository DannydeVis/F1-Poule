/**
 * Klopt de deelnemerslijst nog?
 *
 * Aanleiding: "Soms valt er wel eens een coureur uit. Dan komt er een reserve
 * coureur of ze gaan wisselen van team. Dat zag ik niet gebeuren in Monza."
 *
 * Er is één regel in sync.mjs die dat verklaart:
 *
 *     if (!race.drivers && race.quali_key) { ... }
 *
 * De lijst wordt één keer opgehaald — bij de kwalificatie — en daarna nooit
 * meer aangeraakt. Wat er die ene keer in stond, staat er de rest van het
 * seizoen in. Verandert het veld daarna nog, dan ziet de app dat niet.
 *
 * Dit script legt per race naast elkaar wat er in de database staat en wat
 * OpenF1 er nu over zegt, voor de kwalificatie én de race. Alleen lezen:
 * geen enkele schrijfactie, en geen geheime sleutel nodig — de anon key
 * staat toch al open in index.html en OpenF1 is openbaar.
 *
 *   node scripts/controle-coureurs.mjs
 *   RACE=Monza node scripts/controle-coureurs.mjs
 */

import { readFileSync } from 'node:fs';
import { weekendBron } from './uitslagen.mjs';

const API = 'https://api.openf1.org/v1';
const SEIZOEN = Number(process.env.SEIZOEN ?? 2026);
const ALLEEN = process.env.RACE ?? '';

const bron = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SUPABASE_URL = bron.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const SUPABASE_ANON_KEY = bron.match(/const SUPABASE_ANON_KEY = '([^']+)'/)?.[1];
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('FOUT: Supabase-sleutel niet gevonden in index.html'); process.exit(2);
}

const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

async function sb(pad) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase gaf ${res.status} op ${pad}`);
  return res.json();
}

// Zelfde geduld als de sync: 429 betekent dat wij te snel vroegen, 404 dat
// OpenF1 het niet heeft. Die twee door elkaar halen maakt een drukke run
// niet te onderscheiden van ontbrekende gegevens.
async function openf1(pad, pogingen = 5) {
  for (let i = 0; i < pogingen; i++) {
    const res = await fetch(`${API}/${pad}`);
    if (res.ok) return res.json();
    if (res.status === 429 && i < pogingen - 1) { await wacht(3000 * (i + 1)); continue; }
    return { fout: String(res.status) };
  }
}

/** Coureurnummer -> team, zoals sync.mjs het ook zou opslaan. */
const perNummer = (rijen) => {
  const m = new Map();
  for (const d of rijen) {
    m.set(String(d.driver_number),
      { code: d.name_acronym, naam: d.full_name, team: d.team_name });
  }
  return m;
};

const uitDb = (drivers) => {
  const m = new Map();
  for (const d of drivers ?? []) m.set(String(d.nr), { code: d.code, naam: d.naam, team: d.team });
  return m;
};

/** Wat verschilt er tussen twee lijsten? Leeg = ze zijn gelijk. */
function verschil(a, b, watA, watB) {
  const regels = [];
  for (const nr of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(nr), y = b.get(nr);
    if (!x) regels.push(`#${nr} ${y.code} (${y.team}) staat alleen in ${watB}`);
    else if (!y) regels.push(`#${nr} ${x.code} (${x.team}) staat alleen in ${watA}`);
    else if (x.team !== y.team) regels.push(`#${nr} ${x.code}: ${watA} ${x.team} -> ${watB} ${y.team}`);
    else if (x.code !== y.code) regels.push(`#${nr}: ${watA} ${x.code} -> ${watB} ${y.code}`);
  }
  return regels;
}

// Eén verzoek voor alle sessies van het seizoen; daarmee is per race terug te
// vinden welke sessies bij zijn weekend horen.
const alleSessies = await openf1(`sessions?year=${SEIZOEN}`);
await wacht(900);
const perMeeting = new Map();
const meetingVan = new Map();
if (Array.isArray(alleSessies)) {
  for (const x of alleSessies) {
    if (!perMeeting.has(x.meeting_key)) perMeeting.set(x.meeting_key, []);
    perMeeting.get(x.meeting_key).push(x);
    meetingVan.set(String(x.session_key), x.meeting_key);
  }
  for (const lijst of perMeeting.values()) {
    lijst.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
  }
} else {
  console.log(`Let op: sessies van ${SEIZOEN} niet op kunnen halen (${alleSessies?.fout})\n`);
}

const sessiesVanWeekend = (r) => {
  const m = meetingVan.get(String(r.race_key)) ?? meetingVan.get(String(r.quali_key));
  return m === undefined ? [] : (perMeeting.get(m) ?? []);
};

const races = await sb(`races?season=eq.${SEIZOEN}&select=*&order=round`);
const kijken = races.filter((r) =>
  !ALLEEN || String(r.name).toLowerCase().includes(ALLEEN.toLowerCase()));

console.log(`${races.length} races in ${SEIZOEN}, ${kijken.length} bekeken\n`);

let scheef = 0;
for (const r of kijken) {
  const opgeslagen = uitDb(r.drivers);
  console.log(`=== ronde ${r.round} ${r.name} ===`);
  console.log(`  opgeslagen: ${opgeslagen.size} coureurs`
    + `${r.drivers ? '' : '  (leeg — nog nooit opgehaald)'}`);

  // Alle sessies van dit weekend, en welke de sync nu als bron zou pakken.
  // Precies dit ontbrak hier toen ik in Madrid tot de verkeerde conclusie
  // kwam: ik vergeleek alleen met de kwalificatie en de race, die allebei nog
  // niet gereden waren en dus allebei nog de oude opgave van het seizoen
  // bevatten. Ze kwamen keurig overeen met wat wij opgeslagen hadden, en dat
  // zag eruit als "er is niets mis". De vrije trainingen van diezelfde
  // vrijdag wisten het al wel.
  const weekend = sessiesVanWeekend(r);
  if (weekend.length) {
    const bron = weekendBron(weekend, Date.now());
    console.log(`  weekend: ${weekend.map((x) => `${x.session_name} ${x.session_key}`
      + `${new Date(x.date_start).getTime() <= Date.now() ? '' : ' (moet nog)'}`).join(', ')}`);
    console.log(`  de sync zou nu ${bron === null ? 'geen weekendsessie' : bron} gebruiken`);
  }

  const nakijken = [['kwalificatie', r.quali_key], ['race', r.race_key]];
  for (const sessie of weekend) {
    if (nakijken.some(([, k]) => String(k) === String(sessie.session_key))) continue;
    if (new Date(sessie.date_start).getTime() > Date.now()) continue;
    nakijken.unshift([sessie.session_name, sessie.session_key]);
  }

  for (const [wat, key] of nakijken) {
    if (!key) { console.log(`  ${wat}: geen session_key`); continue; }
    const rijen = await openf1(`drivers?session_key=${key}`);
    await wacht(900);
    if (!Array.isArray(rijen)) { console.log(`  ${wat} (${key}): OpenF1 gaf ${rijen.fout}`); continue; }
    const nu = perNummer(rijen);
    const anders = verschil(opgeslagen, nu, 'database', `openf1-${wat}`);
    console.log(`  ${wat} (${key}): ${nu.size} coureurs bij OpenF1`
      + `${anders.length ? '' : ' — gelijk aan wat opgeslagen staat'}`);
    for (const regel of anders) console.log(`      ${regel}`);
    if (anders.length && opgeslagen.size) scheef++;
  }

  // De uitslag is het enige harde bewijs van wie er echt gereden heeft.
  // Staat daar een nummer in dat wij niet kennen, dan hebben we iemand in
  // het scherm staan die er niet was — of andersom.
  if (r.race_result?.length) {
    const onbekend = r.race_result.filter((nr) => !opgeslagen.has(String(nr)));
    if (onbekend.length) {
      console.log(`      LET OP: ${onbekend.map((n) => '#' + n).join(', ')} staat in de`
        + ` race-uitslag maar niet in onze deelnemerslijst`);
    }
  }
  console.log('');
}

console.log(scheef
  ? `${scheef} keer wijkt de opgeslagen lijst af van wat OpenF1 nu zegt.`
  : 'Nergens een verschil tussen de opgeslagen lijst en OpenF1.');
