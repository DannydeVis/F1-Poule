-- Reacties op elkaars weekend in de database (15 november).
--
-- Een speler zet een van vijf vaste reacties bij het weekend van een
-- poulegenoot. De app tekent er een emoji bij; hier ligt vast wie wat mag:
--
--   1. Reageren kan voor je eigen speler, op een ander in dezelfde poule, op
--      een weekend met een uitslag, en alleen een van de vijf.
--   2. Niet op jezelf, niet voor een ander, niet op iemand uit een andere
--      poule, niet op een weekend zonder uitslag, niet iets anders dan de
--      vijf, niet zonder account.
--   3. Nog een keer reageren overschrijft; leeg haalt je reactie weg.
--   4. poule_ophalen geeft de reacties van de eigen poule, niet die van een
--      andere.
--   5. De tabel is niet rechtstreeks te lezen of te schrijven.
--   6. Gaat een speler weg, dan gaan zijn reacties en de reacties op hem mee.
--   7. De controleregels kennen de tabel en de functie.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('aaaaaaaa-0000-0000-0000-0000000000e2', null, null, true),  -- Anna
  ('bbbbbbbb-0000-0000-0000-0000000000e3', null, null, true),  -- Bram, zelfde poule
  ('cccccccc-0000-0000-0000-0000000000e4', null, null, true),  -- Chris, andere poule
  ('dddddddd-0000-0000-0000-0000000000e5', null, null, true);  -- Dirk, zelfde poule als Anna

insert into pools (id, name, join_code) values
  ('11111111-0000-0000-0000-0000000000e1', 'Vrijdagpoule', 'REACT1'),
  ('22222222-0000-0000-0000-0000000000e2', 'Andere poule', 'REACT2');
insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa0000-0000-0000-0000-0000000000e1', '11111111-0000-0000-0000-0000000000e1', 'Anna', 'aaaaaaaa-0000-0000-0000-0000000000e2'),
  ('bbbb0000-0000-0000-0000-0000000000e2', '11111111-0000-0000-0000-0000000000e1', 'Bram', 'bbbbbbbb-0000-0000-0000-0000000000e3'),
  ('cccc0000-0000-0000-0000-0000000000e3', '22222222-0000-0000-0000-0000000000e2', 'Chris', 'cccccccc-0000-0000-0000-0000000000e4'),
  ('dddd0000-0000-0000-0000-0000000000e4', '11111111-0000-0000-0000-0000000000e1', 'Dirk', 'dddddddd-0000-0000-0000-0000000000e5');

-- 9201: gereden. 9202: alleen de kwalificatie binnen. 9203: nog niets.
insert into races (id, season, round, name, deadline_quali, deadline_race, quali_result, race_result) values
  (9201, 2099, 1, 'Gereden', now() - interval '3 days', now() - interval '2 days', array['1','4'], array['4','1']),
  (9202, 2099, 2, 'Halverwege', now() - interval '1 day', now() + interval '1 hour', array['1','4'], null),
  (9203, 2099, 3, 'Toekomst', now() + interval '6 days', now() + interval '7 days', null, null);

create function pg_temp.fout_bij(sql text, verwacht text, wat text) returns void language plpgsql as $$
declare fout text;
begin
  begin
    execute sql;
  exception when others then fout := sqlerrm;
  end;
  if fout is null or fout not like '%' || verwacht || '%' then
    raise exception 'gezakt: % (fout: %)', wat, coalesce(fout, 'geen');
  end if;
  raise notice 'ok: %', wat;
end $$;

