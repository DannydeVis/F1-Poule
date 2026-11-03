-- Inloggen neemt je spelers mee (3 november), in de database zelf.
--
-- David G. speelde anoniem op zijn iPhone. Hij logde in met zijn mailadres en
-- kreeg een nieuw, leeg account, dat bij het inloggen de oude sessie verving:
-- de enige sleutel van zijn speler. De app zet nu vlak voor zo'n inlog een
-- kaartje klaar als het anonieme account, en wisselt het daarna in als het
-- nieuwe. Wat hier vastligt, ook als de app een fout heeft:
--
--   1. Een kaartje krijgt alleen een anoniem account met spelers. Een account
--      met een mailadres, een anoniem account zonder spelers of een bezoeker
--      zonder account niet. Hooguit één per account.
--   2. Niemand leest of schrijft de tabel zelf.
--   3. Inwisselen: een onbekend of verlopen kaartje doet niets, net als
--      inwisselen door hetzelfde account, of door een ander anoniem account.
--   4. Met een goed kaartje gaan de spelers mee naar het account dat
--      inwisselt. In een poule waar dat account al speelt, blijft de speler
--      staan, en het antwoord noemt die poule. Een poulebaas blijft poulebaas,
--      en wat het oude account voor anderen aanmaakte gaat ook mee.
--   5. Een kaartje werkt één keer. En niet meer als het oude account intussen
--      een mailadres kreeg.
--   6. Weg met het account, weg met zijn kaartje. En de controleregels kennen
--      de tabel en de functies.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('a0000000-0000-0000-0000-0000000000d1', null, null, true),                         -- David op zijn iPhone
  ('a0000000-0000-0000-0000-0000000000d2', 'david@voorbeeld.test', now(), false),     -- David met zijn mailadres
  ('a0000000-0000-0000-0000-0000000000d3', null, null, true),                         -- Eva, speelt mee
  ('a0000000-0000-0000-0000-0000000000d4', null, null, true),                         -- anoniem, zonder speler
  ('a0000000-0000-0000-0000-0000000000d5', null, null, true);                         -- Frank, koppelt straks een adres

insert into pools (id, name, join_code) values
  ('b0000000-0000-0000-0000-0000000000d1', 'Kartbaan', 'MEE001'),
  ('b0000000-0000-0000-0000-0000000000d2', 'Kantoor', 'MEE002'),
  ('b0000000-0000-0000-0000-0000000000d3', 'Familie', 'MEE003');
insert into pool_members (member_id, pool_id, display_name, user_id, aangemaakt_door) values
  ('c0000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-0000000000d1', 'David', 'a0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-0000000000d1'),
  ('c0000000-0000-0000-0000-0000000000d2', 'b0000000-0000-0000-0000-0000000000d2', 'David K', 'a0000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-0000000000d1'),
  ('c0000000-0000-0000-0000-0000000000d3', 'b0000000-0000-0000-0000-0000000000d2', 'David M', 'a0000000-0000-0000-0000-0000000000d2', 'a0000000-0000-0000-0000-0000000000d2'),
  ('c0000000-0000-0000-0000-0000000000d4', 'b0000000-0000-0000-0000-0000000000d1', 'Eva', 'a0000000-0000-0000-0000-0000000000d3', 'a0000000-0000-0000-0000-0000000000d3'),
  -- Een speler die David voor een vriend aanmaakte, nog door niemand geclaimd.
  ('c0000000-0000-0000-0000-0000000000d5', 'b0000000-0000-0000-0000-0000000000d1', 'Gijs', null, 'a0000000-0000-0000-0000-0000000000d1'),
  ('c0000000-0000-0000-0000-0000000000d6', 'b0000000-0000-0000-0000-0000000000d3', 'Frank', 'a0000000-0000-0000-0000-0000000000d5', 'a0000000-0000-0000-0000-0000000000d5');
update pools set owner_member_id = 'c0000000-0000-0000-0000-0000000000d1' where id = 'b0000000-0000-0000-0000-0000000000d1';

