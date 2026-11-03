-- Mail als tweede kanaal (3 november), in de database zelf.
--
-- Danny: "Ik wil dat ze vaker de app openen." Wie het onder Profiel aanzet,
-- krijgt op vrijdagavond de vrije trainingen en na de race zijn punten en zijn
-- plek per mail. Wat hier vastligt, ook als de app of de sync een fout heeft:
--
--   1. Aanzetten kan alleen met een account met een bevestigd mailadres; een
--      anoniem account of een adres dat nog niet bevestigd is, niet.
--   2. Niemand leest of schrijft de tabel zelf, ook niet met een account: dus
--      ook niemands token of taal. Je eigen stand zie je via mail_stand().
--   3. Uitzetten haalt alleen je eigen rij weg; bijwerken zet mail nooit aan.
--   4. De afmeldlink werkt zonder in te loggen, met het token, en alleen voor
--      die ene rij. Een verkeerd token doet niets.
--   5. De sync ziet via mail_ontvangers() wie mail wil, zonder adres, en alleen
--      zolang het adres bevestigd is; anon en een account mogen die functie
--      niet aanroepen.
--   6. Een taal die de app niet kent wordt Engels; een tijdzone die er niet
--      als een tijdzone uitziet, komt er niet in.
--   7. Weg met het account: weg met de rij. En de controleregels kennen alles.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('a0000000-0000-0000-0000-0000000000a1', 'speler-een@voorbeeld.test', now(), false),
  ('a0000000-0000-0000-0000-0000000000a2', 'speler-twee@voorbeeld.test', now(), false),
  ('a0000000-0000-0000-0000-0000000000a3', null, null, true),
  ('a0000000-0000-0000-0000-0000000000a4', 'nog-niet-bevestigd@voorbeeld.test', null, false);

create function pg_temp.fout_bij(sql text, verwacht text, wat text) returns void language plpgsql as $$
declare fout text; hint text;
begin
  begin
    execute sql;
  exception when others then
    get stacked diagnostics fout = message_text, hint = pg_exception_hint;
    fout := fout || ' ' || coalesce(hint, '');
  end;
  if fout is null or position(verwacht in fout) = 0 then
    raise exception 'gezakt: % (fout: %)', wat, coalesce(fout, 'geen');
  end if;
  raise notice 'ok: %', wat;
end $$;