create function pg_temp.als(sub text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
end $$;

do $$
declare
  uit jsonb;
begin
  set local role authenticated;

  -- ---- 1. reageren ------------------------------------------------------------
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000e2');
  perform public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 9201, 'bbbb0000-0000-0000-0000-0000000000e2', 'klap');
  perform public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 9202, 'bbbb0000-0000-0000-0000-0000000000e2', 'vuur');
  reset role;
  if (select soort from reacties where race_id = 9201 and van_member = 'aaaa0000-0000-0000-0000-0000000000e1') <> 'klap'
     or (select count(*) from reacties) <> 2 then
    raise exception 'gezakt: de reacties staan er niet';
  end if;
  raise notice 'ok: reageren op een poulegenoot, ook als alleen de kwalificatie binnen is';
  set local role authenticated;

  -- ---- 2. wat niet mag -----------------------------------------------------------
  perform pg_temp.fout_bij($q$select public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 9201, 'aaaa0000-0000-0000-0000-0000000000e1', 'klap')$q$,
    'op jezelf', 'niet op jezelf');
  perform pg_temp.fout_bij($q$select public.reactie_geven('bbbb0000-0000-0000-0000-0000000000e2', 9201, 'aaaa0000-0000-0000-0000-0000000000e1', 'klap')$q$,
    'alleen voor jezelf', 'niet voor een ander');
  perform pg_temp.fout_bij($q$select public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 9201, 'cccc0000-0000-0000-0000-0000000000e3', 'klap')$q$,
    'niet in je poule', 'niet op iemand uit een andere poule');
  perform pg_temp.fout_bij($q$select public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 9201, gen_random_uuid(), 'klap')$q$,
    'niet in je poule', 'niet op een speler die niet bestaat');
  perform pg_temp.fout_bij($q$select public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 9203, 'bbbb0000-0000-0000-0000-0000000000e2', 'klap')$q$,
    'pas als er een uitslag is', 'niet op een weekend zonder uitslag');
  perform pg_temp.fout_bij($q$select public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 424242, 'bbbb0000-0000-0000-0000-0000000000e2', 'klap')$q$,
    'pas als er een uitslag is', 'niet op een race die niet bestaat');
  perform pg_temp.fout_bij($q$select public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 9201, 'bbbb0000-0000-0000-0000-0000000000e2', 'sukkel')$q$,
    'een van de reacties', 'niets anders dan de vijf');
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '', true);
  perform pg_temp.fout_bij($q$select public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 9201, 'bbbb0000-0000-0000-0000-0000000000e2', 'lach')$q$,
    'alleen voor jezelf', 'niet zonder account');
  reset role;
  perform pg_temp.fout_bij($q$insert into public.reacties (race_id, van_member, aan_member, soort)
    values (9201, 'dddd0000-0000-0000-0000-0000000000e4', 'bbbb0000-0000-0000-0000-0000000000e2', 'sukkel')$q$,
    'reacties_soort', 'ook rechtstreeks in de tabel alleen de vijf');
  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000e2');

  -- ---- 3. overschrijven en weghalen ----------------------------------------------------
  perform public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 9201, 'bbbb0000-0000-0000-0000-0000000000e2', 'schedel');
  reset role;
  if (select count(*) from reacties where race_id = 9201) <> 1
     or (select soort from reacties where race_id = 9201) <> 'schedel' then
    raise exception 'gezakt: nog een keer reageren overschrijft niet';
  end if;
  set local role authenticated;
  perform public.reactie_geven('aaaa0000-0000-0000-0000-0000000000e1', 9202, 'bbbb0000-0000-0000-0000-0000000000e2', null);
  reset role;
  if exists (select 1 from reacties where race_id = 9202) or (select count(*) from reacties) <> 1 then
    raise exception 'gezakt: leeg haalt de reactie niet weg, of te veel';
  end if;
  raise notice 'ok: nog een keer reageren overschrijft, leeg haalt alleen die reactie weg';
  set local role authenticated;

  -- ---- 4. poule_ophalen ----------------------------------------------------------------------
  perform pg_temp.als('dddddddd-0000-0000-0000-0000000000e5');
  perform public.reactie_geven('dddd0000-0000-0000-0000-0000000000e4', 9201, 'aaaa0000-0000-0000-0000-0000000000e1', 'lach');
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000e3');
  uit := public.poule_ophalen('REACT1') -> 'reacties';
  if jsonb_array_length(uit) <> 2
     or not exists (select 1 from jsonb_array_elements(uit) x where x ->> 'van' = 'aaaa0000-0000-0000-0000-0000000000e1'
          and x ->> 'aan' = 'bbbb0000-0000-0000-0000-0000000000e2' and x ->> 'soort' = 'schedel' and (x ->> 'race_id')::int = 9201)
     or not exists (select 1 from jsonb_array_elements(uit) x where x ->> 'van' = 'dddd0000-0000-0000-0000-0000000000e4'
          and x ->> 'aan' = 'aaaa0000-0000-0000-0000-0000000000e1' and x ->> 'soort' = 'lach') then
    raise exception 'gezakt: poule_ophalen geeft de reacties niet zoals bedoeld: %', uit;
  end if;
  raise notice 'ok: iedereen in de poule ziet alle reacties in de poule';
  perform pg_temp.als('cccccccc-0000-0000-0000-0000000000e4');
  if jsonb_array_length(public.poule_ophalen('REACT2') -> 'reacties') <> 0 then
    raise exception 'gezakt: een andere poule krijgt de reacties mee';
  end if;
  raise notice 'ok: een andere poule krijgt er niets van mee';

  -- ---- 5. de tabel is dicht --------------------------------------------------------------------
  perform pg_temp.fout_bij('select * from public.reacties', 'permission denied', 'met een account lees je de tabel niet');
  perform pg_temp.fout_bij($q$insert into public.reacties (race_id, van_member, aan_member, soort)
    values (9201, 'cccc0000-0000-0000-0000-0000000000e3', 'aaaa0000-0000-0000-0000-0000000000e1', 'klap')$q$,
    'permission denied', 'en schrijf je er niet rechtstreeks in');
  perform pg_temp.fout_bij($q$update public.reacties set soort = 'klap'$q$, 'permission denied', 'ook niet om te veranderen');
  reset role;
  set local role anon;
  perform pg_temp.fout_bij('select * from public.reacties', 'permission denied', 'anoniem leest de tabel ook niet');
  reset role;

  -- ---- 6. de speler weg, de reacties weg ---------------------------------------------------------
  -- Anna gaf er een (aan Bram) en kreeg er een (van Dirk): allebei weg.
  delete from pool_members where member_id = 'aaaa0000-0000-0000-0000-0000000000e1';
  if (select count(*) from reacties) <> 0 then
    raise exception 'gezakt: reacties van of op een verwijderde speler blijven staan';
  end if;
  raise notice 'ok: gaat een speler weg, dan gaan zijn reacties en de reacties op hem mee';

  -- ---- 7. de controleregels ------------------------------------------------------------------------
  if (select uitkomst from public.poule_controle where controle = 'functies en tabellen: alleen die uit schema.sql') <> 'ok' then
    raise exception 'gezakt: de controleregels kennen de reacties niet: %',
      (select uitkomst from public.poule_controle where controle = 'functies en tabellen: alleen die uit schema.sql');
  end if;
  raise notice 'ok: de controleregels kennen de tabel en de functie';
end $$;

do $$ begin raise notice 'ok: reacties.test.sql helemaal geslaagd'; end $$;
