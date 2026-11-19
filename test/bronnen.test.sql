-- Waar nieuwe spelers vandaan komen, in de database (19 november).
--
-- Danny (TickTick, 1 november): "Elke link die je deelt krijgt een bron
-- (?ref=reddit, ?ref=producthunt, ?ref=tiktok, ?ref=linkedin). Laat de app die
-- bewaren bij een nieuwe poule of speler en in het beheer per bron tellen.
-- Anders weet je in maart niet wat werkte." Wat hier vastligt:
--
--   1. bron_zetten() bewaart de bron van je eigen nieuwe speler, uit de vaste
--      lijst; een onbekende naam wordt 'anders', zonder bron gebeurt er niets.
--   2. Maar één keer: een tweede aanroep verandert niets.
--   3. Niet voor een ander, niet zonder account, niet voor een speler die al
--      langer dan een uur meedoet.
--   4. De tabel is niet rechtstreeks te lezen of te schrijven, en de bron komt
--      niet mee in poule_ophalen.
--   5. Het beheer telt per bron de spelers en hoeveel er een poule begonnen,
--      met het totaal aantal nieuwe spelers ernaast.
--   6. tel_pagina() kent dezelfde lijst: een bezoek via ?ref=reddit telt als
--      reddit en niet meer als anders.
--   7. Gaat een speler weg, dan gaat zijn bron mee. De controleregels kennen de
--      tabel en de functies.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous, raw_app_meta_data) values
  ('dddddddd-0000-0000-0000-0000000000f1', 'beheerder@voorbeeld.nl', now(), false,
   '{"provider":"google","providers":["google"]}'),
  ('aaaaaaaa-0000-0000-0000-0000000000f2', null, null, true, '{}'),  -- Anna, begint een poule
  ('bbbbbbbb-0000-0000-0000-0000000000f3', null, null, true, '{}'),  -- Bram, doet mee
  ('cccccccc-0000-0000-0000-0000000000f4', null, null, true, '{}'),  -- Chris, al lang lid
  ('eeeeeeee-0000-0000-0000-0000000000f5', null, null, true, '{}');  -- Eva, verzonnen bron
insert into site_beheerders (user_id) values ('dddddddd-0000-0000-0000-0000000000f1');
insert into site_paden (pad) values ('/'), ('/en/');

insert into pools (id, name, join_code) values
  ('11111111-0000-0000-0000-0000000000f1', 'Redditpoule', 'BRON01');
insert into pool_members (member_id, pool_id, display_name, user_id, created_at) values
  ('aaaa0000-0000-0000-0000-0000000000f1', '11111111-0000-0000-0000-0000000000f1', 'Anna', 'aaaaaaaa-0000-0000-0000-0000000000f2', now()),
  ('bbbb0000-0000-0000-0000-0000000000f2', '11111111-0000-0000-0000-0000000000f1', 'Bram', 'bbbbbbbb-0000-0000-0000-0000000000f3', now()),
  ('cccc0000-0000-0000-0000-0000000000f3', '11111111-0000-0000-0000-0000000000f1', 'Chris', 'cccccccc-0000-0000-0000-0000000000f4', now() - interval '2 hours'),
  ('eeee0000-0000-0000-0000-0000000000f5', '11111111-0000-0000-0000-0000000000f1', 'Eva', 'eeeeeeee-0000-0000-0000-0000000000f5', now());
update pools set owner_member_id = 'aaaa0000-0000-0000-0000-0000000000f1' where id = '11111111-0000-0000-0000-0000000000f1';

create function pg_temp.fout_bij(sql text, verwacht text, wat text) returns void language plpgsql as $$
declare fout text;
begin
  begin
    execute sql;
  exception when others then fout := sqlerrm;
  end;
  if fout is null or position(verwacht in fout) = 0 then
    raise exception 'gezakt: % (fout: %)', wat, coalesce(fout, 'geen');
  end if;
  raise notice 'ok: %', wat;
end $$;

