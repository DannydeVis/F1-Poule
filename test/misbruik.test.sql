-- Misbruik tegengaan (17 oktober), tegen een echte PostgreSQL.
--
-- Wat hier vastligt:
--   1. Zonder sessie geen speler en geen poule (hint geen_sessie), ook niet
--      met alleen de anon key.
--   2. Hoogstens 10 spelers per account per poule (spelers_per_account); een
--      ander account kan dan nog gewoon.
--   3. Een poule is vol bij max_spelers (poule_vol:<n>); de poulebaas kan dat
--      maximum niet zelf ophogen, het beheer wel.
--   4. Hoogstens 5 nieuwe poules per account in 24 uur (poules_per_dag); wat
--      ouder is telt niet, en een ander account kan dan nog gewoon.
--   5. Het woordfilter in openbare poules: spelersnamen, de poulenaam en de
--      omschrijving, met cijfertrucs, accenten en puntjes ertussen; niet in een
--      gewone poule, niet midden in een ander woord, en een woord dat uit staat
--      telt niet. Een woord dat je zelf toevoegt telt meteen.
--   6. tel_bezoek telt alleen 'start' en 'app'.
--   7. De regel in de controletabel ziet het als een slot ontbreekt.

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('a1000000-0000-0000-0000-000000000001', 'een@voorbeeld.nl'),
  ('a2000000-0000-0000-0000-000000000002', 'twee@voorbeeld.nl'),
  ('a3000000-0000-0000-0000-000000000003', 'drie@voorbeeld.nl');

-- Een hulpje: roep een stuk SQL aan als `rol` met `sub`, en geef de hint van
-- de fout terug ('' als het lukte).
create or replace function pg_temp.hint_van(rol text, sub text, sql text)
returns text language plpgsql as $$
declare h text;
begin
  execute format('set local role %I', rol);
  perform set_config('request.jwt.claims', coalesce('{"sub":"' || sub || '"}', ''), true);
  begin
    execute sql;
    h := '';
  exception when others then
    get stacked diagnostics h = pg_exception_hint;
    h := coalesce(nullif(h, ''), 'FOUT ZONDER HINT: ' || sqlerrm);
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return h;
end $$;

do $$
declare
  h      text;
  poule  uuid;
  open_p uuid;
  n      int;
  een    constant text := 'a1000000-0000-0000-0000-000000000001';
  twee   constant text := 'a2000000-0000-0000-0000-000000000002';
  drie   constant text := 'a3000000-0000-0000-0000-000000000003';
