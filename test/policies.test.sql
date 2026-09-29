-- De policies: van wie is een inzending?
--
-- Dit is de scherpste test in de map, want hij legt de belofte vast waarvoor
-- de hele login gebouwd is: **jouw voorspelling is van jou**. De anon key
-- staat publiek in index.html — dat hoort zo — en tot nu toe was dat genoeg
-- om andermans top 10 te overschrijven of weg te gooien.
--
-- Wat hier óók in staat, en net zo belangrijk is: wat er níét dichtgaat.
-- Lezen binnen je poule blijft open, en een speler die op een gedeeld toestel
-- zonder account is ingeschreven, blijft beschrijfbaar voor dat toestel. Een
-- speler zonder account is sinds 28 september niet meer voor iedereen
-- beschrijfbaar; test/identiteit.test.sql heeft de aanvallen die dat openliet.
-- RLS geeft op een geblokkeerde update geen fout, hij raakt gewoon nul rijen.
-- Vandaar dat elke controle hieronder `found` meet en niet alleen op een
-- exception wacht.

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

-- En een speler die op het toestel van Bram is ingeschreven terwijl Bram daar
-- zelf al speelde: zonder account, aangemaakt door dat van Bram.
insert into pool_members (member_id, pool_id, display_name, user_id, aangemaakt_door) values
  ('eeee5555-0000-0000-0000-000000000005',
   '11111111-0000-0000-0000-000000000001', 'Gedeeld Toestel', null,
   'bbbbbbbb-0000-0000-0000-000000000002');

-- Anna is de poulebaas.
update pools set owner_member_id = 'aaaa1111-0000-0000-0000-000000000001'
where id = '11111111-0000-0000-0000-000000000001';

insert into answers (pool_id, race_id, member_id, question_id, waarde) values
  ('11111111-0000-0000-0000-000000000001', 901,
   'aaaa1111-0000-0000-0000-000000000001', 'winnaar', '"1"');

-- En een weekend dat al voorbij is, met een antwoord van Anna erin. Ingevuld
-- toen het nog openstond; daarna schuift de deadline naar het verleden. Dat
-- antwoord mag Bram lezen, dat op 901 (nog open) niet: zie
-- test/geheim.test.sql.
insert into races (id, season, round, name, deadline_quali, deadline_race)
values (900, 2026, 90, 'Gereden circuit', now() + interval '2 days', now() + interval '3 days');
insert into answers (pool_id, race_id, member_id, question_id, waarde) values
  ('11111111-0000-0000-0000-000000000001', 900,
   'aaaa1111-0000-0000-0000-000000000001', 'winnaar', '"44"');
