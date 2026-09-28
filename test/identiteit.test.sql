-- Niemand kan andermans speler, account of naam gebruiken.
--
-- Danny vroeg op 28 september de hele weg na te lopen. Dit bestand is wat
-- daaruit kwam: elke aanval die toen lukte, en die nu niet meer lukt. Het
-- zwaarste gat was een inbraak zonder poulecode:
--
--   1. De policies op answers, jokers en push_abonnementen stonden op `for
--      all` met mag_voor_speler(), en die zei ja voor elke speler zonder
--      account. `for all` geldt ook voor lezen, dus iedereen zag de
--      antwoorden van zulke spelers in álle poules, met member_id en pool_id.
--   2. Met dat member_id claimde hij de speler (poule_claim_speler), en was hij
--      lid van een poule waarvan hij de code nooit had gezien.
--
-- En verder: antwoorden van spelers zonder account overschrijven of
-- weggooien; als lid een speler zonder account hernoemen of er een nep-pagina
-- op zetten; jezelf "Anna" noemen; je speler naar een andere poule verhuizen;
-- rechtstreeks een speler invoegen in een poule (zonder code, met elke naam);
-- een tweede "anna" aanmelden via poule_meedoen(); een lege naam; een antwoord
-- in poule A met je speler uit poule B; en als poulebaas een speler aan een
-- ander account geven of een pagina op andermans naam zetten.
--
-- Wat blijft, en bewust: wie de poulecode heeft, kan een speler die nog aan
-- niemand hangt claimen door op zijn naam te tikken. Zonder wachtwoord is een
-- oude speler niet van een ander te onderscheiden; de poulebaas kan hem
-- losmaken als het misging. Zie OVERDRACHT.md.
--
-- Elke controle meet `found` of vangt de fout: RLS geeft op een geblokkeerde
-- update geen fout, hij raakt nul rijen.

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'anna@voorbeeld.nl'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bram@voorbeeld.nl'),
  ('cccccccc-0000-0000-0000-000000000003', 'chris@voorbeeld.nl'),
  ('dddddddd-0000-0000-0000-000000000004', 'dirk@voorbeeld.nl');

insert into races (id, season, round, name, deadline_quali, deadline_race)
values (901, 2026, 91, 'Testcircuit', now() + interval '2 days', now() + interval '3 days');

-- De poule van Anna, met jokers aan, en de poule van Chris. Chris is voor de
-- poule van Anna een vreemde: hij kent de code niet.
insert into pools (id, name, join_code, jokers_vanaf) values
  ('11111111-0000-0000-0000-000000000001', 'Poule van Anna', 'ANNA01', now() - interval '1 day'),
  ('22222222-0000-0000-0000-000000000002', 'Poule van Chris', 'CHRS02', null);

insert into pool_members (member_id, pool_id, display_name, user_id, aangemaakt_door) values
  ('aaaa1111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Anna',
   'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbb2222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Bram',
   'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002'),
  -- Van vóór de accounts: van niemand, door niemand aangemaakt.
  ('cccc3333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Oude Speler',
   null, null),
  -- Op het toestel van Bram ingeschreven, terwijl Bram daar al speelde.
  ('eeee5555-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'Gedeeld',
   null, 'bbbbbbbb-0000-0000-0000-000000000002'),
  ('dddd4444-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000002', 'Chris',
   'cccccccc-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003');
update pools set owner_member_id = 'aaaa1111-0000-0000-0000-000000000001'
 where id = '11111111-0000-0000-0000-000000000001';
update pools set owner_member_id = 'dddd4444-0000-0000-0000-000000000004'
 where id = '22222222-0000-0000-0000-000000000002';

insert into answers (pool_id, race_id, member_id, question_id, waarde) values
  ('11111111-0000-0000-0000-000000000001', 901, 'aaaa1111-0000-0000-0000-000000000001', 'winnaar', '"1"'),
  ('11111111-0000-0000-0000-000000000001', 901, 'cccc3333-0000-0000-0000-000000000003', 'winnaar', '"4"'),
  ('11111111-0000-0000-0000-000000000001', 901, 'eeee5555-0000-0000-0000-000000000005', 'winnaar', '"16"'),
  ('22222222-0000-0000-0000-000000000002', 901, 'dddd4444-0000-0000-0000-000000000004', 'winnaar', '"81"');
insert into jokers (pool_id, race_id, member_id) values
  ('11111111-0000-0000-0000-000000000001', 901, 'cccc3333-0000-0000-0000-000000000003');
insert into push_abonnementen (endpoint, member_id, pool_id, p256dh, auth) values
  ('https://push.voorbeeld/oude-speler', 'cccc3333-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000001', 'sleutel', 'geheim');

