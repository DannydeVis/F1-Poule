-- De policies: van wie is een inzending?
--
-- Dit is de scherpste test in de map, want hij legt de belofte vast waarvoor
-- de hele login gebouwd is: **jouw voorspelling is van jou**. De anon key
-- staat publiek in index.html — dat hoort zo — en tot nu toe was dat genoeg
-- om andermans top 10 te overschrijven of weg te gooien.
--
-- Wat hier óók in staat, en net zo belangrijk is: wat er níét dichtgaat.
-- Lezen blijft open, en spelers die nog aan geen enkel account hangen blijven
-- beschrijfbaar. Dat tweede is met opzet: zonder dat zou de dag waarop dit
-- live gaat een halve poule buitensluiten, en RLS geeft daar geen fout op —
-- een geblokkeerde update raakt gewoon nul rijen. Vandaar dat elke controle
-- hieronder `found` meet en niet alleen op een exception wacht.

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'anna@voorbeeld.nl'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bram@voorbeeld.nl'),
  ('cccccccc-0000-0000-0000-000000000003', 'chris@voorbeeld.nl');

insert into races (id, season, round, name, deadline_quali, deadline_race)
values (901, 2026, 91, 'Testcircuit', now() + interval '2 days', now() + interval '3 days');

insert into pools (id, name, join_code, owner_member_id) values
  ('11111111-0000-0000-0000-000000000001', 'Poule van Anna', 'ANNA01', null);

insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa1111-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001', 'Anna',
   'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbb2222-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000001', 'Bram',
   'bbbbbbbb-0000-0000-0000-000000000002'),
  -- Een speler van vóór de accounts: hangt nog aan niemand.
  ('cccc3333-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000001', 'Oude Speler', null);

-- Anna is de poulebaas.
update pools set owner_member_id = 'aaaa1111-0000-0000-0000-000000000001'
where id = '11111111-0000-0000-0000-000000000001';

insert into answers (pool_id, race_id, member_id, question_id, waarde) values
  ('11111111-0000-0000-0000-000000000001', 901,
   'aaaa1111-0000-0000-0000-000000000001', 'winnaar', '"1"');

\set anna '\'{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}\''
\set bram '\'{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}\''
\set chris '\'{"sub":"cccccccc-0000-0000-0000-000000000003"}\''

