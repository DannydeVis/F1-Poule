-- races is de enige tabel die door álle poules gedeeld wordt: één rij per race
-- per seizoen, zonder pool_id. Wie daarin schreef veranderde de uitslag voor
-- iedereen die het seizoen volgt, niet alleen voor zijn eigen poule.
--
-- Zolang het vrienden waren was dat te verdedigen, en sync.html had het nodig.
-- Publiek is het een knop waarmee één iemand elke poule in de app sloopt, dus
-- staat de tabel nu op alleen-lezen voor anon en authenticated. De sync draait
-- op een runner met de service_role key en gaat overal langs, ook langs RLS.
--
-- Deze test draait als anon en als authenticated en controleert dat lezen mag
-- en schrijven niet. Zonder deze test zou een `for all` die er per ongeluk
-- weer in glipt niemand opvallen.

\set ON_ERROR_STOP on

insert into races (id, season, round, name, quali_result)
values (900, 2026, 90, 'Testcircuit', array['1','44']);

do $$
declare gelukt boolean;
begin
  -- ---- anon --------------------------------------------------------------
  set local role anon;

  perform 1 from races where id = 900;
  if not found then raise exception 'gezakt: anon mag races niet eens lezen'; end if;
  raise notice 'ok: anon mag races lezen';

  gelukt := false;
  begin
    update races set race_result = array['99'] where id = 900;
    -- RLS geeft geen fout bij een update die niets mag raken; hij raakt
    -- gewoon nul rijen. Dat is het verschil dat we hier moeten meten.
    if found then gelukt := true; end if;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: anon kon een uitslag overschrijven'; end if;
  raise notice 'ok: anon kan een uitslag niet overschrijven';

  gelukt := false;
  begin
    insert into races (season, round, name) values (2026, 91, 'Stiekem');
    gelukt := true;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: anon kon een race toevoegen'; end if;
  raise notice 'ok: anon kan geen race toevoegen';

  gelukt := false;
  begin
    delete from races where id = 900;
    if found then gelukt := true; end if;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: anon kon een race verwijderen'; end if;
  raise notice 'ok: anon kan geen race verwijderen';

  -- ---- authenticated: dezelfde grens ------------------------------------
  set local role authenticated;

  perform 1 from races where id = 900;
  if not found then raise exception 'gezakt: authenticated mag races niet lezen'; end if;

  gelukt := false;
  begin
    update races set race_result = array['99'] where id = 900;
    if found then gelukt := true; end if;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: authenticated kon een uitslag overschrijven'; end if;
  raise notice 'ok: authenticated mag lezen maar niet schrijven';

  reset role;

  -- ---- en de uitslag staat er nog ongeschonden ---------------------------
  if (select race_result from races where id = 900) is not null then
    raise exception 'gezakt: er is toch een race_result weggeschreven';
  end if;
  if (select quali_result from races where id = 900) <> array['1','44'] then
    raise exception 'gezakt: de quali_result is veranderd';
  end if;
  raise notice 'ok: de uitslag is onaangetast';
end $$;

delete from races where id = 900;
