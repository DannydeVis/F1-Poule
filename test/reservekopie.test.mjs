// De reservekopie (scripts/reservekopie.mjs) en zijn workflow.
//
// Draait zonder internet: het script praat met een nagebootste Supabase op
// localhost.
//
// Wat hier vastligt:
//   1. Elke tabel uit schema.sql zit in de kopie; een nieuwe tabel die
//      ontbreekt laat deze test zakken.
//   2. Ophalen in stukken van duizend: een tabel met meer rijen komt heel mee.
//   3. Het bestand is versleuteld: geen naam, geen e-mail, geen JSON te lezen.
//      Met het goede wachtwoord komt alles terug, met een verkeerd niet, en
//      een veranderd bestand wordt geweigerd.
//   4. Zonder wachtwoord, met een kort wachtwoord, met de anon-sleutel, met een
//      lege races-tabel of met poules zonder spelers zakt het script, liever
//      dan een kopie te maken die er goed uitziet en niets waard is.
//   5. De SQL om terug te zetten: alles in één transactie, triggers uit, vult
//      aan zonder te overschrijven, en de tellers van races en sync_runs
//      schuiven door. Dat het in PostgreSQL ook echt terugkomt, test
//      reservekopie-terugzetten.mjs in de CI (schema-job).
//   6. De workflow: elke nacht, geeft de secrets mee, bewaart de kopie 90 dagen
//      als bijlage en legt niets vast in de repo.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { TABELLEN, versleutel, ontsleutel, terugzetSql, maakKopie, isServiceSleutel } from '../scripts/reservekopie.mjs';

const { check, afronden } = maakControle('de reservekopie van de database');
const WACHTWOORD = 'een-lang-genoeg-wachtwoord';

// ---- 1. elke tabel ---------------------------------------------------------------
{
  const schema = readFileSync(join(wortel, 'schema.sql'), 'utf8');
  const inSchema = [...schema.matchAll(/^create table if not exists public\.(\w+)/gm)].map((m) => m[1]);
  const mist = inSchema.filter((t) => !TABELLEN.includes(t));
  const teveel = TABELLEN.filter((t) => !inSchema.includes(t));
  check('elke tabel uit schema.sql zit in de reservekopie', inSchema.length > 10 && !mist.length, `ontbreekt: ${mist}`);
  check('en er staat geen tabel in die schema.sql niet kent', !teveel.length, `onbekend: ${teveel}`);
  const voor = (a, b) => TABELLEN.indexOf(a) < TABELLEN.indexOf(b);
  check('de volgorde: eerst waar andere tabellen naar wijzen',
    voor('races', 'answers') && voor('pools', 'pool_members') && voor('pool_teams', 'pool_members')
      && voor('pool_members', 'answers') && voor('pool_eigen_vragen', 'pool_eigen_antwoorden'));
}

// ---- de nagebootste Supabase -----------------------------------------------------
// Sleutels zoals Supabase ze uitgeeft: een JWT met de rol erin.
const jwt = (role) => ['e30', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'x'].join('.');
const SERVICE = jwt('service_role'), ANON = jwt('anon');
const DATA = Object.fromEntries(TABELLEN.map((t) => [t, []]));
DATA.races = Array.from({ length: 2345 }, (_, i) => ({ id: i + 1, name: `Race ${i + 1}` }));
DATA.pools = [{ id: 'p1', name: 'Vrijdagmiddagpoule' }];
DATA.pool_members = [{ member_id: 'm1', pool_id: 'p1', display_name: 'Geheimenaam Jansen' }];
DATA.site_beheerders = [{ user_id: 'u1', email: 'iemand@voorbeeld.nl' }];
let verzoeken = [];
const server = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const tabel = u.pathname.replace('/rest/v1/', '');
  verzoeken.push({ tabel, range: req.headers.range, sleutel: req.headers.apikey, auth: req.headers.authorization });
  const [van, tot] = req.headers.range.split('-').map(Number);
  res.setHeader('content-type', 'application/json');
  // Met de anon-sleutel: races wel, al het andere door de policies niet.
  const rijen = req.headers.apikey === SERVICE || tabel === 'races' ? DATA[tabel] ?? [] : [];
  res.end(JSON.stringify(rijen.slice(van, tot + 1)));
});
await new Promise((r) => server.listen(0, r));
const URL_ = `http://127.0.0.1:${server.address().port}`;

const draai = (args, env) => new Promise((klaar) => {
  const p = spawn(process.execPath, [join(wortel, 'scripts/reservekopie.mjs'), ...args],
    { env: { PATH: process.env.PATH, ...env } });
  let uit = '';
  p.stdout.on('data', (d) => { uit += d; });
  p.stderr.on('data', (d) => { uit += d; });
  p.on('close', (code) => klaar({ code, uit }));
});

