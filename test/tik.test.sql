-- De tik (premium, 26 oktober): een speler die zijn top 10 nog niet invulde
-- een melding sturen.
--
-- De melding verstuurt de functie `tik` (supabase/functions/tik), met de
-- sleutel van de server. Wat hier vastligt is de kant van de database:
--
--   1. tik_geven(), tik_ontvangers() en de sleutelfuncties zijn alleen voor
--      de server (service_role). De tabel tikken is voor anon en
--      authenticated dicht.
--   2. De regels van een tik: alleen met premium, alleen tussen spelers van
--      dezelfde poule, niet jezelf, alleen voor een sessie die open is en
--      binnen zeven dagen sluit, alleen als de poule die top 10 stelt en de
--      ontvanger hem nog niet inleverde, en één per ontvanger per race. Elke
--      fout heeft een vaste hint voor de vertaling in de app.
--   3. tik_ontvangers() vindt alle toestellen van de ontvanger, ook die hij in
--      een andere poule aanzette.
--   4. poule_ophalen() zegt wie er voor een open sessie al getikt is, niet wie
--      er tikte.
--   5. Een tik van meer dan zestig dagen oud verdwijnt.
--   6. De sleutel in de Vault: zetten, opnieuw zetten (geen tweede rij),
--      lezen en de vingerafdruk, alleen door de server.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('aaaaaaaa-0000-0000-0000-0000000000e1', null, null, true),  -- Anna
  ('bbbbbbbb-0000-0000-0000-0000000000e2', null, null, true),  -- Bram
  ('cccccccc-0000-0000-0000-0000000000e3', null, null, true);  -- Chris

insert into races (id, season, round, name, deadline_quali, deadline_race) values
  (961, 2026, 61, 'Open circuit',   now() + interval '1 day',  now() + interval '2 days'),
  (962, 2026, 62, 'Dicht circuit',  now() - interval '2 days', now() - interval '1 day'),
  (963, 2026, 63, 'Verre circuit',  now() + interval '10 days', now() + interval '11 days');

insert into pools (id, name, join_code, premium_tot) values
  ('11111111-0000-0000-0000-0000000000e1', 'Premiumpoule', 'TIKP01', now() + interval '1 year'),
  ('22222222-0000-0000-0000-0000000000e2', 'Gratis poule', 'TIKV01', null),
  ('33333333-0000-0000-0000-0000000000e3', 'Alleen de race', 'TIKQ01', now() + interval '1 year');
insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa0000-0000-0000-0000-0000000000e1', '11111111-0000-0000-0000-0000000000e1', 'Anna', 'aaaaaaaa-0000-0000-0000-0000000000e1'),
  ('bbbb0000-0000-0000-0000-0000000000e2', '11111111-0000-0000-0000-0000000000e1', 'Bram', 'bbbbbbbb-0000-0000-0000-0000000000e2'),
  ('dddd0000-0000-0000-0000-0000000000e4', '11111111-0000-0000-0000-0000000000e1', 'Dirk', null),
  ('bbbb0000-0000-0000-0000-0000000000f2', '22222222-0000-0000-0000-0000000000e2', 'Bram', 'bbbbbbbb-0000-0000-0000-0000000000e2'),
  ('cccc0000-0000-0000-0000-0000000000f3', '22222222-0000-0000-0000-0000000000e2', 'Chris', 'cccccccc-0000-0000-0000-0000000000e3'),
  ('aaaa0000-0000-0000-0000-0000000000a5', '33333333-0000-0000-0000-0000000000e3', 'Anna', 'aaaaaaaa-0000-0000-0000-0000000000e1'),
  ('bbbb0000-0000-0000-0000-0000000000a6', '33333333-0000-0000-0000-0000000000e3', 'Bram', 'bbbbbbbb-0000-0000-0000-0000000000e2');
insert into pool_questions (pool_id, question_id) values ('33333333-0000-0000-0000-0000000000e3', 'race_top10');

-- Anna leverde haar top 10 van de kwalificatie al in.
insert into answers (pool_id, race_id, member_id, question_id, waarde) values
  ('11111111-0000-0000-0000-0000000000e1', 961, 'aaaa0000-0000-0000-0000-0000000000e1', 'quali_top10',
   '["1","4","16","63","81","44","12","14","10","18"]');

