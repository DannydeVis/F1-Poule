// De jaarwisseling, nagespeeld met de échte sync.
//
// test/sync-seizoenen.test.mjs rekent na wélke seizoenen de sync zou moeten
// oppakken. Dit bestand kijkt of hij het ook doet: scripts/sync.mjs draait
// hier als los proces, zoals in GitHub Actions, tegen een nagebootste OpenF1
// en een nagebootste Supabase. Niets van de sync zelf wordt vervangen; alleen
// de adressen waar hij tegen praat.
//
// De sync kijkt naar de echte klok, dus de races staan hieronder niet op een
// datum maar op "zoveel dagen van nu". Het seizoen heet 2026 en het volgende
// 2027, wat de datum van vandaag ook is.
//
// De scripts worden eerst naar een tijdelijke map gekopieerd: sync.mjs schrijft
// kalender.ics naast zijn eigen map, en die van de repo hoort hier niet
// overschreven te worden.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('de jaarwisseling, met de echte sync');

const DAG = 24 * 3600 * 1000;
const over = (dagen) => new Date(Date.now() + dagen * DAG).toISOString();

// ---- de nagebootste wereld ------------------------------------------------

const wereld = {
  races: [],          // de tabel races in Supabase
  answers: [],
  pools: [],
  sessies: [],        // wat OpenF1 aan sessies kent
  uitslagen: {},      // session_key -> klassering
  verzoeken: [],      // alles wat er bij OpenF1 is gevraagd
};
let volgendId = 1;

// Een weekend bij OpenF1: kwalificatie een dag voor de race, zelfde meeting.
const sleutel = (jaar, n, soort) => (jaar * 100 + n) * 10 + (soort === 'race' ? 2 : 1);
function weekend(jaar, n, dagen) {
  const meeting = jaar * 100 + n;
  const plek = `Circuit ${jaar}-${n}`;
  const basis = { meeting_key: meeting, year: jaar, location: plek,
                  circuit_short_name: plek, country_name: 'Nergensland' };
  return [
    { ...basis, session_key: meeting * 10 + 1, session_name: 'Qualifying',
      session_type: 'Qualifying', date_start: over(dagen - 1) },
    { ...basis, session_key: meeting * 10 + 2, session_name: 'Race',
      session_type: 'Race', date_start: over(dagen) },
  ];
}

// Een race zoals hij na een eerdere sync in de database staat.
function rij(jaar, n, dagen, { uitslag = false } = {}) {
  const meeting = jaar * 100 + n;
  return {
    id: volgendId++, season: jaar, round: n, name: `Circuit ${jaar}-${n}`,
    country: 'Nergensland', race_key: meeting * 10 + 2, quali_key: meeting * 10 + 1,
    sprint_key: null, deadline_quali: over(dagen - 1), deadline_race: over(dagen),
    deadline_sprint: null, afgelast: false,
    drivers: [{ nr: '1', code: 'VER', naam: 'Max', team: 'Red Bull', kleur: '#3671c6' },
              { nr: '4', code: 'NOR', naam: 'Lando', team: 'McLaren', kleur: '#ff8000' }],
    quali_result: uitslag ? ['1', '4'] : null, race_result: uitslag ? ['1', '4'] : null,
    sprint_result: null, fastest_lap: uitslag ? '1' : null, fastest_pitstop: uitslag ? '4' : null,
    safety_cars: uitslag ? 0 : null, rode_vlag: uitslag ? false : null,
  };
}

// ---- de server: OpenF1 onder /v1, PostgREST onder /rest/v1 ------------------

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

function postgrest(req, res, tabel, zoek, body) {
  const rijen = wereld[tabel];
  if (!rijen) { res.writeHead(404); return res.end(`geen tabel ${tabel}`); }
  const past = (r) => filters(zoek).every((f) => f(r));
  const stuur = (data) => { res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(data === null ? '' : JSON.stringify(data)); };
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
  if (req.method === 'POST') {
    // Alleen de upsert op (season, round) die sync.mjs doet.
    for (const nieuw of JSON.parse(body)) {
      const oud = rijen.find((r) => r.season === nieuw.season && r.round === nieuw.round);
      if (oud) Object.assign(oud, nieuw);
      else rijen.push({ id: volgendId++, afgelast: false, drivers: null, quali_result: null,
                        race_result: null, sprint_result: null, fastest_lap: null,
                        fastest_pitstop: null, safety_cars: null, rode_vlag: null, ...nieuw });
    }
    return stuur(null);
  }
  if (req.method === 'PATCH') {
    const geraakt = rijen.filter(past);
    for (const r of geraakt) Object.assign(r, JSON.parse(body));
    return stuur(/return=representation/.test(req.headers.prefer ?? '') ? geraakt : null);
  }
  if (req.method === 'DELETE') {
    wereld[tabel] = rijen.filter((r) => !past(r));
    return stuur(null);
  }
  res.writeHead(405); res.end();
}

