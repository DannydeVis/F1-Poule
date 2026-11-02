-- De openbare tabel met de cijfers over alle spelers samen (1 november).
--
-- Danny: "De sync rekent na elke sessie anonieme cijfers uit over alle
-- poules. Alleen na de deadline, en pas vanaf 50 spelers uit minstens 5
-- poules per sessie; daaronder niets tonen. Nooit per poule, nooit namen of
-- id's. In een tabel die iedereen mag lezen (grant en policy zoals bij de
-- andere openbare tabellen)." Wat hier vastligt, in de database zelf en dus
-- ook als de sync een fout heeft:
--
--   1. Iedereen mag lezen, ook zonder account; schrijven mag alleen de server.
--   2. 49 spelers weigert hij, 50 neemt hij; 50 spelers uit 4 poules weigert
--      hij, uit 5 neemt hij.
--   3. Een sessie die nog open is weigert hij, ook met een uitslag erin; na de
--      deadline mag het. De seizoensvragen (ronde 0) mogen wel vóór de eerste
--      race: daar gaat de pagina "wie wordt wereldkampioen" over.
--   4. Er is geen kolom voor een poule, een speler of een account, en een uuid
--      in de cijfers weigert hij.
--   5. De controleregels kennen de tabel, de policy en de functie.

\set ON_ERROR_STOP on

insert into races (id, season, round, name, deadline_quali, deadline_race, race_result) values
  (981, 2026, 81, 'Gereden',   now() - interval '2 days', now() - interval '1 day', '{4,1}'),
  (982, 2026, 82, 'Nog open',  now() - interval '1 hour', now() + interval '1 day', '{4,1}');

-- De fout én de hint: een check noemt zijn naam in de fout, de trigger in de
-- hint.
create function pg_temp.fout_bij(sql text, verwacht text, wat text) returns void language plpgsql as $$
declare fout text; hint text;
begin
  begin
    execute sql;
  exception when others then
    get stacked diagnostics fout = message_text, hint = pg_exception_hint;
    fout := fout || ' ' || coalesce(hint, '');
  end;
  if fout is null or position(verwacht in fout) = 0 then
    raise exception 'gezakt: % (fout: %)', wat, coalesce(fout, 'geen');
  end if;
  raise notice 'ok: %', wat;
end $$;

-- ---- 1 en 2: de drempel, en wie mag schrijven --------------------------------------
do $$
begin
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 81, 'race', 49, 5, '{}')$q$, 'spelerscijfers_drempel', '49 spelers: niets');
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 81, 'race', 50, 4, '{}')$q$, 'spelerscijfers_drempel', '50 spelers uit 4 poules: niets');
  insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 81, 'race', 50, 5, '{"verdeling": {"20": 50}}');
  raise notice 'ok: 50 spelers uit 5 poules: wel';

  set local role anon;
  if (select spelers from public.spelerscijfers where seizoen = 2026 and ronde = 81 and sessie = 'race') is distinct from 50 then
    raise exception 'gezakt: anon kan de cijfers niet lezen';
  end if;
  raise notice 'ok: iedereen mag lezen, ook zonder account';
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 81, 'quali', 80, 8, '{}')$q$, 'permission denied', 'anon schrijft niets');
  perform pg_temp.fout_bij($q$update public.spelerscijfers set spelers = 999$q$, 'permission denied',
    'en verandert niets');
  reset role;
  set local role authenticated;
  perform pg_temp.fout_bij($q$update public.spelerscijfers set spelers = 999$q$, 'permission denied',
    'ook niet met een account');
  perform pg_temp.fout_bij($q$delete from public.spelerscijfers$q$, 'permission denied',
    'en haalt niets weg');
  reset role;
end $$;

-- ---- 3: pas na de deadline, behalve het seizoen ---------------------------------------
do $$
begin
  -- De kwalificatie van ronde 82 is dicht, de race nog niet (al staat er
  -- een uitslag in: die kan met de hand ingevuld zijn).
  insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 82, 'quali', 60, 6, '{}');
  raise notice 'ok: een sessie na haar deadline: wel';
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 82, 'race', 60, 6, '{}')$q$, 'spelerscijfers_voor_deadline', 'een sessie voor haar deadline: niets');
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 82, 'sprint', 60, 6, '{}')$q$, 'spelerscijfers_voor_deadline', 'een sessie zonder deadline: niets');
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 99, 'race', 60, 6, '{}')$q$, 'spelerscijfers_voor_deadline', 'een ronde die niet bestaat: niets');
  -- En een rij die al stond, kan niet terug naar voor de deadline.
  perform pg_temp.fout_bij($q$update public.spelerscijfers set ronde = 82 where seizoen = 2026 and ronde = 81 and sessie = 'race'$q$,
    'spelerscijfers_voor_deadline', 'ook niet door een rij te verplaatsen');
  insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2027, 0, 'seizoen', 50, 5, '{"kampioen": {"1": 30, "4": 20}}');
  raise notice 'ok: de seizoensvragen van een seizoen dat nog moet beginnen: wel';
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2027, 0, 'seizoen', 49, 5, '{}') on conflict (seizoen, ronde, sessie) do update set spelers = excluded.spelers$q$,
    'spelerscijfers_drempel', 'maar ook daar niet onder de drempel');
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2027, 3, 'seizoen', 60, 6, '{}')$q$, 'spelerscijfers_sessie', 'het seizoen hangt aan ronde 0');
  -- De trigger gaat voor de check: dan weigert die hem al (ronde 0 heeft geen
  -- deadline). Allebei goed.
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 0, 'race', 60, 6, '{}')$q$, 'spelerscijfers_', 'en een sessie niet');
end $$;

-- ---- 4: geen poule, geen speler, geen account -----------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'spelerscijfers'
               and (column_name ~ 'pool|poule_id|member|speler_id|user|naam|name|code|email|id$')) then
    raise exception 'gezakt: spelerscijfers heeft een kolom die naar een poule, speler of account wijst: %',
      (select string_agg(column_name, ', ') from information_schema.columns
        where table_schema = 'public' and table_name = 'spelerscijfers');
  end if;
  raise notice 'ok: geen kolom voor een poule, een speler of een account';
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 81, 'quali', 60, 6, '{"wie": "11111111-0000-0000-0000-0000000000c1"}')$q$,
    'spelerscijfers_zonder_id', 'een uuid in de cijfers: niets');
  perform pg_temp.fout_bij($q$insert into public.spelerscijfers (seizoen, ronde, sessie, spelers, poules, cijfers)
    values (2026, 81, 'quali', 60, 6, '{"wie": "AAAAAAAA-0000-0000-0000-0000000000C1"}')$q$,
    'spelerscijfers_zonder_id', 'ook niet in hoofdletters');
end $$;

-- ---- 5: de controleregels --------------------------------------------------------------
do $$
begin
  if (select uitkomst from public.poule_controle where controle = 'functies en tabellen: alleen die uit schema.sql') <> 'ok'
     or (select uitkomst from public.poule_controle where controle = 'policies: alleen die uit schema.sql') <> 'ok' then
    raise exception 'gezakt: de controleregels kennen spelerscijfers niet: %',
      (select string_agg(controle || ' = ' || uitkomst, '; ') from public.poule_controle
        where controle like 'functies%' or controle like 'policies%');
  end if;
  raise notice 'ok: de controleregels kennen de tabel, de policy en de functie';
end $$;