do $$
declare gelukt boolean;
declare aantal int;
begin
  -- ============================================================
  --  1. De belofte: Bram kan niet bij het antwoord van Anna
  -- ============================================================
  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}', true);

  gelukt := false;
  begin
    update answers set waarde = '"99"'
    where member_id = 'aaaa1111-0000-0000-0000-000000000001';
    if found then gelukt := true; end if;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: Bram overschreef het antwoord van Anna'; end if;
  raise notice 'ok: Bram kan het antwoord van Anna niet overschrijven';

  gelukt := false;
  begin
    delete from answers where member_id = 'aaaa1111-0000-0000-0000-000000000001';
    if found then gelukt := true; end if;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: Bram gooide het antwoord van Anna weg'; end if;
  raise notice 'ok: Bram kan het antwoord van Anna niet weggooien';

  gelukt := false;
  begin
    insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values ('11111111-0000-0000-0000-000000000001', 901,
            'aaaa1111-0000-0000-0000-000000000001', 'pole', '"44"');
    gelukt := true;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: Bram vulde een antwoord in namens Anna'; end if;
  raise notice 'ok: Bram kan niets invullen namens Anna';

  -- En het antwoord van Anna staat er nog zoals zij het achterliet.
  select count(*) into aantal from answers
  where member_id = 'aaaa1111-0000-0000-0000-000000000001' and waarde = '"1"';
  if aantal <> 1 then raise exception 'gezakt: het antwoord van Anna is veranderd'; end if;
  raise notice 'ok: het antwoord van Anna is onaangeraakt';

  -- ============================================================
  --  2. Maar zijn eigen inzending kan hij gewoon kwijt
  -- ============================================================
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values ('11111111-0000-0000-0000-000000000001', 901,
          'bbbb2222-0000-0000-0000-000000000002', 'winnaar', '"44"');
  raise notice 'ok: Bram vult zijn eigen antwoord gewoon in';

  update answers set waarde = '"16"'
  where member_id = 'bbbb2222-0000-0000-0000-000000000002';
  if not found then raise exception 'gezakt: Bram kan zijn eigen antwoord niet wijzigen'; end if;
  raise notice 'ok: Bram wijzigt zijn eigen antwoord';

  delete from answers where member_id = 'bbbb2222-0000-0000-0000-000000000002';
  if not found then raise exception 'gezakt: Bram kan zijn eigen antwoord niet wissen'; end if;
  raise notice 'ok: Bram wist zijn eigen antwoord';

  -- ============================================================
  --  3. Lezen blijft open, en dat is een keuze
  -- ============================================================
  -- De app laat je na de deadline elkaars top 10 zien en telt iedereen mee in
  -- de stand. Dichtzetten zou die schermen breken.
  select count(*) into aantal from answers;
  if aantal < 1 then raise exception 'gezakt: Bram mag de antwoorden van de poule niet lezen'; end if;
  raise notice 'ok: lezen blijft open, zoals de stand en het terugkijken nodig hebben';

  -- ============================================================
  --  4. Een speler zonder account blijft beschrijfbaar
  -- ============================================================
  -- Dit is de reden dat het dichtzetten niemand buitensluit. Wie de app nog
  -- niet geopend heeft sinds er accounts zijn, speelt gewoon door.
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values ('11111111-0000-0000-0000-000000000001', 901,
          'cccc3333-0000-0000-0000-000000000003', 'winnaar', '"81"');
  raise notice 'ok: een speler zonder account kan nog gewoon invullen';

  delete from answers where member_id = 'cccc3333-0000-0000-0000-000000000003';

  -- ============================================================
  --  5. Claimen kan, overnemen niet
  -- ============================================================
  -- Chris hoort nergens bij en probeert Anna over te nemen.
  perform set_config('request.jwt.claims',
    '{"sub":"cccccccc-0000-0000-0000-000000000003"}', true);

  gelukt := false;
  begin
    update pool_members set user_id = 'cccccccc-0000-0000-0000-000000000003'
    where member_id = 'aaaa1111-0000-0000-0000-000000000001';
    if found then gelukt := true; end if;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: Chris nam de speler van Anna over'; end if;
  raise notice 'ok: een geclaimde speler is niet over te nemen';

  -- Een speler die van niemand is, mag hij wél claimen: dat is precies hoe
  -- iedereen binnenkomt.
  update pool_members set user_id = 'cccccccc-0000-0000-0000-000000000003'
  where member_id = 'cccc3333-0000-0000-0000-000000000003' and user_id is null;
  if not found then raise exception 'gezakt: Chris kan een vrije speler niet claimen'; end if;
  raise notice 'ok: een speler zonder eigenaar is te claimen';

  -- En nu hij van Chris is, kan Bram er niet meer bij.
  perform set_config('request.jwt.claims',
    '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}', true);
  gelukt := false;
  begin
    insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values ('11111111-0000-0000-0000-000000000001', 901,
            'cccc3333-0000-0000-0000-000000000003', 'winnaar', '"1"');
    gelukt := true;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: een net geclaimde speler is nog steeds vrij wild'; end if;
  raise notice 'ok: zodra een speler geclaimd is, groeit de bescherming mee';

  -- ============================================================
  --  6. Jezelf loslaten mag, een ander loslaten niet
  -- ============================================================
  perform set_config('request.jwt.claims',
    '{"sub":"cccccccc-0000-0000-0000-000000000003"}', true);
  update pool_members set user_id = null
  where member_id = 'cccc3333-0000-0000-0000-000000000003';
  if not found then raise exception 'gezakt: Chris kan zijn eigen speler niet loslaten'; end if;
  raise notice 'ok: je eigen speler loslaten mag';

  gelukt := false;
  begin
    update pool_members set user_id = null
    where member_id = 'aaaa1111-0000-0000-0000-000000000001';
    if found then gelukt := true; end if;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: Chris maakte de speler van Anna los'; end if;
  raise notice 'ok: de speler van een ander loslaten kan niet';

  -- ============================================================
  --  7. De poulebaas heeft één uitweg, en die is nodig
  -- ============================================================
  -- Eén misklik op het "Wie ben jij?"-scherm is genoeg om iemands seizoen aan
  -- het verkeerde account te hangen. Zonder deze uitweg is dat onherstelbaar.
  perform set_config('request.jwt.claims',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
  update pool_members set user_id = null
  where member_id = 'bbbb2222-0000-0000-0000-000000000002';
  if not found then raise exception 'gezakt: de poulebaas kan een speler niet losmaken'; end if;
  raise notice 'ok: de poulebaas kan een verkeerd geclaimde speler losmaken';

  -- Bram claimt zichzelf weer terug.
  perform set_config('request.jwt.claims',
    '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}', true);
  update pool_members set user_id = 'bbbbbbbb-0000-0000-0000-000000000002'
  where member_id = 'bbbb2222-0000-0000-0000-000000000002' and user_id is null;
  if not found then raise exception 'gezakt: Bram kan zichzelf niet terugpakken'; end if;
  raise notice 'ok: en de speler is daarna weer gewoon te claimen';

  -- Maar Bram is geen poulebaas, dus hij heeft die uitweg niet.
  gelukt := false;
  begin
    update pool_members set user_id = null
    where member_id = 'aaaa1111-0000-0000-0000-000000000001';
    if found then gelukt := true; end if;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: een gewoon lid kan spelers losmaken'; end if;
  raise notice 'ok: alleen de poulebaas heeft die uitweg';

  -- ============================================================
  --  8. De vragenset en de omschrijving zijn van de poulebaas
  -- ============================================================
  gelukt := false;
  begin
    update pools set beschrijving = 'gekaapt'
    where id = '11111111-0000-0000-0000-000000000001';
    if found then gelukt := true; end if;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: Bram veranderde de omschrijving'; end if;
  raise notice 'ok: Bram kan de omschrijving niet veranderen';

  gelukt := false;
  begin
    insert into pool_questions (pool_id, question_id)
    values ('11111111-0000-0000-0000-000000000001', 'rode_vlag');
    gelukt := true;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: Bram zette een vraag aan'; end if;
  raise notice 'ok: Bram kan de vragenset niet aanpassen';

  perform set_config('request.jwt.claims',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
  update pools set beschrijving = 'de poule van kantoor'
  where id = '11111111-0000-0000-0000-000000000001';
  if not found then raise exception 'gezakt: de poulebaas kan de omschrijving niet aanpassen'; end if;
  raise notice 'ok: de poulebaas kan dat wel';

  insert into pool_questions (pool_id, question_id)
  values ('11111111-0000-0000-0000-000000000001', 'rode_vlag');
  raise notice 'ok: en de vragenset ook';

  -- ============================================================
  --  9. Een poule vinden en aanmaken blijft voor iedereen
  -- ============================================================
  -- Zonder ingelogde gebruiker, zoals iemand die de app voor het eerst opent.
  set local role anon;
  perform set_config('request.jwt.claims', '', true);

  select count(*) into aantal from pools where join_code = 'ANNA01';
  if aantal <> 1 then raise exception 'gezakt: een poule is niet meer op zijn code te vinden'; end if;
  raise notice 'ok: een poule zoeken op zijn code kan zonder account';

  select count(*) into aantal from pool_members
  where pool_id = '11111111-0000-0000-0000-000000000001';
  if aantal < 3 then raise exception 'gezakt: het "Wie ben jij?"-scherm heeft niets te tonen'; end if;
  raise notice 'ok: de spelerslijst is zichtbaar voor wie nog geen lid is';

  insert into pools (id, name, join_code)
  values ('99999999-0000-0000-0000-000000000009', 'Nieuwe poule', 'NIEUW1');
  raise notice 'ok: een poule aanmaken kan zonder account';

  -- ============================================================
  -- 10. Een speler aanmelden namens een ánder account kan niet
  -- ============================================================
  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}', true);

  gelukt := false;
  begin
    insert into pool_members (pool_id, display_name, user_id)
    values ('11111111-0000-0000-0000-000000000001', 'Nep-Anna',
            'aaaaaaaa-0000-0000-0000-000000000001');
    gelukt := true;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: Bram schreef een speler in op het account van Anna'; end if;
  raise notice 'ok: je kunt geen speler inschrijven op andermans account';

  insert into pool_members (pool_id, display_name, user_id)
  values ('99999999-0000-0000-0000-000000000009', 'Bram', 
          'bbbbbbbb-0000-0000-0000-000000000002');
  raise notice 'ok: op je eigen account wel';

  -- ============================================================
  -- 11. De poule zelf is niet weg te gooien
  -- ============================================================
  -- De app doet dat nooit, dus er staat geen policy voor open.
  gelukt := false;
  begin
    delete from pools where id = '99999999-0000-0000-0000-000000000009';
    if found then gelukt := true; end if;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: een poule is via de anon key te verwijderen'; end if;
  raise notice 'ok: een poule verwijderen kan niet';

  reset role;
end $$;
