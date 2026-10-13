-- Premium: teams binnen een poule.
--
-- De code is openbaar en de anon key ook, dus wie wat mag staat in de
-- database. Wat hier vastligt:
--
--   1. Een team maken of hernoemen kan alleen de poulebaas, en alleen zolang
--      premium loopt. Een speler niet, een poulebaas van een andere poule niet.
--   2. De naam: 1 tot 30 tekens, geen twee teams met dezelfde naam (ook niet
--      met andere hoofdletters of spaties eromheen), hoogstens 20 teams.
--   3. Een team kiezen: voor je eigen speler, of als poulebaas voor iedereen in
--      je poule. Niet voor een medespeler, niet een team uit een andere poule,
--      niet zonder premium. Geen team kiezen kan altijd.
--   4. Een team weghalen: alleen de poulebaas, ook na premium; de spelers zijn
--      daarna zonder team.
--   5. De tabel pool_teams en de kolom team_id zijn niet rechtstreeks te
--      lezen of te schrijven; poule_ophalen geeft de teams en het team per
--      speler mee.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('aaaaaaaa-0000-0000-0000-0000000000b2', null, null, true),  -- Anna, poulebaas van A
  ('bbbbbbbb-0000-0000-0000-0000000000b3', null, null, true),  -- Bram, speelt mee in A
  ('cccccccc-0000-0000-0000-0000000000b4', null, null, true);  -- Chris, poulebaas van B (geen premium)

insert into pools (id, name, join_code, premium_tot) values
  ('11111111-0000-0000-0000-0000000000b1', 'Bedrijfspoule', 'TEAM01', now() + interval '1 year'),
  ('22222222-0000-0000-0000-0000000000b2', 'Vriendenpoule', 'TEAM02', null);
insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa0000-0000-0000-0000-0000000000b1', '11111111-0000-0000-0000-0000000000b1', 'Anna', 'aaaaaaaa-0000-0000-0000-0000000000b2'),
  ('bbbb0000-0000-0000-0000-0000000000b2', '11111111-0000-0000-0000-0000000000b1', 'Bram', 'bbbbbbbb-0000-0000-0000-0000000000b3'),
  ('dddd0000-0000-0000-0000-0000000000b4', '11111111-0000-0000-0000-0000000000b1', 'Dirk', null),
  ('cccc0000-0000-0000-0000-0000000000b3', '22222222-0000-0000-0000-0000000000b2', 'Chris', 'cccccccc-0000-0000-0000-0000000000b4');
update pools set owner_member_id = 'aaaa0000-0000-0000-0000-0000000000b1' where id = '11111111-0000-0000-0000-0000000000b1';
update pools set owner_member_id = 'cccc0000-0000-0000-0000-0000000000b3' where id = '22222222-0000-0000-0000-0000000000b2';

-- Een fout verwachten: de tekst moet `verwacht` bevatten.
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
  rood   uuid;
  blauw  uuid;
  ander  uuid;
  uit    jsonb;
  n      int;