function openf1(res, pad, zoek) {
  wereld.verzoeken.push(`${pad}?${zoek}`);
  const stuur = (data) => { res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(data)); };
  const niet = () => { res.writeHead(404); res.end('[]'); };
  if (pad === 'sessions') {
    return stuur(wereld.sessies.filter((s) =>
      String(s.year) === zoek.get('year')
      && (!zoek.get('session_name') || s.session_name === zoek.get('session_name'))));
  }
  const sleutel = zoek.get('session_key');
  if (pad === 'session_result') {
    const lijst = wereld.uitslagen[sleutel];
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

// ---- de sync zelf ------------------------------------------------------------

const map = mkdtempSync(join(tmpdir(), 'jaarwisseling-'));
cpSync(join(wortel, 'scripts'), join(map, 'scripts'), { recursive: true });
const agenda = join(map, 'kalender.ics');

function sync(extra = {}) {
  wereld.verzoeken = [];
  return new Promise((klaar) => {
    const p = spawn(process.execPath, [join(map, 'scripts', 'sync.mjs')], {
      env: { ...process.env, SUPABASE_URL: adres, SUPABASE_KEY: 'test',
             OPENF1_URL: `${adres}/v1`, SEIZOEN: '', KALENDER: '', VAPID_PRIVE: '', ...extra },
    });
    let log = '';
    p.stdout.on('data', (d) => { log += d; });
    p.stderr.on('data', (d) => { log += d; });
    p.on('close', (code) => klaar({ code, log }));
  });
}
const vroeg = (stuk) => wereld.verzoeken.filter((v) => v.includes(stuk));
const jaren = () => [...new Set(wereld.races.map((r) => r.season))].join(',');

// ---- 1. midden in het seizoen ----------------------------------------------------
// Vier races: twee gereden, twee te gaan, de finale over honderd dagen.
wereld.races = [rij(2026, 1, -30, { uitslag: true }), rij(2026, 2, -10, { uitslag: true }),
                rij(2026, 3, 50), rij(2026, 4, 100)];
wereld.sessies = [...weekend(2026, 1, -30), ...weekend(2026, 2, -10),
                  ...weekend(2026, 3, 50), ...weekend(2026, 4, 100)];
{
  const { code, log } = await sync();
  check('midden in het seizoen draait de sync gewoon door', code === 0, log.slice(-300));
  check('en vraagt hij nog niets over 2027', vroeg('year=2027').length === 0,
    vroeg('year=2027').join(' '));
  check('er komt geen seizoen bij', jaren() === '2026', jaren());
  check('de agenda staat erin met de races van 2026',
    existsSync(agenda) && readFileSync(agenda, 'utf8').includes('Circuit 2026-4'));
}

// ---- 2. vijf weken voor de finale, OpenF1 heeft 2027 nog niet --------------------------
for (const r of wereld.races) {
  if (r.round === 3) Object.assign(r, { deadline_quali: over(-15), deadline_race: over(-14),
    quali_result: ['1', '4'], race_result: ['1', '4'], fastest_lap: '1', fastest_pitstop: '4',
    safety_cars: 0, rode_vlag: false });
  if (r.round === 4) Object.assign(r, { deadline_quali: over(34), deadline_race: over(35) });
}
{
  const { code, log } = await sync();
  check('vijf weken voor de finale gaat de sync 2027 zoeken', code === 0
    && vroeg('year=2027&session_name=Race').length === 1, vroeg('year=2027').join(' ') || log.slice(-300));
  check('en vraagt verder niets zolang er geen races zijn (één verzoek per ronde)',
    vroeg('year=2027').length === 1, vroeg('year=2027').join(' '));
  check('er komt niets in de database', jaren() === '2026', jaren());
  const ics = readFileSync(agenda, 'utf8');
  check('de agenda houdt 2026 en krijgt geen leeg of verzonnen 2027',
    ics.includes('Circuit 2026-4') && !ics.includes('2027'));
  check('de log zegt waarom', /nog geen races voor 2027/.test(log), log.slice(-300));
}

// ---- 3. OpenF1 publiceert 2027 ---------------------------------------------------------
wereld.sessies.push(...weekend(2027, 1, 150), ...weekend(2027, 2, 164),
                    ...weekend(2027, 3, 178), ...weekend(2027, 4, 192));
{
  const { code, log } = await sync();
  const nieuw = wereld.races.filter((r) => r.season === 2027).sort((a, b) => a.round - b.round);
  check('zodra OpenF1 2027 heeft staat de kalender erin', code === 0 && nieuw.length === 4,
    `${nieuw.length} races · ${log.slice(-300)}`);
  check('met ronde 1 tot en met 4 en de goede deadlines',
    nieuw.map((r) => r.round).join() === '1,2,3,4'
    && nieuw[0].deadline_race === wereld.sessies.find((s) => s.session_key === sleutel(2027, 1, 'race')).date_start
    && nieuw[0].deadline_quali === wereld.sessies.find((s) => s.session_key === sleutel(2027, 1, 'quali')).date_start,
    JSON.stringify(nieuw[0]));
  check('2026 is er nog gewoon', wereld.races.filter((r) => r.season === 2026).length === 4);
  // Vierentwintig races zonder deelnemerslijst, maanden weg: die wachten op
  // de dagelijkse ronde in plaats van elke ronde elk een verzoek te kosten.
  check('de deelnemerslijsten van 2027 worden niet elke ronde gevraagd',
    vroeg('drivers?session_key=2027').length === 0, vroeg('drivers').join(' '));
  const ics = readFileSync(agenda, 'utf8');
  check('de agenda heeft nu allebei de seizoenen',
    ics.includes('Circuit 2026-4') && ics.includes('Circuit 2027-1'));
  check('en heet niet meer naar één jaar', ics.includes('X-WR-CALNAME:Predict the Race'));
}

// ---- 4. de finale is gereden -----------------------------------------------------------
// De uitslag van de finale staat bij OpenF1 maar nog niet in de database.
for (const r of wereld.races) {
  if (r.season === 2026 && r.round === 4) Object.assign(r, { deadline_quali: over(-2), deadline_race: over(-1) });
}
for (const s of wereld.sessies) {
  if (s.meeting_key === 202604) s.date_start = over(s.session_name === 'Race' ? -1 : -2);
}
wereld.uitslagen[sleutel(2026, 4, 'race')] = ['4', '1'];
wereld.uitslagen[sleutel(2026, 4, 'quali')] = ['4', '1'];
{
  const { code, log } = await sync();
  const finale = wereld.races.find((r) => r.season === 2026 && r.round === 4);
  check('de uitslag van de finale komt nog binnen', code === 0
    && finale.race_result?.join() === '4,1', `${finale.race_result} · ${log.slice(-300)}`);
  check('en de kalender van 2027 wordt niet opnieuw opgehaald (dat doet de dagelijkse ronde)',
    vroeg('session_name=Race').length === 0, vroeg('session_name').join(' '));
}

// ---- 5. januari: 2026 is afgerond --------------------------------------------------------
// Alles van 2026 is lang geleden; de finale veertig dagen terug.
for (const r of wereld.races.filter((x) => x.season === 2026)) {
  Object.assign(r, { deadline_quali: over(-41 - (4 - r.round) * 14), deadline_race: over(-40 - (4 - r.round) * 14) });
}
{
  const { code, log } = await sync();
  const over2026 = wereld.verzoeken.filter((v) => /session_key=2026/.test(v) || /year=2026/.test(v));
  check('in januari laat de sync 2026 met rust', code === 0 && over2026.length === 0,
    over2026.join(' ') || log.slice(-300));
  check('en kijkt hij 2027 na', /Uitslagen 2027 controleren voor 4 races/.test(log), log.slice(-400));
  check('zonder 2026 nog na te kijken', !/Uitslagen 2026/.test(log), log.slice(-400));
}

// ---- 6. de dagelijkse kalenderronde -------------------------------------------------------
// Een race van 2027 schuift een week op. Zonder KALENDER merkt de sync dat
// niet; met KALENDER (de dagelijkse cron) wel.
for (const s of wereld.sessies) {
  if (s.meeting_key === 202703) s.date_start = over(s.session_name === 'Race' ? 185 : 184);
}
{
  const r3 = () => wereld.races.find((r) => r.season === 2027 && r.round === 3);
  await sync();
  const voor = r3().deadline_race;
  const { code, log } = await sync({ KALENDER: 'true' });
  check('de dagelijkse ronde trekt een verschoven race recht', code === 0
    && voor !== r3().deadline_race
    && r3().deadline_race === wereld.sessies.find((x) => x.session_key === sleutel(2027, 3, 'race')).date_start,
    `${voor} → ${r3().deadline_race} · ${log.slice(-300)}`);
  check('zonder dat 2026 opnieuw opgehaald wordt', vroeg('year=2026').length === 0,
    vroeg('year=2026').join(' '));
  check('en in de dagelijkse ronde worden de lijsten van 2027 wel gevraagd',
    vroeg('drivers?session_key=2027').length === 4, vroeg('drivers').join(' '));
}

// ---- 7. een lege database ------------------------------------------------------------------
// De eerste keer ooit: de sync begint bij het jaar van vandaag.
{
  // En OpenF1 heeft voor dit jaar (nog) niets: dan mag er niets kapot.
  wereld.races = [];
  wereld.sessies = [];
  const jaar = new Date().getUTCFullYear();
  writeFileSync(agenda, 'BESTAAND');
  const { code, log } = await sync();
  check('een lege database vraagt de kalender van dit jaar',
    code === 0 && vroeg(`year=${jaar}&session_name=Race`).length === 1,
    wereld.verzoeken.join(' ') || log.slice(-300));
  check('en schrijft geen lege agenda over een bestaande heen',
    readFileSync(agenda, 'utf8') === 'BESTAAND', log.slice(-300));
}

server.close();
process.exit(afronden() ? 0 : 1);
