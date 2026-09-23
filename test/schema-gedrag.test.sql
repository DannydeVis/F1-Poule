-- Gedrag van schema.sql: de deadline-trigger op answers.
-- Draai dit na schema.sql. Elke mislukte controle gooit een exception,
-- zodat psql met ON_ERROR_STOP=1 de build laat zakken.
--
-- Deze controles stonden eerst op de oude predictions-tabel. Die is weg, maar
-- het gedrag niet: een antwoord hoort geweigerd te worden zodra de deadline
-- die erbij hoort verstreken is, en welke deadline dat is hangt van de vraag
-- af. Dat is precies zo overgezet naar answers.
--
-- Eén controle is níét meegekomen, en dat is met opzet. Die ging erover dat
-- het meesturen van een ongewijzigde quali-kolom het opslaan niet mocht
-- blokkeren -- een valkuil van één brede rij met een kolom per vraag. In
-- answers staat elke vraag op zijn eigen rij, dus dat geval kán niet meer
-- bestaan; een test ervoor zou coverage voorwenden die nergens over gaat.
--
-- Sluit af met een nagebootste oude database: een predictions-tabel met rijen
-- die nog niet overgezet zijn, zodat schema-herstel.test.sql kan controleren
-- of een tweede run van schema.sql ze overzet én de tabel laat vallen.

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
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 1, lid, 'race_top10', to_jsonb(tien));
  select jsonb_array_length(waarde) into n
    from answers where race_id = 1 and question_id = 'race_top10';
  if n is distinct from 10 then raise exception 'gezakt: race-top-10 niet opgeslagen (%)', n; end if;
  raise notice 'ok: race-top-10 opslaan terwijl de kwalificatie dicht is';

  -- 2. de kwalificatie invullen na de deadline hoort geweigerd te worden
  begin
    insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values (poule, 1, lid, 'quali_top10', to_jsonb(array['1','2','3']));
    raise exception 'gezakt: de gesloten kwalificatie werd toch geaccepteerd';
  exception when others then
    if sqlerrm not like '%kwalificatie%gesloten%' then raise; end if;
    raise notice 'ok: gesloten kwalificatie geweigerd (%)', sqlerrm;
  end;

  -- 3. de race-top-10 mag nog wel gewijzigd worden
  update answers set waarde = to_jsonb(array['4','1','16','63','44','81','12','10','14','18'])
  where race_id = 1 and question_id = 'race_top10';
  raise notice 'ok: race-top-10 wijzigen mag nog';

  -- 4. upsert gedraagt zich als update en niet als nieuwe rij. Zonder die
  --    sleutel lijkt bewaren willekeurig wel en niet te werken: je wijzigt
  --    iets, er komt een tweede rij bij, en welke van de twee je terugkrijgt
  --    is een gok. De app schrijft precies zo weg.
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 1, lid, 'race_top10',
          to_jsonb(array['81','1','4','63','44','16','12','10','14','18']))
  on conflict (pool_id, race_id, member_id, question_id) do update
  set waarde = excluded.waarde;
  select count(*) into n from answers where race_id = 1 and question_id = 'race_top10';
  if n <> 1 then raise exception 'gezakt: upsert maakte % rijen in plaats van 1', n; end if;
  raise notice 'ok: upsert werkt de bestaande rij bij';

  -- 5. een race die nog helemaal openstaat
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 2, lid, 'quali_top10', to_jsonb(tien));
  raise notice 'ok: voorspelling voor een volledig open race';

  -- 6. de race-deadline wordt ook bewaakt
  begin
    update races set deadline_race = now() - interval '1 hour' where id = 2;
    insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values (poule, 2, lid, 'race_top10', to_jsonb(tien));
    raise exception 'gezakt: de gesloten race werd toch geaccepteerd';
  exception when others then
    if sqlerrm not like '%race is gesloten%' then raise; end if;
    raise notice 'ok: gesloten race geweigerd (%)', sqlerrm;
  end;

  -- 7. de losse winnaar hangt aan dezelfde deadline als de race-top-10.
  --    De exception hierboven draait zijn eigen blok terug, dus de deadline
  --    van race 2 staat hier weer in de toekomst.
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 2, lid, 'winnaar', to_jsonb('1'::text));
  if (select waarde from answers where race_id = 2 and question_id = 'winnaar')
     is distinct from to_jsonb('1'::text) then
    raise exception 'gezakt: winnaar niet opgeslagen terwijl de race openstond';
  end if;
  raise notice 'ok: winnaar invullen mag zolang de race openstaat';

  begin
    update races set deadline_race = now() - interval '1 hour' where id = 2;
    update answers set waarde = to_jsonb('4'::text)
    where race_id = 2 and question_id = 'winnaar';
    raise exception 'gezakt: de winnaar werd na de deadline toch gewijzigd';
  exception when others then
    if sqlerrm not like '%race is gesloten%' then raise; end if;
    raise notice 'ok: winnaar wijzigen na de deadline geweigerd (%)', sqlerrm;
  end;

  -- 8. en bij een nieuwe rij telt de winnaar net zo goed mee
  insert into races (id, season, round, name, deadline_quali, deadline_race)
  values (3, 2026, 3, 'Suzuka', now() - interval '2 days', now() - interval '1 day');
  begin
    insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values (poule, 3, lid, 'winnaar', to_jsonb('1'::text));
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
  -- race-antwoord mag nog -- maar wat je bij de seizoenslaag koos ligt vast.
  --
  -- Alleen dat ene punt hier; de volledige regel (invullen mag later nog wél,
  -- veranderen en weghalen niet, en na de laatste race komt er niets meer bij)
  -- staat in test/seizoenslaag.test.sql.
  update races set deadline_quali = now() - interval '1 minute' where id = 4;
  begin
    update answers set waarde = '"4"'::jsonb
     where pool_id = poule and race_id = 4 and question_id = 'kampioen';
    raise exception 'gezakt: een seizoensantwoord werd na de start nog gewijzigd';
  exception when others then
    if sqlerrm not like '%ligt vast%' then raise; end if;
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

