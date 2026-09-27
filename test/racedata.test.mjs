// De gegevens voor de racepagina's (zoekplan SEO fase 4).
//
// Draait zonder internet: OpenF1 is hier niet bereikbaar, het ophalen doet
// .github/workflows/circuits.yml op een GitHub-runner. Hier ligt de rekenkant
// vast, en het ophalen tegen een nagebootste OpenF1.
//
// Wat hier vastligt:
//   1. top10(): op plek, alleen wie geklasseerd is, hoogstens tien, met naam en
//      team uit drivers.
//   2. sessiesVan(): alleen kwalificatie, sprint (met zijn kwalificatie) en
//      race, op tijd gezet.
//   3. Het bestand: de races op datum, geen datum van de run.
//   4. Het ophalen, voor elke race uit site/races.mjs: de sessies en de naam
//      van dit jaar, de top 10 van vorig jaar, de uitslag van dit jaar pas als
//      de sessie gereden is, een race zonder vorige editie met vorige: null, en
//      een race die dit jaar niet bestaat bij "ontbreekt". DROOG schrijft niets.
//   5. De workflow haalt het elke dag op, en op een pull request alleen in de log.
//   6. Staat site/data/races-<jaar>.json er, dan klopt hij met site/races.mjs.

import { readFileSync, existsSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { maakControle, wortel } from './hulp.mjs';
import { top10, sessiesVan, raceRecord, racedata, BESTAND, SESSIES } from '../scripts/racedata.mjs';
import { RACE_JAAR, RACES } from '../site/races.mjs';

const { check, afronden } = maakControle('de gegevens voor de racepagina\'s');

const coureur = (nr, voor, achter, code, team) => ({ driver_number: nr, first_name: voor, last_name: achter,
  full_name: `${voor} ${achter.toUpperCase()}`, name_acronym: code, team_name: team });
const COUREURS = [
  coureur(1, 'Max', 'Verstappen', 'VER', 'Red Bull Racing'), coureur(4, 'Lando', 'Norris', 'NOR', 'McLaren'),
  coureur(81, 'Oscar', 'Piastri', 'PIA', 'McLaren'), coureur(16, 'Charles', 'Leclerc', 'LEC', 'Ferrari'),
  coureur(44, 'Lewis', 'Hamilton', 'HAM', 'Ferrari'), coureur(63, 'George', 'Russell', 'RUS', 'Mercedes'),
  coureur(12, 'Kimi', 'Antonelli', 'ANT', 'Mercedes'), coureur(14, 'Fernando', 'Alonso', 'ALO', 'Aston Martin'),
  coureur(55, 'Carlos', 'Sainz', 'SAI', 'Williams'), coureur(23, 'Alexander', 'Albon', 'ALB', 'Williams'),
  coureur(10, 'Pierre', 'Gasly', 'GAS', 'Alpine'), coureur(6, 'Isack', 'Hadjar', 'HAD', 'Racing Bulls'),
];
// Twaalf coureurs, de laatste twee niet geklasseerd; de volgorde door elkaar.
const UITSLAG = [4, 1, 81, 16, 63, 44, 12, 14, 23, 55].map((nr, i) => ({ driver_number: nr, position: i + 1 }))
  .concat([{ driver_number: 10, position: null }, { driver_number: 6, position: null }]).reverse();

// ---- 1. top10 ------------------------------------------------------------------------
{
  const t = top10(UITSLAG, COUREURS);
  check('de top 10 op plek, alleen wie geklasseerd is', t.length === 10 && t.map((x) => x.plek).join() === '1,2,3,4,5,6,7,8,9,10'
    && t[0].code === 'NOR' && t[9].code === 'SAI', t.map((x) => x.code).join(' '));
  check('met de naam zoals je hem schrijft (voornaam en achternaam) en het team',
    t[0].naam === 'Lando Norris' && t[0].team === 'McLaren' && t[0].nr === '4', JSON.stringify(t[0]));
  const kort = top10([{ driver_number: 99, position: 1 }, { driver_number: 1, position: 2 }], COUREURS);
  check('een coureur die niet in drivers staat, houdt zijn plek zonder naam', kort.length === 2 && kort[0].naam === null && kort[1].code === 'VER');
  check('niets is niets', top10([], COUREURS).length === 0 && top10(undefined, undefined).length === 0);
  const twaalf = top10(COUREURS.map((c, i) => ({ driver_number: c.driver_number, position: i + 1 })), COUREURS);
  check('twaalf geklasseerd is nog steeds een top 10', twaalf.length === 10 && twaalf.at(-1).plek === 10, String(twaalf.length));
}

// ---- 2. sessiesVan --------------------------------------------------------------------
const s = (key, meeting, naam, start, uren = 1) => ({ session_key: key, meeting_key: meeting, session_name: naam,
  date_start: start, date_end: new Date(new Date(start).getTime() + uren * 3600e3).toISOString() });
{
  const lijst = sessiesVan([s(5, 1, 'Race', '2026-10-11T12:00:00Z', 2), s(1, 1, 'Practice 1', '2026-10-09T09:00:00Z'),
    s(4, 1, 'Qualifying', '2026-10-10T13:00:00Z'), s(2, 1, 'Sprint Qualifying', '2026-10-09T13:00:00Z'), s(3, 1, 'Sprint', '2026-10-10T09:00:00Z')]);
  check('alleen kwalificatie, sprint en race, op tijd gezet', lijst.map((x) => x.naam).join() === 'Sprint Qualifying,Sprint,Qualifying,Race'
    && SESSIES.length === 4, lijst.map((x) => x.naam).join());
  check('met start, eind en sessie', lijst.at(-1).start === '2026-10-11T12:00:00Z' && lijst.at(-1).eind && lijst.at(-1).sessie === 5);
}

// ---- 3. het bestand ---------------------------------------------------------------------
{
  const m = (naam, start) => ({ meeting_name: naam, location: naam, country_name: 'Land', circuit_short_name: naam, date_start: start });
  const d = racedata([raceRecord({ circuit: 2, slug: 'b' }, m('B', '2026-11-01T00:00:00Z'), [], null, null),
    raceRecord({ circuit: 1, slug: 'a' }, m('A', '2026-10-01T00:00:00Z'), [], null, null)]);
  check('de races op datum, met het jaar en de bron, zonder datum van de run',
    d.races.map((r) => r.slug).join() === 'a,b' && d.jaar === RACE_JAAR && /OpenF1/.test(d.bron)
      && !/bijgewerkt|gemaakt|opgehaald/i.test(Object.keys(d).join()), d.races.map((r) => r.slug).join());
  check('en elke race heeft dezelfde velden, ook als OpenF1 er een mist', Object.keys(d.races[0]).join() === Object.keys(d.races[1]).join()
    && d.races[0].eind === null && d.races[0].officieel === null, Object.keys(d.races[0]).join());
}

// ---- 4. het ophalen, tegen een nagebootste OpenF1 ------------------------------------------
{
  const dag = (d) => new Date(Date.now() + d * 864e5).toISOString();
  const [sin, aus, mex, sao, lv] = RACES;
  // Per circuit: de sessies van dit jaar en van vorig jaar.
  const dit = {
    [sin.circuit]: [s(101, 10, 'Practice 1', dag(12)), s(102, 10, 'Sprint Qualifying', dag(12.3)), s(103, 10, 'Sprint', dag(13)),
      s(104, 10, 'Qualifying', dag(13.3)), s(105, 10, 'Race', dag(14), 2)],
    // Al gereden: de uitslag van dit jaar hoort erbij.
    [aus.circuit]: [s(201, 20, 'Qualifying', dag(-21)), s(202, 20, 'Race', dag(-20), 2)],
    // Kwalificatie gereden, race nog niet.
    [mex.circuit]: [s(301, 30, 'Qualifying', dag(-1)), s(302, 30, 'Race', dag(0.5), 2)],
    // São Paulo bestaat dit jaar niet.
    [lv.circuit]: [s(501, 50, 'Qualifying', dag(40)), s(502, 50, 'Race', dag(41), 2)],
  };
  for (const r of RACES.slice(5)) dit[r.circuit] = [s(r.circuit * 10 + 1, r.circuit, 'Qualifying', dag(50)), s(r.circuit * 10 + 2, r.circuit, 'Race', dag(51), 2)];
  const vorig = {};
  for (const r of RACES) if (r !== lv) vorig[r.circuit] = [s(9000 + r.circuit, 900 + r.circuit, 'Qualifying', '2025-10-04T13:00:00Z'),
    s(9500 + r.circuit, 900 + r.circuit, 'Race', '2025-10-05T12:00:00Z', 2)];
  const meetings = { 10: 'Singapore Grand Prix', 20: 'United States Grand Prix', 30: 'Mexico City Grand Prix', 50: 'Las Vegas Grand Prix' };
  const gevraagd = [];
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const q = Object.fromEntries(u.searchParams);
    gevraagd.push(u.pathname + u.search);
    let body = null;
    if (u.pathname === '/sessions') body = (Number(q.year) === RACE_JAAR ? dit : Number(q.year) === RACE_JAAR - 1 ? vorig : {})[q.circuit_key] ?? [];
    if (u.pathname === '/meetings') body = [{ meeting_key: Number(q.meeting_key), meeting_name: meetings[q.meeting_key] ?? `Meeting ${q.meeting_key}`,
      meeting_official_name: 'FORMULA 1 GRAND PRIX 2026', location: 'Plaats', country_name: 'Land', circuit_short_name: 'Baan',
      date_start: dag(12) }];
    if (u.pathname === '/session_result') body = UITSLAG;
    if (u.pathname === '/drivers') body = COUREURS;
    res.writeHead(body ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body ?? { detail: 'Not found' }));
  });
  await new Promise((klaar) => server.listen(0, '127.0.0.1', klaar));
  const map = mkdtempSync(join(tmpdir(), 'racedata-'));
  const draai = (extra) => new Promise((klaar) => {
    const p = spawn(process.execPath, [join(wortel, 'scripts', 'racedata.mjs')],
      { env: { ...process.env, OPENF1_URL: `http://127.0.0.1:${server.address().port}`, RACEDATA_UIT: join(map, 'races.json'), ...extra } });
    let tekst = '';
    p.stdout.on('data', (x) => { tekst += x; });
    p.stderr.on('data', (x) => { tekst += x; });
    p.on('close', (code) => klaar({ code, uit: tekst }));
  });
  const { code, uit } = await draai({});
  let d = { races: [], ontbreekt: [] };
  try { d = JSON.parse(readFileSync(join(map, 'races.json'), 'utf8')); } catch { /* telt als leeg */ }
  const r = (slug) => d.races.find((x) => x.slug === slug);
  check('elke race uit site/races.mjs staat erin of bij "ontbreekt"', code === 0
    && RACES.every((x) => r(x.slug) || d.ontbreekt.some((o) => o.slug === x.slug)), `${code} · ${uit.split('\n').slice(-3).join(' / ')}`);
  check('São Paulo, dat dit jaar niet bestaat, staat bij "ontbreekt" met de reden',
    !r(sao.slug) && d.ontbreekt.some((o) => o.slug === sao.slug && /geen race/.test(o.reden)), JSON.stringify(d.ontbreekt));
  check('met de naam van de meeting en de sessies van het weekend, zonder de vrije training',
    r(sin.slug)?.naam === 'Singapore Grand Prix' && r(sin.slug).sessies.map((x) => x.naam).join() === 'Sprint Qualifying,Sprint,Qualifying,Race',
    JSON.stringify(r(sin.slug)?.sessies?.map((x) => x.naam)));
  check('de top 10 van vorig jaar, kwalificatie en race', r(sin.slug)?.vorige?.jaar === RACE_JAAR - 1
    && r(sin.slug).vorige.race?.length === 10 && r(sin.slug).vorige.kwalificatie?.[0]?.code === 'NOR' && r(sin.slug).vorige.datum === '2025-10-05',
    JSON.stringify(r(sin.slug)?.vorige)?.slice(0, 120));
  check('zonder vorige editie: vorige is null', r(lv.slug) && r(lv.slug).vorige === null, JSON.stringify(r(lv.slug)?.vorige));
  check('de uitslag van dit jaar alleen als hij gereden is: Singapore nog niet, Austin wel, Mexico alleen de kwalificatie',
    r(sin.slug)?.uitslag === null && r(aus.slug)?.uitslag?.race?.length === 10 && r(aus.slug).uitslag.kwalificatie?.length === 10
      && r(mex.slug)?.uitslag?.kwalificatie?.length === 10 && r(mex.slug).uitslag.race === null,
    `${JSON.stringify(r(sin.slug)?.uitslag)} · ${!!r(aus.slug)?.uitslag?.race} · ${JSON.stringify(r(mex.slug)?.uitslag?.race)}`);
  check('een race die nog moet komen: geen uitslag opgevraagd',
    !gevraagd.includes('/session_result?session_key=105') && !gevraagd.includes('/session_result?session_key=302')
      && gevraagd.includes('/session_result?session_key=202'), gevraagd.filter((x) => x.startsWith('/session_result')).join(' '));
  const voor = statSync(join(map, 'races.json')).mtimeMs;
  const droog = await draai({ DROOG: '1' });
  check('DROOG schrijft niets weg', droog.code === 0 && /DROOG: niets weggeschreven/.test(droog.uit)
    && statSync(join(map, 'races.json')).mtimeMs === voor);
  server.close();
}

