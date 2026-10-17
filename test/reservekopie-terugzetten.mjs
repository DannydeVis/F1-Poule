// Een reservekopie terugzetten in een echte PostgreSQL (draait in de CI, in
// de schema-job; zie .github/workflows/tests.yml).
//
//   node test/reservekopie-terugzetten.mjs <database>
//
// De database heeft auth-nabootsing.sql en schema.sql al gehad. Dan:
//   1. vullen met een poule zoals die er in het echt uitziet, met in elke
//      tabel minstens één rij, en antwoorden voor een race waarvan de deadline
//      al voorbij is (die weigert de trigger normaal);
//   2. alles ophalen zoals de reservekopie dat doet (rijen als JSON), en per
//      tabel een vingerafdruk nemen;
//   3. de ramp: alle poules, races en de rest weg;
//   4. terugzetten met de SQL van terugzetSql(); de vingerafdrukken moeten
//      weer precies kloppen;
//   5. nog een keer terugzetten verandert niets (vult aan, dubbelt niet);
//   6. een rij die na de kopie veranderde, blijft zoals hij nu is;
//   7. de teller van races staat voorbij het hoogste nummer: een nieuwe race
//      zonder id botst niet.

import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TABELLEN, terugzetSql } from '../scripts/reservekopie.mjs';

const db = process.argv[2];
if (!db) { console.error('gebruik: node test/reservekopie-terugzetten.mjs <database>'); process.exit(1); }
const map = mkdtempSync(join(tmpdir(), 'terugzetten-'));