-- ------------------------------------------------------------
--  Zet een oude database neer voor de hersteltest
-- ------------------------------------------------------------
--
-- schema.sql laat predictions tegenwoordig vallen, maar pas nádat hij eruit
-- heeft overgezet wat er nog in zat. Dat is de riskante kant van die
-- wijziging: draait hij op een database die de migratie nooit gedraaid heeft,
-- dan mag er niets verdwijnen.
--
-- Hieronder staat zo'n database, met opzet zonder unieke sleutel en zonder
-- trigger -- precies zoals de tabel er vóór de migratie uitzag. Er gaan drie
-- soorten rijen in, en schema-herstel.test.sql controleert er straks alle
-- drie van:
--
--   1. een gewone rij die overgezet hoort te worden;
--   2. twee rijen voor dezelfde speler en race, waarvan de nieuwste moet
--      winnen -- vroeger ruimde schema.sql die eerst op, nu kiest de
--      migratie met distinct on;
--   3. een rij die naar een verdwenen race wijst. answers heeft foreign
--      keys, dus die kán daar niet in; hij hoort overgeslagen te worden in
--      plaats van de hele migratie te laten klappen.

create table public.predictions (
  pool_id     uuid   not null,
  race_id     bigint not null,
  member_id   uuid   not null,
  quali_top10 text[],
  race_top10  text[],
  race_winnaar text,
  updated_at  timestamptz not null default now()
);

insert into public.predictions (pool_id, race_id, member_id, race_top10, updated_at)
values
  -- 1. race 3 is gesloten en heeft nog niets in answers: die moet mee.
  --    Meteen het bewijs dat de migratie de deadline-trigger uitzet, want
  --    langs die trigger zou dit geweigerd worden.
  ('11111111-1111-1111-1111-111111111111', 3,
   '22222222-2222-2222-2222-222222222222',
   array['55','1','4','63','44','16','12','10','14','18'], now() - interval '1 day'),
  -- 2. twee rijen voor race 1; de nieuwste heeft 99 op P1. answers heeft voor
  --    race 1 al een race_top10 staan, dus geen van beide mag die
  --    overschrijven -- maar de quali erbij hieronder wél.
  ('11111111-1111-1111-1111-111111111111', 1,
   '22222222-2222-2222-2222-222222222222',
   array['11','1','4','63','44','16','12','10','14','18'], now() - interval '2 days'),
  ('11111111-1111-1111-1111-111111111111', 1,
   '22222222-2222-2222-2222-222222222222',
   array['99','1','4','63','44','16','12','10','14','18'], now() - interval '1 hour'),
  -- 3. race 404 bestaat niet.
  ('11111111-1111-1111-1111-111111111111', 404,
   '22222222-2222-2222-2222-222222222222',
   array['1','2','3','4','5','6','7','8','9','10'], now());

-- De nieuwste van die twee krijgt ook een quali mee, want dát is wat er nog
-- niet in answers staat. Komt straks de 11 in plaats van de 99 terug, dan
-- heeft distinct on de verkeerde rij gekozen.
update public.predictions
   set quali_top10 = array['99','1','4','63','44','16','12','10','14','18']
 where race_id = 1 and quali_top10 is null and race_top10[1] = '99';
update public.predictions
   set quali_top10 = array['11','1','4','63','44','16','12','10','14','18']
 where race_id = 1 and quali_top10 is null and race_top10[1] = '11';

do $$
declare n int;
begin
  select count(*) into n from public.predictions;
  if n <> 4 then raise exception 'opzet mislukt: % rijen in plaats van 4', n; end if;
  raise notice 'opzet: een oude database met 4 voorspellingen klaargezet';
end $$;
