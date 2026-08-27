# F1 Poule: overdracht

Poule-app voor F1 kwalificatie- en race-top-10 voorspellen met vrienden.
Single-file frontend (`index.html`), Supabase als backend (`schema.sql`),
en een synchronisatie die de OpenF1-data binnenhaalt.

Live op: https://dannydevis.github.io/F1-Poule/
Repo: https://github.com/DannydeVis/F1-Poule

## Stand van zaken

De bewaar-bug is opgelost en staat live. `schema.sql` is op 26 augustus 2026
opnieuw tegen het echte Supabase-project gedraaid, met de kolommen voor de
handmatige uitslag en de losse winnaar erbij, en kwam schoon door: de drie
structurele controles op `ok`, en 25 races met 22 deelnemerslijsten bleven
staan.

Daarna bleek in de praktijk dat het opslaan nog steeds niet leek te werken,
en dat de poulecode elke keer opnieuw ingevuld moest worden. Dat had een
andere oorzaak dan de eerste bug; zie hieronder. Op 25 augustus 2026 is in
de live app bevestigd dat een voorspelling nu blijft staan.

**De dubbele poules zijn opgeruimd op 26 augustus 2026.** Er stonden er negen,
met dertien "spelers". Bij het uitzoeken bleek er niets tussen te zitten dat
bewaard moest worden: alle negen heetten Test, test, tres of danny, en alle
dertien spelers waren dezelfde persoon vanaf verschillende toestellen —
Danny, danny, Danny De Visser werk, Werk, 17pro. Er bestond dus nog geen
echte poule; dit was allemaal aanloop.

Opgeruimd met één regel, want alle foreign keys staan op `on delete cascade`:

```sql
delete from pools;
```

Spelers en voorspellingen gaan daarmee vanzelf mee. **De races bleven met
opzet staan**: die 25 rijen met hun deelnemerslijsten zijn het echte werk en
kosten een volledige sync om terug te halen. Gebruik hiervoor dus nooit
`reset.sql`, want die gooit de races ook weg.

Dat dit kon ontstaan lag aan de bug hieronder: de app onthield nooit in welke
poule je zat, dus elke keer opnieuw beginnen leverde een nieuwe op. Sinds de
uitnodigingslink (`?code=`) is er bovendien geen reden meer voor een vriend om
zelf een poule aan te maken. Eén ding blijft gedrag en geen bug: wie op het ene
toestel "Werk" intikt en op het andere "Danny" krijgt nog steeds twee spelers,
want de app hergebruikt alleen dezelfde naam. Op "Wie ben jij?" staan nu punten
bij elke naam, zodat je jezelf herkent en aantikt in plaats van typt.

Zou je dit later opnieuw willen nakijken, dan laat deze query zien waar wat zit:

```sql
select p.name, p.join_code, p.id,
       count(distinct m.member_id) as spelers,
       count(distinct v.race_id)   as voorspellingen,
       string_agg(distinct m.display_name, ', ') as namen
from pools p
left join pool_members m on m.pool_id = p.id
left join answers      v on v.pool_id = p.id
group by p.id, p.name, p.join_code
order by voorspellingen desc, spelers desc;
```

## Het ontwerp

`index.html` volgt sinds 26 augustus 2026 het ontwerp uit Claude Design
(project "F1-geïnspireerde app redesign", bestand `F1 Poule ontwerp.dc.html`).
Alles zit nog steeds in dat ene bestand: geen build, geen framework.

**De vormtaal.** Barlow Condensed voor koppen, namen en coureurcodes,
Space Mono voor alles wat een tijd of een plek is, Barlow voor lopende tekst.
Ze komen van Google Fonts, maar via een niet-blokkerende `<link>`: zonder
netwerk valt de app terug op de systeemletters en werkt hij gewoon door.
Rood (`--accent`) is de enige signaalkleur, groen is "open", amber is
"uitslag". De teamkleur van een coureur zit in de linkerrand van zijn rij,
zoals hij ook uit de database komt.

