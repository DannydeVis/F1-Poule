/**
 * Synchroniseert de F1-kalender en de uitslagen van OpenF1 naar Supabase.
 * Draait in GitHub Actions, niet op je eigen computer.
 *
 * Geen npm install nodig: gebruikt alleen de ingebouwde fetch van Node 18+
 * en praat rechtstreeks met de PostgREST-API van Supabase.
 *
 * Verwachte omgevingsvariabelen (staan als repository secrets in GitHub):
 *   SUPABASE_URL   https://xxxx.supabase.co
 *   SUPABASE_KEY   de service_role key
 *   SEIZOEN        optioneel, standaard 2026
 *   KALENDER       'true' om de kalender opnieuw op te halen
 */

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SEIZOEN      = Number(process.env.SEIZOEN || 2026);
const FORCE_KALENDER = process.env.KALENDER === 'true';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL of SUPABASE_KEY ontbreekt. Zet ze als repository secret.');
  process.exit(1);
}

const API = 'https://api.openf1.org/v1';
const REST = `${SUPABASE_URL}/rest/v1`;
const kop = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------
//  OpenF1, met geduld voor de rate limit (3 per seconde)
// ------------------------------------------------------------

async function openf1(pad, pogingen = 4) {
  for (let i = 0; i < pogingen; i++) {
    const res = await fetch(`${API}/${pad}`);
    if (res.ok) return res.json();
    if (res.status === 429 && i < pogingen - 1) {
      const pauze = 2000 * (i + 1);
      console.log(`  rate limit, ${pauze / 1000}s wachten`);
      await wacht(pauze);
      continue;
    }
    throw new Error(`OpenF1 gaf ${res.status} op ${pad}`);
  }
}

// ------------------------------------------------------------
//  Supabase
// ------------------------------------------------------------

async function sb(pad, opties = {}) {
  const res = await fetch(`${REST}/${pad}`, { ...opties, headers: { ...kop, ...opties.headers } });
  if (!res.ok) throw new Error(`Supabase gaf ${res.status}: ${await res.text()}`);
  const tekst = await res.text();
  return tekst ? JSON.parse(tekst) : null;
}

const haalRaces = () => sb(`races?season=eq.${SEIZOEN}&order=round`);

const upsertRaces = (rijen) =>
  sb('races?on_conflict=season,round', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(rijen),
  });

const updateRace = (id, patch) =>
  sb(`races?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch) });

// ------------------------------------------------------------
//  Kalender
// ------------------------------------------------------------

async function kalender() {
  console.log(`Kalender ${SEIZOEN} ophalen`);
  const races  = await openf1(`sessions?year=${SEIZOEN}&session_name=Race`);
  await wacht(700);
  const qualis = await openf1(`sessions?year=${SEIZOEN}&session_name=Qualifying`);
  const perMeeting = new Map(qualis.map((q) => [q.meeting_key, q]));

  const rijen = races
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
    .map((race, i) => {
      const quali = perMeeting.get(race.meeting_key);
      return {
        season: SEIZOEN,
        round: i + 1,
        name: race.location ?? race.circuit_short_name,
        country: race.country_name,
        race_key: race.session_key,
        quali_key: quali?.session_key ?? null,
        deadline_quali: quali?.date_start ?? race.date_start,
        deadline_race: race.date_start,
      };
    });

  await upsertRaces(rijen);
  console.log(`  ${rijen.length} races weggeschreven`);
}

// ------------------------------------------------------------
//  Uitslagen
// ------------------------------------------------------------

/** Volledige uitslag als array van coureurnummers, op volgorde. */
async function uitslag(sessionKey) {
  const rijen = await openf1(`session_result?session_key=${sessionKey}`);
  return rijen
    .filter((r) => typeof r.position === 'number')
    .sort((a, b) => a.position - b.position)
    .map((r) => String(r.driver_number));
}

/** Deelnemerslijst met teamkleuren, zodat de frontend geen grid hardcodeert. */
async function deelnemers(sessionKey) {
  const rijen = await openf1(`drivers?session_key=${sessionKey}`);
  const uniek = new Map();
  for (const d of rijen) {
    uniek.set(String(d.driver_number), {
      nr: String(d.driver_number),
      code: d.name_acronym,
      naam: d.full_name,
      team: d.team_name,
      kleur: d.team_colour ? `#${d.team_colour}` : '#888888',
    });
  }
  return [...uniek.values()].sort((a, b) => a.team.localeCompare(b.team));
}

async function uitslagen(races) {
  // OpenF1 rekent data als live tot 30 min na afloop. We wachten 45 min,
  // dan is het historisch en vrij op te vragen.
  const grens = Date.now() - 45 * 60 * 1000;
  let veranderd = 0;

  for (const race of races) {
    const patch = {};
    try {
      // Deelnemerslijst zo vroeg mogelijk: die heb je nodig om te kunnen
      // invullen, dus vóór de kwalificatie, niet pas erna.
      if (!race.drivers && race.quali_key) {
        try {
          patch.drivers = await deelnemers(race.quali_key);
          await wacht(700);
        } catch {
          // startlijst nog niet gepubliceerd, volgende keer opnieuw
        }
      }

      if (!race.quali_result && race.quali_key &&
          new Date(race.deadline_quali).getTime() < grens) {
        patch.quali_result = await uitslag(race.quali_key);
        await wacht(700);
      }

      if (!race.race_result && race.race_key &&
          new Date(race.deadline_race).getTime() < grens) {
        patch.race_result = await uitslag(race.race_key);
        await wacht(700);
      }

      if (Object.keys(patch).length === 0) continue;

      await updateRace(race.id, patch);
      console.log(`  ronde ${race.round} ${race.name}: ${Object.keys(patch).join(', ')}`);
      veranderd++;
    } catch (e) {
      // Eén race zonder data mag de rest niet blokkeren.
      console.log(`  ronde ${race.round} ${race.name}: overgeslagen (${e.message})`);
    }
  }

  console.log(veranderd ? `${veranderd} races bijgewerkt` : 'Niks nieuws');
}

// ------------------------------------------------------------

try {
  let races = await haalRaces();

  // Kalender alleen ophalen als hij nog leeg is, of als je er expliciet
  // om vraagt. Zo overschrijft een dagelijkse run nooit per ongeluk iets.
  if (FORCE_KALENDER || !races?.length) {
    await kalender();
    races = await haalRaces();
  }

  console.log(`Uitslagen controleren voor ${races.length} races`);
  await uitslagen(races);
} catch (e) {
  console.error('Mislukt:', e.message);
  process.exit(1);
}
