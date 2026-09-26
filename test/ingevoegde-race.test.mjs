// Een race die er halverwege het seizoen bij komt, nagespeeld met de échte sync.
//
// Danny, 26 september 2026: "Check even openf1 want 2-4 oktober is de race van
// Bahrein in Malaysia en die staat er nog niet in." Bahrein werd in april
// afgelast en verplaatst naar Sepang, op 4 oktober, tussen Baku en Marina Bay.
// OpenF1 had hem al weken als "FORMULA 1 GULF AIR BAHRAIN GRAND PRIX IN
// MALAYSIA 2026", met meeting_key 1308: hoger dan alle andere races van het
// seizoen, want hij kwam er later bij. De sync hield hem daarom voor een
// testrecord en liet hem weg.
//
// Wat hier vastligt:
//   1. Zo'n race komt gewoon in de kalender, ook met een meeting_key die buiten
//      de volgorde valt.
//   2. Op zijn plek: tussen Baku en Marina Bay, niet als laatste ronde. De app
//      rekent overal op rondes in kalendervolgorde.
//   3. De races erachter schuiven een ronde op, elk met zijn eigen rij, dus met
//      de voorspellingen die eraan hangen. Nergens tegelijk twee rijen met
//      hetzelfde nummer (de nabootsing weigert dat, net als de database).
//   4. Een afgelaste race blijft afgelast.
//   5. Nog een keer draaien verandert niets, en een race ná de laatste krijgt
//      gewoon het volgende nummer zonder dat er iets schuift.
//   6. De agenda en het logboek zeggen het.
//
// De nabootsing is die van test/jaarwisseling.test.mjs: OpenF1 onder /v1,
// PostgREST onder /rest/v1, en de sync als los proces.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('een race die er halverwege bij komt');

const DAG = 24 * 3600 * 1000;
const over = (dagen) => new Date(Date.now() + dagen * DAG).toISOString();

// ---- de nagebootste wereld ------------------------------------------------

const wereld = { races: [], answers: [], pools: [], sessies: [], uitslagen: {}, sync_runs: [] };
let volgendId = 100;

// Een weekend bij OpenF1: kwalificatie een dag voor de race, zelfde meeting.
function weekend(meeting, plek, dagen) {
  const basis = { meeting_key: meeting, year: 2026, location: plek,
                  circuit_short_name: plek, country_name: 'Ergens' };
  return [
    { ...basis, session_key: meeting * 10 + 1, session_name: 'Qualifying', date_start: over(dagen - 1) },
    { ...basis, session_key: meeting * 10 + 2, session_name: 'Race', date_start: over(dagen) },
  ];
}
// Een race zoals hij na een eerdere sync in de database staat.
function rij(id, round, meeting, plek, dagen, extra = {}) {
  return {
    id, season: 2026, round, name: plek, country: 'Ergens',
    race_key: meeting * 10 + 2, quali_key: meeting * 10 + 1, sprint_key: null,
    deadline_quali: over(dagen - 1), deadline_race: over(dagen), deadline_sprint: null,
    afgelast: false, drivers: null, quali_result: null, race_result: null, sprint_result: null,
    fastest_lap: null, fastest_pitstop: null, safety_cars: null, rode_vlag: null, ...extra,
  };
}

// ---- de server ------------------------------------------------------------------

const filters = (zoek) => [...zoek.entries()]
  .filter(([k]) => !['order', 'select', 'limit', 'on_conflict'].includes(k))
  .map(([veld, uitdr]) => {
    const [op, ...rest] = uitdr.split('.');
    const waarde = rest.join('.');
    if (op === 'eq') return (r) => String(r[veld]) === waarde;
    if (op === 'in') {
      const lijst = waarde.replace(/^\(|\)$/g, '').split(',');
      return (r) => lijst.includes(String(r[veld]));
    }
    if (op === 'is') return (r) => String(r[veld] ?? 'null') === waarde;
    throw new Error(`filter ${veld}=${uitdr} kent de nabootsing niet`);
  });

// De unieke sleutel races_seizoen_ronde uit schema.sql. Een schrijfactie die
// hem breekt wordt teruggedraaid en geweigerd, zoals Postgres dat doet.
const botsing = () => {
  const gezien = new Set();
  for (const r of wereld.races) {
    const k = `${r.season}|${r.round}`;
    if (gezien.has(k)) return k;
    gezien.add(k);
  }
  return null;
};
const weigeringen = [];