**Licht en donker** volgen het toestel via `prefers-color-scheme`. Beide
paletten staan als variabelen bovenin; er is bewust geen knop om te
wisselen, want die stond ook niet in het ontwerp.

**Drie schermbreedtes uit één opmaak.** Onder 960px is het één kolom met de
navigatie als segmentbalk bovenaan. Daarboven wordt diezelfde navigatie een
zijbalk en splitst de inhoud in twee kolommen: links de kalender, rechts de
race die je open hebt staan — of, als er geen race openstaat, de stand met
de laatste uitslag. Dat is precies het verschil tussen de iPad- en de
desktop-tekening: dezelfde opzet, andere vulling.

**Wat er nieuw bij kwam, en waarom.**

- Een **hero-kaart** met de tijd tot de eerstvolgende deadline, die blijft
  lopen zonder herladen (elke 30 seconden). De vijf startlichten eronder
  gaan één voor één aan naarmate de deadline dichterbij komt: boven de week
  één lampje, onder de zes uur alle vijf.
- De hero wijst naar de eerstvolgende race waar ook echt iets te kiezen
  valt. Staat de deelnemerslijst er nog niet, dan wordt die race
  overgeslagen — anders is het een knop naar een leeg scherm.
- Het **startgrid**: de tien plekken staan om en om links en rechts
  ingesprongen, zoals een echte startopstelling.
- Een **Stand-pagina** met podium, en een **Poule-pagina** met de code om te
  delen. Op mobiel waren dat losse tekeningen; de segmentbalk bovenaan is de
  enige toevoeging aan het ontwerp, want zonder die knoppen is er op een
  telefoon geen weg naar die twee schermen.
- Het racedetail opent op het tabblad dat nog openstaat. Is de kwalificatie
  al begonnen, dan begin je dus meteen bij de race in plaats van bij een
  gesloten scherm.

**Wat er niet veranderde.** Alle logica eronder: `scoreLijst()`, `laad()`,
`bewaar()` met zijn expliciete `onConflict`, het onthouden van poule en
speler, en alle foutmeldingen uit `uitleg()`. De haakjes waar de tests aan
hangen (`#code`, `#opslaan`, `.slot.vol`, `.drv`, `.mk i`, `.melding`,
`.err`) zijn met opzet blijven staan, dus de regressietests uit `test/`
dekken de nieuwe opmaak net zo goed als de oude.

## Architectuurkeuzes, en waarom

- **Geen Supabase Auth.** Eerst wel gebouwd met magic-link login, maar dat
  liep vast op `file://` URLs die Supabase niet als geldige redirect
  accepteert. Nu: spelers kiezen zichzelf uit een lijst, hun keuze wordt
  onthouden in `localStorage` per pool. Geen wachtwoord, poulecode is de
  enige drempel. RLS-policies staan daarom open voor de `anon` rol op alle
  tabellen (`using (true)`), behalve de deadline-triggers op `predictions`
  en `answers`, die zijn wel hard afgedwongen in de database.

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
`S.preds` in het geheugen niet bij. Het racesoverzicht en `openRace()` lezen
de ingevulde top 10 uit `S.preds`, dus bij het opnieuw openen van de race stond
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

## Weekendwinnaar, groepsapp en wie er nog moet invullen

De eerste drie punten van `ROUTEKAART.md` staan erin. Alle drie zijn ze een
berekening over gegevens die er al waren; er is niets aan de database
veranderd.