create function pg_temp.als(sub text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
end $$;

-- ---- 1 en 2. bewaren, en maar één keer ----------------------------------------------
do $$
begin
  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000f2');
  perform public.bron_zetten('aaaa0000-0000-0000-0000-0000000000f1', 'reddit');
  perform public.bron_zetten('aaaa0000-0000-0000-0000-0000000000f1', 'tiktok');
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000f3');
  perform public.bron_zetten('bbbb0000-0000-0000-0000-0000000000f2', 'reddit');
  perform pg_temp.als('eeeeeeee-0000-0000-0000-0000000000f5');
  perform public.bron_zetten('eeee0000-0000-0000-0000-0000000000f5', 'iets-verzonnen');
  perform public.bron_zetten('eeee0000-0000-0000-0000-0000000000f5', null);
  reset role;
  if (select bron from speler_bronnen where member_id = 'aaaa0000-0000-0000-0000-0000000000f1') is distinct from 'reddit' then
    raise exception 'gezakt: de eerste bron is niet bewaard, of een tweede heeft hem veranderd';
  end if;
  raise notice 'ok: de bron van je eigen nieuwe speler, en een tweede aanroep verandert niets';
  if (select bron from speler_bronnen where member_id = 'eeee0000-0000-0000-0000-0000000000f5') is distinct from 'anders' then
    raise exception 'gezakt: een onbekende bron is niet anders';
  end if;
  raise notice 'ok: een onbekende bron wordt anders';
end $$;

-- ---- 3. wat niet mag ----------------------------------------------------------------------
do $$
begin
  set local role authenticated;
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000f3');
  perform pg_temp.fout_bij($q$select public.bron_zetten('cccc0000-0000-0000-0000-0000000000f3', 'reddit')$q$,
    'eigen speler', 'niet voor een ander');
  perform pg_temp.als('cccccccc-0000-0000-0000-0000000000f4');
  perform public.bron_zetten('cccc0000-0000-0000-0000-0000000000f3', 'linkedin');
  reset role;
  if exists (select 1 from speler_bronnen where member_id = 'cccc0000-0000-0000-0000-0000000000f3') then
    raise exception 'gezakt: een speler die al twee uur meedoet kreeg alsnog een bron';
  end if;
  raise notice 'ok: niet voor een speler die al langer dan een uur meedoet';
  set local role anon;
  perform set_config('request.jwt.claims', '', true);
  perform pg_temp.fout_bij($q$select public.bron_zetten('cccc0000-0000-0000-0000-0000000000f3', 'reddit')$q$,
    'eigen speler', 'niet zonder account');
  reset role;
end $$;

-- ---- 4. de tabel is dicht, en de bron komt niet mee -----------------------------------
do $$
declare uit jsonb;
begin
  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000f2');
  perform pg_temp.fout_bij('select count(*) from public.speler_bronnen', 'permission denied',
    'een speler leest speler_bronnen niet');
  perform pg_temp.fout_bij($q$insert into public.speler_bronnen (member_id, bron) values ('cccc0000-0000-0000-0000-0000000000f3', 'reddit')$q$,
    'permission denied', 'en schrijft er niet rechtstreeks in');
  uit := public.poule_ophalen('BRON01');
  reset role;
  if uit::text like '%reddit%' then
    raise exception 'gezakt: de bron komt mee in poule_ophalen';
  end if;
  raise notice 'ok: de bron komt niet mee naar medespelers';
end $$;

-- ---- 5. het beheer ---------------------------------------------------------------------------
do $$
declare uit jsonb; rij jsonb;
begin
  set local role authenticated;
  perform pg_temp.als('dddddddd-0000-0000-0000-0000000000f1');
  uit := public.beheer_statistieken();
  reset role;
  select r into rij from jsonb_array_elements(uit -> 'bronnen') r where r ->> 'bron' = 'reddit';
  if (rij ->> 'spelers')::int is distinct from 2 or (rij ->> 'poules')::int is distinct from 1 then
    raise exception 'gezakt: per bron klopt niet: %', uit -> 'bronnen';
  end if;
  if (uit -> 'bronnen' -> 0 ->> 'bron') is distinct from 'reddit' or jsonb_array_length(uit -> 'bronnen') <> 2 then
    raise exception 'gezakt: de grootste bron staat niet bovenaan, of er staan er te veel: %', uit -> 'bronnen';
  end if;
  if (uit ->> 'spelers_90d')::int is distinct from 4 then
    raise exception 'gezakt: het totaal aantal nieuwe spelers klopt niet: %', uit ->> 'spelers_90d';
  end if;
  raise notice 'ok: het beheer telt per bron de spelers en de poules, met het totaal ernaast';
  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000f2');
  perform pg_temp.fout_bij('select public.beheer_statistieken()', 'beheer', 'een speler ziet de bronnen niet');
  reset role;
end $$;

-- ---- 6. de teller van de site kent dezelfde lijst ------------------------------------
do $$
begin
  set local role anon;
  perform public.tel_pagina('/', 'reddit');
  perform public.tel_pagina('/', 'producthunt');
  perform public.tel_pagina('/en/', 'iets-verzonnen');
  perform public.tel_pagina('/en/', null);
  reset role;
  if (select string_agg(pad || ':' || ref, ',' order by pad, ref) from site_bezoeken) is distinct from
     '/:producthunt,/:reddit,/en/:,/en/:anders' then
    raise exception 'gezakt: tel_pagina telt anders dan bron_naam: %',
      (select string_agg(pad || ':' || ref, ',' order by pad, ref) from site_bezoeken);
  end if;
  raise notice 'ok: een bezoek via ?ref=reddit telt als reddit';
end $$;

-- ---- 7. weg met de speler, en de controle -------------------------------------------
do $$
begin
  delete from pool_members where member_id = 'bbbb0000-0000-0000-0000-0000000000f2';
  if exists (select 1 from speler_bronnen where member_id = 'bbbb0000-0000-0000-0000-0000000000f2') then
    raise exception 'gezakt: de bron blijft staan als de speler weggaat';
  end if;
  raise notice 'ok: gaat een speler weg, dan gaat zijn bron mee';
  if (select uitkomst from poule_controle where controle = 'functies en tabellen: alleen die uit schema.sql') <> 'ok' then
    raise exception 'gezakt: de controle kent speler_bronnen of de functies niet';
  end if;
  raise notice 'ok: de controleregels kennen de tabel en de functies';
end $$;
