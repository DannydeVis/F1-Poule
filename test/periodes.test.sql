-- Premium: tussenklassementen met prijzen.
--
-- Wat hier vastligt (de stand per periode rekent de app):
--
--   1. Een tussenklassement maken of aanpassen kan alleen de poulebaas, en
--      alleen met premium. Niet een speler, niet de poulebaas van een andere
--      poule.
--   2. Een naam van 1 tot 40 tekens, rondes van 1 tot 40 met de eerste niet na
--      de laatste, een prijs van hoogstens 80 tekens (leeg is geen prijs),
--      hoogstens 10 per seizoen.
--   3. Weghalen alleen de poulebaas, ook na premium.
--   4. De tabel is niet rechtstreeks te lezen of te schrijven; poule_ophalen
--      geeft de periodes mee.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('aaaaaaaa-0000-0000-0000-0000000000d2', null, null, true),  -- Anna, poulebaas van A
  ('bbbbbbbb-0000-0000-0000-0000000000d3', null, null, true),  -- Bram, speelt mee in A
  ('cccccccc-0000-0000-0000-0000000000d4', null, null, true);  -- Chris, poulebaas van B (geen premium)

insert into pools (id, name, join_code, premium_tot) values
  ('11111111-0000-0000-0000-0000000000d1', 'Bedrijfspoule', 'PERI01', now() + interval '1 year'),
  ('22222222-0000-0000-0000-0000000000d2', 'Vriendenpoule', 'PERI02', null);
insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa0000-0000-0000-0000-0000000000d1', '11111111-0000-0000-0000-0000000000d1', 'Anna', 'aaaaaaaa-0000-0000-0000-0000000000d2'),
  ('bbbb0000-0000-0000-0000-0000000000d2', '11111111-0000-0000-0000-0000000000d1', 'Bram', 'bbbbbbbb-0000-0000-0000-0000000000d3'),
  ('cccc0000-0000-0000-0000-0000000000d3', '22222222-0000-0000-0000-0000000000d2', 'Chris', 'cccccccc-0000-0000-0000-0000000000d4');
update pools set owner_member_id = 'aaaa0000-0000-0000-0000-0000000000d1' where id = '11111111-0000-0000-0000-0000000000d1';
update pools set owner_member_id = 'cccc0000-0000-0000-0000-0000000000d3' where id = '22222222-0000-0000-0000-0000000000d2';

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

