-- Coureurlijsten vervangen en open antwoorden omzetten, tegen een echte
-- PostgreSQL. Zie lijst_vervangen() in schema.sql en BEDIENING.md §6c.
--
-- Het geval: OpenF1 heeft de coureurs van een nieuw seizoen pas rond het
-- eerste weekend. Tot dan staat bij elke race de geleende lijst van de laatste
-- race van vorig jaar, en daarop vult iedereen zijn seizoensvragen en eerste
-- top 10's in. Komt de echte lijst, dan:
--
--   1. nummerwissel: Norris neemt 1, Verstappen gaat naar 3; een antwoord "4"
--      wordt "1" en "1" wordt "3", tegelijk en niet na elkaar;
--   2. teamnaam: Kick Sauber heet Audi; een antwoord "Kick Sauber" wordt "Audi";
--   3. nieuwe coureur: staat erbij en verandert niets aan bestaande antwoorden;
--   4. coureur die verdwijnt: Alonso (#14) blijft #14 en de app vraagt om
--      opnieuw te kiezen; Tsunoda (#22) ook, maar #22 is nu van een ander, dus
--      daar komt "weg:TSU" te staan in plaats van stil die ander;
--   5. gesloten antwoorden blijven precies zoals ze waren;
--   6. een seizoensantwoord wordt ook na de start van het seizoen omgezet,
--      langs de deadline-trigger, maar een gewone wijziging blijft geweigerd;
--   7. niet eenduidig: niets omzetten en melden (twee coureurs met dezelfde
--      naam, twee teams die verdwijnen voor twee nieuwe namen);
--   8. de echte lijst gaat ook naar de latere races met een geleende lijst,
--      niet naar een race met een lijst uit het beheer;
--   9. alles komt in sync_runs;
--  10. het beheer kan de lijst zetten voor de races met een geleende lijst,
--      met controle op de invoer, en alleen als beheerder;
--  11. niet via de API aan te roepen;
--  12. lijsten van voor de kolom lijst_herkomst: een seizoen zonder uitslagen
--      met coureurs heeft ze geleend.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at) values
  ('c1000000-0000-0000-0000-000000000001', 'beheerder@voorbeeld.nl', now()),
  ('c2000000-0000-0000-0000-000000000002', 'speler@voorbeeld.nl', now());
insert into public.site_beheerders (user_id) values ('c1000000-0000-0000-0000-000000000001');

-- De lijst van de laatste race van 2026 (geleend) en de echte van 2027.
create temp table lijsten (naam text primary key, lijst jsonb);
insert into lijsten values
('oud', '[
  {"nr":"1",  "code":"VER", "naam":"Max VERSTAPPEN",     "team":"Red Bull Racing", "kleur":"#3671C6"},
  {"nr":"4",  "code":"NOR", "naam":"Lando NORRIS",       "team":"McLaren",         "kleur":"#FF8000"},
  {"nr":"81", "code":"PIA", "naam":"Oscar PIASTRI",      "team":"McLaren",         "kleur":"#FF8000"},
  {"nr":"6",  "code":"HAD", "naam":"Isack HADJAR",       "team":"Racing Bulls",    "kleur":"#6692FF"},
  {"nr":"22", "code":"TSU", "naam":"Yuki TSUNODA",       "team":"Racing Bulls",    "kleur":"#6692FF"},
  {"nr":"27", "code":"HUL", "naam":"Nico HULKENBERG",    "team":"Kick Sauber",     "kleur":"#52E252"},
  {"nr":"5",  "code":"BOR", "naam":"Gabriel BORTOLETO",  "team":"Kick Sauber",     "kleur":"#52E252"},
  {"nr":"14", "code":"ALO", "naam":"Fernando ALONSO",    "team":"Aston Martin",    "kleur":"#229971"},
  {"nr":"18", "code":"STR", "naam":"Lance STROLL",       "team":"Aston Martin",    "kleur":"#229971"}
]'),
('nieuw', '[
  {"nr":"1",  "code":"NOR", "naam":"Lando NORRIS",       "team":"McLaren",         "kleur":"#FF8000"},
  {"nr":"81", "code":"PIA", "naam":"Oscar PIASTRI",      "team":"McLaren",         "kleur":"#FF8000"},
  {"nr":"3",  "code":"VER", "naam":"Max VERSTAPPEN",     "team":"Red Bull Racing", "kleur":"#3671C6"},
  {"nr":"6",  "code":"HAD", "naam":"Isack HADJAR",       "team":"Red Bull Racing", "kleur":"#3671C6"},
  {"nr":"22", "code":"CRA", "naam":"Jak CRAWFORD",       "team":"Racing Bulls",    "kleur":"#6692FF"},
  {"nr":"41", "code":"LIN", "naam":"Arvid LINDBLAD",     "team":"Racing Bulls",    "kleur":"#6692FF"},
  {"nr":"27", "code":"HUL", "naam":"Nico HULKENBERG",    "team":"Audi",            "kleur":"#F50537"},
  {"nr":"5",  "code":"BOR", "naam":"Gabriel BORTOLETO",  "team":"Audi",            "kleur":"#F50537"},
  {"nr":"18", "code":"STR", "naam":"Lance STROLL",       "team":"Aston Martin",    "kleur":"#229971"},
  {"nr":"10", "code":"DRU", "naam":"Felipe DRUGOVICH",   "team":"Aston Martin",    "kleur":"#229971"}
]');

-- ---- 1 t/m 4: het rekenwerk ----------------------------------------------
do $$
declare
  o jsonb := public.lijst_omzetting((select lijst from lijsten where naam = 'oud'),
                                    (select lijst from lijsten where naam = 'nieuw'));
begin
  if o -> 'coureurs' <> '{"4":"1","1":"3","22":"weg:TSU"}'::jsonb then
    raise exception 'gezakt: de nummers worden %', o -> 'coureurs';
  end if;
  raise notice 'ok: nummerwissel 4 wordt 1 en 1 wordt 3, en #22 van Tsunoda wordt weg:TSU (%)', o -> 'coureurs';
  if o -> 'teams' <> '{"Kick Sauber":"Audi"}'::jsonb then
    raise exception 'gezakt: de teams worden %', o -> 'teams';
  end if;
  raise notice 'ok: Kick Sauber wordt Audi, Racing Bulls blijft Racing Bulls ook al reed Hadjar daar';
  if (o -> 'coureurs') ? '6' or (o -> 'coureurs') ? '41' or (o -> 'coureurs') ? '14' then
    raise exception 'gezakt: een coureur die niet van nummer wisselt staat in de omzetting: %', o -> 'coureurs';
  end if;
  raise notice 'ok: een nieuwe coureur of een teamwissel verandert geen nummer';
  if not (o -> 'meldingen')::text like '%ALONSO (#14) staat niet meer in de lijst%' then
    raise exception 'gezakt: geen melding voor Alonso: %', o -> 'meldingen';
  end if;
  if not (o -> 'meldingen')::text like '%#22 is nu van Jak CRAWFORD%' then
    raise exception 'gezakt: geen melding dat #22 nu van een ander is: %', o -> 'meldingen';
  end if;
  raise notice 'ok: wie verdwijnt staat in de meldingen';

  -- Op afkorting als de naam anders geschreven is (zoals in het beheer).
  o := public.lijst_omzetting('[{"nr":"4","code":"NOR","naam":"Lando NORRIS","team":"McLaren"}]',
                              '[{"nr":"1","code":"NOR","naam":"Lando Norris","team":"McLaren"}]');
  if o -> 'coureurs' <> '{"4":"1"}'::jsonb then raise exception 'gezakt: hoofdletters in de naam: %', o; end if;
  o := public.lijst_omzetting('[{"nr":"11","code":"PER","naam":"Sergio PEREZ","team":"Cadillac"}]',
                              '[{"nr":"12","code":"PEZ","naam":"Sergio Pérez","team":"Cadillac"}]');
  if o -> 'coureurs' <> '{"11":"12"}'::jsonb then raise exception 'gezakt: accent in de naam: %', o; end if;
  o := public.lijst_omzetting('[{"nr":"4","code":"NOR","naam":"","team":"McLaren"}]',
                              '[{"nr":"1","code":"NOR","naam":"Lando NORRIS","team":"McLaren"}]');
  if o -> 'coureurs' <> '{"4":"1"}'::jsonb then raise exception 'gezakt: op afkorting zonder naam: %', o; end if;
  raise notice 'ok: gevonden op naam ongeacht hoofdletters en accenten, of anders op afkorting';
end $$;

-- ---- 7: niet eenduidig -----------------------------------------------------
do $$
declare
  o jsonb;
begin
  o := public.lijst_omzetting(
    '[{"nr":"7","code":"ABC","naam":"Jan JANSEN","team":"A"}]',
    '[{"nr":"8","code":"ABC","naam":"Jan JANSEN","team":"A"},{"nr":"9","code":"XYZ","naam":"Jan JANSEN","team":"A"}]');
  if o -> 'coureurs' <> '{}'::jsonb or not (o -> 'meldingen')::text like '%twee coureurs met die naam%' then
    raise exception 'gezakt: twee coureurs met dezelfde naam gaf %', o;
  end if;
  raise notice 'ok: twee coureurs met dezelfde naam: niets omgezet, wel gemeld';

  o := public.lijst_omzetting(
    '[{"nr":"7","code":"AAA","naam":"Een","team":"Oud1"},{"nr":"8","code":"BBB","naam":"Twee","team":"Oud2"}]',
    '[{"nr":"9","code":"CCC","naam":"Drie","team":"Nieuw1"},{"nr":"10","code":"DDD","naam":"Vier","team":"Nieuw2"}]');
  if o -> 'teams' <> '{}'::jsonb or not (o -> 'meldingen')::text like '%team Oud1 staat niet meer in de lijst%' then
    raise exception 'gezakt: twee verdwenen teams voor twee nieuwe namen gaf %', o;
  end if;
  raise notice 'ok: twee teams weg en twee nieuwe namen zonder bekende coureurs: niets omgezet, wel gemeld';

  o := public.lijst_omzetting(
    '[{"nr":"7","code":"AAA","naam":"Een","team":"Oud"}]',
    '[{"nr":"9","code":"CCC","naam":"Drie","team":"Nieuw"}]');
  if o -> 'teams' <> '{"Oud":"Nieuw"}'::jsonb then
    raise exception 'gezakt: één team weg en één nieuwe naam gaf %', o;
  end if;
  raise notice 'ok: één team weg en één nieuwe naam, ook zonder bekende coureurs: omgezet';
end $$;

-- ---- de poule, de races en de antwoorden ----------------------------------
do $$
declare
  poule uuid := 'cc000000-0000-0000-0000-000000000001';
  lid   uuid := 'cc000000-0000-0000-0000-0000000000a1';
  oud   jsonb := (select lijst from lijsten where naam = 'oud');
begin
  insert into pools (id, name, season, join_code) values (poule, 'Lijsttest', 2027, 'LST001');
  insert into pool_members (member_id, pool_id, display_name) values (lid, poule, 'Danny');
  insert into races (id, season, round, name, deadline_quali, deadline_race, drivers, lijst_herkomst) values
    (9701, 2027, 1, 'Bahrain', now() + interval '10 days', now() + interval '11 days', oud, 'geleend'),
    (9702, 2027, 2, 'Jeddah',  now() + interval '17 days', now() + interval '18 days', oud, 'geleend'),
    (9703, 2027, 3, 'Melbourne', now() + interval '30 days', now() + interval '31 days', oud, 'beheer');

  insert into answers (pool_id, race_id, member_id, question_id, waarde) values
    (poule, 9701, lid, 'kampioen',         '"4"'),
    (poule, 9701, lid, 'constructeur',     '"Kick Sauber"'),
    (poule, 9701, lid, 'vierde_team',      '"Racing Bulls"'),
    (poule, 9701, lid, 'winnaar',          '"22"'),
    (poule, 9701, lid, 'pole',             '"14"'),
    (poule, 9701, lid, 'quali_top10',      '["1","4","81","6","27"]'),
    (poule, 9701, lid, 'race_top10',       '[4, 1, 81]'),
    (poule, 9701, lid, 'teamgenoot_duels', '["4","27","1"]'),
    (poule, 9701, lid, 'safety_cars',      '1'),
    (poule, 9702, lid, 'winnaar',          '"1"'),
    (poule, 9703, lid, 'winnaar',          '"1"');

  -- De kwalificatie van Bahrein is al geweest: die antwoorden zijn gesloten.
  update races set deadline_quali = now() - interval '1 hour' where id = 9701;
end $$;

-- ---- 1 t/m 9: de echte lijst komt binnen -----------------------------------
do $$
declare
  poule uuid := 'cc000000-0000-0000-0000-000000000001';
  uit   jsonb;
  w     jsonb;
  runs  int := (select count(*) from sync_runs);
  rij   record;
begin
  -- Het seizoen is begonnen (de kwalificatie van ronde 1 is voorbij). Een
  -- gewone wijziging van een seizoensantwoord blijft geweigerd.
  begin
    update answers set waarde = '"81"' where pool_id = poule and race_id = 9701 and question_id = 'kampioen';
    raise exception 'gezakt: een seizoensantwoord werd na de start gewoon gewijzigd';
  exception when others then
    if sqlerrm not like '%ligt vast%' then raise; end if;
  end;
  raise notice 'ok: een gewone wijziging van een seizoensantwoord blijft geweigerd';

  uit := public.lijst_vervangen(9701, (select lijst from lijsten where naam = 'nieuw'), 'openf1');

  w := (select waarde from answers where race_id = 9701 and question_id = 'kampioen');
  if w <> '"1"' then raise exception 'gezakt: kampioen "4" werd %', w; end if;
  raise notice 'ok: seizoensvraag kampioen "4" (Norris) wordt "1", ook na de start van het seizoen';
  w := (select waarde from answers where race_id = 9701 and question_id = 'constructeur');
  if w <> '"Audi"' then raise exception 'gezakt: constructeur "Kick Sauber" werd %', w; end if;
  raise notice 'ok: constructeur "Kick Sauber" wordt "Audi"';
  w := (select waarde from answers where race_id = 9701 and question_id = 'vierde_team');
  if w <> '"Racing Bulls"' then raise exception 'gezakt: vierde team werd %', w; end if;
  w := (select waarde from answers where race_id = 9701 and question_id = 'winnaar');
  if w <> '"weg:TSU"' then raise exception 'gezakt: winnaar "22" (Tsunoda, nu Crawford) werd %', w; end if;
  raise notice 'ok: winnaar "22" wijst niet stil naar Crawford maar wordt "weg:TSU"';
  w := (select waarde from answers where race_id = 9701 and question_id = 'pole');
  if w <> '"14"' then raise exception 'gezakt: pole "14" (Alonso, weg, nummer vrij) werd %', w; end if;
  raise notice 'ok: pole "14" (Alonso is weg, #14 is van niemand) blijft staan voor "kies opnieuw"';
  w := (select waarde from answers where race_id = 9701 and question_id = 'race_top10');
  if w <> '[1, 3, 81]' then raise exception 'gezakt: race_top10 [4, 1, 81] werd %', w; end if;
  raise notice 'ok: een top 10 met getallen wordt [1, 3, 81], en blijven getallen';
  w := (select waarde from answers where race_id = 9701 and question_id = 'teamgenoot_duels');
  if w <> '["1","27","3"]' then raise exception 'gezakt: duels werden %', w; end if;
  raise notice 'ok: duels ["4","27","1"] worden ["1","27","3"]';
  w := (select waarde from answers where race_id = 9701 and question_id = 'quali_top10');
  if w <> '["1","4","81","6","27"]' then raise exception 'gezakt: de gesloten quali_top10 werd %', w; end if;
  raise notice 'ok: de gesloten quali_top10 blijft onaangeroerd';
  w := (select waarde from answers where race_id = 9701 and question_id = 'safety_cars');
  if w <> '1' then raise exception 'gezakt: safety_cars werd %', w; end if;

  if (uit ->> 'omgezet')::int <> 6 then
    raise exception 'gezakt: % omgezet, verwacht 6 (5 in Bahrein, 1 in Jeddah)', uit ->> 'omgezet';
  end if;
  select drivers, lijst_herkomst into rij from races where id = 9701;
  if rij.lijst_herkomst <> 'openf1' or jsonb_array_length(rij.drivers) <> 10 then
    raise exception 'gezakt: Bahrein heeft nu % met herkomst %', rij.drivers, rij.lijst_herkomst;
  end if;
  raise notice 'ok: Bahrein heeft de echte lijst, herkomst openf1';

  -- 8: Jeddah had een geleende lijst en krijgt de echte mee; Melbourne niet.
  select drivers, lijst_herkomst into rij from races where id = 9702;
  if rij.lijst_herkomst <> 'geleend' or jsonb_array_length(rij.drivers) <> 10 then
    raise exception 'gezakt: Jeddah heeft % met herkomst %', rij.drivers, rij.lijst_herkomst;
  end if;
  w := (select waarde from answers where race_id = 9702 and question_id = 'winnaar');
  if w <> '"3"' then raise exception 'gezakt: winnaar in Jeddah "1" werd %', w; end if;
  raise notice 'ok: Jeddah (geleend) krijgt de echte lijst mee, en winnaar "1" wordt "3"';
  select drivers, lijst_herkomst into rij from races where id = 9703;
  if rij.lijst_herkomst <> 'beheer' or jsonb_array_length(rij.drivers) <> 9 then
    raise exception 'gezakt: Melbourne (beheer) werd overschreven: %', rij.lijst_herkomst;
  end if;
  w := (select waarde from answers where race_id = 9703 and question_id = 'winnaar');
  if w <> '"1"' then raise exception 'gezakt: winnaar in Melbourne werd %', w; end if;
  raise notice 'ok: Melbourne (lijst uit het beheer) blijft staan';

  -- 9: sync_runs.
  if (select count(*) from sync_runs) <= runs then raise exception 'gezakt: niets in sync_runs'; end if;
  select * into rij from sync_runs where samenvatting like 'Coureurlijst 2027 ronde 1 Bahrain%' order by id desc limit 1;
  if rij is null or rij.bijgewerkt <> 5 or rij.fouten not like '%ALONSO%' or rij.samenvatting not like '%Audi%' then
    raise exception 'gezakt: de regel in sync_runs is %', to_jsonb(rij);
  end if;
  raise notice 'ok: in sync_runs: % (meldingen: %)', rij.samenvatting, rij.fouten;
  if not exists (select 1 from sync_runs where samenvatting like 'Coureurlijst 2027 ronde 2 Jeddah%' and bijgewerkt = 1) then
    raise exception 'gezakt: de omzetting in Jeddah staat niet in sync_runs';
  end if;
  raise notice 'ok: ook de omzetting in Jeddah staat erin';

  -- Nog een keer dezelfde lijst: niets meer om te zetten.
  uit := public.lijst_vervangen(9701, (select lijst from lijsten where naam = 'nieuw'), 'openf1');
  if (uit ->> 'omgezet')::int <> 0 or uit -> 'coureurs' <> '{}'::jsonb then
    raise exception 'gezakt: dezelfde lijst nog eens zette % om', uit;
  end if;
  raise notice 'ok: dezelfde lijst nog eens verandert niets';
end $$;

-- ---- 5: een gesloten race wordt nooit omgezet ------------------------------
do $$
declare
  poule uuid := 'cc000000-0000-0000-0000-000000000001';
  lid   uuid := 'cc000000-0000-0000-0000-0000000000a1';
  w     jsonb;
begin
  insert into races (id, season, round, name, deadline_quali, deadline_race, drivers, lijst_herkomst)
  values (9709, 2026, 24, 'Yas Marina', now() + interval '1 day', now() + interval '2 days',
          (select lijst from lijsten where naam = 'oud'), 'geleend');
  insert into answers (pool_id, race_id, member_id, question_id, waarde) values
    (poule, 9709, lid, 'winnaar', '"4"'), (poule, 9709, lid, 'quali_top10', '["4","1"]');
  update races set deadline_quali = now() - interval '2 days', deadline_race = now() - interval '1 day'
   where id = 9709;
  perform public.lijst_vervangen(9709, (select lijst from lijsten where naam = 'nieuw'), 'openf1');
  w := (select waarde from answers where race_id = 9709 and question_id = 'winnaar');
  if w <> '"4"' then raise exception 'gezakt: een gesloten winnaar werd %', w; end if;
  w := (select waarde from answers where race_id = 9709 and question_id = 'quali_top10');
  if w <> '["4","1"]' then raise exception 'gezakt: een gesloten top 10 werd %', w; end if;
  raise notice 'ok: na de deadline blijven winnaar en top 10 precies wat ze waren';
end $$;

-- ---- 6b: een gescoord seizoen blijft ook staan -----------------------------
do $$
declare
  poule uuid := 'cc000000-0000-0000-0000-000000000002';
  lid   uuid := 'cc000000-0000-0000-0000-0000000000a2';
  w     jsonb;
begin
  insert into pools (id, name, season, join_code) values (poule, 'Klaar', 2025, 'LST002');
  insert into pool_members (member_id, pool_id, display_name) values (lid, poule, 'Danny');
  insert into races (id, season, round, name, deadline_quali, deadline_race, drivers, lijst_herkomst)
  values (9501, 2025, 1, 'Melbourne', now() + interval '1 day', now() + interval '2 days',
          (select lijst from lijsten where naam = 'oud'), 'geleend');
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 9501, lid, 'kampioen', '"4"');
  update races set deadline_quali = now() - interval '200 days', deadline_race = now() - interval '199 days',
                   race_result = array['4','1'] where id = 9501;
  if not public.poule_seizoen_voorbij(9501) then raise exception 'opzet: seizoen 2025 is niet voorbij'; end if;
  perform public.lijst_vervangen(9501, (select lijst from lijsten where naam = 'nieuw'), 'openf1');
  w := (select waarde from answers where race_id = 9501 and question_id = 'kampioen');
  if w <> '"4"' then raise exception 'gezakt: een gescoord seizoensantwoord werd %', w; end if;
  raise notice 'ok: een seizoen dat erop zit wordt niet meer omgezet';
