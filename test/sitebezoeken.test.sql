-- De sitepagina's tellen, en wat de app en de sync er op 1 november bij kregen.
--
-- Danny, 1 november: "tel_bezoek telt nu alleen de app. Laat de sitepagina's
-- ook tellen, zonder cookie: alleen pad en aantal, met een vaste lijst paden
-- uit de sitemap, plus de ref uit de link. In het beheer per pagina en per
-- ref." Wat hier vastligt:
--
--   1. tel_pagina() mag iedereen aanroepen (ook zonder account). Hij telt
--      alleen een pad uit site_paden, en een ref uit de vaste lijst; een
--      onbekende ref telt als 'anders', zonder ref is ''. Hij schrijft geen
--      account en geen tijdstip, alleen dag, pad, ref en aantal.
--   2. site_paden en site_bezoeken zijn voor de app dicht: niet te lezen, niet
--      te schrijven. Alleen de server (de sync vult site_paden).
--   3. Het beheer ziet per pagina het totaal en per ref, en per ref het totaal.
--   4. push_abonnementen: de drie soorten meldingen staan standaard aan, ook
--      voor een abonnement van vóór vandaag, en een speler zet ze voor zijn
--      eigen toestel uit; een tijdzone moet er als een tijdzone uitzien.
--   5. races.pagina neemt alleen een stuk url, en de app schrijft hem niet.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous, raw_app_meta_data) values
  ('dddddddd-0000-0000-0000-0000000000c1', 'beheerder@voorbeeld.nl', now(), false,
   '{"provider":"google","providers":["google"]}'),
  ('aaaaaaaa-0000-0000-0000-0000000000c2', null, null, true, '{}');
insert into site_beheerders (user_id) values ('dddddddd-0000-0000-0000-0000000000c1');

insert into races (id, season, round, name, deadline_quali, deadline_race) values
  (971, 2026, 71, 'Interlagos', now() + interval '5 days', now() + interval '6 days');
insert into pools (id, name, join_code) values
  ('11111111-0000-0000-0000-0000000000c1', 'Sitepoule', 'SITE01');
insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa0000-0000-0000-0000-0000000000c2', '11111111-0000-0000-0000-0000000000c1', 'Anna',
   'aaaaaaaa-0000-0000-0000-0000000000c2');
-- Een abonnement zoals het er vóór vandaag stond: zonder de nieuwe kolommen
-- in te vullen.
insert into push_abonnementen (endpoint, member_id, pool_id, p256dh, auth, taal) values
  ('https://push.voorbeeld/anna', 'aaaa0000-0000-0000-0000-0000000000c2',
   '11111111-0000-0000-0000-0000000000c1', 'p', 'a', 'nl');

-- De sync zet de paden uit de sitemap.
insert into site_paden (pad) values ('/'), ('/en/'), ('/races/2026/sao-paulo/'), ('/en/races/2026/sao-paulo/');

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

-- ---- 1. tellen ----------------------------------------------------------------------
do $$
begin
  set local role anon;
  perform public.tel_pagina('/races/2026/sao-paulo/', 'groepsapp');
  perform public.tel_pagina('/races/2026/sao-paulo/', 'groepsapp');
  perform public.tel_pagina('/races/2026/sao-paulo/', null);
  perform public.tel_pagina('/en/', 'kalender');
  perform public.tel_pagina('/en/', 'iets-verzonnen');
  -- Niet uit de sitemap: stil genegeerd.
  perform public.tel_pagina('/verzonnen/pad/', 'groepsapp');
  perform public.tel_pagina('/races/2026/sao-paulo', 'groepsapp');
  perform public.tel_pagina(null, null);
  reset role;
  -- "is distinct from" en niet "<>": een rij die er niet is geeft null, en
  -- null <> 1 laat de controle stil slagen.
  if (select aantal from public.site_bezoeken where pad = '/races/2026/sao-paulo/' and ref = 'groepsapp') is distinct from 2
     or (select aantal from public.site_bezoeken where pad = '/races/2026/sao-paulo/' and ref = '') is distinct from 1
     or (select aantal from public.site_bezoeken where pad = '/en/' and ref = 'kalender') is distinct from 1
     or (select aantal from public.site_bezoeken where pad = '/en/' and ref = 'anders') is distinct from 1
     or exists (select 1 from public.site_bezoeken
                where ref not in ('', 'groepsapp', 'kalender', 'app', 'anders')) then
    raise exception 'gezakt: de telling klopt niet: %',
      (select jsonb_agg(to_jsonb(b)) from public.site_bezoeken b);
  end if;
  raise notice 'ok: anon telt een pagina uit de sitemap, per ref; een onbekende ref telt als anders';
  if exists (select 1 from public.site_bezoeken where pad not in (select pad from public.site_paden)) then
    raise exception 'gezakt: een pad dat niet in de sitemap staat is geteld';
  end if;
  raise notice 'ok: een pad dat niet in de sitemap staat (ook zonder slash aan het eind) telt niet';
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'site_bezoeken') <> 4 then
    raise exception 'gezakt: site_bezoeken heeft meer dan dag, pad, ref en aantal';
  end if;
  raise notice 'ok: er staat niets anders in dan dag, pad, ref en aantal';