function postgrest(req, res, tabel, zoek, body) {
  const rijen = wereld[tabel];
  if (!rijen) { res.writeHead(404); return res.end(`geen tabel ${tabel}`); }
  const past = (r) => filters(zoek).every((f) => f(r));
  const stuur = (data) => { res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(data === null ? '' : JSON.stringify(data)); };
  const weiger = (k) => { weigeringen.push(k); res.writeHead(409); res.end(`duplicate key ${k}`); };
  if (req.method === 'GET') {
    let uit = rijen.filter(past);
    const volgorde = zoek.get('order');
    if (volgorde) {
      const velden = volgorde.split(',');
      uit = [...uit].sort((a, b) => {
        for (const v of velden) if (a[v] !== b[v]) return a[v] < b[v] ? -1 : 1;
        return 0;
      });
    }
    if (zoek.get('limit')) uit = uit.slice(0, Number(zoek.get('limit')));
    return stuur(uit);
  }
  if (req.method === 'POST' && tabel !== 'races') {
    rijen.push(...[].concat(JSON.parse(body)));
    return stuur(null);
  }
  if (req.method === 'POST') {
    const voor = JSON.stringify(wereld.races);
    for (const nieuw of JSON.parse(body)) {
      const oud = rijen.find((r) => r.season === nieuw.season && r.round === nieuw.round);
      if (oud) Object.assign(oud, nieuw);
      else rijen.push({ id: volgendId++, afgelast: false, drivers: null, quali_result: null,
                        race_result: null, sprint_result: null, fastest_lap: null,
                        fastest_pitstop: null, safety_cars: null, rode_vlag: null, ...nieuw });
    }
    const k = botsing();
    if (k) { wereld.races = JSON.parse(voor); return weiger(k); }
    return stuur(null);
  }
  if (req.method === 'PATCH') {
    const voor = JSON.stringify(wereld[tabel]);
    const geraakt = rijen.filter(past);
    for (const r of geraakt) Object.assign(r, JSON.parse(body));
    const k = tabel === 'races' && botsing();
    if (k) { wereld.races = JSON.parse(voor); return weiger(k); }
    return stuur(/return=representation/.test(req.headers.prefer ?? '') ? geraakt : null);
  }
  if (req.method === 'DELETE') {
    wereld[tabel] = rijen.filter((r) => !past(r));
    return stuur(null);
  }
  res.writeHead(405); res.end();
}

function openf1(res, pad, zoek) {
  const stuur = (data) => { res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(data)); };
  const niet = () => { res.writeHead(404); res.end('[]'); };
  if (pad === 'sessions') {
    return stuur(wereld.sessies.filter((s) =>
      String(s.year) === zoek.get('year')
      && (!zoek.get('session_name') || s.session_name === zoek.get('session_name'))));
  }
  if (pad === 'session_result') {
    const lijst = wereld.uitslagen[zoek.get('session_key')];
    return lijst ? stuur(lijst.map((nr, i) => ({ driver_number: Number(nr), position: i + 1 }))) : niet();
  }
  if (pad === 'drivers') {
    return stuur([{ driver_number: 1, name_acronym: 'VER', full_name: 'Max', team_name: 'Red Bull', team_colour: '3671c6' },
                  { driver_number: 4, name_acronym: 'NOR', full_name: 'Lando', team_name: 'McLaren', team_colour: 'ff8000' }]);
  }
  if (['laps', 'pit', 'race_control'].includes(pad)) return stuur([]);
  return niet();
}