create function pg_temp.als(sub text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
end $$;

do $$
declare
  voorjaar uuid;
  uit      jsonb;
  n        int;
begin
  set local role authenticated;

  -- ============================================================
  --  1. wie mag
  -- ============================================================
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000d3');
  perform pg_temp.fout_bij($q$select public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2026, 'Voorjaar', 1, 8, 'Kratje bier')$q$,
    'alleen de poulebaas', 'een speler maakt geen tussenklassement');
  perform pg_temp.als('cccccccc-0000-0000-0000-0000000000d4');
  perform pg_temp.fout_bij($q$select public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2026, 'Voorjaar', 1, 8, null)$q$,
    'alleen de poulebaas', 'de poulebaas van een andere poule ook niet');
  perform pg_temp.fout_bij($q$select public.periode_opslaan('22222222-0000-0000-0000-0000000000d2', null, 2026, 'Voorjaar', 1, 8, null)$q$,
    'alleen met premium', 'en in zijn eigen poule niet zonder premium');

  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000d2');
  voorjaar := public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2026, ' Voorjaar ', 1, 8, ' Kratje bier ');
  uit := public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000d1');
  if not exists (select 1 from jsonb_array_elements(uit -> 'periodes') x
                 where x ->> 'id' = voorjaar::text and x ->> 'naam' = 'Voorjaar' and x ->> 'prijs' = 'Kratje bier'
                   and (x ->> 'van_ronde')::int = 1 and (x ->> 'tot_ronde')::int = 8 and (x ->> 'seizoen')::int = 2026) then
    raise exception 'gezakt: het tussenklassement staat niet goed in poule_ophalen (%)', uit -> 'periodes';
  end if;
  raise notice 'ok: de poulebaas maakt een tussenklassement met premium, en poule_ophalen geeft het mee';

  -- ============================================================
  --  2. de regels
  -- ============================================================
  perform pg_temp.fout_bij($q$select public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2026, '  ', 1, 8, null)$q$,
    '1 tot 40 tekens', 'een lege naam kan niet');
  perform pg_temp.fout_bij($q$select public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2026, 'Zomer', 9, 8, null)$q$,
    'niet na de laatste', 'de eerste ronde na de laatste kan niet');
  perform pg_temp.fout_bij($q$select public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2026, 'Zomer', 0, 8, null)$q$,
    'niet na de laatste', 'ronde 0 kan niet');
  perform pg_temp.fout_bij($q$select public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2026, 'Zomer', 9, 16, repeat('x', 81))$q$,
    'hoogstens 80', 'een prijs van 81 tekens kan niet');
  perform public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', voorjaar, 2026, 'Voorjaar', 1, 7, '');
  uit := public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000d1');
  if not exists (select 1 from jsonb_array_elements(uit -> 'periodes') x
                 where x ->> 'id' = voorjaar::text and (x ->> 'tot_ronde')::int = 7 and x -> 'prijs' = 'null'::jsonb) then
    raise exception 'gezakt: aanpassen werkte niet, of een lege prijs is geen geen-prijs';
  end if;
  raise notice 'ok: aanpassen kan, en een lege prijs is geen prijs';
  for n in 2..10 loop
    perform public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2026, 'Periode ' || n, n, n, null);
  end loop;
  perform pg_temp.fout_bij($q$select public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2026, 'Periode 11', 11, 11, null)$q$,
    'hoogstens 10', 'een elfde tussenklassement in hetzelfde seizoen kan niet');
  perform public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2027, 'Volgend jaar', 1, 24, null);
  raise notice 'ok: in een ander seizoen kan het weer';

  -- ============================================================
  --  4. niet rechtstreeks
  -- ============================================================
  perform pg_temp.fout_bij($q$select * from public.pool_periodes$q$, 'permission denied', 'pool_periodes is niet rechtstreeks te lezen');
  perform pg_temp.fout_bij($q$insert into public.pool_periodes (pool_id, seizoen, naam, van_ronde, tot_ronde) values ('11111111-0000-0000-0000-0000000000d1', 2026, 'Stiekem', 1, 2)$q$,
    'permission denied', 'en niet rechtstreeks te schrijven');

  -- ============================================================
  --  3. weghalen, ook na premium
  -- ============================================================
  reset role;
  update pools set premium_tot = now() - interval '1 day' where id = '11111111-0000-0000-0000-0000000000d1';
  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000d2');
  perform pg_temp.fout_bij($q$select public.periode_opslaan('11111111-0000-0000-0000-0000000000d1', null, 2027, 'Na premium', 1, 2, null)$q$,
    'alleen met premium', 'na premium geen nieuw tussenklassement');
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000d3');
  perform pg_temp.fout_bij(format($q$select public.periode_weghalen(%L)$q$, voorjaar),
    'alleen de poulebaas', 'een speler haalt geen tussenklassement weg');
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000d2');
  perform public.periode_weghalen(voorjaar);
  uit := public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000d1');
  if exists (select 1 from jsonb_array_elements(uit -> 'periodes') x where x ->> 'id' = voorjaar::text) then
    raise exception 'gezakt: het weggehaalde tussenklassement staat er nog';
  end if;
  raise notice 'ok: de poulebaas haalt een tussenklassement weg, ook na premium';
end $$;

do $$ begin raise notice 'ok: periodes.test.sql helemaal geslaagd'; end $$;