end $$;

-- ---- 10: het beheer --------------------------------------------------------
do $$
declare
  poule uuid := 'cc000000-0000-0000-0000-000000000003';
  lid   uuid := 'cc000000-0000-0000-0000-0000000000a3';
  uit   jsonb;
  w     jsonb;
  rij   record;
  grid  jsonb := '[
    {"nr":"1",  "code":"nor", "naam":"Lando Norris",      "team":"McLaren"},
    {"nr":"81", "code":"PIA", "naam":"Oscar Piastri",     "team":"McLaren"},
    {"nr":"3",  "code":"VER", "naam":"Max Verstappen",    "team":"Red Bull Racing"},
    {"nr":"6",  "code":"HAD", "naam":"Isack Hadjar",      "team":"Red Bull Racing"},
    {"nr":"27", "code":"HUL", "naam":"Nico Hülkenberg",   "team":"Audi F1"},
    {"nr":"5",  "code":"BOR", "naam":"Gabriel Bortoleto", "team":"Audi F1"},
    {"nr":"18", "code":"STR", "naam":"Lance Stroll",      "team":"Aston Martin"},
    {"nr":"14", "code":"ALO", "naam":"Fernando Alonso",   "team":"Aston Martin"}
  ]';
  fout text;
begin
  insert into pools (id, name, season, join_code) values (poule, 'Beheertest', 2028, 'LST003');
  insert into pool_members (member_id, pool_id, display_name) values (lid, poule, 'Danny');
  insert into races (id, season, round, name, deadline_quali, deadline_race, drivers, lijst_herkomst) values
    (9801, 2028, 1, 'Bahrain', now() + interval '100 days', now() + interval '101 days',
     (select lijst from lijsten where naam = 'oud'), 'geleend'),
    (9802, 2028, 2, 'Jeddah', now() + interval '107 days', now() + interval '108 days',
     (select lijst from lijsten where naam = 'oud'), 'geleend'),
    (9803, 2028, 3, 'Suzuka', now() + interval '120 days', now() + interval '121 days',
     (select lijst from lijsten where naam = 'oud'), 'openf1');
  insert into answers (pool_id, race_id, member_id, question_id, waarde) values
    (poule, 9801, lid, 'kampioen', '"4"'), (poule, 9801, lid, 'constructeur', '"Kick Sauber"');

  -- Niet als speler.
  perform set_config('request.jwt.claims', '{"sub":"c2000000-0000-0000-0000-000000000002"}', true);
  begin
    perform public.beheer_coureurs_zetten(2028, grid);
    raise exception 'gezakt: een speler kon de coureurlijst zetten';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: een speler kan de coureurlijst niet zetten';

  perform set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-000000000001"}', true);
  foreach fout in array array[
    '[{"nr":"1","code":"NOR","naam":"Lando","team":"McLaren"},{"nr":"1","code":"PIA","naam":"Oscar","team":"McLaren"}]',
    '[{"nr":"1","code":"NO","naam":"Lando","team":"McLaren"},{"nr":"2","code":"PIA","naam":"Oscar","team":"McLaren"}]',
    '[{"nr":"100","code":"NOR","naam":"Lando","team":"McLaren"},{"nr":"2","code":"PIA","naam":"Oscar","team":"McLaren"}]',
    '[{"nr":"1","code":"NOR","naam":"Lando","team":""},{"nr":"2","code":"PIA","naam":"Oscar","team":"McLaren"}]',
    '[{"nr":"1","code":"NOR","naam":"Lando","team":"McLaren"},{"nr":"2","code":"nor","naam":"Oscar","team":"McLaren"}]',
    '[{"nr":"1","code":"NOR","naam":"Lando","team":"McLaren"}]'
  ] loop
    begin
      perform public.beheer_coureurs_zetten(2028, fout::jsonb);
      raise exception 'gezakt: deze lijst werd geaccepteerd: %', fout;
    exception when raise_exception then
      if sqlerrm like 'gezakt%' then raise; end if;
    end;
  end loop;
  raise notice 'ok: dubbel nummer, verkeerde afkorting, nummer 100, geen team, dubbele afkorting en één coureur: geweigerd';

  uit := public.beheer_coureurs_zetten(2028, grid);
  if (uit ->> 'races')::int <> 2 then raise exception 'gezakt: % races gezet, verwacht 2 (niet Suzuka, die is openf1)', uit ->> 'races'; end if;
  select drivers, lijst_herkomst into rij from races where id = 9802;
  if rij.lijst_herkomst <> 'beheer' or jsonb_array_length(rij.drivers) <> 8 then
    raise exception 'gezakt: Jeddah kreeg % (%)', rij.drivers, rij.lijst_herkomst;
  end if;
  if (select lijst_herkomst from races where id = 9803) <> 'openf1' then
    raise exception 'gezakt: Suzuka (openf1) werd overschreven';
  end if;
  raise notice 'ok: de lijst staat bij de twee races met een geleende lijst, niet bij die van OpenF1';
  if not exists (select 1 from jsonb_array_elements(rij.drivers) d
                  where d ->> 'code' = 'NOR' and d ->> 'nr' = '1' and d ->> 'kleur' = '#FF8000') then
    raise exception 'gezakt: Norris in de beheerlijst: %', rij.drivers;
  end if;
  if not exists (select 1 from jsonb_array_elements(rij.drivers) d
                  where d ->> 'team' = 'Audi F1' and d ->> 'kleur' = '#52E252') then
    raise exception 'gezakt: Audi F1 houdt de kleur van Kick Sauber niet: %', rij.drivers;
  end if;
  raise notice 'ok: afkorting in hoofdletters, kleur van het team, en een nieuwe teamnaam houdt de kleur van zijn coureurs';
  w := (select waarde from answers where race_id = 9801 and question_id = 'kampioen');
  if w <> '"1"' then raise exception 'gezakt: kampioen werd %', w; end if;
  w := (select waarde from answers where race_id = 9801 and question_id = 'constructeur');
  if w <> '"Audi F1"' then raise exception 'gezakt: constructeur werd %', w; end if;
  raise notice 'ok: ook via het beheer worden de open antwoorden omgezet (kampioen "1", constructeur "Audi F1")';
  if not exists (select 1 from sync_runs where samenvatting like 'Coureurlijst 2028 ronde 1 Bahrain (beheer)%') then
    raise exception 'gezakt: de omzetting uit het beheer staat niet in sync_runs';
  end if;
  raise notice 'ok: en dat staat in sync_runs';

  -- Later de echte lijst van OpenF1, met Alonso onder 41 en Stroll weg: dezelfde omzetting.
  uit := public.lijst_vervangen(9801, '[
    {"nr":"1","code":"NOR","naam":"Lando NORRIS","team":"McLaren","kleur":"#FF8000"},
    {"nr":"41","code":"ALO","naam":"Fernando ALONSO","team":"Aston Martin","kleur":"#229971"}]', 'openf1');
  if uit -> 'coureurs' <> '{"14":"41"}'::jsonb then raise exception 'gezakt: van beheer naar OpenF1: %', uit; end if;
  if (select lijst_herkomst from races where id = 9802) <> 'beheer' then
    raise exception 'gezakt: Jeddah (beheer) werd door de echte lijst van Bahrein overschreven';
  end if;
  raise notice 'ok: de echte lijst vervangt de lijst uit het beheer met dezelfde omzetting, en laat de andere beheerlijsten staan';

  -- Geen race meer met een geleende lijst.
  update races set lijst_herkomst = 'openf1' where season = 2028;
  begin
    perform public.beheer_coureurs_zetten(2028, grid);
    raise exception 'gezakt: zonder geleende lijsten lukte het toch';
  exception when raise_exception then
    if sqlerrm not like 'Geen race in 2028%' then raise; end if;
  end;
  raise notice 'ok: zonder races met een geleende lijst een duidelijke fout';
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ---- 11: niet via de API ---------------------------------------------------
do $$
declare
  open text;
