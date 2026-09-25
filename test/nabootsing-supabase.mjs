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
// Het beheer: wie beheerder is (een lijst account-id's, in het echt de tabel
// site_beheerders), het logboek van de sync en de bezoekersteller.
store.site_beheerders ??= [];
store.sync_runs ??= [];
store.bezoeken ??= {};
store.actief ??= [];
const bewaren = () => { try { sessionStorage.setItem(BEWAAR, JSON.stringify(store)); } catch { /* niets */ } };

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

// mag_voor_speler(): mijn eigen speler, of eentje die van niemand is.
function magVoorSpeler(memberId) {
  const lid = store.pool_members.find((l) => gelijk(l.member_id, memberId));
  if (!lid) return true;   // bestaat niet: de foreign key mag erover klagen
  return !lid.user_id || gelijk(lid.user_id, wieBenIk());
}

// mag_beheren(): de poulebaas, of elk lid als de poule geen eigenaar heeft.
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

// De leespolicies uit schema.sql, in dezelfde volgorde. Een rij die hier
// false krijgt bestaat voor deze sessie simpelweg niet -- precies wat RLS
// doet, en nadrukkelijk geen foutmelding.
function magLezen(tabel, rij) {
  if (tabel === 'pools')          return !!rij.is_public || isLid(rij.id);
  if (tabel === 'pool_members')   return gelijk(rij.user_id, wieBenIk()) || isLid(rij.pool_id);
  if (tabel === 'answers' || tabel === 'pool_questions') return isLid(rij.pool_id);
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
    return magVoorSpeler(rij.member_id);
  }
  // Een speler inschrijven op andermans account kan niet.
  if (tabel === 'pool_members' && rij.user_id) return gelijk(rij.user_id, wieBenIk());
  if (tabel === 'pool_questions') return magBeheren(rij.pool_id);
  return true;
}

// Welke bestaande rijen mag ik überhaupt aanraken?
function magRaken(tabel, rij) {
  if (tabel === 'answers' || tabel === 'jokers'
      || tabel === 'push_abonnementen') {
    return magVoorSpeler(rij.member_id);
  }
  if (tabel === 'pool_members') {
    // Claimen wat van niemand is, je eigen speler loslaten, of — als
    // poulebaas — een speler losmaken die aan het verkeerde account hangt.
    return !rij.user_id || gelijk(rij.user_id, wieBenIk()) || magBeheren(rij.pool_id);
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
        // ON CONFLICT DO UPDATE SET <alleen de meegestuurde kolommen>
        Object.assign(bestaand, kopie(r));
        return kopie(bestaand);
      }
      const rij = { quali_top10: null, race_top10: null, ...kopie(r) };
      rijen.push(rij);
      return kopie(rij);
    });
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

const auth = {
  async getSession() { return { data: { session: huidigeSessie() }, error: null }; },
  async getUser() {
    const s = huidigeSessie();
    return { data: { user: s?.user ?? null }, error: s ? null : { message: 'geen sessie' } };
  },
  async signInAnonymously() {
    const bestaand = huidigeSessie();
    if (bestaand) return { data: bestaand, error: null };
    const user = { id: 'account-' + (store.auth_users.length + 1),
                   is_anonymous: true, email: null, new_email: null,
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
  // test in met __mail.googleAls().
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
    bewaren();
    return { data: {}, error: null };
  },

  // Een mailadres aan het huidige account hangen. Net als bij Supabase komt
  // het adres in `new_email` en pas in `email` als er op de link geklikt is.
  async updateUser({ email }, opties = {}) {
    const sessie = huidigeSessie();
    if (!sessie) return { data: null, error: { message: 'geen sessie' } };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email ?? ''))) {
      return { data: null, error: { code: 'validation_failed', message: 'Unable to validate email address: invalid format' } };
    }
    const bezet = store.auth_users.some((u) =>
      u.id !== sessie.user.id && (gelijk(u.email, email) || gelijk(u.new_email, email)));
    if (bezet) {
      return { data: null, error: { code: 'email_exists',
        message: 'A user with this email address has already been registered' } };
    }
    const user = store.auth_users.find((u) => u.id === sessie.user.id);
    user.new_email = email;
    store.otp.push({ code: nieuweSleutel(), user_id: user.id, email,
                     bevestigt: true, terug: opties.emailRedirectTo ?? '' });
    bewaren();
    zetSessie(user);
    return { data: { user: kopie(user) }, error: null };
  },

  // Een inloglink naar een bestaand account. shouldCreateUser:false betekent
  // dat een onbekend adres een fout geeft in plaats van een leeg account.
  async signInWithOtp({ email, options = {} }) {
    const user = store.auth_users.find((u) => gelijk(u.email, email));
    if (!user) {
      if (options.shouldCreateUser === false) {
        return { data: null, error: { code: 'otp_disabled',
          message: 'Signups not allowed for otp' } };
      }
      return { data: null, error: { message: 'onbekend adres' } };
    }
    store.otp.push({ code: nieuweSleutel(), user_id: user.id, email,
                     bevestigt: false, terug: options.emailRedirectTo ?? '' });
    bewaren();
    return { data: {}, error: null };
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
  aantalVerstuurd() { return store.otp.length; },
  // Met welk Google-account de nabootsing inlogt. Zo kan een test twee
  // verschillende mensen naspelen.
  googleAls(adres) { store.google_als = adres; bewaren(); },
};

