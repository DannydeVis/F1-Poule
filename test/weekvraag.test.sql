-- De vraag van de week in de database (15 november).
--
-- Elk weekend één vraag: wie van twee teamgenoten is sneller in de eerste
-- vrije training? De app rekent uit welke twee en wie er gelijk had; hier ligt
-- vast wie wat mag:
--
--   1. Kiezen kan voor je eigen speler, zolang de eerste training niet
--      begonnen is, en alleen een coureur uit de deelnemerslijst.
--   2. Niet voor een medespeler, niet iets anders, niet na de start, en niet
--      voor een weekend zonder rooster.
--   3. Nog een keer kiezen overschrijft; leeg haalt je keuze weg.
--   4. Geheim tot de start: poule_ophalen geeft van medespelers pas een keuze
--      als de eerste training begonnen is; je eigen altijd.
--   5. De tabel is niet rechtstreeks te lezen of te schrijven.
--   6. Gaat de speler weg, dan gaat zijn keuze mee.
--   7. Een rooster met een start die geen tijd is breekt niets: dicht.
--   8. De controleregels kennen de tabel en de functies.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('aaaaaaaa-0000-0000-0000-0000000000d2', null, null, true),  -- Anna
  ('bbbbbbbb-0000-0000-0000-0000000000d3', null, null, true),  -- Bram, zelfde poule
  ('cccccccc-0000-0000-0000-0000000000d4', null, null, true);  -- Chris, andere poule

insert into pools (id, name, join_code) values
  ('11111111-0000-0000-0000-0000000000d1', 'Vrijdagpoule', 'WEEKV1'),
  ('22222222-0000-0000-0000-0000000000d2', 'Andere poule', 'WEEKV2');
insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa0000-0000-0000-0000-0000000000d1', '11111111-0000-0000-0000-0000000000d1', 'Anna', 'aaaaaaaa-0000-0000-0000-0000000000d2'),
  ('bbbb0000-0000-0000-0000-0000000000d2', '11111111-0000-0000-0000-0000000000d1', 'Bram', 'bbbbbbbb-0000-0000-0000-0000000000d3'),
  ('cccc0000-0000-0000-0000-0000000000d3', '22222222-0000-0000-0000-0000000000d2', 'Chris', 'cccccccc-0000-0000-0000-0000000000d4');

