-- Geheim tot de deadline.
--
-- Een voorspelling is van jou tot de sessie waar hij bij hoort dicht is. De
-- app liet de top 10 van je medespelers al pas na de deadline zien, maar de
-- database gaf ze eerder: elk lid kon ze met de anon key uit index.html
-- opvragen, rechtstreeks uit answers of via poule_ophalen(), en ze overnemen
-- terwijl zijn eigen lijst nog openstond. Hetzelfde voor een joker: waar een
-- ander hem neerlegt, zag je voordat dat weekend begon.
--
-- Wat hier vastligt:
--   1. per sessie: een antwoord is voor je medespelers te lezen zodra de
--      deadline van zijn eigen sessie voorbij is, en geen seconde eerder;
--      de kwalificatie, de sprint, de race en de seizoenslaag elk apart;
--   2. je eigen antwoorden zie je altijd, en ook die van de speler zonder
--      account die jouw toestel inschreef;
--   3. een joker pas als zijn weekend begonnen is, je eigen altijd;
--   4. poule_ophalen() houdt zich aan dezelfde regels, en geeft van de rest
--      alleen dát iemand iets inleverde, zonder waarde;
--   5. wie geen lid is, leest rechtstreeks niets; met de code kijkt hij mee,
--      en ziet hij net als een lid alleen wat dicht is;
--   6. schrijven en lezen gaan op hetzelfde moment om: op de deadline zelf
--      mag je nog opslaan en ziet een ander het nog niet, een tel later
--      andersom. Beide komen uit sessie_deadline().

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'anna@voorbeeld.nl'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bram@voorbeeld.nl'),
  ('cccccccc-0000-0000-0000-000000000003', 'chris@voorbeeld.nl');

-- Eerst alles in de toekomst, zodat de triggers het invullen en de jokers
-- toelaten. Daarna schuiven de deadlines naar waar ze voor de test horen.
insert into races (id, season, round, name, deadline_sprint, deadline_quali, deadline_race) values
  (801, 2031, 1, 'Nog helemaal open', null,                        now() + interval '2 days', now() + interval '3 days'),
  (802, 2031, 2, 'Halverwege',        null,                        now() + interval '4 days', now() + interval '5 days'),
  (803, 2031, 3, 'Sprintweekend',     now() + interval '6 days',   now() + interval '7 days', now() + interval '8 days'),
  (804, 2031, 4, 'Gereden',           null,                        now() + interval '9 days', now() + interval '10 days'),
  (805, 2031, 5, 'Op het randje',     null,                        now() + interval '11 days', now() + interval '12 days'),
  (806, 2031, 6, 'Zonder deadlines',  null,                        null,                      null);

insert into pools (id, name, join_code, jokers_vanaf) values
  ('11111111-0000-0000-0000-000000000001', 'Poule van Anna', 'ANNA01', now() - interval '1 day');

insert into pool_members (member_id, pool_id, display_name, user_id, aangemaakt_door) values
  ('aaaa1111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Anna',
   'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbb2222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Bram',
   'bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002'),
  -- Op het toestel van Bram ingeschreven, terwijl Bram daar al speelde.
  ('eeee5555-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'Gedeeld',
   null, 'bbbbbbbb-0000-0000-0000-000000000002');