const server = createServer((req, res) => {
  let body = '';
  req.on('data', (d) => { body += d; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const delen = url.pathname.split('/').filter(Boolean);
    try {
      if (delen[0] === 'v1') return openf1(res, delen[1], url.searchParams);
      if (delen[0] === 'rest' && delen[1] === 'v1') return postgrest(req, res, delen[2], url.searchParams, body);
      res.writeHead(404); res.end();
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const adres = `http://127.0.0.1:${server.address().port}`;

const map = mkdtempSync(join(tmpdir(), 'ingevoegde-race-'));
cpSync(join(wortel, 'scripts'), join(map, 'scripts'), { recursive: true });
const agenda = join(map, 'kalender.ics');

function sync(extra = {}) {
  return new Promise((klaar) => {
    const p = spawn(process.execPath, [join(map, 'scripts', 'sync.mjs')], {
      env: { ...process.env, SUPABASE_URL: adres, SUPABASE_KEY: 'test',
             OPENF1_URL: `${adres}/v1`, SEIZOEN: '', KALENDER: 'true', VAPID_PRIVE: '', ...extra },
    });
    let log = '';
    p.stdout.on('data', (d) => { log += d; });
    p.stderr.on('data', (d) => { log += d; });
    p.on('close', (code) => klaar({ code, log }));
  });
}
const opRonde = () => [...wereld.races].sort((a, b) => a.round - b.round);
const lijst = () => opRonde().map((r) => `${r.round}:${r.name}${r.afgelast ? '(afgelast)' : ''}`).join(' ');

// ---- de situatie van 26 september ------------------------------------------------
// In de database: Melbourne, het afgelaste Sakhir, Baku (net gereden), Marina
// Bay, Austin en Yas Marina, ronde 1 tot en met 6. Bij OpenF1 staat Sakhir er
// niet meer in, en staat Kuala Lumpur er wel in: 4 oktober, meeting 1308.
wereld.races = [
  rij(1, 1, 1279, 'Melbourne', -200, { quali_result: ['1', '4'], race_result: ['1', '4'] }),
  rij(2, 2, 1282, 'Sakhir', -167, { afgelast: true }),
  rij(3, 3, 1295, 'Baku', -1, { quali_result: ['4', '1'], race_result: ['4', '1'] }),
  rij(4, 4, 1296, 'Marina Bay', 15),
  rij(5, 5, 1297, 'Austin', 29),
  rij(6, 6, 1302, 'Yas Marina', 71),
];
wereld.uitslagen = { 12792: ['1', '4'], 12952: ['4', '1'], 12791: ['1', '4'], 12951: ['4', '1'] };
wereld.sessies = [...weekend(1279, 'Melbourne', -200), ...weekend(1295, 'Baku', -1),
                  ...weekend(1308, 'Kuala Lumpur', 8),
                  ...weekend(1296, 'Marina Bay', 15), ...weekend(1297, 'Austin', 29),
                  ...weekend(1302, 'Yas Marina', 71)];
// Er is al voorspeld voor Marina Bay en Austin.
wereld.answers = [
  { pool_id: 'p', race_id: 4, member_id: 'm', question_id: 'race_top10', waarde: ['1', '4'] },
  { pool_id: 'p', race_id: 5, member_id: 'm', question_id: 'race_top10', waarde: ['4', '1'] },
];

{
  const { code, log } = await sync();
  check('de sync draait zonder fouten', code === 0 && !weigeringen.length,
    `${code} · ${weigeringen.join(' ')} · ${log.slice(-400)}`);
  const kl = wereld.races.find((r) => r.name === 'Kuala Lumpur');
  check('Kuala Lumpur staat in de kalender, ook met een meeting_key buiten de volgorde',
    !!kl && !kl.afgelast && kl.race_key === 13082 && kl.quali_key === 13081, JSON.stringify(kl));
  check('op zijn plek: ronde 4, direct na Baku en vóór Marina Bay',
    kl?.round === 4, lijst());
  const naam = (id) => wereld.races.find((r) => r.id === id);
  check('Marina Bay, Austin en Yas Marina schuiven elk een ronde op, in hun eigen rij',
    naam(4).name === 'Marina Bay' && naam(4).round === 5
      && naam(5).name === 'Austin' && naam(5).round === 6
      && naam(6).name === 'Yas Marina' && naam(6).round === 7, lijst());
  check('dus de voorspellingen hangen nog aan de race waarvoor ze gedaan zijn',
    wereld.answers.every((a) => ({ 4: 'Marina Bay', 5: 'Austin' })[a.race_id] === naam(a.race_id).name));
  check('wat ervoor staat blijft staan, en het afgelaste Sakhir blijft afgelast',
    naam(1).round === 1 && naam(2).round === 2 && naam(2).afgelast && naam(3).round === 3, lijst());
  const rondes = opRonde();
  check('de rondes lopen gelijk op met de datum, zonder dubbele nummers',
    rondes.every((r, i) => i === 0 || Date.parse(r.deadline_race) > Date.parse(rondes[i - 1].deadline_race))
      && new Set(rondes.map((r) => r.round)).size === rondes.length, lijst());
  check('de log zegt wat er gebeurde',
    /Kuala Lumpur \(ronde 4\) ertussen gezet; 3 races een ronde opgeschoven/.test(log)
      && /Marina Bay 4→5/.test(log), log.slice(0, 600));
  check('en het logboek voor het beheer ook',
    wereld.sync_runs.some((r) => /Kuala Lumpur \(ronde 4\) ertussen gezet/.test(r.samenvatting ?? '')),
    JSON.stringify(wereld.sync_runs.at(-1)));
  const ics = readFileSync(agenda, 'utf8');
  const plek = (w) => ics.indexOf(`Race ${w} `);
  check('in de agenda staat Kuala Lumpur tussen Baku en Marina Bay',
    plek('Kuala Lumpur') > plek('Baku') && plek('Kuala Lumpur') < plek('Marina Bay') && plek('Baku') > 0);
}

// ---- nog een keer ------------------------------------------------------------------
{
  const voor = lijst();
  const { code, log } = await sync();
  check('nog een keer draaien verandert niets', code === 0 && lijst() === voor && !/ertussen gezet/.test(log),
    `${lijst()} · ${log.slice(0, 300)}`);
}

// ---- een race ná de laatste --------------------------------------------------------
wereld.sessies.push(...weekend(1303, 'Nieuwstad', 90));
{
  const { code, log } = await sync();
  const nieuw = wereld.races.find((r) => r.name === 'Nieuwstad');
  check('een race na de laatste krijgt gewoon het volgende nummer, en er schuift niets',
    code === 0 && nieuw?.round === 8 && !/opgeschoven/.test(log)
      && wereld.races.find((r) => r.id === 6).round === 7, `${lijst()} · ${log.slice(0, 300)}`);
}

server.close();
process.exit(afronden() ? 0 : 1);
