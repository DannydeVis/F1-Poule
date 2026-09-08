-- "Verwijder mijn account", en het verschil tussen de twee smaken.
--
-- Sinds er mailadressen aan accounts kunnen hangen slaat deze app een
-- persoonsgegeven op, en dan hoort er een knop te zijn om het weg te halen.
-- Maar "alles weg" is in een poule niet vanzelf de vriendelijke keuze: je
-- voorspellingen zitten in de stand van je medespelers, en die klopt daarna
-- niet meer. Vandaar twee smaken, en die moeten allebei precies doen wat het
-- scherm belooft.
--
-- Wat hier vastligt:
--
--   1. Alleen het account weg: de spelers blijven staan, maar hangen aan
--      niemand meer. De antwoorden blijven, dus de stand blijft kloppen.
--   2. Alles weg: de spelers gaan mee via `on delete cascade`, en daarmee de
--      antwoorden. Van andere spelers blijft alles staan.
--   3. Een poule waarvan je de baas was raakt zijn eigenaar kwijt in plaats
--      van een verwijzing naar een speler die niet meer bestaat. Er staat
--      geen foreign key op owner_member_id, dus zonder die regel wordt de
--      poule onbeheerbaar.
--   4. Je kunt alleen jezelf verwijderen. Er is geen parameter waarin je
--      iemand anders kunt aanwijzen, en zonder sessie gebeurt er niets.

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'anna@voorbeeld.nl'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bram@voorbeeld.nl');

insert into races (id, season, round, name, deadline_quali, deadline_race)
values (902, 2026, 92, 'Testcircuit', now() + interval '2 days', now() + interval '3 days');

insert into pools (id, name, join_code) values
  ('11111111-0000-0000-0000-000000000001', 'Poule van Anna', 'ANNA01');

insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa1111-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001', 'Anna',
   'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbb2222-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000001', 'Bram',
   'bbbbbbbb-0000-0000-0000-000000000002');

update pools set owner_member_id = 'aaaa1111-0000-0000-0000-000000000001'
where id = '11111111-0000-0000-0000-000000000001';

insert into answers (pool_id, race_id, member_id, question_id, waarde) values
  ('11111111-0000-0000-0000-000000000001', 902,
   'aaaa1111-0000-0000-0000-000000000001', 'winnaar', '"1"'),
  ('11111111-0000-0000-0000-000000000001', 902,
   'bbbb2222-0000-0000-0000-000000000002', 'winnaar', '"44"');

do $$
declare weg int;
declare aantal int;
begin
  -- ---- 4. zonder sessie gebeurt er niets --------------------------------
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.verwijder_mijn_account(false);
    raise exception 'gezakt: verwijderen lukte zonder ingelogde gebruiker';
  exception when others then
    if sqlerrm like 'gezakt:%' then raise; end if;
  end;
  raise notice 'ok: zonder ingelogde gebruiker gebeurt er niets';

  -- ---- 1. alleen het account: de poule blijft heel ----------------------
  perform set_config('request.jwt.claims',
    '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}', true);
  weg := public.verwijder_mijn_account(false);

  if weg <> 0 then raise exception 'gezakt: er gingen spelers mee terwijl dat niet gevraagd was'; end if;
  raise notice 'ok: er gaat geen speler mee als je daar niet om vraagt';

  select count(*) into aantal from auth.users
  where id = 'bbbbbbbb-0000-0000-0000-000000000002';
  if aantal <> 0 then raise exception 'gezakt: het account van Bram bestaat nog'; end if;
  raise notice 'ok: het account is weg, en daarmee het mailadres';

  select count(*) into aantal from pool_members
  where member_id = 'bbbb2222-0000-0000-0000-000000000002';
  if aantal <> 1 then raise exception 'gezakt: de speler van Bram is meegegaan'; end if;
  raise notice 'ok: de speler blijft in de poule staan';

  select count(*) into aantal from pool_members
  where member_id = 'bbbb2222-0000-0000-0000-000000000002' and user_id is null;
  if aantal <> 1 then raise exception 'gezakt: de speler hangt nog aan een account'; end if;
  raise notice 'ok: maar hangt aan niemand meer, dus iedereen kan hem weer claimen';

  select count(*) into aantal from answers
  where member_id = 'bbbb2222-0000-0000-0000-000000000002';
  if aantal <> 1 then raise exception 'gezakt: de voorspellingen van Bram zijn weg'; end if;
  raise notice 'ok: de voorspellingen blijven, dus de stand van de anderen klopt nog';

  -- ---- 2 en 3. alles weg, inclusief het baasschap -----------------------
  perform set_config('request.jwt.claims',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
  weg := public.verwijder_mijn_account(true);

  if weg <> 1 then raise exception 'gezakt: het aantal meegegane spelers klopt niet (%)', weg; end if;
  raise notice 'ok: het aantal meegegane spelers wordt teruggegeven';

  select count(*) into aantal from pool_members
  where member_id = 'aaaa1111-0000-0000-0000-000000000001';
  if aantal <> 0 then raise exception 'gezakt: de speler van Anna staat er nog'; end if;
  raise notice 'ok: bij "alles" gaat de speler wel mee';

  select count(*) into aantal from answers
  where member_id = 'aaaa1111-0000-0000-0000-000000000001';
  if aantal <> 0 then raise exception 'gezakt: de antwoorden van Anna staan er nog'; end if;
  raise notice 'ok: en zijn antwoorden ook, via de cascade';

  select count(*) into aantal from answers
  where member_id = 'bbbb2222-0000-0000-0000-000000000002';
  if aantal <> 1 then raise exception 'gezakt: het antwoord van een ánder is meegegaan'; end if;
  raise notice 'ok: van andere spelers blijft alles staan';

  select count(*) into aantal from pools
  where id = '11111111-0000-0000-0000-000000000001' and owner_member_id is null;
  if aantal <> 1 then raise exception 'gezakt: de poule wijst nog naar een speler die niet meer bestaat'; end if;
  raise notice 'ok: de poule raakt zijn eigenaar kwijt in plaats van een dood verwijzing';

  -- En daarmee is hij niet onbeheerbaar geworden: een poule zonder eigenaar
  -- mag door elk lid beheerd worden, net als de poules van vroeger.
  select count(*) into aantal from pools where id = '11111111-0000-0000-0000-000000000001';
  if aantal <> 1 then raise exception 'gezakt: de poule zelf is verdwenen'; end if;
  raise notice 'ok: de poule zelf blijft gewoon bestaan';
end $$;