const psql = (sql) => {
  const pad = join(map, 'q.sql');
  writeFileSync(pad, sql);
  const r = spawnSync('psql', ['-d', db, '-v', 'ON_ERROR_STOP=1', '-At', '-q', '-f', pad], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  return r.stdout.trim();
};

let fouten = 0;
const check = (naam, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FOUT'} ${naam}${ok ? '' : ` — ${detail}`}`);
  if (!ok) fouten++;
};

// ---- 1. vullen ---------------------------------------------------------------------
psql(`
begin;
set local session_replication_role = replica;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'danny@voorbeeld.nl'),
  ('00000000-0000-0000-0000-0000000000a2', 'sanne@voorbeeld.nl');
insert into public.races (id, season, round, name, deadline_quali, deadline_race, drivers, quali_result, race_result, safety_cars)
values (101, 2026, 1, 'Melbourne', now() - interval '9 days', now() - interval '8 days',
        '[{"nr":"1","naam":"Max"}]', array['1','4'], array['4','1'], 2),
       (102, 2026, 2, 'Shanghai', now() + interval '5 days', now() + interval '6 days', null, null, null, null);
insert into public.pools (id, name, season, join_code) values ('00000000-0000-0000-0000-0000000000b1', 'Vrijdagmiddagpoule', 2026, 'RTM026');
insert into public.pool_teams (id, pool_id, naam) values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'Kantoor');
insert into public.pool_members (member_id, pool_id, display_name, user_id, team_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Danny', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1', 'Sanne', '00000000-0000-0000-0000-0000000000a2', null);
update public.pools set owner_member_id = '00000000-0000-0000-0000-0000000000d1' where id = '00000000-0000-0000-0000-0000000000b1';
insert into public.pool_questions (pool_id, question_id) values
  ('00000000-0000-0000-0000-0000000000b1', 'race_top10'), ('00000000-0000-0000-0000-0000000000b1', 'winnaar');
insert into public.answers (pool_id, race_id, member_id, question_id, waarde) values
  ('00000000-0000-0000-0000-0000000000b1', 101, '00000000-0000-0000-0000-0000000000d1', 'race_top10', '["4","1"]'),
  ('00000000-0000-0000-0000-0000000000b1', 101, '00000000-0000-0000-0000-0000000000d2', 'winnaar', '"1"');
insert into public.jokers (pool_id, race_id, member_id) values ('00000000-0000-0000-0000-0000000000b1', 101, '00000000-0000-0000-0000-0000000000d1');
insert into public.pool_eigen_vragen (id, pool_id, race_id, vraag, opties, uitkomst) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 101, 'Regent het?', array['ja','nee'], 'nee');
insert into public.pool_eigen_antwoorden (vraag_id, member_id, keuze) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d2', 'ja');
insert into public.pool_periodes (pool_id, seizoen, naam, van_ronde, tot_ronde, prijs) values
  ('00000000-0000-0000-0000-0000000000b1', 2026, 'Voorjaar', 1, 6, 'Een taart');
insert into public.push_abonnementen (endpoint, member_id, pool_id, p256dh, auth) values
  ('https://push.voorbeeld/1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'sleutel', 'geheim');
insert into public.site_beheerders (user_id) values ('00000000-0000-0000-0000-0000000000a1');
insert into public.sync_runs (id, ok, bijgewerkt, samenvatting) values (7001, true, 3, 'Melbourne nagekeken');
insert into public.bezoeken (dag, pad, aantal) values (current_date, '/app/', 12);
insert into public.actief (dag, user_id) values (current_date, '00000000-0000-0000-0000-0000000000a2');
insert into public.aanmaak_log (user_id) values ('00000000-0000-0000-0000-0000000000a1');
commit;
`);
const leeg = TABELLEN.filter((t) => psql(`select count(*) from public.${t};`) === '0');
check('in elke tabel staat minstens één rij', !leeg.length, `leeg: ${leeg}`);

// ---- 2. ophalen en vingerafdrukken -------------------------------------------------
const ophalen = () => Object.fromEntries(TABELLEN.map((t) =>
  [t, JSON.parse(psql(`select coalesce(json_agg(x), '[]') from public.${t} x;`))]));
const vinger = () => Object.fromEntries(TABELLEN.map((t) =>
  [t, psql(`select count(*) || ':' || coalesce(md5(string_agg(x::text, '|' order by x::text)), '') from public.${t} x;`)]));
const kopie = { gemaakt: new Date().toISOString(), tabellen: ophalen() };
const voor = vinger();

// ---- 3. de ramp --------------------------------------------------------------------
psql(`delete from public.pools; delete from public.races; delete from public.site_beheerders;
      delete from public.verboden_woorden; delete from public.aanmaak_log;
      delete from public.sync_runs; delete from public.bezoeken; delete from public.actief;`);
check('na de ramp is de poule weg', psql('select count(*) from public.pool_members;') === '0'
  && psql('select count(*) from public.answers;') === '0');

// ---- 4. terugzetten ----------------------------------------------------------------
const sqlPad = join(map, 'terug.sql');
writeFileSync(sqlPad, terugzetSql(kopie));
const zetTerug = () => {
  const r = spawnSync('psql', ['-d', db, '-v', 'ON_ERROR_STOP=1', '-q', '-f', sqlPad], { encoding: 'utf8' });
  return r.status === 0 ? '' : r.stderr;
};
let fout = zetTerug();
check('de SQL draait zonder fouten, ook met antwoorden na de deadline', !fout, fout);
const na = vinger();
const anders = TABELLEN.filter((t) => voor[t] !== na[t]);
check('elke tabel is precies terug zoals hij was', !anders.length, anders.map((t) => `${t}: ${voor[t]} → ${na[t]}`).join('; '));

// ---- 5. nog een keer ----------------------------------------------------------------
fout = zetTerug();
const weer = vinger();
check('nog een keer terugzetten verandert niets', !fout && TABELLEN.every((t) => weer[t] === voor[t]), fout);

// ---- 6. wat er nog staat blijft staan -------------------------------------------------
psql(`update public.pool_members set display_name = 'Danny de Vis' where member_id = '00000000-0000-0000-0000-0000000000d1';`);
zetTerug();
check('een rij die na de kopie veranderde, blijft zoals hij nu is',
  psql(`select display_name from public.pool_members where member_id = '00000000-0000-0000-0000-0000000000d1';`) === 'Danny de Vis');

// ---- 7. de teller ------------------------------------------------------------------
const id = psql(`insert into public.races (season, round, name) values (2026, 3, 'Suzuka') returning id;`);
check('een nieuwe race na het terugzetten krijgt een nummer voorbij het hoogste', Number(id) > 102, id);

console.log(fouten ? `${fouten} fout(en)` : 'reservekopie terugzetten: alles klopt');
process.exit(fouten ? 1 : 0);