- **Weekendwinnaar.** Onder elke uitslag staat wie dat weekend de meeste
  punten pakte, en op de standpagina een tweede ranglijst met het aantal
  weekendoverwinningen. Dit is er om de reden die de routekaart noemt: wie
  300 punten achterstaat kan nog steeds één weekend winnen, en zonder dat
  is de poule voor de helft van de deelnemers in juni al afgelopen. Een
  gelijke stand levert een gedeelde overwinning op — allebei een streepje
  erbij is eerlijker dan er willekeurig één aanwijzen. Let op het verschil
  met "de rest" eronder: dat blok telt één sessie, de weekendwinnaar telt
  kwalificatie en race samen. Daarom staat dat in het kopje.

- **Kopieerknop voor de groepsapp.** Onder een uitslag zet één knop de
  weekendstand plus de seizoensstand als tekst op het klembord, in de opmaak
  uit de routekaart. Lukt `navigator.clipboard` niet — een oude browser, of
  een pagina die niet over https loopt — dan valt hij terug op
  `document.execCommand('copy')`, en anders komt de tekst gewoon in beeld om
  zelf te selecteren. Stil mislukken is hier het ergste wat er kan gebeuren.

- **Wie heeft er nog niet ingevuld.** Op het racesoverzicht staat in de kaart
  van de openstaande race wie er nog niks heeft ingeleverd. Alleen de
  anderen: dat jij nog moet, zegt de knop eronder al. Samen met de
  kopieerknop is dat het herinneringssysteem, zonder mailserver of
  pushmeldingen.

## Een uitslag met de hand invullen

Punt 4 van `ROUTEKAART.md`. Twee races kregen eerder een 404 op
`session_result` bij OpenF1 en moesten via de Supabase Table Editor worden
rechtgezet; dat kan nu in de app zelf.

**Waar het zit.** Op een sessie waarvan de deadline voorbij is en waar nog
geen uitslag staat, verschijnt op het racescherm de knop "Uitslag zelf
invullen". Je tikt de coureurs aan op volgorde van finish — dezelfde
handeling als het voorspellen, want slepen is op een telefoon een stuk
onbetrouwbaarder. Pas als iedereen een plek heeft kan er opgeslagen worden;
een halve uitslag zou de puntentelling laten denken dat de rest is
uitgevallen.

**De hele uitslag, niet de top 10.** `quali_result` en `race_result`
bevatten de volledige volgorde, om dezelfde reden als hierboven onder
Architectuurkeuzes: anders levert P10-die-P11-wordt onterecht 0 punten op.
De invoer vraagt daarom om het hele deelnemersveld.

**Nooit overschrijven.** `races` is niet van één poule — die tabel is gedeeld
met elke poule in de database, en er is geen login, dus de poulecode is de
enige drempel. Een verkeerde correctie zou dus bij iedereen aankomen. Daarom
kan alleen een lége uitslag ingevuld worden. De controle zit in de
schrijfactie zelf (`update(...).eq(id).is(kolom, null)`), niet in een
controle vooraf: vult iemand anders hem in terwijl jouw scherm openstaat,
dan raakt jouw opslag niets en krijg je dat te zien.

**Waarom er een vlag bij hoort.** `scripts/sync.mjs` vult alleen een uitslag
die nog `null` is. Wat hier met de hand in gaat wordt dus nooit meer
automatisch gecorrigeerd. De kolommen `quali_handmatig` en `race_handmatig`
in `races` houden bij welke dat zijn; het racescherm zet er "handmatig
ingevuld · niet van openf1" boven en `schema.sql` telt ze onderaan in de
controletabel.

**Dit vraagt wel een schemawijziging.** Draai `schema.sql` opnieuw in de
Supabase SQL editor voordat je dit gebruikt. Doe je dat niet, dan geeft het
opslaan de bestaande melding voor een ontbrekende kolom (42703), die naar
`schema.sql` verwijst. De rest van de app blijft gewoon werken.

## Onderlinge duels

Punt 5 van `ROUTEKAART.md`, op de standpagina onder de weekendoverwinningen.
Per raceweekend wie van twee spelers de meeste punten pakte, opgeteld over
het seizoen: "jij tegen Davy: 8 – 6". Dat is waar mensen elkaar in de
groepsapp op aanspreken, veel meer dan op plek 4 van de 6.