end $$;

-- ---- 2. dicht voor de app ------------------------------------------------------------
do $$
begin
  set local role anon;
  perform pg_temp.fout_bij('select count(*) from public.site_bezoeken', 'permission denied',
    'anon leest site_bezoeken niet');
  perform pg_temp.fout_bij($q$insert into public.site_paden (pad) values ('/nep/')$q$, 'permission denied',
    'en zet geen pad in de lijst');
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c2"}', true);
  perform pg_temp.fout_bij('select count(*) from public.site_paden', 'permission denied',
    'een speler leest site_paden niet');
  perform pg_temp.fout_bij($q$update public.site_bezoeken set aantal = 999$q$, 'permission denied',
    'en schrijft niet in site_bezoeken');
  reset role;
end $$;

-- ---- 3. het beheer -------------------------------------------------------------------
do $$
declare uit jsonb; rij jsonb;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-0000000000c1"}', true);
  uit := public.beheer_statistieken();
  reset role;
  select r into rij from jsonb_array_elements(uit -> 'site_per_pagina') r where r ->> 'pad' = '/races/2026/sao-paulo/';
  if (rij ->> 'aantal')::int is distinct from 3 or (rij -> 'per_ref' ->> 'groepsapp')::int is distinct from 2
     or (rij -> 'per_ref' ->> '')::int is distinct from 1 then
    raise exception 'gezakt: per pagina klopt niet: %', uit -> 'site_per_pagina';
  end if;
  if (uit -> 'site_per_pagina' -> 0 ->> 'pad') is distinct from '/races/2026/sao-paulo/' then
    raise exception 'gezakt: de meest bezochte pagina staat niet bovenaan: %', uit -> 'site_per_pagina';
  end if;
  raise notice 'ok: het beheer ziet per pagina het totaal en per ref, de drukste bovenaan';
  if (select (r ->> 'aantal')::int from jsonb_array_elements(uit -> 'site_per_ref') r where r ->> 'ref' = 'groepsapp') is distinct from 2
     or (select (r ->> 'aantal')::int from jsonb_array_elements(uit -> 'site_per_ref') r where r ->> 'ref' = 'kalender') is distinct from 1 then
    raise exception 'gezakt: per ref klopt niet: %', uit -> 'site_per_ref';
  end if;
  raise notice 'ok: en per ref het totaal';
end $$;

-- ---- 4. de meldingen per soort ---------------------------------------------------------
do $$
begin
  if (select meld_deadline and meld_uitslag and meld_training from public.push_abonnementen
      where endpoint = 'https://push.voorbeeld/anna') is not true then
    raise exception 'gezakt: een bestaand abonnement heeft niet alle soorten aan';
  end if;
  raise notice 'ok: wie meldingen al aan had, krijgt alle drie de soorten';
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c2"}', true);
  update public.push_abonnementen set meld_training = false, tijdzone = 'America/Sao_Paulo'
   where endpoint = 'https://push.voorbeeld/anna';
  reset role;
  if (select not meld_training and meld_deadline and tijdzone = 'America/Sao_Paulo' from public.push_abonnementen
      where endpoint = 'https://push.voorbeeld/anna') is not true then
    raise exception 'gezakt: Anna kon de trainingen niet uitzetten of haar tijdzone niet zetten';
  end if;
  raise notice 'ok: een speler zet een soort uit en zijn tijdzone, op zijn eigen toestel';
  perform pg_temp.fout_bij($q$update public.push_abonnementen set tijdzone = 'x; drop table races'
    where endpoint = 'https://push.voorbeeld/anna'$q$, 'push_tijdzone', 'een tijdzone die er geen is, gaat er niet in');
end $$;

-- ---- 5. de racepagina ----------------------------------------------------------------
do $$
begin
  update public.races set pagina = 'sao-paulo' where id = 971;
  perform pg_temp.fout_bij($q$update public.races set pagina = '../app' where id = 971$q$, 'races_pagina',
    'races.pagina neemt alleen een stuk url');
  set local role anon;
  perform pg_temp.fout_bij($q$update public.races set pagina = 'mexico-city' where id = 971$q$, 'permission denied',
    'en de app schrijft hem niet');
  reset role;
end $$;