begin
  set local role authenticated;

  -- ============================================================
  --  1. maken en hernoemen: alleen de poulebaas, alleen met premium
  -- ============================================================
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000b3');
  perform pg_temp.fout_bij($q$select public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', null, 'Sales')$q$,
    'alleen de poulebaas', 'een speler maakt geen team');

  perform pg_temp.als('cccccccc-0000-0000-0000-0000000000b4');
  perform pg_temp.fout_bij($q$select public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', null, 'Sales')$q$,
    'alleen de poulebaas', 'de poulebaas van een andere poule ook niet');
  perform pg_temp.fout_bij($q$select public.poule_team_opslaan('22222222-0000-0000-0000-0000000000b2', null, 'Sales')$q$,
    'alleen met premium', 'en in zijn eigen poule niet zonder premium');

  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000b2');
  rood := public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', null, '  Sales ');
  blauw := public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', null, 'IT');
  if rood is null or blauw is null then raise exception 'gezakt: de poulebaas kon geen team maken'; end if;
  raise notice 'ok: de poulebaas maakt teams, met premium';

  -- ============================================================
  --  2. de naam
  -- ============================================================
  perform pg_temp.fout_bij($q$select public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', null, '   ')$q$,
    '1 tot 30 tekens', 'een lege naam kan niet');
  perform pg_temp.fout_bij($q$select public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', null, repeat('x', 31))$q$,
    '1 tot 30 tekens', 'een naam van 31 tekens ook niet');
  perform pg_temp.fout_bij($q$select public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', null, 'sales')$q$,
    'al een team met die naam', 'twee keer dezelfde naam, ook met andere hoofdletters, kan niet');
  perform public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', rood, 'Verkoop');
  if not exists (select 1 from jsonb_array_elements(public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000b1') -> 'teams') t
                 where t ->> 'id' = rood::text and t ->> 'naam' = 'Verkoop') then
    raise exception 'gezakt: hernoemen werkte niet';
  end if;
  raise notice 'ok: hernoemen kan, en de spaties eromheen gaan eraf';
  for n in 3..20 loop
    perform public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', null, 'Team ' || n);
  end loop;
  perform pg_temp.fout_bij($q$select public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', null, 'Team 21')$q$,
    'hoogstens 20 teams', 'een 21e team kan niet');

  -- ============================================================
  --  3. een team kiezen
  -- ============================================================
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000b3');
  perform public.poule_team_kiezen('bbbb0000-0000-0000-0000-0000000000b2', blauw);
  perform pg_temp.fout_bij(format($q$select public.poule_team_kiezen('aaaa0000-0000-0000-0000-0000000000b1', %L)$q$, blauw),
    'alleen je eigen team', 'een speler zet een medespeler niet in een team');
  perform pg_temp.fout_bij(format($q$select public.poule_team_kiezen('dddd0000-0000-0000-0000-0000000000b4', %L)$q$, blauw),
    'alleen je eigen team', 'ook niet een speler zonder account');

  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000b2');
  perform public.poule_team_kiezen('dddd0000-0000-0000-0000-0000000000b4', rood);
  perform public.poule_team_kiezen('aaaa0000-0000-0000-0000-0000000000b1', rood);
  uit := public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000b1');
  select count(*) into n from jsonb_array_elements(uit -> 'leden') l
   where (l ->> 'member_id' = 'bbbb0000-0000-0000-0000-0000000000b2' and l ->> 'team_id' = blauw::text)
      or (l ->> 'member_id' = 'dddd0000-0000-0000-0000-0000000000b4' and l ->> 'team_id' = rood::text)
      or (l ->> 'member_id' = 'aaaa0000-0000-0000-0000-0000000000b1' and l ->> 'team_id' = rood::text);
  if n <> 3 then raise exception 'gezakt: de teams per speler kloppen niet in poule_ophalen (%)', uit -> 'leden'; end if;
  if jsonb_array_length(uit -> 'teams') <> 20 then raise exception 'gezakt: poule_ophalen geeft niet alle teams'; end if;
  raise notice 'ok: je kiest je eigen team, de poulebaas zet iedereen in een team, en poule_ophalen geeft het mee';

  -- Een team uit een andere poule kan niet.
  reset role;
  insert into pool_teams (id, pool_id, naam) values
    ('99999999-0000-0000-0000-0000000000b9', '22222222-0000-0000-0000-0000000000b2', 'Vreemd');
  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000b2');
  perform pg_temp.fout_bij($q$select public.poule_team_kiezen('aaaa0000-0000-0000-0000-0000000000b1', '99999999-0000-0000-0000-0000000000b9')$q$,
    'hoort niet bij deze poule', 'een team uit een andere poule kiezen kan niet');

  -- ============================================================
  --  5. niet rechtstreeks
  -- ============================================================
  perform pg_temp.fout_bij($q$select * from public.pool_teams$q$, 'permission denied', 'pool_teams is niet rechtstreeks te lezen');
  perform pg_temp.fout_bij($q$insert into public.pool_teams (pool_id, naam) values ('11111111-0000-0000-0000-0000000000b1', 'Stiekem')$q$,
    'permission denied', 'en niet rechtstreeks te schrijven');
  perform pg_temp.fout_bij(format($q$update public.pool_members set team_id = %L where member_id = 'aaaa0000-0000-0000-0000-0000000000b1'$q$, blauw),
    'permission denied', 'team_id is niet rechtstreeks te zetten');

  -- ============================================================
  --  3 (vervolg) en 4. na premium
  -- ============================================================
  reset role;
  update pools set premium_tot = now() - interval '1 day' where id = '11111111-0000-0000-0000-0000000000b1';
  set local role authenticated;
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000b2');
  perform pg_temp.fout_bij($q$select public.poule_team_opslaan('11111111-0000-0000-0000-0000000000b1', null, 'Nieuw')$q$,
    'alleen met premium', 'na premium geen nieuwe teams');
  perform pg_temp.fout_bij(format($q$select public.poule_team_kiezen('aaaa0000-0000-0000-0000-0000000000b1', %L)$q$, blauw),
    'alleen met premium', 'en geen team meer kiezen');
  perform pg_temp.als('bbbbbbbb-0000-0000-0000-0000000000b3');
  perform public.poule_team_kiezen('bbbb0000-0000-0000-0000-0000000000b2', null);
  raise notice 'ok: geen team kiezen kan altijd';
  perform pg_temp.fout_bij(format($q$select public.poule_team_weghalen(%L)$q$, rood),
    'alleen de poulebaas', 'een speler haalt geen team weg');
  perform pg_temp.als('aaaaaaaa-0000-0000-0000-0000000000b2');
  perform public.poule_team_weghalen(rood);
  uit := public.poule_ophalen(p_id => '11111111-0000-0000-0000-0000000000b1');
  if exists (select 1 from jsonb_array_elements(uit -> 'teams') t where t ->> 'id' = rood::text)
     or exists (select 1 from jsonb_array_elements(uit -> 'leden') l where l ->> 'team_id' = rood::text) then
    raise exception 'gezakt: het weggehaalde team of zijn spelers staan er nog';
  end if;
  raise notice 'ok: de poulebaas haalt een team weg, ook na premium, en de spelers zijn dan zonder team';
end $$;

do $$ begin raise notice 'ok: teams.test.sql helemaal geslaagd'; end $$;
