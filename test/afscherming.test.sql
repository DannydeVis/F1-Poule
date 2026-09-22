-- Wat een vreemde níét mag zien.
--
-- Dit is de test bij fase 0 uit ROUTEKAART.md. Tot nu toe stonden
-- pools_lezen, pool_members_lezen en answers_lezen alle drie op
-- `using (true)`. De anon key staat met opzet publiek in index.html, dus
-- daarmee kon iedereen élke poule, élke spelersnaam en élk antwoord in de
-- hele database uitlezen — niet alleen die van zijn eigen poule.
--
-- Onder vrienden was dat te verdedigen: wie de code heeft ziet alles, net als
-- in de groepsapp waar die code in staat. Op een publiek domein niet meer,
-- want daar gaat "privé" betekenen wat mensen dénken dat het betekent.
--
-- De moeilijkheid zit hem er niet in om het dicht te zetten, maar om het
-- dicht te zetten zónder het binnenkomen te breken: om een poule te vinden
-- moet je hem kunnen lezen vóórdat je lid bent. Beide kanten staan hier.

\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('dddddddd-0000-0000-0000-000000000001'),   -- Dana, zit in de poule
  ('eeeeeeee-0000-0000-0000-000000000002'),   -- Eef, een vreemde
  ('ffffffff-0000-0000-0000-000000000003');   -- Fred, komt straks binnen

insert into races (id, season, round, name, deadline_quali, deadline_race)
values (902, 2026, 92, 'Testcircuit', now() + interval '2 days', now() + interval '3 days');

insert into pools (id, name, join_code, is_public) values
  ('dddd1111-0000-0000-0000-000000000001', 'Poule van Dana', 'DANA01', false),
  ('eeee2222-0000-0000-0000-000000000002', 'Open poule',     'OPEN01', true);

-- Dana heeft haar seizoen gedeeld: een code en een momentopname. Die twee
-- kolommen horen niet leesbaar te zijn voor haar medespelers.
insert into pool_members (member_id, pool_id, display_name, user_id,
                          profiel_code, profiel) values
  ('dddd3333-0000-0000-0000-000000000001',
   'dddd1111-0000-0000-0000-000000000001', 'Dana',
   'dddddddd-0000-0000-0000-000000000001',
   'geheim01', '{"naam":"Dana","punten":1}'::jsonb);

update pools set owner_member_id = 'dddd3333-0000-0000-0000-000000000001'
where id = 'dddd1111-0000-0000-0000-000000000001';

insert into pool_questions (pool_id, question_id)
values ('dddd1111-0000-0000-0000-000000000001', 'winnaar');

insert into answers (pool_id, race_id, member_id, question_id, waarde) values
  ('dddd1111-0000-0000-0000-000000000001', 902,
   'dddd3333-0000-0000-0000-000000000001', 'winnaar', '"1"');

-- Een gezette joker hangt net zo goed aan één poule, dus die hoort dezelfde
-- muur te hebben als de inzendingen.
update pools set jokers_vanaf = now() - interval '1 hour'
where id = 'dddd1111-0000-0000-0000-000000000001';
insert into jokers (pool_id, race_id, member_id) values
  ('dddd1111-0000-0000-0000-000000000001', 902,
   'dddd3333-0000-0000-0000-000000000001');

