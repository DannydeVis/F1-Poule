-- Het einde van een seizoen, en het doorschuiven naar het volgende.
--
--   1. Het seizoen is pas voorbij als elke race een race-uitslag heeft of
--      afgelast is. Tot 21 oktober telde één sessie al: na de kwalificatie
--      (of de sprint) van de laatste race was het seizoen "voorbij", en lag de
--      seizoensvraag vast voor wie nog wilde invullen. seizoen_klaar() en
--      poule_seizoen_voorbij() zeggen het nu allebei goed.
--   2. De trigger op pools.season: alleen precies één seizoen omhoog, en
--      alleen als het seizoen klaar is. Voor iedereen, ook de sync.
--   3. seizoenen_doorschuiven(): een openbare poule meteen, de rest 7 dagen
--      na de laatste race, alleen als er races van volgend jaar zijn, en
--      niet twee keer. Alleen voor service_role.
--
-- Draai dit op een verse database na schema.sql.

\set ON_ERROR_STOP on

do $$
declare
  poule uuid := '77777777-7777-7777-7777-777777777777';
  lid   uuid := '88888888-8888-8888-8888-888888888888';
begin
  insert into pools (id, name, season, join_code) values (poule, 'Doorschuiftest', 2026, 'DSC001');
  insert into pool_members (member_id, pool_id, display_name) values (lid, poule, 'Danny');

  -- Ronde 1 en 2 gereden; van de finale is alleen de kwalificatie er.
  insert into races (id, season, round, name, deadline_quali, deadline_race, quali_result, race_result)
  values (9001, 2026, 1, 'Melbourne', now() - interval '60 days', now() - interval '59 days', '{1}', '{1}'),
         (9002, 2026, 2, 'Shanghai',  now() - interval '30 days', now() - interval '29 days', '{1}', '{1}'),
         (9003, 2026, 3, 'Abu Dhabi', now() - interval '2 hours', now() + interval '1 day',  '{1}', null);

  -- ---- 1. na de kwalificatie van de finale is het seizoen niet voorbij -----
  if public.poule_seizoen_voorbij(9001) then
    raise exception 'gezakt: na alleen de kwalificatie van de finale is het seizoen al voorbij';
  end if;
  raise notice 'ok: na de kwalificatie van de finale is het seizoen niet voorbij';
  -- Wie halverwege instapt kan zijn seizoensvraag dus nog invullen.
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 9001, lid, 'kampioen', '"1"'::jsonb);
  raise notice 'ok: en de seizoensvraag is nog in te vullen';

  -- Hetzelfde met alleen een sprint.
  update races set quali_result = null, sprint_result = '{1}',
                   deadline_sprint = now() - interval '2 hours', deadline_quali = now() + interval '4 hours'
   where id = 9003;
  if public.poule_seizoen_voorbij(9001) then
    raise exception 'gezakt: na alleen de sprint van de finale is het seizoen al voorbij';
  end if;
  raise notice 'ok: na de sprint van de finale ook niet';

  -- Met de race-uitslag wel.
  update races set race_result = '{1}', deadline_race = now() - interval '1 hour' where id = 9003;
  if not public.poule_seizoen_voorbij(9001) then
    raise exception 'gezakt: met de race-uitslag van de finale is het seizoen nog niet voorbij';
  end if;
  raise notice 'ok: met de race-uitslag van de finale is het voorbij';
end $$;

-- ---- 2. de trigger op pools.season ---------------------------------------
do $$
declare
  poule uuid := '77777777-7777-7777-7777-777777777777';
  fout text;
begin
  -- De finale weer zonder race-uitslag: dan mag doorschuiven niet.
  update races set race_result = null, deadline_race = now() + interval '1 day' where id = 9003;
  begin
    update pools set season = 2027 where id = poule;
    raise exception 'gezakt: doorschuiven terwijl de finale nog gereden moet worden';
  exception when others then
    get stacked diagnostics fout = pg_exception_hint;
    if fout <> 'seizoen_niet_klaar' then raise; end if;
  end;
  raise notice 'ok: doorschuiven kan niet zolang de finale geen race-uitslag heeft';

  update races set race_result = '{1}', deadline_race = now() - interval '2 days' where id = 9003;
  foreach fout in array array['2028', '2025', '2024'] loop
    begin
      update pools set season = fout::int where id = poule;
      raise exception 'gezakt: van 2026 naar % mocht', fout;
    exception when others then
      if sqlerrm like 'gezakt%' then raise; end if;
      if sqlerrm not like '%één seizoen tegelijk%' then raise; end if;
    end;
  end loop;
  raise notice 'ok: twee seizoenen vooruit of een seizoen terug kan niet';

  update pools set season = 2027 where id = poule;
  if (select season from pools where id = poule) <> 2027 then
    raise exception 'gezakt: doorschuiven met het seizoen klaar lukte niet';
  end if;
  raise notice 'ok: met het seizoen klaar gaat de poule één seizoen vooruit';
  begin
    update pools set season = 2026 where id = poule;
    raise exception 'gezakt: terug naar 2026 mocht';
  exception when others then
    if sqlerrm like 'gezakt%' then raise; end if;
  end;
  raise notice 'ok: en niet meer terug';
  -- Een wijziging die het seizoen niet raakt gaat gewoon.
  update pools set name = 'Doorschuiftest 2' where id = poule;
  raise notice 'ok: een andere wijziging aan de poule raakt de trigger niet';
