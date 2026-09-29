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

  -- Ook als er ooit weer een grant bij komt: de view leest met de rechten van
  -- wie hem opvraagt, dus via hem komt niemand bij auth.users. Dat zijn de
  -- twee fouten die de Security Advisor van Supabase op 29 september meldde
  -- ("Exposed Auth Users" en "Security Definer View").
  if not exists (select 1 from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
                 where ns.nspname = 'public' and c.relname = 'poule_controle'
                   and 'security_invoker=true' = any(c.reloptions)) then
    raise exception 'gezakt: poule_controle leest met de rechten van zijn eigenaar (geen security_invoker)';
  end if;
  raise notice 'ok: en hij leest met de rechten van wie hem opvraagt (security_invoker)';

  -- En voor elke view die er ooit bij komt dezelfde regel als de Security
  -- Advisor: een view in public die anon of authenticated kan lezen, moet
  -- security_invoker zijn.
  select string_agg(c.relname, ', ') into gevonden
    from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
   where ns.nspname = 'public' and c.relkind in ('v', 'm')
     and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select'))
     and (c.relkind = 'm' or not coalesce('security_invoker=true' = any(c.reloptions), false));
  if gevonden is not null then
    raise exception 'gezakt: deze views zijn via de API te lezen met de rechten van hun eigenaar: %', gevonden;
  end if;
  raise notice 'ok: geen enkele view in public is via de API te lezen met de rechten van zijn eigenaar';

  -- 2. op een verse database staat overal waar 'ok' hoort ook 'ok'
  select string_agg(controle, ', ') into gevonden
    from public.poule_controle
   where uitkomst not in ('ok')
     and controle in ('deadline-trigger op answers', 'vragen in de lijst',
                      'jokeraantal: grens en bewaking',
                      'spelers: niemand gebruikt andermans speler of naam',
                      'voorspellingen geheim tot de deadline');
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
  -- Zonder races gaat de tabel over het jaar van vandaag (controle_seizoen()),
  -- dus hier niet op 2026 zoeken: dan zou deze controle vanaf januari 2027
  -- niets meer vinden, en null <> 'geen kalender' laat hem stilletjes slagen.
  select uitkomst into gevonden from public.poule_controle
   where controle like 'seizoen % rond';
  if gevonden is distinct from 'geen kalender' then
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

-- ============================================================
--  7. Andermans speler of naam: staat de bewaking er, en ziet de tabel het
--     als een stuk ervan weg is
-- ============================================================
--
-- Dezelfde les als bij de jokergrens: de bewaking van 28 september kwam
-- zonder regel in de tabel, dus een uitdraai zei niet of hij geland was.
-- Elk stuk wordt hier weggehaald en teruggezet, want een regel die alleen
-- 'ok' kan zeggen controleert niets.

do $$
declare
  regel constant text := 'spelers: niemand gebruikt andermans speler of naam';
  gevonden text;
  tabel    text;
  policy   text;
  rol      text;
  recht    text;
