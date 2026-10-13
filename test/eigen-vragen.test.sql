-- Premium: eigen vragen van de poulebaas.
--
-- Wat hier vastligt (de app rekent de punten; wie wat mag staat hier):
--
--   1. Een vraag zetten kan alleen de poulebaas, alleen met premium, alleen
--      voor de start van de race. Niet een speler, niet de poulebaas van een
--      andere poule.
--   2. De vraag 3 tot 120 tekens; 2 tot 6 antwoorden van hoogstens 40 tekens,
--      allemaal anders (lege weg, spaties eraf); hoogstens 3 per weekend.
--      Antwoorden aanpassen laat gegeven antwoorden vervallen die er niet meer
--      bij staan.
--   3. Antwoorden: voor je eigen speler, een van de antwoorden, voor de start.
--      Niet voor een medespeler, niet iets anders, niet na de start.
--   4. Geheim tot de start: poule_ophalen geeft van medespelers pas een
--      antwoord als de race begonnen is; je eigen altijd.
--   5. De uitkomst: alleen de poulebaas, pas na de start, en een van de
--      antwoorden. Weghalen kan alleen de poulebaas.
--   6. De tabellen zijn niet rechtstreeks te lezen of te schrijven.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('aaaaaaaa-0000-0000-0000-0000000000c2', null, null, true),  -- Anna, poulebaas van A
  ('bbbbbbbb-0000-0000-0000-0000000000c3', null, null, true),  -- Bram, speelt mee in A
  ('cccccccc-0000-0000-0000-0000000000c4', null, null, true);  -- Chris, poulebaas van B (geen premium)

insert into pools (id, name, join_code, premium_tot) values
  ('11111111-0000-0000-0000-0000000000c1', 'Bedrijfspoule', 'EIGEN1', now() + interval '1 year'),
  ('22222222-0000-0000-0000-0000000000c2', 'Vriendenpoule', 'EIGEN2', null);
insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa0000-0000-0000-0000-0000000000c1', '11111111-0000-0000-0000-0000000000c1', 'Anna', 'aaaaaaaa-0000-0000-0000-0000000000c2'),
  ('bbbb0000-0000-0000-0000-0000000000c2', '11111111-0000-0000-0000-0000000000c1', 'Bram', 'bbbbbbbb-0000-0000-0000-0000000000c3'),
  ('cccc0000-0000-0000-0000-0000000000c3', '22222222-0000-0000-0000-0000000000c2', 'Chris', 'cccccccc-0000-0000-0000-0000000000c4');
update pools set owner_member_id = 'aaaa0000-0000-0000-0000-0000000000c1' where id = '11111111-0000-0000-0000-0000000000c1';
update pools set owner_member_id = 'cccc0000-0000-0000-0000-0000000000c3' where id = '22222222-0000-0000-0000-0000000000c2';

-- Race 9001 begint morgen, race 9002 is gisteren begonnen.
insert into races (id, season, round, name, deadline_quali, deadline_race) values
  (9001, 2099, 1, 'Toekomst', now() + interval '20 hours', now() + interval '1 day'),
  (9002, 2099, 2, 'Verleden', now() - interval '2 days', now() - interval '1 day');

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
  v     uuid;
  w     uuid;
  oud   uuid;
  uit   jsonb;
  n     int;
