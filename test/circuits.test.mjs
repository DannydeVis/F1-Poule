// Circuitcijfers: safety cars, rode vlaggen en pole per circuit (zoekplan GEO 3.2).
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
//   6. De workflow: met de hand, elke dag, en op een pull request alleen in de
//      log; legt alleen vast als er iets veranderd is, en maakt de site opnieuw.
//   7. Staat site/data/circuits.json er, dan klopt hij met zichzelf.
//   8. Het ophalen, tegen een nagebootste OpenF1: elk seizoen vanaf 2023, alleen
//      races die voorbij zijn, een race zonder berichten staat bij "ontbreekt",
//      pole en winnaar uit de kwalificatie en de race van dezelfde meeting (een
//      race zonder kwalificatie telt daar niet mee), en DROOG schrijft niets weg.
//   9. uitersten(): het gemiddelde per race, en het circuit met de meeste en de
//      minste safety cars per race (niet in totaal), alleen van circuits met
//      genoeg races. De gids over de puntentelling toont de cijfers uit site/data/circuits.json:
//      elke regel van de tabel, en de getallen in de tekst (met het gemiddelde,
//      het meeste en het minste per race, hier opnieuw uitgerekend).
//  10. Pole en winnaar per race: poleWon alleen als ze er allebei zijn, en per
//      circuit en in totaal alleen die races geteld.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { raceCijfers, perCircuit, cijfers, uitersten, naamVan, MIN_RACES, VANAF, WACHT_MS, BESTAND } from '../scripts/circuits.mjs';
import { PAGINAS } from '../site/paginas.mjs';

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

// ---- 10. pole en winnaar per race ---------------------------------------------------
{
  const z = sessie(9001, 55, 'Zandvoort', 'Zandvoort', '2025-08-31');
  const wel = raceCijfers(z, rustig, { pole: { nr: '81', naam: 'Oscar Piastri' }, winnaar: { nr: '81', naam: 'Oscar Piastri' } });
  const niet = raceCijfers(z, rustig, { pole: { nr: '4', naam: 'Lando Norris' }, winnaar: { nr: '81', naam: 'Oscar Piastri' } });
  const half = raceCijfers(z, rustig, { winnaar: { nr: '81', naam: 'Oscar Piastri' } });
  const leeg = raceCijfers(z, rustig);
  check('poleWon: ja als pole en winnaar dezelfde zijn (op nummer), nee als niet, en onbekend als er een ontbreekt',
    wel.poleWon === true && niet.poleWon === false && half.poleWon === null && half.pole === null && half.winnaar.naam === 'Oscar Piastri'
      && leeg.poleWon === null && leeg.pole === null && leeg.winnaar === null, [wel.poleWon, niet.poleWon, half.poleWon, leeg.poleWon].join());
  check('de naam zoals je hem schrijft, en anders full_name',
    naamVan({ first_name: 'Max', last_name: 'Verstappen', full_name: 'Max VERSTAPPEN' }) === 'Max Verstappen'
      && naamVan({ full_name: 'Oscar PIASTRI' }) === 'Oscar PIASTRI' && naamVan(undefined) === null);
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
const VER = { nr: '1', naam: 'Max Verstappen' };
const NOR = { nr: '4', naam: 'Lando Norris' };
const PIA = { nr: '81', naam: 'Oscar Piastri' };
const races = [
  // Pole en winnaar: van pole gewonnen, niet van pole gewonnen, en een race
  // zonder bekende pole, die daar niet meetelt.
  raceCijfers(sessie(9001, 55, 'Zandvoort', 'Zandvoort', '2025-08-31'), zandvoort, { pole: PIA, winnaar: PIA }),
  raceCijfers(sessie(9002, 55, 'Zandvoort', 'Zandvoort', '2024-08-25'), rustig, { pole: NOR, winnaar: VER }),
  raceCijfers(sessie(9003, 39, 'Monza', 'Monza', '2025-09-07'), [bericht(3, 'SafetyCar', 'VSC DEPLOYED')], { pole: VER, winnaar: VER }),
  // Zelfde circuit_key, andere naam: de baan telt als één, met de nieuwste naam.
  // Een rode vlag zonder safety car: die twee tellen los van elkaar.
  raceCijfers(sessie(9004, 55, 'Zandvoort (nieuw)', 'Zandvoort', '2023-08-27'),
    [bericht(2, 'Other', 'RED FLAG - RACE SUSPENDED', 'RED')], { winnaar: VER }),
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
  check('en pole: alleen de races met pole en winnaar tellen (2 van de 3), van pole gewonnen in 1',
    z.metPole === 2 && z.poleGewonnen === 1, `${z.metPole} ${z.poleGewonnen}`);
  check('per race het jaar, pole, winnaar en of de polesitter won',
    JSON.stringify(z.perRace.map((r) => [r.jaar, r.pole?.naam ?? null, r.winnaar?.naam ?? null, r.poleWon]))
      === JSON.stringify([[2023, null, 'Max Verstappen', null], [2024, 'Lando Norris', 'Max Verstappen', false], [2025, 'Oscar Piastri', 'Oscar Piastri', true]]),
    JSON.stringify(z.perRace));
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
  check('en pole over alle races: 3 met pole en winnaar, 2 van pole gewonnen, en de bron noemt waar het vandaan komt',
    d.metPole === 3 && d.poleGewonnen === 2 && /session_result/.test(d.bron) && /drivers/.test(d.bron), `${d.metPole} ${d.poleGewonnen} · ${d.bron}`);
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
  check('de workflow: met de hand, elke dag, en op een pull request die het script aanpast',
    /workflow_dispatch:/.test(wf) && /schedule:\s*\n\s*- cron: '\d+ \d+ \* \* \*'/.test(wf)
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
      // Pole: pas zodra de workflow het ophaalt. Dan kloppen de tellers met de races.
      if ('metPole' in c && (c.metPole !== c.perRace.filter((r) => typeof r.poleWon === 'boolean').length
        || c.poleGewonnen !== c.perRace.filter((r) => r.poleWon === true).length)) fout.push(`${c.locatie}: pole`);
    }
    for (const r of alle) {
      const verwacht = r.pole?.nr && r.winnaar?.nr ? r.pole.nr === r.winnaar.nr : null;
      if ('poleWon' in r && r.poleWon !== verwacht) fout.push(`${r.datum}: poleWon ${r.poleWon}, pole ${r.pole?.nr}, winnaar ${r.winnaar?.nr}`);
    }
    if ('metPole' in d && (d.metPole !== alle.filter((r) => typeof r.poleWon === 'boolean').length
      || d.poleGewonnen !== alle.filter((r) => r.poleWon === true).length)) fout.push('pole in totaal');
    if (d.tot !== alle.map((r) => r.datum).sort().at(-1)) fout.push(`tot ${d.tot}`);
    check(`${BESTAND} klopt met zichzelf: totalen, pole en winnaar, geen dubbele sessie, vanaf ${VANAF}`, fout.length === 0,
      fout.join(' | ') || `${d.races} races, ${d.circuits.length} circuits, tot ${d.tot}`);
  }
}