insert into answers (pool_id, race_id, member_id, question_id, waarde) values
  -- 801: alles nog open
  -- De waarden die geheim moeten blijven zijn 70 tot en met 95: die komen in
  -- geen enkel antwoord voor dat wel te zien mag zijn.
  ('11111111-0000-0000-0000-000000000001', 801, 'aaaa1111-0000-0000-0000-000000000001', 'quali_top10', '["70","71","72","73","74","75","76","77","78","79"]'),
  ('11111111-0000-0000-0000-000000000001', 801, 'aaaa1111-0000-0000-0000-000000000001', 'winnaar',     '"91"'),
  ('11111111-0000-0000-0000-000000000001', 801, 'bbbb2222-0000-0000-0000-000000000002', 'winnaar',     '"4"'),
  ('11111111-0000-0000-0000-000000000001', 801, 'eeee5555-0000-0000-0000-000000000005', 'winnaar',     '"16"'),
  -- 802: de kwalificatie dicht, de race open
  ('11111111-0000-0000-0000-000000000001', 802, 'aaaa1111-0000-0000-0000-000000000001', 'pole',        '"81"'),
  ('11111111-0000-0000-0000-000000000001', 802, 'aaaa1111-0000-0000-0000-000000000001', 'winnaar',     '"92"'),
  -- 803: de sprint dicht, de kwalificatie open
  ('11111111-0000-0000-0000-000000000001', 803, 'aaaa1111-0000-0000-0000-000000000001', 'sprint_top10','["1","4","16","81","63","12","44","55","10","23"]'),
  ('11111111-0000-0000-0000-000000000001', 803, 'aaaa1111-0000-0000-0000-000000000001', 'pole',        '"93"'),
  -- 804: alles dicht; en de seizoenslaag op ronde 1 (nog niet begonnen)
  ('11111111-0000-0000-0000-000000000001', 804, 'aaaa1111-0000-0000-0000-000000000001', 'winnaar',     '"44"'),
  ('11111111-0000-0000-0000-000000000001', 801, 'aaaa1111-0000-0000-0000-000000000001', 'kampioen',    '"94"'),
  -- 805: de kwalificatie precies op de deadline
  ('11111111-0000-0000-0000-000000000001', 805, 'aaaa1111-0000-0000-0000-000000000001', 'pole',        '"95"');

insert into jokers (pool_id, race_id, member_id) values
  ('11111111-0000-0000-0000-000000000001', 801, 'aaaa1111-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000001', 802, 'aaaa1111-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000001', 803, 'aaaa1111-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000001', 801, 'bbbb2222-0000-0000-0000-000000000002');

-- En nu de klok van elk weekend waar hij hoort. now() staat in een
-- transactie stil, dus "precies op de deadline" is hier echt precies.
update races set deadline_quali = now() - interval '1 hour' where id = 802;
update races set deadline_sprint = now() - interval '1 hour' where id = 803;
update races set deadline_quali = now() - interval '3 days',
                 deadline_race  = now() - interval '2 days' where id = 804;

-- Tel wat een gebruiker ziet. null is een bezoeker zonder account (anon).
-- De rol en de claims gaan na afloop terug, doordat de uitkomst als fout naar
-- buiten komt en de subtransactie dan terugrolt.
create or replace function pg_temp.tel(wie text, stmt text) returns int
language plpgsql as $$
declare n int;
begin
  begin
    if wie is null then
      execute 'set local role anon';
      perform set_config('request.jwt.claims', '', true);
    else
      execute 'set local role authenticated';
      perform set_config('request.jwt.claims', format('{"sub":"%s"}', wie), true);
    end if;
    execute stmt into n;
    raise exception 'uitkomst:%', coalesce(n, -1);
  exception when raise_exception then
    if sqlerrm like 'uitkomst:%' then return substr(sqlerrm, 10)::int; end if;
    raise;
  end;
end $$;

-- Hetzelfde voor een blok jsonb uit poule_ophalen().
create or replace function pg_temp.haal(wie text, stmt text) returns jsonb
language plpgsql as $$
declare j jsonb;
begin
  begin
    if wie is null then
      execute 'set local role anon';
      perform set_config('request.jwt.claims', '', true);
    else
      execute 'set local role authenticated';
      perform set_config('request.jwt.claims', format('{"sub":"%s"}', wie), true);
    end if;
    execute stmt into j;
    raise exception 'uitkomst:%', coalesce(j::text, 'null');
  exception when raise_exception then
    if sqlerrm like 'uitkomst:%' then return substr(sqlerrm, 10)::jsonb; end if;
    raise;
  end;
end $$;

-- Een lijst antwoorden of jokers als gesorteerde tekst: race|speler|vraag,
-- met de eerste vier tekens van de speler. Leest in een foutmelding beter
-- dan jsonb.
create or replace function pg_temp.sleutels(lijst jsonb) returns text[]
language sql as $$
  select coalesce(array_agg(x order by x), '{}') from (
    select concat_ws('|', a->>'race_id', left(a->>'member_id', 4), a->>'question_id') as x
    from jsonb_array_elements(lijst) a) t;
$$;

create or replace function pg_temp.moet(wat text, ok boolean, extra text default '') returns void
language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'gezakt: % %', wat, extra; end if;
  raise notice 'ok: %', wat;
end $$;

-- ============================================================
--  1 en 2. Rechtstreeks uit answers, als Bram
-- ============================================================
do $$
declare
  bram  constant text := 'bbbbbbbb-0000-0000-0000-000000000002';
  anna  constant text := 'aaaa1111-0000-0000-0000-000000000001';
  zie   text;
