-- De jaarwisseling in de database: welk seizoen de controletabel laat zien, en
-- in welk seizoen een nieuwe poule begint.
--
-- Twee plekken stonden vast op het verkeerde jaar, of op het verkeerde idee
-- van "het huidige jaar":
--
--   * de controletabel telde overal `season = 2026`, en had in januari 2027
--     dus "seizoen 2026 rond: ok" gezegd terwijl de kalender van 2027 ontbrak;
--   * poule_aanmaken() nam max(season). Sinds de sync de kalender van volgend
--     jaar al twee maanden voor de finale ophaalt, was een poule die in
--     november begonnen werd dan een poule voor 2027, met de laatste races
--     van 2026 nog voor de deur.
--
-- De jaren zijn hier getallen en de tijden staan ten opzichte van nu, dus dit
-- klopt wat de datum van vandaag ook is. Draai het op een verse database na
-- schema.sql.

\set ON_ERROR_STOP on

do $$
declare
  gevonden text;
  jaar     int;
  uit      jsonb;
begin
  -- ---------------------------------------------------------------
  --  1. een lege kalender
  -- ---------------------------------------------------------------
  delete from public.races;
  select uitkomst into gevonden from public.poule_controle
   where controle = 'seizoen ' || extract(year from now())::int || ' rond';
  if gevonden is distinct from 'geen kalender' then
    raise exception 'gezakt: een lege kalender heet "%" in plaats van "geen kalender" onder het jaar van nu', gevonden;
  end if;
  raise notice 'ok: zonder kalender gaat de tabel over het jaar van vandaag, en zegt hij dat er niets is';

  uit := public.poule_aanmaken('Leeg', null, 'Ada', array['race_top10']);
  if (uit -> 'poule' ->> 'season')::int <> extract(year from now())::int then
    raise exception 'gezakt: zonder kalender begint een poule in % in plaats van dit jaar',
      uit -> 'poule' ->> 'season';
  end if;
  raise notice 'ok: en een poule zonder kalender begint in het jaar van vandaag';

  -- ---------------------------------------------------------------
  --  2. november: 2026 heeft nog een race, 2027 staat er al
  -- ---------------------------------------------------------------
  insert into public.races (id, season, round, name, deadline_quali, deadline_race,
                            race_result, afgelast)
  values (9601, 2026, 1, 'Oud 1', now() - interval '30 days', now() - interval '29 days', array['1'], false),
         (9602, 2026, 2, 'Oud 2', now() - interval '16 days', now() - interval '15 days', array['1'], false),
         (9603, 2026, 3, 'Finale', now() + interval '9 days', now() + interval '10 days', null, false),
         (9701, 2027, 1, 'Nieuw 1', now() + interval '100 days', now() + interval '101 days', null, false),
         (9702, 2027, 2, 'Nieuw 2', now() + interval '114 days', now() + interval '115 days', null, false);

  select uitkomst into gevonden from public.poule_controle where controle = 'seizoen 2026 rond';
  if gevonden is distinct from 'nog 1 te gaan' then
    raise exception 'gezakt: met de finale nog voor de deur zegt de tabel "%" over 2026', gevonden;
  end if;
  select uitkomst into gevonden from public.poule_controle where controle = 'races in 2026';
  if gevonden is distinct from '3' then
    raise exception 'gezakt: "races in 2026" zegt % in plaats van 3', gevonden;
  end if;
  raise notice 'ok: zolang 2026 loopt gaat de tabel over 2026, ook al staat 2027 er al';

  uit := public.poule_aanmaken('November', null, 'Bea', array['race_top10']);
  if (uit -> 'poule' ->> 'season')::int <> 2026 then
    raise exception 'gezakt: een poule uit november begint in % in plaats van 2026 (max(season) is terug?)',
      uit -> 'poule' ->> 'season';
  end if;
  raise notice 'ok: een poule die nu begint speelt de laatste race van 2026 mee';

  -- Een afgelaste race houdt het seizoen niet open voor een nieuwe poule.
  update public.races set afgelast = true where id = 9603;
  uit := public.poule_aanmaken('Afgelast', null, 'Cas', array['race_top10']);
  if (uit -> 'poule' ->> 'season')::int <> 2027 then
    raise exception 'gezakt: met alleen een afgelaste race over begint een poule in % in plaats van 2027',
      uit -> 'poule' ->> 'season';
  end if;
  raise notice 'ok: een afgelaste finale telt niet als "nog te rijden"';
  update public.races set afgelast = false where id = 9603;

  -- ---------------------------------------------------------------
  --  3. december: de finale is gereden
  -- ---------------------------------------------------------------
  update public.races set deadline_quali = now() - interval '3 days',
                          deadline_race  = now() - interval '2 days',
                          race_result    = array['4','1']
   where id = 9603;

  if exists (select 1 from public.poule_controle where controle = 'seizoen 2026 rond') then
    raise exception 'gezakt: na de finale gaat de tabel nog steeds over 2026';
  end if;
  select uitkomst into gevonden from public.poule_controle where controle = 'seizoen 2027 rond';
  if gevonden is distinct from 'nog 2 te gaan' then
    raise exception 'gezakt: na de finale zegt de tabel "%" over 2027 in plaats van "nog 2 te gaan"', gevonden;
  end if;
  select uitkomst into gevonden from public.poule_controle where controle = 'races in 2027';
  if gevonden is distinct from '2' then
    raise exception 'gezakt: "races in 2027" zegt % in plaats van 2', gevonden;
  end if;
  raise notice 'ok: na de finale schuift de tabel door naar 2027';

  uit := public.poule_aanmaken('December', null, 'Dirk', array['race_top10']);
  if (uit -> 'poule' ->> 'season')::int <> 2027 then
    raise exception 'gezakt: een poule uit december begint in % in plaats van 2027',
      uit -> 'poule' ->> 'season';
  end if;
  raise notice 'ok: en een poule die nu begint, begint in 2027';

  -- ---------------------------------------------------------------
  --  4. een race die blijft hangen houdt de tabel bij 2026
  -- ---------------------------------------------------------------
  --  Een race zonder uitslag die niet afgelast is, is het probleem waar de
  --  regel "blijven hangen" voor bestaat. Die hoort in beeld te blijven, ook
  --  als de kalender van volgend jaar er al is.
  update public.races set race_result = null where id = 9602;
  select uitkomst into gevonden from public.poule_controle where controle = 'seizoen 2026 rond';
  if gevonden is distinct from 'nog 1 te gaan' then
    raise exception 'gezakt: met een race die blijft hangen zegt de tabel "%" over 2026', gevonden;
  end if;
  select uitkomst into gevonden from public.poule_controle where controle like 'blijven hangen%';
  if gevonden is distinct from '1: Oud 2 (ronde 2)' then
    raise exception 'gezakt: de race die blijft hangen wordt gemeld als "%"', gevonden;
  end if;
  raise notice 'ok: een race die blijft hangen houdt de tabel bij 2026, met de naam erbij';
  update public.races set race_result = array['1'] where id = 9602;

  -- ---------------------------------------------------------------
  --  5. alles gereden, 2027 nog niet bekend
  -- ---------------------------------------------------------------
  delete from public.races where season = 2027;
  select uitkomst into gevonden from public.poule_controle where controle = 'seizoen 2026 rond';
  if gevonden is distinct from 'ok' then
    raise exception 'gezakt: met alles gereden en 2027 nog niet bekend zegt de tabel "%"', gevonden;
  end if;
  uit := public.poule_aanmaken('Tussenjaar', null, 'Eva', array['race_top10']);
  if (uit -> 'poule' ->> 'season')::int <> 2026 then
    raise exception 'gezakt: zonder kalender van volgend jaar begint een poule in % in plaats van 2026',
      uit -> 'poule' ->> 'season';
  end if;
  raise notice 'ok: zonder 2027 blijft alles bij 2026, tot de poulebaas doorschuift';

  -- ---------------------------------------------------------------
  --  6. de standaard van de kolom
  -- ---------------------------------------------------------------
  insert into public.pools (name) values ('Zonder seizoen') returning season into jaar;
  if jaar <> extract(year from now())::int then
    raise exception 'gezakt: een poule zonder seizoen krijgt % in plaats van dit jaar', jaar;
  end if;
  raise notice 'ok: een poule zonder opgegeven seizoen krijgt dit jaar, niet vast 2026';

  delete from public.pools;
  delete from public.races;
end $$;