-- Een aanval: true als hij iets deed (een rij raakte of er iets uitkwam).
create or replace function pg_temp.lukt(wie text, stmt text) returns boolean
language plpgsql as $$
declare n int;
begin
  begin
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', format('{"sub":"%s"}', wie), true);
    execute stmt;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'terugdraaien-ja'; end if;
    raise exception 'terugdraaien-nee';
  exception
    when raise_exception then
      if sqlerrm = 'terugdraaien-ja' then return true; end if;
      if sqlerrm = 'terugdraaien-nee' then return false; end if;
      return false;   -- een fout uit een trigger of functie: tegengehouden
    when insufficient_privilege or check_violation or unique_violation then
      return false;
  end;
end $$;

create or replace function pg_temp.moet_niet(wie text, wat text, stmt text) returns void
language plpgsql as $$
begin
  if pg_temp.lukt(wie, stmt) then raise exception 'gezakt: %', wat; end if;
  raise notice 'ok: %', wat;
end $$;

create or replace function pg_temp.moet_wel(wie text, wat text, stmt text) returns void
language plpgsql as $$
begin
  if not pg_temp.lukt(wie, stmt) then raise exception 'gezakt: % (lukte niet)', wat; end if;
  raise notice 'ok: %', wat;
end $$;

-- De foutmelding van een aanval, of '' als hij niet werd tegengehouden met een
-- fout. Voor de sloten die elkaar overlappen: daar wil je weten wélk slot het
-- tegenhield.
create or replace function pg_temp.fout(wie text, stmt text) returns text
language plpgsql as $$
begin
  begin
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', format('{"sub":"%s"}', wie), true);
    execute stmt;
    raise exception 'terugdraaien';
  exception when others then
    if sqlerrm = 'terugdraaien' then return ''; end if;
    return sqlerrm;
  end;
end $$;

\set anna 'aaaaaaaa-0000-0000-0000-000000000001'
\set bram 'bbbbbbbb-0000-0000-0000-000000000002'
\set chris 'cccccccc-0000-0000-0000-000000000003'
\set dirk 'dddddddd-0000-0000-0000-000000000004'

-- ============================================================
--  1. De inbraak: een vreemde vindt niets om mee binnen te komen
-- ============================================================
select pg_temp.moet_niet(:'chris', 'een vreemde ziet geen antwoorden uit een poule die niet de zijne is (ook niet van een speler zonder account)',
  $$select 1 from answers where pool_id = '11111111-0000-0000-0000-000000000001'$$);
select pg_temp.moet_niet(:'chris', 'een vreemde ziet geen jokers van een speler zonder account',
  $$select 1 from jokers where pool_id = '11111111-0000-0000-0000-000000000001'$$);
select pg_temp.moet_niet(:'chris', 'een vreemde ziet geen pushabonnement van een speler zonder account',
  $$select 1 from push_abonnementen where pool_id = '11111111-0000-0000-0000-000000000001'$$);
select pg_temp.moet_niet(:'chris', 'een vreemde ziet geen spelers uit een poule die niet de zijne is',
  $$select 1 from pool_members where pool_id = '11111111-0000-0000-0000-000000000001'$$);
select pg_temp.moet_wel(:'chris', 'maar zijn eigen poule ziet hij gewoon',
  $$select 1 from answers where pool_id = '22222222-0000-0000-0000-000000000002'$$);

-- ============================================================
--  2. Antwoorden van een speler zonder account zijn niet vrij wild
-- ============================================================
select pg_temp.moet_niet(:'chris', 'een vreemde overschrijft het antwoord van een oude speler niet',
  $$update answers set waarde = '"44"' where member_id = 'cccc3333-0000-0000-0000-000000000003'$$);
select pg_temp.moet_niet(:'chris', 'een vreemde gooit het antwoord van een oude speler niet weg',
  $$delete from answers where member_id = 'cccc3333-0000-0000-0000-000000000003'$$);
select pg_temp.moet_niet(:'chris', 'een vreemde vult niets in namens een oude speler',
  $$insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values ('11111111-0000-0000-0000-000000000001', 901, 'cccc3333-0000-0000-0000-000000000003', 'pole', '"44"')$$);
select pg_temp.moet_niet(:'anna', 'ook een medespeler vult niets in voor een oude speler',
  $$insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values ('11111111-0000-0000-0000-000000000001', 901, 'cccc3333-0000-0000-0000-000000000003', 'pole', '"44"')$$);
select pg_temp.moet_niet(:'anna', 'en niets voor de speler die op het toestel van Bram is ingeschreven',
  $$update answers set waarde = '"44"' where member_id = 'eeee5555-0000-0000-0000-000000000005'$$);
select pg_temp.moet_wel(:'bram', 'het toestel van Bram vult wel in voor de speler die het inschreef',
  $$update answers set waarde = '"44"' where member_id = 'eeee5555-0000-0000-0000-000000000005'$$);