-- Bram heeft meldingen aan op twee toestellen: een in de premiumpoule, een in
-- de gratis poule. Anna op één.
insert into push_abonnementen (endpoint, member_id, pool_id, p256dh, auth) values
  ('https://push.voorbeeld/bram-p', 'bbbb0000-0000-0000-0000-0000000000e2', '11111111-0000-0000-0000-0000000000e1', 'p', 'a'),
  ('https://push.voorbeeld/bram-v', 'bbbb0000-0000-0000-0000-0000000000f2', '22222222-0000-0000-0000-0000000000e2', 'p', 'a'),
  ('https://push.voorbeeld/anna',   'aaaa0000-0000-0000-0000-0000000000e1', '11111111-0000-0000-0000-0000000000e1', 'p', 'a');

-- Een fout verwachten, met de hint erbij die de app vertaalt.
create function pg_temp.hint_bij(sql text, verwacht text, wat text) returns void language plpgsql as $$
declare h text; fout text;
begin
  begin
    execute sql;
  exception when others then
    get stacked diagnostics h = pg_exception_hint, fout = message_text;
  end;
  if h is distinct from verwacht then
    raise exception 'gezakt: % (hint: %, fout: %)', wat, coalesce(h, 'geen'), coalesce(fout, 'geen');
  end if;
  raise notice 'ok: %', wat;
end $$;
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
grant execute on function pg_temp.hint_bij(text, text, text) to service_role, authenticated, anon;
grant execute on function pg_temp.fout_bij(text, text, text) to service_role, authenticated, anon;

-- De tik zoals de functie hem geeft: van wie (account), welke race en sessie, aan wie.
create function pg_temp.tik(van text, race int, sessie text, aan text) returns text language sql as $$
  select format('select public.tik_geven(%L::uuid, %s, %L, %L::uuid)', van, race, sessie, aan);
$$;
grant execute on function pg_temp.tik(text, int, text, text) to service_role, authenticated, anon;

-- ---- 1. alleen de server ---------------------------------------------------------
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e1"}', true);
  perform pg_temp.fout_bij(pg_temp.tik('aaaaaaaa-0000-0000-0000-0000000000e1', 961, 'quali',
    'bbbb0000-0000-0000-0000-0000000000e2'), 'permission denied', 'een speler kan tik_geven() niet zelf aanroepen');
  perform pg_temp.fout_bij('select * from public.tik_ontvangers(1)', 'permission denied',
    'en tik_ontvangers() ook niet');
  perform pg_temp.fout_bij('select public.push_sleutel()', 'permission denied', 'en de sleutel niet lezen');
  perform pg_temp.fout_bij($q$select public.push_sleutel_zetten('{}')$q$, 'permission denied',
    'en niet zetten');
  perform pg_temp.fout_bij('select count(*) from public.tikken', 'permission denied',
    'de tabel tikken is niet te lezen');
  perform pg_temp.fout_bij($q$insert into public.tikken (pool_id, race_id, sessie, aan_member)
    values ('11111111-0000-0000-0000-0000000000e1', 961, 'quali', 'bbbb0000-0000-0000-0000-0000000000e2')$q$,
    'permission denied', 'en niet te schrijven');
  reset role;
  set local role anon;
  perform pg_temp.fout_bij(pg_temp.tik('aaaaaaaa-0000-0000-0000-0000000000e1', 961, 'quali',
    'bbbb0000-0000-0000-0000-0000000000e2'), 'permission denied', 'anon ook niet');
  reset role;
end $$;

