// Minimale nabootsing van supabase-js, genoeg voor de aanroepen in
// index.html. De answers-tabel heeft net als Postgres een unieke sleutel
// op (pool_id, race_id, member_id, question_id), zodat upsert zich hier net
// zo gedraagt als in de echte database.

const uur = (h) => new Date(Date.now() + h * 3600e3).toISOString();

const DRIVERS = [
  { nr:'1',  code:'VER', naam:'Max Verstappen',  team:'Red Bull', kleur:'#3671C6' },
  { nr:'12', code:'ANT', naam:'Kimi Antonelli',  team:'Mercedes', kleur:'#27F4D2' },
  { nr:'63', code:'RUS', naam:'George Russell',  team:'Mercedes', kleur:'#27F4D2' },
  { nr:'16', code:'LEC', naam:'Charles Leclerc', team:'Ferrari',  kleur:'#E8002D' },
  { nr:'44', code:'HAM', naam:'Lewis Hamilton',  team:'Ferrari',  kleur:'#E8002D' },
  { nr:'4',  code:'NOR', naam:'Lando Norris',    team:'McLaren',  kleur:'#FF8000' },
  { nr:'81', code:'PIA', naam:'Oscar Piastri',   team:'McLaren',  kleur:'#FF8000' },
  { nr:'10', code:'GAS', naam:'Pierre Gasly',    team:'Alpine',   kleur:'#0093CC' },
  { nr:'14', code:'ALO', naam:'Fernando Alonso', team:'Aston',    kleur:'#229971' },
  { nr:'18', code:'STR', naam:'Lance Stroll',    team:'Aston',    kleur:'#229971' },
  { nr:'6',  code:'HAD', naam:'Isack Hadjar',    team:'Red Bull', kleur:'#3671C6' },
  { nr:'43', code:'COL', naam:'Franco Colapinto',team:'Alpine',   kleur:'#0093CC' },
];

const beginstand = {
  pools: [{ id:'pool-1', name:'Vrijdagmiddagpoule', join_code:'RTM026', season:2026 }],
  // user_id null: deze speler bestond al voordat er accounts waren. Precies
  // de situatie die de app moet kunnen claimen.
  pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:null }],
  // De nabootsing van auth.users. Staat in de "database", niet in de sessie:
  // een account overleeft het wissen van localStorage, net als in het echt.
  auth_users: [],
  // Verstuurde inloglinks die nog niet aangeklikt zijn. In het echt zit dit in
  // een mailbox; hier is het een rij met de sleutel die in de adresbalk komt.
  otp: [],
  races: [
    // race_id is bewust een getal: zo controleren we ook dat 3 en '3'
    // niet uit elkaar lopen bij het terugzoeken van een voorspelling.
    { id:1, season:2026, round:1, name:'Melbourne', drivers:DRIVERS,
      deadline_quali:uur(24), deadline_race:uur(48), quali_result:null, race_result:null,
      deadline_sprint:null, sprint_result:null, sprint_key:null,
      fastest_lap:null, fastest_pitstop:null, safety_cars:null, rode_vlag:null },
    { id:2, season:2026, round:2, name:'Shanghai', drivers:DRIVERS,
      // kwalificatie dicht, race nog open: hier moet bewaren blijven werken
      deadline_quali:uur(-2), deadline_race:uur(48), quali_result:null, race_result:null,
      deadline_sprint:null, sprint_result:null, sprint_key:null,
      fastest_lap:null, fastest_pitstop:null, safety_cars:null, rode_vlag:null },
    { id:3, season:2026, round:3, name:'Suzuka', drivers:null,
      // geen deelnemerslijst: de app hoort uit te leggen dat die vanzelf komt
      deadline_quali:uur(72), deadline_race:uur(96), quali_result:null, race_result:null,
      deadline_sprint:null, sprint_result:null, sprint_key:null,
      fastest_lap:null, fastest_pitstop:null, safety_cars:null, rode_vlag:null },
  ],
  // De negen vragen zoals schema.sql ze wegschrijft. Compleet, want het
  // aanmaakscherm laat ze allemaal zien — ook die de app nog niet stelt.
  questions: [
    { id:'quali_top10',      naam:'Top 10 kwalificatie', punten:50, sessie:'quali', soort:'top10',   gok:false, volgorde:10 },
    { id:'race_top10',       naam:'Top 10 race',         punten:50, sessie:'race',  soort:'top10',   gok:false, volgorde:20 },
    { id:'winnaar',          naam:'Winnaar',             punten:25, sessie:'race',  soort:'coureur', gok:false, volgorde:30 },
    { id:'pole',             naam:'Pole position',       punten:10, sessie:'quali', soort:'coureur', gok:false, volgorde:40 },
    { id:'snelste_ronde',    naam:'Snelste ronde',       punten:10, sessie:'race',  soort:'coureur', gok:false, volgorde:50 },
    { id:'snelste_pitstop',  naam:'Snelste pitstop',     punten:10, sessie:'race',  soort:'coureur', gok:false, volgorde:60 },
    { id:'teamgenoot_duels', naam:'Teamgenoot-duels',    punten:15, sessie:'race',  soort:'duels',   gok:false, volgorde:70 },
    { id:'safety_cars',      naam:'Aantal safety cars',  punten:12, sessie:'race',  soort:'getal',   gok:true,  volgorde:80 },
    { id:'rode_vlag',        naam:'Rode vlag',           punten:20, sessie:'race',  soort:'janee',   gok:true,  volgorde:90 },
    { id:'sprint_top10',     naam:'Top 10 sprint',       punten:25, sessie:'sprint',soort:'top10',   gok:false, volgorde:25 },
  { id:'kampioen',         naam:'Wereldkampioen',      punten:50, sessie:'seizoen',soort:'coureur',gok:false, volgorde:210 },
  { id:'constructeur',     naam:'Constructeurstitel',  punten:40, sessie:'seizoen',soort:'team',   gok:false, volgorde:220 },
  { id:'winnaars',         naam:'Aantal verschillende racewinnaars', punten:30, sessie:'seizoen',soort:'getal', gok:false, volgorde:230 },
  { id:'vierde_team',      naam:'Welk team wordt vierde', punten:30, sessie:'seizoen',soort:'team', gok:false, volgorde:240 },
  ],
  // Leeg: een poule zonder eigen keuze doet aan alles mee.
  pool_questions: [],
  answers: [],
  jokers: [],
  push_abonnementen: [],
};

// Een echte database overleeft het herladen van de pagina, dus deze ook.
// Bewust sessionStorage: de tests wissen localStorage om een ander toestel na
// te bootsen, en dat hoort de "database" niet leeg te maken.
const BEWAAR = 'nabootsing:db';
let store;
try {
  const opgeslagen = sessionStorage.getItem(BEWAAR);
  store = opgeslagen ? JSON.parse(opgeslagen) : JSON.parse(JSON.stringify(beginstand));
} catch { store = JSON.parse(JSON.stringify(beginstand)); }
// Een bewaarde database van vóór de accounts mist deze tabel; zonder deze
// regel valt de nabootsing dan om op een leesactie die niets hoort te doen.
store.auth_users ??= [];
store.otp ??= [];
store.jokers ??= [];
store.push_abonnementen ??= [];
store.google_als ??= 'danny@gmail.voorbeeld';
// Supabase zonder eigen mailserver: dan gaat er alleen mail naar het eigen
// team, en krijgt iedereen anders een fout. Een test zet dit aan met
// __mail.alleenTeam(true).
store.alleen_team ??= false;
const nietToegestaan = (email) => ({ data: null, error: { code: 'email_address_not_authorized',
  message: `Email address "${email}" cannot be used as it is not authorized` } });
// Elke keer dat er naar Google gestuurd werd: waarheen terug, en met welke
// prompt. Blijft staan als de link al gebruikt is (otp ruimt zichzelf op).
store.naar_google ??= [];
// Het beheer: wie beheerder is (een lijst account-id's, in het echt de tabel
// site_beheerders), het logboek van de sync en de bezoekersteller.
store.site_beheerders ??= [];
store.sync_runs ??= [];
store.bezoeken ??= {};
store.actief ??= [];
const bewaren = () => { try { sessionStorage.setItem(BEWAAR, JSON.stringify(store)); } catch { /* niets */ } };

// Captcha in Supabase Auth (Turnstile, 17 oktober). Een test zet captcha_aan
// op true; dan weigert elke aanroep die Supabase met captcha beveiligt een
// ontbrekend, verzonnen of al gebruikt token, net als Supabase. Elk token dat
// binnenkomt staat in captcha_log, met de aanroep erbij, zodat een test kan
// zien dat de app per aanroep een vers token meestuurt.
store.captcha_aan ??= false;
store.captcha_log ??= [];
store.aanmaak_log ??= [];
function captchaFout(aanroep, opties) {
  const token = opties?.captchaToken ?? null;
  store.captcha_log.push({ aanroep, token });
  bewaren();
  if (!store.captcha_aan) return null;
  const gebruikt = store.captcha_log.slice(0, -1).some((r) => r.token && r.token === token);
  if (!token || !String(token).startsWith('ts-') || gebruikt) {
    return { data: null, error: { code: 'captcha_failed',
      message: 'captcha protection: request disallowed (timeout-or-duplicate)' } };
  }
  return null;
}

// Wordt door ontbrekende-sleutel.test.mjs leeggemaakt om een database zonder
// unieke sleutel na te bootsen.
const UNIEK = {
  answers:     ['pool_id', 'race_id', 'member_id', 'question_id'],
  push_abonnementen: ['endpoint'],
};

// De gedeeltelijke unieke sleutel uit schema.sql: één account kan niet twee
// spelers in dezelfde poule zijn. Zonder deze regel hier zou de app een
// claim kunnen doen die de echte database weigert, en zou geen enkele test
// dat merken.
function botstMetAccount(rijen, rij, zichzelf) {
  if (!rij.user_id) return false;
  return rijen.some((x) => x !== zichzelf
    && gelijk(x.pool_id, rij.pool_id) && x.user_id && gelijk(x.user_id, rij.user_id));
}
const dubbelAccount = { data: null, error: { code: '23505',
  message: 'duplicate key value violates unique constraint "pool_members_pool_user_uniek"' } };

// Alles wat het geheugen in gaat wordt gekopieerd, zodat de pagina nooit per
// ongeluk dezelfde array-instantie deelt met de "database".
const kopie = (v) => JSON.parse(JSON.stringify(v));
const gelijk = (a, b) => String(a) === String(b);
// Een filter is [kolom, waarde], [kolom, lijst, 'in'] of [kolom, grens, 'lte'].
// Die laatste is er voor de kalender: die haalt alles op tot en met het
// seizoen dat de poule nu speelt, zodat terugbladeren geen tweede ronde naar
// de server kost.
const past = (rij, [k, v, op]) =>
  op === 'in'  ? (v ?? []).some((x) => gelijk(rij[k], x))
  : op === 'lte' ? Number(rij[k]) <= Number(v)
  : gelijk(rij[k], v);

