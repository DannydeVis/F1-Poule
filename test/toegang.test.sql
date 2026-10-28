-- Toegang tot een poule (28 oktober): een nieuwe code, en op slot.
--
-- Danny, over de code in de uitnodigingslink: "Is dit geen lek oid? Moet dat
-- niet beter afgeschermd worden?" De code is de uitnodiging; wat de poulebaas
-- nu kan als hij ergens belandt waar hij niet hoort:
--
--   1. Een nieuwe code maken (poule_nieuwe_code()): alleen de poulebaas, met
--      een sessie, en niet voor de open poule. De oude code werkt daarna niet
--      meer, de nieuwe wel. Rechtstreeks de code veranderen via de API kan
--      niet, ook niet als poulebaas.
--   2. Op slot zetten (pools.op_slot): alleen de poulebaas. Dan kan niemand
--      meer meedoen, ook niet als extra speler vanaf een toestel dat al
--      meedoet, en ziet wie er niet in zit alleen dát hij op slot is. Een
--      speler zonder account claimen kan dan ook niet meer, ook niet met een
--      member_id van voor het slot. Wie meedoet (of een speler in de poule
--      zette) ziet alles, en dat toestel kan zijn speler wel claimen.
--      Openbaar en op slot tegelijk kan niet. Van het slot af kan iedereen
--      met de code weer meedoen.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1', null, null, true),  -- Anna, de poulebaas
  ('bbbbbbbb-0000-0000-0000-0000000000f2', null, null, true),  -- Bram, speelt mee
  ('cccccccc-0000-0000-0000-0000000000f3', null, null, true),  -- Chris, van buiten
  ('dddddddd-0000-0000-0000-0000000000f4', null, null, true);  -- Dirk, zette een speler in

insert into pools (id, name, join_code) values
  ('11111111-0000-0000-0000-0000000000f1', 'Slotpoule', 'SLOT01'),
  ('22222222-0000-0000-0000-0000000000f2', 'Open poule', '80C98C');
insert into pool_members (member_id, pool_id, display_name, user_id, aangemaakt_door) values
  ('aaaa0000-0000-0000-0000-0000000000f1', '11111111-0000-0000-0000-0000000000f1', 'Anna',
   'aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1'),
  ('bbbb0000-0000-0000-0000-0000000000f2', '11111111-0000-0000-0000-0000000000f1', 'Bram',
   'bbbbbbbb-0000-0000-0000-0000000000f2', 'bbbbbbbb-0000-0000-0000-0000000000f2'),
  ('eeee0000-0000-0000-0000-0000000000f5', '11111111-0000-0000-0000-0000000000f1', 'Kind',
   null, 'dddddddd-0000-0000-0000-0000000000f4'),
  ('aaaa0000-0000-0000-0000-0000000000f6', '22222222-0000-0000-0000-0000000000f2', 'Anna',
   'aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1'),
  -- Een speler zonder account, en zonder toestel dat hem aanmaakte: zoals
  -- een speler die de poulebaas losmaakte.
  ('ffff0000-0000-0000-0000-0000000000f7', '11111111-0000-0000-0000-0000000000f1', 'Los',
   null, null);
update pools set owner_member_id = 'aaaa0000-0000-0000-0000-0000000000f1'
 where id = '11111111-0000-0000-0000-0000000000f1';
update pools set owner_member_id = 'aaaa0000-0000-0000-0000-0000000000f6'
 where id = '22222222-0000-0000-0000-0000000000f2';

-- Een fout verwachten, met de hint erbij die de app vertaalt.
create function pg_temp.hint_bij(sql text, verwacht text, wat text) returns void language plpgsql as $$
declare h text; fout text;
begin
  begin
    execute sql;
  exception when others then
    get stacked diagnostics h = pg_exception_hint, fout = message_text;
  end;
  if h is distinct from verwacht then
    raise exception 'gezakt: % (hint: %, fout: %)', wat, coalesce(h, 'geen'), coalesce(fout, 'geen');
  end if;
  raise notice 'ok: %', wat;
end $$;
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
create function pg_temp.als(sub text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case when sub is null then '{}' else json_build_object('sub', sub)::text end, true);
end $$;
create function pg_temp.controle(ok boolean, wat text, waarom text default '') returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'gezakt: % %', wat, waarom; end if;
  raise notice 'ok: %', wat;
end $$;

-- ---- 1. een nieuwe code ------------------------------------------------------------
do $$
declare
  nieuw text;
  uit   jsonb;
begin
  set local role authenticated;
  perform pg_temp.als('cccccccc-0000-0000-0000-0000000000f3');
  perform pg_temp.hint_bij($q$select public.poule_nieuwe_code('11111111-0000-0000-0000-0000000000f1')$q$,
    'geen_poulebaas', 'iemand van buiten kan geen nieuwe code maken');
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000f2');
  perform pg_temp.hint_bij($q$select public.poule_nieuwe_code('11111111-0000-0000-0000-0000000000f1')$q$,
    'geen_poulebaas', 'een medespeler ook niet');
  reset role;
  set local role anon;
  perform pg_temp.als(null);
  perform pg_temp.hint_bij($q$select public.poule_nieuwe_code('11111111-0000-0000-0000-0000000000f1')$q$,
    'geen_sessie', 'zonder sessie ook niet');
  reset role;

  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000f1');
  nieuw := public.poule_nieuwe_code('11111111-0000-0000-0000-0000000000f1');
  perform pg_temp.controle(nieuw ~ '^[0-9A-F]{6}$' and nieuw <> 'SLOT01',
    'de poulebaas krijgt een nieuwe code van zes tekens', nieuw);
  perform pg_temp.controle(public.poule_ophalen('SLOT01') is null, 'de oude code werkt niet meer');
  uit := public.poule_ophalen(lower(nieuw));
  perform pg_temp.controle(uit -> 'poule' ->> 'join_code' = nieuw, 'de nieuwe wel, ook in kleine letters');
  perform pg_temp.controle((public.poule_ophalen(null, '11111111-0000-0000-0000-0000000000f1') -> 'poule' ->> 'join_code') = nieuw,
    'en wie de poule op id ophaalt (zoals de app), krijgt de nieuwe code mee');
  perform pg_temp.hint_bij($q$select public.poule_nieuwe_code('22222222-0000-0000-0000-0000000000f2')$q$,
    'code_vast', 'de code van de open poule staat op de site en blijft dezelfde');
  perform pg_temp.hint_bij($q$update public.pools set join_code = 'AAAAAA'
    where id = '11111111-0000-0000-0000-0000000000f1'$q$,
    'code_via_functie', 'rechtstreeks de code veranderen kan niet, ook niet als poulebaas');
  reset role;
  perform pg_temp.controle((select join_code from pools where id = '22222222-0000-0000-0000-0000000000f2') = '80C98C',
    'de open poule heeft nog steeds zijn code');
