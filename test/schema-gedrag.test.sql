-- Gedrag van schema.sql: de deadline-trigger en de unieke sleutel.
-- Draai dit na schema.sql. Elke mislukte controle gooit een exception,
-- zodat psql met ON_ERROR_STOP=1 de build laat zakken.
--
-- Sluit af met een opzettelijk beschadigde tabel (dubbele rij, geen unieke
-- sleutel), zodat schema-herstel.test.sql kan controleren of een tweede run
-- van schema.sql dat opruimt.

\set ON_ERROR_STOP on

insert into pools (id, name, season, join_code)
values ('11111111-1111-1111-1111-111111111111', 'Test', 2026, 'RTM026');
insert into pool_members (member_id, pool_id, display_name)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 'Danny');
insert into races (id, season, round, name, deadline_quali, deadline_race) values
  (1, 2026, 1, 'Melbourne', now() - interval '2 hours', now() + interval '2 days'),
  (2, 2026, 2, 'Shanghai',  now() + interval '1 day',   now() + interval '2 days');

do $$
declare
  poule uuid := '11111111-1111-1111-1111-111111111111';
  lid   uuid := '22222222-2222-2222-2222-222222222222';
  tien  text[] := array['1','4','16','63','44','81','12','10','14','18'];
  n     int;
begin
  -- 1. race-top-10 opslaan terwijl de kwalificatie al gesloten is
  insert into predictions (pool_id, race_id, member_id, race_top10)
  values (poule, 1, lid, tien);
  select array_length(race_top10, 1) into n from predictions where race_id = 1;
  if n is distinct from 10 then raise exception 'gezakt: race-top-10 niet opgeslagen (%)', n; end if;
  raise notice 'ok: race-top-10 opslaan terwijl de kwalificatie dicht is';

  -- 2. de kwalificatie invullen na de deadline hoort geweigerd te worden
  begin
    update predictions set quali_top10 = array['1','2','3'] where race_id = 1;
    raise exception 'gezakt: de gesloten kwalificatie werd toch geaccepteerd';
  exception when others then
    if sqlerrm not like '%kwalificatie%gesloten%' then raise; end if;
    raise notice 'ok: gesloten kwalificatie geweigerd (%)', sqlerrm;
  end;

  -- 3. de race-top-10 mag nog wel gewijzigd worden
  update predictions set race_top10 = array['4','1','16','63','44','81','12','10','14','18']
  where race_id = 1;
  raise notice 'ok: race-top-10 wijzigen mag nog';

  -- 4. kernpunt: opslaan met de ongewijzigde quali-kolom erbij.
  --    Een trigger die op "kolom aanwezig" test in plaats van op "kolom
  --    gewijzigd" blokkeert dit ten onrechte.
  update predictions
  set quali_top10 = quali_top10,
      race_top10  = array['16','1','4','63','44','81','12','10','14','18']
  where race_id = 1;
  raise notice 'ok: ongewijzigde quali-kolom meesturen blokkeert het opslaan niet';

  -- 5. upsert gedraagt zich als update, niet als nieuwe rij
  insert into predictions (pool_id, race_id, member_id, race_top10)
  values (poule, 1, lid, array['81','1','4','63','44','16','12','10','14','18'])
  on conflict (pool_id, race_id, member_id) do update
  set race_top10 = excluded.race_top10;
  select count(*) into n from predictions where race_id = 1;
  if n <> 1 then raise exception 'gezakt: upsert maakte % rijen in plaats van 1', n; end if;
  raise notice 'ok: upsert werkt de bestaande rij bij';

  -- 6. een race die nog helemaal openstaat
  insert into predictions (pool_id, race_id, member_id, quali_top10)
  values (poule, 2, lid, tien);
  raise notice 'ok: voorspelling voor een volledig open race';

  -- 7. de race-deadline wordt ook bewaakt
  begin
    update races set deadline_race = now() - interval '1 hour' where id = 2;
    update predictions set race_top10 = tien where race_id = 2;
    raise exception 'gezakt: de gesloten race werd toch geaccepteerd';
  exception when others then
    if sqlerrm not like '%race is gesloten%' then raise; end if;
    raise notice 'ok: gesloten race geweigerd (%)', sqlerrm;
  end;

  -- 8. de losse winnaar hangt aan dezelfde deadline als de race-top-10.
  --    De exception hierboven draait zijn eigen blok terug, dus de deadline
  --    van race 2 staat hier weer in de toekomst.
  update predictions set race_winnaar = '1' where race_id = 2;
  if (select race_winnaar from predictions where race_id = 2) is distinct from '1' then
    raise exception 'gezakt: winnaar niet opgeslagen terwijl de race openstond';
  end if;
  raise notice 'ok: winnaar invullen mag zolang de race openstaat';

  begin
    update races set deadline_race = now() - interval '1 hour' where id = 2;
    update predictions set race_winnaar = '4' where race_id = 2;
    raise exception 'gezakt: de winnaar werd na de deadline toch gewijzigd';
  exception when others then
    if sqlerrm not like '%race is gesloten%' then raise; end if;
    raise notice 'ok: winnaar wijzigen na de deadline geweigerd (%)', sqlerrm;
  end;

  -- 9. en bij een nieuwe rij telt de winnaar net zo goed mee
  insert into races (id, season, round, name, deadline_quali, deadline_race)
  values (3, 2026, 3, 'Suzuka', now() - interval '2 days', now() - interval '1 day');
  begin
    insert into predictions (pool_id, race_id, member_id, race_winnaar)
    values (poule, 3, lid, '1');
    raise exception 'gezakt: een winnaar voor een gesloten race werd toch aangenomen';
  exception when others then
    if sqlerrm not like '%race is gesloten%' then raise; end if;
    raise notice 'ok: winnaar voor een gesloten race geweigerd (%)', sqlerrm;
  end;

  -- 10. de seizoenslaag hangt aan de éérste sessie van de race waar hij op
  --     staat, en niet aan de race. Dat verschil is het hele punt: de
  --     seizoensvragen vul je in voordat er íéts gereden is. Zonder de eigen
  --     tak in de trigger zouden ze op de race-deadline vallen, en dan kon je
  --     de wereldkampioen nog kiezen terwijl de eerste kwalificatie liep.
  insert into races (id, season, round, name, deadline_quali, deadline_race)
  values (4, 2026, 4, 'Bahrein', now() + interval '1 day', now() + interval '2 days');
  insert into pool_questions (pool_id, question_id) values (poule, 'kampioen')
  on conflict do nothing;
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 4, lid, 'kampioen', '"1"'::jsonb);
  raise notice 'ok: een seizoensantwoord kan zolang het weekend nog niet begon';

  -- De kwalificatie begint. De race staat nog een dag open, dus een
  -- race-antwoord mag nog -- maar de seizoenslaag niet meer.
  update races set deadline_quali = now() - interval '1 minute' where id = 4;
  begin
    update answers set waarde = '"4"'::jsonb
     where pool_id = poule and race_id = 4 and question_id = 'kampioen';
    raise exception 'gezakt: een seizoensantwoord werd na de start nog gewijzigd';
  exception when others then
    if sqlerrm not like '%seizoen is al begonnen%' then raise; end if;
    raise notice 'ok: seizoensantwoord na de start geweigerd (%)', sqlerrm;
  end;