select pg_temp.moet_niet(:'chris', 'een antwoord in poule A met je eigen speler uit poule B kan niet',
  $$insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values ('11111111-0000-0000-0000-000000000001', 901, 'dddd4444-0000-0000-0000-000000000004', 'pole', '"44"')$$);
select pg_temp.moet_niet(:'chris', 'en een joker net zo min',
  $$insert into jokers (pool_id, race_id, member_id)
    values ('11111111-0000-0000-0000-000000000001', 901, 'dddd4444-0000-0000-0000-000000000004')$$);
select pg_temp.moet_niet(:'chris', 'een pushabonnement op een speler zonder account kan niet',
  $$insert into push_abonnementen (endpoint, member_id, pool_id, p256dh, auth)
    values ('https://push.voorbeeld/chris', 'cccc3333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'x', 'y')$$);

-- ============================================================
--  3. Een speler aan een account hangen: alleen via de functie
-- ============================================================
select pg_temp.moet_niet(:'chris', 'een vreemde claimt een speler van een ander niet',
  $$select 1 from (select poule_claim_speler('aaaa1111-0000-0000-0000-000000000001') x) t where x is not null$$);
select pg_temp.moet_niet(:'chris', 'en hangt hem ook niet met een update aan zijn account',
  $$update pool_members set user_id = 'cccccccc-0000-0000-0000-000000000003' where member_id = 'aaaa1111-0000-0000-0000-000000000001'$$);
select pg_temp.moet_niet(:'bram', 'een lid raakt de rij van een speler zonder account niet eens aan',
  $$update pool_members set user_id = null where member_id = 'eeee5555-0000-0000-0000-000000000005'$$);
do $$ begin
  if pg_temp.fout('aaaaaaaa-0000-0000-0000-000000000001',
       $q$update pool_members set user_id = 'dddddddd-0000-0000-0000-000000000004' where member_id = 'aaaa1111-0000-0000-0000-000000000001'$q$)
     not like '%poule_claim_speler%' then
    raise exception 'gezakt: een speler aan een account hangen met een update wordt niet door de trigger tegengehouden'; end if;
  raise notice 'ok: een speler aan een account hangen met een update houdt de trigger tegen, met uitleg';
end $$;
select pg_temp.moet_niet(:'bram', 'een lid claimt een speler zonder account niet met een losse update',
  $$update pool_members set user_id = 'bbbbbbbb-0000-0000-0000-000000000002' where member_id = 'cccc3333-0000-0000-0000-000000000003'$$);
select pg_temp.moet_wel(:'dirk', 'wie de code heeft, kan een speler die aan niemand hangt wel claimen (bewust: zo kom je binnen)',
  $$select 1 from (select poule_claim_speler('cccc3333-0000-0000-0000-000000000003') x) t where x is not null$$);

-- ============================================================
--  4. Namen: niemand wordt "Anna", niemand hernoemt een ander
-- ============================================================
select pg_temp.moet_niet(:'bram', 'een lid hernoemt een medespeler niet',
  $$update pool_members set display_name = 'Sukkel' where member_id = 'aaaa1111-0000-0000-0000-000000000001'$$);
select pg_temp.moet_niet(:'bram', 'een lid hernoemt een speler zonder account niet',
  $$update pool_members set display_name = 'Sukkel' where member_id = 'cccc3333-0000-0000-0000-000000000003'$$);
select pg_temp.moet_niet(:'bram', 'een lid noemt zichzelf niet "Anna"',
  $$update pool_members set display_name = 'Anna' where member_id = 'bbbb2222-0000-0000-0000-000000000002'$$);
select pg_temp.moet_niet(:'chris', 'meedoen als "anna" terwijl Anna al meedoet, kan niet',
  $$select poule_meedoen('11111111-0000-0000-0000-000000000001', 'anna')$$);
select pg_temp.moet_niet(:'chris', 'ook niet met spaties en hoofdletters: "  ANNA "',
  $$select poule_meedoen('11111111-0000-0000-0000-000000000001', '  ANNA ')$$);
select pg_temp.moet_niet(:'chris', 'een lege naam kan niet',
  $$select poule_meedoen('11111111-0000-0000-0000-000000000001', '   ')$$);
select pg_temp.moet_niet(:'chris', 'een naam van 61 tekens kan niet',
  $$select poule_meedoen('11111111-0000-0000-0000-000000000001', repeat('x', 61))$$);
select pg_temp.moet_wel(:'chris', 'met een eigen naam doet hij gewoon mee',
  $$select poule_meedoen('11111111-0000-0000-0000-000000000001', 'Chris')$$);
select pg_temp.moet_niet(:'chris', 'een poule aanmaken met een lege spelersnaam kan niet',
  $$select poule_aanmaken('Nieuw', null, '  ', null)$$);
select pg_temp.moet_niet(:'chris', 'en met een spelersnaam van 61 tekens ook niet',
  $$select poule_aanmaken('Nieuw', null, repeat('x', 61), null)$$);

-- ============================================================
--  5. Je poule ligt vast, en binnenkomen gaat via de code
-- ============================================================
select pg_temp.moet_niet(:'bram', 'een lid verhuist zichzelf niet naar een andere poule',
  $$update pool_members set pool_id = '22222222-0000-0000-0000-000000000002' where member_id = 'bbbb2222-0000-0000-0000-000000000002'$$);
select pg_temp.moet_niet(:'bram', 'en een speler zonder account ook niet',
  $$update pool_members set pool_id = '22222222-0000-0000-0000-000000000002' where member_id = 'eeee5555-0000-0000-0000-000000000005'$$);
select pg_temp.moet_niet(:'chris', 'rechtstreeks een speler invoegen in een poule kan niet, ook niet op je eigen account',
  $$insert into pool_members (pool_id, display_name, user_id)
    values ('11111111-0000-0000-0000-000000000001', 'Anna', 'cccccccc-0000-0000-0000-000000000003')$$);

-- ============================================================
--  6. Je pagina is van jou
-- ============================================================
select pg_temp.moet_niet(:'bram', 'een lid zet geen nep-pagina op een speler zonder account',
  $$update pool_members set profiel_code = 'nepcode12', profiel = '{"naam":"x"}' where member_id = 'eeee5555-0000-0000-0000-000000000005'$$);
select pg_temp.moet_niet(:'anna', 'de poulebaas zet ook geen pagina op een speler zonder account',
  $$update pool_members set profiel_code = 'nepcode12', profiel = '{"naam":"x"}' where member_id = 'eeee5555-0000-0000-0000-000000000005'$$);
select pg_temp.moet_niet(:'anna', 'de poulebaas zet geen pagina op de naam van Bram',
  $$update pool_members set profiel_code = 'nepcode12', profiel = '{"naam":"x"}' where member_id = 'bbbb2222-0000-0000-0000-000000000002'$$);
select pg_temp.moet_wel(:'bram', 'Bram zet zijn eigen pagina aan',
  $$update pool_members set profiel_code = 'bramcode1', profiel = '{"naam":"Bram"}' where member_id = 'bbbb2222-0000-0000-0000-000000000002'$$);

-- ============================================================
--  7. De poulebaas maakt los, en meer niet
-- ============================================================
select pg_temp.moet_niet(:'anna', 'de poulebaas geeft de speler van Bram niet aan een ander account',
  $$update pool_members set user_id = 'dddddddd-0000-0000-0000-000000000004' where member_id = 'bbbb2222-0000-0000-0000-000000000002'$$);
select pg_temp.moet_niet(:'anna', 'de poulebaas hernoemt Bram niet',
  $$update pool_members set display_name = 'Sukkel' where member_id = 'bbbb2222-0000-0000-0000-000000000002'$$);
select pg_temp.moet_wel(:'anna', 'de poulebaas maakt Bram wel los (de uitweg na een misklik)',
  $$update pool_members set user_id = null where member_id = 'bbbb2222-0000-0000-0000-000000000002'$$);
select pg_temp.moet_niet(:'bram', 'een gewoon lid maakt Anna niet los',
  $$update pool_members set user_id = null where member_id = 'aaaa1111-0000-0000-0000-000000000001'$$);
select pg_temp.moet_wel(:'bram', 'jezelf loslaten mag',
  $$update pool_members set user_id = null where member_id = 'bbbb2222-0000-0000-0000-000000000002'$$);

-- Losgemaakt is losgemaakt: ook het toestel dat een speler ooit inschreef,
-- vult daarna niet meer voor hem in. Dirk claimt "Gedeeld" (dat Bram
-- inschreef), de poulebaas maakt hem los, en dan mag Bram er niet meer bij.
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004"}', true);
  -- Dirk speelt al als Oude Speler; eerst loslaten, dan Gedeeld claimen.
  update pool_members set user_id = null where member_id = 'cccc3333-0000-0000-0000-000000000003';
  if public.poule_claim_speler('eeee5555-0000-0000-0000-000000000005') is null then
    raise exception 'gezakt: Dirk kon Gedeeld niet claimen'; end if;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
  update pool_members set user_id = null where member_id = 'eeee5555-0000-0000-0000-000000000005';
  if not found then raise exception 'gezakt: de poulebaas kon Gedeeld niet losmaken'; end if;
  reset role;
end $$;
select pg_temp.moet_niet(:'bram', 'na losmaken vult ook het toestel dat de speler inschreef niet meer voor hem in',
  $$update answers set waarde = '"1"' where member_id = 'eeee5555-0000-0000-0000-000000000005'$$);

do $$ begin raise notice 'ok: niemand kan andermans speler, account of naam gebruiken'; end $$;