Het scherpe punt zit in wat níét meetelt. Een weekend waarin geen van beiden
iets heeft ingeleverd is geen gelijkspel maar een weekend dat er voor dit
duel niet was; zonder die regel staat het na een winterstop 12–12 zonder dat
er iets gebeurd is. Hebben ze allebei wél ingeleverd en scoren ze allebei
nul, dan is dat wel een gelijkspel.

De telling zit als losse functie `duelStand()` bovenin het script, net als
`scoreLijst()`, en wordt in `test/duel.test.mjs` apart getest — die knipt hem
uit `index.html` zodat de test de echte code controleert.

## Uitnodigingslink

Punt 7 van `ROUTEKAART.md`. `https://dannydevis.github.io/F1-Poule/?code=RTM026`
brengt je meteen in die poule, zonder het codescherm. Op de Poule-pagina
zet één knop die link plus de poulenaam op het klembord, met dezelfde
terugval als de kopieerknop voor de groepsapp.

Drie dingen die daarbij goed moesten:

- **De link wint van de onthouden poule.** Wie zo'n link aanklikt wil naar
  díé poule, niet naar zijn vorige.
- **De code gaat daarna uit de adresbalk** (`history.replaceState`). Anders
  trekt elke herlaadactie je terug naar die poule, ook nadat je met "Andere
  poule" bewust bent overgestapt. Het maakt herladen meteen de vluchtweg als
  de link een verkeerde code bevatte.
- **Een code die niet bestaat zegt dat ook.** Stilzwijgend doorgaan naar je
  eigen poule zou betekenen dat je nooit merkt dat de uitnodiging kapot was.
  De code wordt in het veld gezet om te verbeteren, maar alleen als hij in
  het veld past: een poulecode is zes tekens, en `maxlength` knipt een waarde
  uit het attribuut niet af.

`test/hulp.mjs` serveerde `/` alleen zonder querystring, dus de testserver
kon `/?code=...` niet vinden. Dat is meteen rechtgezet.

## De winnaar als aparte vraag

Punt 6 van `ROUTEKAART.md`, en daarmee de laatste van die lijst. Op het
race-tabblad staat bovenaan "wie wint de race?" met het hele deelnemersveld;
goed is 25 punten.

**Bewust zwaar.** Een perfecte top 10 levert 50 op, dus deze ene keuze is het
halve weekend waard. Dat is de bedoeling: het houdt een weekend spannend voor
wie op punten al ver achterloopt, net als de weekendwinnaar hierboven.

**Niet verplicht.** Wie geen winnaar kiest kan gewoon opslaan; er staat wel
een gele regel onder die zegt dat daar 25 punten ligt. Niemand hoort te
blijven hangen op een knop die niet werkt. Nog een keer op dezelfde coureur
tikken haalt de keuze weer weg.

**De deadline.** De winnaar hangt aan de race-deadline, precies zoals de
race-top-10, en de database dwingt dat af — zowel bij een nieuwe rij als bij
een wijziging. Zonder die bewaking zou je je winnaar nog kunnen omgooien
terwijl de race al liep. `test/schema-gedrag.test.sql` speelt alle drie de
gevallen na tegen een echte PostgreSQL. (Sinds de overstap naar `answers`
hieronder doet `poule_antwoord_deadline()` dat werk; de oude
`poule_deadline_bewaken()` op `predictions` staat er nog voor die tabel.)

**Draai `schema.sql` opnieuw** in de Supabase SQL editor voordat je dit
gebruikt; zonder de kolom geeft opslaan de bestaande 42703-melding.

**Let op bij de knoppen.** De winnaarkeuze gebruikt bewust de klasse `wknop`
en niet `drv`. Ze zien er hetzelfde uit, maar `.drv` is de top-10-kiezer waar
`test/hulp.mjs` op klikt; één gedeelde klasse zou die tests op het verkeerde
raster laten klikken.