end $$;

-- 11. In welke taal een herinnering aankomt.
--
--     De app vertaalt zichzelf in de browser, maar een push wordt verstuurd
--     door scripts/sync.mjs in een GitHub-runner. Die heeft geen browser en
--     kan de taal dus nergens anders vandaan halen dan uit deze kolom. Staat
--     de standaardwaarde verkeerd, dan krijgt iedereen die de app in het
--     Engels gebruikt zijn meldingen in het Nederlands -- en dat zie je pas
--     op iemands telefoon.
do $$
declare poule uuid; lid uuid; gevonden text;
begin
  select id into poule from pools limit 1;
  select member_id into lid from pool_members where pool_id = poule limit 1;

  insert into push_abonnementen (endpoint, member_id, pool_id, p256dh, auth)
  values ('https://push.voorbeeld/zonder', lid, poule, 'p', 'a');
  select taal into gevonden from push_abonnementen
   where endpoint = 'https://push.voorbeeld/zonder';
  if gevonden is distinct from 'nl' then
    raise exception 'gezakt: een abonnement zonder taal kreeg % in plaats van nl', gevonden;
  end if;
  raise notice 'ok: zonder opgave staat een abonnement op Nederlands';

  insert into push_abonnementen (endpoint, member_id, pool_id, p256dh, auth, taal)
  values ('https://push.voorbeeld/engels', lid, poule, 'p', 'a', 'en');
  select taal into gevonden from push_abonnementen
   where endpoint = 'https://push.voorbeeld/engels';
  if gevonden is distinct from 'en' then
    raise exception 'gezakt: de opgegeven taal werd niet bewaard (%)', gevonden;
  end if;
  raise notice 'ok: een abonnement kan op Engels staan';

  -- Twee toestellen van dezelfde speler mogen elk hun eigen taal hebben: de
  -- telefoon op Engels en de laptop op Nederlands is een gewoon geval.
  if (select count(distinct taal) from push_abonnementen where member_id = lid) <> 2 then
    raise exception 'gezakt: twee toestellen van één speler delen hun taal';
  end if;
  raise notice 'ok: twee toestellen van één speler hebben elk hun eigen taal';

  delete from push_abonnementen where member_id = lid;
end $$;

-- Beschadig de tabel voor de hersteltest: dubbele rij, geen unieke sleutel.
alter table predictions drop constraint predictions_uniek;
alter table predictions disable trigger predictions_deadline;
insert into predictions (pool_id, race_id, member_id, race_top10, updated_at)
values ('11111111-1111-1111-1111-111111111111', 1,
        '22222222-2222-2222-2222-222222222222',
        array['99','1','4','63','44','16','12','10','14','18'], now() + interval '1 minute');
alter table predictions enable trigger predictions_deadline;

do $$
declare n int;
begin
  select count(*) into n from predictions where race_id = 1;
  if n <> 2 then raise exception 'opzet mislukt: % rijen in plaats van 2', n; end if;
  raise notice 'opzet: 2 dubbele rijen klaargezet voor de hersteltest';
end $$;