globalThis.__db = store;

// ------------------------------------------------------------
//  De policies uit schema.sql, voor zover de app ze kan raken
//
//  Niet compleet, en dat hoeft ook niet: test/policies.test.sql draait tegen
//  een echte PostgreSQL en legt de policies zelf vast. Wat híér moet kloppen
//  is dat een browsertest niet stiekem door een open deur loopt — anders
//  zouden de schermen die uitleggen "deze speler hoort bij een ander toestel"
//  nooit te zien zijn.
// ------------------------------------------------------------

const wieBenIk = () => huidigeSessie()?.user?.id ?? null;

// De sloten tegen misbruik uit schema.sql ("Misbruik tegengaan"): een fout met
// een vaste hint, die de app in de taal van de speler uitlegt.
const misbruik = (hint, message) => ({ data: null, error: { code: 'P0001', hint, message } });
const GEEN_SESSIE = misbruik('geen_sessie', 'Je bent niet aangemeld. Herlaad de app en probeer het opnieuw.');
// Het woordfilter, kort: de echte lijst en de regels staan in schema.sql en
// test/misbruik.test.sql. Hier genoeg om de melding in de app te laten zien.
const naamVerboden = (naam) => /(^|[^a-z])(kanker|kut|fuck)/i.test(String(naam ?? ''));

// mag_voor_speler(): mijn eigen speler, of eentje die van niemand is en die
// mijn account aanmaakte (de tweede speler op een gedeeld toestel). Een speler
// van niemand is sinds 28 september niet meer voor iedereen beschrijfbaar; zie
// test/identiteit.test.sql.
function magVoorSpeler(memberId) {
  const lid = store.pool_members.find((l) => gelijk(l.member_id, memberId));
  if (!lid) return true;   // bestaat niet: de foreign key mag erover klagen
  const ik = wieBenIk();
  if (!ik) return false;
  return gelijk(lid.user_id, ik) || (!lid.user_id && gelijk(lid.aangemaakt_door, ik));
}

// mag_voor_speler_in(): en de speler hoort ook in die poule.
function magVoorSpelerIn(memberId, poolId) {
  const lid = store.pool_members.find((l) => gelijk(l.member_id, memberId));
  if (lid && poolId !== undefined && !gelijk(lid.pool_id, poolId)) return false;
  return magVoorSpeler(memberId);
}