## De vragenlijst in de database

Stap 1 van `BEDIENING.md` §9, in twee helften gebouwd: eerst het schema,
daarna de app. **Beide zijn er nu.** `index.html` leest en schrijft
`answers`; de kolommen `quali_top10`, `race_top10` en `race_winnaar` op
`predictions` staan er nog wel, maar worden niet meer gebruikt.

**Waarom nu.** `BEDIENING.md` §1 zegt: doe die migratie nu, er is nog geen
seizoen aan voorspellingen om over te zetten. Sinds het opruimen hierboven is
dat niet "weinig" maar letterlijk nul, dus er valt niets te migreren.
Goedkoper wordt het niet meer.

**Drie tabellen:**

- `questions` — één rij per vraagsoort, met naam, punten, aan welke deadline
  hij hangt (`sessie`), wat voor antwoord hij verwacht (`soort`), en of hij
  als gokvraag telt. Die laatste vlag is er voor de waarschuwing uit §8: die
  moet kunnen weten wélke vragen van geluk afhangen.
- `pool_questions` — welke vragen meedoen in een poule. Aanwezig is aan; dat
  scheelt een boolean die toch altijd op `true` zou staan.
- `answers` — één rij per ingevulde vraag, met `waarde` als `jsonb`. Dat moest
  wel: een top 10 is een lijst, een winnaar een tekst, het aantal safety cars
  een getal en de rode vlag een ja of nee.

**De negen vragen en hun punten** staan in `schema.sql` zelf, met een
`on conflict do update` zodat het bestand opnieuw uit te voeren blijft. De
presets uit §3 tellen daarmee op tot precies **100 / 145 / 202**.

Dat laatste is geen toeval maar ook geen garantie, en daar zit
`test/vragen.test.sql` op: de presets staan in een document en de punten in
de database, en zonder die test lopen die twee stil uit elkaar zodra iemand
aan een vraag sleutelt. Die test draait in CI op een eigen verse database,
zodat de gedragstest er niet doorheen loopt.

**Twee kolommen op `pools`** erbij: `owner_member_id` en `questions_locked`.
Over die eerste is `BEDIENING.md` §7 terecht eerlijk — zonder login kan de
database niet controleren wie de poulebaas is, dus het voorkomt ongelukken en
geen kwaadwilligheid.

**Eén afwijking van de rest van het schema:** `questions` is de enige tabel
die niet openstaat voor schrijven vanaf de anon-sleutel. Lezen mag, want de
app moet namen en punten kunnen tonen, maar de lijst zelf hoort uit
`schema.sql` te komen en niet uit de app.

`reset.sql` gooit de drie nieuwe tabellen nu ook weg; anders bleven ze na een
schone herstart achter met een vragenlijst die niet meer bij de rest past.

### En de app die erop draait

De tweede helft. `index.html` haalt bij het laden vijf dingen tegelijk op —
races, spelers, antwoorden, de vragenlijst en de vragen van deze poule — en
schrijft voorspellingen weg als losse rijen in `answers`.

**Het scherm hoefde niet mee te veranderen.** Tussen de opslag en de opmaak
zit een vertaallaag van vijftien regels: `bouwPreds()` vouwt de losse
antwoordrijen terug tot de vorm die de schermen al kenden
(`{quali_top10, race_top10, race_winnaar}` per speler per race). Zo bleef de
puntentelling, de stand, de duels en het overzicht ongemoeid, terwijl er
onderaan een heel andere tabel ligt. Een vraag die dit scherm nog niet kent
wordt daarbij overgeslagen, dus de zes nieuwe vraagsoorten kunnen alvast in
de database staan zonder iets te breken.