-- ---- 2. de regels -------------------------------------------------------------------
do $$
declare uit jsonb;
begin
  set local role service_role;
  uit := public.tik_geven('aaaaaaaa-0000-0000-0000-0000000000e1', 961, 'quali',
                          'bbbb0000-0000-0000-0000-0000000000e2');
  if uit ->> 'aan_naam' <> 'Bram' or uit ->> 'van_naam' <> 'Anna' or uit ->> 'race' <> 'Open circuit'
     or uit ->> 'sessie' <> 'quali' or (uit ->> 'id') is null then
    raise exception 'gezakt: de tik geeft niet terug wat de functie nodig heeft: %', uit;
  end if;
  raise notice 'ok: Anna tikt Bram aan voor de kwalificatie, met de namen en de race erbij';

  perform pg_temp.hint_bij(pg_temp.tik('aaaaaaaa-0000-0000-0000-0000000000e1', 961, 'race',
    'bbbb0000-0000-0000-0000-0000000000e2'), 'tik_al', 'één tik per ontvanger per race, ook voor een andere sessie');
  perform pg_temp.hint_bij(pg_temp.tik('bbbbbbbb-0000-0000-0000-0000000000e2', 961, 'quali',
    'aaaa0000-0000-0000-0000-0000000000e1'), 'tik_ingevuld', 'wie zijn top 10 al inleverde, tik je niet aan');
  uit := public.tik_geven('bbbbbbbb-0000-0000-0000-0000000000e2', 961, 'race',
                          'aaaa0000-0000-0000-0000-0000000000e1');
  raise notice 'ok: voor de race, waar ze nog niets inleverde, wel';
  perform pg_temp.hint_bij(pg_temp.tik('aaaaaaaa-0000-0000-0000-0000000000e1', 961, 'quali',
    'aaaa0000-0000-0000-0000-0000000000e1'), 'tik_zelf', 'jezelf aantikken kan niet');
  perform pg_temp.hint_bij(pg_temp.tik('cccccccc-0000-0000-0000-0000000000e3', 961, 'quali',
    'dddd0000-0000-0000-0000-0000000000e4'), 'tik_geen_lid', 'wie niet in de poule speelt, tikt niemand aan');
  perform pg_temp.hint_bij(pg_temp.tik('cccccccc-0000-0000-0000-0000000000e3', 961, 'quali',
    'bbbb0000-0000-0000-0000-0000000000f2'), 'tik_premium', 'zonder premium geen tik');
  perform pg_temp.hint_bij(pg_temp.tik('aaaaaaaa-0000-0000-0000-0000000000e1', 962, 'quali',
    'dddd0000-0000-0000-0000-0000000000e4'), 'tik_dicht', 'niet voor een sessie die al dicht is');
  perform pg_temp.hint_bij(pg_temp.tik('aaaaaaaa-0000-0000-0000-0000000000e1', 963, 'quali',
    'dddd0000-0000-0000-0000-0000000000e4'), 'tik_dicht', 'niet voor een sessie die pas over meer dan zeven dagen sluit');
  perform pg_temp.hint_bij(pg_temp.tik('aaaaaaaa-0000-0000-0000-0000000000e1', 961, 'seizoen',
    'dddd0000-0000-0000-0000-0000000000e4'), 'tik_dicht', 'alleen voor de sprint, de kwalificatie of de race');
  perform pg_temp.hint_bij(pg_temp.tik('aaaaaaaa-0000-0000-0000-0000000000e1', 961, 'quali',
    'bbbb0000-0000-0000-0000-0000000000a6'), 'tik_dicht', 'niet voor een top 10 die de poule niet stelt');
  perform public.tik_geven('aaaaaaaa-0000-0000-0000-0000000000e1', 961, 'race',
                           'bbbb0000-0000-0000-0000-0000000000a6');
  raise notice 'ok: in die poule wel voor de race';
  perform pg_temp.hint_bij(pg_temp.tik('aaaaaaaa-0000-0000-0000-0000000000e1', 961, 'quali',
    '99990000-0000-0000-0000-000000000999'), 'tik_weg', 'een speler die niet bestaat');
  perform public.tik_geven('aaaaaaaa-0000-0000-0000-0000000000e1', 961, 'quali',
                           'dddd0000-0000-0000-0000-0000000000e4');
  raise notice 'ok: een speler zonder account kun je ook aantikken';
  reset role;
end $$;

-- ---- 3. naar welke toestellen -----------------------------------------------------
do $$
declare n int; adressen text;
begin
  set local role service_role;
  select count(*), string_agg(endpoint, ' ' order by endpoint) into n, adressen
    from public.tik_ontvangers((select id from public.tikken
                                where aan_member = 'bbbb0000-0000-0000-0000-0000000000e2'));
  if n <> 2 or adressen <> 'https://push.voorbeeld/bram-p https://push.voorbeeld/bram-v' then
    raise exception 'gezakt: de toestellen van Bram: % (%)', n, adressen;
  end if;
  raise notice 'ok: de melding gaat naar alle toestellen van Bram, ook dat uit de andere poule';
  select count(*) into n from public.tik_ontvangers((select id from public.tikken
                                where aan_member = 'dddd0000-0000-0000-0000-0000000000e4'));
  if n <> 0 then raise exception 'gezakt: Dirk heeft geen toestel, maar kreeg er %', n; end if;
  raise notice 'ok: wie geen meldingen aan heeft, heeft geen toestellen';
  reset role;