// mag_beheren(): de poulebaas, of elk lid als de poule geen eigenaar heeft.
// De checks op pools uit schema.sql (premium): de naam van de check die faalt,
// of null.
function profielFout(p) {
  if (p.merk_kleur != null && !/^#[0-9a-f]{6}$/.test(p.merk_kleur)) return 'pools_merk_kleur';
  if (p.merk_logo != null && !new RegExp(`^${p.id}/[A-Za-z0-9_-]{1,60}[.](png|jpg|jpeg|webp)$`).test(p.merk_logo)) return 'pools_merk_logo';
  if (p.sponsor_tekst != null && !(String(p.sponsor_tekst).trim().length >= 1 && String(p.sponsor_tekst).trim().length <= 80)) return 'pools_sponsor_tekst';
  if (p.sponsor_url != null && !(p.sponsor_tekst != null && p.sponsor_url.length <= 300
      && /^https:\/\/[A-Za-z0-9.-]+([/?#][^\s<>"'`]*)?$/.test(p.sponsor_url))) return 'pools_sponsor_url';
  return null;
}

function magBeheren(poolId) {
  const ik = wieBenIk();
  if (!ik) return false;
  const poule = store.pools.find((p) => gelijk(p.id, poolId));
  if (!poule) return false;
  const lid = store.pool_members.some((m) => gelijk(m.pool_id, poolId) && gelijk(m.user_id, ik));
  if (!lid) return false;
  if (!poule.owner_member_id) return true;
  return store.pool_members.some((m) =>
    gelijk(m.member_id, poule.owner_member_id) && gelijk(m.user_id, ik));
}

// is_member(): zit ik zelf in deze poule? Sinds de leespolicies dicht staan
// hangt hier bijna alles aan. Let op dat dit met auth.uid() werkt en niet met
// de speler die het scherm toont: wie op een gedeeld toestel een tweede
// speler is, hoort net zo goed te kunnen lezen.
function isLid(poolId) {
  const ik = wieBenIk();
  return !!ik && store.pool_members.some((m) => gelijk(m.pool_id, poolId) && gelijk(m.user_id, ik));
}

// sessie_deadline(), antwoord_open() en joker_open() uit schema.sql. Een
// antwoord van een medespeler is pas te zien als zijn sessie dicht is, een
// joker als zijn weekend begonnen is. Zonder deadline, of met een onbekende
// vraag of race: dicht (NaN is nergens kleiner dan).
function sessieDeadline(race, sessie) {
  if (!race) return NaN;
  const tijd = (k) => Date.parse(race[k] ?? '');
  if (sessie === 'quali') return tijd('deadline_quali');
  if (sessie === 'sprint') return tijd('deadline_sprint');
  if (sessie === 'seizoen' || sessie === 'weekend') {
    const tijden = ['deadline_sprint', 'deadline_quali', 'deadline_race']
      .map(tijd).filter((t) => !Number.isNaN(t));
    return tijden.length ? Math.min(...tijden) : NaN;
  }
  return tijd('deadline_race');
}
const raceVan = (id) => store.races.find((r) => gelijk(r.id, id));
function antwoordOpen(rij) {
  const vraag = (store.questions ?? []).find((q) => q.id === rij.question_id);
  return !!vraag && Date.now() > sessieDeadline(raceVan(rij.race_id), vraag.sessie);
}
const jokerOpen = (rij) => Date.now() > sessieDeadline(raceVan(rij.race_id), 'weekend');

// De leespolicies uit schema.sql, in dezelfde volgorde. Een rij die hier
// false krijgt bestaat voor deze sessie simpelweg niet -- precies wat RLS
// doet, en nadrukkelijk geen foutmelding. Bij antwoorden en jokers telt ook
// de policy voor je eigen speler (`for all` geldt ook voor lezen).
function magLezen(tabel, rij) {
  if (tabel === 'pools')          return !!rij.is_public || isLid(rij.id);
  if (tabel === 'pool_members')   return gelijk(rij.user_id, wieBenIk()) || isLid(rij.pool_id);
  if (tabel === 'answers') {
    return (isLid(rij.pool_id) && antwoordOpen(rij)) || magVoorSpelerIn(rij.member_id, rij.pool_id);
  }
  if (tabel === 'jokers') {
    return (isLid(rij.pool_id) && jokerOpen(rij)) || magVoorSpelerIn(rij.member_id, rij.pool_id);
  }
  if (tabel === 'pool_questions') return isLid(rij.pool_id);
  return true;   // races en questions zijn gedeelde gegevens
}

// Postgres weigert een verboden insert met 42501; een verboden update of
// delete raakt gewoon nul rijen en geeft géén fout. Dat verschil is precies
// wat index.html moet opvangen, dus bootst de nabootsing het na.
const geweigerd = { data: null, error: { code: '42501',
  message: 'new row violates row-level security policy' } };

function magSchrijven(tabel, rij) {
  if (tabel === 'answers' || tabel === 'jokers'
      || tabel === 'push_abonnementen') {
    return magVoorSpelerIn(rij.member_id, rij.pool_id);
  }
  // Een speler komt er alleen via poule_meedoen() en poule_aanmaken() in;
  // bijwerken mag alleen naar "van niemand" of naar jezelf (with check).
  if (tabel === 'pool_members') return !rij.user_id || gelijk(rij.user_id, wieBenIk());
  if (tabel === 'pool_questions') return magBeheren(rij.pool_id);
  return true;
}

// Welke bestaande rijen mag ik überhaupt aanraken?
function magRaken(tabel, rij) {
  if (tabel === 'answers' || tabel === 'jokers'
      || tabel === 'push_abonnementen') {
    return magVoorSpelerIn(rij.member_id, rij.pool_id);
  }
  if (tabel === 'pool_members') {
    // Je eigen speler (loslaten, je pagina), of als poulebaas een speler
    // losmaken. Een speler van niemand raak je niet: claimen gaat via
    // poule_claim_speler().
    return gelijk(rij.user_id, wieBenIk()) || magBeheren(rij.pool_id);
  }
  if (tabel === 'pool_questions') return magBeheren(rij.pool_id);
  if (tabel === 'pools') return magBeheren(rij.id);
  return true;
}

// poule_joker_bewaken() uit schema.sql, voor zover de app hem kan raken. Niet
// compleet -- test/jokers.test.sql draait tegen een echte PostgreSQL en legt
// de regels daar vast -- maar wel genoeg dat een browsertest niet door een
// open deur loopt die in productie dicht zit.
function jokerGeweigerd(rij) {
  const poule = store.pools.find((p) => gelijk(p.id, rij.pool_id));
  if (!poule?.jokers_vanaf) return 'Jokers staan in deze poule niet aan';
  const race = store.races.find((r) => gelijk(r.id, rij.race_id));
  if (!race) return null;
  const tijden = ['deadline_sprint', 'deadline_quali', 'deadline_race']
    .map((k) => Date.parse(race[k])).filter((t) => !Number.isNaN(t));
  if (!tijden.length) return null;
  const start = Math.min(...tijden);
  if (Date.now() > start) return 'Dit weekend is al begonnen, je joker ligt vast';
  if (start < Date.parse(poule.jokers_vanaf)) {
    return 'Dit weekend liep al toen de jokers aangezet werden';
  }
  // Hoeveel er in déze poule mogen. Stond hier niet, want het was een vaste 5
  // in de app; nu is het een kolom en kan een poule er twee hebben. De rij
  // zelf telt niet mee, net als in de trigger -- anders kun je een bestaande
  // joker niet opnieuw wegschrijven.
  const mag = poule.jokers_aantal ?? 5;
  const gezet = store.jokers.filter((j) =>
    gelijk(j.pool_id, rij.pool_id) && gelijk(j.member_id, rij.member_id)
    && !gelijk(j.race_id, rij.race_id)
    && store.races.some((r) => gelijk(r.id, j.race_id) && r.season === race.season)).length;
  if (gezet >= mag) return `Je hebt je ${mag} jokers voor dit seizoen al gezet`;
  return null;
}
const jokerFout = (bericht) => ({ data: null, error: { code: 'P0001', message: bericht } });

function uitvoeren(tabel, q) {
  const rijen = store[tabel];
  if (!rijen) {
    return { data: null, error: { code: '42P01', message: `relation "${tabel}" does not exist` } };
  }

  if (q._insert) {
    // Geen grant voor insert op pool_members: meedoen gaat via de functie.
    if (tabel === 'pool_members') {
      return { data: null, error: { code: '42501', message: 'permission denied for table pool_members' } };
    }
    if (q._insert.some((r) => !magSchrijven(tabel, r))) return geweigerd;
    if (tabel === 'pool_members'
        && q._insert.some((r) => botstMetAccount(rijen, r, null))) return dubbelAccount;
    if (tabel === 'jokers') {
      for (const r of q._insert) {
        const weigering = jokerGeweigerd(r);
        if (weigering) return jokerFout(weigering);
        if (rijen.some((x) => gelijk(x.pool_id, r.pool_id) && gelijk(x.race_id, r.race_id)
                           && gelijk(x.member_id, r.member_id))) {
          return { data: null, error: { code: '23505',
            message: 'duplicate key value violates unique constraint "jokers_pkey"' } };
        }
        const gezet = rijen.filter((x) => gelijk(x.pool_id, r.pool_id)
          && gelijk(x.member_id, r.member_id)).length;
        if (gezet >= 5) return jokerFout('Je hebt je vijf jokers voor dit seizoen al gezet');
      }
    }
    const nieuw = q._insert.map((r) => {
      const rij = kopie(r);
      if (tabel === 'pool_members') rij.member_id = 'lid-' + (rijen.length + 1);
      if (tabel === 'pools') { rij.id = 'pool-' + (rijen.length + 1); rij.join_code = 'ABC123'; }
      rijen.push(rij);
      return kopie(rij);
    });
    bewaren();
    return q._single ? { data: nieuw[0] ?? null, error: null } : { data: nieuw, error: null };
  }

  if (q._upsert) {
    const fout = volgendeFout();
    if (fout) return fout;
    const sleutel = UNIEK[tabel];
    const doel = (q._opties?.onConflict ?? '').split(',').filter(Boolean);
    // Postgres geeft 42P10 als het opgegeven conflictdoel geen unieke sleutel is.
    if (doel.length && (!sleutel || doel.join(',') !== sleutel.join(','))) {
      return { data: null, error: { code: '42P10',
        message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification' } };
    }
    if (q._upsert.some((r) => !magSchrijven(tabel, r) || !magRaken(tabel, r))) return geweigerd;
    const uit = q._upsert.map((r) => {
      const bestaand = sleutel && rijen.find((x) => sleutel.every((k) => gelijk(x[k], r[k])));
      if (bestaand) {
        // ignoreDuplicates: ON CONFLICT DO NOTHING. De bestaande rij blijft
        // zoals hij is, en komt ook niet terug: net als bij Postgres geeft
        // returning alleen de rijen die er echt bij kwamen.
        if (q._opties?.ignoreDuplicates) return null;
        // ON CONFLICT DO UPDATE SET <alleen de meegestuurde kolommen>
        Object.assign(bestaand, kopie(r));
        return kopie(bestaand);
      }
      const rij = { quali_top10: null, race_top10: null, ...kopie(r) };
      rijen.push(rij);
      return kopie(rij);
    }).filter(Boolean);
    bewaren();
    return q._selectNa ? { data: uit, error: null } : { data: null, error: null };
  }

  if (q._weg) {
    // Een joker weghalen valt onder dezelfde trigger als hem zetten: zodra
    // het weekend loopt kan hij niet meer weg.
    if (tabel === 'jokers') {
      for (const r of rijen.filter((x) => q._filters.every((f) => past(x, f)))) {
        const weigering = jokerGeweigerd(r);
        if (weigering) return jokerFout(weigering);
      }
    }
    // Een leeggemaakt antwoord haalt zijn rij weg: waarde mag niet null zijn.
    const blijft = rijen.filter((r) =>
      !(q._filters.every((f) => past(r, f)) && magRaken(tabel, r)));
    const verwijderd = rijen.length - blijft.length;
    rijen.length = 0;
    rijen.push(...blijft);
    bewaren();
    return { data: null, error: null, count: verwijderd };
  }

  if (q._update) {
    // De kolomgrant en de trigger pool_members_bewaken() uit schema.sql: alleen
    // user_id, profiel_code en profiel; user_id alleen naar leeg; je pagina
    // alleen op je eigen speler.
    if (tabel === 'pool_members') {
      const kolommen = Object.keys(q._update);
      if (kolommen.some((k) => !['user_id', 'profiel_code', 'profiel'].includes(k))) {
        return { data: null, error: { code: '42501', message: 'permission denied for table pool_members' } };
      }
      if (kolommen.includes('user_id') && q._update.user_id) {
        return { data: null, error: { code: 'P0001', message: 'een speler claimen gaat via poule_claim_speler()' } };
      }
      const raakt = rijen.filter((r) => q._filters.every((f) => past(r, f)) && magRaken(tabel, r));
      if ((kolommen.includes('profiel') || kolommen.includes('profiel_code'))
          && raakt.some((r) => !gelijk(r.user_id, wieBenIk()))) {
        return { data: null, error: { code: 'P0001', message: 'alleen de speler zelf zet zijn pagina aan of uit' } };
      }
      if (kolommen.includes('user_id')) {
        for (const r of raakt) if (r.user_id) r.aangemaakt_door = null;
      }
    }
    // De trigger pools_profiel_bewaken() en de checks op pools uit schema.sql
    // (premium): premium_tot zet alleen het beheer, een logo, kleur of
    // sponsorregel alleen zolang premium loopt, en de waarden kloppen.
    if (tabel === 'pools') {
      const u = q._update;
      const raakt = rijen.filter((r) => q._filters.every((f) => past(r, f)) && magRaken(tabel, r));
      if ('premium_tot' in u && raakt.some((r) => (r.premium_tot ?? null) !== (u.premium_tot ?? null))) {
        return { data: null, error: { code: 'P0001', message: 'premium zet alleen het beheer aan' } };
      }
      const zet = ['merk_kleur', 'merk_logo', 'sponsor_tekst', 'sponsor_url'].filter((k) => k in u && u[k] !== null);
      if (zet.length && raakt.some((r) => !(r.premium_tot && Date.parse(r.premium_tot) > Date.now())
          && zet.some((k) => u[k] !== r[k]))) {
        return { data: null, error: { code: 'P0001', message: 'een eigen profiel kan alleen met premium' } };
      }
      const fout = raakt.map((r) => profielFout({ ...r, ...u })).find(Boolean);
      if (fout) return { data: null, error: { code: '23514', message: `new row violates check constraint "${fout}"` } };
      // De trigger pools_seizoen_bewaken(): precies één seizoen omhoog, en
      // alleen als dat seizoen klaar is (elke race een race-uitslag of
      // afgelast, seizoen_klaar() in schema.sql).
      if ('season' in u) {
        for (const r of raakt) {
          if (gelijk(u.season, r.season)) continue;
          if (Number(u.season) !== Number(r.season) + 1) {
            return { data: null, error: { code: 'P0001', hint: 'seizoen_stap',
              message: `Een poule gaat één seizoen tegelijk vooruit, van ${r.season} naar ${Number(r.season) + 1}` } };
          }
          if (store.races.some((x) => gelijk(x.season, r.season) && !x.afgelast && !x.race_result)) {
            return { data: null, error: { code: 'P0001', hint: 'seizoen_niet_klaar',
              message: `Seizoen ${r.season} is nog niet klaar: er moet nog een race gereden worden` } };
          }
        }
      }
    }
    // update(...).eq(...).is(kolom, null): de is-controle hoort bij de
    // schrijfactie zelf, zodat een rij die inmiddels gevuld is niet geraakt
    // wordt. Zonder dat kan de app niet nagespeeld worden.
    const doel = rijen.filter((r) =>
      q._filters.every((f) => past(r, f)) &&
      q._isNull.every((k) => (r[k] ?? null) === null) &&
      // Een update die niets mag raken geeft geen fout, hij raakt nul rijen.
      magRaken(tabel, r) && magSchrijven(tabel, { ...r, ...q._update }));
    if (tabel === 'pool_members' && doel.some((r) =>
        botstMetAccount(rijen, { ...r, ...q._update }, r))) return dubbelAccount;
    for (const r of doel) Object.assign(r, kopie(q._update));
    bewaren();
    // `returning` heeft in Postgres net zo goed leesrecht nodig. Precies deze
    // regel is waarom claimen en meedoen een functie moesten worden: de rij
    // die je net aanmaakt of claimt valt op dat moment nog buiten je
    // leesrechten.
    const terug = doel.filter((r) => magLezen(tabel, r));
    return q._selectNa ? { data: kopie(terug), error: null } : { data: null, error: null };
  }

  const uit = kopie(rijen.filter((r) =>
    magLezen(tabel, r) && q._filters.every((f) => past(r, f))));
  if (q._single) {
    if (uit.length !== 1) {
      return { data: null, error: { code: 'PGRST116', message: 'geen of meerdere rijen' } };
    }
    return { data: uit[0], error: null };
  }
  return { data: uit, error: null };
}

function maakQuery(tabel) {
  const q = {
    _filters: [], _isNull: [], _single: false, _selectNa: false,
    select() { if (q._insert || q._upsert || q._update) q._selectNa = true; return q; },
    eq(k, v) { q._filters.push([k, v]); return q; },
    in(k, v) { q._filters.push([k, v, 'in']); return q; },
    lte(k, v) { q._filters.push([k, v, 'lte']); return q; },
    is(k, v) {
      if (v !== null) throw new Error('de nabootsing kent alleen is(kolom, null)');
      q._isNull.push(k); return q;
    },
    update(r) { q._update = r; return q; },
    delete() { q._weg = true; return q; },
    order() { return q; },
    single() { q._single = true; return q; },
    insert(r) { q._insert = Array.isArray(r) ? r : [r]; return q; },
    upsert(r, o) { q._upsert = Array.isArray(r) ? r : [r]; q._opties = o; return q; },
    then(res, rej) { return Promise.resolve().then(() => uitvoeren(tabel, q)).then(res, rej); },
  };
  return q;
}

// ------------------------------------------------------------
//  auth
//  De sessie staat bewust in localStorage, net als bij supabase-js zelf.
//  Tests die localStorage wissen bootsen daarmee een ander toestel na — en
//  krijgen dan ook echt een ander account, wat precies is wat we willen
//  kunnen controleren.
// ------------------------------------------------------------
const SESSIE = 'nabootsing:sessie';

function huidigeSessie() {
  try {
    const rauw = localStorage.getItem(SESSIE);
    if (!rauw) return null;
    const s = JSON.parse(rauw);
    // Het account uit de "database", niet de kopie die in de sessie stond:
    // anders ziet de app een mailadres niet dat inmiddels bevestigd is.
    const user = store.auth_users.find((u) => u.id === s?.user?.id);
    return user ? { ...s, user: kopie(user) } : null;
  } catch { return null; }
}

function zetSessie(user) {
  const sessie = { user, access_token: 'nep-' + user.id };
  try { localStorage.setItem(SESSIE, JSON.stringify(sessie)); } catch { /* niets */ }
  return sessie;
}

// De nabootsing van detectSessionInUrl: supabase-js pikt bij het laden van de
// pagina de sleutel uit `?code=` op, zet de sessie, en haalt de parameter uit
// de adresbalk. Dat laatste is geen detail — het is de reden dat de app die
// sleutel niet als poulecode kan aanzien, en dus precies wat getest moet
// kunnen worden.
function inlogUitAdresbalk() {
  try {
    const code = new URLSearchParams(location.search).get('code');
    if (!code) return;
    const wacht = store.otp.find((o) => o.code === code);
    if (!wacht) return;
    const user = store.auth_users.find((u) => u.id === wacht.user_id);
    if (user) {
      // Een bevestigingslink maakt het adres definitief; een inloglink zet
      // alleen de sessie op dit toestel.
      if (wacht.bevestigt) {
        user.email = wacht.email;
        user.new_email = null;
        user.is_anonymous = false;
      }
      // Terug van Google: de identiteit hangt er nu aan, en daarmee is het
      // account niet anoniem meer.
      if (wacht.google) {
        user.identities = [...(user.identities ?? []).filter((i) => i.provider !== 'google'),
                           { provider: 'google', identity_data: { email: wacht.email } }];
        user.email ??= wacht.email;
        user.is_anonymous = false;
      }
      zetSessie(user);
    }
    store.otp = store.otp.filter((o) => o.code !== code);
    bewaren();
    const over = new URLSearchParams(location.search);
    over.delete('code');
    const rest = over.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : ''));
  } catch { /* niets */ }
}
inlogUitAdresbalk();

// Een sleutel die er niet uitziet als een poulecode, zoals Supabase hem maakt.
let teller = 0;
const nieuweSleutel = () => `pkce-${Date.now().toString(36)}-${++teller}-abcdefghijklmnop`;
// En de {{ .TokenHash }} uit dezelfde mail: wat de link in onze eigen
// sjablonen (docs/mail/) meegeeft, en wat de app met verifyOtp inwisselt.
const nieuweHash = () => `th${Date.now().toString(36)}${++teller}0123456789abcdef`;

const auth = {
  async getSession() { return { data: { session: huidigeSessie() }, error: null }; },
  async getUser() {
    const s = huidigeSessie();
    return { data: { user: s?.user ?? null }, error: s ? null : { message: 'geen sessie' } };
  },
  async signInAnonymously({ options = {} } = {}) {
    const bestaand = huidigeSessie();
    if (bestaand) return { data: bestaand, error: null };
    const nee = captchaFout('signInAnonymously', options);
    if (nee) return nee;
    const user = { id: 'account-' + (store.auth_users.length + 1),
                   is_anonymous: true, email: null, new_email: null,
                   user_metadata: { ...(options.data ?? {}) },
                   identities: [{ provider: 'anonymous', identity_data: {} }] };
    store.auth_users.push(user);
    bewaren();
    return { data: zetSessie(user), error: null };
  },

  // Google aan het huidige account hangen. In het echt stuurt supabase-js de
  // browser naar Google en komt hij terug met ?code=; hier zetten we dezelfde
  // sleutel klaar, zodat een test de terugkomst kan naspelen.
  //
  // De nabootsing kent één Google-account per test: welk adres dat is stelt de
  // test in met __mail.googleAls(). store.naar_google onthoudt queryParams.prompt,
  // zodat een test kan zien of Google gevraagd werd een account te laten kiezen.
  async linkIdentity({ provider, options = {} }) {
    if (provider !== 'google') return { data: null, error: { message: 'onbekende provider' } };
    const sessie = huidigeSessie();
    if (!sessie) return { data: null, error: { message: 'geen sessie' } };
    // Geen botsingscontrole hier: op dit moment is de browser nog niet eens
    // bij Google geweest, dus Supabase kan hier onmogelijk al weten met welk
    // Google-adres je terugkomt. Die controle gebeurt daarom pas in
    // laatsteLink() — de stap die "terugkomen van Google" naspeelt — en dat
    // is precies waar hij in het echt ook pas gebeurt.
    store.otp.push({ code: nieuweSleutel(), user_id: sessie.user.id,
                     email: store.google_als, google: true,
                     terug: options.redirectTo ?? '' });
    store.naar_google.push({ soort: 'koppelen', terug: options.redirectTo ?? '', vraag: options.queryParams?.prompt ?? null });
    bewaren();
    return { data: {}, error: null };
  },

  // Inloggen op een leeg toestel. Bestaat er nog geen account met dit
  // Google-adres, dan maakt Supabase er wél een aan — anders dan bij
  // signInWithOtp, want hier is Google zelf het bewijs dat jij het bent.
  async signInWithOAuth({ provider, options = {} }) {
    if (provider !== 'google') return { data: null, error: { message: 'onbekende provider' } };
    let user = store.auth_users.find((u) =>
      (u.identities ?? []).some((i) => i.provider === 'google'
                                    && gelijk(i.identity_data?.email, store.google_als)));
    if (!user) {
      user = { id: 'account-' + (store.auth_users.length + 1), is_anonymous: false,
               email: store.google_als, new_email: null,
               identities: [{ provider: 'google', identity_data: { email: store.google_als } }] };
      store.auth_users.push(user);
    }
    store.otp.push({ code: nieuweSleutel(), user_id: user.id, email: store.google_als,
                     google: true, terug: options.redirectTo ?? '' });
    store.naar_google.push({ soort: 'inloggen', terug: options.redirectTo ?? '', vraag: options.queryParams?.prompt ?? null });
    bewaren();
    return { data: {}, error: null };
  },

  // Een mailadres aan het huidige account hangen. Net als bij Supabase komt
  // het adres in `new_email` en pas in `email` als er op de link geklikt is.
  // `data` komt erbij in user_metadata; zonder email is het alleen dat.
  async updateUser({ email, data } = {}, opties = {}) {
    const sessie = huidigeSessie();
    if (!sessie) return { data: null, error: { message: 'geen sessie' } };
    if (email === undefined) {
      const user = store.auth_users.find((u) => u.id === sessie.user.id);
      if (!user) return { data: null, error: { message: 'geen account' } };
      user.user_metadata = { ...(user.user_metadata ?? {}), ...(data ?? {}) };
      bewaren();
      zetSessie(user);
      return { data: { user: kopie(user) }, error: null };
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email ?? ''))) {
      return { data: null, error: { code: 'validation_failed', message: 'Unable to validate email address: invalid format' } };
    }
    const bezet = store.auth_users.some((u) =>
      u.id !== sessie.user.id && (gelijk(u.email, email) || gelijk(u.new_email, email)));
    if (bezet) {
      return { data: null, error: { code: 'email_exists',
        message: 'A user with this email address has already been registered' } };
    }
    if (store.alleen_team) return nietToegestaan(email);
    const user = store.auth_users.find((u) => u.id === sessie.user.id);
    user.new_email = email;
    user.user_metadata = { ...(user.user_metadata ?? {}), ...(data ?? {}) };
    // `taal` is wat er op dat moment in user_metadata staat: de taal van de
    // mail, want het sjabloon kiest op {{ .Data.taal }}.
    store.otp.push({ code: nieuweSleutel(), hash: nieuweHash(), user_id: user.id, email,
                     bevestigt: true, terug: opties.emailRedirectTo ?? '',
                     taal: user.user_metadata.taal ?? null });
    bewaren();
    zetSessie(user);
    return { data: { user: kopie(user) }, error: null };
  },

  // Een inloglink naar een bestaand account. shouldCreateUser:false betekent
  // dat een onbekend adres een fout geeft in plaats van een leeg account.
  async signInWithOtp({ email, options = {} }) {
    const nee = captchaFout('signInWithOtp', options);
    if (nee) return nee;
    let user = store.auth_users.find((u) => gelijk(u.email, email));
    if (!user) {
      if (options.shouldCreateUser === false) {
        return { data: null, error: { code: 'otp_disabled',
          message: 'Signups not allowed for otp' } };
      }
      // Een nieuw account met dit adres, zoals Supabase bij shouldCreateUser
      // (het standaard): de mail die dan gaat is "Confirm signup", met
      // dezelfde link en code.
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email ?? ''))) {
        return { data: null, error: { code: 'validation_failed', message: 'Unable to validate email address: invalid format' } };
      }
      if (store.alleen_team) return nietToegestaan(email);
      // options.data geldt alleen hier, bij een nieuw account. Bij een
      // bestaand account laat Supabase de metadata zoals hij is.
      user = { id: 'account-' + (store.auth_users.length + 1), is_anonymous: false,
               email, new_email: null, user_metadata: { ...(options.data ?? {}) },
               identities: [{ provider: 'email', identity_data: { email } }] };
      store.auth_users.push(user);
    }
    if (store.alleen_team) return nietToegestaan(email);
    // Dezelfde mail draagt ook een code, als het sjabloon {{ .Token }} heeft
    // (BEDIENING.md §5b). Zes cijfers, net als bij Supabase.
    const token = String(100000 + ((Date.now() + ++teller * 7919) % 900000));
    store.otp.push({ code: nieuweSleutel(), hash: nieuweHash(), token, user_id: user.id, email,
                     bevestigt: false, terug: options.emailRedirectTo ?? '',
                     taal: user.user_metadata?.taal ?? null });
    bewaren();
    return { data: {}, error: null };
  },
  // De code uit die mail intikken in plaats van op de link te klikken. Lukt
  // het, dan staat de sessie meteen op dit toestel, net als bij Supabase;
  // de mail is daarna op.
  //
  // Of de link uit onze eigen sjablonen: dan komt {{ .TokenHash }} binnen als
  // token_hash, met als type `email` (inloggen of een nieuw account) of
  // `email_change` (een mailadres koppelen; die maakt het adres definitief,
  // net als de bevestigingslink).
  async verifyOtp({ email, token, type, token_hash, options = {} }) {
    const nee = captchaFout('verifyOtp', options);
    if (nee) return nee;
    if (token_hash) {
      const wacht = store.otp.find((o) => o.hash && o.hash === String(token_hash)
        && type === (o.bevestigt ? 'email_change' : 'email'));
      const user = wacht && store.auth_users.find((u) => u.id === wacht.user_id);
      if (!user) {
        return { data: null, error: { code: 'otp_expired', message: 'Email link is invalid or has expired' } };
      }
      if (wacht.bevestigt) {
        user.email = wacht.email;
        user.new_email = null;
        user.is_anonymous = false;
      }
      store.otp = store.otp.filter((o) => o !== wacht);
      bewaren();
      const sessie = zetSessie(user);
      return { data: { session: sessie, user: kopie(user) }, error: null };
    }
    const wacht = store.otp.find((o) => o.token && o.token === String(token)
      && gelijk(o.email, email) && !o.bevestigt && type === 'email');
    const user = wacht && store.auth_users.find((u) => u.id === wacht.user_id);
    if (!user) {
      return { data: null, error: { code: 'otp_expired', message: 'Token has expired or is invalid' } };
    }
    store.otp = store.otp.filter((o) => o !== wacht);
    bewaren();
    const sessie = zetSessie(user);
    return { data: { session: sessie, user: kopie(user) }, error: null };
  },
  async signOut() {
    try { localStorage.removeItem(SESSIE); } catch { /* niets */ }
    return { error: null };
  },
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe() {} } } };
  },
};

