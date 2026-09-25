-- Het beheer: alleen de beheerder komt erin, en de functies doen wat de
-- beheerpagina belooft.
--
-- De beheerpagina ziet alles: alle poules, alle spelers met hun mailadres,
-- en hij kan poules en spelers weggooien en een uitslag bijstellen. Dat mag
-- alleen via functies die eerst vragen of je beheerder bent, want de anon key
-- staat publiek in de app en iedereen kan die functies aanroepen.
--
-- Wat hier vastligt:
--
--   1. Beheerder word je alleen met het beheeradres, en alleen als dat
--      bevestigd is. Een onbevestigd adres (iemand die een inloglink aanvraagt
--      voor andermans adres) telt niet.
--   2. Iedereen anders krijgt een fout, ook een ingelogde speler en een
--      poulebaas. Niet een lege lijst: een fout.
--   3. De tabellen erachter (beheerders, sync-log, bezoeken) zijn voor anon en
--      authenticated dicht.
--   4. Wat de beheerder ziet klopt: tellingen, het soort account, de sync.
--   5. Wat de beheerder doet klopt: een poule of speler bijwerken, losmaken of
--      weggooien (ook met inzendingen voor een race die al dicht is), een
--      uitslag overnemen of leegmaken, een race afgelasten.
--   6. De bezoekersteller telt, ook zonder account, en schrijft verder niets.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous, raw_app_meta_data) values
  -- de beheerder, bevestigd via Google
  ('dddddddd-0000-0000-0000-000000000001', 'devisser.danny@gmail.com', now(), false,
   '{"provider":"google","providers":["google"]}'),
  -- iemand die een inloglink aanvroeg voor een adres dat niet van hem is: het
  -- adres staat erbij (in andere hoofdletters), maar is nooit bevestigd
  ('eeeeeeee-0000-0000-0000-000000000002', 'DeVisser.Danny@gmail.com', null, false,
   '{"provider":"email","providers":["email"]}'),
  -- een speler met een mailadres, een anonieme speler
  ('aaaaaaaa-0000-0000-0000-000000000003', 'anna@voorbeeld.nl', now(), false,
   '{"provider":"email","providers":["email"]}'),
  ('bbbbbbbb-0000-0000-0000-000000000004', null, null, true,
   '{"provider":"anonymous","providers":["anonymous"]}');

-- Het schema nog een keer, nu het beheeradres bestaat: zo gaat het in het
-- echt ook (eerst inloggen, dan schema.sql draaien).
\o /dev/null
set client_min_messages = warning;
\ir ../schema.sql
reset client_min_messages;
\o

insert into races (id, season, round, name, deadline_quali, deadline_race) values
  (951, 2026, 51, 'Dicht circuit', now() - interval '2 days', now() - interval '1 day'),
  (952, 2026, 52, 'Open circuit',  now() + interval '2 days', now() + interval '3 days');

insert into pools (id, name, join_code) values
  ('11111111-0000-0000-0000-000000000051', 'Poule A', 'BEHA01'),
  ('11111111-0000-0000-0000-000000000052', 'Poule B', 'BEHB01');

insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa1111-0000-0000-0000-000000000051', '11111111-0000-0000-0000-000000000051', 'Anna',
   'aaaaaaaa-0000-0000-0000-000000000003'),
  ('bbbb2222-0000-0000-0000-000000000052', '11111111-0000-0000-0000-000000000051', 'Bram',
   'bbbbbbbb-0000-0000-0000-000000000004'),
  ('cccc3333-0000-0000-0000-000000000053', '11111111-0000-0000-0000-000000000051', 'Cas', null),
  ('dddd4444-0000-0000-0000-000000000054', '11111111-0000-0000-0000-000000000052', 'Dirk', null);

update pools set owner_member_id = 'aaaa1111-0000-0000-0000-000000000051'
where id = '11111111-0000-0000-0000-000000000051';

