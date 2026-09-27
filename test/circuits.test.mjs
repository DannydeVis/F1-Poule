// Circuitcijfers: safety cars en rode vlaggen per circuit (zoekplan GEO 3.2).
//
// Draait zonder internet: OpenF1 is hier niet bereikbaar, het ophalen doet
// .github/workflows/circuits.yml op een GitHub-runner. Hier ligt de rekenkant
// vast, met een klein vast voorbeeld in de woorden die OpenF1 echt gebruikt
// (zie test/uitslagen.test.mjs).
//
// Wat hier vastligt:
//   1. Per race tellen raceCijfers() precies zoals de app de vragen "Aantal
//      safety cars" en "Rode vlag" scoort: een virtuele safety car telt mee,
//      een straf voor een "SAFETY CAR INFRINGEMENT" niet.
//   2. Het script heeft geen eigen telregels: het gebruikt telSafetyCars() en
//      hadRodeVlag() uit scripts/uitslagen.mjs, dezelfde als de sync.
//   3. perCircuit() groepeert op circuit_key, met de naam van de laatste race,
//      de races op datum, en de juiste totalen.
//   4. cijfers(): de datum van de laatste race (geen datum van de run), de
//      totalen, en welke races ontbreken.
//   5. Het script blijft onder de limiet van OpenF1 (drie verzoeken per seconde).
//   6. De workflow: met de hand, elke week, en op een pull request alleen in de
//      log; legt alleen vast als er iets veranderd is, en maakt de site opnieuw.
//   7. Staat site/data/circuits.json er, dan klopt hij met zichzelf.
//   8. Het ophalen, tegen een nagebootste OpenF1: elk seizoen vanaf 2023, alleen
//      races die voorbij zijn, een race zonder berichten staat bij "ontbreekt",
//      en DROOG schrijft niets weg.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { raceCijfers, perCircuit, cijfers, VANAF, WACHT_MS, BESTAND } from '../scripts/circuits.mjs';

const { check, afronden } = maakControle('circuitcijfers');

const bericht = (lap, category, message, flag = null) => ({ lap_number: lap, category, message, flag,
  date: `2025-08-31T${String(10 + (lap % 12)).padStart(2, '0')}:00:00+00:00` });
const sessie = (key, circuit, naam, locatie, datum) => ({ session_key: key, circuit_key: circuit,
  circuit_short_name: naam, location: locatie, country_name: 'Land', year: Number(datum.slice(0, 4)),
  date_start: `${datum}T13:00:00+00:00`, session_name: 'Race' });

// ---- 1. per race, met de regels van de app ---------------------------------------
const zandvoort = [
  bericht(1, 'Other', 'SAFETY CAR LIGHTS ON'),
  bericht(1, 'SafetyCar', 'SAFETY CAR DEPLOYED'),
  bericht(20, 'SafetyCar', 'VSC DEPLOYED'),
  bericht(30, 'Other', 'CAR 4 (NOR) TIME PENALTY - SAFETY CAR INFRINGEMENT'),
  bericht(40, 'Other', 'RED FLAG - RACE SUSPENDED', 'RED'),
];
const rustig = [bericht(1, 'Flag', 'GREEN'), bericht(10, 'Other', 'VSC INFRINGEMENT NOTED'),
  bericht(52, 'Flag', 'CHEQUERED FLAG')];
{
  const r = raceCijfers(sessie(9001, 55, 'Zandvoort', 'Zandvoort', '2025-08-31'), zandvoort);
  check('een safety car en een virtuele zijn er twee (twee zinnen in dezelfde ronde tellen één keer), en er was een rode vlag',
    r.safetyCars === 2 && r.rodeVlag === true, JSON.stringify(r));
  const s = raceCijfers(sessie(9002, 55, 'Zandvoort', 'Zandvoort', '2024-08-25'), rustig);
  check('een straf voor een VSC-overtreding is geen safety car, en groen is geen rode vlag',
    s.safetyCars === 0 && s.rodeVlag === false, JSON.stringify(s));
  check('met het circuit, het jaar, de datum en de sessie erbij',
    r.circuit === 55 && r.naam === 'Zandvoort' && r.jaar === 2025 && r.datum === '2025-08-31' && r.sessie === 9001);
}