-- 9101: de eerste training is morgen. 9102: hij is gisteren begonnen.
-- 9103: nog geen rooster. 9104: een start die geen tijd is.
insert into races (id, season, round, name, deadline_quali, deadline_race, drivers, vrije_trainingen) values
  (9101, 2099, 1, 'Toekomst', now() + interval '2 days', now() + interval '3 days',
   '[{"nr":"1","team":"Rood"},{"nr":"11","team":"Rood"},{"nr":"44","team":"Zilver"}]',
   jsonb_build_array(
     jsonb_build_object('naam', 'Practice 2', 'start', now() + interval '28 hours'),
     jsonb_build_object('naam', 'Practice 1', 'start', now() + interval '1 day'))),
  (9102, 2099, 2, 'Verleden', now() + interval '1 day', now() + interval '2 days',
   '[{"nr":"1","team":"Rood"},{"nr":"11","team":"Rood"}]',
   jsonb_build_array(jsonb_build_object('naam', 'Practice 1', 'start', now() - interval '1 day'))),
  (9103, 2099, 3, 'Zonder rooster', now() + interval '20 days', now() + interval '21 days',
   '[{"nr":"1","team":"Rood"},{"nr":"11","team":"Rood"}]', null),
  (9104, 2099, 4, 'Kapot rooster', now() + interval '30 days', now() + interval '31 days',
   '[{"nr":"1","team":"Rood"},{"nr":"11","team":"Rood"}]',
   '[{"naam":"Practice 1","start":"geen tijd"}]');

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
  -- Wat er al stond toen de training begon: om het geheim na de start te testen.
  insert into weekvraag_antwoorden (race_id, member_id, keuze) values
    (9102, 'aaaa0000-0000-0000-0000-0000000000d1', '1'),
    (9102, 'bbbb0000-0000-0000-0000-0000000000d2', '11');

  if public.weekvraag_sluit(9101) is distinct from
       (select min((t ->> 'start')::timestamptz) from races r, jsonb_array_elements(r.vrije_trainingen) t where r.id = 9101)
     or abs(extract(epoch from public.weekvraag_sluit(9101) - (now() + interval '1 day'))) > 5 then
    raise exception 'gezakt: de vraag sluit niet bij de start van de eerste training';
  end if;
  if not public.weekvraag_open(9101) or public.weekvraag_open(9102) or public.weekvraag_open(9103)
     or public.weekvraag_open(9104) or public.weekvraag_open(424242) then
    raise exception 'gezakt: open en dicht kloppen niet';
  end if;
  raise notice 'ok: open tot de vroegste training begint; zonder rooster, met een kapot rooster of zonder race dicht';

  set local role authenticated;

  -- ---- 1. kiezen -------------------------------------------------------------
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000d2');
  perform public.weekvraag_kiezen('aaaa0000-0000-0000-0000-0000000000d1', 9101, '1');
  reset role;
  if (select keuze from weekvraag_antwoorden where race_id = 9101 and member_id = 'aaaa0000-0000-0000-0000-0000000000d1') <> '1' then
    raise exception 'gezakt: de keuze staat er niet';
  end if;
  raise notice 'ok: kiezen voor je eigen speler, voor de eerste training';
  set local role authenticated;

  -- ---- 2. wat niet mag ---------------------------------------------------------
  perform pg_temp.fout_bij($q$select public.weekvraag_kiezen('bbbb0000-0000-0000-0000-0000000000d2', 9101, '1')$q$,
    'alleen voor jezelf', 'niet voor een medespeler');
  perform pg_temp.fout_bij($q$select public.weekvraag_kiezen('cccc0000-0000-0000-0000-0000000000d3', 9101, '1')$q$,
    'alleen voor jezelf', 'niet voor iemand uit een andere poule');
  perform pg_temp.fout_bij($q$select public.weekvraag_kiezen('aaaa0000-0000-0000-0000-0000000000d1', 9101, '99')$q$,
    'een van de twee coureurs', 'geen coureur die niet in de lijst staat');
  perform pg_temp.fout_bij($q$select public.weekvraag_kiezen('aaaa0000-0000-0000-0000-0000000000d1', 9102, '11')$q$,
    'gesloten', 'niet meer als de eerste training begonnen is');
  perform pg_temp.fout_bij($q$select public.weekvraag_kiezen('aaaa0000-0000-0000-0000-0000000000d1', 9102, null)$q$,
    'gesloten', 'en dan ook niet meer weghalen');
  perform pg_temp.fout_bij($q$select public.weekvraag_kiezen('aaaa0000-0000-0000-0000-0000000000d1', 9103, '1')$q$,
    'gesloten', 'niet voor een weekend zonder rooster');
  perform pg_temp.fout_bij($q$select public.weekvraag_kiezen('aaaa0000-0000-0000-0000-0000000000d1', 9104, '1')$q$,
    'gesloten', 'niet bij een rooster met een start die geen tijd is');
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '', true);
  perform pg_temp.fout_bij($q$select public.weekvraag_kiezen('aaaa0000-0000-0000-0000-0000000000d1', 9101, '11')$q$,
    'alleen voor jezelf', 'niet zonder account');
  reset role;
  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000d2');

  -- ---- 3. overschrijven en weghalen ------------------------------------------------
  perform public.weekvraag_kiezen('aaaa0000-0000-0000-0000-0000000000d1', 9101, '11');
  reset role;
  if (select count(*) from weekvraag_antwoorden where race_id = 9101) <> 1
     or (select keuze from weekvraag_antwoorden where race_id = 9101) <> '11' then
    raise exception 'gezakt: nog een keer kiezen overschrijft niet';
  end if;
  set local role authenticated;
  perform public.weekvraag_kiezen('aaaa0000-0000-0000-0000-0000000000d1', 9101, '');
  reset role;
  if exists (select 1 from weekvraag_antwoorden where race_id = 9101) then
    raise exception 'gezakt: leeg haalt de keuze niet weg';
  end if;
  raise notice 'ok: nog een keer kiezen overschrijft, leeg haalt je keuze weg';
  set local role authenticated;
  perform public.weekvraag_kiezen('aaaa0000-0000-0000-0000-0000000000d1', 9101, '1');

  -- ---- 4. geheim tot de start ---------------------------------------------------------
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000d3');
  perform public.weekvraag_kiezen('bbbb0000-0000-0000-0000-0000000000d2', 9101, '11');
  uit := public.poule_ophalen('WEEKV1') -> 'weekvraag';
  if exists (select 1 from jsonb_array_elements(uit) x
              where (x ->> 'race_id')::int = 9101 and x ->> 'member_id' = 'aaaa0000-0000-0000-0000-0000000000d1') then
    raise exception 'gezakt: Bram ziet wat Anna koos terwijl de vraag nog open is';
  end if;
  if not exists (select 1 from jsonb_array_elements(uit) x
              where (x ->> 'race_id')::int = 9101 and x ->> 'member_id' = 'bbbb0000-0000-0000-0000-0000000000d2' and x ->> 'keuze' = '11') then
    raise exception 'gezakt: Bram ziet zijn eigen keuze niet';
  end if;
  if (select count(*) from jsonb_array_elements(uit) x where (x ->> 'race_id')::int = 9102) <> 2 then
    raise exception 'gezakt: na de start zie je niet wat iedereen koos: %', uit;
  end if;
  raise notice 'ok: je eigen keuze altijd, die van een ander pas als de training begonnen is';
  perform pg_temp.als('cccccccc-0000-0000-0000-0000000000d4');
  if jsonb_array_length(public.poule_ophalen('WEEKV2') -> 'weekvraag') <> 0 then
    raise exception 'gezakt: een andere poule krijgt de keuzes mee';
  end if;
  raise notice 'ok: een andere poule krijgt er niets van mee';

  -- ---- 5. de tabel is dicht ----------------------------------------------------------
  perform pg_temp.fout_bij('select * from public.weekvraag_antwoorden', 'permission denied', 'met een account lees je de tabel niet');
  perform pg_temp.fout_bij($q$insert into public.weekvraag_antwoorden (race_id, member_id, keuze)
    values (9103, 'cccc0000-0000-0000-0000-0000000000d3', '1')$q$, 'permission denied', 'en schrijf je er niet rechtstreeks in');
  perform pg_temp.fout_bij($q$update public.weekvraag_antwoorden set keuze = '1'$q$, 'permission denied', 'ook niet om te veranderen');
  reset role;
  set local role anon;
  perform pg_temp.fout_bij('select * from public.weekvraag_antwoorden', 'permission denied', 'anoniem leest de tabel ook niet');
  reset role;

  -- ---- 6. de speler weg, de keuze weg ---------------------------------------------------
  delete from pool_members where member_id = 'bbbb0000-0000-0000-0000-0000000000d2';
  if exists (select 1 from weekvraag_antwoorden where member_id = 'bbbb0000-0000-0000-0000-0000000000d2') then
    raise exception 'gezakt: de keuze van een verwijderde speler blijft staan';
  end if;
  if (select count(*) from weekvraag_antwoorden) <> 2 then
    raise exception 'gezakt: er is te veel weg';
  end if;
  raise notice 'ok: gaat de speler weg, dan gaat zijn keuze mee, en alleen de zijne';

  -- ---- 8. de controleregels ----------------------------------------------------------------
  if (select uitkomst from public.poule_controle where controle = 'functies en tabellen: alleen die uit schema.sql') <> 'ok' then
    raise exception 'gezakt: de controleregels kennen de vraag van de week niet: %',
      (select uitkomst from public.poule_controle where controle = 'functies en tabellen: alleen die uit schema.sql');
  end if;
  raise notice 'ok: de controleregels kennen de tabel en de functies';
end $$;

do $$ begin raise notice 'ok: weekvraag.test.sql helemaal geslaagd'; end $$;