// ------------------------------------------------------------
//  rpc
//  Eén functie maar: verwijder_mijn_account(). Hij hoort hier omdat het
//  verschil tussen de twee smaken — wel of niet je spelers mee — precies is
//  wat het scherm belooft, en dat moet een browsertest kunnen nalopen.
// ------------------------------------------------------------
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
      }));
    return { data: {
      poule: kopie(poule),
      leden: kopie(leden),
      antwoorden: kopie((store.answers ?? []).filter((a) => gelijk(a.pool_id, poule.id))),
      poulevragen: (store.pool_questions ?? [])
        .filter((r) => gelijk(r.pool_id, poule.id)).map((r) => r.question_id),
      jokers: (store.jokers ?? []).filter((j) => gelijk(j.pool_id, poule.id))
        .map(({ race_id, member_id }) => ({ race_id, member_id })),
    }, error: null };
  },

  publiek_profiel({ p_code } = {}) {
    const lid = store.pool_members.find((m) => p_code && m.profiel_code === p_code && m.profiel);
    return { data: lid ? kopie(lid.profiel) : null, error: null };
  },

  poule_meedoen({ p_pool, p_naam } = {}) {
    const poule = store.pools.find((p) => gelijk(p.id, p_pool));
    if (!poule) return { data: null, error: { message: 'die poule bestaat niet' } };
    const ik = wieBenIk();
    // Twee spelers op één account in één poule houdt de unieke sleutel tegen;
    // dan wordt de speler zonder account aangemaakt. Dat stond eerst in de
    // app en hoort in de database.
    const bezet = ik && store.pool_members.some((m) =>
      gelijk(m.pool_id, p_pool) && gelijk(m.user_id, ik));
    const rij = { member_id: 'lid-' + (store.pool_members.length + 1),
                  pool_id: p_pool, display_name: p_naam, user_id: bezet ? null : ik };
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
    if (!String(p_naam ?? '').trim()) {
      return { data: null, error: { message: 'een poule heeft een naam nodig' } };
    }
    if (!String(p_speler ?? '').trim()) {
      return { data: null, error: { message: 'je hebt zelf ook een naam nodig' } };
    }
    const poule = { id: 'pool-' + (store.pools.length + 1), name: String(p_naam).trim(),
                    beschrijving: String(p_beschrijving ?? '').trim() || null,
                    season: 2026, join_code: 'ABC123', owner_member_id: null };
    store.pools.push(poule);
    const ik = { member_id: 'lid-' + (store.pool_members.length + 1), pool_id: poule.id,
                 display_name: String(p_speler).trim(), user_id: wieBenIk() };
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
const ikBenBeheerder = () => !!wieBenIk() && store.site_beheerders.some((id) => gelijk(id, wieBenIk()));
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
    if (!/^[a-z0-9/_-]{1,40}$/.test(String(p_pad ?? ''))) return { data: null, error: null };
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
             vragen: (store.pool_questions ?? []).filter((q) => gelijk(q.pool_id, p.id)).length };
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
    if ('owner_member_id' in p_wijziging) p.owner_member_id = baas;
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
function volgendeFout() {
  const fout = globalThis.__volgendeFout;
  if (!fout) return null;
  globalThis.__volgendeFout = null;
  return { data: null, error: fout };
}

async function rpc(naam, argumenten) {
  const fout = volgendeFout();
  if (fout) return fout;
  const fn = functies[naam];
  if (!fn) {
    return { data: null, error: { code: 'PGRST202',
      message: `Could not find the function public.${naam} in the schema cache` } };
  }
  return fn(argumenten ?? {});
}

export const createClient = () => ({ from: maakQuery, auth, rpc });
