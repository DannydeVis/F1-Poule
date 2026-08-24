// Minimale nabootsing van supabase-js, genoeg voor de aanroepen in
// index.html. De predictions-tabel heeft net als Postgres een unieke sleutel
// op (pool_id, race_id, member_id), zodat upsert zich hier hetzelfde gedraagt
// als in de echte database.

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

const store = {
  pools: [{ id:'pool-1', name:'Vrijdagmiddagpoule', join_code:'RTM026', season:2026 }],
  pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny' }],
  races: [
    // race_id is bewust een getal: zo controleren we ook dat 3 en '3'
    // niet uit elkaar lopen bij het terugzoeken van een voorspelling.
    { id:1, season:2026, round:1, name:'Melbourne', drivers:DRIVERS,
      deadline_quali:uur(24), deadline_race:uur(48), quali_result:null, race_result:null },
    { id:2, season:2026, round:2, name:'Shanghai', drivers:DRIVERS,
      // kwalificatie dicht, race nog open: hier moet bewaren blijven werken
      deadline_quali:uur(-2), deadline_race:uur(48), quali_result:null, race_result:null },
    { id:3, season:2026, round:3, name:'Suzuka', drivers:null,
      // geen deelnemerslijst: de app hoort uit te leggen dat sync.html moet draaien
      deadline_quali:uur(72), deadline_race:uur(96), quali_result:null, race_result:null },
  ],
  predictions: [],
};

// Wordt door ontbrekende-sleutel.test.mjs leeggemaakt om een database zonder
// unieke sleutel na te bootsen.
const UNIEK = { predictions: ['pool_id', 'race_id', 'member_id'] };

// Alles wat het geheugen in gaat wordt gekopieerd, zodat de pagina nooit per
// ongeluk dezelfde array-instantie deelt met de "database".
const kopie = (v) => JSON.parse(JSON.stringify(v));
const gelijk = (a, b) => String(a) === String(b);

globalThis.__db = store;

function uitvoeren(tabel, q) {
  const rijen = store[tabel];
  if (!rijen) {
    return { data: null, error: { code: '42P01', message: `relation "${tabel}" does not exist` } };
  }

  if (q._insert) {
    const nieuw = q._insert.map((r) => {
      const rij = kopie(r);
      if (tabel === 'pool_members') rij.member_id = 'lid-' + (rijen.length + 1);
      if (tabel === 'pools') { rij.id = 'pool-' + (rijen.length + 1); rij.join_code = 'ABC123'; }
      rijen.push(rij);
      return kopie(rij);
    });
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
    return q._selectNa ? { data: uit, error: null } : { data: null, error: null };
  }

  const uit = kopie(rijen.filter((r) => q._filters.every(([k, v]) => gelijk(r[k], v))));
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
    _filters: [], _single: false, _selectNa: false,
    select() { if (q._insert || q._upsert) q._selectNa = true; return q; },
    eq(k, v) { q._filters.push([k, v]); return q; },
    order() { return q; },
    single() { q._single = true; return q; },
    insert(r) { q._insert = Array.isArray(r) ? r : [r]; return q; },
    upsert(r, o) { q._upsert = Array.isArray(r) ? r : [r]; q._opties = o; return q; },
    then(res, rej) { return Promise.resolve().then(() => uitvoeren(tabel, q)).then(res, rej); },
  };
  return q;
}

export const createClient = () => ({ from: maakQuery });