**Leeggemaakt is weg, niet leeg.** `waarde` is `not null`, dus een
voorspelling die je helemaal wist krijgt geen lege rij maar geen rij. Dat is
ook inhoudelijk goed: een lege top 10 zou als "alles fout" scoren in plaats
van als "niet meegedaan". `bewaar()` doet daarom een upsert voor wat ingevuld
is en een delete voor wat je hebt leeggemaakt.

**Alleen wat open is.** Wat achter een verstreken deadline zit gaat niet mee
in de upsert, en `vraagActief()` houdt vragen tegen die deze poule heeft
uitgevinkt. De database controleert dat nog een keer zelf, per vraag, via
`questions.sessie`.

**Bestaande voorspellingen verhuizen mee.** `schema.sql` zet rijen uit
`predictions` over naar `answers` (`on conflict do nothing`, dus opnieuw
uitvoeren kan), met de deadline-trigger er even uit — die voorspellingen zijn
destijds op tijd ingevuld en een race van vorige maand zou nu geweigerd
worden. In deze database valt er niets over te zetten, maar het bestand moet
ook kloppen voor een database waar dat wel zo is.

**Draai `schema.sql` opnieuw** in de Supabase SQL editor voordat je dit
gebruikt. Nu wel: deze keer hoort de app erbij.

## De pole en de teamgenoot-duels

De eerste twee van de zes vraagsoorten die alleen nog in de database stonden.
Deze twee eerst, omdat ze aan uitslagen hangen die er al zijn: de pole is
gewoon P1 van de kwalificatie, en wie zijn teamgenoot verslaat lees je af uit
de finishvolgorde. De andere vier (snelste ronde, snelste pitstop, safety
cars, rode vlag) hebben gegevens nodig die nog nergens staan; die vragen om
een kolom op `races` en een uitbreiding van de sync.

**De pole, 10 punten.** Dezelfde keuze als de winnaar maar dan aan de
kwalificatiekant, en een stuk lichter — hij is veel beter te raden.
`scoreEerste()` is de gedeelde regel voor "wijs de bovenste van een lijst
aan"; `scoreWinnaar()` en `scorePole()` zijn er allebei een laagje omheen met
hun eigen aantal punten.

**De teamgenoot-duels, 15 punten.** Per team met precies twee coureurs één
duel: wie eindigt er voor de ander? Bij een invaller staan er drie in de
lijst en verdwijnt dat team uit de duels, want dan is "de teamgenoot" niet
meer één iemand.

De punten gaan **naar rato van wat je invult**, en dat is de belangrijkste
keuze in dit stuk. Vier duels invullen en alle vier goed hebben levert
evenveel op als tien van de tien. Zou de deling over álle teams gaan, dan was
overal maar iets aantikken altijd beter dan alleen invullen wat je weet — en
dat maakt van een kennisvraag een gokvraag. Een duel waarin geen van beiden
finishte telt niet mee; dat is pech, geen fout antwoord.

**Alleen de pole invullen mag ook.** De opslaanknop hing aan "tien coureurs
gekozen", en dat zou wie alleen de pole of een paar duels invult buitensluiten.
Nu mag opslaan zodra de top 10 vol is óf leeg is en er iets anders gekozen is.
Een halve top 10 gaat er nog steeds niet in: negen namen zeggen niets.

**Eén plek waar punten opgeteld worden.** `scoreTab()` telt wat een speler op
één tab scoort — de top 10 plus de losse vragen die aan diezelfde deadline
hangen — en "jouw punten", "de rest" en de seizoensstand lezen alle drie
daaruit. Ze liepen anders vroeg of laat uit elkaar, en dat zie je pas als
iemand het navraagt.

**`GEBOUWD`** is de lijst met vragen die dit scherm kan stellen en scoren.
Wat daar niet in staat wordt overgeslagen, ook als de poule hem heeft
aangevinkt. Zo kan de vragenlijst in de database vooruitlopen op de app
zonder dat er halve schermen ontstaan.

## Een poule aanmaken in vier stappen

