-- De seizoensvragen, en wanneer ze vastliggen.
--
-- De regel is per antwoord gaan gelden in plaats van per seizoen. Waarom staat
-- in BEDIENING.md §6d; wat het betekent staat hier:
--
--   * vóór de eerste race mag alles -- invullen, veranderen, weghalen.
--   * daarna mag je invullen wat je nog niet had, voor wie halverwege
--     instapt, maar niet meer veranderen of weghalen wat er al staat.
--   * en zodra het seizoen erop zit mag er niets meer bij, want dan is het
--     antwoord bekend.
--
-- Dit hoort in de database en niet alleen in de app: wie de anon key uit de
-- broncode plukt komt om het scherm heen, niet om een trigger.
--
-- Draai dit op een verse database na schema.sql.

\set ON_ERROR_STOP on

do $$
declare
  poule uuid := '55555555-5555-5555-5555-555555555555';
  lid   uuid := '66666666-6666-6666-6666-666666666666';
  gevonden jsonb;
begin
  insert into pools (id, name, season, join_code) values (poule, 'Seizoentest', 2026, 'SZN001');
  insert into pool_members (member_id, pool_id, display_name) values (lid, poule, 'Danny');

  -- Ronde 1 staat nog open, ronde 2 is gereden. Zo is er een seizoen dat
  -- loopt: begonnen, maar nog niet afgelopen.
  insert into races (id, season, round, name, deadline_quali, deadline_race)
  values (8001, 2026, 1, 'Melbourne', now() + interval '2 days', now() + interval '3 days'),
         (8002, 2026, 2, 'Shanghai',  now() - interval '9 days', now() - interval '8 days');

  -- ---- 1. vóór de eerste race mag alles -------------------------------
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 8001, lid, 'kampioen', '"1"'::jsonb);
  raise notice 'ok: invullen vóór de eerste race';

  update answers set waarde = '"4"'::jsonb
   where pool_id = poule and race_id = 8001 and question_id = 'kampioen';
  raise notice 'ok: en van gedachten veranderen ook';

  delete from answers
   where pool_id = poule and race_id = 8001 and question_id = 'kampioen';
  raise notice 'ok: en weghalen ook';

  -- Twee antwoorden neerzetten: één die straks vastligt, één om te bewijzen
  -- dat de rest daar geen last van heeft.
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 8001, lid, 'kampioen', '"1"'::jsonb);

  -- ---- 2. het seizoen begint ------------------------------------------
  update races set deadline_quali = now() - interval '2 days',
                   deadline_race  = now() - interval '1 day'
   where id = 8001;

  -- Wat er staat ligt vast.
  begin
    update answers set waarde = '"81"'::jsonb
     where pool_id = poule and race_id = 8001 and question_id = 'kampioen';
    raise exception 'gezakt: een ingevuld seizoensantwoord werd nog gewijzigd';
  exception when others then
    if sqlerrm not like '%ligt vast%' then raise; end if;
    raise notice 'ok: wijzigen geweigerd zodra het seizoen loopt (%)', sqlerrm;
  end;

  -- En is ook niet weg te halen om er omheen te werken. Dit was een gat: de
  -- trigger stond alleen op insert en update, dus delete-en-opnieuw werkte.
  begin
    delete from answers
     where pool_id = poule and race_id = 8001 and question_id = 'kampioen';
    raise exception 'gezakt: een ingevuld seizoensantwoord werd weggehaald';
  exception when others then
    if sqlerrm not like '%ligt vast%' then raise; end if;
    raise notice 'ok: weghalen geweigerd, dus delete-en-opnieuw werkt niet';
  end;

  -- Maar wat je nog niet had, mag je alsnog invullen. Dit is het hele punt.
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 8001, lid, 'constructeur', '"McLaren"'::jsonb);
  raise notice 'ok: een vraag die nog openstond mag alsnog ingevuld worden';

  -- En die ligt daarna net zo vast als de eerste.
  begin
    update answers set waarde = '"Ferrari"'::jsonb
     where pool_id = poule and race_id = 8001 and question_id = 'constructeur';
    raise exception 'gezakt: het nieuwe antwoord lag niet meteen vast';
  exception when others then
    if sqlerrm not like '%ligt vast%' then raise; end if;
    raise notice 'ok: en ligt meteen vast, net als de rest';
  end;

  -- Een ongewijzigd antwoord opnieuw wegschrijven mag wél. De app stuurt bij
  -- het opslaan alles mee wat er staat; zonder deze uitzondering zou het
  -- invullen van de tweede vraag zakken op de eerste.
  update answers set waarde = '"1"'::jsonb
   where pool_id = poule and race_id = 8001 and question_id = 'kampioen';
  raise notice 'ok: dezelfde waarde opnieuw wegschrijven blijft mogen';

  -- De gewone racevragen merken hier niets van: ronde 1 is dicht, dus die
  -- worden geweigerd om hún eigen reden, en met hun eigen melding.
  begin
    insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values (poule, 8001, lid, 'winnaar', '"1"'::jsonb);
    raise exception 'gezakt: een racevraag op een gesloten race werd aangenomen';
  exception when others then
    if sqlerrm not like '%race is gesloten%' then raise; end if;
    raise notice 'ok: een gewone racevraag houdt zijn eigen deadline (%)', sqlerrm;
  end;

  -- ---- 3. het seizoen zit erop ----------------------------------------
  update races set race_result = array['1','4'] where season = 2026;

  begin
    insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values (poule, 8001, lid, 'winnaars', '8'::jsonb);
    raise exception 'gezakt: er kwam nog een antwoord bij na het laatste weekend';
  exception when others then
    if sqlerrm not like '%seizoen is voorbij%' then raise; end if;
    raise notice 'ok: na de laatste race komt er niets meer bij (%)', sqlerrm;
  end;

  -- ---- 4. een cascade mag er wél langs --------------------------------
  -- Zonder deze uitzondering zou "verwijder mijn account" stranden op een
  -- antwoord dat vastligt, en dat is geen regel maar een val.
  update races set race_result = null where season = 2026;
  select a.waarde into gevonden from answers a
   where a.pool_id = poule and a.race_id = 8001 and a.question_id = 'kampioen';
  if gevonden is null then raise exception 'opzet mislukt: het antwoord is er niet'; end if;

  delete from pool_members where member_id = lid;
  if exists (select 1 from answers where member_id = lid) then
    raise exception 'gezakt: de antwoorden bleven staan na het weghalen van de speler';
  end if;
  raise notice 'ok: een speler weghalen neemt zijn vastliggende antwoorden mee';

  delete from pools where id = poule;
  delete from races where season = 2026 and id in (8001, 8002);
end $$;
