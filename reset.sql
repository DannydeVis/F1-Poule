-- ============================================================
--  F1 Poule — schone herstart
--
--  LET OP: dit gooit alle poules, spelers, races en voorspellingen weg.
--  Alleen draaien als schema.sql de bestaande tabellen niet meer recht
--  kan trekken, bijvoorbeeld omdat er nog een oudere structuur staat uit
--  de versie met Supabase Auth.
--
--  Volgorde: eerst dit bestand, daarna schema.sql, daarna sync.html
--  openen en op "Kalender ophalen" klikken.
-- ============================================================

drop trigger  if exists predictions_deadline on public.predictions;
drop function if exists public.poule_deadline_bewaken() cascade;

drop table if exists public.answers        cascade;
drop table if exists public.pool_questions cascade;
drop table if exists public.questions      cascade;
drop table if exists public.predictions    cascade;
drop table if exists public.pool_members   cascade;
drop table if exists public.races          cascade;
drop table if exists public.pools          cascade;

-- Restanten uit de versie met magic-link login, mochten die er nog staan.
drop table if exists public.profiles     cascade;
drop table if exists public.memberships  cascade;

select 'oude tabellen verwijderd, draai nu schema.sql' as volgende_stap;