begin
  zie := format('select count(*)::int from answers where member_id = %L and race_id = %%s and question_id = %%L', anna);

  perform pg_temp.moet('Bram ziet de kwalificatie van Anna niet zolang die openstaat',
    pg_temp.tel(bram, format(zie, 801, 'quali_top10')) = 0);
  perform pg_temp.moet('en haar winnaar ook niet',
    pg_temp.tel(bram, format(zie, 801, 'winnaar')) = 0);
  perform pg_temp.moet('zijn eigen winnaar ziet Bram wel',
    pg_temp.tel(bram, $q$select count(*)::int from answers
      where member_id = 'bbbb2222-0000-0000-0000-000000000002' and race_id = 801$q$) = 1);
  perform pg_temp.moet('en die van de speler die zijn toestel inschreef ook',
    pg_temp.tel(bram, $q$select count(*)::int from answers
      where member_id = 'eeee5555-0000-0000-0000-000000000005' and race_id = 801$q$) = 1);

  perform pg_temp.moet('kwalificatie dicht, race open: de pole van Anna is te zien',
    pg_temp.tel(bram, format(zie, 802, 'pole')) = 1);
  perform pg_temp.moet('maar haar winnaar nog niet',
    pg_temp.tel(bram, format(zie, 802, 'winnaar')) = 0);

  perform pg_temp.moet('sprint dicht: de sprint-top 10 van Anna is te zien',
    pg_temp.tel(bram, format(zie, 803, 'sprint_top10')) = 1);
  perform pg_temp.moet('maar haar pole nog niet: de kwalificatie komt na de sprint',
    pg_temp.tel(bram, format(zie, 803, 'pole')) = 0);

  perform pg_temp.moet('een gereden weekend is helemaal te zien',
    pg_temp.tel(bram, format(zie, 804, 'winnaar')) = 1);

  perform pg_temp.moet('de seizoenslaag blijft dicht tot ronde 1 begint',
    pg_temp.tel(bram, format(zie, 801, 'kampioen')) = 0);
end $$;

-- De seizoenslaag gaat open met de eerste sessie van ronde 1, niet pas met de
-- race. De kwalificatie van ronde 1 even naar het verleden, en terug.
do $$
begin
  update races set deadline_quali = now() - interval '1 minute' where id = 801;
  perform pg_temp.moet('zodra de kwalificatie van ronde 1 begint, is de seizoenslaag te zien',
    pg_temp.tel('bbbbbbbb-0000-0000-0000-000000000002', $q$select count(*)::int from answers
      where member_id = 'aaaa1111-0000-0000-0000-000000000001' and question_id = 'kampioen'$q$) = 1);
  perform pg_temp.moet('en de winnaar van ronde 1 nog niet: die hangt aan de race',
    pg_temp.tel('bbbbbbbb-0000-0000-0000-000000000002', $q$select count(*)::int from answers
      where member_id = 'aaaa1111-0000-0000-0000-000000000001' and race_id = 801
        and question_id = 'winnaar'$q$) = 0);
  update races set deadline_quali = now() + interval '2 days' where id = 801;
end $$;

-- ============================================================
--  3. Jokers, rechtstreeks
-- ============================================================
do $$
declare
  bram constant text := 'bbbbbbbb-0000-0000-0000-000000000002';
  anna constant text := 'aaaaaaaa-0000-0000-0000-000000000001';
begin
  perform pg_temp.moet('Bram ziet niet waar Anna haar joker legt zolang dat weekend niet begonnen is',
    pg_temp.tel(bram, $q$select count(*)::int from jokers
      where member_id = 'aaaa1111-0000-0000-0000-000000000001' and race_id = 801$q$) = 0);
  perform pg_temp.moet('wel zodra het begonnen is, ook als alleen de kwalificatie dicht is',
    pg_temp.tel(bram, $q$select count(*)::int from jokers
      where member_id = 'aaaa1111-0000-0000-0000-000000000001' and race_id = 802$q$) = 1);
  perform pg_temp.moet('en op een sprintweekend al na de sprint',
    pg_temp.tel(bram, $q$select count(*)::int from jokers
      where member_id = 'aaaa1111-0000-0000-0000-000000000001' and race_id = 803$q$) = 1);
  perform pg_temp.moet('zijn eigen joker ziet Bram altijd',
    pg_temp.tel(bram, $q$select count(*)::int from jokers
      where member_id = 'bbbb2222-0000-0000-0000-000000000002'$q$) = 1);
  perform pg_temp.moet('en Anna ziet die van Bram niet',
    pg_temp.tel(anna, $q$select count(*)::int from jokers
      where member_id = 'bbbb2222-0000-0000-0000-000000000002'$q$) = 0);
