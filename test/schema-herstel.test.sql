-- Controleert of een tweede run van schema.sql de tabel heeft hersteld die
-- schema-gedrag.test.sql opzettelijk beschadigde: de unieke sleutel terug,
-- de dubbele rij weg, en de nieuwste van de twee bewaard.

\set ON_ERROR_STOP on

do $$
declare
  n  int;
  p1 text;
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.predictions'::regclass and conname = 'predictions_uniek'
  ) then
    raise exception 'gezakt: de unieke sleutel is niet teruggezet';
  end if;
  raise notice 'ok: unieke sleutel op predictions hersteld';

  if exists (
    select 1 from public.predictions group by pool_id, race_id, member_id having count(*) > 1
  ) then
    raise exception 'gezakt: er staan nog dubbele voorspellingen';
  end if;
  raise notice 'ok: geen dubbele voorspellingen meer';

  select count(*) into n from public.predictions where race_id = 1;
  if n <> 1 then raise exception 'gezakt: % rijen voor ronde 1 in plaats van 1', n; end if;

  -- De rij met de nieuwste updated_at hoort te blijven staan.
  select race_top10[1] into p1 from public.predictions where race_id = 1;
  if p1 is distinct from '99' then
    raise exception 'gezakt: de verkeerde rij is bewaard (P1 = %, verwacht 99)', p1;
  end if;
  raise notice 'ok: de nieuwste van de twee dubbele rijen is bewaard';

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.predictions'::regclass and tgname = 'predictions_deadline'
  ) then
    raise exception 'gezakt: de deadline-trigger ontbreekt';
  end if;
  raise notice 'ok: deadline-trigger staat er nog';
end $$;
