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

  -- 3b. "bestaat de trigger" is niet hetzelfde als "doet hij zijn werk".
  --
  --     answers_deadline stond lang op `insert or update`. Een antwoord dat
  --     vastligt kon je dan verwijderen en opnieuw invoeren: de regel omzeild
  --     zonder hem te breken. De controleregel zei al die tijd 'ok', want hij
  --     keek alleen of er een trigger met die naam stond.
  drop trigger answers_deadline on public.answers;
  create trigger answers_deadline before insert or update on public.answers
    for each row execute function public.poule_antwoord_deadline();
  select uitkomst into gevonden from public.poule_controle
   where controle = 'deadline-trigger op answers';
  if gevonden = 'ok' then
    raise exception 'gezakt: een trigger zonder delete werd als ok gemeld';
  end if;
  raise notice 'ok: een trigger zonder delete wordt gemeld (%)', gevonden;

  drop trigger answers_deadline on public.answers;
  create trigger answers_deadline before insert or update or delete on public.answers
    for each row execute function public.poule_antwoord_deadline();
  select uitkomst into gevonden from public.poule_controle
   where controle = 'deadline-trigger op answers';
  if gevonden <> 'ok' then
    raise exception 'gezakt: de volledige trigger geeft % in plaats van ok', gevonden;
  end if;
  raise notice 'ok: en met delete erbij staat hij weer op ok';

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

  -- 4b. rondt het seizoen ooit af?
  --
  --     De seizoenslaag wordt pas gescoord als élke race een uitslag heeft of
  --     afgelast is. Blijft er één hangen, dan leveren die honderdvijftig
  --     punten nooit iets op en blijft "Begin aan het volgende seizoen"
  --     grijs -- en dat merk je pas aan het eind van het jaar.
  insert into public.races (id, season, round, name, deadline_quali, deadline_race,
                            race_result, afgelast)
  values (9301, 2026, 91, 'Gereden',  now() - interval '30 days',
          now() - interval '29 days', array['1','4'], false),
         (9302, 2026, 92, 'Afgelast', now() - interval '20 days',
          now() - interval '19 days', null, true),
         (9303, 2026, 93, 'Hangt',    now() - interval '15 days',
          now() - interval '14 days', null, false);

  select uitkomst into gevonden from public.poule_controle
   where controle = 'afgelaste races';
  if gevonden <> '1' then
    raise exception 'gezakt: % afgelaste races in plaats van 1', gevonden;
  end if;

  select uitkomst into gevonden from public.poule_controle
   where controle = 'seizoen 2026 rond';
  if gevonden <> 'nog 1 te gaan' then
    raise exception 'gezakt: het seizoen heet % in plaats van "nog 1 te gaan"', gevonden;
  end if;
  raise notice 'ok: een race die nog moet komen houdt het seizoen open (%)', gevonden;

  -- Een afgelaste race mag het seizoen níét openhouden; daar komt nooit meer
  -- een uitslag van.
  -- Mét de naam erbij: op het moment dat hier iets staat wil je weten wélke
  -- race, niet hoevéél. Zonder naam is de volgende stap "uitzoeken welke", en
  -- dat is precies de stap waar je op afhaakt.
  select uitkomst into gevonden from public.poule_controle
   where controle like 'blijven hangen%';
  if gevonden <> '1: Hangt (ronde 93)' then
    raise exception 'gezakt: er staat "%" in plaats van "1: Hangt (ronde 93)"', gevonden;
  end if;
  raise notice 'ok: een race die een week na zijn deadline niets heeft wordt bij naam gemeld';

  -- Zodra hij binnenkomt is het seizoen rond en hangt er niets meer.
  update public.races set race_result = array['1','4'] where id = 9303;
  select uitkomst into gevonden from public.poule_controle
   where controle = 'seizoen 2026 rond';
  if gevonden <> 'ok' then
    raise exception 'gezakt: met alles binnen heet het seizoen % in plaats van ok', gevonden;
  end if;
  select uitkomst into gevonden from public.poule_controle
   where controle like 'blijven hangen%';
  if gevonden <> '0' then
    raise exception 'gezakt: er hangt nog % nadat alles binnen is', gevonden;
  end if;
  raise notice 'ok: en met alles binnen is het seizoen rond';

  delete from public.races where id in (9301, 9302, 9303);

  -- Zonder kalender is er niets om rond te zijn. "ok" zou hier gelden omdat
  -- er geen race is die het tegenspreekt, en dat is precies het soort ok waar
  -- je niets aan hebt.
  select uitkomst into gevonden from public.poule_controle
   where controle = 'seizoen 2026 rond';
  if gevonden <> 'geen kalender' then
    raise exception 'gezakt: een lege kalender heet % in plaats van "geen kalender"', gevonden;
  end if;
  raise notice 'ok: en een lege kalender zegt dat er geen kalender is';

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

