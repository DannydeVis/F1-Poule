-- Premium, stap 1: het eigen profiel van een poule (logo, kleur, sponsorregel).
--
-- De code is openbaar en de anon key ook, dus wie wat mag staat in de
-- database en niet alleen in de app. Wat hier vastligt:
--
--   1. premium_tot zet alleen het beheer (beheer_poule_bijwerken); een
--      poulebaas kan het niet voor zichzelf aanzetten, een speler al helemaal
--      niet, en het beheer is voor iedereen anders dicht.
--   2. Zonder premium kan de poulebaas geen logo, kleur of sponsorregel
--      zetten; met premium wel. Weghalen mag altijd, ook als premium voorbij
--      is. Een gewone speler kan het profiel niet aanpassen.
--   3. De waarden zelf: een kleur is #rrggbb, een sponsorlink is https zonder
--      spaties of haakjes (geen javascript:), een link heeft een tekst, de
--      tekst is hoogstens 80 tekens, en het logo staat in de map van deze
--      poule, als png, jpg of webp (geen svg).
--   4. De logo's in de bucket poulelogo: openbaar, hoogstens 200 kB, geen
--      svg. Zetten, vervangen en weghalen alleen in de map van je eigen
--      poule, als poulebaas, zolang premium loopt. Niet in een andere map,
--      niet in een andere bucket, niet als speler en niet zonder premium. De
--      lijst met bestanden is niet te lezen voor wie geen poulebaas is: de
--      mappen zijn ids van poules, en met een id kom je een poule binnen.
--   5. Wie met een code binnenkomt (poule_ophalen) krijgt het profiel mee,
--      zodat het scherm waar je je naam kiest het logo kan tonen.

\set ON_ERROR_STOP on

insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  -- de beheerder (in site_beheerders, hieronder)
  ('dddddddd-0000-0000-0000-0000000000a1', 'beheerder@voorbeeld.nl', now(), false),
  -- Anna: poulebaas van poule A
  ('aaaaaaaa-0000-0000-0000-0000000000a2', null, null, true),
  -- Bram: speelt mee in poule A, maar is geen poulebaas
  ('bbbbbbbb-0000-0000-0000-0000000000a3', null, null, true),
  -- Chris: poulebaas van poule B, zonder premium
  ('cccccccc-0000-0000-0000-0000000000a4', null, null, true);
insert into public.site_beheerders (user_id) values ('dddddddd-0000-0000-0000-0000000000a1');

insert into pools (id, name, join_code) values
  ('11111111-0000-0000-0000-0000000000a1', 'Bedrijfspoule', 'PREM01'),
  ('22222222-0000-0000-0000-0000000000a2', 'Vriendenpoule', 'PREM02');
insert into pool_members (member_id, pool_id, display_name, user_id) values
  ('aaaa0000-0000-0000-0000-0000000000a1', '11111111-0000-0000-0000-0000000000a1', 'Anna', 'aaaaaaaa-0000-0000-0000-0000000000a2'),
  ('bbbb0000-0000-0000-0000-0000000000a2', '11111111-0000-0000-0000-0000000000a1', 'Bram', 'bbbbbbbb-0000-0000-0000-0000000000a3'),
  ('cccc0000-0000-0000-0000-0000000000a3', '22222222-0000-0000-0000-0000000000a2', 'Chris', 'cccccccc-0000-0000-0000-0000000000a4');
update pools set owner_member_id = 'aaaa0000-0000-0000-0000-0000000000a1' where id = '11111111-0000-0000-0000-0000000000a1';
update pools set owner_member_id = 'cccc0000-0000-0000-0000-0000000000a3' where id = '22222222-0000-0000-0000-0000000000a2';

do $$
declare
  gelukt boolean;
  fout   text;
  n      int;
  uit    jsonb;