// ---- 8. het ophalen, tegen een nagebootste OpenF1 --------------------------------------------------
{
  const nu = new Date();
  const ditJaar = nu.getUTCFullYear();
  const dag = (d) => new Date(nu.getTime() + d * 864e5).toISOString();
  const s = (key, circuit, locatie, jaar, start) => ({ ...sessie(key, circuit, locatie, locatie, `${jaar}-06-01`),
    meeting_key: 100 + key, date_start: start ?? `${jaar}-06-01T13:00:00+00:00`, date_end: start ?? `${jaar}-06-01T15:00:00+00:00` });
  // De kwalificatie van dezelfde meeting (sessie 50 + de race). Monza 2025
  // heeft er geen: die race telt niet mee voor pole.
  const q = (race) => ({ ...race, session_key: 50 + race.session_key, session_name: 'Qualifying' });
  const SESSIES = {
    2023: [s(1, 55, 'Zandvoort', 2023)],
    2024: [s(2, 55, 'Zandvoort', 2024), s(3, 21, 'Imola', 2024)],
    2025: [s(4, 39, 'Monza', 2025)],
    [ditJaar]: [s(5, 39, 'Monza', ditJaar, dag(-10)), s(6, 55, 'Zandvoort', ditJaar, dag(30))],
  };
  const BERICHTEN = { 1: zandvoort, 2: rustig, 3: null, 4: [bericht(3, 'SafetyCar', 'VSC DEPLOYED')], 5: rustig, 6: zandvoort };
  const QUALI = { 2023: [q(SESSIES[2023][0])], 2024: SESSIES[2024].map(q), [ditJaar]: SESSIES[ditJaar].map(q) };
  // Wie eerste werd, per sessie; de rest van het veld erachter.
  const EERSTE = { 1: 1, 51: 1, 2: 4, 52: 1, 4: 16, 5: 81, 55: 81 };
  const uitslag = (key) => (EERSTE[key] ? [{ driver_number: 44, position: 2 }, { driver_number: EERSTE[key], position: 1 }] : null);
  const RIJDERS = [{ driver_number: 1, first_name: 'Max', last_name: 'Verstappen', full_name: 'Max VERSTAPPEN' },
    { driver_number: 4, first_name: 'Lando', last_name: 'Norris' }, { driver_number: 81, full_name: 'Oscar PIASTRI' },
    { driver_number: 16, first_name: 'Charles', last_name: 'Leclerc' }];
  const gevraagd = [];
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    gevraagd.push(u.pathname + u.search);
    let body = null;
    if (u.pathname === '/sessions' && u.searchParams.get('session_name') === 'Race') body = SESSIES[u.searchParams.get('year')] ?? [];
    if (u.pathname === '/sessions' && u.searchParams.get('session_name') === 'Qualifying') body = QUALI[u.searchParams.get('year')] ?? [];
    if (u.pathname === '/race_control') body = BERICHTEN[u.searchParams.get('session_key')] ?? null;
    if (u.pathname === '/session_result') body = uitslag(u.searchParams.get('session_key'));
    if (u.pathname === '/drivers') body = RIJDERS;
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
  const jaren = gevraagd.filter((x) => x.startsWith('/sessions') && /session_name=Race/.test(x)).map((x) => new URLSearchParams(x.split('?')[1]).get('year'));
  check('elk seizoen vanaf 2023 tot en met dit jaar, alleen de races (session_name=Race)',
    code === 0 && jaren.join() === Array.from({ length: ditJaar - VANAF + 1 }, (_, i) => VANAF + i).join(), `${code} · ${jaren.join()}`);
  check('een race die nog moet komen, wordt niet opgevraagd',
    !gevraagd.includes('/race_control?session_key=6') && gevraagd.includes('/race_control?session_key=5'), gevraagd.join(' '));
  check('vier races geteld, met de regels van de app, en Imola (404) bij wat ontbreekt',
    /4 races van 2023 tot /.test(uit) && /SC in 2, rode vlag in 1/.test(uit) && /ontbreekt: 2024-06-01 Imola \(3\): OpenF1 gaf 404/.test(uit),
    uit.split('\n').filter((r) => /races van|ontbreekt/.test(r)).join(' / '));
  const regel = (datum) => uit.split('\n').find((r) => r.includes(datum) && /SC /.test(r)) ?? '';
  check('pole uit de kwalificatie van dezelfde meeting, de winnaar uit de race, met de naam uit drivers (zonder voornaam: full_name)',
    /pole Max Verstappen, winnaar Max Verstappen/.test(regel(`${VANAF}-06-01`)) && /pole Max Verstappen, winnaar Lando Norris/.test(regel('2024-06-01'))
      && /pole Oscar PIASTRI, winnaar Oscar PIASTRI/.test(regel(dag(-10).slice(0, 10))),
    [regel(`${VANAF}-06-01`), regel('2024-06-01'), regel(dag(-10).slice(0, 10))].join(' / '));
  check('een race zonder kwalificatie heeft geen pole en telt niet mee: de polesitter won 2 van de 3',
    /pole -, winnaar Charles Leclerc/.test(regel('2025-06-01')) && /races van 2023 tot [^\n]*pole won 2 van 3/.test(uit),
    `${regel('2025-06-01')} / ${uit.split('\n').find((r) => /races van/.test(r))}`);
  check('geen uitslag opgevraagd van een race die nog moet komen of zonder berichten',
    !gevraagd.some((x) => /session_result\?session_key=(6|56|3|53)$/.test(x)) && gevraagd.includes('/session_result?session_key=55'),
    gevraagd.filter((x) => x.startsWith('/session_result')).join(' '));
  check('DROOG schrijft niets weg', /DROOG: niets weggeschreven/.test(uit)
    && (existsSync(join(wortel, BESTAND)) ? statSync(join(wortel, BESTAND)).mtimeMs : null) === voor);
}