// Wat de tests nodig hebben om een mailbox na te bootsen: welke link is er
// verstuurd, en wat gebeurt er als je erop klikt.
globalThis.__mail = {
  // De laatst verstuurde link, precies zoals hij in de mail zou staan — of,
  // bij een Google-koppeling die botst, precies zoals Supabase terugstuurt
  // ná de omweg via Google: geen geldige sleutel, maar een foutmelding in de
  // adresbalk. Pas op dit moment is dat te ontdekken, zie linkIdentity()
  // hierboven.
  laatsteLink() {
    const laatste = store.otp[store.otp.length - 1];
    if (!laatste) return null;
    const basis = laatste.terug || (location.origin + location.pathname);
    if (laatste.google) {
      const bezet = store.auth_users.find((u) =>
        u.id !== laatste.user_id
        && (u.identities ?? []).some((i) => i.provider === 'google'
                                         && gelijk(i.identity_data?.email, laatste.email)));
      if (bezet) {
        store.otp = store.otp.filter((o) => o.code !== laatste.code);
        bewaren();
        return basis + (basis.includes('?') ? '&' : '?')
          + 'error=server_error&error_code=identity_already_exists'
          + '&error_description=' + encodeURIComponent('Identity is already linked to another user');
      }
    }
    return basis + (basis.includes('?') ? '&' : '?') + 'code=' + laatste.code;
  },
  // De link zoals onze eigen sjablonen hem maken (docs/mail/): naar de app,
  // met de token_hash en het type erin. In het echt staat daar
  // https://predicttherace.com/app/; hier het adres van de testserver.
  laatsteMaillink() {
    const laatste = [...store.otp].reverse().find((o) => o.hash);
    if (!laatste) return null;
    const basis = laatste.terug || (location.origin + location.pathname);
    return basis + (basis.includes('?') ? '&' : '?') + 'token_hash=' + laatste.hash
      + '&type=' + (laatste.bevestigt ? 'email_change' : 'email');
  },
  aantalVerstuurd() { return store.otp.length; },
  // In welke taal de laatste mail ging: wat er bij het versturen in
  // user_metadata.taal stond ({{ .Data.taal }} in de sjablonen), of null.
  laatsteTaal() { return store.otp[store.otp.length - 1]?.taal ?? null; },
  // De metadata van een account, of van het account van de sessie.
  metadata(id) {
    const uid = id ?? huidigeSessie()?.user?.id;
    return kopie(store.auth_users.find((u) => u.id === uid)?.user_metadata ?? null);
  },
  // De code uit de laatste inlogmail, zoals hij in de mail zou staan.
  laatsteCode() {
    return [...store.otp].reverse().find((o) => o.token)?.token ?? null;
  },
  // Met welk Google-account de nabootsing inlogt. Zo kan een test twee
  // verschillende mensen naspelen.
  googleAls(adres) { store.google_als = adres; bewaren(); },
  alleenTeam(aan) { store.alleen_team = !!aan; bewaren(); },
};