// ---- 2. dezelfde telregels als de sync -------------------------------------------
{
  const bron = readFileSync(join(wortel, 'scripts', 'circuits.mjs'), 'utf8');
  const sync = readFileSync(join(wortel, 'scripts', 'sync.mjs'), 'utf8');
  check('het script telt met telSafetyCars() en hadRodeVlag() uit uitslagen.mjs, net als de sync, en heeft geen eigen regels',
    /import \{ telSafetyCars, hadRodeVlag \} from '\.\/uitslagen\.mjs';/.test(bron)
      && /telSafetyCars\(berichten\)/.test(bron) && /hadRodeVlag\(berichten\)/.test(bron)
      && !/SAFETY CAR|VSC|RED FLAG/.test(bron.replace(/^\s*(\/\/|\*).*$/gm, ''))
      && /telSafetyCars\(berichten\)/.test(sync) && /hadRodeVlag\(berichten\)/.test(sync));
}

// ---- 3. per circuit ------------------------------------------------------------------
const races = [
  raceCijfers(sessie(9001, 55, 'Zandvoort', 'Zandvoort', '2025-08-31'), zandvoort),
  raceCijfers(sessie(9002, 55, 'Zandvoort', 'Zandvoort', '2024-08-25'), rustig),
  raceCijfers(sessie(9003, 39, 'Monza', 'Monza', '2025-09-07'), [bericht(3, 'SafetyCar', 'VSC DEPLOYED')]),
  // Zelfde circuit_key, andere naam: de baan telt als één, met de nieuwste naam.
  // Een rode vlag zonder safety car: die twee tellen los van elkaar.
  raceCijfers(sessie(9004, 55, 'Zandvoort (nieuw)', 'Zandvoort', '2023-08-27'),
    [bericht(2, 'Other', 'RED FLAG - RACE SUSPENDED', 'RED')]),
];
{
  const c = perCircuit(races);
  const z = c.find((x) => x.circuit === 55);
  check('één regel per circuit_key, op plaats gesorteerd', c.length === 2 && c.map((x) => x.locatie).join() === 'Monza,Zandvoort',
    c.map((x) => `${x.circuit}:${x.locatie}`).join());
  check('met de naam van de laatste race, en de races op datum',
    z.naam === 'Zandvoort' && z.perRace.map((r) => r.datum).join() === '2023-08-27,2024-08-25,2025-08-31', JSON.stringify(z.perRace));
  check('en de totalen: races, races met een safety car, safety cars, races met een rode vlag',
    z.races === 3 && z.metSafetyCar === 1 && z.safetyCars === 2 && z.metRodeVlag === 2, JSON.stringify({ ...z, perRace: undefined }));
}

// ---- 4. het hele bestand ----------------------------------------------------------------
{
  const ontbreekt = [{ jaar: 2025, locatie: 'Imola', datum: '2025-05-18', sessie: 9100, reden: 'OpenF1 gaf 404' },
    { jaar: 2023, locatie: 'Imola', datum: '2023-05-21', sessie: 9099, reden: 'geen berichten' }];
  const d = cijfers(races, ontbreekt);
  check('de datum van de laatste race, geen datum van de run, en vanaf 2023',
    d.tot === '2025-09-07' && d.vanaf === VANAF && VANAF === 2023 && !/\d{4}-\d\d-\d\dT/.test(JSON.stringify(d)), `${d.tot} ${d.vanaf}`);
  check('de totalen over alle races', d.races === 4 && d.metSafetyCar === 2 && d.metRodeVlag === 2,
    `${d.races} ${d.metSafetyCar} ${d.metRodeVlag}`);
  check('en wat ontbreekt, op datum, met de reden', d.ontbreekt.map((o) => o.datum).join() === '2023-05-21,2025-05-18'
    && d.ontbreekt.every((o) => o.reden), JSON.stringify(d.ontbreekt));
  check('en de regel dat een virtuele safety car meetelt', /virtuele safety car telt mee/.test(d.regel), d.regel);
  check('dezelfde invoer geeft hetzelfde bestand, in welke volgorde de races ook binnenkomen',
    JSON.stringify(cijfers([...races].reverse(), [...ontbreekt].reverse())) === JSON.stringify(d));
}