end $$;

-- ---- 3. automatisch doorschuiven -------------------------------------------
do $$
declare
  open_p  uuid := 'a1000000-0000-0000-0000-000000000001';
  vriend  uuid := 'a1000000-0000-0000-0000-000000000002';
  al      uuid := '77777777-7777-7777-7777-777777777777';   -- staat al op 2027
  mijn    uuid[];
  uit     jsonb;
begin
  mijn := array[open_p, vriend, al];
  insert into pools (id, name, season, join_code, is_public) values
    (open_p, 'Open', 2026, 'DSC002', true),
    (vriend, 'Vrienden', 2026, 'DSC003', false);

  -- Seizoen 2026 klaar (finale twee dagen geleden), maar nog geen races van
  -- 2027 in de tabel: niemand gaat. De poule die al op 2027 staat (met de
  -- knop, hierboven) gaat niet naar 2028.
  uit := public.seizoenen_doorschuiven();
  if exists (select 1 from jsonb_array_elements(uit) e where (e ->> 'id')::uuid = any (mijn)) then
    raise exception 'gezakt: zonder races van 2027 schoof er een poule door: %', uit;
  end if;
  raise notice 'ok: zonder races van volgend jaar schuift niemand door';

  insert into races (id, season, round, name, deadline_quali, deadline_race)
  values (9101, 2027, 1, 'Melbourne', now() + interval '120 days', now() + interval '121 days');

  uit := public.seizoenen_doorschuiven();
  if (select season from pools where id = open_p) <> 2027 then
    raise exception 'gezakt: de openbare poule schoof niet meteen door';
  end if;
  if (select season from pools where id = vriend) <> 2026 then
    raise exception 'gezakt: de vriendenpoule schoof al door, twee dagen na de finale';
  end if;
  if (select season from pools where id = al) <> 2027 then
    raise exception 'gezakt: de poule die al op 2027 stond is verschoven';
  end if;
  if not exists (select 1 from jsonb_array_elements(uit) e
                  where (e ->> 'id')::uuid = open_p and (e ->> 'van')::int = 2026
                    and (e ->> 'naar')::int = 2027 and (e ->> 'openbaar')::boolean) then
    raise exception 'gezakt: de openbare poule staat niet in wat terugkomt: %', uit;
  end if;
  raise notice 'ok: een openbare poule meteen, een vriendenpoule nog niet, en de poule die al doorschoof blijft';

  -- Acht dagen na de finale.
  update races set deadline_race = now() - interval '8 days' where id = 9003;
  uit := public.seizoenen_doorschuiven();
  if (select season from pools where id = vriend) <> 2027 then
    raise exception 'gezakt: de vriendenpoule schoof niet door, acht dagen na de finale';
  end if;
  if (select count(*) from jsonb_array_elements(uit) e where (e ->> 'id')::uuid = any (mijn)) <> 1 then
    raise exception 'gezakt: niet precies de vriendenpoule doorgeschoven: %', uit;
  end if;
  raise notice 'ok: 7 dagen na de finale gaat de rest ook';

  uit := public.seizoenen_doorschuiven();
  if exists (select 1 from jsonb_array_elements(uit) e where (e ->> 'id')::uuid = any (mijn)) then
    raise exception 'gezakt: een tweede keer schoof er weer iets door: %', uit;
  end if;
  raise notice 'ok: een tweede keer doet niets';

  if has_function_privilege('anon', 'public.seizoenen_doorschuiven()', 'execute')
     or has_function_privilege('authenticated', 'public.seizoenen_doorschuiven()', 'execute') then
    raise exception 'gezakt: anon of authenticated mag seizoenen_doorschuiven() aanroepen';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role')
     and not has_function_privilege('service_role', 'public.seizoenen_doorschuiven()', 'execute') then
    raise exception 'gezakt: service_role mag seizoenen_doorschuiven() niet aanroepen';
  end if;
  raise notice 'ok: alleen service_role mag doorschuiven aanroepen';
end $$;