begin
  -- Een vraag op de race die al begonnen is, rechtstreeks gezet: om straks de
  -- uitkomst en het geheim na de start te testen.
  insert into pool_eigen_vragen (id, pool_id, race_id, vraag, opties) values
    ('eeee0000-0000-0000-0000-0000000000c9', '11111111-0000-0000-0000-0000000000c1', 9002,
     'Wie crasht als eerste?', array['Stroll', 'Sargeant']);
  insert into pool_eigen_antwoorden (vraag_id, member_id, keuze) values
    ('eeee0000-0000-0000-0000-0000000000c9', 'aaaa0000-0000-0000-0000-0000000000c1', 'Stroll'),
    ('eeee0000-0000-0000-0000-0000000000c9', 'bbbb0000-0000-0000-0000-0000000000c2', 'Sargeant');
  oud := 'eeee0000-0000-0000-0000-0000000000c9';

  set local role authenticated;

  -- ============================================================
  --  1. wie mag een vraag zetten
  -- ============================================================
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000c3');
  perform pg_temp.fout_bij($q$select public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, 'Regent het?', array['Ja','Nee'])$q$,
    'alleen de poulebaas', 'een speler zet geen eigen vraag');
  perform pg_temp.als('cccccccc-0000-0000-0000-0000000000c4');
  perform pg_temp.fout_bij($q$select public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, 'Regent het?', array['Ja','Nee'])$q$,
    'alleen de poulebaas', 'de poulebaas van een andere poule ook niet');
  perform pg_temp.fout_bij($q$select public.eigen_vraag_opslaan('22222222-0000-0000-0000-0000000000c2', 9001, null, 'Regent het?', array['Ja','Nee'])$q$,
    'alleen met premium', 'en in zijn eigen poule niet zonder premium');
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000c2');
  perform pg_temp.fout_bij($q$select public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9002, null, 'Regent het?', array['Ja','Nee'])$q$,
    'al begonnen', 'na de start van de race geen nieuwe vraag');
  v := public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, '  Regent het in de race? ', array[' Ja ', 'Nee', '']);
  if v is null then raise exception 'gezakt: de poulebaas kon geen vraag zetten'; end if;
  uit := public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000c1');
  if not exists (select 1 from jsonb_array_elements(uit -> 'eigenvragen') q
                 where q ->> 'id' = v::text and q ->> 'vraag' = 'Regent het in de race?'
                   and q -> 'opties' = '["Ja","Nee"]'::jsonb) then
    raise exception 'gezakt: de vraag staat niet goed in poule_ophalen (%)', uit -> 'eigenvragen';
  end if;
  raise notice 'ok: de poulebaas zet een vraag, met de spaties eraf en zonder lege antwoorden';

  -- ============================================================
  --  2. de regels voor een vraag
  -- ============================================================
  perform pg_temp.fout_bij($q$select public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, 'Ja?', array['Ja'])$q$,
    '2 tot 6 antwoorden', 'een vraag met één antwoord kan niet');
  perform pg_temp.fout_bij($q$select public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, 'Wie?', array['a','b','c','d','e','f','g'])$q$,
    '2 tot 6 antwoorden', 'zeven antwoorden ook niet');
  perform pg_temp.fout_bij($q$select public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, 'Wie?', array['Ja','ja'])$q$,
    'hetzelfde', 'twee keer hetzelfde antwoord kan niet');
  perform pg_temp.fout_bij($q$select public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, 'Wie?', array['Ja', repeat('x', 41)])$q$,
    'hoogstens 40', 'een antwoord van 41 tekens kan niet');
  perform pg_temp.fout_bij($q$select public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, 'Wi', array['Ja','Nee'])$q$,
    '3 tot 120', 'een vraag van twee tekens kan niet');
  w := public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, 'Wie wint het duel?', array['Hamilton','Russell']);
  perform public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, 'Safety car?', array['Ja','Nee']);
  perform pg_temp.fout_bij($q$select public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, null, 'Nog een?', array['Ja','Nee'])$q$,
    'hoogstens 3', 'een vierde vraag op hetzelfde weekend kan niet');

  -- ============================================================
  --  3. antwoorden
  -- ============================================================
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000c3');
  perform public.eigen_antwoord_geven(v, 'bbbb0000-0000-0000-0000-0000000000c2', 'Ja');
  perform public.eigen_antwoord_geven(w, 'bbbb0000-0000-0000-0000-0000000000c2', 'Russell');
  perform public.eigen_antwoord_geven(v, 'bbbb0000-0000-0000-0000-0000000000c2', 'Nee');
  raise notice 'ok: een speler antwoordt, en mag zijn antwoord nog veranderen';
  perform pg_temp.fout_bij(format($q$select public.eigen_antwoord_geven(%L, 'aaaa0000-0000-0000-0000-0000000000c1', 'Ja')$q$, v),
    'alleen voor jezelf', 'niet voor een medespeler');
  perform pg_temp.fout_bij(format($q$select public.eigen_antwoord_geven(%L, 'bbbb0000-0000-0000-0000-0000000000c2', 'Misschien')$q$, v),
    'een van de antwoorden', 'niet iets wat er niet bij staat');
  perform pg_temp.fout_bij(format($q$select public.eigen_antwoord_geven(%L, 'bbbb0000-0000-0000-0000-0000000000c2', 'Sargeant')$q$, oud),
    'al begonnen', 'niet na de start van de race');
  perform pg_temp.fout_bij(format($q$select public.eigen_vraag_uitkomst(%L, 'Ja')$q$, v),
    'alleen de poulebaas', 'een speler vult geen uitkomst in');

  -- ============================================================
  --  4. geheim tot de start
  -- ============================================================
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000c2');
  perform public.eigen_antwoord_geven(v, 'aaaa0000-0000-0000-0000-0000000000c1', 'Ja');
  uit := public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000c1');
  select count(*) into n from jsonb_array_elements(uit -> 'eigenantwoorden') a
   where a ->> 'vraag_id' in (v::text, w::text) and a ->> 'member_id' = 'bbbb0000-0000-0000-0000-0000000000c2';
  if n <> 0 then raise exception 'gezakt: Anna ziet het antwoord van Bram voor de start'; end if;
  if not exists (select 1 from jsonb_array_elements(uit -> 'eigenantwoorden') a
                 where a ->> 'vraag_id' = v::text and a ->> 'member_id' = 'aaaa0000-0000-0000-0000-0000000000c1' and a ->> 'keuze' = 'Ja') then
    raise exception 'gezakt: Anna ziet haar eigen antwoord niet';
  end if;
  select count(*) into n from jsonb_array_elements(uit -> 'eigenantwoorden') a where a ->> 'vraag_id' = oud::text;
  if n <> 2 then raise exception 'gezakt: na de start zie je niet alle antwoorden (% van 2)', n; end if;
  raise notice 'ok: voor de start alleen je eigen antwoord, na de start die van iedereen';

  -- Antwoorden aanpassen: Bram koos Russell; dat antwoord valt weg.
  perform public.eigen_vraag_opslaan('11111111-0000-0000-0000-0000000000c1', 9001, w, 'Wie wint het duel?', array['Hamilton','Leclerc']);
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000c3');
  uit := public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000c1');
  if exists (select 1 from jsonb_array_elements(uit -> 'eigenantwoorden') a where a ->> 'vraag_id' = w::text) then
    raise exception 'gezakt: een antwoord dat er niet meer bij staat bleef staan';
  end if;
  if not exists (select 1 from jsonb_array_elements(uit -> 'eigenantwoorden') a where a ->> 'vraag_id' = v::text and a ->> 'keuze' = 'Nee') then
    raise exception 'gezakt: het antwoord op de andere vraag ging ook weg';
  end if;
  raise notice 'ok: antwoorden aanpassen laat alleen de antwoorden vervallen die er niet meer bij staan';

  -- ============================================================
  --  5. de uitkomst, en weghalen
  -- ============================================================
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000c2');
  perform pg_temp.fout_bij(format($q$select public.eigen_vraag_uitkomst(%L, 'Ja')$q$, v),
    'pas als de race begonnen', 'de uitkomst kan niet voor de start');
  perform pg_temp.fout_bij(format($q$select public.eigen_vraag_uitkomst(%L, 'Verstappen')$q$, oud),
    'een van de antwoorden', 'de uitkomst is een van de antwoorden');
  perform public.eigen_vraag_uitkomst(oud, 'Stroll');
  uit := public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000c1');
  if not exists (select 1 from jsonb_array_elements(uit -> 'eigenvragen') q where q ->> 'id' = oud::text and q ->> 'uitkomst' = 'Stroll') then
    raise exception 'gezakt: de uitkomst staat niet in poule_ophalen';
  end if;
  raise notice 'ok: de poulebaas vult na de start de uitkomst in';
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000c3');
  perform pg_temp.fout_bij(format($q$select public.eigen_vraag_weghalen(%L)$q$, v),
    'alleen de poulebaas', 'een speler haalt geen vraag weg');
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000c2');
  perform public.eigen_vraag_weghalen(v);
  uit := public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000c1');
  if exists (select 1 from jsonb_array_elements(uit -> 'eigenvragen') q where q ->> 'id' = v::text)
     or exists (select 1 from jsonb_array_elements(uit -> 'eigenantwoorden') a where a ->> 'vraag_id' = v::text) then
    raise exception 'gezakt: de weggehaalde vraag of de antwoorden erop staan er nog';
  end if;
  raise notice 'ok: de poulebaas haalt een vraag weg, met de antwoorden erop';

  -- ============================================================
  --  6. niet rechtstreeks
  -- ============================================================
  perform pg_temp.fout_bij($q$select * from public.pool_eigen_vragen$q$, 'permission denied', 'pool_eigen_vragen is niet rechtstreeks te lezen');
  perform pg_temp.fout_bij($q$select * from public.pool_eigen_antwoorden$q$, 'permission denied', 'pool_eigen_antwoorden ook niet');
  perform pg_temp.fout_bij(format($q$insert into public.pool_eigen_antwoorden (vraag_id, member_id, keuze) values (%L, 'aaaa0000-0000-0000-0000-0000000000c1', 'Sargeant')$q$, oud),
    'permission denied', 'en niet rechtstreeks te schrijven');
  perform pg_temp.fout_bij(format($q$update public.pool_eigen_vragen set uitkomst = 'Sargeant' where id = %L$q$, oud),
    'permission denied', 'ook de uitkomst niet');
end $$;

do $$ begin raise notice 'ok: eigen-vragen.test.sql helemaal geslaagd'; end $$;