// ---- 5. de limiet van OpenF1 --------------------------------------------------------------
check('tussen twee verzoeken minstens een derde seconde (drie per seconde)', WACHT_MS >= 334, String(WACHT_MS));

// ---- 6. de workflow -------------------------------------------------------------------------
{
  const wf = readFileSync(join(wortel, '.github', 'workflows', 'circuits.yml'), 'utf8');
  const vastleggen = wf.split('- name: Vastleggen')[1] ?? '';
  check('de workflow: met de hand, elke week, en op een pull request die het script aanpast',
    /workflow_dispatch:/.test(wf) && /schedule:\s*\n\s*- cron: '[\d*]+ [\d*]+ \* \* [\d]'/.test(wf)
      && /pull_request:\s*\n\s*paths:[\s\S]*'scripts\/circuits\.mjs'/.test(wf));
  check('op een pull request alleen de tabel in de log (DROOG), niets vastgelegd',
    /DROOG: \$\{\{ github\.event_name == 'pull_request' && '1' \|\| '' \}\}/.test(wf)
      && /if: github\.event_name != 'pull_request'/.test(vastleggen.split('run:')[0]));
  check('legt alleen vast als er iets veranderd is, na de site opnieuw te maken, en haalt main eerst binnen',
    /node scripts\/maak-site\.mjs/.test(vastleggen) && /git status --porcelain/.test(vastleggen)
      && vastleggen.indexOf('maak-site') < vastleggen.indexOf('git status')
      && /git pull --rebase/.test(vastleggen) && /git push/.test(vastleggen));
  check('schrijfrechten alleen voor die ene job', /^permissions:\s*\n\s*contents: read/m.test(wf)
    && /tellen:[\s\S]*permissions:\s*\n\s*contents: write/.test(wf));
}

// ---- 7. het bestand zelf, zodra de workflow het geschreven heeft ---------------------------------
{
  const pad = join(wortel, BESTAND);
  if (!existsSync(pad)) {
    check(`${BESTAND} staat er nog niet; de workflow schrijft het`, true);
  } else {
    const d = JSON.parse(readFileSync(pad, 'utf8'));
    const fout = [];
    if (d.vanaf !== VANAF) fout.push(`vanaf ${d.vanaf}`);
    if (!/virtuele safety car telt mee/.test(d.regel ?? '')) fout.push('regel');
    const alle = d.circuits.flatMap((c) => c.perRace);
    if (alle.length !== d.races) fout.push(`${alle.length} races per circuit, ${d.races} in totaal`);
    if (new Set(alle.map((r) => r.sessie)).size !== alle.length) fout.push('een sessie dubbel');
    if (alle.some((r) => r.jaar < VANAF || !Number.isInteger(r.safetyCars) || r.safetyCars < 0)) fout.push('vreemde race');
    for (const c of d.circuits) {
      if (c.races !== c.perRace.length || c.safetyCars !== c.perRace.reduce((n, r) => n + r.safetyCars, 0)
        || c.metSafetyCar !== c.perRace.filter((r) => r.safetyCars > 0).length
        || c.metRodeVlag !== c.perRace.filter((r) => r.rodeVlag).length) fout.push(`${c.locatie}: totalen`);
    }
    if (d.tot !== alle.map((r) => r.datum).sort().at(-1)) fout.push(`tot ${d.tot}`);
    check(`${BESTAND} klopt met zichzelf: totalen, geen dubbele sessie, vanaf ${VANAF}`, fout.length === 0,
      fout.join(' | ') || `${d.races} races, ${d.circuits.length} circuits, tot ${d.tot}`);
  }
}