// ---- 2. ophalen ------------------------------------------------------------------
const map = mkdtempSync(join(tmpdir(), 'reservekopie-'));
const bestand = join(map, 'kopie.ptrk');
{
  const r = await draai([], { SUPABASE_URL: `${URL_}/`, SUPABASE_KEY: SERVICE, RESERVEKOPIE_WACHTWOORD: WACHTWOORD, UIT: bestand });
  check('met de service-sleutel en een wachtwoord maakt hij een kopie', r.code === 0 && existsSync(bestand), r.uit);
  const races = verzoeken.filter((v) => v.tabel === 'races').map((v) => v.range);
  check('een tabel met 2345 rijen haalt hij in drie stukken van duizend', races.join() === '0-999,1000-1999,2000-2999', races.join());
  check('elke tabel wordt gevraagd', TABELLEN.every((t) => verzoeken.some((v) => v.tabel === t)));
  check('met de sleutel als apikey en als Bearer', verzoeken.every((v) => v.sleutel === SERVICE && v.auth === `Bearer ${SERVICE}`));
  check('en hij meldt per tabel hoeveel rijen', /races\s+2345/.test(r.uit) && /pool_members\s+1/.test(r.uit), r.uit);
}

// ---- 3. versleuteld --------------------------------------------------------------
{
  const ruw = readFileSync(bestand);
  const tekst = ruw.toString('latin1');
  check('in het bestand staat geen naam, geen e-mail en geen JSON',
    !tekst.includes('Geheimenaam') && !tekst.includes('voorbeeld.nl') && !tekst.includes('"races"'));
  const kopie = ontsleutel(ruw, WACHTWOORD);
  check('met het goede wachtwoord komt alles terug',
    kopie.tabellen.races.length === 2345 && kopie.tabellen.pool_members[0].display_name === 'Geheimenaam Jansen'
      && TABELLEN.every((t) => Array.isArray(kopie.tabellen[t])));
  check('met de datum waarop hij gemaakt is', !Number.isNaN(Date.parse(kopie.gemaakt)), kopie.gemaakt);
  let fout = '';
  try { ontsleutel(ruw, 'een-ander-wachtwoord-van-lengte'); } catch (e) { fout = e.message; }
  check('met een verkeerd wachtwoord niet', fout.includes('verkeerd wachtwoord'), fout);
  const anders = Buffer.from(ruw); anders[anders.length - 5] ^= 1;
  fout = '';
  try { ontsleutel(anders, WACHTWOORD); } catch (e) { fout = e.message; }
  check('een bestand waar één bit in veranderd is, wordt geweigerd', fout.includes('beschadigd'), fout);
  const tweede = versleutel({ a: 1 }, WACHTWOORD), derde = versleutel({ a: 1 }, WACHTWOORD);
  check('twee keer hetzelfde versleutelen geeft twee verschillende bestanden (eigen zout en iv)', !tweede.equals(derde));

  // open: .json en .sql ernaast
  const r = await draai(['open', bestand], { RESERVEKOPIE_WACHTWOORD: WACHTWOORD });
  const basis = bestand.replace(/\.ptrk$/, '');
  check('open schrijft er een .json en een .sql naast', r.code === 0 && existsSync(`${basis}.json`) && existsSync(`${basis}.sql`), r.uit);
  check('en de .json is de hele kopie', JSON.parse(readFileSync(`${basis}.json`, 'utf8')).tabellen.races.length === 2345);
  const mis = await draai(['open', bestand], { RESERVEKOPIE_WACHTWOORD: 'een-ander-wachtwoord-van-lengte' });
  check('open met een verkeerd wachtwoord zakt', mis.code !== 0 && mis.uit.includes('verkeerd wachtwoord'), mis.uit);
}

