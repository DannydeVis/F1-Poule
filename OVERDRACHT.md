# F1 Poule: overdracht

Poule-app voor F1 kwalificatie- en race-top-10 voorspellen met vrienden.
Single-file frontend (`index.html`), Supabase als backend (`schema.sql`),
losse browser-tool om OpenF1-data te synchroniseren (`sync.html`).

Live op: https://dannydevis.github.io/F1-Poule/
Repo: https://github.com/DannydeVis/F1-Poule

## Eerst dit doen

De bewaar-bug is opgelost, maar de fix gaat ervan uit dat de database de
juiste sleutels heeft. **Draai `schema.sql` in de Supabase SQL editor voor
je de app opnieuw test.** Onderaan dat script staat een controletabel; daar
hoort overal `ok` te staan.

Blijft het daarna misgaan, dan wijkt de oude tabelstructuur te ver af:
draai eerst `reset.sql`, dan `schema.sql`, dan `sync.html` →
"Kalender ophalen" en "Uitslagen bijwerken".

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

- **Sync draait in de browser (`sync.html`)**, niet via Node/npm. Reden:
  gebruiker zit op een werk-pc zonder mogelijkheid om Node.js te
  installeren. Er was eerst een `sync.mjs` met service role key, die is
  vervangen. Let op: dit betekent dat de `races`-tabel ook open staat voor
  de anon key (schrijfbaar), wat een bewuste afwijking is van "alleen de
  service role mag races wijzigen".

## Opgelost: opslaan van een voorspelling

**Wat er mis was.** `bewaar()` schreef netjes naar de database, maar werkte
`S.preds` in het geheugen niet bij. `toonRaces()` en `openRace()` lezen de
ingevulde top 10 uit `S.preds`, dus bij het opnieuw openen van de race stond
er niets — terwijl de rij in Supabase gewoon klopte. De eerder bedachte fix
(na `bewaar()` ook `laad()` aanroepen) stond nog niet in de repo; de laatste
commit bevatte hem niet.

Nagespeeld in Chromium met een nagebootste Supabase: de oude versie schrijft
de rij weg en toont daarna 0 van de 10 plekken ingevuld. Precies het gemelde
symptoom.

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
  Nu staat er wat er moet gebeuren: `sync.html` draaien.

## Openstaande datakwaliteit

- Twee races (rondes 4 en 5 volgens sync-log) geven een 404 op
  `session_result` bij OpenF1 zelf. Niet oplosbaar vanuit de code, is een
  gat aan de kant van OpenF1 (bevestigd via hun eigen GitHub-issues,
  `session_result` is bij hen een beta-endpoint). Workaround: opnieuw
  proberen via sync.html, of handmatig invullen in Supabase Table Editor.

## Nog niet getest tegen de echte database

De fix is nagespeeld in Chromium tegen een nagebootste Supabase, en
`schema.sql` is gedraaid tegen een echte PostgreSQL 16 (inclusief de
deadline-trigger en het opruimen van dubbele rijen). Tegen het echte
Supabase-project is niet getest, dus dat blijft de laatste stap.

## Bestanden in de repo

| Bestand | Doel |
|---|---|
| `index.html` | De poule zelf: races bekijken, voorspellen, stand |
| `sync.html` | Admin-tool, haalt kalender/uitslagen uit OpenF1, draait in de browser |
| `schema.sql` | Volledig databaseschema, opnieuw te draaien in de Supabase SQL editor |
| `reset.sql` | Gooit oude tabellen weg, draai vóór schema.sql bij een schone herstart |

Supabase-project: `etifamdwqxjfaeaordlr` (URL en anon key staan bovenin
`index.html` en `sync.html`, zijn bewust publiek want dat hoort bij de
anon key).
