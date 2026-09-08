-- is_member(): hoort dit account bij deze poule?
--
-- Dit is het fundament onder alle policies die nog komen, dus het moet los
-- bewezen zijn voordat er iets op gebouwd wordt. Wat hier vastligt:
--
--   1. Een geclaimde speler hoort bij zijn eigen poule en niet bij die van
--      een ander.
--   2. Een speler zonder user_id (die bestonden er, want de app werkte lang
--      zonder login) maakt níémand lid — ook niet iemand die toevallig ook
--      geen account heeft. auth.uid() is dan null, en null = null is in SQL
--      niet waar; deze test legt vast dat we daar niet per ongeluk vanaf
--      stappen.
--   3. Zonder ingelogde gebruiker is niemand lid van niets.
--   4. Eén account kan niet twee keer in dezelfde poule staan.

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'anna@voorbeeld.nl'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bram@voorbeeld.nl');

insert into pools (id, name, join_code) values
  ('11111111-0000-0000-0000-000000000001', 'Poule van Anna', 'ANNA01'),
  ('22222222-0000-0000-0000-000000000002', 'Poule van Bram', 'BRAM02');

insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa1111-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001', 'Anna',
   'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbb2222-0000-0000-0000-000000000002',
   '22222222-0000-0000-0000-000000000002', 'Bram',
   'bbbbbbbb-0000-0000-0000-000000000002'),
  -- Een speler van vroeger: nooit geclaimd, dus geen account.
  ('cccc3333-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000001', 'Oude Speler', null);

do $$
begin
  -- ---- 1. je eigen poule wel, die van een ander niet -----------------------
  perform set_config('request.jwt.claims',
    '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);

  if not public.is_member('11111111-0000-0000-0000-000000000001') then
    raise exception 'gezakt: Anna hoort niet bij haar eigen poule';
  end if;
  raise notice 'ok: Anna hoort bij haar eigen poule';

  if public.is_member('22222222-0000-0000-0000-000000000002') then
    raise exception 'gezakt: Anna hoort bij de poule van Bram';
  end if;
  raise notice 'ok: Anna hoort niet bij de poule van Bram';

  -- ---- 2. een speler zonder account maakt niemand lid ----------------------
  -- Anna zit al in poule 1, dus daar zegt is_member sowieso ja. De vraag is
  -- of een níet-geclaimde speler iemand binnenlaat. Test daarom met een
  -- account dat nergens bij hoort maar wel bestaat.
  perform set_config('request.jwt.claims',
    '{"sub":"bbbbbbbb-0000-0000-0000-000000000002"}', true);
  if public.is_member('11111111-0000-0000-0000-000000000001') then
    raise exception 'gezakt: Bram komt binnen via een speler zonder account';
  end if;
  raise notice 'ok: een speler zonder account laat niemand binnen';

  -- ---- 3. niet ingelogd is nergens lid ------------------------------------
  perform set_config('request.jwt.claims', '', true);
  if auth.uid() is not null then
    raise exception 'opzet mislukt: auth.uid() is niet null zonder claims';
  end if;
  if public.is_member('11111111-0000-0000-0000-000000000001') then
    raise exception 'gezakt: een niet-ingelogde bezoeker is lid';
  end if;
  raise notice 'ok: zonder inloggen ben je nergens lid';
  -- Ook niet van de poule waar die accountloze speler in zit: null = null is
  -- geen waarheid in SQL, en daar leunen we op.
  raise notice 'ok: null-user matcht niet met null-auth.uid()';
end $$;

-- ---- 4. één account, één speler per poule ---------------------------------
do $$
declare gelukt boolean := false;
begin
  begin
    insert into pool_members (pool_id, display_name, user_id)
    values ('11111111-0000-0000-0000-000000000001', 'Anna nog een keer',
            'aaaaaaaa-0000-0000-0000-000000000001');
    gelukt := true;
  exception when unique_violation then null;
  end;
  if gelukt then
    raise exception 'gezakt: hetzelfde account staat twee keer in dezelfde poule';
  end if;
  raise notice 'ok: hetzelfde account kan niet twee keer in dezelfde poule';

  -- Maar in een ándere poule mag het natuurlijk wel.
  insert into pool_members (pool_id, display_name, user_id)
  values ('22222222-0000-0000-0000-000000000002', 'Anna bij Bram',
          'aaaaaaaa-0000-0000-0000-000000000001');
  raise notice 'ok: in een andere poule mag hetzelfde account wel';

  -- En twee spelers zónder account in dezelfde poule mag ook: de unieke
  -- index geldt alleen waar user_id gevuld is.
  insert into pool_members (pool_id, display_name, user_id)
  values ('11111111-0000-0000-0000-000000000001', 'Nog een oude speler', null);
  raise notice 'ok: twee spelers zonder account naast elkaar mag';
end $$;

-- ---- 5. verwijder mijn account neemt de spelers mee ------------------------
do $$
declare over int;
begin
  delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  select count(*) into over from pool_members
   where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if over <> 0 then
    raise exception 'gezakt: % speler(s) van Anna bleven staan na het verwijderen', over;
  end if;
  raise notice 'ok: het account verwijderen neemt zijn spelers mee';

  -- En de spelers van iemand anders blijven natuurlijk staan.
  select count(*) into over from pool_members where display_name = 'Bram';
  if over <> 1 then raise exception 'gezakt: Bram is ook verdwenen'; end if;
  raise notice 'ok: andermans spelers blijven staan';
end $$;