// ---- 9. uitersten() en de cijfers op de gids over de puntentelling ----------------------------------
{
  const c = (locatie, races, safetyCars) => ({ locatie, races, safetyCars, metSafetyCar: 0, metRodeVlag: 0, perRace: [] });
  // Veel in totaal is niet veel per race: Lang heeft er 9 in 6 races (1,5), Kort 6 in 3 (2,0).
  // Eén heeft er 5 in één race, maar te weinig races om mee te tellen.
  const u = uitersten({ races: 16, circuits: [c('Lang', 6, 9), c('Kort', 3, 6), c('Rustig', 4, 1), c('Leeg', 3, 0), c('Een', 1, 5)] });
  check('uitersten: het meeste en minste per race, niet in totaal, en alleen circuits met genoeg races',
    u.meest.locatie === 'Kort' && u.minst.locatie === 'Leeg' && MIN_RACES === 3, `${u.meest?.locatie} ${u.minst?.locatie}`);
  check('en het gemiddelde over alle races', u.gemiddeld === 21 / 16, String(u.gemiddeld));
  const gelijk = uitersten({ races: 7, circuits: [c('Zulu', 3, 3), c('Alfa', 3, 3), c('Bravo', 4, 4)] });
  check('bij gelijke stand het circuit met de meeste races, dan op naam', gelijk.meest.locatie === 'Bravo' && gelijk.minst.locatie === 'Bravo'
    && uitersten({ races: 6, circuits: [c('Zulu', 3, 3), c('Alfa', 3, 3)] }).meest.locatie === 'Alfa', `${gelijk.meest.locatie} ${gelijk.minst.locatie}`);
}
{
  const pad = join(wortel, BESTAND);
  const gids = PAGINAS.find((pg) => pg.id === 'puntentelling');
  const secties = Object.entries(gids.talen).filter(([, t]) => t.secties.some((x) => x.circuittabel));
  if (!existsSync(pad)) {
    check('zonder site/data/circuits.json heeft geen pagina een circuittabel', secties.length === 0, secties.map(([c]) => c).join());
  } else {
    const d = JSON.parse(readFileSync(pad, 'utf8'));
    const ontdoe = (x) => x.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    const perRace = (c) => c.safetyCars / c.races;
    const genoeg = d.circuits.filter((c) => c.races >= 3);
    const meest = genoeg.reduce((a, b) => (perRace(b) > perRace(a) ? b : a));
    const minst = genoeg.reduce((a, b) => (perRace(b) < perRace(a) ? b : a));
    const totaal = d.circuits.reduce((n, c) => n + c.safetyCars, 0);
    const fout = [];
    for (const [c, t] of Object.entries(gids.talen)) {
      const html = readFileSync(join(wortel, ...t.pad.split('/'), 'index.html'), 'utf8');
      const sectie = html.match(/<section class="vraag" id="safety-cars">([\s\S]*?)<\/section>/)?.[1];
      if (!sectie) { fout.push(`${c}: geen sectie safety-cars`); continue; }
      const rijen = [...sectie.matchAll(/<tr><th scope="row">([^<]+)<\/th><td>(\d+)<\/td><td>(\d+)<\/td><td>(\d+)<\/td><\/tr>/g)]
        .map((m) => m.slice(1).join('|'));
      const verwacht = d.circuits.map((x) => [x.locatie, x.races, x.safetyCars, x.metRodeVlag].join('|'));
      if (JSON.stringify(rijen) !== JSON.stringify(verwacht)) fout.push(`${c}: tabel ${rijen.length} regels, ${verwacht.length} verwacht`);
      if (!/<caption>[^<]+<\/caption>/.test(sectie)) fout.push(`${c}: tabel zonder bijschrift`);
      const kort = ontdoe(sectie.match(/<p class="kort">([\s\S]*?)<\/p>/)?.[1] ?? '');
      const gem = new Intl.NumberFormat(c, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(totaal / d.races);
      for (const n of [d.races, d.metSafetyCar, d.metRodeVlag, d.vanaf, gem]) if (!kort.includes(String(n))) fout.push(`${c}: ${n} niet in het korte antwoord`);
      const tekst = ontdoe(sectie);
      for (const x of [meest.locatie, `${meest.safetyCars}`, minst.locatie]) if (!tekst.includes(x)) fout.push(`${c}: ${x} niet in de tekst`);
    }
    check('de gids over de puntentelling toont de circuitcijfers: elke regel van de tabel, en de getallen in de tekst',
      secties.length === Object.keys(gids.talen).length && fout.length === 0,
      fout.join(' | ') || `${d.circuits.length} circuits, meest ${meest.locatie}, minst ${minst.locatie}`);
  }
}

process.exit(afronden() ? 0 : 1);