`BEDIENING.md` §3. Voorheen was aanmaken één invoerveld op het codescherm:
naam invullen, klaar. Nu is het een eigen scherm met vier stappen — naam van
de poule, jouw naam, wat jullie gaan voorspellen, en de code om te delen.

**Waarom een eigen scherm en niet één formulier.** Om die derde stap. De
vragenset ligt vast zodra de eerste race gescoord is, dus dat is het enige
moment waarop je er nog rustig naar kunt kijken. Weggestopt onder een
naamveld zou iedereen hem overslaan en het pas een half seizoen later
merken.

**De drie voorstellen** komen uit §3 en tellen op tot 100 / 145 / 202. Die
getallen staan niet in `index.html` maar worden opgeteld uit `questions`,
dus als de punten in de database veranderen verandert het scherm mee.
Klassiek staat voorgeselecteerd: wie doorklikt zonder na te denken krijgt
iets dat leuker is dan twee top-tienen, zonder overweldigd te raken.

**Zelf samenstellen** zit achter een knop, met alle negen vragen, hun punten
en een totaal dat live meetelt. Vragen die de app nog niet stelt staan er wel
bij — ze horen bij de presets — maar zijn gemerkt als **binnenkort**, en
eronder staat hoeveel van het totaal nu al echt gevraagd wordt. Anders belooft
het scherm punten die er dit seizoen nog niet zijn.

**De gokwaarschuwing** uit §8 verschijnt zodra de gokvragen samen boven 30%
van het maximum uitkomen. Hij blokkeert niets — het is hun poule — maar hij
staat er wel, want anders kiest iemand vroeg of laat alleen de gokvragen en
wint de gelukkigste in plaats van wie de sport volgt. Bij Gevorderd komt hij
niet op: 32 van de 202 punten is 16%.

**Wat er bij stap 3 naar de database gaat:** de poule, jezelf als eerste lid,
`owner_member_id` op jou, en een rij in `pool_questions` per gekozen vraag.
Wat al gelukt is blijft in `S.maak` staan, zodat een tweede poging na een
mislukte stap geen tweede poule aanmaakt.

**Bestaande poules merken hier niets van.** Een poule zonder rijen in
`pool_questions` doet aan alles mee wat de app kan; dat was al zo en is niet
veranderd.

## De vragenset beheren, en wanneer hij op slot gaat

`BEDIENING.md` §5 t/m §8, de laatste stap van dat document. Onder **Poule**
staat nu dezelfde vragenlijst als bij het aanmaken, met een opslaanknop en
een knop om je wijziging ongedaan te maken zolang je nog niet bewaard hebt.

**Alleen het verschil wordt weggeschreven** — de nieuwe vinkjes erbij, de
weggehaalde eraf. Alles weggooien en opnieuw invoeren zou tussendoor een
poule opleveren die even aan alles meedoet, en dat is precies het moment
waarop iemand anders zijn scherm ververst.

**Een poule zonder rijen toont alle vinkjes aan.** Geen rijen betekent "doet
aan alles mee", dus dat is wat er op het scherm hoort te staan. Zou het
scherm dat als "niets aangevinkt" tonen, dan zet je met één keer opslaan de
hele poule uit. Daar staat een test op.

**Wie mag erbij.** De poulebaas, dus `owner_member_id`. Poules van vóór het
aanmaakscherm hebben er geen, en die op slot doen zou niemand meer bij de
vragenset laten — daar mag dus iedereen aan, met een regel eronder die
uitlegt waarom.

**Op slot** gaat het via `questions_locked`. De lijst wordt dan alleen-lezen
met de regel uit §6 eronder, en die noemt de race waarna het gebeurde. Dat
komt niet uit een extra kolom maar uit de eerste race van het seizoen met
een uitslag; dat is per definitie het moment waarop de sync hem heeft
dichtgezet.