// ---- 5. de workflow ---------------------------------------------------------------------------
{
  const wf = readFileSync(join(wortel, '.github', 'workflows', 'circuits.yml'), 'utf8');
  check('de workflow haalt de racedata op, elke dag, en op een pull request alleen in de log',
    /- cron: '\d+ \d+ \* \* \*'/.test(wf) && /racedata:?[\s\S]*?DROOG: \$\{\{ github\.event_name == 'pull_request' && '1' \|\| '' \}\}[\s\S]*?run: node scripts\/racedata\.mjs/.test(wf.replace(/De racepagina's, tijden en uitslagen/, 'racedata'))
      && wf.indexOf('scripts/racedata.mjs') < wf.indexOf('- name: Vastleggen') && /'scripts\/racedata\.mjs'/.test(wf) && /'site\/races\.mjs'/.test(wf));
}

// ---- 6. het bestand zelf, zodra de workflow het geschreven heeft --------------------------------
{
  const pad = join(wortel, BESTAND);
  if (!existsSync(pad)) {
    check(`${BESTAND} staat er nog niet; de workflow schrijft het`, true);
  } else {
    const d = JSON.parse(readFileSync(pad, 'utf8'));
    const fout = [];
    if (d.jaar !== RACE_JAAR) fout.push(`jaar ${d.jaar}`);
    for (const x of RACES) if (!d.races.some((r) => r.slug === x.slug && r.circuit === x.circuit) && !d.ontbreekt.some((o) => o.slug === x.slug)) fout.push(`${x.slug} ontbreekt zonder reden`);
    for (const r of d.races) {
      const tijden = r.sessies.map((x) => x.start);
      if (JSON.stringify(tijden) !== JSON.stringify([...tijden].sort())) fout.push(`${r.slug}: sessies niet op tijd`);
      if (!r.sessies.some((x) => x.naam === 'Race')) fout.push(`${r.slug}: geen race`);
      for (const top of [r.vorige?.kwalificatie, r.vorige?.race, r.uitslag?.kwalificatie, r.uitslag?.race].filter(Boolean)) {
        if (top.length > 10 || top.some((x, i) => x.plek !== i + 1)) fout.push(`${r.slug}: vreemde top 10`);
      }
    }
    check(`${BESTAND} klopt met site/races.mjs: elke race erin of met reden weg, sessies op tijd, top 10's op plek`,
      fout.length === 0, fout.join(' | ') || `${d.races.length} races, ${d.ontbreekt.length} ontbreken`);
  }
}

process.exit(afronden() ? 0 : 1);