-- Een inzending voor de race die al dicht is gaat er via de deadline-trigger
-- niet meer in, dus even buiten de trigger om, zoals hij er vóór de deadline
-- in gekomen zou zijn.
alter table answers disable trigger answers_deadline;
insert into answers (pool_id, race_id, member_id, question_id, waarde) values
  ('11111111-0000-0000-0000-000000000051', 951, 'bbbb2222-0000-0000-0000-000000000052', 'winnaar', '"1"'),
  ('11111111-0000-0000-0000-000000000051', 952, 'bbbb2222-0000-0000-0000-000000000052', 'winnaar', '"44"'),
  ('11111111-0000-0000-0000-000000000051', 952, 'aaaa1111-0000-0000-0000-000000000051', 'winnaar', '"16"');
alter table answers enable trigger answers_deadline;

insert into sync_runs (gestart, klaar, ok, bijgewerkt, samenvatting)
values (now() - interval '10 minutes', now() - interval '9 minutes', true, 2, 'Monza: race_result');

do $$
declare
  uit   jsonb;
  n     int;
  gelukt boolean;
begin
  -- ---- 1. wie is beheerder -------------------------------------------------
  select count(*) into n from site_beheerders;
  if n <> 1 then raise exception 'gezakt: % beheerders na het draaien van schema.sql, verwacht 1', n; end if;
  if not exists (select 1 from site_beheerders where user_id = 'dddddddd-0000-0000-0000-000000000001') then
    raise exception 'gezakt: het bevestigde beheeradres is geen beheerder';
  end if;
  raise notice 'ok: het bevestigde beheeradres is beheerder, en verder niemand';

  if exists (select 1 from site_beheerders where user_id = 'eeeeeeee-0000-0000-0000-000000000002') then
    raise exception 'gezakt: een onbevestigd adres werd beheerder';
  end if;
  raise notice 'ok: een onbevestigd adres wordt het niet, ook niet met hetzelfde adres';

  -- ---- 2. de rest komt er niet in -----------------------------------------
  -- zonder sessie
  perform set_config('request.jwt.claims', '', true);
  if public.ik_ben_beheerder() then raise exception 'gezakt: zonder sessie ben je beheerder'; end if;
  begin
    perform public.beheer_overzicht();
    raise exception 'gezakt: beheer_overzicht werkte zonder sessie';
  exception when insufficient_privilege then null;
  end;
  -- een gewone speler, die ook poulebaas is
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003"}', true);
  if public.ik_ben_beheerder() then raise exception 'gezakt: een poulebaas is beheerder'; end if;
  begin
    perform public.beheer_spelers(null);
    raise exception 'gezakt: een poulebaas kon alle spelers zien';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.beheer_poule_verwijderen('11111111-0000-0000-0000-000000000052');
    raise exception 'gezakt: een poulebaas kon een andere poule weggooien';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.beheer_race_bijwerken(952, '{"afgelast":true}');
    raise exception 'gezakt: een speler kon een race afgelasten';
  exception when insufficient_privilege then null;
  end;
  if (select afgelast from races where id = 952) then
    raise exception 'gezakt: de race is toch afgelast';
  end if;
  -- het onbevestigde adres
  perform set_config('request.jwt.claims', '{"sub":"eeeeeeee-0000-0000-0000-000000000002"}', true);
  begin
    perform public.beheer_poules();
    raise exception 'gezakt: het onbevestigde adres kon de poules zien';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: zonder sessie, als poulebaas en met een onbevestigd adres: een fout';

  -- ---- 4. wat de beheerder ziet -------------------------------------------
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000001"}', true);
  if not public.ik_ben_beheerder() then raise exception 'gezakt: de beheerder is geen beheerder'; end if;

  uit := public.beheer_overzicht();
  if (uit ->> 'poules')::int <> 2 or (uit ->> 'spelers')::int <> 4 or (uit ->> 'accounts')::int <> 2
     or (uit ->> 'gekoppeld')::int <> 1 or (uit ->> 'inzendingen')::int <> 3 then
    raise exception 'gezakt: het overzicht telt verkeerd: %', uit;
  end if;
  if uit -> 'laatste_sync' ->> 'samenvatting' <> 'Monza: race_result' then
    raise exception 'gezakt: het overzicht heeft de laatste sync niet: %', uit -> 'laatste_sync';
  end if;
  raise notice 'ok: het overzicht telt poules, spelers, accounts en inzendingen, en kent de laatste sync';

  uit := public.beheer_poules();
  select count(*) into n from jsonb_array_elements(uit) p
  where p ->> 'name' = 'Poule A' and (p ->> 'spelers')::int = 3 and p ->> 'eigenaar' = 'Anna'
    and p ->> 'join_code' = 'BEHA01' and (p ->> 'inzendingen')::int = 3;
  if n <> 1 then raise exception 'gezakt: Poule A staat er niet goed in: %', uit; end if;
  raise notice 'ok: de poules met code, aantal spelers, poulebaas en inzendingen';

  uit := public.beheer_spelers('11111111-0000-0000-0000-000000000051');
  if jsonb_array_length(uit) <> 3 then raise exception 'gezakt: niet alleen de spelers van Poule A: %', uit; end if;
  if (select x ->> 'account' from jsonb_array_elements(uit) x where x ->> 'naam' = 'Anna') <> 'mail'
     or (select x ->> 'account' from jsonb_array_elements(uit) x where x ->> 'naam' = 'Bram') <> 'anoniem'
     or (select x ->> 'account' from jsonb_array_elements(uit) x where x ->> 'naam' = 'Cas') <> 'geen' then
    raise exception 'gezakt: het soort account klopt niet: %', uit;
  end if;
  if (select x ->> 'email' from jsonb_array_elements(uit) x where x ->> 'naam' = 'Anna') <> 'anna@voorbeeld.nl'
     or not (select (x ->> 'poulebaas')::boolean from jsonb_array_elements(uit) x where x ->> 'naam' = 'Anna') then
    raise exception 'gezakt: mailadres of poulebaas ontbreekt: %', uit;
  end if;
  update auth.users set raw_app_meta_data = '{"provider":"google","providers":["email","google"]}'
  where id = 'aaaaaaaa-0000-0000-0000-000000000003';
  if public.beheer_accountsoort('aaaaaaaa-0000-0000-0000-000000000003') <> 'google' then
    raise exception 'gezakt: een account met Google heet geen google';
  end if;
  if jsonb_array_length(public.beheer_spelers(null)) <> 4 then
    raise exception 'gezakt: zonder poule niet alle spelers';
  end if;
  raise notice 'ok: de spelers, met het soort account, het mailadres en wie poulebaas is';

  uit := public.beheer_sync();
  if jsonb_array_length(uit) <> 1 or (uit -> 0 ->> 'bijgewerkt')::int <> 2 then
    raise exception 'gezakt: de sync-log klopt niet: %', uit;
  end if;
  uit := public.beheer_statistieken();
  if jsonb_array_length(uit -> 'bezoeken_per_dag') <> 30 then
    raise exception 'gezakt: niet elke dag van de afgelopen dertig: %', uit -> 'bezoeken_per_dag';
  end if;
  if (select (r ->> 'inzenders')::int from jsonb_array_elements(uit -> 'inzendingen_per_race') r
      where (r ->> 'race_id')::int = 952) <> 2 then
    raise exception 'gezakt: inzendingen per race klopt niet: %', uit -> 'inzendingen_per_race';
  end if;
  if (uit -> 'accounts' ->> 'geen')::int <> 2 then
    raise exception 'gezakt: accounts per soort klopt niet: %', uit -> 'accounts';
  end if;
  raise notice 'ok: de sync-log en de statistieken';

  -- ---- 5. wat de beheerder doet -------------------------------------------
  uit := public.beheer_poule_bijwerken('11111111-0000-0000-0000-000000000051',
           '{"name":"  Poule Anna  ","is_public":true,"owner_member_id":"cccc3333-0000-0000-0000-000000000053"}');
  if uit ->> 'name' <> 'Poule Anna' or not (uit ->> 'is_public')::boolean
     or uit ->> 'owner_member_id' <> 'cccc3333-0000-0000-0000-000000000053' then
    raise exception 'gezakt: de poule is niet bijgewerkt: %', uit;
  end if;
  gelukt := true;
  begin
    perform public.beheer_poule_bijwerken('11111111-0000-0000-0000-000000000051',
              '{"owner_member_id":"dddd4444-0000-0000-0000-000000000054"}');
  exception when others then gelukt := false;
  end;
  if gelukt then raise exception 'gezakt: iemand uit een andere poule werd poulebaas'; end if;
  gelukt := true;
  begin
    perform public.beheer_poule_bijwerken('11111111-0000-0000-0000-000000000051', '{"name":"   "}');
  exception when others then gelukt := false;
  end;
  if gelukt then raise exception 'gezakt: een poule kreeg een lege naam'; end if;
  raise notice 'ok: een poule bijwerken, en geen poulebaas van buiten of lege naam';

  perform public.beheer_speler_bijwerken('cccc3333-0000-0000-0000-000000000053', 'Casper');
  if (select display_name from pool_members where member_id = 'cccc3333-0000-0000-0000-000000000053') <> 'Casper' then
    raise exception 'gezakt: de speler heeft zijn nieuwe naam niet';
  end if;
  perform public.beheer_speler_losmaken('aaaa1111-0000-0000-0000-000000000051');
  if (select user_id from pool_members where member_id = 'aaaa1111-0000-0000-0000-000000000051') is not null then
    raise exception 'gezakt: Anna hangt nog aan haar account';
  end if;
  raise notice 'ok: een speler hernoemen en losmaken';

  -- Casper is nu poulebaas; weggooien laat de poule zonder baas, niet met een
  -- verwijzing naar niemand. Bram heeft een inzending voor een race die al
  -- dicht is: die gaat gewoon mee.
  perform public.beheer_speler_verwijderen('cccc3333-0000-0000-0000-000000000053');
  if (select owner_member_id from pools where id = '11111111-0000-0000-0000-000000000051') is not null then
    raise exception 'gezakt: de poule wijst nog naar een verwijderde poulebaas';
  end if;
  perform public.beheer_speler_verwijderen('bbbb2222-0000-0000-0000-000000000052');
  select count(*) into n from answers where member_id = 'bbbb2222-0000-0000-0000-000000000052';
  if n <> 0 then raise exception 'gezakt: Brams inzendingen staan er nog (%)', n; end if;
  select count(*) into n from answers where member_id = 'aaaa1111-0000-0000-0000-000000000051';
  if n <> 1 then raise exception 'gezakt: Anna is haar inzending kwijt'; end if;
  raise notice 'ok: een speler weggooien, ook met een inzending voor een gesloten race; de rest blijft';

  uit := public.beheer_race_bijwerken(951, '{"race_result":["1","4","16"]}');
  if uit -> 'race_result' <> '["1","4","16"]'::jsonb or (uit ->> 'race_handmatig')::boolean then
    raise exception 'gezakt: een uitslag van OpenF1 overnemen: %', uit;
  end if;
  uit := public.beheer_race_bijwerken(951, '{"quali_result":["4","1"],"handmatig":true}');
  if not (uit ->> 'quali_handmatig')::boolean then
    raise exception 'gezakt: een uitslag met de hand heeft de vlag niet';
  end if;
  uit := public.beheer_race_bijwerken(951, '{"quali_result":null,"handmatig":true}');
  if uit -> 'quali_result' <> 'null'::jsonb or (uit ->> 'quali_handmatig')::boolean then
    raise exception 'gezakt: leegmaken laat de uitslag of de vlag staan: %', uit;
  end if;
  uit := public.beheer_race_bijwerken(952, '{"afgelast":true}');
  if not (uit ->> 'afgelast')::boolean then raise exception 'gezakt: de race is niet afgelast'; end if;
  gelukt := true;
  begin
    perform public.beheer_race_bijwerken(951,
      jsonb_build_object('race_result', (select jsonb_agg(g::text) from generate_series(1, 31) g)));
  exception when others then gelukt := false;
  end;
  if gelukt then raise exception 'gezakt: een uitslag van 31 plekken ging erin'; end if;
  raise notice 'ok: een uitslag overnemen, met de hand zetten, leegmaken; een race afgelasten';

  perform public.beheer_poule_verwijderen('11111111-0000-0000-0000-000000000051');
  select count(*) into n from pool_members where pool_id = '11111111-0000-0000-0000-000000000051';
  if n <> 0 then raise exception 'gezakt: de spelers van de weggegooide poule staan er nog'; end if;
  select count(*) into n from answers where pool_id = '11111111-0000-0000-0000-000000000051';
  if n <> 0 then raise exception 'gezakt: de inzendingen van de weggegooide poule staan er nog'; end if;
  if not exists (select 1 from pools where id = '11111111-0000-0000-0000-000000000052') then
    raise exception 'gezakt: de andere poule is ook weg';
  end if;
  raise notice 'ok: een poule weggooien neemt alles mee, en laat de andere staan';

  -- ---- 6. de bezoekersteller ------------------------------------------------
  perform set_config('request.jwt.claims', '', true);
  perform public.tel_bezoek('app');
  perform public.tel_bezoek('app');
  perform public.tel_bezoek('ongeldig pad; drop table');
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000004"}', true);
  perform public.tel_bezoek('app');
  perform public.tel_bezoek('app');
  if (select aantal from bezoeken where dag = current_date and pad = 'app') <> 4 then
    raise exception 'gezakt: vier keer de app geteld als %', (select aantal from bezoeken where pad = 'app');
  end if;
  if (select count(*) from bezoeken) <> 1 then raise exception 'gezakt: een ongeldig pad is geteld'; end if;
  if (select count(*) from actief) <> 1 then
    raise exception 'gezakt: één account twee keer, en één keer zonder account, gaf % regels', (select count(*) from actief);
  end if;
  insert into actief (dag, user_id) values (current_date - 40, 'aaaaaaaa-0000-0000-0000-000000000003');
  perform public.tel_bezoek('app');
  if exists (select 1 from actief where dag < current_date - 35) then
    raise exception 'gezakt: wie actief was blijft langer dan vijf weken staan';
  end if;
  raise notice 'ok: de teller telt keren en mensen, ook zonder account, en vergeet na vijf weken';