end $$;

-- ---- 4. wie er al getikt is ---------------------------------------------------------
do $$
declare uit jsonb; aan text;
begin
  set local role anon;
  uit := public.poule_ophalen('TIKP01');
  reset role;
  select string_agg(t ->> 'aan', ' ' order by t ->> 'aan') into aan from jsonb_array_elements(uit -> 'tikken') t;
  if aan <> 'aaaa0000-0000-0000-0000-0000000000e1 bbbb0000-0000-0000-0000-0000000000e2 dddd0000-0000-0000-0000-0000000000e4' then
    raise exception 'gezakt: poule_ophalen noemt als getikt: %', uit -> 'tikken';
  end if;
  if exists (select 1 from jsonb_array_elements(uit -> 'tikken') t where t ? 'van' or t ? 'van_member') then
    raise exception 'gezakt: poule_ophalen zegt wie er tikte';
  end if;
  raise notice 'ok: poule_ophalen zegt wie er getikt is, niet door wie';

  update races set deadline_quali = now() - interval '1 hour' where id = 961;
  set local role anon;
  uit := public.poule_ophalen('TIKP01');
  reset role;
  if exists (select 1 from jsonb_array_elements(uit -> 'tikken') t where t ->> 'sessie' = 'quali') then
    raise exception 'gezakt: een tik voor een gesloten sessie staat er nog: %', uit -> 'tikken';
  end if;
  raise notice 'ok: is de sessie dicht, dan staat de tik er niet meer';
end $$;

-- ---- 5. opruimen ---------------------------------------------------------------------
do $$
begin
  insert into public.tikken (pool_id, race_id, sessie, aan_member, gemaakt)
  values ('11111111-0000-0000-0000-0000000000e1', 962, 'race', 'bbbb0000-0000-0000-0000-0000000000e2',
          now() - interval '61 days');
  set local role service_role;
  perform public.tik_geven('bbbbbbbb-0000-0000-0000-0000000000e2', 961, 'race',
                           'aaaa0000-0000-0000-0000-0000000000a5');
  reset role;
  if exists (select 1 from public.tikken where gemaakt < now() - interval '60 days') then
    raise exception 'gezakt: een tik van 61 dagen oud staat er nog';
  end if;
  raise notice 'ok: een tik van meer dan zestig dagen oud verdwijnt bij de volgende';
end $$;

-- ---- 6. de sleutel in de Vault --------------------------------------------------------
do $$
declare n int;
begin
  set local role service_role;
  if public.push_sleutel() is not null or public.push_sleutel_vingerafdruk() is not null then
    raise exception 'gezakt: er staat al een sleutel';
  end if;
  perform public.push_sleutel_zetten('{"prive":"p1","publiek":"q1","contact":"mailto:x@voorbeeld.nl","vingerafdruk":"v1"}');
  if public.push_sleutel() ->> 'prive' <> 'p1' or public.push_sleutel_vingerafdruk() <> 'v1' then
    raise exception 'gezakt: de sleutel komt niet terug: %', public.push_sleutel();
  end if;
  raise notice 'ok: de server zet de sleutel en leest hem terug, met de vingerafdruk';
  perform public.push_sleutel_zetten('{"prive":"p2","publiek":"q2","contact":"mailto:x@voorbeeld.nl","vingerafdruk":"v2"}');
  reset role;
  select count(*) into n from vault.secrets where name = 'push_sleutel';
  set local role service_role;
  if n <> 1 or public.push_sleutel() ->> 'prive' <> 'p2' or public.push_sleutel_vingerafdruk() <> 'v2' then
    raise exception 'gezakt: opnieuw zetten: % rij(en), %', n, public.push_sleutel();
  end if;
  raise notice 'ok: opnieuw zetten vervangt hem, zonder tweede rij';
  reset role;
end $$;

-- ---- 7. weg met de speler -----------------------------------------------------------------
do $$
begin
  delete from pool_members where member_id = 'dddd0000-0000-0000-0000-0000000000e4';
  if exists (select 1 from public.tikken where aan_member = 'dddd0000-0000-0000-0000-0000000000e4') then
    raise exception 'gezakt: de tik van een speler die weg is, staat er nog';
  end if;
  raise notice 'ok: gaat een speler weg, dan gaan zijn tikken mee';
end $$;