end $$;

-- ---- 2. op slot ----------------------------------------------------------------------
do $$
declare
  uit  jsonb;
  m    jsonb;
  code text := (select join_code from pools where id = '11111111-0000-0000-0000-0000000000f1');
begin
  set local role authenticated;
  -- Een medespeler kan hem niet op slot zetten: pools_bijwerken laat alleen de
  -- poulebaas bijwerken, dus er verandert gewoon niets.
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000f2');
  update public.pools set op_slot = true where id = '11111111-0000-0000-0000-0000000000f1';
  reset role;
  perform pg_temp.controle(not (select op_slot from pools where id = '11111111-0000-0000-0000-0000000000f1'),
    'een medespeler kan de poule niet op slot zetten');

  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000f1');
  update public.pools set op_slot = true where id = '11111111-0000-0000-0000-0000000000f1';
  reset role;
  perform pg_temp.controle((select op_slot from pools where id = '11111111-0000-0000-0000-0000000000f1'),
    'de poulebaas wel');

  set local role authenticated;
  perform pg_temp.als('cccccccc-0000-0000-0000-0000000000f3');
  perform pg_temp.hint_bij($q$select public.poule_meedoen('11111111-0000-0000-0000-0000000000f1', 'Chris')$q$,
    'poule_op_slot', 'op slot kan niemand meer meedoen');
  uit := public.poule_ophalen(code);
  perform pg_temp.controle(uit = '{"op_slot": true}'::jsonb,
    'wie er niet in zit, ziet met de code alleen dat hij op slot is: geen naam, geen spelers', uit::text);
  -- Chris bekeek de poule misschien toen hij nog open was, en kent dan het
  -- member_id van Los.
  perform pg_temp.hint_bij($q$select public.poule_claim_speler('ffff0000-0000-0000-0000-0000000000f7')$q$,
    'poule_op_slot', 'en een speler zonder account claimen kan ook niet, ook niet met een member_id van voor het slot');
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000f2');
  perform pg_temp.hint_bij($q$select public.poule_meedoen('11111111-0000-0000-0000-0000000000f1', 'Broertje')$q$,
    'poule_op_slot', 'ook geen extra speler vanaf een toestel dat al meedoet');
  uit := public.poule_ophalen(null, '11111111-0000-0000-0000-0000000000f1');
  perform pg_temp.controle(jsonb_array_length(uit -> 'leden') = 4 and (uit -> 'poule' ->> 'op_slot')::boolean,
    'wie meedoet ziet alles, en dat de poule op slot is', uit::text);
  perform pg_temp.als('dddddddd-0000-0000-0000-0000000000f4');
  uit := public.poule_ophalen(null, '11111111-0000-0000-0000-0000000000f1');
  perform pg_temp.controle(jsonb_array_length(uit -> 'leden') = 4,
    'en een toestel dat er een speler in zette ook');
  perform pg_temp.controle((public.poule_claim_speler('eeee0000-0000-0000-0000-0000000000f5') ->> 'user_id')
                             = 'dddddddd-0000-0000-0000-0000000000f4',
    'dat toestel kan zijn speler ook claimen: het ziet de poule toch al');
  reset role;
  set local role anon;
  perform pg_temp.als(null);
  uit := public.poule_ophalen(null, '11111111-0000-0000-0000-0000000000f1');
  perform pg_temp.controle(uit = '{"op_slot": true}'::jsonb, 'zonder sessie alleen dat hij op slot is');
  reset role;

  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000f1');
  perform pg_temp.fout_bij($q$update public.pools set is_public = true
    where id = '11111111-0000-0000-0000-0000000000f1'$q$,
    'pools_slot_niet_openbaar', 'openbaar en op slot tegelijk kan niet');
  update public.pools set op_slot = false where id = '11111111-0000-0000-0000-0000000000f1';
  perform pg_temp.als('cccccccc-0000-0000-0000-0000000000f3');
  m := public.poule_meedoen('11111111-0000-0000-0000-0000000000f1', 'Chris');
  perform pg_temp.controle(m ->> 'display_name' = 'Chris', 'van het slot af kan iemand met de code weer meedoen');
  uit := public.poule_ophalen(null, '11111111-0000-0000-0000-0000000000f1');
  perform pg_temp.controle(jsonb_array_length(uit -> 'leden') = 5, 'en ziet hij de poule weer');
  reset role;
end $$;

-- ---- 3. de controletabel ---------------------------------------------------------------
do $$
begin
  perform pg_temp.controle((select uitkomst from public.poule_controle
                             where controle = 'toegang: nieuwe code en op slot') = 'ok',
    'de controletabel zegt ok over de toegang');
end $$;