begin
  -- ============================================================
  --  1. premium aanzetten kan alleen het beheer
  -- ============================================================
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2"}', true);

  fout := null;
  begin
    update pools set premium_tot = now() + interval '1 year' where id = '11111111-0000-0000-0000-0000000000a1';
  exception when others then fout := sqlerrm;
  end;
  if fout is null or fout not like '%alleen het beheer%' then
    raise exception 'gezakt: de poulebaas zette premium voor zichzelf aan (%)', fout;
  end if;
  raise notice 'ok: de poulebaas kan premium niet voor zichzelf aanzetten';

  fout := null;
  begin
    perform public.beheer_poule_bijwerken('11111111-0000-0000-0000-0000000000a1',
      jsonb_build_object('premium_tot', (now() + interval '1 year')::text));
  exception when others then fout := sqlerrm;
  end;
  if fout is null then raise exception 'gezakt: de poulebaas kwam via het beheer aan premium'; end if;
  raise notice 'ok: en via het beheer ook niet: dat is alleen voor de beheerder';

  -- ============================================================
  --  2. zonder premium geen eigen profiel
  -- ============================================================
  fout := null;
  begin
    update pools set merk_kleur = '#1a2b3c' where id = '11111111-0000-0000-0000-0000000000a1';
  exception when others then fout := sqlerrm;
  end;
  if fout is null or fout not like '%alleen met premium%' then
    raise exception 'gezakt: zonder premium kon de poulebaas een kleur zetten (%)', fout;
  end if;
  fout := null;
  begin
    update pools set sponsor_tekst = 'Bakkerij Jansen' where id = '11111111-0000-0000-0000-0000000000a1';
  exception when others then fout := sqlerrm;
  end;
  if fout is null then raise exception 'gezakt: zonder premium kon de poulebaas een sponsorregel zetten'; end if;
  raise notice 'ok: zonder premium geen kleur en geen sponsorregel';

  -- De beheerder zet premium aan.
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-0000000000a1"}', true);
  uit := public.beheer_poule_bijwerken('11111111-0000-0000-0000-0000000000a1',
    jsonb_build_object('premium_tot', (now() + interval '1 year')::text));
  if (uit ->> 'premium_tot') is null then raise exception 'gezakt: het beheer zette premium niet aan: %', uit; end if;
  raise notice 'ok: de beheerder zet premium aan';

  -- Nu mag het wel.
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2"}', true);
  update pools set merk_kleur = '#1a2b3c', sponsor_tekst = 'Bakkerij Jansen',
    sponsor_url = 'https://bakkerij-jansen.example/actie?bron=poule',
    merk_logo = '11111111-0000-0000-0000-0000000000a1/logo-1.png'
  where id = '11111111-0000-0000-0000-0000000000a1';
  if not found then raise exception 'gezakt: met premium kon de poulebaas zijn profiel niet zetten'; end if;
  raise notice 'ok: met premium zet de poulebaas logo, kleur en sponsorregel';

  -- Bram speelt mee maar is geen poulebaas: hij raakt niets.
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-0000000000a3"}', true);
  update pools set merk_kleur = '#ffffff' where id = '11111111-0000-0000-0000-0000000000a1';
  gelukt := found;
  if gelukt then raise exception 'gezakt: een speler zonder poulebaas-rechten paste de kleur aan'; end if;
  raise notice 'ok: een gewone speler past het profiel niet aan';

  -- ============================================================
  --  3. de waarden
  -- ============================================================
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2"}', true);
  n := 0;
  for fout in select unnest(array[
      $q$update pools set merk_kleur = 'red' where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set merk_kleur = '#1A2B3C' where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set sponsor_url = 'javascript:alert(1)' where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set sponsor_url = 'http://bakkerij.example/' where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set sponsor_url = 'https://bakkerij.example/"><script>' where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set sponsor_url = 'https://bakkerij .example/' where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set sponsor_tekst = repeat('x', 81) where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set sponsor_tekst = '   ' where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set sponsor_tekst = null where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set merk_logo = '22222222-0000-0000-0000-0000000000a2/logo.png' where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set merk_logo = '11111111-0000-0000-0000-0000000000a1/logo.svg' where id = '11111111-0000-0000-0000-0000000000a1'$q$,
      $q$update pools set merk_logo = '11111111-0000-0000-0000-0000000000a1/../logo.png' where id = '11111111-0000-0000-0000-0000000000a1'$q$
    ]) loop
    begin
      execute fout;
    exception when check_violation then n := n + 1;
    end;
  end loop;
  if n <> 12 then raise exception 'gezakt: % van de 12 verkeerde waarden werden geweigerd', n; end if;
  raise notice 'ok: een kleur is #rrggbb, een link is https zonder rare tekens en met een tekst, het logo staat in de eigen map en is geen svg';

  -- ============================================================
  --  4. de logo's in de opslag
  -- ============================================================
  reset role;
  select count(*) into n from storage.buckets
  where id = 'poulelogo' and public and file_size_limit = 204800
    and allowed_mime_types @> array['image/png', 'image/jpeg', 'image/webp']
    and not allowed_mime_types && array['image/svg+xml'];
  if n <> 1 then raise exception 'gezakt: de bucket poulelogo is er niet, of niet openbaar met 200 kB en zonder svg'; end if;
  raise notice 'ok: de bucket poulelogo is openbaar, hoogstens 200 kB, png, jpeg of webp';
  set local role authenticated;

  -- Anna in de map van haar eigen poule: ja.
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2"}', true);
  insert into storage.objects (bucket_id, name) values ('poulelogo', '11111111-0000-0000-0000-0000000000a1/logo-2.png');
  update storage.objects set metadata = '{"vervangen":true}'
  where bucket_id = 'poulelogo' and name = '11111111-0000-0000-0000-0000000000a1/logo-2.png';
  if not found then raise exception 'gezakt: de poulebaas kon zijn logo niet vervangen'; end if;
  raise notice 'ok: de poulebaas zet en vervangt een logo in de map van zijn poule';

  -- In een andere map, een andere bucket, als speler, zonder premium: nee.
  n := 0;
  for fout, uit in select * from (values
      ('aaaaaaaa-0000-0000-0000-0000000000a2', '{"b":"poulelogo","n":"22222222-0000-0000-0000-0000000000a2/logo.png"}'::jsonb),
      ('aaaaaaaa-0000-0000-0000-0000000000a2', '{"b":"poulelogo","n":"logo.png"}'::jsonb),
      ('aaaaaaaa-0000-0000-0000-0000000000a2', '{"b":"poulelogo","n":"geen-uuid/logo.png"}'::jsonb),
      ('aaaaaaaa-0000-0000-0000-0000000000a2', '{"b":"anders","n":"11111111-0000-0000-0000-0000000000a1/logo.png"}'::jsonb),
      ('bbbbbbbb-0000-0000-0000-0000000000a3', '{"b":"poulelogo","n":"11111111-0000-0000-0000-0000000000a1/logo-3.png"}'::jsonb),
      ('cccccccc-0000-0000-0000-0000000000a4', '{"b":"poulelogo","n":"22222222-0000-0000-0000-0000000000a2/logo.png"}'::jsonb)
    ) as t(wie, wat) loop
    perform set_config('request.jwt.claims', jsonb_build_object('sub', fout)::text, true);
    begin
      insert into storage.objects (bucket_id, name) values (uit ->> 'b', uit ->> 'n');
    exception when insufficient_privilege or foreign_key_violation then n := n + 1;
    end;
  end loop;
  if n <> 6 then raise exception 'gezakt: % van de 6 verkeerde uploads werden geweigerd', n; end if;
  raise notice 'ok: niet in een andere map of bucket, niet als speler, niet zonder premium';

  -- De mappen zijn ids van poules: wie geen poulebaas is, ziet ze niet.
  perform set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-0000000000a4"}', true);
  select count(*) into n from storage.objects where bucket_id = 'poulelogo';
  if n <> 0 then raise exception 'gezakt: een vreemde ziet % logo-bestanden, en daarmee ids van poules', n; end if;
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '', true);
  select count(*) into n from storage.objects where bucket_id = 'poulelogo';
  if n <> 0 then raise exception 'gezakt: zonder account zie je % logo-bestanden', n; end if;
  reset role;
  set local role authenticated;
  raise notice 'ok: de lijst met logo-bestanden (en dus de ids van poules) is niet te lezen voor wie geen poulebaas is';

  -- Bram kan het logo van Anna niet weggooien; Anna zelf wel.
  perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-0000000000a3"}', true);
  delete from storage.objects where name = '11111111-0000-0000-0000-0000000000a1/logo-2.png';
  if found then raise exception 'gezakt: een speler gooide het logo van de poulebaas weg'; end if;
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2"}', true);
  delete from storage.objects where name = '11111111-0000-0000-0000-0000000000a1/logo-2.png';
  if not found then raise exception 'gezakt: de poulebaas kon zijn eigen logo niet weggooien'; end if;
  raise notice 'ok: weghalen alleen door de poulebaas';

  if public.mag_logo_zetten('geen uuid') or public.mag_logo_zetten(null) then
    raise exception 'gezakt: mag_logo_zetten zegt ja tegen een map die geen poule is';
  end if;
  raise notice 'ok: een map die geen uuid is, is nee (en geen fout)';

  -- ============================================================
  --  5. binnenkomen met de code: het profiel komt mee
  -- ============================================================
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', '', true);
  uit := public.poule_ophalen('PREM01');
  if uit -> 'poule' ->> 'merk_kleur' is distinct from '#1a2b3c'
     or uit -> 'poule' ->> 'sponsor_tekst' is distinct from 'Bakkerij Jansen'
     or uit -> 'poule' ->> 'merk_logo' is null or uit -> 'poule' ->> 'premium_tot' is null then
    raise exception 'gezakt: wie met de code binnenkomt krijgt het profiel niet mee: %', uit -> 'poule';
  end if;
  raise notice 'ok: wie met de code binnenkomt, krijgt het profiel mee (voor het scherm waar je je naam kiest)';

  -- ============================================================
  --  6. premium voorbij: niets nieuws meer, weghalen wel
  -- ============================================================
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-0000000000a1"}', true);
  perform public.beheer_poule_bijwerken('11111111-0000-0000-0000-0000000000a1',
    jsonb_build_object('premium_tot', (now() - interval '1 day')::text));
  perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-0000000000a2"}', true);
  fout := null;
  begin
    update pools set merk_kleur = '#00aa00' where id = '11111111-0000-0000-0000-0000000000a1';
  exception when others then fout := sqlerrm;
  end;
  if fout is null then raise exception 'gezakt: na premium kon de poulebaas nog een kleur zetten'; end if;
  gelukt := false;
  begin
    insert into storage.objects (bucket_id, name) values ('poulelogo', '11111111-0000-0000-0000-0000000000a1/logo-4.png');
    gelukt := true;
  exception when insufficient_privilege then null;
  end;
  if gelukt then raise exception 'gezakt: na premium kon de poulebaas nog een logo zetten'; end if;
  update pools set merk_kleur = null, merk_logo = null, sponsor_url = null, sponsor_tekst = null
  where id = '11111111-0000-0000-0000-0000000000a1';
  if not found then raise exception 'gezakt: na premium kon de poulebaas zijn profiel niet weghalen'; end if;
  raise notice 'ok: is premium voorbij, dan geen nieuwe kleur of logo meer, maar weghalen kan altijd';

  -- En zonder datum (premium uit) kan het beheer hem weer leegmaken.
  perform set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-0000000000a1"}', true);
  uit := public.beheer_poule_bijwerken('11111111-0000-0000-0000-0000000000a1', '{"premium_tot": ""}'::jsonb);
  if uit ->> 'premium_tot' is not null then raise exception 'gezakt: het beheer kan premium niet uitzetten'; end if;
  raise notice 'ok: het beheer zet premium ook weer uit';