// ------------------------------------------------------------
//  rpc
//  Eén functie maar: verwijder_mijn_account(). Hij hoort hier omdat het
//  verschil tussen de twee smaken — wel of niet je spelers mee — precies is
//  wat het scherm belooft, en dat moet een browsertest kunnen nalopen.
// ------------------------------------------------------------
// eigen_vraag_open(): de race is nog niet begonnen.
function eigenVraagOpen(raceId) {
  const r = store.races.find((x) => gelijk(x.id, raceId));
  return !!r?.deadline_race && Date.parse(r.deadline_race) > Date.now();
}

const functies = {
  // De vier functies uit fase 0. Ze bestaan omdat een policy niet kan eisen
  // dát je filtert: "een poule vinden op zijn code" en "de hele tabel
  // leegvissen" waren daardoor dezelfde rechten. Een functie met een
  // verplichte sleutel kan dat verschil wél maken.
  poule_ophalen({ p_code = null, p_id = null } = {}) {
    const poule = store.pools.find((p) =>
      (p_code && gelijk(String(p.join_code).toUpperCase(), String(p_code).toUpperCase()))
      || (p_id && gelijk(p.id, p_id)));
    if (!poule) return { data: null, error: null };
    // profiel_code en profiel alleen voor je eigen speler, net als in
    // schema.sql: die van je medespelers gaan je niet aan.
    const ik = wieBenIk();
    const leden = store.pool_members.filter((m) => gelijk(m.pool_id, poule.id))
      .map((m) => ({
        member_id: m.member_id, display_name: m.display_name, user_id: m.user_id,
        profiel_code: m.user_id && gelijk(m.user_id, ik) ? m.profiel_code ?? null : null,
        profiel: m.user_id && gelijk(m.user_id, ik) ? m.profiel ?? null : null,
        team_id: m.team_id ?? null,
      }));
    // De antwoorden van medespelers pas na hun deadline, je eigen altijd; van
    // de rest alleen dát ze er zijn. Zelfde voor de jokers, zonder de rest.
    const zichtbaar = (a) => antwoordOpen(a) || magVoorSpeler(a.member_id);
    const vanPoule = (store.answers ?? []).filter((a) => gelijk(a.pool_id, poule.id));
    return { data: {
      poule: kopie(poule),
      leden: kopie(leden),
      antwoorden: kopie(vanPoule.filter(zichtbaar)),
      ingeleverd: vanPoule.filter((a) => !zichtbaar(a))
        .map(({ race_id, member_id, question_id }) => ({ race_id, member_id, question_id })),
      poulevragen: (store.pool_questions ?? [])
        .filter((r) => gelijk(r.pool_id, poule.id)).map((r) => r.question_id),
      jokers: (store.jokers ?? []).filter((j) => gelijk(j.pool_id, poule.id))
        .filter((j) => jokerOpen(j) || magVoorSpeler(j.member_id))
        .map(({ race_id, member_id }) => ({ race_id, member_id })),
      teams: (store.pool_teams ?? []).filter((t) => gelijk(t.pool_id, poule.id))
        .map(({ id, naam }) => ({ id, naam })),
      periodes: (store.pool_periodes ?? []).filter((x) => gelijk(x.pool_id, poule.id))
        .map(({ id, seizoen, naam, van_ronde, tot_ronde, prijs }) => ({ id, seizoen, naam, van_ronde, tot_ronde, prijs: prijs ?? null })),
      eigenvragen: (store.pool_eigen_vragen ?? []).filter((v) => gelijk(v.pool_id, poule.id))
        .map(({ id, race_id, vraag, opties, uitkomst }) => ({ id, race_id, vraag, opties: [...opties], uitkomst: uitkomst ?? null })),
      eigenantwoorden: (store.pool_eigen_antwoorden ?? []).filter((a) => {
        const v = (store.pool_eigen_vragen ?? []).find((x) => gelijk(x.id, a.vraag_id));
        return v && gelijk(v.pool_id, poule.id) && (!eigenVraagOpen(v.race_id) || magVoorSpeler(a.member_id));
      }).map(({ vraag_id, member_id, keuze }) => ({ vraag_id, member_id, keuze })),
    }, error: null };
  },

  // Tussenklassementen (premium), met de regels van schema.sql (test/periodes.test.sql).
  periode_opslaan({ p_pool, p_periode = null, p_seizoen, p_naam, p_van, p_tot, p_prijs } = {}) {
    const fout = (message) => ({ data: null, error: { code: 'P0001', message } });
    if (!magBeheren(p_pool)) return fout('alleen de poulebaas maakt een tussenklassement');
    const poule = store.pools.find((p) => gelijk(p.id, p_pool));
    if (!(poule?.premium_tot && Date.parse(poule.premium_tot) > Date.now())) return fout('tussenklassementen kunnen alleen met premium');
    const naam = String(p_naam ?? '').trim();
    if (naam.length < 1 || naam.length > 40) return fout('een tussenklassement heeft een naam van 1 tot 40 tekens');
    const van = Number(p_van), tot = Number(p_tot);
    if (!Number.isInteger(van) || !Number.isInteger(tot) || van < 1 || van > 40 || tot < van || tot > 40) {
      return fout('kies een eerste en een laatste ronde, de eerste niet na de laatste');
    }
    const prijs = String(p_prijs ?? '').trim() || null;
    if (prijs && prijs.length > 80) return fout('een prijs heeft hoogstens 80 tekens');
    store.pool_periodes ??= [];
    if (!p_periode) {
      if (store.pool_periodes.filter((x) => gelijk(x.pool_id, p_pool) && Number(x.seizoen) === Number(p_seizoen)).length >= 10) {
        return fout('hoogstens 10 tussenklassementen per seizoen');
      }
      const x = { id: `periode-${store.pool_periodes.length + 1}-${Date.now()}`, pool_id: p_pool, seizoen: Number(p_seizoen),
        naam, van_ronde: van, tot_ronde: tot, prijs };
      store.pool_periodes.push(x);
      bewaren();
      return { data: x.id, error: null };
    }
    const x = store.pool_periodes.find((y) => gelijk(y.id, p_periode) && gelijk(y.pool_id, p_pool));
    if (!x) return fout('dat tussenklassement bestaat niet');
    Object.assign(x, { naam, van_ronde: van, tot_ronde: tot, prijs });
    bewaren();
    return { data: x.id, error: null };
  },

  periode_weghalen({ p_periode } = {}) {
    const x = (store.pool_periodes ?? []).find((y) => gelijk(y.id, p_periode));
    if (!x) return { data: null, error: { code: 'P0001', message: 'dat tussenklassement bestaat niet' } };
    if (!magBeheren(x.pool_id)) return { data: null, error: { code: 'P0001', message: 'alleen de poulebaas haalt een tussenklassement weg' } };
    store.pool_periodes = store.pool_periodes.filter((y) => y !== x);
    bewaren();
    return { data: null, error: null };
  },

  // Eigen vragen (premium), met de regels van schema.sql (test/eigen-vragen.test.sql).
  eigen_vraag_opslaan({ p_pool, p_race, p_vraag_id = null, p_vraag, p_opties } = {}) {
    const fout = (message) => ({ data: null, error: { code: 'P0001', message } });
    if (!magBeheren(p_pool)) return fout('alleen de poulebaas zet een eigen vraag');
    const poule = store.pools.find((p) => gelijk(p.id, p_pool));
    if (!(poule?.premium_tot && Date.parse(poule.premium_tot) > Date.now())) return fout('eigen vragen kunnen alleen met premium');
    if (!eigenVraagOpen(p_race)) return fout('de race is al begonnen');
    const vraag = String(p_vraag ?? '').trim();
    if (vraag.length < 3 || vraag.length > 120) return fout('een vraag heeft 3 tot 120 tekens');
    const opties = (p_opties ?? []).map((o) => String(o ?? '').trim()).filter(Boolean);
    if (opties.length < 2 || opties.length > 6) return fout('een vraag heeft 2 tot 6 antwoorden');
    if (opties.some((o) => o.length > 40)) return fout('een antwoord heeft hoogstens 40 tekens');
    if (new Set(opties.map((o) => o.toLowerCase())).size !== opties.length) return fout('twee antwoorden zijn hetzelfde');
    store.pool_eigen_vragen ??= [];
    store.pool_eigen_antwoorden ??= [];
    if (!p_vraag_id) {
      if (store.pool_eigen_vragen.filter((v) => gelijk(v.pool_id, p_pool) && gelijk(v.race_id, p_race)).length >= 3) {
        return fout('hoogstens 3 eigen vragen per weekend');
      }
      const v = { id: `eigen-${store.pool_eigen_vragen.length + 1}-${Date.now()}`, pool_id: p_pool, race_id: p_race, vraag, opties, uitkomst: null };
      store.pool_eigen_vragen.push(v);
      bewaren();
      return { data: v.id, error: null };
    }
    const v = store.pool_eigen_vragen.find((x) => gelijk(x.id, p_vraag_id) && gelijk(x.pool_id, p_pool) && gelijk(x.race_id, p_race));
    if (!v) return fout('die vraag bestaat niet');
    Object.assign(v, { vraag, opties });
    store.pool_eigen_antwoorden = store.pool_eigen_antwoorden.filter((a) => !gelijk(a.vraag_id, v.id) || opties.includes(a.keuze));
    bewaren();
    return { data: v.id, error: null };
  },

  eigen_vraag_weghalen({ p_vraag } = {}) {
    const v = (store.pool_eigen_vragen ?? []).find((x) => gelijk(x.id, p_vraag));
    if (!v) return { data: null, error: { code: 'P0001', message: 'die vraag bestaat niet' } };
    if (!magBeheren(v.pool_id)) return { data: null, error: { code: 'P0001', message: 'alleen de poulebaas haalt een eigen vraag weg' } };
    store.pool_eigen_vragen = store.pool_eigen_vragen.filter((x) => x !== v);
    store.pool_eigen_antwoorden = (store.pool_eigen_antwoorden ?? []).filter((a) => !gelijk(a.vraag_id, v.id));
    bewaren();
    return { data: null, error: null };
  },

  eigen_vraag_uitkomst({ p_vraag, p_uitkomst } = {}) {
    const fout = (message) => ({ data: null, error: { code: 'P0001', message } });
    const v = (store.pool_eigen_vragen ?? []).find((x) => gelijk(x.id, p_vraag));
    if (!v) return fout('die vraag bestaat niet');
    if (!magBeheren(v.pool_id)) return fout('alleen de poulebaas vult de uitkomst in');
    if (eigenVraagOpen(v.race_id)) return fout('de uitkomst kan pas als de race begonnen is');
    if (p_uitkomst && !v.opties.includes(p_uitkomst)) return fout('de uitkomst is een van de antwoorden');
    v.uitkomst = p_uitkomst || null;
    bewaren();
    return { data: null, error: null };
  },

  eigen_antwoord_geven({ p_vraag, p_member, p_keuze } = {}) {
    const fout = (message) => ({ data: null, error: { code: 'P0001', message } });
    const v = (store.pool_eigen_vragen ?? []).find((x) => gelijk(x.id, p_vraag));
    if (!v) return fout('die vraag bestaat niet');
    if (!magVoorSpelerIn(p_member, v.pool_id)) return fout('je antwoordt alleen voor jezelf');
    if (!eigenVraagOpen(v.race_id)) return fout('de race is al begonnen');
    store.pool_eigen_antwoorden ??= [];
    store.pool_eigen_antwoorden = store.pool_eigen_antwoorden.filter((a) => !(gelijk(a.vraag_id, p_vraag) && gelijk(a.member_id, p_member)));
    if (p_keuze) {
      if (!v.opties.includes(p_keuze)) return fout('kies een van de antwoorden');
      store.pool_eigen_antwoorden.push({ vraag_id: p_vraag, member_id: p_member, keuze: p_keuze });
    }
    bewaren();
    return { data: null, error: null };
  },

  // Teams (premium), met de regels van schema.sql (test/teams.test.sql).
  poule_team_opslaan({ p_pool, p_team = null, p_naam } = {}) {
    const fout = (message) => ({ data: null, error: { code: 'P0001', message } });
    if (!magBeheren(p_pool)) return fout('alleen de poulebaas maakt teams');
    const poule = store.pools.find((p) => gelijk(p.id, p_pool));
    if (!(poule?.premium_tot && Date.parse(poule.premium_tot) > Date.now())) return fout('teams kunnen alleen met premium');
    const naam = String(p_naam ?? '').trim();
    if (naam.length < 1 || naam.length > 30) return fout('een team heeft een naam van 1 tot 30 tekens');
    store.pool_teams ??= [];
    const vanPoule = store.pool_teams.filter((t) => gelijk(t.pool_id, p_pool));
    if (vanPoule.some((t) => !gelijk(t.id, p_team) && t.naam.toLowerCase() === naam.toLowerCase())) {
      return fout('er is al een team met die naam');
    }
    if (!p_team) {
      if (vanPoule.length >= 20) return fout('een poule heeft hoogstens 20 teams');
      const team = { id: `team-${store.pool_teams.length + 1}-${Date.now()}`, pool_id: p_pool, naam };
      store.pool_teams.push(team);
      bewaren();
      return { data: team.id, error: null };
    }
    const team = vanPoule.find((t) => gelijk(t.id, p_team));
    if (!team) return fout('dat team bestaat niet');
    team.naam = naam;
    bewaren();
    return { data: team.id, error: null };
  },

  poule_team_weghalen({ p_team } = {}) {
    const team = (store.pool_teams ?? []).find((t) => gelijk(t.id, p_team));
    if (!team) return { data: null, error: { code: 'P0001', message: 'dat team bestaat niet' } };
    if (!magBeheren(team.pool_id)) return { data: null, error: { code: 'P0001', message: 'alleen de poulebaas haalt een team weg' } };
    store.pool_teams = store.pool_teams.filter((t) => t !== team);
    for (const m of store.pool_members) if (gelijk(m.team_id, p_team)) m.team_id = null;
    bewaren();
    return { data: null, error: null };
  },

  poule_team_kiezen({ p_member, p_team = null } = {}) {
    const fout = (message) => ({ data: null, error: { code: 'P0001', message } });
    const lid = store.pool_members.find((m) => gelijk(m.member_id, p_member));
    if (!lid) return fout('die speler bestaat niet');
    if (!(magVoorSpelerIn(p_member, lid.pool_id) || magBeheren(lid.pool_id))) return fout('je kiest alleen je eigen team');
    if (p_team) {
      const poule = store.pools.find((p) => gelijk(p.id, lid.pool_id));
      if (!(poule?.premium_tot && Date.parse(poule.premium_tot) > Date.now())) return fout('teams kunnen alleen met premium');
      if (!(store.pool_teams ?? []).some((t) => gelijk(t.id, p_team) && gelijk(t.pool_id, lid.pool_id))) {
        return fout('dat team hoort niet bij deze poule');
      }
    }
    lid.team_id = p_team || null;
    bewaren();
    return { data: null, error: null };
  },

  publiek_profiel({ p_code } = {}) {
    const lid = store.pool_members.find((m) => p_code && m.profiel_code === p_code && m.profiel);
    return { data: lid ? kopie(lid.profiel) : null, error: null };
  },

  poule_meedoen({ p_pool, p_naam } = {}) {
    const ik = wieBenIk();
    if (!ik) return GEEN_SESSIE;
    const poule = store.pools.find((p) => gelijk(p.id, p_pool));
    if (!poule) return { data: null, error: { message: 'die poule bestaat niet' } };
    const grens = poule.max_spelers ?? 500;
    if (store.pool_members.filter((m) => gelijk(m.pool_id, p_pool)).length >= grens) {
      return misbruik(`poule_vol:${grens}`, `Deze poule is vol: er mogen hoogstens ${grens} spelers in.`);
    }
    if (store.pool_members.filter((m) => gelijk(m.pool_id, p_pool) && gelijk(m.aangemaakt_door, ik)).length >= 10) {
      return misbruik('spelers_per_account', 'Vanaf dit account staan er al 10 spelers in deze poule.');
    }
    if (poule.is_public && naamVerboden(p_naam)) {
      return misbruik('woordfilter', 'Die naam kan niet in een openbare poule. Kies een andere.');
    }
    // Twee spelers op één account in één poule houdt de unieke sleutel tegen;
    // dan wordt de speler zonder account aangemaakt. Dat stond eerst in de
    // app en hoort in de database.
    const naam = String(p_naam ?? '').trim();
    if (!naam) return { data: null, error: { code: 'P0001', message: 'je hebt een naam nodig' } };
    if (naam.length > 60) return { data: null, error: { code: 'P0001', message: 'die naam is te lang (hoogstens 60 tekens)' } };
    if (store.pool_members.some((m) => gelijk(m.pool_id, p_pool)
        && String(m.display_name ?? '').trim().toLowerCase() === naam.toLowerCase())) {
      return { data: null, error: { code: 'P0001', message: 'die naam doet al mee in deze poule' } };
    }
    const bezet = ik && store.pool_members.some((m) =>
      gelijk(m.pool_id, p_pool) && gelijk(m.user_id, ik));
    const rij = { member_id: 'lid-' + (store.pool_members.length + 1),
                  pool_id: p_pool, display_name: naam, user_id: bezet ? null : ik, aangemaakt_door: ik };
    store.pool_members.push(rij);
    bewaren();
    return { data: kopie(rij), error: null };
  },

  poule_claim_speler({ p_member } = {}) {
    const ik = wieBenIk();
    if (!ik) return { data: null, error: null };
    const lid = store.pool_members.find((m) => gelijk(m.member_id, p_member));
    if (!lid || lid.user_id) return { data: null, error: null };
    if (store.pool_members.some((m) =>
        gelijk(m.pool_id, lid.pool_id) && gelijk(m.user_id, ik))) {
      return { data: null, error: null };
    }
    lid.user_id = ik;
    bewaren();
    return { data: kopie(lid), error: null };
  },

  poule_aanmaken({ p_naam, p_beschrijving = null, p_speler, p_vragen = [] } = {}) {
    const wie = wieBenIk();
    if (!wie) return GEEN_SESSIE;
    const dag = Date.now() - 864e5;
    if (store.aanmaak_log.filter((r) => gelijk(r.user_id, wie) && r.gemaakt > dag).length >= 5) {
      return misbruik('poules_per_dag', 'Je hebt vandaag al 5 poules aangemaakt. Morgen kan het weer.');
    }
    if (!String(p_naam ?? '').trim()) {
      return { data: null, error: { message: 'een poule heeft een naam nodig' } };
    }
    if (!String(p_speler ?? '').trim()) {
      return { data: null, error: { message: 'je hebt zelf ook een naam nodig' } };
    }
    if (String(p_speler).trim().length > 60) {
      return { data: null, error: { message: 'die naam is te lang (hoogstens 60 tekens)' } };
    }
    store.aanmaak_log.push({ user_id: wie, gemaakt: Date.now() });
    const poule = { id: 'pool-' + (store.pools.length + 1), name: String(p_naam).trim(),
                    beschrijving: String(p_beschrijving ?? '').trim() || null,
                    season: 2026, join_code: 'ABC123', owner_member_id: null,
                    autofill_vanaf: new Date().toISOString() };
    store.pools.push(poule);
    const ik = { member_id: 'lid-' + (store.pool_members.length + 1), pool_id: poule.id,
                 display_name: String(p_speler).trim(), user_id: wieBenIk(), aangemaakt_door: wieBenIk() };
    store.pool_members.push(ik);
    // In één keer de baas, zodat er geen moment is waarop een verse poule
    // geen eigenaar heeft en dus voor elk lid te beheren is.
    poule.owner_member_id = ik.member_id;
    for (const v of p_vragen ?? []) {
      store.pool_questions.push({ pool_id: poule.id, question_id: v });
    }
    bewaren();
    return { data: { poule: kopie(poule), ik: kopie(ik) }, error: null };
  },

  verwijder_mijn_account({ p_ook_spelers = false } = {}) {
    const ik = wieBenIk();
    if (!ik) return { data: null, error: { message: 'Er is geen account om te verwijderen.' } };
    const mijne = store.pool_members.filter((m) => gelijk(m.user_id, ik));
    let weg = 0;
    if (p_ook_spelers) {
      weg = mijne.length;
      // De poules waarvan ik de baas ben raken hun eigenaar kwijt; anders
      // wijst owner_member_id naar een speler die niet meer bestaat.
      for (const p of store.pools) {
        if (mijne.some((m) => gelijk(m.member_id, p.owner_member_id))) p.owner_member_id = null;
      }
      const ids = mijne.map((m) => String(m.member_id));
      store.answers = (store.answers ?? [])
        .filter((r) => !ids.includes(String(r.member_id)));
      store.pool_members = store.pool_members.filter((m) => !gelijk(m.user_id, ik));
    } else {
      for (const m of mijne) m.user_id = null;
    }
    store.auth_users = store.auth_users.filter((u) => u.id !== ik);
    store.otp = store.otp.filter((o) => o.user_id !== ik);
    bewaren();
    try { localStorage.removeItem(SESSIE); } catch { /* niets */ }
    return { data: weg, error: null };
  },
};

