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
  sync_runs: [],      // het logboek dat de sync bijhoudt voor het beheer
  rpc: [],            // aanroepen van lijst_vervangen()
  doorschuif: [],     // wat seizoenen_doorschuiven() de volgende keer teruggeeft
  doorschoven: 0,     // hoe vaak de sync seizoenen_doorschuiven() aanriep
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
    deadline_sprint: null, afgelast: false, lijst_herkomst: null,
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
  if (req.method === 'POST' && tabel === 'sync_runs') {
    rijen.push(JSON.parse(body));
    return stuur(null);
  }
  if (req.method === 'POST') {
    // Alleen de upsert op (season, round) die sync.mjs doet.
    for (const nieuw of JSON.parse(body)) {
      const oud = rijen.find((r) => r.season === nieuw.season && r.round === nieuw.round);
      if (oud) Object.assign(oud, nieuw);
      else rijen.push({ id: volgendId++, afgelast: false, drivers: null, lijst_herkomst: null, quali_result: null,
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

// lijst_vervangen() uit schema.sql, in het klein: de lijst en zijn herkomst
// zetten, en doorgeven aan de latere races van het seizoen met een geleende
// lijst. Het omzetten van antwoorden zelf staat in test/coureurlijsten.test.sql;
// hier gaat het erom dat de sync de functie aanroept in plaats van de lijst
// gewoon over de geleende heen te schrijven.
function rpc(res, functie, body) {
  // seizoenen_doorschuiven(): de regel zelf staat in
  // test/seizoensdoorschuif.test.sql; hier gaat het erom dat de sync hem elke
  // run aanroept en opschrijft wat er gebeurde.
  if (functie === 'seizoenen_doorschuiven' && !wereld.geenRpc) {
    wereld.doorschoven++;
    const uit = wereld.doorschuif; wereld.doorschuif = [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(uit));
  }
  if (functie !== 'lijst_vervangen' || wereld.geenRpc) { res.writeHead(404); return res.end('{}'); }
  const { p_race, p_drivers, p_herkomst } = JSON.parse(body);
  wereld.rpc.push({ p_race, p_herkomst, codes: p_drivers.map((d) => d.code) });
  const race = wereld.races.find((r) => r.id === p_race);
  Object.assign(race, { drivers: p_drivers, lijst_herkomst: p_herkomst });
  if (p_herkomst === 'openf1') {
    for (const r of wereld.races) {
      if (r.season === race.season && r.round > race.round && r.lijst_herkomst === 'geleend') {
        r.drivers = p_drivers;
      }
    }
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ race: p_race, omgezet: 2, meldingen: ['Max (#1) staat niet meer in de lijst'] }));
}

function openf1(res, pad, zoek) {
  wereld.verzoeken.push(`${pad}?${zoek}`);
  // Tijdens een sessie laat OpenF1 alleen betalende accounts toe.
  if (wereld.dicht) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"detail":"Live F1 session in progress"}'); }
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
    // In 2027 staat er een nieuwe coureur bij, zodat te zien is dat de echte
    // lijst de geleende vervangt.
    const nieuwkomer = String(sleutel).startsWith('2027')
      ? [{ driver_number: 41, name_acronym: 'LIN', full_name: 'Arvid', team_name: 'Racing Bulls', team_colour: '6692ff' }] : [];
    return stuur([{ driver_number: 1, name_acronym: 'VER', full_name: 'Max', team_name: 'Red Bull', team_colour: '3671c6' },
                  { driver_number: 4, name_acronym: 'NOR', full_name: 'Lando', team_name: 'McLaren', team_colour: 'ff8000' },
                  ...nieuwkomer]);
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
      if (delen[0] === 'rest' && delen[1] === 'v1' && delen[2] === 'rpc') return rpc(res, delen[3], body);
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
  // Geen datum in 2027 en geen race uit 2027. Niet "nergens 2027": de
  // tijden in deze test lopen met de klok mee, en om 19:20:27 staat er
  // T192027Z in een tijdstempel. Precies dat liet deze controle een keer
  // vallen (7 oktober).
  check('de agenda houdt 2026 en krijgt geen leeg of verzonnen 2027',
    ics.includes('Circuit 2026-4') && !/2027\d{4}T/.test(ics) && !ics.includes('Circuit 2027'));
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
  // Maar zonder lijst kan niemand de seizoensvragen invullen, en die gaan bij
  // de eerste race dicht. Dus voorlopig de lijst van de finale van 2026; dat
  // kost geen verzoek.
  const finale2026 = wereld.races.find((r) => r.season === 2026 && r.round === 4);
  check('de races van 2027 lenen voorlopig de lijst van de laatste race van 2026',
    nieuw.every((r) => JSON.stringify(r.drivers) === JSON.stringify(finale2026.drivers)),
    JSON.stringify(nieuw.map((r) => r.drivers?.length)));
  check('en de log zegt het', /ronde 1 Circuit 2027-1: voorlopig de coureurs van Circuit 2026-4 2026/.test(log),
    log.slice(-400));
  check('en de database weet dat ze geleend zijn (lijst_herkomst)',
    nieuw.every((r) => r.lijst_herkomst === 'geleend'), JSON.stringify(nieuw.map((r) => r.lijst_herkomst)));
  check('de races van 2026 houden hun lijst zonder herkomst te verzinnen',
    wereld.races.filter((r) => r.season === 2026).every((r) => r.lijst_herkomst !== 'geleend'));
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

// ---- 4b. automatisch doorschuiven ----------------------------------------------------------
// De database zegt welke poules doorgingen; de sync zet ze in het logboek
// (alleen het beheer leest dat) en niet met naam in de log van Actions, want
// die is openbaar.
{
  const voor = wereld.doorschoven;
  wereld.doorschuif = [{ id: 'p1', naam: 'Kantoorpoule', van: 2026, naar: 2027, openbaar: false },
                       { id: 'p2', naam: 'Open poule', van: 2026, naar: 2027, openbaar: true }];
  const { code, log } = await sync();
  const regel = wereld.sync_runs.at(-1)?.samenvatting ?? '';
  check('elke run roept seizoenen_doorschuiven() aan', code === 0 && wereld.doorschoven === voor + 1,
    `${wereld.doorschoven - voor} keer`);
  check('wat doorging staat met naam in het logboek',
    regel.includes('Poule Kantoorpoule gaat door van 2026 naar 2027 (7 dagen na de finale)')
      && regel.includes('Poule Open poule gaat door van 2026 naar 2027 (openbaar, meteen)'), regel);
  check('en in de openbare log alleen het aantal',
    /Doorgeschoven naar het volgende seizoen: 2 poule\(s\)/.test(log) && !log.includes('Kantoorpoule'),
    log.slice(-300));
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
  // Ze hebben al een voorlopige lijst, en zijn nog maanden weg: de echte komt
  // binnen veertien dagen voor de race, zoals bij elke race.
  check('de dagelijkse ronde vraagt de lijsten van 2027 nog niet, ze hebben een voorlopige',
    vroeg('drivers?session_key=2027').length === 0, vroeg('drivers').join(' '));
}

// ---- 6b. de eerste race van 2027 komt dichtbij ------------------------------------------
// Binnen veertien dagen vraagt de sync de echte lijst, en die vervangt de
// geleende: de nieuwkomer staat erin.
{
  const r1 = () => wereld.races.find((r) => r.season === 2027 && r.round === 1);
  Object.assign(r1(), { deadline_quali: over(9), deadline_race: over(10) });
  for (const s of wereld.sessies) {
    if (s.meeting_key === 202701) s.date_start = over(s.session_name === 'Race' ? 10 : 9);
  }
  const { code, log } = await sync();
  check('dicht bij de eerste race vervangt de echte lijst de geleende', code === 0
    && r1().drivers?.some((d) => d.code === 'LIN') && r1().drivers.length === 3,
    `${JSON.stringify(r1().drivers)} · ${log.slice(-300)}`);
  // Via lijst_vervangen(), zodat de open antwoorden meegaan.
  check('via lijst_vervangen(), met herkomst openf1',
    wereld.rpc.length === 1 && wereld.rpc[0].p_race === r1().id && wereld.rpc[0].p_herkomst === 'openf1'
      && r1().lijst_herkomst === 'openf1', JSON.stringify(wereld.rpc));
  const later = wereld.races.filter((r) => r.season === 2027 && r.round > 1);
  check('de latere races met een geleende lijst krijgen de echte mee',
    later.every((r) => r.drivers?.some((d) => d.code === 'LIN') && r.lijst_herkomst === 'geleend'),
    JSON.stringify(later.map((r) => [r.round, r.lijst_herkomst, r.drivers?.length])));
  check('de log en het logboek zeggen hoeveel antwoorden er omgezet zijn, met de meldingen',
    /ronde 1 Circuit 2027-1: de echte coureurlijst vervangt de geleende lijst, 2 open antwoord\(en\) omgezet \(Max \(#1\) staat niet meer in de lijst\)/.test(log)
      && wereld.sync_runs.at(-1)?.samenvatting?.includes('2 open antwoord(en) omgezet'),
    log.slice(-500));

  // Een volgende run met dezelfde lijst: herkomst is openf1, dus gewoon een
  // patch als er iets verandert, en geen tweede aanroep.
  const { code: c2 } = await sync();
  check('een volgende run roept lijst_vervangen() niet opnieuw aan', c2 === 0 && wereld.rpc.length === 1,
    JSON.stringify(wereld.rpc));

  // Kan de database het niet (schema.sql nog niet gedraaid), dan blijft de
  // geleende lijst staan in plaats van stil zonder omzetting overschreven te worden.
  const r2 = wereld.races.find((r) => r.season === 2027 && r.round === 2);
  const voor = JSON.stringify(r2.drivers);
  r2.drivers = r2.drivers.filter((d) => d.code !== 'LIN');
  const geleend = JSON.stringify(r2.drivers);
  Object.assign(r2, { deadline_quali: over(11), deadline_race: over(12) });
  for (const x of wereld.sessies) {
    if (x.meeting_key === 202702) x.date_start = over(x.session_name === 'Race' ? 12 : 11);
  }
  wereld.geenRpc = true;
  const { code: c3, log: l3 } = await sync();
  wereld.geenRpc = false;
  check('lukt lijst_vervangen() niet, dan blijft de geleende lijst staan en zegt de log het',
    c3 === 0 && JSON.stringify(r2.drivers) === geleend && /ronde 2 Circuit 2027-2: coureurlijst niet vervangen/.test(l3),
    `${JSON.stringify(r2.drivers)} (was ${voor}) · ${l3.slice(-300)}`);
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

// ---- 8. het logboek ------------------------------------------------------------------------
// Elke run laat een regel achter voor de beheerpagina: wanneer, of het goed
// ging, en wat er veranderde.
{
  const regels = wereld.sync_runs;
  check('elke run schreef een regel in het logboek', regels.length >= 8, `${regels.length} regels`);
  const kalender = regels.find((r) => /Kalender 2027: 4 races/.test(r.samenvatting ?? ''));
  check('met wat er veranderde: de kalender van 2027',
    !!kalender && kalender.ok === true && !!kalender.gestart && !!kalender.klaar
      && Date.parse(kalender.klaar) >= Date.parse(kalender.gestart), JSON.stringify(kalender));
  check('en een run zonder nieuws zegt dat ook',
    regels.some((r) => r.ok === true && r.samenvatting === 'Niks nieuws' && r.bijgewerkt === 0),
    JSON.stringify(regels.map((r) => r.samenvatting)));

  // Een run die misgaat: de tabel races is even weg.
  const races = wereld.races;
  delete wereld.races;
  const { code } = await sync();
  wereld.races = races;
  const laatste = wereld.sync_runs.at(-1);
  check('een run die misgaat schrijft dat ook op, met de fout erbij',
    code === 1 && laatste?.ok === false && /Supabase gaf 404/.test(laatste?.fouten ?? ''),
    JSON.stringify(laatste));

  // En een database zonder logboek (schema.sql nog niet opnieuw gedraaid):
  // de sync gaat gewoon door.
  const bewaard = wereld.sync_runs;
  delete wereld.sync_runs;
  const { code: zonder, log } = await sync();
  wereld.sync_runs = bewaard;
  check('zonder tabel voor het logboek draait de sync gewoon door',
    zonder === 0 && /Logboek niet weggeschreven/.test(log), log.slice(-300));
}

// ---- OpenF1 dicht tijdens een sessie (scripts/openf1-dicht.mjs) -------------------
// Zondag 4 oktober 2026 werd de dagelijkse ronde (met KALENDER) rood op een
// 401 rond de race. Op een sessiedag hoort dat geen fout te zijn: de kalender
// wacht tot de volgende run, en de rest gaat door.
{
  wereld.dicht = true;
  const voor = JSON.stringify(wereld.races);
  const zondag = await sync({ KALENDER: 'true', NU: '2026-10-04T10:39:00Z' });
  const regel = wereld.sync_runs.at(-1);
  check('dicht op een zondag: de kalender wacht, de sync gaat door en blijft groen',
    zondag.code === 0 && /Kalender \d+ niet bijgewerkt: OpenF1 gaf 401/.test(zondag.log) && /Uitslagen \d+ controleren|Geen seizoen waar nog iets na te kijken valt/.test(zondag.log),
    zondag.log.slice(-400));
  check('in het logboek zonder fout, met de reden', regel?.ok === true && !regel?.fouten
    && /niet bijgewerkt: OpenF1 is tijdens een sessie alleen open voor betalende accounts/.test(regel?.samenvatting ?? ''), JSON.stringify(regel));
  check('en er verandert niets aan de races: geen uitslag weg, niets afgelast', JSON.stringify(wereld.races) === voor, 'races veranderd');
  const woensdag = await sync({ KALENDER: 'true', NU: '2026-10-07T10:39:00Z' });
  check('dicht op een woensdag is iets anders: dan zakt de sync, met de fout in het logboek',
    woensdag.code === 1 && /OpenF1 gaf 401/.test(woensdag.log) && wereld.sync_runs.at(-1)?.ok === false,
    woensdag.log.slice(-300));
  wereld.dicht = false;
}

server.close();
process.exit(afronden() ? 0 : 1);
