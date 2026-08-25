# F1 Poule: overdracht

Poule-app voor F1 kwalificatie- en race-top-10 voorspellen met vrienden.
Single-file frontend (`index.html`), Supabase als backend (`schema.sql`),
en een synchronisatie die de OpenF1-data binnenhaalt.

Live op: https://dannydevis.github.io/F1-Poule/
Repo: https://github.com/DannydeVis/F1-Poule

## Stand van zaken

De bewaar-bug is opgelost en staat live. `schema.sql` is op 24 augustus 2026
tegen het echte Supabase-project gedraaid en kwam schoon door: de drie
structurele controles op `ok`, en 7 poules, 7 spelers, 25 races en 4
voorspellingen bleven staan.

Daarna bleek in de praktijk dat het opslaan nog steeds niet leek te werken,
en dat de poulecode elke keer opnieuw ingevuld moest worden. Dat had een
andere oorzaak dan de eerste bug; zie hieronder. Ook dat is opgelost, maar
nog niet in de praktijk bevestigd.

Let op: er staan meerdere poules en spelers in de database die door die bug
zijn ontstaan. Welke echt in gebruik is, is nog niet uitgezocht.

## Architectuurkeuzes, en waarom

- **Geen Supabase Auth.** Eerst wel gebouwd met magic-link login, maar dat
  liep vast op `file://` URLs die Supabase niet als geldige redirect
  accepteert. Nu: spelers kiezen zichzelf uit een lijst, hun keuze wordt
  onthouden in `localStorage` per pool. Geen wachtwoord, poulecode is de
  enige drempel. RLS-policies staan daarom open voor de `anon` rol op alle
  tabellen (`using (true)`), behalve de deadline-trigger op `predictions`,
  die is wel hard afgedwongen in de database.

- **Punten via `max(0, 5 - 2 * afstand)`**, niet 10/1. Reden: bij 10/1 straft
  een cascade (één coureur valt uit, de rest schuift op) een bijna perfecte
  voorspelling zwaar af. Zit als losse, apart geteste functie `scoreLijst()`
  bovenin het script.

- **`quali_result` en `race_result` bevatten de volledige uitslag**, niet
  alleen de top 10. Anders levert P10-die-P11-wordt onterecht 0 punten op
  in plaats van 3.

- **Sync draait op GitHub Actions** (`scripts/sync.mjs`, elke 3 uur via
  `.github/workflows/sync.yml`), met de service_role key als repository
  secret. Er is lang bewust géén Node gebruikt omdat er op de werk-pc niets
  te installeren valt; op een runner speelt dat bezwaar niet, dus daar kan
  het wel. Het script gebruikt alleen de ingebouwde `fetch`, dus ook daar
  geen `npm install`.

- **`sync.html` bestaat nog als handmatige noodknop**, voor als je buiten
  het schema om iets wilt ophalen. Die draait in de browser op de anon key,
  en daarom staat de `races`-tabel ook voor `anon` schrijfbaar. Zou je
  `sync.html` ooit uitfaseren, dan kan die policy strenger: de Actions-sync
  gebruikt de service_role key en heeft hem niet nodig.

## Opgelost: opslaan van een voorspelling

**Wat er mis was.** `bewaar()` schreef netjes naar de database, maar werkte
`S.preds` in het geheugen niet bij. `toonRaces()` en `openRace()` lezen de
ingevulde top 10 uit `S.preds`, dus bij het opnieuw openen van de race stond
er niets — terwijl de rij in Supabase gewoon klopte. De eerder bedachte fix
(na `bewaar()` ook `laad()` aanroepen) stond nog niet in de repo; de laatste
commit bevatte hem niet.

Nagespeeld in Chromium met een nagebootste Supabase: de oude versie schrijft
de rij weg en toont daarna 0 van de 10 plekken ingevuld. Precies het gemelde
symptoom. Dat de controletabel later 4 bestaande voorspellingen liet zien,
bevestigt het: er werd al die tijd wél weggeschreven.

**Wat er nu gebeurt bij opslaan:**

1. `bewaar()` doet de upsert met een expliciete `onConflict` op
   `(pool_id, race_id, member_id)` en vraagt de weggeschreven rij terug.
   Komt er niets terug, dan is dat een fout in plaats van stille schijnwinst.
2. `laad()` haalt de stand opnieuw op — dit is de eigenlijke fix.
3. Het racesoverzicht toont een bevestiging plus per race twee vinkjes
   (Q en R) die laten zien wat er écht in de database staat.

**Andere dingen die stilzwijgend fout konden gaan en nu een leesbare
melding geven** (belangrijk, want de poule draait op een werk-pc zonder
devtools): ontbrekende unieke sleutel, ontbrekende tabel of kolom, een
RLS-policy die blokkeert, en een mislukte lees-actie in `laad()`.

**Twee bijkomende bugs meegenomen:**

- Na de kwalificatiedeadline stuurde het opslaan de ongewijzigde
  quali-kolom toch mee. Een trigger die op "kolom aanwezig" test in plaats
  van op "kolom gewijzigd" blokkeert dan het opslaan van je race-top-10.
  De frontend stuurt nu alleen nog de lijst waarvan de deadline open staat,
  en de trigger in `schema.sql` vergelijkt `old` met `new`.
- Staat de deelnemerslijst (`races.drivers`) nog niet in de database, dan
  bleef het scherm leeg met een knop die op "nog 10 te kiezen" bleef hangen.
  Nu legt het scherm uit dat de lijst automatisch wordt opgehaald.

## Opgelost: poulecode elke keer opnieuw, en "opslaan lukt niet"

Twee klachten die dezelfde oorzaak deelden.

