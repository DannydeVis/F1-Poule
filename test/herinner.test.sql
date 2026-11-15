-- "Herinner mij voor het volgende seizoen" in de database (15 november).
--
-- Het enige mailadres dat hier staat van iemand zonder account. Wat hier
-- vastligt:
--
--   1. Aanmelden kan zonder account, met een geldig mailadres; het adres gaat
--      erin in kleine letters, met de taal (een onbekende taal wordt Engels).
--   2. Iets wat geen mailadres is geeft 'ongeldig' en komt er niet in.
--   3. Nog een keer hetzelfde adres geeft gewoon 'ok': de functie zegt niet
--      of een adres er al stond, en er komt geen tweede rij.
--   4. De tabel is dicht: lezen, schrijven en weggooien kan niemand via de
--      API, ook niet met een account.
--   5. Afmelden gaat met het token, zonder account, en één keer.
--   6. Hoogstens 200 nieuwe adressen per dag.
--   7. De controleregels kennen de tabel en de functies.

\set ON_ERROR_STOP on

create function pg_temp.fout_bij(sql text, verwacht text, wat text) returns void language plpgsql as $$
declare fout text;
begin
  begin
    execute sql;
  exception when others then fout := sqlerrm;
  end;
  if fout is null or fout not like '%' || verwacht || '%' then
    raise exception 'gezakt: % (fout: %)', wat, coalesce(fout, 'geen');
  end if;
  raise notice 'ok: %', wat;
end $$;

do $$
declare
  uit text;
  tok uuid;
begin
  set local role anon;

  -- ---- 1. aanmelden -------------------------------------------------------
  uit := public.herinnering_aanmelden('  Iemand@Voorbeeld.NL ', 'nl');
  if uit <> 'ok' then raise exception 'gezakt: een geldig adres geeft %', uit; end if;
  uit := public.herinnering_aanmelden('ander@example.com', 'xx');
  if uit <> 'ok' then raise exception 'gezakt: een onbekende taal geeft %', uit; end if;
  reset role;
  if (select count(*) from public.seizoen_herinneringen) <> 2
     or not exists (select 1 from public.seizoen_herinneringen where email = 'iemand@voorbeeld.nl' and taal = 'nl')
     or not exists (select 1 from public.seizoen_herinneringen where email = 'ander@example.com' and taal = 'en') then
    raise exception 'gezakt: de adressen staan er niet zoals bedoeld';
  end if;
  raise notice 'ok: aanmelden zonder account, in kleine letters, een onbekende taal wordt Engels';

  -- ---- 2. geen mailadres ----------------------------------------------------
  set local role anon;
  if public.herinnering_aanmelden('geen-adres', 'nl') <> 'ongeldig'
     or public.herinnering_aanmelden('a@b', 'nl') <> 'ongeldig'
     or public.herinnering_aanmelden('twee woorden@example.com', 'nl') <> 'ongeldig'
     or public.herinnering_aanmelden('', 'nl') <> 'ongeldig'
     or public.herinnering_aanmelden(null, 'nl') <> 'ongeldig'
     or public.herinnering_aanmelden(repeat('a', 250) || '@example.com', 'nl') <> 'ongeldig' then
    raise exception 'gezakt: iets wat geen mailadres is wordt aangenomen';
  end if;
  raise notice 'ok: iets wat geen mailadres is geeft ongeldig';

  -- ---- 3. nog een keer -------------------------------------------------------
  if public.herinnering_aanmelden('IEMAND@voorbeeld.nl', 'en') <> 'ok' then
    raise exception 'gezakt: nog een keer hetzelfde adres geeft geen ok';
  end if;
  reset role;
  if (select count(*) from public.seizoen_herinneringen) <> 2
     or (select taal from public.seizoen_herinneringen where email = 'iemand@voorbeeld.nl') <> 'nl' then
    raise exception 'gezakt: hetzelfde adres staat er twee keer in, of de taal is overschreven';
  end if;
  raise notice 'ok: hetzelfde adres nog een keer geeft ok en geen tweede rij';

  -- ---- 4. de tabel is dicht ---------------------------------------------------
  set local role anon;
  perform pg_temp.fout_bij('select * from public.seizoen_herinneringen', 'permission denied', 'anoniem leest de adressen niet');
  perform pg_temp.fout_bij($q$insert into public.seizoen_herinneringen (email) values ('x@example.com')$q$,
    'permission denied', 'en schrijft er niet rechtstreeks in');
  perform pg_temp.fout_bij('delete from public.seizoen_herinneringen', 'permission denied', 'en gooit niets weg');
  reset role;
  set local role authenticated;
  perform pg_temp.fout_bij('select * from public.seizoen_herinneringen', 'permission denied', 'ook met een account lees je ze niet');
  reset role;

  -- ---- 5. afmelden -------------------------------------------------------------
  select token into tok from public.seizoen_herinneringen where email = 'ander@example.com';
  set local role anon;
  if public.herinnering_afmelden(gen_random_uuid()) then
    raise exception 'gezakt: een verzonnen token meldt iemand af';
  end if;
  if not public.herinnering_afmelden(tok) then raise exception 'gezakt: afmelden met het token lukt niet'; end if;
  if public.herinnering_afmelden(tok) then raise exception 'gezakt: afmelden lukt twee keer'; end if;
  reset role;
  if exists (select 1 from public.seizoen_herinneringen where email = 'ander@example.com')
     or (select count(*) from public.seizoen_herinneringen) <> 1 then
    raise exception 'gezakt: na afmelden staat het adres er nog, of er is te veel weg';
  end if;
  raise notice 'ok: afmelden met het token, zonder account, één keer, en alleen die rij';

  -- ---- 6. hoogstens 200 per dag --------------------------------------------------
  insert into public.seizoen_herinneringen (email)
    select 'vol' || n || '@example.com' from generate_series(1, 199) n;
  set local role anon;
  if public.herinnering_aanmelden('teveel@example.com', 'nl') <> 'druk' then
    raise exception 'gezakt: het tweehonderdeerste adres van vandaag wordt aangenomen';
  end if;
  if public.herinnering_aanmelden('iemand@voorbeeld.nl', 'nl') <> 'ok' then
    raise exception 'gezakt: wie er al in staat krijgt geen ok als het druk is';
  end if;
  reset role;
  update public.seizoen_herinneringen set created_at = now() - interval '2 days' where email like 'vol%';
  set local role anon;
  if public.herinnering_aanmelden('morgen@example.com', 'nl') <> 'ok' then
    raise exception 'gezakt: een dag later kan er niets meer bij';
  end if;
  reset role;
  raise notice 'ok: hoogstens 200 nieuwe adressen per dag, en daarna weer';

  -- ---- 7. de controleregels --------------------------------------------------------
  if (select uitkomst from public.poule_controle where controle = 'functies en tabellen: alleen die uit schema.sql') <> 'ok' then
    raise exception 'gezakt: de controleregels kennen de herinneringen niet: %',
      (select uitkomst from public.poule_controle where controle = 'functies en tabellen: alleen die uit schema.sql');
  end if;
  raise notice 'ok: de controleregels kennen de tabel en de functies';
end $$;

do $$ begin raise notice 'ok: herinner.test.sql helemaal geslaagd'; end $$;