end $$;

-- ============================================================
--  5. Wie geen lid is, rechtstreeks
-- ============================================================
do $$
begin
  perform pg_temp.moet('Chris, geen lid, leest rechtstreeks geen enkel antwoord, ook geen dicht',
    pg_temp.tel('cccccccc-0000-0000-0000-000000000003', 'select count(*)::int from answers') = 0);
  perform pg_temp.moet('en geen enkele joker',
    pg_temp.tel('cccccccc-0000-0000-0000-000000000003', 'select count(*)::int from jokers') = 0);
  perform pg_temp.moet('een bezoeker zonder account ook niet',
    pg_temp.tel(null, 'select count(*)::int from answers')
      + pg_temp.tel(null, 'select count(*)::int from jokers') = 0);
end $$;

-- ============================================================
--  4. poule_ophalen()
-- ============================================================
do $$
declare
  j        jsonb;
  ophalen  constant text := $q$select public.poule_ophalen(p_id => '11111111-0000-0000-0000-000000000001')$q$;
  -- Een antwoord als tekst: race, speler, vraag.
  sleutels text[];
begin
  j := pg_temp.haal('bbbbbbbb-0000-0000-0000-000000000002', ophalen);

  sleutels := pg_temp.sleutels(j->'antwoorden');
  perform pg_temp.moet('poule_ophalen geeft Bram precies wat dicht is en wat van hemzelf is',
    sleutels = array['801|bbbb|winnaar', '801|eeee|winnaar', '802|aaaa|pole',
                     '803|aaaa|sprint_top10', '804|aaaa|winnaar'],
    array_to_string(sleutels, ', '));

  sleutels := pg_temp.sleutels(j->'ingeleverd');
  perform pg_temp.moet('en van de rest alleen dát het er is',
    sleutels = array['801|aaaa|kampioen', '801|aaaa|quali_top10', '801|aaaa|winnaar',
                     '802|aaaa|winnaar', '803|aaaa|pole', '805|aaaa|pole'],
    array_to_string(sleutels, ', '));
  perform pg_temp.moet('zonder waarde, en zonder tijdstip',
    not exists (select 1 from jsonb_array_elements(j->'ingeleverd') a
                where a ? 'waarde' or a ? 'updated_at' or a ? 'pool_id'));
  perform pg_temp.moet('de waarde van een open antwoord staat nergens in wat Bram terugkrijgt',
    j::text !~ '"(7[0-9]|9[1-5])"', substring(j::text from '"(?:7[0-9]|9[1-5])"'));

  sleutels := pg_temp.sleutels(j->'jokers');
  perform pg_temp.moet('de jokers: van begonnen weekenden en die van Bram zelf',
    sleutels = array['801|bbbb', '802|aaaa', '803|aaaa'], array_to_string(sleutels, ', '));

  -- Chris is geen lid maar heeft de code. Dan kijkt hij mee: hij ziet wat
  -- dicht is, en wat openstaat alleen als "ingeleverd". Zo kan de app hem de
  -- stand laten zien ("je kunt hier meekijken").
  j := pg_temp.haal('cccccccc-0000-0000-0000-000000000003',
    $q$select public.poule_ophalen(p_code => 'ANNA01')$q$);
  sleutels := pg_temp.sleutels(j->'antwoorden');
  perform pg_temp.moet('met alleen de code: alleen wat dicht is',
    sleutels = array['802|aaaa|pole', '803|aaaa|sprint_top10', '804|aaaa|winnaar'],
    array_to_string(sleutels, ', '));
  perform pg_temp.moet('en van de rest alleen dát het er is, ook van Bram en het gedeelde toestel',
    jsonb_array_length(j->'ingeleverd') = 8, (j->'ingeleverd')::text);
  perform pg_temp.moet('zonder één open waarde',
    j::text !~ '"(7[0-9]|9[1-5])"', substring(j::text from '"(?:7[0-9]|9[1-5])"'));
  sleutels := pg_temp.sleutels(j->'jokers');
  perform pg_temp.moet('en alleen de jokers van begonnen weekenden',
    sleutels = array['802|aaaa', '803|aaaa'], array_to_string(sleutels, ', '));

  -- Zonder account: hetzelfde als Chris.
  j := pg_temp.haal(null, $q$select public.poule_ophalen(p_code => 'ANNA01')$q$);
  perform pg_temp.moet('een bezoeker zonder account krijgt ook alleen wat dicht is',
    jsonb_array_length(j->'antwoorden') = 3 and jsonb_array_length(j->'jokers') = 2
    and j::text !~ '"(7[0-9]|9[1-5])"');
