-- Supabase levert het schema `auth` mee: de tabel met accounts, en de functie
-- auth.uid() die zegt wie het verzoek doet. Gewone PostgreSQL heeft dat niet,
-- dus zonder dit bestand is schema.sql lokaal en in de CI niet eens te
-- draaien zodra er policies op auth.uid() staan.
--
-- Dit hoort NIET in schema.sql. Bij Supabase bestaat dit al, en het daar nog
-- eens aanmaken is op zijn best overbodig en op zijn slechtst schadelijk.
-- Het is testgereedschap, en het staat daarom hier.
--
-- De nabootsing volgt de echte implementatie van Supabase: auth.uid() leest
-- de `sub` uit de JWT-claims die PostgREST per verzoek als session-instelling
-- meegeeft. Een test doet dus:
--
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uuid>"}';
--
-- en is vanaf dat moment die gebruiker. Zonder claims is auth.uid() null, en
-- dat is precies wat een niet-ingelogde bezoeker (anon) hoort te zijn.

\set ON_ERROR_STOP on

create schema if not exists auth;

-- Alleen de kolommen die wij aanraken. De echte tabel heeft er tientallen.
create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

-- anon en authenticated moeten auth.uid() kunnen aanroepen, anders valt elke
-- policy die hem gebruikt om met "permission denied for schema auth".
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select on auth.users to anon, authenticated;

do $$ begin raise notice 'ok: auth-nabootsing klaar (auth.users + auth.uid())'; end $$;