begin
  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden is null then
    raise exception 'gezakt: de regel over andermans speler staat niet in de tabel';
  end if;
  if gevonden <> 'ok' then
    raise exception 'gezakt: vers gedraaid schema zegt al "%"', gevonden;
  end if;
  raise notice 'ok: een vers gedraaid schema meldt de bewaking van spelers als in orde';

  -- De trigger weg: dan kan een lid weer een pagina op andermans speler zetten.
  drop trigger pool_members_bewaken on public.pool_members;
  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden not like 'ZONDER BEWAKING%' then
    raise exception 'gezakt: zonder de trigger zegt de tabel "%"', gevonden;
  end if;
  raise notice 'ok: een ontbrekende bewaking wordt gemeld (%)', gevonden;

  -- Een trigger met die naam die niet op update vuurt, is net zo goed weg.
  create trigger pool_members_bewaken
    before insert on public.pool_members
    for each row execute function public.pool_members_bewaken();
  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden not like 'ZONDER BEWAKING%' then
    raise exception 'gezakt: met een trigger die niet op update vuurt zegt de tabel "%"', gevonden;
  end if;
  raise notice 'ok: en een trigger die niet op update vuurt ook';
  drop trigger pool_members_bewaken on public.pool_members;
  create trigger pool_members_bewaken
    before update on public.pool_members
    for each row execute function public.pool_members_bewaken();

  -- De oude policy terug: daarmee kon je jezelf aan elke speler hangen.
  create policy pool_members_meedoen on public.pool_members
    for insert to anon, authenticated with check (true);
  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden not like 'OUDE MEEDOEN-POLICY%' then
    raise exception 'gezakt: met de oude meedoen-policy zegt de tabel "%"', gevonden;
  end if;
  raise notice 'ok: de oude meedoen-policy wordt gemeld (%)', gevonden;
  drop policy pool_members_meedoen on public.pool_members;

  -- Schrijfrecht op de hele tabel, voor elke rol en elk recht apart. Het
  -- recht op drie kolommen dat er hoort te staan, telt niet mee: op een vers
  -- schema staat het er al, en toen zei de regel 'ok'.
  foreach rol in array array['anon', 'authenticated'] loop
    foreach recht in array array['insert', 'update', 'delete'] loop
      execute format('grant %s on public.pool_members to %I', recht, rol);
      select uitkomst into gevonden from public.poule_controle where controle = regel;
      if gevonden not like 'APP MAG SPELERS SCHRIJVEN%' then
        raise exception 'gezakt: met % voor % zegt de tabel "%"', recht, rol, gevonden;
      end if;
      execute format('revoke %s on public.pool_members from %I', recht, rol);
    end loop;
  end loop;
  grant update (user_id, profiel_code, profiel) on public.pool_members to anon, authenticated;
  raise notice 'ok: schrijfrecht op pool_members wordt gemeld, per rol en per recht';

  -- De naamcontrole weg: dan kan een naam weer leeg of eindeloos lang.
  alter function public.speler_naam(text) rename to speler_naam_weg;
  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden not like 'ZONDER NAAMCONTROLE%' then
    raise exception 'gezakt: zonder speler_naam() zegt de tabel "%"', gevonden;
  end if;
  raise notice 'ok: een ontbrekende naamcontrole wordt gemeld (%)', gevonden;
  alter function public.speler_naam_weg(text) rename to speler_naam;

  -- Elke policy op zich terug naar "wie is lid, mag schrijven". In using of
  -- in with check alleen is ook fout.
  foreach tabel in array array['answers', 'jokers', 'push_abonnementen'] loop
    policy := case tabel when 'answers' then 'answers_eigen'
                         when 'jokers' then 'jokers_eigen'
                         else 'push_eigen' end;
    execute format('alter policy %I on public.%I using (public.is_member(pool_id))', policy, tabel);
    select uitkomst into gevonden from public.poule_controle where controle = regel;
    if gevonden not like 'OUDE POLICIES OP ANTWOORDEN%' then
      raise exception 'gezakt: met een oude using op % zegt de tabel "%"', tabel, gevonden;
    end if;
    execute format('alter policy %I on public.%I using (public.mag_voor_speler_in(member_id, pool_id))
                    with check (public.is_member(pool_id))', policy, tabel);
    select uitkomst into gevonden from public.poule_controle where controle = regel;
    if gevonden not like 'OUDE POLICIES OP ANTWOORDEN%' then
      raise exception 'gezakt: met een oude with check op % zegt de tabel "%"', tabel, gevonden;
    end if;
    execute format('alter policy %I on public.%I using (public.mag_voor_speler_in(member_id, pool_id))
                    with check (public.mag_voor_speler_in(member_id, pool_id))', policy, tabel);
  end loop;
  raise notice 'ok: een oude policy op antwoorden, jokers of meldingen wordt gemeld';

  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden <> 'ok' then
    raise exception 'gezakt: met alles teruggezet zegt de tabel "%"', gevonden;
  end if;
  raise notice 'ok: en met alles teruggezet staat hij weer op ok';
end $$;

-- ============================================================
--  8. Geheim tot de deadline: ziet de tabel het als het weer open staat
-- ============================================================
--
-- Twee plekken waar de antwoorden naar buiten gaan: de leespolicies en
-- poule_ophalen(). Elk weggehaald en teruggezet.

do $$
declare
  regel constant text := 'voorspellingen geheim tot de deadline';
  gevonden text;
begin
  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden is distinct from 'ok' then
    raise exception 'gezakt: vers gedraaid schema zegt "%"', coalesce(gevonden, '(regel ontbreekt)');
  end if;
  raise notice 'ok: een vers gedraaid schema meldt het geheim tot de deadline als in orde';

  -- De oude leespolicy: elk lid leest alles.
  alter policy answers_lezen on public.answers using (public.is_member(pool_id));
  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden not like 'LEZEN VOOR DE DEADLINE KAN NOG%' then
    raise exception 'gezakt: met de oude leespolicy op answers zegt de tabel "%"', gevonden;
  end if;
  alter policy answers_lezen on public.answers
    using (public.is_member(pool_id) and public.antwoord_open(race_id, question_id));

  alter policy jokers_lezen on public.jokers using (public.is_member(pool_id));
  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden not like 'LEZEN VOOR DE DEADLINE KAN NOG%' then
    raise exception 'gezakt: met de oude leespolicy op jokers zegt de tabel "%"', gevonden;
  end if;
  -- En een policy die de deadline kent maar het lidmaatschap vergeet, is
  -- ook niet goed: dan leest iedereen na de deadline alles.
  alter policy jokers_lezen on public.jokers using (public.joker_open(race_id));
  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden not like 'LEZEN VOOR DE DEADLINE KAN NOG%' then
    raise exception 'gezakt: zonder is_member op jokers zegt de tabel "%"', gevonden;
  end if;
  alter policy jokers_lezen on public.jokers
    using (public.is_member(pool_id) and public.joker_open(race_id));
  raise notice 'ok: een oude leespolicy op antwoorden of jokers wordt gemeld';

  -- Een poule_ophalen() die alles meegeeft, of alleen de antwoorden of
  -- alleen de jokers afschermt.
  alter function public.poule_ophalen(text, uuid) rename to poule_ophalen_echt;
  foreach gevonden in array array[
    $f$ select jsonb_build_object('antwoorden', (select jsonb_agg(to_jsonb(a)) from public.answers a)) $f$,
    $f$ select jsonb_build_object('antwoorden', (select jsonb_agg(to_jsonb(a)) from public.answers a
          where public.antwoord_open(a.race_id, a.question_id))) $f$,
    $f$ select jsonb_build_object('jokers', (select jsonb_agg(to_jsonb(j)) from public.jokers j
          where public.joker_open(j.race_id))) $f$]
  loop
    execute format('create function public.poule_ophalen(p_code text default null, p_id uuid default null)
      returns jsonb language sql as %L', gevonden);
    select uitkomst into gevonden from public.poule_controle where controle = regel;
    if gevonden not like 'POULE_OPHALEN GEEFT ALLES%' then
      raise exception 'gezakt: met een poule_ophalen die niet alles afschermt zegt de tabel "%"', gevonden;
    end if;
    drop function public.poule_ophalen(text, uuid);
  end loop;
  alter function public.poule_ophalen_echt(text, uuid) rename to poule_ophalen;
  raise notice 'ok: een poule_ophalen die antwoorden of jokers meegeeft wordt gemeld';

  select uitkomst into gevonden from public.poule_controle where controle = regel;
  if gevonden <> 'ok' then
    raise exception 'gezakt: met alles teruggezet zegt de tabel "%"', gevonden;
  end if;
  raise notice 'ok: en met alles teruggezet staat hij weer op ok';
end $$;