-- ============================================================
--  6. De jokergrens: staat hij er, en ziet de tabel het als hij weg is
-- ============================================================
--
-- De jokergrens verhuisde van de app naar de database, en de controletabel
-- zei er niets over. Een uitdraai kon je dus niet vertellen of je
-- schema.sql-run gelukt was -- en dat is precies waar die tabel voor is.
--
-- Alle drie de uitkomsten worden hier langsgelopen, want een regel die alleen
-- 'ok' kan zeggen controleert niets.

do $$
declare
  gevonden text;
  n        int;
begin
  select uitkomst into gevonden from public.poule_controle
   where controle = 'jokeraantal: grens en bewaking';
  if gevonden is null then
    raise exception 'gezakt: de regel over de jokergrens staat niet in de tabel';
  end if;
  if gevonden <> 'ok' then
    raise exception 'gezakt: vers gedraaid schema zegt al "%"', gevonden;
  end if;
  raise notice 'ok: een vers gedraaid schema meldt de jokergrens als in orde';

  -- De bewaking weg: verlagen onder wat er ligt zou dan stilletjes mogen.
  drop trigger pools_jokeraantal on public.pools;
  select uitkomst into gevonden from public.poule_controle
   where controle = 'jokeraantal: grens en bewaking';
  if gevonden not like 'ZONDER BEWAKING%' then
    raise exception 'gezakt: zonder de trigger zegt de tabel "%"', gevonden;
  end if;
  raise notice 'ok: een ontbrekende bewaking wordt gemeld (%)', gevonden;
  create trigger pools_jokeraantal
    before update on public.pools
    for each row execute function public.poule_jokeraantal_bewaken();

  -- De grens weg: dan mag er ineens nul of zes in.
  alter table public.pools drop constraint pools_jokers_aantal;
  select uitkomst into gevonden from public.poule_controle
   where controle = 'jokeraantal: grens en bewaking';
  if gevonden not like 'GRENS 1-5 ONTBREEKT%' then
    raise exception 'gezakt: zonder de check zegt de tabel "%"', gevonden;
  end if;
  raise notice 'ok: een ontbrekende grens wordt gemeld (%)', gevonden;
  alter table public.pools add constraint pools_jokers_aantal
    check (jokers_aantal between 1 and 5);

  -- En de teller die zegt of iemand ervan afgeweken is.
  select uitkomst::int into n from public.poule_controle
   where controle = 'poules met een eigen jokeraantal';
  if n <> 0 then
    raise exception 'gezakt: zonder afwijking telt hij er %', n;
  end if;
  raise notice 'ok: zonder afwijking staat de teller op nul';

  -- Dit bestand maakt zelf geen poules aan, dus hier eentje die alleen voor
  -- deze telling bestaat en meteen weer weggaat. pools.id is een uuid.
  insert into public.pools (name, season, jokers_aantal)
  values ('Controlepoule', 2026, 3);
  select uitkomst::int into n from public.poule_controle
   where controle = 'poules met een eigen jokeraantal';
  if n <> 1 then
    raise exception 'gezakt: na één afwijking telt hij er %', n;
  end if;
  raise notice 'ok: en een poule die ervan afwijkt wordt geteld';

  update public.pools set jokers_aantal = 5 where name = 'Controlepoule';
  select uitkomst::int into n from public.poule_controle
   where controle = 'poules met een eigen jokeraantal';
  if n <> 0 then
    raise exception 'gezakt: terug op vijf telt hij er nog %', n;
  end if;
  raise notice 'ok: en terug op vijf telt hij niet meer mee';
  delete from public.pools where name = 'Controlepoule';
end $$;
