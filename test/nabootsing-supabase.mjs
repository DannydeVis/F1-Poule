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
      fastest_lap:null, fastest_pitstop:null, safety_cars:null, rode_vlag:null },
    { id:2, season:2026, round:2, name:'Shanghai', drivers:DRIVERS,
      // kwalificatie dicht, race nog open: hier moet bewaren blijven werken
      deadline_quali:uur(-2), deadline_race:uur(48), quali_result:null, race_result:null,
      fastest_lap:null, fastest_pitstop:null, safety_cars:null, rode_vlag:null },
    { id:3, season:2026, round:3, name:'Suzuka', drivers:null,
      // geen deelnemerslijst: de app hoort uit te leggen dat die vanzelf komt
      deadline_quali:uur(72), deadline_race:uur(96), quali_result:null, race_result:null,
      fastest_lap:null, fastest_pitstop:null, safety_cars:null, rode_vlag:null },
  ],
  predictions: [],
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
  ],
  // Leeg: een poule zonder eigen keuze doet aan alles mee.
  pool_questions: [],
  answers: [],
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
const bewaren = () => { try { sessionStorage.setItem(BEWAAR, JSON.stringify(store)); } catch { /* niets */ } };

// Wordt door ontbrekende-sleutel.test.mjs leeggemaakt om een database zonder
// unieke sleutel na te bootsen.
const UNIEK = {
  predictions: ['pool_id', 'race_id', 'member_id'],
  answers:     ['pool_id', 'race_id', 'member_id', 'question_id'],
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
// Een filter is [kolom, waarde] of [kolom, lijst, 'in'].
const past = (rij, [k, v, op]) =>
  op === 'in' ? (v ?? []).some((x) => gelijk(rij[k], x)) : gelijk(rij[k], v);

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

// Postgres weigert een verboden insert met 42501; een verboden update of
// delete raakt gewoon nul rijen en geeft géén fout. Dat verschil is precies
// wat index.html moet opvangen, dus bootst de nabootsing het na.
const geweigerd = { data: null, error: { code: '42501',
  message: 'new row violates row-level security policy' } };

function magSchrijven(tabel, rij) {
  if (tabel === 'answers' || tabel === 'predictions') return magVoorSpeler(rij.member_id);
  // Een speler inschrijven op andermans account kan niet.
  if (tabel === 'pool_members' && rij.user_id) return gelijk(rij.user_id, wieBenIk());
  if (tabel === 'pool_questions') return magBeheren(rij.pool_id);
  return true;
}

// Welke bestaande rijen mag ik überhaupt aanraken?
function magRaken(tabel, rij) {
  if (tabel === 'answers' || tabel === 'predictions') return magVoorSpeler(rij.member_id);
  if (tabel === 'pool_members') {
    // Claimen wat van niemand is, je eigen speler loslaten, of — als
    // poulebaas — een speler losmaken die aan het verkeerde account hangt.
    return !rij.user_id || gelijk(rij.user_id, wieBenIk()) || magBeheren(rij.pool_id);
  }
  if (tabel === 'pool_questions') return magBeheren(rij.pool_id);
  if (tabel === 'pools') return magBeheren(rij.id);
  return true;
}

function uitvoeren(tabel, q) {
  const rijen = store[tabel];
  if (!rijen) {
    return { data: null, error: { code: '42P01', message: `relation "${tabel}" does not exist` } };
  }

  if (q._insert) {
    if (q._insert.some((r) => !magSchrijven(tabel, r))) return geweigerd;
    if (tabel === 'pool_members'
        && q._insert.some((r) => botstMetAccount(rijen, r, null))) return dubbelAccount;
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
    return q._selectNa ? { data: kopie(doel), error: null } : { data: null, error: null };
  }

  const uit = kopie(rijen.filter((r) => q._filters.every((f) => past(r, f))));
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
                   is_anonymous: true, email: null, new_email: null };
    store.auth_users.push(user);
    bewaren();
    return { data: zetSessie(user), error: null };
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
  // De laatst verstuurde link, precies zoals hij in de mail zou staan.
  laatsteLink() {
    const laatste = store.otp[store.otp.length - 1];
    if (!laatste) return null;
    const basis = laatste.terug || (location.origin + location.pathname);
    return basis + (basis.includes('?') ? '&' : '?') + 'code=' + laatste.code;
  },
  aantalVerstuurd() { return store.otp.length; },
};

export const createClient = () => ({ from: maakQuery, auth });