end $$;

-- ============================================================
--  6. Schrijven en lezen op hetzelfde moment
-- ============================================================
-- Race 805: de kwalificatie precies op now(). Dan mag Anna nog opslaan, en
-- ziet Bram het nog niet. Een microseconde later andersom. Binnen één blok:
-- now() is de tijd van de transactie, en een losse update ervoor zou een
-- eigen, vroegere now() hebben.
do $$
begin
  update races set deadline_quali = now() where id = 805;
  perform pg_temp.moet('op de deadline zelf ziet Bram de pole van Anna nog niet',
    pg_temp.tel('bbbbbbbb-0000-0000-0000-000000000002', $q$select count(*)::int from answers
      where race_id = 805 and question_id = 'pole'$q$) = 0);

  -- Anna wijzigt hem; dat mag nog. Als zijzelf, met RLS en trigger erbij.
  perform pg_temp.moet('en Anna mag hem op dat moment nog wijzigen',
    pg_temp.tel('aaaaaaaa-0000-0000-0000-000000000001', $q$with w as (
      update answers set waarde = '"10"' where race_id = 805 and question_id = 'pole'
        and member_id = 'aaaa1111-0000-0000-0000-000000000001' returning 1)
      select count(*)::int from w$q$) = 1);

  update races set deadline_quali = now() - interval '1 microsecond' where id = 805;
  perform pg_temp.moet('een microseconde later ziet Bram hem wel',
    pg_temp.tel('bbbbbbbb-0000-0000-0000-000000000002', $q$select count(*)::int from answers
      where race_id = 805 and question_id = 'pole'$q$) = 1);
  begin
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
    update answers set waarde = '"44"' where race_id = 805 and question_id = 'pole'
      and member_id = 'aaaa1111-0000-0000-0000-000000000001';
    raise exception 'gezakt: Anna kon haar pole wijzigen terwijl Bram hem al kon lezen';
  exception when raise_exception then
    if sqlerrm like 'gezakt:%' then raise; end if;
  end;
  raise notice 'ok: en kan Anna hem niet meer wijzigen';
end $$;

-- ============================================================
--  De functies zelf, aan de randen
-- ============================================================
do $$
begin
  perform pg_temp.moet('een onbekende vraag is dicht',
    not public.antwoord_open(804, 'bestaat_niet'));
  perform pg_temp.moet('een onbekende race ook',
    not public.antwoord_open(999999, 'winnaar') and not public.joker_open(999999));
  perform pg_temp.moet('en een race zonder deadlines ook',
    not public.antwoord_open(806, 'winnaar') and not public.antwoord_open(806, 'kampioen')
    and not public.joker_open(806));
  perform pg_temp.moet('sessie_deadline kent elke sessie apart',
    public.sessie_deadline(803, 'sprint')  = (select deadline_sprint from races where id = 803)
    and public.sessie_deadline(803, 'quali')   = (select deadline_quali from races where id = 803)
    and public.sessie_deadline(803, 'race')    = (select deadline_race from races where id = 803)
    and public.sessie_deadline(803, 'seizoen') = (select deadline_sprint from races where id = 803)
    and public.sessie_deadline(803, 'weekend') = (select deadline_sprint from races where id = 803));
end $$;

-- En de controletabel meldt dat de regel er staat.
do $$
declare uitkomst text;
begin
  select c.uitkomst into uitkomst from public.poule_controle c
   where c.controle = 'voorspellingen geheim tot de deadline';
  perform pg_temp.moet('de controletabel zegt ok over het geheim tot de deadline', uitkomst = 'ok',
    coalesce(uitkomst, '(regel ontbreekt)'));
end $$;