end $$;

-- ---- 3. de tabellen zijn dicht ----------------------------------------------
do $$
begin
  if has_table_privilege('anon', 'public.site_beheerders', 'select')
     or has_table_privilege('authenticated', 'public.site_beheerders', 'select')
     or has_table_privilege('authenticated', 'public.site_beheerders', 'insert')
     or has_table_privilege('authenticated', 'public.sync_runs', 'select')
     or has_table_privilege('authenticated', 'public.bezoeken', 'select')
     or has_table_privilege('authenticated', 'public.actief', 'select')
     or has_table_privilege('anon', 'public.bezoeken', 'insert') then
    raise exception 'gezakt: anon of authenticated kan bij de beheertabellen';
  end if;
  raise notice 'ok: beheerders, sync-log en bezoeken zijn dicht voor anon en authenticated';
end $$;

begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000003"}';
do $$
begin
  begin
    perform count(*) from public.site_beheerders;
    raise exception 'gezakt: een speler kon de beheerders lezen';
  exception when insufficient_privilege then null;
  end;
  -- Jezelf toevoegen gaat ook niet.
  begin
    insert into public.site_beheerders (user_id) values ('aaaaaaaa-0000-0000-0000-000000000003');
    raise exception 'gezakt: een speler kon zichzelf beheerder maken';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: ook als echte rol authenticated: lezen noch jezelf toevoegen';
end $$;
rollback;
