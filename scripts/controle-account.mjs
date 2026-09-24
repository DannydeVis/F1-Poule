/**
 * Hoort dit account ergens bij, of is het een spookaccount?
 *
 * Aanleiding: "Ik heb het net geprobeerd en werkt niet." De oorzaak bleek een
 * los account dat per ongeluk ontstond bij een eerdere, mislukte inlogpoging
 * met Google — leeg, zonder speler, maar wel met het Google-adres eraan
 * gehangen. Daardoor kon dat adres niet meer aan het échte, poule-spelende
 * account gekoppeld worden.
 *
 * Voor je zo'n account verwijdert in het Supabase-dashboard moet zeker staan
 * dat er niets aan hangt. pool_members.user_id verwijst met `on delete
 * cascade` naar auth.users: een account verwijderen dat wél een speler heeft
 * neemt die speler — en al zijn voorspellingen — in één klap mee. Dat is
 * onomkeerbaar.
 *
 * Dit script leest alleen. Geen geheime sleutel nodig: de anon key staat toch
 * al open in index.html, en pool_members mag door iedereen gelezen worden
 * (dezelfde reden als "Wie ben jij?"-scherm dat nodig heeft).
 *
 *   UID=fd73b377-03ac-42f1-bc1d-4c3f63e074f6 node scripts/controle-account.mjs
 */

import { readFileSync } from 'node:fs';

const UID = process.env.UID;
if (!UID) {
  console.error('FOUT: geef UID=<account-id> mee, uit Authentication → Users');
  process.exit(2);
}

const bron = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
const SUPABASE_URL = bron.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const SUPABASE_ANON_KEY = bron.match(/const SUPABASE_ANON_KEY = '([^']+)'/)?.[1];
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('FOUT: Supabase-sleutel niet gevonden in index.html'); process.exit(2);
}

async function sb(pad) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pad}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase gaf ${res.status} op ${pad}`);
  return res.json();
}

console.log(`Account ${UID}\n`);

const spelers = await sb(`pool_members?user_id=eq.${UID}&select=*`);

if (!spelers.length) {
  console.log('Geen enkele speler in geen enkele poule hangt aan dit account.');
  console.log('Veilig om te verwijderen: er is niets aan hem vast te maken.');
  process.exit(0);
}

console.log(`LET OP: dit account is ${spelers.length === 1 ? 'de eigenaar' : 'eigenaar'}`
  + ` van ${spelers.length} ${spelers.length === 1 ? 'speler' : 'spelers'}:\n`);

for (const s of spelers) {
  const antwoorden = await sb(`answers?member_id=eq.${s.member_id}&select=race_id`);
  const poule = await sb(`pools?id=eq.${s.pool_id}&select=name`);
  console.log(`  ${s.display_name} in "${poule[0]?.name ?? s.pool_id}"`
    + ` — ${antwoorden.length} ingevulde voorspellingen`);
}

console.log('\nNIET verwijderen zonder dit eerst op te lossen: het account');
console.log('verwijderen neemt bovenstaande speler(s) en hun voorspellingen mee');
console.log('(on delete cascade). Maak de speler eerst los via "losmaken" op');
console.log('het Poule-scherm, of accepteer bewust dat die geschiedenis weg is.');
