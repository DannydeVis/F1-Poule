-- De controletabel onderaan schema.sql.
--
-- Dit bestand bestaat omdat die tabel stilletjes was verouderd. Hij telde
-- negen vragen terwijl er veertien stonden, en twee handmatig-vlaggen terwijl
-- er zeven waren. Dat is erger dan geen controle: een regel die "14" zegt waar
-- "ok" hoort te staan laat je zoeken naar een probleem dat er niet is, en een
-- regel die "0 handmatig ingevuld" zegt terwijl iemand een sprintuitslag met
-- de hand heeft gezet verzwijgt precies wat hij hoort te melden.
--
-- Vandaar deze test, en vandaar dat de tabel nu een view is: iets wat je
-- alleen ziet door het hele schema opnieuw te draaien, kun je niet nalopen.
--
-- Draai dit op een verse database na schema.sql. Elke mislukte controle gooit
-- een exception, zodat psql met ON_ERROR_STOP=1 de build laat zakken.

\set ON_ERROR_STOP on

do $$
declare
  gevonden text;
  n        int;
begin
  -- 1. de view bestaat -- en is juist níét voor de app-rollen open. "Hoeveel
  --    poules en spelers zijn er" is precies het soort overzicht dat fase 0
  --    heeft dichtgezet, en de app vraagt deze view nooit op.
  if not exists (select 1 from pg_views
                 where schemaname = 'public' and viewname = 'poule_controle') then
    raise exception 'gezakt: de view poule_controle bestaat niet';
  end if;
  raise notice 'ok: poule_controle bestaat als view';

  if has_table_privilege('anon', 'public.poule_controle', 'select')
     or has_table_privilege('authenticated', 'public.poule_controle', 'select') then
    raise exception 'gezakt: anon of authenticated mag poule_controle lezen';
  end if;
  raise notice 'ok: en anon noch authenticated mag hem lezen';

  -- 2. op een verse database staat overal waar 'ok' hoort ook 'ok'
  select string_agg(controle, ', ') into gevonden
    from public.poule_controle
   where uitkomst not in ('ok')
     and controle in ('unieke sleutel op predictions', 'deadline-trigger',
                      'deadline-trigger op answers', 'dubbele voorspellingen',
                      'vragen in de lijst');
  if gevonden is not null then
    raise exception 'gezakt: deze regels zeggen geen ok: %', gevonden;
  end if;
  raise notice 'ok: alle ja-nee-regels staan op ok';

  -- 3. "vragen in de lijst" hangt aan namen en niet aan een aantal.
  --    Dit is de regel die verouderde. Haal er één weg en hij hoort te
  --    klagen; de telling van veertien deed dat niet als er ook een
  --    vijftiende bij stond.
  delete from public.questions where id = 'vierde_team';
  select uitkomst into gevonden from public.poule_controle
   where controle = 'vragen in de lijst';
  if gevonden = 'ok' then
    raise exception 'gezakt: met een ontbrekende vraag zegt hij nog steeds ok';
  end if;
  raise notice 'ok: een ontbrekende vraag wordt gemeld (%)', gevonden;

  insert into public.questions (id, naam, punten, sessie, soort, gok, volgorde)
  values ('vierde_team', 'Vierde team bij de constructeurs', 30, 'seizoen', 'team', false, 240);
  select uitkomst into gevonden from public.poule_controle
   where controle = 'vragen in de lijst';
  if gevonden <> 'ok' then
    raise exception 'gezakt: met alle vragen terug zegt hij % in plaats van ok', gevonden;
  end if;
  raise notice 'ok: en met alle vragen terug staat hij weer op ok';

  -- 4. de puntentotalen. Eén getal over álle vragen stond er eerst, en dat
  --    gaf 377: weekend, sprint en seizoenslaag bij elkaar opgeteld. De app
  --    toont ze juist apart, want de sprint komt op zes van de vierentwintig
  --    weekenden langs en de seizoenslaag één keer per jaar.
  select uitkomst into gevonden from public.poule_controle
   where controle = 'punten per weekend: Simpel / Klassiek / Gevorderd';
  if gevonden <> '100 / 145 / 202' then
    raise exception 'gezakt: de presets geven % in plaats van 100 / 145 / 202', gevonden;
  end if;
  raise notice 'ok: de presets per weekend zijn 100 / 145 / 202';

  select uitkomst into gevonden from public.poule_controle
   where controle = 'daarbovenop: sprint / seizoen';
  if gevonden <> '25 / 150' then
    raise exception 'gezakt: sprint en seizoen geven % in plaats van 25 / 150', gevonden;
  end if;
  raise notice 'ok: de sprint en de seizoenslaag staan er apart onder';

  -- 5. handmatig ingevulde uitslagen: álle zeven vlaggen, niet twee.
  --    Per vlag apart, want het gaat er juist om dat er geen enkele
  --    overgeslagen wordt.
  insert into public.races (id, season, round, name, deadline_quali, deadline_race)
  values (9101, 2026, 91, 'Controlerace', now() + interval '1 day', now() + interval '2 days');

  foreach gevonden in array array['quali_handmatig', 'race_handmatig', 'sprint_handmatig',
                                  'fastest_lap_handmatig', 'fastest_pitstop_handmatig',
                                  'safety_cars_handmatig', 'rode_vlag_handmatig']
  loop
    execute format('update public.races set %I = true where id = 9101', gevonden);
    select uitkomst::int into n from public.poule_controle
     where controle = 'handmatig ingevulde uitslagen';
    if n <> 1 then
      raise exception 'gezakt: % wordt niet meegeteld (de teller staat op %)', gevonden, n;
    end if;
    execute format('update public.races set %I = false where id = 9101', gevonden);
  end loop;
  raise notice 'ok: alle zeven handmatig-vlaggen worden geteld';

  select uitkomst::int into n from public.poule_controle
   where controle = 'handmatig ingevulde uitslagen';
  if n <> 0 then
    raise exception 'gezakt: zonder vlaggen telt hij er %', n;
  end if;
  raise notice 'ok: en zonder vlaggen staat hij op nul';

  delete from public.races where id = 9101;
end $$;