// ------------------------------------------------------------
//  Het beheer
//  Dezelfde functies als in schema.sql ("Beheer"), met dezelfde deur ervoor:
//  wie geen beheerder is krijgt 42501. test/beheer.test.sql legt de echte vast;
//  deze zijn er zodat test/beheer.test.mjs de beheerpagina kan nalopen.
// ------------------------------------------------------------
const dag = (d = new Date()) => d.toISOString().slice(0, 10);
// Net als in schema.sql: wie in site_beheerders staat. Er is geen adres meer
// dat je beheerder maakt (tot 20 oktober wel, in beheer_adres()).
const ikBenBeheerder = () => {
  const ik = wieBenIk();
  if (!ik) return false;
  return store.site_beheerders.some((id) => gelijk(id, ik));
};
const geenBeheerder = { data: null, error: { code: '42501', message: 'Alleen voor beheerders' } };
function accountsoort(userId) {
  if (!userId) return 'geen';
  const u = store.auth_users.find((x) => gelijk(x.id, userId));
  if (!u) return 'weg';
  if (u.is_anonymous) return 'anoniem';
  if ((u.identities ?? []).some((i) => i.provider === 'google')) return 'google';
  return u.email ? 'mail' : 'anoniem';
}
const beheer = (werk) => (args) => (ikBenBeheerder() ? werk(args ?? {}) : geenBeheerder);
const antwoordenVan = (f) => (store.answers ?? []).filter(f);
const laatste = (rijen) => rijen.map((a) => a.updated_at).filter(Boolean).sort().at(-1) ?? null;