begin
  -- ---------------------------------------------------------------
  --  1. zonder sessie
  -- ---------------------------------------------------------------
  h := pg_temp.hint_van('anon', null, $q$select public.poule_aanmaken('Bot', null, 'Bot', array['race_top10'])$q$);
  if h <> 'geen_sessie' then raise exception 'gezakt: zonder sessie een poule aanmaken gaf "%"', h; end if;
  if exists (select 1 from public.pools) then raise exception 'gezakt: er staat toch een poule'; end if;
  raise notice 'ok: zonder sessie geen poule (geen_sessie)';

  insert into public.pools (id, name, join_code) values
    ('b0000000-0000-0000-0000-000000000001', 'Vrienden', 'VRIEND');
  poule := 'b0000000-0000-0000-0000-000000000001';
  h := pg_temp.hint_van('anon', null, format($q$select public.poule_meedoen(%L, 'Bot')$q$, poule));
  if h <> 'geen_sessie' then raise exception 'gezakt: zonder sessie meedoen gaf "%"', h; end if;
  h := pg_temp.hint_van('authenticated', null, format($q$select public.poule_meedoen(%L, 'Bot')$q$, poule));
  if h <> 'geen_sessie' then raise exception 'gezakt: als authenticated zonder sub meedoen gaf "%"', h; end if;
  if exists (select 1 from public.pool_members) then raise exception 'gezakt: er staat toch een speler'; end if;
  raise notice 'ok: zonder sessie geen speler, ook niet als authenticated zonder account';

  h := pg_temp.hint_van('anon', een, format($q$select public.poule_meedoen(%L, 'Anna')$q$, poule));
  if h <> '' then raise exception 'gezakt: met een anonieme sessie meedoen gaf "%"', h; end if;
  if (select user_id::text from public.pool_members where display_name = 'Anna') <> een then
    raise exception 'gezakt: Anna hangt niet aan haar account'; end if;
  raise notice 'ok: met een (anonieme) sessie doe je gewoon mee, aan je eigen account';

  -- ---------------------------------------------------------------
  --  2. hoogstens 10 spelers per account per poule
  -- ---------------------------------------------------------------
  -- Anna's telefoon gaat rond: negen anderen erbij, zonder account (één
  -- account kan maar één speler zijn), aangemaakt door haar.
  for i in 1..9 loop
    h := pg_temp.hint_van('anon', een, format($q$select public.poule_meedoen(%L, %L)$q$, poule, 'Vriend ' || i));
    if h <> '' then raise exception 'gezakt: speler % vanaf één toestel gaf "%"', i + 1, h; end if;
  end loop;
  h := pg_temp.hint_van('anon', een, format($q$select public.poule_meedoen(%L, 'Elfde')$q$, poule));
  if h <> 'spelers_per_account' then raise exception 'gezakt: de elfde speler vanaf één account gaf "%"', h; end if;
  if (select count(*) from public.pool_members where pool_id = poule) <> 10 then
    raise exception 'gezakt: er staan er geen 10'; end if;
  raise notice 'ok: tien spelers vanaf één account, de elfde niet (spelers_per_account)';

  h := pg_temp.hint_van('anon', twee, format($q$select public.poule_meedoen(%L, 'Bram')$q$, poule));
  if h <> '' then raise exception 'gezakt: een ander account kon er daarna niet in: "%"', h; end if;
  raise notice 'ok: een ander account kan er dan nog gewoon in';

  -- ---------------------------------------------------------------
  --  3. een volle poule
  -- ---------------------------------------------------------------
  if (select max_spelers from public.pools where id = poule) <> 500 then
    raise exception 'gezakt: een poule mag standaard geen 500 spelers'; end if;
  update public.pools set max_spelers = 11 where id = poule;
  h := pg_temp.hint_van('anon', drie, format($q$select public.poule_meedoen(%L, 'Chris')$q$, poule));
  if h <> 'poule_vol:11' then raise exception 'gezakt: in een volle poule meedoen gaf "%"', h; end if;
  raise notice 'ok: standaard 500, en een volle poule zegt hoeveel er in mogen (poule_vol:11)';

  -- De poulebaas kan zijn eigen poule niet groter maken.
  update public.pools set owner_member_id = (select member_id from public.pool_members where display_name = 'Anna')
   where id = poule;
  h := pg_temp.hint_van('authenticated', een, format($q$update public.pools set max_spelers = 9000 where id = %L$q$, poule));
  if h not like 'FOUT ZONDER HINT: %alleen het beheer%' then
    raise exception 'gezakt: de poulebaas zette zelf het maximum: "%"', h; end if;
  h := pg_temp.hint_van('authenticated', een, format($q$update public.pools set beschrijving = 'Gewoon' where id = %L$q$, poule));
  if h <> '' then raise exception 'gezakt: de poulebaas kon zijn omschrijving niet meer aanpassen: "%"', h; end if;
  -- Het beheer wel (beheer_poule_bijwerken is security definer).
  update public.pools set max_spelers = 12 where id = poule;
  h := pg_temp.hint_van('anon', drie, format($q$select public.poule_meedoen(%L, 'Chris')$q$, poule));
  if h <> '' then raise exception 'gezakt: na ophogen kon Chris er niet in: "%"', h; end if;
  raise notice 'ok: het maximum zet alleen het beheer, de poulebaas niet';

  -- ---------------------------------------------------------------
  --  4. hoogstens 5 poules per account per dag
  -- ---------------------------------------------------------------
  for i in 1..5 loop
    h := pg_temp.hint_van('anon', twee, format($q$select public.poule_aanmaken(%L, null, 'Bram', array['race_top10'])$q$, 'Poule ' || i));
    if h <> '' then raise exception 'gezakt: poule % gaf "%"', i, h; end if;
  end loop;
  h := pg_temp.hint_van('anon', twee, $q$select public.poule_aanmaken('Zesde', null, 'Bram', array['race_top10'])$q$);
  if h <> 'poules_per_dag' then raise exception 'gezakt: de zesde poule op een dag gaf "%"', h; end if;
  if exists (select 1 from public.pools where name = 'Zesde') then raise exception 'gezakt: de zesde staat er toch'; end if;
  raise notice 'ok: vijf poules op een dag, de zesde niet (poules_per_dag)';

  h := pg_temp.hint_van('anon', drie, $q$select public.poule_aanmaken('Van Chris', null, 'Chris', array['race_top10'])$q$);
  if h <> '' then raise exception 'gezakt: een ander account kon daarna geen poule maken: "%"', h; end if;
  -- Een poule weggooien zet de teller niet terug.
  delete from public.pools where name = 'Poule 1';
  h := pg_temp.hint_van('anon', twee, $q$select public.poule_aanmaken('Na weggooien', null, 'Bram', array['race_top10'])$q$);
  if h <> 'poules_per_dag' then raise exception 'gezakt: na een poule weggooien mocht er weer een: "%"', h; end if;
  -- Van gisteren telt niet meer.
  update public.aanmaak_log set gemaakt = gemaakt - interval '25 hours' where user_id::text = twee;
  h := pg_temp.hint_van('anon', twee, $q$select public.poule_aanmaken('Volgende dag', null, 'Bram', array['race_top10'])$q$);
  if h <> '' then raise exception 'gezakt: de volgende dag mocht er geen poule bij: "%"', h; end if;
  raise notice 'ok: een ander account mag wel, weggooien telt niet terug, en na 24 uur mag het weer';
  if has_table_privilege('anon', 'public.aanmaak_log', 'select') or has_table_privilege('authenticated', 'public.aanmaak_log', 'insert, delete') then
    raise exception 'gezakt: de teller is via de API te lezen of te schrijven'; end if;
  raise notice 'ok: de teller is niet via de API te lezen of te schrijven';

  -- ---------------------------------------------------------------
  --  5. het woordfilter
  -- ---------------------------------------------------------------
  insert into public.pools (id, name, join_code, is_public) values
    ('b0000000-0000-0000-0000-0000000000f0', 'Open poule', '80C98C', true);
  open_p := 'b0000000-0000-0000-0000-0000000000f0';
  foreach h in array array['Kanker Henk', 'K4NK3R', 'k.u.t', 'f u c k', 'Fuckers', 'Hijo de Puta', 'Hurensöhn',
                           'Encûlé', 'niggers', 'Vaffanculo!!'] loop
    if pg_temp.hint_van('anon', drie, format($q$select public.poule_meedoen(%L, %L)$q$, open_p, h)) <> 'woordfilter' then
      raise exception 'gezakt: "%" kwam door het filter in een openbare poule', h; end if;
  end loop;
  raise notice 'ok: grove namen komen niet in een openbare poule, ook niet met cijfers, accenten of puntjes';

  foreach h in array array['Max Verstappen', 'Kutná Hora', 'Scunthorpe', 'Sk8er', 'Shit happens', 'Puttanesca Pete'] loop
    if pg_temp.hint_van('anon', drie, format($q$select public.poule_meedoen(%L, %L)$q$, open_p, h)) <> '' then
      raise exception 'gezakt: "%" werd geweigerd, maar is geen scheldwoord', h; end if;
    delete from public.pool_members where pool_id = open_p;
  end loop;
  raise notice 'ok: gewone namen gaan erdoor, ook als er een scheldwoord in lijkt te zitten';

  update public.pools set max_spelers = 500 where id = poule;
  h := pg_temp.hint_van('anon', drie, format($q$select public.poule_meedoen(%L, 'Kanker Henk')$q$, poule));
  if h <> '' then raise exception 'gezakt: in een gewone poule werd ook gefilterd: "%"', h; end if;
  raise notice 'ok: in een gewone poule filtert hij niet';

  -- De poulenaam en de omschrijving.
  begin
    update public.pools set name = 'Tering F1' where id = open_p;
    raise exception 'gezakt: een openbare poule kon een grove naam krijgen';
  exception when others then
    if sqlerrm not like '%openbare poule%' then raise; end if;
  end;
  begin
    update public.pools set beschrijving = 'Voor alle klootzakken' where id = open_p;
    raise exception 'gezakt: een openbare poule kon een grove omschrijving krijgen';
  exception when others then
    if sqlerrm not like '%openbare poule%' then raise; end if;
  end;
  update public.pools set name = 'Tering F1' where id = poule;
  update public.pools set name = 'Vrienden' where id = poule;
  raise notice 'ok: een openbare poule krijgt geen grove naam of omschrijving, een gewone wel';

  -- Openbaar maken met iemand met een grove naam erin.
  h := pg_temp.hint_van('authenticated', een, format($q$update public.pools set is_public = true where id = %L$q$, poule));
  if h <> 'woordfilter' then raise exception 'gezakt: een poule met "Kanker Henk" kon openbaar worden: "%"', h; end if;
  delete from public.pool_members where display_name = 'Kanker Henk';
  h := pg_temp.hint_van('authenticated', een, format($q$update public.pools set is_public = true where id = %L$q$, poule));
  if h <> '' then raise exception 'gezakt: zonder Henk kon de poule niet openbaar: "%"', h; end if;
  update public.pools set is_public = false where id = poule;
  raise notice 'ok: openbaar worden kan pas als de namen erin netjes zijn';

  -- Een woord dat uit staat telt niet; een woord dat je toevoegt meteen.
  update public.verboden_woorden set uit = true where woord = 'kut';
  if public.naam_verboden('Kut') then raise exception 'gezakt: een woord dat uit staat telt nog'; end if;
  update public.verboden_woorden set uit = false where woord = 'kut';
  insert into public.verboden_woorden (woord, taal) values ('sukkel', 'nl');
  if not public.naam_verboden('Grote Sukkel') then raise exception 'gezakt: een toegevoegd woord telt niet'; end if;
  begin
    insert into public.verboden_woorden (woord) values ('Met Hoofdletter');
    raise exception 'gezakt: een woord met hoofdletters kwam in de lijst';
  exception when check_violation then null;
  end;
  if has_table_privilege('anon', 'public.verboden_woorden', 'select')
     or has_table_privilege('authenticated', 'public.verboden_woorden', 'insert, update, delete') then
    raise exception 'gezakt: de woordenlijst is via de API te lezen of te schrijven'; end if;
  raise notice 'ok: uit telt niet, een toegevoegd woord meteen, alleen kleine letters, en de lijst is dicht';

  select count(distinct taal) into n from public.verboden_woorden;
  if n < 7 then raise exception 'gezakt: de beginlijst heeft woorden in % talen in plaats van zeven', n; end if;
  raise notice 'ok: de beginlijst heeft woorden in de zeven talen';

  -- ---------------------------------------------------------------
  --  6. tel_bezoek
  -- ---------------------------------------------------------------
  delete from public.bezoeken;
  perform pg_temp.hint_van('anon', null, $q$select public.tel_bezoek('start')$q$);
  perform pg_temp.hint_van('anon', null, $q$select public.tel_bezoek('app')$q$);
  perform pg_temp.hint_van('anon', null, $q$select public.tel_bezoek('app')$q$);
  perform pg_temp.hint_van('anon', null, $q$select public.tel_bezoek('verzonnen-pad')$q$);
  perform pg_temp.hint_van('anon', null, $q$select public.tel_bezoek('app/x')$q$);
  if (select string_agg(pad || '=' || aantal, ',' order by pad) from public.bezoeken) <> 'app=2,start=1' then
    raise exception 'gezakt: de teller telde %', (select string_agg(pad || '=' || aantal, ',' order by pad) from public.bezoeken);
  end if;
  raise notice 'ok: de teller telt start en app, en negeert de rest';

  -- ---------------------------------------------------------------
  --  7. de controletabel
  -- ---------------------------------------------------------------
  select uitkomst into h from public.poule_controle where controle = 'misbruik: sessie, limieten, woordfilter, teller';
  if h not like 'ok (%' then raise exception 'gezakt: de controletabel zegt "%"', h; end if;
  select uitkomst into h from public.poule_controle where controle = 'open poule (80C98C): spelers / maximum';
  if h <> '0 / 500' then raise exception 'gezakt: de open poule staat als "%"', h; end if;

  drop trigger pool_members_woordfilter on public.pool_members;
  select uitkomst into h from public.poule_controle where controle = 'misbruik: sessie, limieten, woordfilter, teller';
  if h not like 'WOORDFILTER ONTBREEKT%' then raise exception 'gezakt: zonder trigger zegt de tabel "%"', h; end if;
  create trigger pool_members_woordfilter before insert or update on public.pool_members
    for each row execute function public.pool_members_woordfilter();

  update public.verboden_woorden set uit = true;
  select uitkomst into h from public.poule_controle where controle = 'misbruik: sessie, limieten, woordfilter, teller';
  if h <> 'WOORDFILTER ZONDER WOORDEN' then raise exception 'gezakt: zonder woorden zegt de tabel "%"', h; end if;
  update public.verboden_woorden set uit = false;
  raise notice 'ok: de controletabel zegt ok, en ziet een ontbrekend filter of een lege lijst';
end $$;

-- Een oude poule_meedoen zonder sessiecontrole: de controletabel ziet het.
create or replace function public.poule_meedoen(p_pool uuid, p_naam text)
returns jsonb language sql security definer set search_path = public as $$ select null::jsonb $$;
do $$
declare h text;
begin
  select uitkomst into h from public.poule_controle where controle = 'misbruik: sessie, limieten, woordfilter, teller';
  if h not like 'ZONDER SESSIE KAN NOG%' then raise exception 'gezakt: met een oude poule_meedoen zegt de tabel "%"', h; end if;
  raise notice 'ok: een poule_meedoen zonder sessiecontrole ziet de tabel';
end $$;
