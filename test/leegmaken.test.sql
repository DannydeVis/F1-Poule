-- leegmaken.sql: alles wat aan een poule hangt gaat weg, de kalender en de
-- vragenlijst blijven. Draai dit op een verse database na schema.sql.
--
-- Twee kanten, en de tweede is de belangrijkste. Dat de poules leeg zijn na
-- een bestand dat "leegmaken" heet controleert zichzelf wel. Wat stil kan
-- breken is de andere kant: dat de 24 races met hun uitslagen er nog staan.
-- Gaan die per ongeluk mee, dan is het verschil met reset.sql weg en moet
-- iemand na een opschoning de hele kalender opnieuw ophalen zonder te
-- begrijpen waarom.

\set ON_ERROR_STOP on

-- ---- een poule met alles eraan, plus een account ------------
do $$
declare
  poule uuid := '44444444-4444-4444-4444-444444444444';
  lid   uuid := '55555555-5555-5555-5555-555555555555';
  gebruiker uuid := '66666666-6666-6666-6666-666666666666';
  race  bigint;
begin
  insert into auth.users (id) values (gebruiker);
  insert into pools (id, name, join_code) values (poule, 'Testpoule', 'LEEG01');
  insert into pool_members (member_id, pool_id, display_name, user_id)
    values (lid, poule, 'Danny', gebruiker);
  -- Eerst een race die nog moet komen: de deadline-trigger weigert een
  -- antwoord op een gesloten sessie, en terecht.
  insert into races (season, round, name, deadline_quali, deadline_race)
    values (2026, 1, 'Melbourne', now() + interval '1 day', now() + interval '2 days')
    returning id into race;
  insert into pool_questions (pool_id, question_id) values (poule, 'quali_top10');
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values (poule, race, lid, 'quali_top10', '["1","4","16"]'::jsonb);
  -- Een gezette joker hoort er ook aan te hangen. Jokers moeten daarvoor aan
  -- staan in deze poule, en het weekend moet nog beginnen.
  update pools set jokers_vanaf = now() - interval '1 hour' where id = poule;
  insert into jokers (pool_id, race_id, member_id) values (poule, race, lid);
  -- En dan is het weekend geweest.
  update races set deadline_quali = now() - interval '2 days',
                   deadline_race  = now() - interval '1 day',
                   race_result    = array['1','4','16']
   where id = race;
  insert into predictions (pool_id, race_id, member_id)
    values (poule, race, lid);
  raise notice 'ok: testpoule klaargezet';
end $$;

\i leegmaken.sql

-- ---- en nu de controle --------------------------------------
do $$
declare n int;
begin
  select count(*) into n from pools;
  if n <> 0 then raise exception 'gezakt: nog % poules over', n; end if;
  select count(*) into n from pool_members;
  if n <> 0 then raise exception 'gezakt: nog % spelers over', n; end if;
  select count(*) into n from answers;
  if n <> 0 then raise exception 'gezakt: nog % antwoorden over', n; end if;
  select count(*) into n from pool_questions;
  if n <> 0 then raise exception 'gezakt: nog % vragenkeuzes over', n; end if;
  select count(*) into n from predictions;
  if n <> 0 then raise exception 'gezakt: nog % oude voorspellingen over', n; end if;
  select count(*) into n from jokers;
  if n <> 0 then raise exception 'gezakt: nog % jokers over', n; end if;
  raise notice 'ok: poules, spelers en inzendingen zijn weg';

  -- Dit is waar het bestand zijn bestaansrecht aan ontleent.
  select count(*) into n from races;
  if n <> 1 then raise exception 'gezakt: % races over in plaats van 1 — de '
    'kalender hoort te blijven staan', n; end if;
  select count(*) into n from races where race_result is not null;
  if n <> 1 then raise exception 'gezakt: de uitslag van de race is weg'; end if;
  raise notice 'ok: de kalender en de uitslagen staan er nog';

  select count(*) into n from questions;
  if n <> 14 then raise exception 'gezakt: % vragen over in plaats van 14', n; end if;
  raise notice 'ok: de vragenlijst staat er nog';

  -- Accounts blijven met opzet staan: een account is geen speler. Het blok
  -- dat ze wél weghaalt staat in leegmaken.sql als commentaar.
  select count(*) into n from auth.users;
  if n <> 1 then raise exception 'gezakt: het account is weg terwijl het blok '
    'daarvoor uitgecommentarieerd hoort te staan'; end if;
  raise notice 'ok: accounts zijn niet aangeraakt';
end $$;

-- ---- en nog een keer, op een database die al leeg is ---------
-- Twee keer draaien hoort niets te doen en niets te breken. Iemand die niet
-- zeker weet of hij op Run heeft gedrukt, drukt nog een keer.
\i leegmaken.sql

do $$
declare n int;
begin
  select count(*) into n from races;
  if n <> 1 then raise exception 'gezakt: tweede keer draaien raakte de races'; end if;
  raise notice 'ok: twee keer draaien is net zo veilig als één keer';
end $$;
