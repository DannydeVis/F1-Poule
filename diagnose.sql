-- ============================================================
--  F1 Poule — wat staat er nu eigenlijk in de database?
--
--  Leest alleen, verandert niets. Draai dit in de Supabase SQL editor als
--  schema.sql een fout geeft, en plak de uitkomst in het gesprek.
--
--  Het schema is tijdens de bouw meerdere keren veranderd en
--  "create table if not exists" past een bestaande tabel niet aan, dus de
--  echte structuur kan afwijken van wat schema.sql denkt aan te maken.
-- ============================================================

with verwacht as (
  select * from (values
    ('pools',        1),
    ('pool_members', 2),
    ('races',        3),
    ('predictions',  4)
  ) as v(tabel, volgorde)
),
bestaat as (
  select w.tabel, w.volgorde,
         exists (
           select 1 from information_schema.tables t
           where t.table_schema = 'public' and t.table_name = w.tabel
         ) as aanwezig
  from verwacht w
),
kolommen as (
  select c.table_name as tabel,
         string_agg(
           c.column_name || ' ' || c.data_type ||
           case when c.is_nullable = 'NO' then ' niet-leeg' else '' end,
           ', ' order by c.ordinal_position) as tekst
  from information_schema.columns c
  join verwacht w on w.tabel = c.table_name
  where c.table_schema = 'public'
  group by c.table_name
),
sleutels as (
  select tc.table_name as tabel,
         string_agg(
           case tc.constraint_type
             when 'PRIMARY KEY' then 'PK'
             when 'UNIQUE'      then 'UNIEK'
             when 'FOREIGN KEY' then 'FK'
           end || ' (' || k.kolommen || ')', ', ' order by tc.constraint_type) as tekst
  from information_schema.table_constraints tc
  join verwacht w on w.tabel = tc.table_name
  join lateral (
    select string_agg(kcu.column_name, ',' order by kcu.ordinal_position) as kolommen
    from information_schema.key_column_usage kcu
    where kcu.constraint_name   = tc.constraint_name
      and kcu.constraint_schema = tc.constraint_schema
  ) k on true
  where tc.table_schema = 'public'
    and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
  group by tc.table_name
),
aantallen as (
  select b.tabel,
         (xpath('/row/cnt/text()',
            query_to_xml(format('select count(*) as cnt from public.%I', b.tabel),
                         false, true, '')))[1]::text::bigint as rijen
  from bestaat b where b.aanwezig
)
select b.tabel                                        as tabel,
       case when b.aanwezig then 'ja' else 'ONTBREEKT' end as bestaat,
       coalesce(a.rijen::text, '-')                   as rijen,
       coalesce(s.tekst, 'geen')                      as sleutels,
       coalesce(k.tekst, '-')                         as kolommen
from bestaat b
left join kolommen  k on k.tabel = b.tabel
left join sleutels  s on s.tabel = b.tabel
left join aantallen a on a.tabel = b.tabel

union all

select '— trigger —',
       case when exists (
         select 1 from pg_trigger
         where tgrelid = to_regclass('public.predictions')
           and tgname = 'predictions_deadline'
       ) then 'aanwezig' else 'ontbreekt' end,
       '-', '-', 'deadline-bewaking op predictions'

union all

select '— RLS —',
       coalesce((
         select string_agg(c.relname || '=' ||
                  case when c.relrowsecurity then 'aan' else 'UIT' end, ', ' order by c.relname)
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname in ('pools','pool_members','races','predictions')
       ), 'geen tabellen'),
       '-', '-', 'row level security per tabel'

order by 1;
