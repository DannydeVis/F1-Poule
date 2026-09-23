-- Wat er gebeurt als schema.sql op een oude database draait.
--
-- schema-gedrag.test.sql zette hier een predictions-tabel neer zoals die er
-- vóór de migratie uitzag, met rijen die nog nergens anders stonden. Daarna
-- is schema.sql opnieuw gedraaid. Dit controleert wat dat heeft opgeleverd.
--
-- Dit is de riskante kant van het weghalen van die tabel: de volgorde. Eerst
-- overzetten, dan pas weggooien. Gaat dat mis, dan is er data weg en merkt
-- niemand het -- vandaar dat elk van de drie gevallen hier apart nagegaan
-- wordt in plaats van alleen "de tabel is weg".

\set ON_ERROR_STOP on

do $$
declare
  poule uuid := '11111111-1111-1111-1111-111111111111';
  lid   uuid := '22222222-2222-2222-2222-222222222222';
  n     int;
  p1    text;
begin
  -- 1. De tabel is weg, met alles wat eraan hing.
  if to_regclass('public.predictions') is not null then
    raise exception 'gezakt: predictions staat er nog';
  end if;
  raise notice 'ok: de oude predictions-tabel is weg';

  -- 2. Maar niet voordat hij leeggehaald was. Race 3 stond nergens anders.
  select waarde->>0 into p1 from public.answers
   where race_id = 3 and member_id = lid and question_id = 'race_top10';
  if p1 is distinct from '55' then
    raise exception 'gezakt: race 3 is niet overgezet (P1 = %, verwacht 55)', p1;
  end if;
  raise notice 'ok: wat er nog in zat is eerst overgezet';

  -- 3. En dat gebeurde langs de deadline-trigger heen. Race 3 is gesloten;
  --    zonder dat de migratie die trigger uitzet was dit geweigerd.
  raise notice 'ok: ook voor een race waarvan de deadline al verstreken was';

  -- 4. Van de twee dubbele rijen heeft de nieuwste gewonnen.
  select waarde->>0 into p1 from public.answers
   where race_id = 1 and member_id = lid and question_id = 'quali_top10';
  if p1 is distinct from '99' then
    raise exception 'gezakt: de verkeerde van twee dubbele rijen is overgezet '
      '(P1 = %, verwacht 99)', p1;
  end if;
  raise notice 'ok: van twee dubbele rijen is de nieuwste overgezet';

  -- 5. Wat al in answers stond is niet overschreven door iets ouders.
  select waarde->>0 into p1 from public.answers
   where race_id = 1 and member_id = lid and question_id = 'race_top10';
  if p1 = '99' or p1 = '11' then
    raise exception 'gezakt: een bestaand antwoord is overschreven (P1 = %)', p1;
  end if;
  raise notice 'ok: en wat er al stond is niet overschreven (P1 = %)', p1;

  -- 6. De rij naar een race die niet bestaat is overgeslagen en heeft de
  --    migratie niet laten klappen -- anders was schema.sql hierboven al
  --    gestopt en stond dit bestand er niet.
  select count(*) into n from public.answers where race_id = 404;
  if n <> 0 then raise exception 'gezakt: % rijen voor een race die niet bestaat', n; end if;
  raise notice 'ok: een rij naar een verdwenen race is overgeslagen, niet geklapt';
end $$;