**De poule werd nooit onthouden.** In `localStorage` stond alleen wie je was
*binnen* een poule (`poule:<id>:mijn_id`), maar nergens wélke poule. De app
startte daardoor altijd op het codescherm. Nu wordt de laatst gebruikte poule
bewaard (`poule:laatste`) en begin je meteen weer in je eigen poule; met een
knop "Andere poule" om eruit te stappen.

**"Meedoen" maakte altijd een nieuwe speler aan.** Kwam je op het scherm
"Wie ben jij?" en typte je je naam in plaats van hem aan te klikken, dan deed
de app blind een `insert` en kreeg je een nieuw `member_id`. Je voorspellingen
hangen aan het oude id en waren daarmee onvindbaar — dat is wat er als
"opslaan lukt niet" uitzag, terwijl de rijen gewoon in de database stonden.
Nu wordt een bestaande naam in dezelfde poule hergebruikt (hoofdletters maken
niet uit) in plaats van gedupliceerd.

Dit verklaart ook waarom er 7 poules en 7 spelers in de database stonden voor
een kleine vriendengroep: elke keer opnieuw beginnen leverde een nieuwe.

**Werkt `localStorage` niet** — privévenster, of een browser die opslag per
site blokkeert — dan lukt onthouden sowieso niet. De app valt daar niet meer
over om (alle toegang zit in een `try`), en zegt het nu met een waarschuwing
op het overzicht in plaats van het stilzwijgend te laten mislukken.

## Opgelost: fout 42830 bij schema.sql

> ERROR: 42830: there is no unique constraint matching given keys for
> referenced table "pool_members"

De productiedatabase had een oudere opzet waarin `member_id` in een
samengestelde primaire sleutel `(pool_id, member_id)` zat. `member_id` is dan
op zichzelf niet uniek, en een foreign key ernaartoe wordt geweigerd.
`create table if not exists` had die tabel ongemoeid gelaten.

`schema.sql` zet dit nu zelf recht: het zet er een unieke sleutel op
`member_id` bij en laat de bestaande primaire sleutel en alle gegevens
staan. Dit pad wordt in CI nagespeeld (`test/oude-structuur.sql`), dus het
kan niet stilzwijgend terugvallen.

## De database opnieuw opzetten

Nodig na een schemawijziging, of als er iets grondig scheef staat:

1. `schema.sql` in de Supabase SQL editor. Is opnieuw uit te voeren op een
   bestaande database en laat onderaan een controletabel zien waar overal
   `ok` hoort te staan.
2. Gaat er iets mis, dan `diagnose.sql`. Dat leest alleen en toont welke
   tabellen, kolommen, sleutels en rijaantallen er werkelijk staan.
3. Wijkt de structuur te ver af: `reset.sql`, dan `schema.sql` opnieuw. Let
   op, `reset.sql` gooit alles weg.
4. Daarna de kalender terughalen: het Actions-tabblad → "Uitslagen
   synchroniseren" → Run workflow, met "Ook de kalender opnieuw ophalen"
   aangevinkt.

## Openstaande datakwaliteit

- 22 van de 25 races hebben een deelnemerslijst. Bij de andere 3 valt nog
  niets in te vullen; de app legt dat inmiddels uit. De sync haalt de lijst
  vanzelf op zodra OpenF1 hem publiceert. Welke races het zijn:

  ```sql
  select round, name, quali_key is null as geen_quali_key
  from races where season = 2026 and drivers is null order by round;
  ```

  Staat `geen_quali_key` op `true`, dan kent OpenF1 die kwalificatiesessie
  niet en moet het handmatig via de Table Editor.

- Eerder gaven twee races een 404 op `session_result` bij OpenF1 zelf. Niet
  oplosbaar vanuit de code: `session_result` is bij hen een beta-endpoint,
  bevestigd via hun eigen GitHub-issues. De sync probeert het elke run
  opnieuw, dus dit lost zichzelf op zodra OpenF1 het gat dicht.

## Tests

Bij elke pull request en elke push naar `main` draait GitHub de tests uit
`test/`: `index.html` wordt echt in Chromium nagespeeld tegen een nagebootste
Supabase, en `schema.sql` wordt uitgevoerd tegen een echte PostgreSQL 16 —
inclusief het migratiepad van de oude tabelstructuur hierboven. De bewaar-bug
kan dus niet stilzwijgend terugkomen.

**De poule zelf heeft geen npm of build-stap nodig.** `index.html` en
`sync.html` blijven bestanden die je rechtstreeks in een browser opent. Node
draait alleen op de runner van GitHub. Zie `test/LEESMIJ.md`.

## Bestanden in de repo

| Bestand | Doel |
|---|---|
| `index.html` | De poule zelf: races bekijken, voorspellen, stand |
| `schema.sql` | Volledig databaseschema, opnieuw te draaien in de Supabase SQL editor |
| `diagnose.sql` | Leest alleen: toont de werkelijke tabellen, kolommen en sleutels |
| `reset.sql` | Gooit oude tabellen weg, draai vóór schema.sql bij een schone herstart |
| `scripts/sync.mjs` | Haalt kalender en uitslagen uit OpenF1, draait in GitHub Actions |
| `sync.html` | Handmatige variant van de sync, draait in de browser |
| `.github/workflows/sync.yml` | Draait de sync elke 3 uur, plus een knop om hem los te starten |
| `.github/workflows/tests.yml` | Draait de tests bij elke pull request en push naar main |
| `test/` | Automatische tests (zie `test/LEESMIJ.md`) |

Supabase-project: `etifamdwqxjfaeaordlr`. De URL en de anon key staan bovenin
`index.html` en `sync.html` en zijn bewust publiek; dat hoort bij de anon key.
De service_role key die de Actions-sync gebruikt staat als repository secret
(`SUPABASE_URL` en `SUPABASE_KEY`) en hoort nergens in de code te staan.
