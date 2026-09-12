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

import { readFileSync, writeFileSync } from 'node:fs';
import { telSafetyCars, hadRodeVlag, snelsteRonde, snelstePitstop, lijktAfgelast,
         deelnemersUit, lijstDekt, hoortNietInDeKalender, rondeToewijzing, dubbeleRaces }
  from './uitslagen.mjs';
import { maakAgenda } from './agenda.mjs';

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

/**
 * OpenF1 laat een paar verzoeken per seconde toe en zegt "te snel" met een
 * 429. Belangrijk verschil met een 404: een 429 betekent dat de gegevens er
 * wél zijn en dat wij te ongeduldig waren. Dat moet uit elkaar te houden
 * zijn in de log, anders lijkt een drukke run op ontbrekende data.
 *
 * Zes pogingen met oplopende pauzes: bij een volledige inhaalslag over een
 * heel seizoen zijn het zes verzoeken per race, en `laps` is er daar één van
 * met ruim dertienhonderd rijen. Vier pogingen van maximaal acht seconden
 * bleken dan te kort — de verkenner miste zo twee races die OpenF1 gewoon had.
 */
async function openf1(pad, pogingen = 6) {
  for (let i = 0; i < pogingen; i++) {
    const res = await fetch(`${API}/${pad}`);
    if (res.ok) return res.json();
    if (res.status === 429 && i < pogingen - 1) {
      const pauze = 3000 * (i + 1);
      console.log(`  rate limit, ${pauze / 1000}s wachten`);
      await wacht(pauze);
      continue;
    }
    throw new Error(res.status === 429
      ? `OpenF1 hield ons tegen (429) op ${pad} — de gegevens zijn er wel`
      : `OpenF1 gaf ${res.status} op ${pad}`);
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

const verwijderRace = (id) => sb(`races?id=eq.${id}`, { method: 'DELETE' });

/** Hangt er ook maar één voorspelling aan deze race? */
const heeftAntwoorden = async (raceId) =>
  ((await sb(`answers?race_id=eq.${raceId}&select=race_id&limit=1`)) ?? []).length > 0;

// ------------------------------------------------------------
//  Kalender
// ------------------------------------------------------------

async function kalender() {
  console.log(`Kalender ${SEIZOEN} ophalen`);
  const races  = await openf1(`sessions?year=${SEIZOEN}&session_name=Race`);
  await wacht(700);
  const qualis = await openf1(`sessions?year=${SEIZOEN}&session_name=Qualifying`);
  const perMeeting = new Map(qualis.map((q) => [q.meeting_key, q]));

  // OpenF1 heeft in 2026 een testrecord tussen de races staan: Kuala Lumpur,
  // officieel "FORMULA 1 GULF AIR BAHRAIN GRAND PRIX IN MALAYSIA 2026", met
  // een meeting_key (1308) buiten de hele reeks van het seizoen. Zonder deze
  // controle staat dat gewoon in ieders poule, en laat de app mensen een
  // voorspelling doen voor een race die nooit gereden wordt.
  const nep = hoortNietInDeKalender(races);
  for (const r of nep) {
    console.log(`  overgeslagen: ${r.location} ${String(r.date_start).slice(0, 10)}`
      + ` — meeting ${r.meeting_key} valt buiten de reeks van dit seizoen`);
  }
  const echt = races.filter((r) => !nep.includes(r));

  const opDatum = echt.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));

  // Rondenummers zijn geen volgnummers maar de identiteit van een rij: de
  // upsert gaat op (season, round), en aan races.id hangen de voorspellingen.
  // Doorgeteld over de overgebleven races schuift alles ná een weggevallen
  // race een plaats op, en dan komt een voorspelling bij de verkeerde race te
  // staan. Een race die we al kennen houdt daarom zijn nummer.
  const bestaand = await haalRaces();
  const ronde = rondeToewijzing(opDatum, bestaand);
  for (const race of opDatum) {
    const key = String(race.session_key);
    const oud = bestaand.find((b) => String(b.race_key) === key);
    if (oud && oud.round !== ronde.get(key)) {
      console.log(`  let op: ${race.location} zou van ronde ${oud.round} naar`
        + ` ${ronde.get(key)} gaan; dat doen we niet`);
    }
  }

  const rijen = opDatum
    .map((race) => {
      const quali = perMeeting.get(race.meeting_key);
      return {
        season: SEIZOEN,
        round: ronde.get(String(race.session_key)),
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

  // Stond zo'n record er al in, dan blijft de rij staan. Doorstrepen is hier
  // het juiste, en niet verwijderen: er kunnen voorspellingen aan hangen, en
  // 'afgelast' vertelt in de app precies het goede verhaal — hij telt voor
  // niemand mee.
  if (nep.length) await streepDoor(nep);

  await ruimDubbelenOp();
}

/**
 * Twee rijen die naar dezelfde OpenF1-sessie wijzen. Dat is het spoor van de
 * verschuiving die hierboven nu voorkomen wordt: toen Kuala Lumpur uit de
 * kalender viel schoof alles erachter een plaats op en bleef de laatste ronde
 * als wees achter — een tweede Yas Marina.
 *
 * Verwijderen mag alleen als er niets aan hangt: answers.race_id heeft
 * `on delete cascade`, dus een rij weggooien gooit de voorspellingen mee weg.
 * Hangt er wel iets aan, dan strepen we hem door en zeggen het hardop; dan
 * kan een mens beslissen wat er met die voorspellingen moet gebeuren.
 */
async function ruimDubbelenOp() {
  const groepen = dubbeleRaces(await haalRaces());
  if (!groepen.length) return;
  for (const { houden, weg } of groepen) {
    for (const rij of weg) {
      if (await heeftAntwoorden(rij.id)) {
        console.log(`  LET OP: ronde ${rij.round} (${rij.name}) is dezelfde sessie als`
          + ` ronde ${houden.round}, maar er hangen voorspellingen aan. Doorgestreept`
          + ` in plaats van verwijderd — kijk hier zelf naar.`);
        await updateRace(rij.id, { afgelast: true });
        continue;
      }
      await verwijderRace(rij.id);
      console.log(`  ronde ${rij.round} verwijderd: dubbel met ronde ${houden.round}`
        + ` (${rij.name}, sessie ${rij.race_key})`);
    }
  }
}

async function streepDoor(nep) {
  const bestaand = await haalRaces();
  for (const r of nep) {
    const staat = bestaand.find((b) => b.race_key === r.session_key && !b.afgelast);
    if (!staat) continue;
    await updateRace(staat.id, { afgelast: true });
    console.log(`  ${staat.name} doorgestreept: die race bestaat niet`);
  }
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
  // Leeg is geen lijst. Nu we ook vrije trainingen als bron gebruiken kan het
  // gebeuren dat OpenF1 een sessie wel kent maar er nog geen coureurs bij
  // heeft. Zonder deze regel schrijft probeer() die lege lijst gewoon weg —
  // leeg() vindt [] namelijk niet leeg — en dan staat er niemand meer in de
  // kiezer waar eerst tweeëntwintig namen stonden.
  if (!uniek.size) return null;
  return [...uniek.values()].sort((a, b) => a.team.localeCompare(b.team));
}

// Leeg is null of undefined, en nadrukkelijk niet 0 of false: nul safety
// cars en "geen rode vlag" zijn echte uitslagen. Met een gewone !-controle
// zou de sync die elk uur opnieuw ophalen, en erger: hij zou een met
// de hand ingevulde nul niet als ingevuld zien.
const leeg = (w) => w === null || w === undefined;

/**
 * Eén ding ophalen en in de patch zetten. Elk stukje apart, want één ding
 * dat OpenF1 niet heeft mag de rest van dezelfde race niet tegenhouden.
 *
 * Dat ging eerder mis: de kwalificaties van Sakhir en Jeddah bestaan wel in
 * de kalender maar hebben bij OpenF1 geen enkele rij — 404 op alles. Omdat
 * alle drie de ophaalacties in één try stonden, sloeg de sync die twee races
 * daarna helemaal over, inclusief hun ráceuitslag. Twee weekenden lang geen
 * punten, en in de log stond alleen dat de kwalificatie ontbrak.
 */
async function probeer(patch, veld, ophalen, gemist) {
  try {
    const waarde = await ophalen();
    // null betekent "OpenF1 heeft het nog niet", en dat is iets anders dan
    // een uitslag die nul is. Niet wegschrijven, volgende keer opnieuw.
    if (!leeg(waarde)) patch[veld] = waarde;
    await wacht(700);
  } catch (e) {
    gemist.push(`${veld} (${e.message})`);
  }
}

/**
 * Alle sessies van het seizoen, gegroepeerd per weekend.
 *
 * Eén verzoek voor het hele seizoen, niet één per race: dat is honderdtwintig
 * rijen en het scheelt drieëntwintig verzoeken per sync-ronde.
 *
 * Waarom we dit nodig hebben staat bij weekendBron() in uitslagen.mjs: de
 * kwalificatie- en racesessie staan vol met de inschrijflijst van het seizoen
 * tot ze echt gereden worden, en de vrije trainingen weten het een dag eerder.
 *
 * Lukt het niet, dan geeft dit een lege map terug en valt deelnemersUit()
 * terug op wat het altijd al deed. Een sync zonder deelnemerslijst is erger
 * dan een sync met een oude.
 */
async function weekendSessies() {
  let alles;
  try {
    alles = await openf1(`sessions?year=${SEIZOEN}`);
    await wacht(700);
  } catch (e) {
    console.log(`  sessies van het seizoen niet op kunnen halen: ${e.message}`);
    return { perMeeting: new Map(), perSessieKey: new Map() };
  }

  const perMeeting = new Map();
  for (const s of alles ?? []) {
    if (!perMeeting.has(s.meeting_key)) perMeeting.set(s.meeting_key, []);
    perMeeting.get(s.meeting_key).push(s);
  }

  // De races-tabel kent alleen race_key en quali_key. Via die twee vinden we
  // terug bij welk weekend een rij hoort, zonder er een kolom voor nodig te
  // hebben.
  const perSessieKey = new Map();
  for (const [meeting, lijst] of perMeeting) {
    for (const s of lijst) perSessieKey.set(String(s.session_key), meeting);
  }
  return { perMeeting, perSessieKey };
}

/** De sessies van het weekend waar deze race bij hoort. */
function sessiesVanRace(race, weekenden) {
  if (!weekenden?.perSessieKey) return [];
  const meeting = weekenden.perSessieKey.get(String(race.race_key))
    ?? weekenden.perSessieKey.get(String(race.quali_key));
  return meeting === undefined ? [] : (weekenden.perMeeting.get(meeting) ?? []);
}

async function uitslagen(races) {
  // OpenF1 rekent data als live tot 30 min na afloop. We wachten 45 min,
  // dan is het historisch en vrij op te vragen.
  const grens = Date.now() - 45 * 60 * 1000;
  const rijp = (wanneer) => new Date(wanneer).getTime() < grens;
  let veranderd = 0;

  const weekenden = await weekendSessies();

  for (const race of races) {
    const patch = {};
    const gemist = [];

    // Deelnemerslijst zo vroeg mogelijk: die heb je nodig om te kunnen
    // invullen, dus vóór de kwalificatie, niet pas erna. En zolang het
    // weekend nog niet gereden is blijven we hem verversen — een coureur valt
    // uit, een reserve stapt in, iemand wisselt van team. Dat stond hier
    // eerder als `if (!race.drivers ...)`, en dan bevriest de lijst voorgoed
    // op wat er de allereerste keer in stond.
    const bron = deelnemersUit(race, Date.now(), sessiesVanRace(race, weekenden));
    if (bron) await probeer(patch, 'drivers', () => deelnemers(bron), gemist);
    if (!race.quali_result && race.quali_key && rijp(race.deadline_quali)) {
      await probeer(patch, 'quali_result', () => uitslag(race.quali_key), gemist);
    }
    // Of de race-uitslag er is, houden we apart bij: als OpenF1 hem niet
    // heeft is dat straks het bewijs dat de race is afgelast.
    let raceGevonden = !!race.race_result;
    let raceOntbreekt = false;
    if (!race.race_result && race.race_key && rijp(race.deadline_race)) {
      await probeer(patch, 'race_result', () => uitslag(race.race_key), gemist);
      raceGevonden = !!patch.race_result;
      // Precies nu, en maar één keer: de rácesessie is de enige lijst die
      // zegt wie er echt gereden heeft. Daarna laat deelnemersUit() hem met
      // rust. Dit is ook de lijst waarop de teamgenoot-duels gescoord worden,
      // dus een verouderde lijst scoort de duels op de verkeerde paren.
      if (raceGevonden) {
        // Maar niet blind. De racesessie stond het hele weekend nog op de
        // oude opgave van het seizoen; heeft OpenF1 hem op dit moment nog
        // niet bijgewerkt, dan zou hij de goede lijst uit de kwalificatie
        // overschrijven met de verkeerde. Wie finisht stond aan de start,
        // dus een lijst die de uitslag niet dekt is niet af — dan houden we
        // wat we hebben en proberen we het volgend uur opnieuw.
        await probeer(patch, 'drivers', async () => {
          const lijst = await deelnemers(race.race_key);
          if (lijstDekt(lijst, patch.race_result)) return lijst;
          console.log(`  ronde ${race.round} ${race.name}: de lijst van de racesessie`
            + ' dekt de uitslag niet, dus die nemen we niet over');
          return null;
        }, gemist);
      }
      // Alleen een 404 is bewijs. Een 429 betekent dat wij te snel vroegen.
      raceOntbreekt = !raceGevonden
        && gemist.some((g) => g.startsWith('race_result') && g.includes('404'));
    }

    // Een race die er een week na dato nog steeds niet is, is niet doorgegaan.
    // Zonder dit blijft hij eeuwig op "wacht op uitslag" staan, en dat is voor
    // iedereen in de poule niet te onderscheiden van een app die stuk is.
    if (!race.afgelast && raceOntbreekt
        && lijktAfgelast({ raceGevonden: false, deadline: race.deadline_race })) {
      patch.afgelast = true;
      console.log(`  ronde ${race.round} ${race.name}: afgelast, OpenF1 heeft hem niet`);
    }

    // De vier losse uitslagen komen allemaal uit de race zelf. Bij een
    // afgelaste race valt er niets op te halen, dus die slaan we over.
    if (race.race_key && rijp(race.deadline_race) && !race.afgelast && !raceOntbreekt) {
      if (leeg(race.fastest_lap)) {
        await probeer(patch, 'fastest_lap',
          async () => snelsteRonde(await openf1(`laps?session_key=${race.race_key}`)), gemist);
      }
      if (leeg(race.fastest_pitstop)) {
        await probeer(patch, 'fastest_pitstop',
          async () => snelstePitstop(await openf1(`pit?session_key=${race.race_key}`)), gemist);
      }
      // Safety cars en rode vlag komen uit dezelfde lijst berichten, dus die
      // halen we één keer op als er iets van de twee nog ontbreekt.
      if (leeg(race.safety_cars) || leeg(race.rode_vlag)) {
        try {
          const berichten = await openf1(`race_control?session_key=${race.race_key}`);
          await wacht(700);
          if (leeg(race.safety_cars)) patch.safety_cars = telSafetyCars(berichten);
          if (leeg(race.rode_vlag))   patch.rode_vlag   = hadRodeVlag(berichten);
        } catch (e) {
          gemist.push(`safety_cars/rode_vlag (${e.message})`);
        }
      }
    }

    if (gemist.length) {
      console.log(`  ronde ${race.round} ${race.name}: nog niets voor ${gemist.join(', ')}`);
    }
    if (Object.keys(patch).length === 0) continue;

    try {
      await updateRace(race.id, patch);
      console.log(`  ronde ${race.round} ${race.name}: ${Object.keys(patch).join(', ')}`);
      veranderd++;
    } catch (e) {
      console.log(`  ronde ${race.round} ${race.name}: wegschrijven mislukt (${e.message})`);
    }
  }

  console.log(veranderd ? `${veranderd} races bijgewerkt` : 'Niks nieuws');
}

// ------------------------------------------------------------
//  De vragenset op slot
//  BEDIENING.md §6: zodra er voor een poule een race gescoord is ligt zijn
//  vragenset vast, anders zijn de races onderling niet meer te vergelijken.
//  Dit hoort hier omdat dit het enige stuk is dat draait op het moment dat
//  een uitslag binnenkomt — de punten worden verder allemaal in de browser
//  geteld. Per poule en niet per seizoen: wie halverwege een nieuwe poule
//  begint hoort niet meteen op slot te zitten.
// ------------------------------------------------------------

async function vragensetOpSlot(races) {
  const gescoord = races.filter((r) => r.quali_result?.length || r.race_result?.length);
  if (!gescoord.length) return;

  const ids = gescoord.map((r) => r.id).join(',');
  const antwoorden = await sb(`answers?race_id=in.(${ids})&select=pool_id`);
  const poules = [...new Set((antwoorden ?? []).map((a) => a.pool_id))];
  if (!poules.length) return;

  // questions_locked=is.false houdt het bij de poules die het nog niet zijn,
  // zodat een dagelijkse run geen rijen aanraakt die al goed staan.
  const gewijzigd = await sb(
    `pools?id=in.(${poules.join(',')})&questions_locked=is.false&select=id`,
    { method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ questions_locked: true }) });

  if (gewijzigd?.length) {
    console.log(`Vragenset op slot voor ${gewijzigd.length} poule(s)`);
  }
}

// ------------------------------------------------------------
//  De deadlines als agenda-abonnement
//
//  Wie zich hierop abonneert krijgt de deadlines in zijn eigen agenda, met de
//  melding die hij daar al heeft staan. Geen mailleverancier, geen
//  pushdienst, geen lijst met wie je wanneer bereikt — dit bestand is voor
//  iedereen hetzelfde. Zie scripts/agenda.mjs.
//
//  Alleen wegschrijven als er echt iets veranderd is: deze sync draait elk
//  uur, en een bestand dat elke keer verschilt van zichzelf zou elk uur een
//  commit opleveren voor een kalender die een paar keer per jaar verschuift.
// ------------------------------------------------------------

const AGENDA_PAD = new URL('../kalender.ics', import.meta.url);
const APP_URL = process.env.APP_URL ?? 'https://dannydevis.github.io/F1-Poule/';

function schrijfAgenda(races) {
  const nieuw = maakAgenda(races, { url: APP_URL, naam: `F1 Poule ${SEIZOEN}` });
  let oud = '';
  try { oud = readFileSync(AGENDA_PAD, 'utf8'); } catch { /* bestaat nog niet */ }
  if (oud === nieuw) {
    console.log('Agenda ongewijzigd');
    return false;
  }
  writeFileSync(AGENDA_PAD, nieuw);
  console.log(`Agenda bijgewerkt (${races.length} races)`);
  return true;
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

  // Opnieuw ophalen: uitslagen() heeft er net uitslagen bij gezet, en die
  // bepalen welke poules op slot gaan.
  const nu = await haalRaces();
  await vragensetOpSlot(nu);
  schrijfAgenda(nu);
} catch (e) {
  console.error('Mislukt:', e.message);
  process.exit(1);
}
