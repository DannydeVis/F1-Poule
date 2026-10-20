-- Controleert of schema.sql de oudere tabelstructuur uit oude-structuur.sql
-- heeft rechtgezet: sleutels erbij, gegevens ongemoeid.

\set ON_ERROR_STOP on

do $$
declare n bigint;
begin
  -- 1. member_id heeft nu een sleutel op zichzelf, naast de samengestelde PK
  if not exists (
    select 1 from (
      select tc.constraint_name,
             count(*)             as aantal,
             min(kcu.column_name) as kolom
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on  kcu.constraint_name   = tc.constraint_name
        and kcu.constraint_schema = tc.constraint_schema
      where tc.table_schema = 'public'
        and tc.table_name   = 'pool_members'
        and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')
      group by tc.constraint_name
    ) s
    where s.aantal = 1 and s.kolom = 'member_id'
  ) then
    raise exception 'gezakt: pool_members.member_id heeft nog geen eigen sleutel';
  end if;
  raise notice 'ok: unieke sleutel op pool_members.member_id toegevoegd';

  -- 2. de samengestelde primaire sleutel is niet weggegooid
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.pool_members'::regclass and contype = 'p'
  ) then
    raise exception 'gezakt: de bestaande primaire sleutel is verdwenen';
  end if;
  raise notice 'ok: de bestaande primaire sleutel is niet aangetast';

  -- 3. de foreign key die eerst 42830 gaf, ligt er nu wel.
  --    Stond eerst op predictions; die tabel is weg, maar answers wijst naar
  --    dezelfde kolom en liep dus tegen dezelfde 42830 aan.
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.answers'::regclass
      and conname  = 'answers_member_fk'
  ) then
    raise exception 'gezakt: answers_member_fk ontbreekt';
  end if;
  raise notice 'ok: foreign key van answers naar pool_members ligt er';

  -- 3b. en de oude tabel is meegenomen, ook vanuit deze structuur.
  if to_regclass('public.predictions') is not null then
    raise exception 'gezakt: predictions staat er nog na een run op een oude structuur';
  end if;
  raise notice 'ok: de oude predictions-tabel is ook hier opgeruimd';

  -- 4. de gegevens die er al stonden zijn er nog
  select count(*) into n from public.pool_members;
  if n <> 1 then raise exception 'gezakt: % spelers in plaats van 1', n; end if;
  select count(*) into n from public.pools;
  if n <> 2 then raise exception 'gezakt: % poules in plaats van 2 (de poule en de open poule)', n; end if;
  select count(*) into n from public.races;
  if n <> 1 then raise exception 'gezakt: % races in plaats van 1', n; end if;
  raise notice 'ok: poule, speler en race zijn bewaard gebleven';

  -- 5. de kolommen die de oude opzet miste, zijn bijgemaakt
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'races' and column_name = 'drivers'
  ) then
    raise exception 'gezakt: races.drivers is niet bijgemaakt';
  end if;
  -- pools.beschrijving is er later bij gekomen; een bestaande database moet
  -- hem er dus bij krijgen, niet pas bij een nieuwe installatie.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pools' and column_name = 'beschrijving'
  ) then
    raise exception 'gezakt: pools.beschrijving is niet bijgemaakt';
  end if;
  -- En andersom voor de inleg: die kolommen horen juist wég te zijn. Een
  -- oude database die ze nog had moet ze bij het opnieuw draaien van
  -- schema.sql kwijtraken, anders blijven er bedragen en betaallinks staan
  -- van een functie die er niet meer is.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pools'
      and column_name in ('inleg', 'betaallink')
  ) then
    raise exception 'gezakt: pools.inleg of pools.betaallink staat er nog';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pool_members' and column_name = 'betaald'
  ) then
    raise exception 'gezakt: pool_members.betaald staat er nog';
  end if;
  raise notice 'ok: ontbrekende kolommen zijn bijgemaakt';
end $$;

-- Wat er in productie nog stond uit een vroege opzet (oude-structuur.sql,
-- onderaan): twee policies die anon alles gaven en een losse triggerfunctie.
-- schema.sql kent hun namen niet en hoort ze toch weg te halen.
do $$
declare
  over text;
begin
  select string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname) into over
    from pg_policies
   where schemaname = 'public' and policyname in ('pools_all', 'members_all');
  if over is not null then
    raise exception 'gezakt: deze policies uit een vroege opzet staan er nog: %', over;
  end if;
  if to_regprocedure('public.check_deadlines()') is not null then
    raise exception 'gezakt: check_deadlines() staat er nog';
  end if;
  select uitkomst into over from public.poule_controle where controle = 'policies: alleen die uit schema.sql';
  if over is distinct from 'ok' then
    raise exception 'gezakt: na schema.sql zegt de controletabel over de policies "%"', over;
  end if;
  raise notice 'ok: policies en een functie uit een vroege opzet zijn weg, ook zonder dat schema.sql hun namen kent';
end $$;

-- Het maximum aantal spelers (17 oktober): de eerste run zet de open poule op
-- 200 en de rest op 500. Daarna blijft staan wat het beheer kiest, ook als
-- schema.sql opnieuw draait.
do $$
begin
  if (select max_spelers from public.pools where join_code = '80C98C') <> 200
     or (select max_spelers from public.pools where join_code = 'RTM026') <> 500 then
    raise exception 'gezakt: na de eerste run staan de maxima op % en % in plaats van 200 en 500',
      (select max_spelers from public.pools where join_code = '80C98C'),
      (select max_spelers from public.pools where join_code = 'RTM026');
  end if;
  raise notice 'ok: de eerste run zet de open poule op 200 spelers en de rest op 500';
  update public.pools set max_spelers = 300 where join_code = '80C98C';
end $$;
\o /dev/null
\ir ../schema.sql
\o
do $$
begin
  if (select max_spelers from public.pools where join_code = '80C98C') <> 300 then
    raise exception 'gezakt: een tweede run van schema.sql zette het maximum van de open poule terug';
  end if;
  raise notice 'ok: een tweede run laat het maximum dat het beheer koos staan';
end $$;


-- De restanten van PadelBracket (20 oktober): weg, en de controletabel kent
-- daarna alleen nog wat schema.sql maakt.
do $$
declare over text;
begin
  if to_regclass('public.account_items') is not null or to_regclass('public.site_admins') is not null then
    raise exception 'gezakt: account_items of site_admins staat er nog';
  end if;
  if to_regprocedure('public.beheer_adres()') is not null then
    raise exception 'gezakt: beheer_adres() staat er nog';
  end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace
             and proname in ('admin_accounts','admin_dashboard','admin_gate','admin_day','admin_address',
                             'is_admin','delete_my_account','account_items_cap','account_sync')) then
    raise exception 'gezakt: er staat nog een functie van PadelBracket';
  end if;
  select uitkomst into over from public.poule_controle
   where controle = 'functies en tabellen: alleen die uit schema.sql';
  if over is distinct from 'ok' then
    raise exception 'gezakt: de controletabel zegt over functies en tabellen "%"', over;
  end if;
  raise notice 'ok: de tabellen en functies van PadelBracket zijn weg, en de controletabel zegt ok';
end $$;