create function pg_temp.fout_bij(sql text, verwacht text, wat text) returns void language plpgsql as $$
declare fout text;
begin
  begin
    execute sql;
  exception when others then fout := sqlerrm;
  end;
  if fout is null or position(verwacht in fout) = 0 then
    raise exception 'gezakt: % (fout: %)', wat, coalesce(fout, 'geen');
  end if;
  raise notice 'ok: %', wat;
end $$;

create function pg_temp.als(gebruiker text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', gebruiker)::text, true);
end $$;

create function pg_temp.kaartje(gebruiker text) returns uuid language plpgsql as $$
declare v uuid;
begin
  perform pg_temp.als(gebruiker);
  v := public.meenemen_klaarzetten();
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return v;
end $$;

create function pg_temp.inwisselen(gebruiker text, p_token uuid) returns jsonb language plpgsql as $$
declare v jsonb;
begin
  perform pg_temp.als(gebruiker);
  v := public.meenemen_afronden(p_token);
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return v;
end $$;

create function pg_temp.van(p_member text) returns text language sql as $$
  select coalesce(user_id::text, '-') from public.pool_members where member_id = p_member::uuid
$$;

-- ---- 1. wie een kaartje krijgt ---------------------------------------------------------------
do $$
declare v_een uuid; v_twee uuid;
begin
  v_een := pg_temp.kaartje('a0000000-0000-0000-0000-0000000000d1');
  if v_een is null then raise exception 'gezakt: een anoniem account met spelers krijgt geen kaartje'; end if;
  raise notice 'ok: een anoniem account met spelers krijgt een kaartje';

  v_twee := pg_temp.kaartje('a0000000-0000-0000-0000-0000000000d1');
  if v_twee is null or v_twee = v_een
     or (select count(*) from public.account_meenemen where van_user = 'a0000000-0000-0000-0000-0000000000d1') <> 1 then
    raise exception 'gezakt: een tweede kaartje vervangt het eerste niet';
  end if;
  raise notice 'ok: hooguit één kaartje per account; een nieuw vervangt het oude';

  if pg_temp.kaartje('a0000000-0000-0000-0000-0000000000d2') is not null then
    raise exception 'gezakt: een account met een mailadres krijgt een kaartje';
  end if;
  if pg_temp.kaartje('a0000000-0000-0000-0000-0000000000d4') is not null then
    raise exception 'gezakt: een anoniem account zonder spelers krijgt een kaartje';
  end if;
  perform set_config('role', 'authenticated', true);
  if public.meenemen_klaarzetten() is not null then raise exception 'gezakt: zonder account toch een kaartje'; end if;
  reset role;
  raise notice 'ok: een account met een adres, een anoniem account zonder spelers of zonder account: geen kaartje';

  set local role anon;
  perform pg_temp.fout_bij($q$select public.meenemen_klaarzetten()$q$, 'permission denied', 'anon roept klaarzetten niet aan');
  perform pg_temp.fout_bij($q$select public.meenemen_afronden(gen_random_uuid())$q$, 'permission denied', 'en afronden ook niet');
  reset role;
end $$;

-- ---- 2. de tabel zelf is dicht -----------------------------------------------------------------
do $$
begin
  perform pg_temp.als('a0000000-0000-0000-0000-0000000000d1');
  perform pg_temp.fout_bij($q$select token from public.account_meenemen$q$, 'permission denied', 'een account leest de kaartjes niet, ook zijn eigen niet');
  perform pg_temp.fout_bij($q$insert into public.account_meenemen (van_user) values ('a0000000-0000-0000-0000-0000000000d3')$q$,
    'permission denied', 'en zet er geen kaartje voor een ander in');
  reset role;
  set local role anon;
  perform pg_temp.fout_bij($q$select count(*) from public.account_meenemen$q$, 'permission denied', 'zonder account ook niet');
  reset role;
end $$;

-- ---- 3. inwisselen dat niets doet ---------------------------------------------------------------
do $$
declare v_token uuid; v_uit jsonb;
begin
  v_uit := pg_temp.inwisselen('a0000000-0000-0000-0000-0000000000d2', gen_random_uuid());
  if (v_uit ->> 'meegenomen')::int <> 0 or pg_temp.van('c0000000-0000-0000-0000-0000000000d1') <> 'a0000000-0000-0000-0000-0000000000d1' then
    raise exception 'gezakt: een onbekend kaartje: %', v_uit;
  end if;
  raise notice 'ok: een onbekend kaartje doet niets';

  v_token := pg_temp.kaartje('a0000000-0000-0000-0000-0000000000d1');
  update public.account_meenemen set geldig_tot = now() - interval '1 minute' where token = v_token;
  v_uit := pg_temp.inwisselen('a0000000-0000-0000-0000-0000000000d2', v_token);
  if (v_uit ->> 'meegenomen')::int <> 0 or pg_temp.van('c0000000-0000-0000-0000-0000000000d1') <> 'a0000000-0000-0000-0000-0000000000d1' then
    raise exception 'gezakt: een verlopen kaartje: %', v_uit;
  end if;
  raise notice 'ok: een verlopen kaartje doet niets';

  v_token := pg_temp.kaartje('a0000000-0000-0000-0000-0000000000d1');
  v_uit := pg_temp.inwisselen('a0000000-0000-0000-0000-0000000000d1', v_token);
  if (v_uit ->> 'meegenomen')::int <> 0 then raise exception 'gezakt: inwisselen door hetzelfde account: %', v_uit; end if;
  raise notice 'ok: inwisselen door hetzelfde account doet niets';

  v_token := pg_temp.kaartje('a0000000-0000-0000-0000-0000000000d1');
  v_uit := pg_temp.inwisselen('a0000000-0000-0000-0000-0000000000d4', v_token);
  if (v_uit ->> 'meegenomen')::int <> 0 or pg_temp.van('c0000000-0000-0000-0000-0000000000d1') <> 'a0000000-0000-0000-0000-0000000000d1' then
    raise exception 'gezakt: een ander anoniem account nam de spelers mee: %', v_uit;
  end if;
  raise notice 'ok: naar een ander anoniem account gaat niets mee';
end $$;

-- ---- 4 en 5. inwisselen dat wel iets doet, één keer ----------------------------------------------
do $$
declare v_token uuid; v_uit jsonb;
begin
  v_token := pg_temp.kaartje('a0000000-0000-0000-0000-0000000000d1');
  v_uit := pg_temp.inwisselen('a0000000-0000-0000-0000-0000000000d2', v_token);
  if v_uit is distinct from '{"meegenomen": 1, "niet": ["Kantoor"]}'::jsonb then
    raise exception 'gezakt: het antwoord van inwisselen: %', v_uit;
  end if;
  raise notice 'ok: het antwoord zegt hoeveel spelers meegingen, en in welke poule er een bleef staan';

  if pg_temp.van('c0000000-0000-0000-0000-0000000000d1') <> 'a0000000-0000-0000-0000-0000000000d2' then
    raise exception 'gezakt: David staat niet op zijn mailaccount';
  end if;
  if pg_temp.van('c0000000-0000-0000-0000-0000000000d2') <> 'a0000000-0000-0000-0000-0000000000d1'
     or pg_temp.van('c0000000-0000-0000-0000-0000000000d3') <> 'a0000000-0000-0000-0000-0000000000d2' then
    raise exception 'gezakt: in Kantoor, waar het mailaccount al speelde, is iets verschoven';
  end if;
  if pg_temp.van('c0000000-0000-0000-0000-0000000000d4') <> 'a0000000-0000-0000-0000-0000000000d3'
     or pg_temp.van('c0000000-0000-0000-0000-0000000000d5') <> '-' then
    raise exception 'gezakt: een speler van iemand anders, of een ongeclaimde, kreeg een ander account';
  end if;
  raise notice 'ok: de speler gaat mee; in een poule waar het account al speelt blijft hij staan; van anderen verschuift niets';

  if (select aangemaakt_door from public.pool_members where member_id = 'c0000000-0000-0000-0000-0000000000d5')
     is distinct from 'a0000000-0000-0000-0000-0000000000d2' then
    raise exception 'gezakt: de speler die David voor een vriend aanmaakte, ging niet mee';
  end if;
  perform pg_temp.als('a0000000-0000-0000-0000-0000000000d2');
  if not public.mag_voor_speler('c0000000-0000-0000-0000-0000000000d1')
     or not public.mag_voor_speler('c0000000-0000-0000-0000-0000000000d5')
     or not public.mag_beheren('b0000000-0000-0000-0000-0000000000d1') then
    raise exception 'gezakt: het mailaccount mag niet voor David invullen, niet voor Gijs, of is geen poulebaas';
  end if;
  reset role;
  perform pg_temp.als('a0000000-0000-0000-0000-0000000000d1');
  if public.mag_voor_speler('c0000000-0000-0000-0000-0000000000d1') or public.mag_beheren('b0000000-0000-0000-0000-0000000000d1') then
    raise exception 'gezakt: het oude anonieme account mag nog voor David invullen of beheren';
  end if;
  reset role;
  raise notice 'ok: het mailaccount is David en poulebaas, en vult voor Gijs in; het oude account niet meer';

  v_uit := pg_temp.inwisselen('a0000000-0000-0000-0000-0000000000d2', v_token);
  if (v_uit ->> 'meegenomen')::int <> 0 or exists (select 1 from public.account_meenemen where token = v_token) then
    raise exception 'gezakt: hetzelfde kaartje werkte nog een keer: %', v_uit;
  end if;
  raise notice 'ok: een kaartje werkt één keer';

  -- Frank zet een kaartje klaar, en koppelt daarna toch een mailadres aan
  -- zijn anonieme account. Dan raakt hij niets kwijt, en hoort er niets te
  -- verhuizen.
  v_token := pg_temp.kaartje('a0000000-0000-0000-0000-0000000000d5');
  update auth.users set is_anonymous = false, email = 'frank@voorbeeld.test', email_confirmed_at = now()
   where id = 'a0000000-0000-0000-0000-0000000000d5';
  v_uit := pg_temp.inwisselen('a0000000-0000-0000-0000-0000000000d2', v_token);
  if (v_uit ->> 'meegenomen')::int <> 0 or pg_temp.van('c0000000-0000-0000-0000-0000000000d6') <> 'a0000000-0000-0000-0000-0000000000d5' then
    raise exception 'gezakt: van een account dat intussen een adres heeft, ging toch iets mee: %', v_uit;
  end if;
  raise notice 'ok: niet meer als het oude account intussen een mailadres kreeg';
end $$;

-- ---- 6. weg met het account, en de controleregels ------------------------------------------------
do $$
begin
  perform pg_temp.kaartje('a0000000-0000-0000-0000-0000000000d3');
  if not exists (select 1 from public.account_meenemen where van_user = 'a0000000-0000-0000-0000-0000000000d3') then
    raise exception 'gezakt: Eva kreeg geen kaartje';
  end if;
  delete from auth.users where id = 'a0000000-0000-0000-0000-0000000000d3';
  if exists (select 1 from public.account_meenemen where van_user = 'a0000000-0000-0000-0000-0000000000d3') then
    raise exception 'gezakt: het kaartje bleef staan na het account';
  end if;
  raise notice 'ok: weg met het account, weg met zijn kaartje';

  if (select uitkomst from public.poule_controle where controle = 'functies en tabellen: alleen die uit schema.sql') <> 'ok'
     or (select uitkomst from public.poule_controle where controle = 'policies: alleen die uit schema.sql') <> 'ok' then
    raise exception 'gezakt: de controleregels kennen het meenemen niet: %',
      (select string_agg(controle || ' = ' || uitkomst, '; ') from public.poule_controle
        where controle like 'functies%' or controle like 'policies%');
  end if;
  raise notice 'ok: de controleregels kennen de tabel en de functies';
end $$;