**Wie zet dat slot om.** `scripts/sync.mjs`, want dat is het enige stuk dat
draait op het moment dat een uitslag binnenkomt — alle punten worden verder
in de browser geteld. §6 noemt "de scoringslogica"; die bestaat als backend
niet, dus dit is de plek. Het gaat **per poule en niet per seizoen**: een
poule wordt op slot gezet zodra er een antwoord van hem aan een race hangt
die inmiddels een uitslag heeft. Wie halverwege het seizoen een nieuwe poule
begint zit dus niet meteen vast.

Dat laatste stukje draait alleen op de runner en heeft geen test — de rest
van `sync.mjs` ook niet, en er is geen harnas voor. Met de hand na te kijken
met: `select name, questions_locked from pools;` na een run waarin een
uitslag binnenkwam.

## Wat er nog bij kan

Niets van dit alles is nodig om de poule te laten draaien. `ROUTEKAART.md`
zet met kosten en argumenten op een rij wat er nog kan — extra vraagsoorten,
seizoensmechaniek, een uitnodigingslink — inclusief een voorgestelde
volgorde en een lijstje van wat je beter kunt overslaan. Alle zeven punten
uit die volgorde zijn gebouwd en staan hierboven beschreven; wat overblijft
is groep 3 en verder — extra vraagsoorten en seizoensmechaniek.

`BEDIENING.md` gaat over de stap daarna: de navigatie, een aanmaakproces in
vier stappen, en het omzetten van de vaste kolommen `quali_top10` en
`race_top10` naar een `questions`-tabel met een rij per vraag. Van dat
document zijn alle vijf de stappen gebouwd, en van de zeven extra vragen doen
de pole en de teamgenoot-duels inmiddels mee. Wat er nog ligt zijn de vier
vragen die nieuwe uitslaggegevens nodig hebben: snelste ronde, snelste
pitstop, safety cars en rode vlag. Die vragen om een kolom op `races`, een
uitbreiding van `scripts/sync.mjs` en een manier om ze met de hand in te
vullen als OpenF1 ze niet heeft.

Let op bij het lezen van dat document: een deel ervan beschrijft dingen die
er inmiddels al zijn (de drie tabs, de strook met de eerstvolgende deadline,
de drie onderdelen op Stand, de uitnodigingslink, de winnaar van 25 punten).
Er zaten twee gaten in, en die zijn allebei dichtgelopen. §1 vraagt vier
extra vragen terwijl de presets in §3 er zeven nodig hebben: alle zeven staan
nu in `schema.sql`. En §6 verwijst naar "de scoringslogica" die als backend
niet bestaat — alle punten worden in de browser berekend. `questions_locked`
komt daarom uit `scripts/sync.mjs`, dat toch al met de service_role key
draait op het moment dat een uitslag binnenkomt.

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

Een pull request vanaf een `claude/*`-branch wordt automatisch gemerged zodra
die tests groen zijn (`.github/workflows/automerge.yml`). De pull request
blijft dus bestaan als plek waar de tests draaien vóór de code live gaat —
`main` is de site — maar er hoeft niet meer met de hand op Merge geklikt te
worden. Rood betekent geen merge.

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
| `.github/workflows/automerge.yml` | Mergt een `claude/*`-pull request zodra de tests groen zijn |
| `test/` | Automatische tests (zie `test/LEESMIJ.md`) |
| `ROUTEKAART.md` | Wat er nog bij kan, op volgorde van opbrengst gedeeld door kosten |
| `BEDIENING.md` | Ontwerp voor de navigatie, het aanmaakproces en de vragenset |

Supabase-project: `etifamdwqxjfaeaordlr`. De URL en de anon key staan bovenin
`index.html` en `sync.html` en zijn bewust publiek; dat hoort bij de anon key.
De service_role key die de Actions-sync gebruikt staat als repository secret
(`SUPABASE_URL` en `SUPABASE_KEY`) en hoort nergens in de code te staan.