// ---- 8. het ophalen, tegen een nagebootste OpenF1 --------------------------------------------------
{
  const nu = new Date();
  const ditJaar = nu.getUTCFullYear();
  const dag = (d) => new Date(nu.getTime() + d * 864e5).toISOString();
  const s = (key, circuit, locatie, jaar, start) => ({ ...sessie(key, circuit, locatie, locatie, `${jaar}-06-01`),
    date_start: start ?? `${jaar}-06-01T13:00:00+00:00`, date_end: start ?? `${jaar}-06-01T15:00:00+00:00` });
  const SESSIES = {
    2023: [s(1, 55, 'Zandvoort', 2023)],
    2024: [s(2, 55, 'Zandvoort', 2024), s(3, 21, 'Imola', 2024)],
    2025: [s(4, 39, 'Monza', 2025)],
    [ditJaar]: [s(5, 39, 'Monza', ditJaar, dag(-10)), s(6, 55, 'Zandvoort', ditJaar, dag(30))],
  };
  const BERICHTEN = { 1: zandvoort, 2: rustig, 3: null, 4: [bericht(3, 'SafetyCar', 'VSC DEPLOYED')], 5: rustig, 6: zandvoort };
  const gevraagd = [];
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    gevraagd.push(u.pathname + u.search);
    let body = null;
    if (u.pathname === '/sessions' && u.searchParams.get('session_name') === 'Race') body = SESSIES[u.searchParams.get('year')] ?? [];
    if (u.pathname === '/race_control') body = BERICHTEN[u.searchParams.get('session_key')] ?? null;
    res.writeHead(body ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body ?? { detail: 'Not found' }));
  });
  await new Promise((klaar) => server.listen(0, '127.0.0.1', klaar));
  const OPENF1_URL = `http://127.0.0.1:${server.address().port}`;
  const voor = existsSync(join(wortel, BESTAND)) ? statSync(join(wortel, BESTAND)).mtimeMs : null;
  const { code, uit } = await new Promise((klaar) => {
    const p = spawn(process.execPath, [join(wortel, 'scripts', 'circuits.mjs')], { env: { ...process.env, OPENF1_URL, DROOG: '1' } });
    let tekst = '';
    p.stdout.on('data', (d) => { tekst += d; });
    p.stderr.on('data', (d) => { tekst += d; });
    p.on('close', (c) => klaar({ code: c, uit: tekst }));
  });
  server.close();
  const jaren = gevraagd.filter((x) => x.startsWith('/sessions')).map((x) => new URLSearchParams(x.split('?')[1]).get('year'));
  check('elk seizoen vanaf 2023 tot en met dit jaar, alleen de races (session_name=Race)',
    code === 0 && jaren.join() === Array.from({ length: ditJaar - VANAF + 1 }, (_, i) => VANAF + i).join(), `${code} · ${jaren.join()}`);
  check('een race die nog moet komen, wordt niet opgevraagd',
    !gevraagd.includes('/race_control?session_key=6') && gevraagd.includes('/race_control?session_key=5'), gevraagd.join(' '));
  check('vier races geteld, met de regels van de app, en Imola (404) bij wat ontbreekt',
    /4 races van 2023 tot /.test(uit) && /SC in 2, rode vlag in 1/.test(uit) && /ontbreekt: 2024-06-01 Imola \(3\): OpenF1 gaf 404/.test(uit),
    uit.split('\n').filter((r) => /races van|ontbreekt/.test(r)).join(' / '));
  check('DROOG schrijft niets weg', /DROOG: niets weggeschreven/.test(uit)
    && (existsSync(join(wortel, BESTAND)) ? statSync(join(wortel, BESTAND)).mtimeMs : null) === voor);
}

process.exit(afronden() ? 0 : 1);
