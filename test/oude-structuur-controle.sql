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

  -- 3. de foreign key die eerst 42830 gaf, ligt er nu wel
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.predictions'::regclass
      and conname  = 'predictions_member_fk'
  ) then
    raise exception 'gezakt: predictions_member_fk ontbreekt';
  end if;
  raise notice 'ok: foreign key van predictions naar pool_members ligt er';

  -- 4. de gegevens die er al stonden zijn er nog
  select count(*) into n from public.pool_members;
  if n <> 1 then raise exception 'gezakt: % spelers in plaats van 1', n; end if;
  select count(*) into n from public.pools;
  if n <> 1 then raise exception 'gezakt: % poules in plaats van 1', n; end if;
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
  raise notice 'ok: ontbrekende kolommen zijn bijgemaakt';
end $$;