Object.assign(functies, {
  ik_ben_beheerder() { return { data: ikBenBeheerder(), error: null }; },

  tel_bezoek({ p_pad } = {}) {
    // Net als schema.sql: alleen de twee schermen die de app telt.
    if (!['start', 'app'].includes(String(p_pad ?? ''))) return { data: null, error: null };
    const sleutel = `${dag()}|${p_pad}`;
    store.bezoeken[sleutel] = (store.bezoeken[sleutel] ?? 0) + 1;
    const ik = wieBenIk();
    if (ik && !store.actief.some((a) => a.dag === dag() && gelijk(a.user_id, ik))) {
      store.actief.push({ dag: dag(), user_id: ik });
    }
    bewaren();
    return { data: null, error: null };
  },

  beheer_overzicht: beheer(() => {
    const week = Date.now() - 7 * 864e5;
    const accounts = [...new Set(store.pool_members.map((m) => m.user_id).filter(Boolean))];
    const bezoeken = Object.entries(store.bezoeken);
    const sinds = (dagen) => dag(new Date(Date.now() - dagen * 864e5));
    return { data: {
      poules: store.pools.length,
      poules_openbaar: store.pools.filter((p) => p.is_public).length,
      spelers: store.pool_members.length,
      accounts: accounts.length,
      gekoppeld: accounts.filter((a) => ['mail', 'google'].includes(accountsoort(a))).length,
      inzendingen: (store.answers ?? []).length,
      inzendingen_7d: antwoordenVan((a) => !a.updated_at || Date.parse(a.updated_at) > week).length,
      nieuwe_spelers_7d: store.pool_members.filter((m) => !m.created_at || Date.parse(m.created_at) > week).length,
      actief_vandaag: store.actief.filter((a) => a.dag === dag()).length,
      actief_7d: new Set(store.actief.filter((a) => a.dag > sinds(7)).map((a) => a.user_id)).size,
      bezoeken_vandaag: bezoeken.filter(([k]) => k.startsWith(dag())).reduce((t, [, n]) => t + n, 0),
      bezoeken_7d: bezoeken.filter(([k]) => k.slice(0, 10) > sinds(7)).reduce((t, [, n]) => t + n, 0),
      meldingen: (store.push_abonnementen ?? []).length,
      profielen: store.pool_members.filter((m) => m.profiel_code).length,
      seizoen: 2026,
      laatste_sync: kopie(store.sync_runs.at(-1) ?? null),
    }, error: null };
  }),

  beheer_poules: beheer(() => ({ data: kopie(store.pools.map((p) => {
    const leden = store.pool_members.filter((m) => gelijk(m.pool_id, p.id));
    const antw = antwoordenVan((a) => gelijk(a.pool_id, p.id));
    return { ...p, spelers: leden.length, accounts: leden.filter((m) => m.user_id).length,
             eigenaar: leden.find((m) => gelijk(m.member_id, p.owner_member_id))?.display_name ?? null,
             inzendingen: antw.length, laatste_inzending: laatste(antw),
             vragen: (store.pool_questions ?? []).filter((q) => gelijk(q.pool_id, p.id)).length,
             vraaglijst: (() => {
               const ids = (store.pool_questions ?? []).filter((q) => gelijk(q.pool_id, p.id)).map((q) => q.question_id);
               const volgorde = (id) => store.questions.find((v) => v.id === id)?.volgorde ?? 0;
               return ids.length ? ids.sort((a, b) => volgorde(a) - volgorde(b)) : null;
             })() };
  })), error: null })),

  beheer_spelers: beheer(({ p_pool = null }) => ({ data: kopie(store.pool_members
    .filter((m) => !p_pool || gelijk(m.pool_id, p_pool))
    .map((m) => {
      const p = store.pools.find((x) => gelijk(x.id, m.pool_id));
      const u = store.auth_users.find((x) => gelijk(x.id, m.user_id));
      const antw = antwoordenVan((a) => gelijk(a.member_id, m.member_id));
      return { member_id: m.member_id, pool_id: m.pool_id, poule: p?.name ?? '', naam: m.display_name,
               aangemaakt: m.created_at ?? null, user_id: m.user_id ?? null, account: accountsoort(m.user_id),
               email: u?.email ?? null, laatst_ingelogd: null,
               poulebaas: !!p && gelijk(p.owner_member_id, m.member_id),
               inzendingen: antw.length, laatste_inzending: laatste(antw),
               profiel: !!m.profiel_code,
               meldingen: (store.push_abonnementen ?? []).filter((x) => gelijk(x.member_id, m.member_id)).length };
    })), error: null })),

  beheer_poule_bijwerken: beheer(({ p_pool, p_wijziging = {} }) => {
    const p = store.pools.find((x) => gelijk(x.id, p_pool));
    if (!p) return { data: null, error: { message: 'Die poule bestaat niet' } };
    if ('name' in p_wijziging && !String(p_wijziging.name ?? '').trim()) {
      return { data: null, error: { message: 'Een poule heeft een naam nodig' } };
    }
    const baas = p_wijziging.owner_member_id || null;
    if ('owner_member_id' in p_wijziging && baas
        && !store.pool_members.some((m) => gelijk(m.member_id, baas) && gelijk(m.pool_id, p.id))) {
      return { data: null, error: { message: 'Die speler zit niet in deze poule' } };
    }
    if ('name' in p_wijziging) p.name = String(p_wijziging.name).trim();
    if ('beschrijving' in p_wijziging) p.beschrijving = String(p_wijziging.beschrijving ?? '').trim() || null;
    if ('is_public' in p_wijziging) p.is_public = !!p_wijziging.is_public;
    if ('max_spelers' in p_wijziging) {
      const n = Number(p_wijziging.max_spelers);
      if (!Number.isInteger(n) || n < 1 || n > 10000) {
        return { data: null, error: { code: '23514', message: 'new row for relation "pools" violates check constraint "pools_max_spelers"' } };
      }
      p.max_spelers = n;
    }
    if ('owner_member_id' in p_wijziging) p.owner_member_id = baas;
    // Zet een test globalThis.__zonderPremium, dan doet dit alsof schema.sql
    // in Supabase nog van voor premium is: de sleutel valt stil weg en de rij
    // komt terug zonder premiumkolommen (test/beheer.test.mjs).
    if (globalThis.__zonderPremium) {
      bewaren();
      const { premium_tot, merk_kleur, merk_logo, sponsor_tekst, sponsor_url, ...oud } = kopie(p);
      return { data: oud, error: null };
    }
    if ('premium_tot' in p_wijziging) p.premium_tot = p_wijziging.premium_tot || null;
    bewaren();
    return { data: kopie(p), error: null };
  }),

  beheer_poule_verwijderen: beheer(({ p_pool }) => {
    if (!store.pools.some((x) => gelijk(x.id, p_pool))) return { data: null, error: { message: 'Die poule bestaat niet' } };
    store.pools = store.pools.filter((x) => !gelijk(x.id, p_pool));
    for (const t of ['pool_members', 'answers', 'jokers', 'push_abonnementen', 'pool_questions']) {
      store[t] = (store[t] ?? []).filter((r) => !gelijk(r.pool_id, p_pool));
    }
    bewaren();
    return { data: null, error: null };
  }),

  beheer_speler_bijwerken: beheer(({ p_member, p_naam }) => {
    const m = store.pool_members.find((x) => gelijk(x.member_id, p_member));
    if (!String(p_naam ?? '').trim()) return { data: null, error: { message: 'Een speler heeft een naam nodig' } };
    if (!m) return { data: null, error: { message: 'Die speler bestaat niet' } };
    m.display_name = String(p_naam).trim();
    bewaren();
    return { data: null, error: null };
  }),

  beheer_speler_losmaken: beheer(({ p_member }) => {
    const m = store.pool_members.find((x) => gelijk(x.member_id, p_member));
    if (!m) return { data: null, error: { message: 'Die speler bestaat niet' } };
    m.user_id = null;
    bewaren();
    return { data: null, error: null };
  }),

  beheer_speler_verwijderen: beheer(({ p_member }) => {
    if (!store.pool_members.some((x) => gelijk(x.member_id, p_member))) {
      return { data: null, error: { message: 'Die speler bestaat niet' } };
    }
    for (const p of store.pools) if (gelijk(p.owner_member_id, p_member)) p.owner_member_id = null;
    store.pool_members = store.pool_members.filter((x) => !gelijk(x.member_id, p_member));
    for (const t of ['answers', 'jokers', 'push_abonnementen']) {
      store[t] = (store[t] ?? []).filter((r) => !gelijk(r.member_id, p_member));
    }
    bewaren();
    return { data: null, error: null };
  }),

  beheer_race_bijwerken: beheer(({ p_race, p_wijziging = {} }) => {
    const r = store.races.find((x) => gelijk(x.id, p_race));
    if (!r) return { data: null, error: { message: 'Die race bestaat niet' } };
    if ('afgelast' in p_wijziging) r.afgelast = !!p_wijziging.afgelast;
    for (const s of ['quali', 'race', 'sprint']) {
      const veld = `${s}_result`;
      if (!(veld in p_wijziging)) continue;
      const lijst = p_wijziging[veld];
      if (Array.isArray(lijst) && lijst.length > 30) {
        return { data: null, error: { message: 'Een uitslag heeft hooguit dertig plekken' } };
      }
      r[veld] = Array.isArray(lijst) && lijst.length ? lijst.map(String) : null;
      r[`${s}_handmatig`] = !!p_wijziging.handmatig && !!r[veld];
    }
    bewaren();
    return { data: kopie(r), error: null };
  }),

  // De coureurlijst van een seizoen zetten (schema.sql). Hier alleen de
  // controle op de invoer en welke races hem krijgen; het omzetten van
  // antwoorden staat in test/coureurlijsten.test.sql, tegen een echte database.
  beheer_coureurs_zetten: beheer(({ p_seizoen, p_drivers = [] }) => {
    const fout = (message) => ({ data: null, error: { message } });
    if (!Array.isArray(p_drivers) || p_drivers.length < 2 || p_drivers.length > 30) {
      return fout('Een lijst van 2 tot 30 coureurs, graag');
    }
    for (const d of p_drivers) {
      if (!/^[0-9]{1,2}$/.test(d.nr ?? '')) return fout(`Startnummer "${d.nr ?? ''}" klopt niet: 1 tot 99`);
      if (!/^[A-Za-z]{3}$/.test(d.code ?? '')) return fout(`Afkorting "${d.code ?? ''}" klopt niet: drie letters`);
    }
    if (new Set(p_drivers.map((d) => Number(d.nr))).size !== p_drivers.length) return fout('Een startnummer staat er twee keer in');
    const nu = Date.now();
    const doel = store.races.filter((r) => r.season === Number(p_seizoen) && !r.afgelast
      && ['geleend', 'beheer'].includes(r.lijst_herkomst)
      && Math.min(...[r.deadline_sprint, r.deadline_quali, r.deadline_race].filter(Boolean).map(Date.parse)) > nu);
    if (!doel.length) return fout(`Geen race in ${p_seizoen} met een geleende lijst waarvan het weekend nog moet beginnen`);
    const lijst = p_drivers.map((d) => ({ nr: String(Number(d.nr)), code: d.code.toUpperCase(),
      naam: d.naam.trim(), team: d.team.trim(), kleur: '#888888' }));
    for (const r of doel) Object.assign(r, { drivers: lijst, lijst_herkomst: 'beheer' });
    store.coureurs_gezet = { p_seizoen, p_drivers };
    bewaren();
    return { data: { races: doel.length, omgezet: 3, meldingen: ['Fernando Alonso (#14) staat niet meer in de lijst'] }, error: null };
  }),

  beheer_sync: beheer(() => ({ data: kopie([...store.sync_runs].reverse().slice(0, 50)), error: null })),

  beheer_statistieken: beheer(() => {
    const dagen = Array.from({ length: 30 }, (_, i) => dag(new Date(Date.now() - (29 - i) * 864e5)));
    const perSoort = {};
    for (const m of store.pool_members) perSoort[accountsoort(m.user_id)] = (perSoort[accountsoort(m.user_id)] ?? 0) + 1;
    const seizoensvragen = new Set(store.questions.filter((q) => q.sessie === 'seizoen').map((q) => q.id));
    return { data: {
      seizoen: 2026,
      spelers_per_week: [],
      poules_per_week: [],
      bezoeken_per_dag: dagen.map((d) => ({
        dag: d,
        bezoeken: Object.entries(store.bezoeken).filter(([k]) => k.startsWith(d)).reduce((t, [, n]) => t + n, 0),
        actief: store.actief.filter((a) => a.dag === d).length,
      })),
      inzendingen_per_race: store.races.filter((r) => r.season === 2026
          && Date.parse(r.deadline_quali ?? r.deadline_race ?? 0) < Date.now() + 7 * 864e5)
        .map((r) => ({ race_id: r.id, ronde: r.round, naam: r.name,
          inzenders: new Set(antwoordenVan((a) => gelijk(a.race_id, r.id) && !seizoensvragen.has(a.question_id))
            .map((a) => String(a.member_id))).size,
          spelers: store.pool_members.length })),
      accounts: perSoort,
    }, error: null };
  }),
});