update races set deadline_quali = now() - interval '2 days',
                 deadline_race  = now() - interval '1 day' where id = 900;

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

  -- En het antwoord van Anna staat er nog zoals zij het achterliet. Bram zelf
  -- kan dat niet nagaan: de race staat nog open, dus hij ziet het niet. Even
  -- terug naar de beheerder om te kijken, en dan weer Bram.
  reset role;
  select count(*) into aantal from answers
  where member_id = 'aaaa1111-0000-0000-0000-000000000001' and race_id = 901 and waarde = '"1"';
  set local role authenticated;
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
  -- de stand. Dichtzetten zou die schermen breken. Na de deadline: daarvoor
  -- is een voorspelling van jou alleen (test/geheim.test.sql).
  select count(*) into aantal from answers
  where member_id = 'aaaa1111-0000-0000-0000-000000000001' and race_id = 900;
  if aantal <> 1 then raise exception 'gezakt: Bram mag de antwoorden van de poule niet lezen'; end if;
  raise notice 'ok: lezen na de deadline blijft open, zoals de stand en het terugkijken nodig hebben';

  -- ============================================================
  --  4. Een speler zonder account: alleen voor het toestel dat hem maakte
  -- ============================================================
  -- Eerst was een speler zonder account voor iedereen beschrijfbaar. Nu mag
  -- alleen het account dat hem aanmaakte (het gedeelde toestel) voor hem
  -- invullen, tot hij zichzelf claimt. Een oude speler van vóór de accounts
  -- is voor niemand beschrijfbaar tot hij de app opent en zichzelf claimt.
  gelukt := false;
  begin
    insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values ('11111111-0000-0000-0000-000000000001', 901,
            'cccc3333-0000-0000-0000-000000000003', 'winnaar', '"81"');
    gelukt := true;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: Bram vulde iets in voor een oude speler zonder account'; end if;
  raise notice 'ok: een oude speler zonder account is niet vrij wild';

  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values ('11111111-0000-0000-0000-000000000001', 901,
          'eeee5555-0000-0000-0000-000000000005', 'winnaar', '"81"');
  raise notice 'ok: het gedeelde toestel vult wel in voor de speler die het inschreef';
  delete from answers where member_id = 'eeee5555-0000-0000-0000-000000000005';

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
  -- iedereen binnenkomt. Sinds de leespolicies dicht staan gaat dat via
  -- poule_claim_speler() en niet meer met een losse update — Chris is op dat
  -- moment nog geen lid, dus hij ziet de rij niet die hij wil bijwerken. Zie
  -- test/afscherming.test.sql voor die hele redenering.
  if public.poule_claim_speler('cccc3333-0000-0000-0000-000000000003') is null then
    raise exception 'gezakt: Chris kan een vrije speler niet claimen'; end if;
  raise notice 'ok: een speler zonder eigenaar is te claimen';

  -- En de weg die dicht hoort te zitten, zit ook echt dicht: rechtstreeks
  -- bijwerken vanuit de app raakt niets meer.
  update pool_members set user_id = 'cccccccc-0000-0000-0000-000000000003'
  where member_id = 'bbbb2222-0000-0000-0000-000000000002';
  if found then raise exception 'gezakt: Chris nam Bram over met een losse update'; end if;
  raise notice 'ok: rechtstreeks claimen van andermans speler raakt niets';

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

  -- Bram claimt zichzelf weer terug. Ook dit gaat langs de functie: Bram is
  -- net losgemaakt, dus op dít moment hoort hij bij geen enkele speler in
  -- deze poule en ziet hij zijn eigen rij niet meer staan. Precies de
  -- situatie waarvoor poule_claim_speler() bestaat.
  perform set_config('request.jwt.claims',
    '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}', true);
  if public.poule_claim_speler('bbbb2222-0000-0000-0000-000000000002') is null then
    raise exception 'gezakt: Bram kan zichzelf niet terugpakken'; end if;
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
  --
  -- Dit ging eerst met een gewone `select ... where join_code = ...` op de
  -- tabel. Dat kan niet meer en dat is de hele winst van fase 0: een policy
  -- kan niet eisen dát je filtert, dus "vinden op je code" en "de hele tabel
  -- leegvissen" waren dezelfde rechten. Nu loopt binnenkomen langs een
  -- functie met een verplichte sleutel. Zie test/afscherming.test.sql voor de
  -- kant die dichtgegaan is; hier staat dat de deur nog wél opengaat.
  set local role anon;
  perform set_config('request.jwt.claims', '', true);

  select count(*) into aantal from pools where join_code = 'ANNA01';
  if aantal <> 0 then raise exception 'gezakt: de poulestabel is nog rechtstreeks te lezen'; end if;
  raise notice 'ok: rechtstreeks in de poulestabel kijken levert niets op';

  if public.poule_ophalen(p_code => 'ANNA01') is null then
    raise exception 'gezakt: een poule is niet meer op zijn code te vinden'; end if;
  raise notice 'ok: een poule zoeken op zijn code kan zonder account';

  if jsonb_array_length(public.poule_ophalen(p_code => 'ANNA01') -> 'leden') < 4 then
    raise exception 'gezakt: het "Wie ben jij?"-scherm heeft niets te tonen'; end if;
  raise notice 'ok: de spelerslijst komt mee voor wie nog geen lid is';

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

  -- Ook op je eigen account niet rechtstreeks: meedoen gaat via de functie,
  -- die de naam controleert en het account zelf invult.
  gelukt := false;
  begin
    insert into pool_members (pool_id, display_name, user_id)
    values ('99999999-0000-0000-0000-000000000009', 'Bram',
            'bbbbbbbb-0000-0000-0000-000000000002');
    gelukt := true;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: een speler kwam er rechtstreeks in, buiten poule_meedoen() om'; end if;
  raise notice 'ok: rechtstreeks een speler invoegen kan niet meer';

  if (public.poule_meedoen('99999999-0000-0000-0000-000000000009', 'Bram') ->> 'user_id')
     is distinct from 'bbbbbbbb-0000-0000-0000-000000000002' then
    raise exception 'gezakt: meedoen via de functie hangt de speler niet aan je account'; end if;
  raise notice 'ok: via poule_meedoen() wel, op je eigen account';

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