create function pg_temp.als(gebruiker text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', gebruiker)::text, true);
end $$;

-- ---- 1. aanzetten alleen met een bevestigd adres -----------------------------------------
do $$
begin
  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a3');
  if (public.mail_stand() ->> 'kan')::boolean then raise exception 'gezakt: een anoniem account kan mail aanzetten'; end if;
  perform pg_temp.fout_bij($q$select public.mail_aan('nl', 'Europe/Amsterdam')$q$, 'mail_geen_adres', 'een anoniem account: geen mail');
  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a4');
  perform pg_temp.fout_bij($q$select public.mail_aan('nl', 'Europe/Amsterdam')$q$, 'mail_geen_adres', 'een adres dat nog niet bevestigd is: geen mail');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  perform pg_temp.fout_bij($q$select public.mail_aan('nl', null)$q$, 'permission denied', 'zonder account: geen mail');
  reset role;

  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a1');
  if not (public.mail_stand() ->> 'kan')::boolean or (public.mail_stand() ->> 'aan')::boolean then
    raise exception 'gezakt: mail_stand voor een account met een adres: %', public.mail_stand();
  end if;
  perform public.mail_aan('de', 'Europe/Berlin');
  if not (public.mail_stand() ->> 'aan')::boolean then raise exception 'gezakt: na aanzetten staat het niet aan'; end if;
  reset role;
  raise notice 'ok: met een bevestigd adres: wel, en mail_stand zegt het';

  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a2');
  perform public.mail_aan('nl', 'Europe/Amsterdam');
  reset role;
end $$;

-- ---- 2. de tabel zelf is dicht ---------------------------------------------------------------
do $$
begin
  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a1');
  perform pg_temp.fout_bij($q$select token from public.mail_abonnementen$q$, 'permission denied', 'een account leest de tabel niet, ook zijn eigen token niet');
  perform pg_temp.fout_bij($q$update public.mail_abonnementen set taal = 'en'$q$, 'permission denied', 'en schrijft er niet in');
  perform pg_temp.fout_bij($q$insert into public.mail_abonnementen (user_id) values ('a0000000-0000-0000-0000-0000000000a3')$q$,
    'permission denied', 'en zet er niemand anders in');
  reset role;
  set local role anon;
  perform pg_temp.fout_bij($q$select count(*) from public.mail_abonnementen$q$, 'permission denied', 'zonder account ook niet');
  reset role;
end $$;

-- ---- 3. uitzetten en bijwerken -------------------------------------------------------------
do $$
begin
  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a1');
  if not public.mail_bijwerken('fr', 'Europe/Paris') then raise exception 'gezakt: bijwerken vond de rij niet'; end if;
  reset role;
  if (select taal || ' ' || tijdzone from public.mail_abonnementen where user_id = 'a0000000-0000-0000-0000-0000000000a1')
     is distinct from 'fr Europe/Paris' then
    raise exception 'gezakt: bijwerken zette de taal en tijdzone niet';
  end if;
  raise notice 'ok: bijwerken zet de taal en de tijdzone';

  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a3');
  if public.mail_bijwerken('nl', 'Europe/Amsterdam') then raise exception 'gezakt: bijwerken zonder rij geeft true'; end if;
  reset role;
  if exists (select 1 from public.mail_abonnementen where user_id = 'a0000000-0000-0000-0000-0000000000a3') then
    raise exception 'gezakt: bijwerken zette mail aan';
  end if;
  raise notice 'ok: bijwerken zet mail nooit aan';

  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a1');
  perform public.mail_uit();
  reset role;
  if exists (select 1 from public.mail_abonnementen where user_id = 'a0000000-0000-0000-0000-0000000000a1')
     or not exists (select 1 from public.mail_abonnementen where user_id = 'a0000000-0000-0000-0000-0000000000a2') then
    raise exception 'gezakt: uitzetten raakte de verkeerde rij';
  end if;
  raise notice 'ok: uitzetten haalt alleen je eigen rij weg';
end $$;

-- ---- 4. de afmeldlink ---------------------------------------------------------------------
do $$
declare v_token uuid;
begin
  select token into v_token from public.mail_abonnementen where user_id = 'a0000000-0000-0000-0000-0000000000a2';
  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a1');
  perform public.mail_aan('nl', null);
  reset role;
  set local role anon;
  if public.mail_afmelden('00000000-0000-0000-0000-000000000000') then raise exception 'gezakt: een verkeerd token meldde iemand af'; end if;
  if not public.mail_afmelden(v_token) then raise exception 'gezakt: het goede token meldde niemand af'; end if;
  if public.mail_afmelden(v_token) then raise exception 'gezakt: hetzelfde token werkte twee keer'; end if;
  reset role;
  if exists (select 1 from public.mail_abonnementen where user_id = 'a0000000-0000-0000-0000-0000000000a2')
     or not exists (select 1 from public.mail_abonnementen where user_id = 'a0000000-0000-0000-0000-0000000000a1') then
    raise exception 'gezakt: de afmeldlink raakte de verkeerde rij';
  end if;
  raise notice 'ok: de afmeldlink werkt zonder account, met het token, voor die ene rij';
end $$;

-- ---- 5. wat de sync ziet ---------------------------------------------------------------------
do $$
begin
  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a2');
  perform public.mail_aan('xx', 'Europe/Amsterdam; drop');
  reset role;
  if (select string_agg(user_id::text || '=' || taal || '/' || coalesce(tijdzone, '-'), ',' order by user_id)
        from public.mail_ontvangers())
     is distinct from 'a0000000-0000-0000-0000-0000000000a1=nl/-,a0000000-0000-0000-0000-0000000000a2=en/-' then
    raise exception 'gezakt: mail_ontvangers: %', (select string_agg(user_id::text || '=' || taal || '/' || coalesce(tijdzone, '-'), ',')
                                                     from public.mail_ontvangers());
  end if;
  raise notice 'ok: een onbekende taal wordt Engels, een rare tijdzone komt er niet in';

  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'mail_abonnementen' and column_name ~ 'mail|adres|email') then
    raise exception 'gezakt: de tabel heeft een kolom voor het adres';
  end if;
  raise notice 'ok: het adres staat niet in de tabel';

  -- Een adres dat weer onbevestigd raakt (een wissel naar een nieuw adres die
  -- nog loopt): dan niet meer bij de ontvangers.
  update auth.users set email_confirmed_at = null where id = 'a0000000-0000-0000-0000-0000000000a2';
  if exists (select 1 from public.mail_ontvangers() where user_id = 'a0000000-0000-0000-0000-0000000000a2') then
    raise exception 'gezakt: een onbevestigd adres staat bij de ontvangers';
  end if;
  update auth.users set email_confirmed_at = now() where id = 'a0000000-0000-0000-0000-0000000000a2';
  raise notice 'ok: alleen zolang het adres bevestigd is';

  perform pg_temp.als('a0000000-0000-0000-0000-0000000000a1');
  perform pg_temp.fout_bij($q$select * from public.mail_ontvangers()$q$, 'permission denied', 'een account roept mail_ontvangers niet aan');
  reset role;
  set local role anon;
  perform pg_temp.fout_bij($q$select * from public.mail_ontvangers()$q$, 'permission denied', 'zonder account ook niet');
  reset role;
  set local role service_role;
  if (select count(*) from public.mail_ontvangers()) <> 2 then raise exception 'gezakt: de sync ziet de ontvangers niet'; end if;
  reset role;
  raise notice 'ok: de sync wel';
end $$;

-- ---- 7. weg met het account, en de controleregels ------------------------------------------
do $$
begin
  delete from auth.users where id = 'a0000000-0000-0000-0000-0000000000a1';
  if exists (select 1 from public.mail_abonnementen where user_id = 'a0000000-0000-0000-0000-0000000000a1') then
    raise exception 'gezakt: de rij bleef staan na het account';
  end if;
  raise notice 'ok: weg met het account, weg met de rij';

  if (select uitkomst from public.poule_controle where controle = 'functies en tabellen: alleen die uit schema.sql') <> 'ok'
     or (select uitkomst from public.poule_controle where controle = 'policies: alleen die uit schema.sql') <> 'ok' then
    raise exception 'gezakt: de controleregels kennen de mail niet: %',
      (select string_agg(controle || ' = ' || uitkomst, '; ') from public.poule_controle
        where controle like 'functies%' or controle like 'policies%');
  end if;
  raise notice 'ok: de controleregels kennen de tabel en de functies';
end $$;