end $$;

-- De controletabel onderaan schema.sql zegt ok, en ziet het als de bewaking
-- of een regel van de opslag ontbreekt.
do $$
declare uitkomst text;
begin
  select c.uitkomst into uitkomst from public.poule_controle c where c.controle = 'premium: kolommen, bewaking en logo-opslag';
  if uitkomst is distinct from 'ok' then raise exception 'gezakt: de controletabel zegt % over premium', uitkomst; end if;
  drop policy poulelogo_lezen on storage.objects;
  select c.uitkomst into uitkomst from public.poule_controle c where c.controle = 'premium: kolommen, bewaking en logo-opslag';
  if uitkomst not like 'LOGO-OPSLAG ONTBREEKT%' then raise exception 'gezakt: zonder een regel van de opslag zegt de controle %', uitkomst; end if;
  drop trigger pools_profiel_bewaken on public.pools;
  select c.uitkomst into uitkomst from public.poule_controle c where c.controle = 'premium: kolommen, bewaking en logo-opslag';
  if uitkomst not like 'BEWAKING ONTBREEKT%' then raise exception 'gezakt: zonder de bewaking zegt de controle %', uitkomst; end if;
  raise notice 'ok: de controletabel zegt ok over premium, en ziet een ontbrekende bewaking of opslagregel';
end $$;

do $$ begin raise notice 'ok: premium.test.sql helemaal geslaagd'; end $$;
