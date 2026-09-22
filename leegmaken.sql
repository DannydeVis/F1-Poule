-- ============================================================
--  F1 Poule — schone start met behoud van de kalender
--
--  Gooit alle poules, spelers en inzendingen weg, en laat de races en de
--  vragenlijst staan. Dat is het verschil met reset.sql: die sloopt de
--  tabellen zelf, waarna je schema.sql opnieuw moet draaien én de kalender
--  opnieuw moet ophalen. Dit bestand raakt de structuur niet aan.
--
--  Wat weggaat          poules, spelers, antwoorden, de vragenkeuze per
--                       poule, en de rijen in de oude predictions-tabel
--  Wat blijft           de 24 races met hun deelnemerslijsten en uitslagen,
--                       de vragenlijst zelf, en alle accounts
--
--  DIT IS NIET TERUG TE DRAAIEN. Supabase maakt automatisch back-ups, maar
--  terugzetten is een hersteloperatie en geen ongedaan-maken. Weet zeker dat
--  je dit wilt voordat je op Run drukt.
--
--  Draaien in de SQL-editor van Supabase. Daarna hoeft er niets meer: de app
--  werkt meteen, en de eerste die een poule aanmaakt begint met een lege lei.
-- ============================================================

begin;

-- Van onder naar boven uitgeschreven, ook al zou `delete from pools` in zijn
-- eentje genoeg zijn: alles hangt met `on delete cascade` aan de poule. Twee
-- redenen om het toch voluit te zetten. Je ziet hier precies welke zes
-- tabellen geraakt worden zonder de sleutels in schema.sql na te lopen, en op
-- een database van vóór die sleutels (waar een kolom nog nullable was) kan
-- een cascade een losse rij laten staan die hier wel meegaat.
--
-- jokers staat vooraan omdat hij van drie kanten afhangt: de poule, de race
-- en de speler. De trigger eromheen is er voor spelers -- "je joker ligt vast
-- zodra het weekend begint" -- en niet voor de beheerder die de boel
-- leegmaakt, dus die gaat hier even uit. Een cascade laat hij vanzelf door,
-- maar dit is een rechtstreekse delete.
alter table public.jokers disable trigger jokers_bewaken;
delete from public.push_abonnementen;
delete from public.jokers;
alter table public.jokers enable trigger jokers_bewaken;
delete from public.answers;
delete from public.pool_questions;
delete from public.predictions;
delete from public.pool_members;
delete from public.pools;

-- ---- de accounts ------------------------------------------
-- Staan er standaard NIET bij. Een account is niet hetzelfde als een speler:
-- wie straks opnieuw inlogt is gewoon weer zichzelf en maakt een nieuwe
-- speler aan. Wil je ook echt met onbekende mensen opnieuw beginnen, haal
-- dan de commentaartekens hieronder weg. Let op dat je daarmee ook je eigen
-- inlog weggooit.
--
-- delete from auth.users;

commit;

-- ---- controle ---------------------------------------------
-- Alles links hoort nul te zijn, alles rechts hoort te staan zoals het was.
select 'poules',              (select count(*)::text from public.pools)
union all
select 'spelers',             (select count(*)::text from public.pool_members)
union all
select 'ingevulde antwoorden',(select count(*)::text from public.answers)
union all
select 'vragenkeuze per poule',(select count(*)::text from public.pool_questions)
union all
select 'oude voorspellingen', (select count(*)::text from public.predictions)
union all
select 'gezette jokers',       (select count(*)::text from public.jokers)
union all
select '— hieronder hoort niets weg te zijn —', ''
union all
select 'races',               (select count(*)::text from public.races)
union all
select 'races met uitslag',
       (select count(*)::text from public.races where race_result is not null)
union all
select 'vragen in de lijst',  (select count(*)::text from public.questions)
union all
select 'accounts',            (select count(*)::text from auth.users);