begin
  select string_agg(format('%s voor %s', f, r), ', ') into open
    from unnest(array['public.lijst_vervangen(bigint, jsonb, text, boolean)',
                      'public.antwoorden_omzetten(bigint, jsonb)',
                      'public.lijst_omzetting(jsonb, jsonb)',
                      'public.omgezette_waarde(jsonb, jsonb)',
                      'public.coureur_sleutel(text)']) f,
         unnest(array['anon', 'authenticated']) r
   where has_function_privilege(r, f, 'execute');
  if open is not null then raise exception 'gezakt: via de API aan te roepen: %', open; end if;
  if not has_function_privilege('authenticated', 'public.beheer_coureurs_zetten(int, jsonb)', 'execute') then
    raise exception 'gezakt: het beheer kan beheer_coureurs_zetten niet aanroepen';
  end if;
  raise notice 'ok: omzetten en vervangen zijn niet via de API aan te roepen, het beheer wel (met de poort)';
end $$;

-- ---- 12: lijsten van voor deze kolom ----------------------------------------
insert into races (id, season, round, name, deadline_quali, deadline_race, drivers) values
  (9901, 2029, 1, 'Bahrain', now() + interval '400 days', now() + interval '401 days', (select lijst from lijsten where naam = 'oud')),
  (9902, 2030, 1, 'Bahrain', now() - interval '1 day', now() - interval '1 hour', (select lijst from lijsten where naam = 'oud'));
update races set race_result = array['4'] where id = 9902;
\ir ../schema.sql
do $$
begin
  if (select lijst_herkomst from races where id = 9901) is distinct from 'geleend' then
    raise exception 'gezakt: een seizoen zonder uitslagen met coureurs kreeg herkomst %',
      (select lijst_herkomst from races where id = 9901);
  end if;
  if (select lijst_herkomst from races where id = 9902) is not null then
    raise exception 'gezakt: een seizoen met uitslagen kreeg herkomst %', (select lijst_herkomst from races where id = 9902);
  end if;
  if (select lijst_herkomst from races where id = 9801) <> 'openf1' then
    raise exception 'gezakt: schema.sql opnieuw draaien veranderde een bestaande herkomst';
  end if;
  raise notice 'ok: lijsten van voor de kolom: geleend als er nog niets gereden is, anders leeg; bestaande herkomst blijft';
end $$;