do $$
declare n int;
declare uit jsonb;
declare nieuw jsonb;
begin
  -- ============================================================
  --  1. Een vreemde ziet niets
  -- ============================================================
  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"eeeeeeee-0000-0000-0000-000000000002"}', true);

  select count(*) into n from pools where id = 'dddd1111-0000-0000-0000-000000000001';
  if n <> 0 then raise exception 'gezakt: een vreemde ziet de poule van Dana'; end if;
  raise notice 'ok: een vreemde ziet de poule van Dana niet';

  select count(*) into n from pool_members;
  if n <> 0 then raise exception 'gezakt: een vreemde ziet % spelersnamen', n; end if;
  raise notice 'ok: een vreemde ziet geen enkele spelersnaam';

  select count(*) into n from answers;
  if n <> 0 then raise exception 'gezakt: een vreemde ziet % inzendingen', n; end if;
  raise notice 'ok: een vreemde ziet geen enkele inzending';

  select count(*) into n from jokers;
  if n <> 0 then raise exception 'gezakt: een vreemde ziet % jokers', n; end if;
  raise notice 'ok: een vreemde ziet geen enkele joker';

  select count(*) into n from pool_questions;
  if n <> 0 then raise exception 'gezakt: een vreemde ziet de vragenset'; end if;
  raise notice 'ok: een vreemde ziet geen vragensets';

  -- De openbare poule is de uitzondering, en dat is precies de bedoeling:
  -- die staat in de blader-lijst op het beginscherm.
  select count(*) into n from pools where is_public;
  if n <> 1 then raise exception 'gezakt: % openbare poules zichtbaar in plaats van 1', n; end if;
  raise notice 'ok: openbare poules blijven wel vindbaar';

  -- ============================================================
  --  2. Maar binnenkomen met de code werkt nog
  -- ============================================================
  uit := public.poule_ophalen(p_code => 'DANA01');
  if uit is null then raise exception 'gezakt: met de juiste code kom je er niet in'; end if;
  if uit -> 'poule' ->> 'name' <> 'Poule van Dana' then
    raise exception 'gezakt: poule_ophalen gaf de verkeerde poule terug'; end if;
  if jsonb_array_length(uit -> 'leden') <> 1 then
    raise exception 'gezakt: de spelerslijst kwam niet mee'; end if;
  raise notice 'ok: met de code krijg je de poule en de spelerslijst';

  -- Kleine letters horen ook te werken: de app zet de code wel om, een
  -- geplakte link niet altijd.
  if public.poule_ophalen(p_code => 'dana01') is null then
    raise exception 'gezakt: een code in kleine letters werkt niet'; end if;
  raise notice 'ok: hoofdletters in de code maken niet uit';

  if public.poule_ophalen(p_code => 'BESTAATNIET') is not null then
    raise exception 'gezakt: een verzonnen code gaf toch een poule'; end if;
  raise notice 'ok: een verzonnen code levert niets op';

  -- Zonder code en zonder id is er niets op te halen. Dat is het hele punt:
  -- de functie kan niet als sleepnet gebruikt worden.
  if public.poule_ophalen() is not null then
    raise exception 'gezakt: poule_ophalen() zonder argumenten gaf een poule'; end if;
  raise notice 'ok: zonder code of id geeft poule_ophalen niets';

  -- ============================================================
  --  3. Meedoen, en daarna zie je het wel
  -- ============================================================
  perform set_config('request.jwt.claims',
    '{"sub":"ffffffff-0000-0000-0000-000000000003"}', true);

  nieuw := public.poule_meedoen('dddd1111-0000-0000-0000-000000000001', 'Fred');
  if nieuw ->> 'member_id' is null then raise exception 'gezakt: meedoen leverde geen speler op'; end if;
  raise notice 'ok: Fred kon zich inschrijven';

  select count(*) into n from pools where id = 'dddd1111-0000-0000-0000-000000000001';
  if n <> 1 then raise exception 'gezakt: Fred ziet zijn eigen poule niet'; end if;
  select count(*) into n from answers;
  if n <> 1 then raise exception 'gezakt: Fred ziet de inzendingen van zijn poule niet'; end if;
  -- Wel de jokers van zijn medespelers: zonder die rijen klopt de stand niet,
  -- want een joker verdubbelt wat iemand dat weekend scoorde.
  select count(*) into n from jokers;
  if n <> 1 then raise exception 'gezakt: Fred ziet de jokers van zijn poule niet'; end if;

  -- Maar niet alles van een medespeler. profiel_code is de link naar iemands
  -- publieke pagina, en die deel je zelf of niet. RLS werkt per rij en kan dat
  -- onderscheid niet maken; een grant per kolom wel. (Dana heeft er bovenaan
  -- dit bestand al een gekregen -- Fred kan die niet zelf zetten, en dat is
  -- precies goed.)
  begin
    perform profiel_code from pool_members
     where member_id = 'dddd3333-0000-0000-0000-000000000001';
    raise exception 'gezakt: Fred kon de profielcode van Dana lezen';
  exception when insufficient_privilege then
    raise notice 'ok: de profielcode van een medespeler is niet te lezen';
  end;
  begin
    perform profiel from pool_members;
    raise exception 'gezakt: de momentopname van een medespeler was te lezen';
  exception when insufficient_privilege then
    raise notice 'ok: en de momentopname ook niet';
  end;
  -- De gewone kolommen wel, anders zou de spelerslijst niet meer werken.
  select count(*) into n from pool_members
   where pool_id = 'dddd1111-0000-0000-0000-000000000001' and display_name is not null;
  if n <> 2 then raise exception 'gezakt: de namen van de medespelers zijn ook dicht'; end if;
  raise notice 'ok: naam, id en account blijven gewoon leesbaar';

  -- En de publieke pagina is wél op te vragen, maar alleen op zijn code en
  -- alleen wat erin gepubliceerd is.
  if public.publiek_profiel('geheim01') is null then
    raise exception 'gezakt: een gepubliceerd profiel was niet op te halen';
  end if;
  if public.publiek_profiel('bestaatniet') is not null then
    raise exception 'gezakt: een verzonnen code leverde toch een profiel op';
  end if;
  if public.publiek_profiel(null) is not null then
    raise exception 'gezakt: zonder code kwam er toch een profiel uit';
  end if;
  raise notice 'ok: een publiek profiel komt alleen op zijn eigen code tevoorschijn';
  select count(*) into n from pool_members
   where pool_id = 'dddd1111-0000-0000-0000-000000000001';
  if n <> 2 then raise exception 'gezakt: Fred ziet % medespelers in plaats van 2', n; end if;
  raise notice 'ok: als lid zie je de poule, de medespelers en de inzendingen';

  -- ============================================================
  --  4. Een poule aanmaken levert een compleet geheel op
  -- ============================================================
  uit := public.poule_aanmaken('Verse poule', 'met de buren', 'Gerda',
                               array['quali_top10','race_top10']);
  if uit -> 'poule' ->> 'id' is null then raise exception 'gezakt: aanmaken gaf geen poule'; end if;
  -- Dit is waarom het één functie is: eerst de poule en dan pas de speler zou
  -- betekenen dat de aanmaker zijn eigen verse poule niet terug kan lezen.
  if uit -> 'poule' ->> 'owner_member_id' <> (uit -> 'ik' ->> 'member_id') then
    raise exception 'gezakt: de aanmaker is niet meteen de poulebaas'; end if;
  raise notice 'ok: de aanmaker is meteen poulebaas';

  select count(*) into n from pool_questions
   where pool_id = (uit -> 'poule' ->> 'id')::uuid;
  if n <> 2 then raise exception 'gezakt: % vragen aangezet in plaats van 2', n; end if;
  raise notice 'ok: de vragenset staat er meteen bij';

  select count(*) into n from pools where id = (uit -> 'poule' ->> 'id')::uuid;
  if n <> 1 then raise exception 'gezakt: de aanmaker kan zijn eigen poule niet lezen'; end if;
  raise notice 'ok: en de aanmaker kan hem gewoon lezen';

  -- Een poule zonder naam hoort niet te ontstaan.
  begin
    perform public.poule_aanmaken('   ', null, 'Gerda', array['winnaar']);
    raise exception 'gezakt: een poule zonder naam werd toch aangemaakt';
  exception when others then
    if sqlerrm like 'gezakt:%' then raise; end if;
  end;
  raise notice 'ok: een poule zonder naam wordt geweigerd';

  -- ============================================================
  --  5. En de vreemde ziet nog steeds niets van Dana
  -- ============================================================
  perform set_config('request.jwt.claims',
    '{"sub":"eeeeeeee-0000-0000-0000-000000000002"}', true);
  select count(*) into n from answers;
  if n <> 0 then raise exception 'gezakt: er lekt alsnog % inzending weg', n; end if;
  select count(*) into n from jokers;
  if n <> 0 then raise exception 'gezakt: er lekt alsnog % joker weg', n; end if;
  raise notice 'ok: na alles hierboven ziet de vreemde nog steeds niets';

  reset role;
end $$;
