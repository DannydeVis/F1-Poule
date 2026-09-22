-- Jokers: vijf per seizoen, één per weekend, en alleen zolang dat weekend
-- nog helemaal openstaat. Draai dit op een verse database na schema.sql.
--
-- Waarom dit in de database staat en niet alleen in de app: een joker die je
-- achteraf mag verzetten is geen keuze maar een knop om de uitslag mee te
-- herschrijven. Dat is precies dezelfde afweging als bij de deadline op
-- answers, en dus staat het op dezelfde plek.

\set ON_ERROR_STOP on

do $$
declare
  poule uuid := '77777777-7777-7777-7777-777777777777';
  lid   uuid;
  ander uuid;
  open1 bigint; open2 bigint; open3 bigint; open4 bigint; open5 bigint; open6 bigint;
  gereden bigint;
  oud     bigint;
  n     int;
begin
  insert into pools (id, name, season, join_code, jokers_vanaf)
  values (poule, 'Jokertest', 2026, 'JKR001', now() - interval '1 hour');
  insert into pool_members (pool_id, display_name) values (poule, 'Danny')
  returning member_id into lid;
  insert into pool_members (pool_id, display_name) values (poule, 'Michael')
  returning member_id into ander;

  -- Zes weekenden die nog moeten komen, één die al gereden is, en één die al
  -- liep toen de jokers aangezet werden.
  insert into races (id, season, round, name, deadline_quali, deadline_race) values
    (8101, 2026, 1, 'Open 1', now() + interval '1 day',  now() + interval '2 days'),
    (8102, 2026, 2, 'Open 2', now() + interval '8 days', now() + interval '9 days'),
    (8103, 2026, 3, 'Open 3', now() + interval '15 days', now() + interval '16 days'),
    (8104, 2026, 4, 'Open 4', now() + interval '22 days', now() + interval '23 days'),
    (8105, 2026, 5, 'Open 5', now() + interval '29 days', now() + interval '30 days'),
    (8106, 2026, 6, 'Open 6', now() + interval '36 days', now() + interval '37 days'),
    (8107, 2026, 7, 'Gereden', now() - interval '9 days', now() - interval '8 days'),
    (8108, 2026, 8, 'Net te laat', now() - interval '30 minutes', now() + interval '1 day');
  open1 := 8101; open2 := 8102; open3 := 8103;
  open4 := 8104; open5 := 8105; open6 := 8106;
  gereden := 8107; oud := 8108;

  -- 1. een joker op een weekend dat nog moet komen mag gewoon
  insert into jokers (pool_id, race_id, member_id) values (poule, open1, lid);
  select count(*) into n from jokers where pool_id = poule;
  if n <> 1 then raise exception 'gezakt: de joker is niet geland'; end if;
  raise notice 'ok: een joker op een weekend dat nog moet komen';

  -- 2. weghalen mag ook, zolang het weekend nog niet begonnen is
  delete from jokers where pool_id = poule and race_id = open1 and member_id = lid;
  select count(*) into n from jokers where pool_id = poule;
  if n <> 0 then raise exception 'gezakt: de joker ging er niet meer af'; end if;
  insert into jokers (pool_id, race_id, member_id) values (poule, open1, lid);
  raise notice 'ok: van gedachten veranderen kan, zolang het weekend nog open is';

  -- 3. een weekend dat al gereden is: allebei de kanten dicht
  begin
    insert into jokers (pool_id, race_id, member_id) values (poule, gereden, lid);
    raise exception 'gezakt: een joker op een gereden weekend werd aangenomen';
  exception when others then
    if sqlerrm not like '%al begonnen%' then raise; end if;
    raise notice 'ok: een joker op een gereden weekend wordt geweigerd';
  end;

  -- En het weekend dat al liep toen de jokers aangezet werden. Het is nog
  -- niet gereden -- de race sluit pas morgen -- maar de kwalificatie is
  -- begonnen, dus het weekend ligt vast.
  begin
    insert into jokers (pool_id, race_id, member_id) values (poule, oud, lid);
    raise exception 'gezakt: een half begonnen weekend werd aangenomen';
  exception when others then
    if sqlerrm not like '%al begonnen%' then raise; end if;
    raise notice 'ok: zodra de eerste sessie van een weekend loopt kan er geen joker meer bij';
  end;

  -- 4. en een joker die al ligt op een weekend dat inmiddels begonnen is
  --    kan niet meer weggehaald worden
  update races set deadline_quali = now() - interval '1 minute' where id = open1;
  begin
    delete from jokers where pool_id = poule and race_id = open1 and member_id = lid;
    raise exception 'gezakt: een joker mocht na de start nog weggehaald worden';
  exception when others then
    if sqlerrm not like '%al begonnen%' then raise; end if;
    raise notice 'ok: een joker die ligt blijft liggen zodra het weekend begint';
  end;
  update races set deadline_quali = now() + interval '1 day' where id = open1;

  -- 5. vijf per seizoen, en niet meer
  insert into jokers (pool_id, race_id, member_id) values
    (poule, open2, lid), (poule, open3, lid), (poule, open4, lid), (poule, open5, lid);
  select count(*) into n from jokers where pool_id = poule and member_id = lid;
  if n <> 5 then raise exception 'gezakt: % jokers gezet in plaats van 5', n; end if;
  begin
    insert into jokers (pool_id, race_id, member_id) values (poule, open6, lid);
    raise exception 'gezakt: een zesde joker werd aangenomen';
  exception when others then
    if sqlerrm not like '%vijf jokers%' then raise; end if;
    raise notice 'ok: de zesde joker wordt geweigerd';
  end;

  -- Eentje weghalen maakt weer plek. Anders zou een misklik in ronde 1 je de
  -- rest van het seizoen kosten.
  delete from jokers where pool_id = poule and race_id = open5 and member_id = lid;
  insert into jokers (pool_id, race_id, member_id) values (poule, open6, lid);
  raise notice 'ok: een joker terugnemen maakt weer plek';

  -- 6. de teller is per speler, niet per poule
  insert into jokers (pool_id, race_id, member_id) values (poule, open1, ander);
  select count(*) into n from jokers where pool_id = poule and member_id = ander;
  if n <> 1 then raise exception 'gezakt: de medespeler kon geen joker zetten'; end if;
  raise notice 'ok: iedereen heeft zijn eigen vijf';

  -- 7. twee jokers op hetzelfde weekend bestaan niet: de primaire sleutel
  begin
    insert into jokers (pool_id, race_id, member_id) values (poule, open1, ander);
    raise exception 'gezakt: dezelfde joker kon twee keer';
  exception when unique_violation then
    raise notice 'ok: één joker per weekend, afgedwongen door de sleutel';
  end;

  -- 8. staat de regel uit in een poule, dan bestaat een joker daar niet
  update pools set jokers_vanaf = null where id = poule;
  begin
    insert into jokers (pool_id, race_id, member_id) values (poule, open2, ander);
    raise exception 'gezakt: een joker in een poule zonder jokers werd aangenomen';
  exception when others then
    if sqlerrm not like '%niet aan%' then raise; end if;
    raise notice 'ok: zonder de regel aan kan er geen joker gezet worden';
  end;
  update pools set jokers_vanaf = now() - interval '1 hour' where id = poule;

  -- 9. de poule weggooien neemt de jokers mee -- ook de jokers die vastliggen
  --
  -- Dit is waar de regel bijna te ver ging. "Je joker ligt vast zodra het
  -- weekend begint" hoort te gelden voor de speler die van gedachten
  -- verandert, niet voor een poule die opgeruimd wordt of een account dat
  -- verwijderd wordt. Zonder de uitzondering voor cascades liep
  -- verwijder_mijn_account() vast op een joker van drie races geleden.
  update races set deadline_quali = now() - interval '2 days',
                   deadline_race  = now() - interval '1 day'
   where id in (open1, open2);
  select count(*) into n from jokers where pool_id = poule;
  if n < 2 then raise exception 'gezakt: te weinig jokers om dit te kunnen testen'; end if;

  -- Eerst een speler weghalen: dat is de weg die verwijder_mijn_account gaat.
  delete from pool_members where member_id = ander;
  select count(*) into n from jokers where member_id = ander;
  if n <> 0 then raise exception 'gezakt: % jokers bleven staan na het weghalen van de speler', n; end if;
  raise notice 'ok: een speler weghalen neemt zijn vastliggende jokers mee';

  delete from pools where id = poule;
  select count(*) into n from jokers where pool_id = poule;
  if n <> 0 then raise exception 'gezakt: % jokers bleven staan', n; end if;
  raise notice 'ok: jokers gaan mee als de poule weggaat';
end $$;