// ---- 4. liever rood dan een lege kopie -------------------------------------------
{
  const env = { SUPABASE_URL: URL_, SUPABASE_KEY: SERVICE, UIT: join(map, 'x.ptrk') };
  let r = await draai([], env);
  check('zonder wachtwoord zakt hij, met uitleg waar het secret hoort', r.code !== 0 && r.uit.includes('RESERVEKOPIE_WACHTWOORD') && r.uit.includes('BEDIENING'), r.uit);
  r = await draai([], { ...env, RESERVEKOPIE_WACHTWOORD: 'kort' });
  check('met een wachtwoord korter dan 16 tekens ook', r.code !== 0 && r.uit.includes('te kort'), r.uit);
  const voorAnon = verzoeken.length;
  r = await draai([], { ...env, SUPABASE_KEY: ANON, RESERVEKOPIE_WACHTWOORD: WACHTWOORD });
  check('met de anon-sleutel zakt hij, nog voor hij iets vraagt',
    r.code !== 0 && r.uit.includes('niet de service-sleutel') && !existsSync(env.UIT) && verzoeken.length === voorAnon, r.uit);
  check('de sleutel herkent hij aan de rol in de JWT en aan het voorvoegsel',
    isServiceSleutel(SERVICE) && !isServiceSleutel(ANON) && isServiceSleutel('sb_secret_abc')
      && !isServiceSleutel('sb_publishable_abc') && !isServiceSleutel('onzin'));
  let fout = '';
  const leeg = async () => ({ ok: true, json: async () => [] });
  try { await maakKopie('http://x', SERVICE, leeg); } catch (e) { fout = e.message; }
  check('met een lege races-tabel ook', fout.includes('races is leeg'), fout);
  fout = '';
  const zonderSpelers = async (u) => ({ ok: true, json: async () => (/races|pools\?/.test(u) ? [{ id: 1 }] : []) });
  try { await maakKopie('http://x', SERVICE, zonderSpelers); } catch (e) { fout = e.message; }
  check('en met poules maar zonder één speler', fout.includes('geen spelers'), fout);
  fout = '';
  try { await maakKopie('http://x', SERVICE, async () => ({ ok: false, status: 401, text: async () => 'nee' })); } catch (e) { fout = e.message; }
  check('en een fout van Supabase noemt de tabel en de status', fout.startsWith('races: 401'), fout);
}

// ---- 5. de SQL om terug te zetten -------------------------------------------------
{
  const kopie = { gemaakt: '2026-10-17T02:41:00.000Z', tabellen: {
    races: [{ id: 1, name: "Grand Prix van 's-Hertogenbosch" }],
    pools: [{ id: 'p1', name: 'met $reservekopie$ erin' }],
    pool_members: [], answers: [{ pool_id: 'p1', race_id: 1, member_id: 'm1', question_id: 'winnaar', waarde: '1' }],
  } };
  const sql = terugzetSql(kopie);
  const r = sql.split('\n');
  check('alles in één transactie', r.includes('begin;') && r.includes('commit;') && r.indexOf('begin;') < r.indexOf('commit;'));
  check('met de triggers uit (die zouden een antwoord na de deadline weigeren)',
    r.indexOf('set local session_replication_role = replica;') === r.indexOf('begin;') + 1);
  check('vult aan zonder te overschrijven', sql.match(/on conflict do nothing/g)?.length === 3, sql);
  check('lege tabellen slaat hij over', !sql.includes('insert into public.pool_members'));
  check('in de volgorde van TABELLEN', sql.indexOf('public.races select') < sql.indexOf('public.pools select')
    && sql.indexOf('public.pools select') < sql.indexOf('public.answers select'));
  check('een dollar-quote die in de gegevens voorkomt, wordt een andere', sql.includes('$reservekopiex$[') && !sql.includes('$reservekopie$['), sql.slice(0, 600));
  check('de tellers van races en sync_runs schuiven door',
    sql.includes("setval(pg_get_serial_sequence('public.races', 'id')") && sql.includes("setval(pg_get_serial_sequence('public.sync_runs', 'id')"));
  check('en daarna per tabel hoeveel rijen er nu staan', TABELLEN.every((t) => sql.includes(`select '${t}' as tabel`)) && sql.trimEnd().endsWith(';'));
}

// ---- 6. de workflow ----------------------------------------------------------------
{
  const wf = readFileSync(join(wortel, '.github/workflows/reservekopie.yml'), 'utf8');
  const code = wf.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');
  check('elke nacht, en met de hand te starten', /cron: '\d+ \d+ \* \* \*'/.test(code) && code.includes('workflow_dispatch'));
  check('geeft de drie secrets mee aan het script',
    ['SUPABASE_URL', 'SUPABASE_KEY', 'RESERVEKOPIE_WACHTWOORD'].every((s) => code.includes(`\${{ secrets.${s} }}`)) && code.includes('node scripts/reservekopie.mjs'));
  check('bewaart de kopie 90 dagen als bijlage bij de run',
    code.includes('actions/upload-artifact@v4') && code.includes('retention-days: 90') && code.includes('reservekopie/*.ptrk') && code.includes('if-no-files-found: error'));
  check('en legt niets vast in de repo (alleen leesrechten)',
    !/git (add|commit|push)/.test(code) && /permissions:\s*\n\s*contents: read/.test(code) && !code.includes('contents: write'));
  const negeer = readFileSync(join(wortel, '.gitignore'), 'utf8');
  check('een geopende kopie komt niet per ongeluk in git', negeer.includes('reservekopie/') && negeer.includes('*.ptrk'));
  const tests = readFileSync(join(wortel, '.github/workflows/tests.yml'), 'utf8');
  check('de CI zet een kopie ook echt terug in PostgreSQL', tests.includes('test/reservekopie-terugzetten.mjs'));
}

server.close();
process.exit(afronden() ? 0 : 1);