// Een test kan de volgende schrijfactie laten mislukken met een fout naar
// keuze, om te zien wat een speler dan te lezen krijgt
// (test/gewone-taal.test.mjs). Eén keer: daarna werkt alles weer.
//
// Moet de fout een paginawissel overleven (de eerste aanroep ná het laden),
// dan zet de test hem in sessionStorage onder `nabootsing:volgendeFout`.
function volgendeFout() {
  let fout = globalThis.__volgendeFout;
  if (fout) globalThis.__volgendeFout = null;
  else {
    try {
      const bewaard = sessionStorage.getItem('nabootsing:volgendeFout');
      if (bewaard) { sessionStorage.removeItem('nabootsing:volgendeFout'); fout = JSON.parse(bewaard); }
    } catch { /* niets */ }
  }
  return fout ? { data: null, error: fout } : null;
}

// Hoe vaak elke functie is aangeroepen. test/geheim.test.mjs telt er het
// opnieuw ophalen na een deadline mee.
globalThis.__rpcTeller = {};

async function rpc(naam, argumenten) {
  globalThis.__rpcTeller[naam] = (globalThis.__rpcTeller[naam] ?? 0) + 1;
  const fout = volgendeFout();
  if (fout) return fout;
  const fn = functies[naam];
  if (!fn) {
    return { data: null, error: { code: 'PGRST202',
      message: `Could not find the function public.${naam} in the schema cache` } };
  }
  return fn(argumenten ?? {});
}

// ---- opslag (Supabase Storage), alleen de bucket poulelogo -----------------
// De regels van schema.sql: hoogstens 200 kB, png, jpeg of webp, en alleen in
// de map van een poule waar jij poulebaas van bent en die premium heeft
// (mag_logo_zetten). Een bestand wordt een data-url in de "database", zodat
// het na herladen nog te zien is; getPublicUrl geeft die terug.
const LOGO_SOORTEN = ['image/png', 'image/jpeg', 'image/webp'];
function magLogoZetten(pad) {
  const map = String(pad).split('/')[0];
  const p = store.pools.find((x) => gelijk(x.id, map));
  return !!p && !!p.premium_tot && Date.parse(p.premium_tot) > Date.now() && magBeheren(p.id);
}
const leesAlsUrl = (bestand) => (typeof bestand === 'string' ? Promise.resolve(bestand)
  : new Promise((klaar, mis) => { const r = new FileReader(); r.onload = () => klaar(r.result); r.onerror = mis; r.readAsDataURL(bestand); }));
globalThis.__opslagTeller = { upload: 0, remove: 0 };
const storage = {
  from(bucket) {
    return {
      async upload(pad, bestand, { contentType } = {}) {
        globalThis.__opslagTeller.upload++;
        const fout = volgendeFout();
        if (fout) return fout;
        const soort = contentType ?? bestand?.type;
        if (bucket !== 'poulelogo') return { data: null, error: { statusCode: '404', message: 'Bucket not found' } };
        if ((bestand?.size ?? 0) > 204800) return { data: null, error: { statusCode: '413', message: 'The object exceeded the maximum allowed size' } };
        if (!LOGO_SOORTEN.includes(soort)) return { data: null, error: { statusCode: '415', message: `mime type ${soort} is not supported` } };
        if (!magLogoZetten(pad)) return { data: null, error: { statusCode: '403', message: 'new row violates row-level security policy' } };
        store.opslag ??= {};
        if (store.opslag[pad]) return { data: null, error: { statusCode: '409', message: 'The resource already exists' } };
        store.opslag[pad] = await leesAlsUrl(bestand);
        bewaren();
        return { data: { path: pad }, error: null };
      },
      async remove(paden) {
        globalThis.__opslagTeller.remove++;
        const weg = paden.filter((pad) => store.opslag?.[pad] && magLogoZetten(pad));
        for (const pad of weg) delete store.opslag[pad];
        bewaren();
        return { data: weg.map((name) => ({ name })), error: null };
      },
      getPublicUrl(pad) {
        return { data: { publicUrl: store.opslag?.[pad] ?? `https://opslag.nabootsing/${bucket}/${pad}` } };
      },
    };
  },
};

export const createClient = () => ({ from: maakQuery, auth, rpc, storage });
