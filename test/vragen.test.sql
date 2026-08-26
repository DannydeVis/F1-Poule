-- De vragenlijst en de tabellen eromheen. Draai dit op een verse database
-- na schema.sql. Elke mislukte controle gooit een exception, zodat psql met
-- ON_ERROR_STOP=1 de build laat zakken.
--
-- Het scherpe punt zit in de puntentotalen. BEDIENING.md §3 belooft drie
-- presets van 100, 145 en ongeveer 200 punten per weekend. Die getallen
-- staan in een document en de punten staan in de database; zonder deze test
-- lopen die twee stil uit elkaar zodra iemand aan een vraag sleutelt.

\set ON_ERROR_STOP on

do $$
declare
  poule uuid := '33333333-3333-3333-3333-333333333333';
  lid   uuid;
  n     int;
begin
  -- 1. de negen vragen staan er
  select count(*) into n from questions;
  if n <> 9 then raise exception 'gezakt: % vragen in plaats van 9', n; end if;
  raise notice 'ok: negen vragen in de lijst';

  -- 2. de presets uit BEDIENING.md kloppen met de punten in de database
  select sum(punten) into n from questions where id in ('quali_top10','race_top10');
  if n <> 100 then raise exception 'gezakt: Simpel is % punten in plaats van 100', n; end if;

  select sum(punten) into n from questions
  where id in ('quali_top10','race_top10','winnaar','pole','snelste_ronde');
  if n <> 145 then raise exception 'gezakt: Klassiek is % punten in plaats van 145', n; end if;

  select sum(punten) into n from questions;
  if n not between 190 and 210 then
    raise exception 'gezakt: Gevorderd is % punten, niet ongeveer 200', n;
  end if;
  raise notice 'ok: presets tellen op tot 100 / 145 / % punten', n;

  -- 3. elke vraag hangt aan een bestaande sessie en een bekend soort
  select count(*) into n from questions where sessie not in ('quali','race');
  if n <> 0 then raise exception 'gezakt: % vragen met een onbekende sessie', n; end if;
  select count(*) into n from questions
  where soort not in ('top10','coureur','getal','janee','duels');
  if n <> 0 then raise exception 'gezakt: % vragen met een onbekend soort', n; end if;
  raise notice 'ok: sessie en soort zijn overal ingevuld';

  -- 4. de gokvragen staan gemarkeerd, want daar hangt de waarschuwing uit
  --    BEDIENING.md §8 aan
  select count(*) into n from questions where gok;
  if n < 1 then raise exception 'gezakt: geen enkele vraag staat als gokvraag gemarkeerd'; end if;
  raise notice 'ok: % gokvragen gemarkeerd', n;

  -- --- opzet voor de rest ------------------------------------------------
  insert into pools (id, name, season, join_code) values (poule, 'Vragentest', 2026, 'VRG001');
  insert into pool_members (pool_id, display_name) values (poule, 'Danny')
  returning member_id into lid;
  insert into races (id, season, round, name, deadline_quali, deadline_race)
  values (9001, 2026, 1, 'Testrace', now() + interval '1 day', now() + interval '2 days');

  insert into pool_questions (pool_id, question_id) values
    (poule, 'quali_top10'), (poule, 'race_top10'), (poule, 'winnaar');

  -- 5. hetzelfde antwoord twee keer levert één rij op, geen twee
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 9001, lid, 'winnaar', '"1"'::jsonb)
  on conflict (pool_id, race_id, member_id, question_id) do update
  set waarde = excluded.waarde;

  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 9001, lid, 'winnaar', '"4"'::jsonb)
  on conflict (pool_id, race_id, member_id, question_id) do update
  set waarde = excluded.waarde;

  select count(*) into n from answers where pool_id = poule;
  if n <> 1 then raise exception 'gezakt: % antwoordrijen in plaats van 1', n; end if;
  if (select waarde from answers where pool_id = poule) <> '"4"'::jsonb then
    raise exception 'gezakt: het tweede antwoord heeft het eerste niet vervangen';
  end if;
  raise notice 'ok: een antwoord bijwerken maakt geen tweede rij';

  -- 6. een antwoord op een vraag die niet bestaat wordt geweigerd
  begin
    insert into answers (pool_id, race_id, member_id, question_id, waarde)
    values (poule, 9001, lid, 'bestaat_niet', '"1"'::jsonb);
    raise exception 'gezakt: een antwoord op een onbekende vraag werd aangenomen';
  exception when foreign_key_violation then
    raise notice 'ok: antwoord op een onbekende vraag geweigerd';
  end;

  -- 7. een top 10 past gewoon in jsonb
  insert into answers (pool_id, race_id, member_id, question_id, waarde)
  values (poule, 9001, lid, 'quali_top10',
          '["1","4","16","63","44","81","12","10","14","18"]'::jsonb);
  if jsonb_array_length((select waarde from answers
      where pool_id = poule and question_id = 'quali_top10')) <> 10 then
    raise exception 'gezakt: de top 10 kwam er niet als tien plekken uit';
  end if;
  raise notice 'ok: een top 10 gaat als lijst de kolom in en weer uit';

  -- 8. de poule weggooien neemt de vinkjes en de antwoorden mee
  delete from pools where id = poule;
  select count(*) into n from pool_questions where pool_id = poule;
  if n <> 0 then raise exception 'gezakt: % vinkjes bleven staan na het weggooien', n; end if;
  select count(*) into n from answers where pool_id = poule;
  if n <> 0 then raise exception 'gezakt: % antwoorden bleven staan na het weggooien', n; end if;
  raise notice 'ok: vinkjes en antwoorden gaan mee als de poule weggaat';

  -- 9. maar de vragenlijst zelf blijft natuurlijk staan
  select count(*) into n from questions;
  if n <> 9 then raise exception 'gezakt: de vragenlijst is aangetast (% rijen)', n; end if;
  raise notice 'ok: de vragenlijst zelf blijft ongemoeid';
end $$;
