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

- **Sync draait op GitHub Actions** (`scripts/sync.mjs`, elk uur via
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

**Bug gevonden bij het echte draaien (na PR #24):** de uitnodigingsknop op
stap 4 deed niets. `knoopUitnodiging()` was er al — hij staat ook op de
poulepagina — maar las daar altijd `S.poule`. Op stap 4 bestaat die nog niet;
die wordt pas gezet zodra je op "Naar de poule" klikt. De knop klapte dus
stil op een `null`-verwijzing en er kwam geen foutmelding op het scherm te
zien, alleen niets. `knoopUitnodiging()` en `uitnodigingsTekst()` nemen nu
een `poule`-parameter (die op de poulepagina gewoon op `S.poule` blijft
staan), en stap 4 geeft de net aangemaakte poule expliciet mee.
`poule-aanmaken.test.mjs` klikt de knop nu ook echt aan; zonder de fix loopt
die test vast op een timeout in plaats van gewoon te zakken, want de knop
verandert dan letterlijk nooit.

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

## De snelste ronde en de snelste pitstop

Vraag drie en vier van de zeven. Ze werken als de winnaar en de pole — je
wijst één coureur aan — maar ze verschillen op één punt dat door de hele
code doorwerkt: **ze staan niet in de finishvolgorde.** Er is dus een eigen
kolom voor nodig: `races.fastest_lap` en `races.fastest_pitstop`, allebei één
coureurnummer, elk met een `_handmatig`-vlag ernaast.

**Eén tabel voor alle vier.** `COUREURVRAAG` beschrijft nu per vraag aan
welke sessie hij hangt, welke teksten erbij horen en — het belangrijkste —
welke lijst de uitslag is. Bij de winnaar en de pole is dat de hele
finishvolgorde; bij deze twee is die lijst één naam lang. Daarmee is het
overal dezelfde regel: klopt de bovenste van de lijst met jouw keuze, dan
krijg je de punten. De schermen lopen die tabel af in plaats van per vraag
een eigen tak te hebben, dus de volgende vraag van dit soort is een regel in
die tabel.

**`scoreWinnaar()` en `scorePole()` zijn weg.** Ze deden hetzelfde als
`scoreEerste()` met een hardgecodeerd aantal punten — en dat was een tweede
waarheid naast `questions.punten`, waar de rest van de app inmiddels uit
leest. Zou je de punten in de database aanpassen, dan bleef de app 25 tellen.
Nu leest alles uit `puntenVoor()`. De losse waarden liggen daarmee alleen nog
in `schema.sql` vast, en `test/vragen.test.sql` houdt ze daar op hun plek —
inclusief de 50 en de 25, want daar leunen de teksten in de app op.

**"Werd P4" zegt niets bij een uitslag van één naam.** Een misser laat
daarom zien wie het wél werd.

**Zelf invullen.** OpenF1 heeft deze twee niet altijd, en zonder waarde valt
er niets te scoren. Naast de uitslag staat daarom dezelfde mogelijkheid als
bij een hele uitslag: zelf invullen, met dezelfde waarschuwing (het geldt
voor iedereen, niet alleen voor jouw poule) en dezelfde bescherming
— `is(kolom, null)` hoort bij de schrijfactie zelf, zodat een waarde die er
inmiddels staat blijft staan. Zolang de uitslag er niet is staat er geen
"je hebt punten laten liggen": dat zou een verwijt zijn voor iets waar de
speler niets aan kan doen.

**De sync haalt ze nog niet op.** Dat is bewust: `api.openf1.org` is vanuit
de bouwomgeving niet bereikbaar, dus de veldnamen van `laps` en `pit` zijn
hier niet te controleren. Ongecontroleerde code in een dagelijkse job zetten
die stil niets doet is slechter dan hem er nog niet in hebben. Dit is de
volgende stap, en die moet één keer tegen de echte API gedraaid worden voor
hij te vertrouwen is. Tot dan is zelf invullen de weg.

## Safety cars en de rode vlag

De laatste twee, en de enige die niet over een coureur gaan. Het aantal
safety cars is een getal, de rode vlag is ja of nee. `EXTRAVRAAG` beschrijft
ze net zoals `COUREURVRAAG` de andere vier beschrijft; ze delen de opbouw van
het blok, het zelf invullen en de plek in de puntentelling.

**Hier zit de valkuil van deze twee.** "Nul safety cars" en "nee, geen rode
vlag" zijn échte antwoorden, geen leeg veld. Overal waar de rest van de code
`|| null` gebruikt om te zien of er iets is ingevuld, zou dat deze twee
wegvegen: `0 || null` is `null` en `false || null` ook. Bij het opslaan
betekent dat "haal de rij weg", en dan scoort een terechte gok op een saaie
race als niet meegedaan — zonder dat het scherm iets afwijkends laat zien.
Vandaar `leegAntwoord()` en `?? null` op de plekken die over deze twee gaan,
en drie tests die precies daarop mikken.

**De puntentelling.** Bij het aantal safety cars lopen de punten af met de
afstand, net als bij de top 10: precies goed is 12, eentje ernaast 6, twee
ernaast niets meer. Eén safety car ernaast zitten is nu eenmaal niet
hetzelfde als een verkeerd antwoord. Bij de rode vlag bestaat geen "bijna",
dus daar is het alles of niets — en 20 punten voor een ja-of-nee is veel,
maar hij staat als gokvraag gemarkeerd en daar hangt de waarschuwing uit §8
aan.

**Het aantal loopt van 0 tot 6+**, waarbij 6 letterlijk 6 is. Een race met
meer dan zes safety cars bestaat in de praktijk niet; komt hij er ooit, dan
scoort niemand hem en dat is dan terecht.

Ook deze twee worden nog niet door de sync opgehaald, om dezelfde reden als
hierboven. Ze zijn wel het makkelijkst met de hand in te vullen van alle
vier: een getal en een ja-of-nee.

**Hiermee doen alle negen vragen mee.** `GEBOUWD` is compleet, dus de
"binnenkort"-markering in het aanmaakscherm heeft niets meer te markeren. Het
mechanisme staat er nog voor de volgende vraag, en `poule-aanmaken.test.mjs`
houdt het in de gaten met een verzonnen tiende vraag in de nabootsing.

### Drie dingen die met negen vragen niet meer klopten

Bij het nalezen van de schermen met alle negen vragen erin bleken er drie
plekken uit de pas te lopen. Geen van drieën gaf een foutmelding; ze deden
gewoon iets anders dan ze zeiden.

**Een race die niemand invulde was niet meer aan te vullen.** Wie zelf niets
had voorspeld kreeg "je hebt hier niks ingevuld" en verder niets — inclusief
geen knop om de ontbrekende snelste ronde of het aantal safety cars in te
vullen. Sloeg de hele poule een race over, dan kon niemand er meer bij en
bleef die uitslag voorgoed leeg. `openUitslagen()` zet die knoppen er nu ook
bij als je zelf niets hebt ingeleverd.

**`heeftVoorspeld()` liep achter op de vragenlijst.** Hij noemde de vragen
één voor één op, en de vier nieuwste stonden er niet bij. Iemand die alleen
het aantal safety cars invulde telde daarmee niet mee voor het onderlinge
duel — een weekend waarin hij wél meedeed werd overgeslagen. Hij loopt nu
langs `GEBOUWD`, zodat een nieuwe vraag hier niet meer vergeten kan worden.

**"Nog niks ingevuld: Danny"** klopte niet meer zodra Danny wél iets had
ingevuld, alleen geen top 10. Dat lijstje kijkt bewust alleen naar de top 10
— daar ligt het meeste, en de knop eronder zegt "Top 10 invullen" — dus nu
zegt de tekst dat ook: "nog geen top 10".

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
document zijn alle vijf de stappen gebouwd, en alle negen vragen worden
gesteld en gescoord. Wat er nog ligt is één ding:

- **De sync voor de vier losse uitslagen.** `fastest_lap`, `fastest_pitstop`,
  `safety_cars` en `rode_vlag` worden nu alleen met de hand gevuld. De
  gegevens zitten bij OpenF1 in `laps`, `pit` en `race_control`, maar die
  endpoints zijn vanuit de bouwomgeving niet te bereiken en dus ook niet te
  controleren. Wie dit oppakt: draai de aanroepen één keer met de hand tegen
  de echte API voor je ze in `scripts/sync.mjs` zet, en laat de sync bij
  twijfel niets invullen in plaats van iets — de handmatige invoer werkt, een
  verkeerd gevulde kolom is niet meer terug te draaien.

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
| `.github/workflows/sync.yml` | Draait de sync elk uur, plus een knop om hem los te starten |
| `.github/workflows/tests.yml` | Draait de tests bij elke pull request en push naar main |
| `.github/workflows/automerge.yml` | Mergt een `claude/*`-pull request zodra de tests groen zijn |
| `test/` | Automatische tests (zie `test/LEESMIJ.md`) |
| `ROUTEKAART.md` | Wat er nog bij kan, op volgorde van opbrengst gedeeld door kosten |
| `BEDIENING.md` | Ontwerp voor de navigatie, het aanmaakproces en de vragenset |

Supabase-project: `etifamdwqxjfaeaordlr`. De URL en de anon key staan bovenin
`index.html` en `sync.html` en zijn bewust publiek; dat hoort bij de anon key.
De service_role key die de Actions-sync gebruikt staat als repository secret
(`SUPABASE_URL` en `SUPABASE_KEY`) en hoort nergens in de code te staan.

## Het invulscherm: tikken op een plek, dan kiezen

Feedback uit de poule zelf, in twee rondes. Eerst: *"Ik vind het opstellen
van de top 10 een beetje onduidelijk"* en *"is veel te groot"*. En daarna het
voorstel dat het echt oploste: **"als je drukt op het lege vak dat je dan
iemand kan kiezen, en alles op 1 scherm."**

**Wat er misging.** Alle vragen stonden onder elkaar, elk met twaalf
coureurknoppen. Met alle negen vragen aan was dat op een telefoon ruim
drieduizend pixels, en de coureurlijst voor de top 10 stond zeshonderd pixels
onder de plekken waar je keuze landde. Je tikte iemand aan en zag niet waar
hij heen ging.

**De eerste poging waren twee tabbladen** — de top 10 achter het ene, de
losse vragen achter het andere. Dat halveerde de lengte, maar het verplaatste
het probleem: je zag nog steeds niet waar je keuze landde, en de helft van je
voorspelling was nu onzichtbaar. Die tabbladen zijn er weer uit.

**Nu: er staat nergens een coureurlijst open.** Elke keuze is één regel — een
plek in de top 10, of een losse vraag — en pas als je die aantikt schuift het
keuzeblad omhoog met de twaalf coureurs erin. Je hebt dus zelf al gezegd
waar je keuze heen gaat vóór je hem maakt, en na het kiezen sta je weer
precies waar je was.

Dat scheelt genoeg om alles weer op één scherm te krijgen:

| | vóór | nu |
|---|---|---|
| alle negen vragen | ± 3200 px | 1608 px |
| Klassiek (de standaard) | ± 1900 px | 850 px |

**De top 10 heeft nu gaten.** `S.keuze[tab]` is een vaste lijst van tien
plekken waarin `null` "nog leeg" betekent, in plaats van een lijst die je
alleen achteraan kon aanvullen. Daardoor kun je P7 invullen zonder eerst P1
tot P6 te doen — je tikt de plek aan die je bedoelt. `naarPlekken()`,
`gevuld()` en `compleet()` vertalen tussen die vorm en de dichte lijst van
tien die de database wil.

Let op bij `naarPlekken()`: daar staat `(uit ?? [])` en niet een
standaardwaarde `uit = []`. Een niet-ingevulde top 10 komt als `null` uit de
database, en een standaardwaarde vangt alleen `undefined`. Dat kostte een
ronde debuggen.

**Een halve top 10 wordt niet bewaard.** Met gaten erin kan `bewaar()` niet
meer op de lengte afgaan, dus die kijkt nu naar `compleet()`: tien plekken of
niets. Tien lege plekken wegschrijven zou als "alles fout" scoren in plaats
van als "niet meegedaan".

**Dezelfde coureur kan niet twee keer.** Wie al ergens in je top 10 staat is
in het blad uitgeschakeld — behalve op zijn eigen plek, want daar mag je hem
laten staan.

**Twee dingen die hierbij boven water kwamen.** Een poule die de top 10 heeft
uitgezet kreeg het volledige raster tóch te zien, vulde het in, en het werd
bij het opslaan stilzwijgend overgeslagen omdat de vraag niet meedeed. En de
opslaanknop begon over een top 10 bij een poule die er geen heeft.

**Het handmatig invoeren van een uitslag is niet meegegaan.** Dat scherm
gebruikt nog steeds de lijst met `.drv`-knoppen: daar zet je twintig coureurs
op volgorde, en dan is een blad per plek juist omslachtig.

---

## Omschrijving per poule, en meer dan één poule tegelijk

Aanleiding: *"Graag ook omschrijvingen aan de poule toevoegen. En mensen
moeten meerdere poules kunnen beheren. Dus wellicht een inlog bouwen?"*

**De omschrijving.** Eén tekstkolom erbij, `pools.beschrijving`, en een veld
in stap 1 van het aanmaken. De poulebaas kan hem later aanpassen onder Poule,
naast de vragenset en om dezelfde reden alleen hij: zonder login kan de
database niet controleren wie dat is, dus `magBeheren()` houdt de knop weg bij
wie hem niet nodig heeft (zie BEDIENING.md §7 voor wat dat wel en niet is).

Leeg opslaan zet `null`, niet een lege tekst. Anders staat er straks een lege
regel onder de naam, en is "hij heeft er geen" niet te onderscheiden van "hij
heeft er een die toevallig leeg is".

Het veld tekent niet opnieuw bij elke toetsaanslag — dat zou de cursor uit het
veld gooien. De opslaanknop wordt daarom met de hand aan- en uitgezet in
`knoopOmschrijving()`. Dat is de enige plek in de app waar dat zo gaat; overal
elders is een klik het startsein voor `render()`, en dan is dit niet nodig.

**Meer dan één poule.** De app onthield tot nu toe alleen `poule:laatste`: één
id. Wie met het werk in de ene en met vrienden in de andere zit moest de code
elke keer opnieuw intypen om te wisselen. Naast `poule:laatste` staat nu
`poule:poules`: een lijstje van maximaal twaalf poules waar je bij hoort, met
naam, code en omschrijving erbij zodat het zonder database te tonen is. Het
wordt bijgewerkt op de drie plekken waar je in een poule belandt — aanmaken,
code intypen, en de uitnodigingslink.

`naarPoule()` haalt de poule daarna wél opnieuw op. Het lijstje is een
adresboekje, geen kopie van de database: de naam kan veranderd zijn, en een
poule die verwijderd is hoort eruit te vallen (`vergeetUitLijst()`) in plaats
van je op een leeg scherm te zetten.

**"Andere poule" wist alleen `poule:laatste`.** Het lijstje blijft staan. Zou
die knop het lijstje leegmaken, dan raak je al je poules kwijt door één keer
te kijken of er nog een andere was.

**Waar het lijstje staat.** Onderaan de Poule-tab, en op het startscherm. Niet
als tussenscherm bij binnenkomst: je speelt vrijwel altijd in dezelfde poule
verder, en dan is een keuzescherm ertussen een extra tik. BEDIENING.md §5 is
op dat punt bijgewerkt, want daar stond het oorspronkelijke plan.

**Lange poulenamen.** `.smalkop` heeft `overflow-wrap:anywhere` gekregen.
"Vrijdagmiddagpoule" is één woord van achttien letters in een 34px condensed
hoofdletterfont; op een telefoon viel het eind er stilletjes af.

### En die inlog?

Nog niet gebouwd, en het is de moeite waard om te weten waarom niet — het is
een keuze, geen vergeten punt.

Wat je hierboven krijgt is *meerdere poules op dit toestel*. Dat is wat de
vraag in de praktijk was: wisselen zonder de code op te zoeken. Een inlog lost
iets anders op: *één identiteit over meerdere toestellen*. Dat is een echt
probleem in deze poule — dezelfde persoon staat er nu als vijf spelers in,
omdat hij op zijn telefoon, zijn laptop en het werk apart heeft meegedaan —
maar het is een ander probleem, en het lijstje in `localStorage` maakt het
niet erger.

De oude reden om geen inlog te bouwen is vervallen. Die was dat Supabase geen
magic link naar een `file://`-pagina wil sturen; de app draait nu op GitHub
Pages, dus op een echte https-origin, en Supabase Auth zou het gewoon doen.

Wat het wél kost, zodat de afweging op tafel ligt:

- `pool_members` moet aan een `auth.users`-id gekoppeld worden, met een pad
  voor de spelers die er nu al in staan zonder account.
- De RLS-policies staan nu wagenwijd open (`using (true)`), omdat iedereen met
  de anon key alles mag. Met een login moeten die allemaal herschreven worden,
  en dat is het moment waarop een fout niet "iemand ziet iets te veel" is maar
  "niemand kan meer bij zijn eigen poule".
- Meedoen kost dan een e-mail en een mailtje openen, in plaats van een code
  intypen. Voor een vriendenpoule is dat de duurste knop in de hele app.

Een tussenweg die dit alles niet vraagt: dezelfde speler op een tweede toestel
laten binnenkomen via een persoonlijke link (`?code=...&speler=...`), zodat je
jezelf niet opnieuw aanmaakt. Dat lost het echte probleem op — vijf keer
dezelfde persoon in de stand — zonder RLS aan te raken.

---

## Je eigen link: jezelf meenemen naar een tweede toestel

De vervolgstap op de vorige sectie, en het antwoord op het echte probleem
daaronder: dezelfde persoon stond vijf keer in de stand, omdat hij op zijn
telefoon, zijn laptop en op het werk apart had meegedaan. De app weet alleen
per toestel wie je bent — `poule:<id>:mijn_id` in `localStorage` — dus op een
nieuw toestel maak je jezelf opnieuw aan, en je punten staan vanaf dat moment
op twee spelers.

Onder Poule staat nu **Kopieer je eigen link**: `?code=...&speler=<member_id>`.
Open je die op je laptop, dan ben je daar dezelfde speler.

**Waarom dit geen inlog is, en toch genoeg.** Wie deze link heeft speelt onder
jouw naam. Dat klinkt eng tot je bedenkt dat wie de poulecode heeft sowieso in
de poule kan, en dat de anon key in de broncode staat: de app beschermt tegen
ongelukken, niet tegen kwaadwilligheid, en dat staat zo in BEDIENING.md §7. De
knoptekst zegt het er daarom expliciet bij — deel hem met niemand. Voor een
vriendenpoule is dat de goede afweging; bouw er geen dingen op die echt
beschermd moeten zijn.

**Een onbekende speler in de link is geen fout.** Staat dat id niet (meer) in
de poule, dan valt de link stilletjes terug op wat een gewone uitnodiging doet:
"wie ben jij?". Een melding over een id dat niemand herkent helpt niemand, en
de link werkt dan nog steeds voor het deel dat er wél toe doet.

**Waarom `onthoud()` én de expliciete keuze.** In `hervat()` staan twee regels
die op elkaar lijken: eerst `onthoud(pool, uitLid.member_id)`, daarna
`const bekend = uitLid ? uitLid.member_id : mijnId(...)`. Die tweede lijkt
overbodig — `mijnId()` leest immers terug wat er net is weggeschreven — en een
test die alleen de tweede weghaalt blijft dan ook groen. Maar in een browser
die niets mag opslaan doet `onthoud()` niets, en dan is die tweede regel het
enige wat je nog als jezelf binnenlaat. `opslagWerkt` is precies het geval
waarin je zo'n link nodig hebt.

**`knoopKopieer` heette al zo.** Die bestond al voor de groepsapp-tekst, dus de
gedeelde versie voor de twee links heet `kopieerknop`. Beide doen hetzelfde
terugvalgedrag: lukt het klembord niet, dan komt de tekst in een veld dat je
zelf kunt selecteren.

---

## Inleg en betaalverzoek

Joey, in de groepsapp: *"Doe gelijk een betaalverzoek er in 😉 Of ook wat de
inleg moet zijn enzo."* Twee kolommen op `pools` (`inleg numeric(8,2)` en
`betaallink text`), één op `pool_members` (`betaald boolean`), en een blok onder
Poule plus een blok op stap 4 van het aanmaken. Zie BEDIENING.md §10 voor wat
het doet; hier staat waarom het zo gebouwd is.

**`numeric`, geen float.** Geld in een float geeft vroeg of laat 4,999999 in
beeld. Acht cijfers met er twee achter de komma is ruim voor een vriendenpoule
en houdt het bedrag exact.

**De betaallink is het enige stukje in deze app dat echt gevaarlijk kon zijn.**
Hij komt uit een tekstveld en belandt in een `href`. Een `javascript:`-adres
daar wordt uitgevoerd zodra een lid op de knop tikt — en de RLS-policies staan
open (`using (true)`), dus iedereen met de anon key uit de broncode kan zo'n
adres rechtstreeks in `pools` zetten. Vandaar `veiligeLink()`, en vandaar dat
die niet alleen bij het opslaan draait maar ook bij het tónen. Een controle die
alleen bij het invoeren zit is geen controle als de invoer ook buiten de app om
kan. `test/inleg.test.mjs` test allebei de kanten; sloop je `veiligeLink()`,
dan vallen er drie controles om.

Wat opgeslagen wordt is de link zoals hij getoond gaat worden (`https://` er al
voor), niet zoals hij ingetypt was. Anders staat er in de database iets anders
dan wat de poulebaas op zijn scherm heeft goedgekeurd.

**"vijf euro" is een fout, geen lege inleg.** `leesBedrag()` gooit eerst alles
weg wat geen cijfer, punt of komma is. Dat betekent dat "vijf euro" als lege
tekst overblijft, en dan zou hij als "geen inleg" opgeslagen worden: je vult
iets in, drukt op opslaan, en er gebeurt niets. Nu is dat NaN en dus een
melding.

Dat gaf trouwens een tweede bug in dezelfde hoek. De opslaanknop vergeleek
eerst het *gelezen* bedrag met wat er in de database stond. "vijf euro" leest
als leeg, leeg is gelijk aan leeg, dus de knop bleef uit — een veld waarin je
typt naast een knop die niets doet, zonder uitleg. De vergelijking gaat nu over
de getypte tekst.

**Het bedrag gaat met een komma terug het veld in.** `12.5` in beeld krijgen
nadat je "€ 12,50" hebt opgeslagen leest als een fout van de app.

**Wie heeft betaald is een lijstje, geen boekhouding.** De app ziet geen
betalingen en gelooft alleen het vinkje van de poulebaas. Dat staat er expliciet
bij, want een app die "betaald" toont wekt makkelijk de indruk dat hij het
gecontroleerd heeft.

Je eigen streepje zie je alleen als het gezet is. "Nog niet afgevinkt" bij elk
bezoek is zeuren van een machine, en de poulebaas heeft de lijst al.

**De spelerrij is een `<button>` of een `<div>`.** Alleen als er inleg is én jij
de poulebaas bent valt er iets te tikken; anders zou er een knop staan die
niets doet. Zie `spelerRij()`.

**Waarom het op stap 4 staat en niet op stap 1.** Stap 1 is al naam plus
omschrijving; er nog twee velden bij zou van "één vraag per scherm" een
formulier maken. Stap 4 is het scherm waarop je de uitnodiging kopieert, en de
tekst een regel lager verandert meteen mee als je hier iets invult. Dat is ook
precies het moment waarop het ertoe doet.

---

## De laatste vier uitslagen: automatisch, en wat dat kostte

Aanleiding: *"Ik wil dat alles automatisch gaat. Dit wordt geen app die ik
alleen ga gebruiken."*

**Eerst een rechtzetting, want die staat ook in de eerdere secties fout.** Ik
heb hier meerdere keren geschreven dat de sync voor snelste ronde, snelste
pitstop, safety cars en rode vlag "geblokkeerd" was omdat `api.openf1.org`
onbereikbaar is. Dat is onjuist over dit project. `sync.mjs` draait al
negenentwintig keer met succes op een GitHub-runner en praat daar prima met
OpenF1 — zo zijn de deelnemerslijsten binnengekomen. Wat onbereikbaar is, is
de bouwomgeving waarin deze code geschreven wordt: daar zijn zowel OpenF1 als
Supabase geblokkeerd. Dat is een beperking van de werkplek, geen eigenschap
van het product, en die twee zijn hier door elkaar gehaald.

De uitweg staat nu in de repo: `scripts/verkennen.mjs` plus een workflow. Die
draait waar OpenF1 wél bereikbaar is en zet in de log wat er terugkomt.

### Waarom zoeken op "safety car" fout gaat

De verkenner haalde de berichten van de wedstrijdleiding op over veertien
races. Dit is wat er langskomt:

| Wat | Hoe vaak |
|---|---|
| `SafetyCar \| VSC DEPLOYED` | 17× in 8 races |
| `SafetyCar \| SAFETY CAR DEPLOYED` | 8× in 6 races |
| `Other \| SAFETY CAR LIGHTS ON` | 3× in 2 races |
| `SafetyCar \| SAFETY CAR IN THIS LAP` | 7× (het einde) |
| `Other \| LAPPED CARS MAY NOW OVERTAKE THE SAFETY CAR: 77` | — |
| `Other \| SAFETY CAR WILL USE START/FINISH STRAIGHT` | — |
| `Other \| … NOTED - SAFETY CAR INFRINGEMENT` | tientallen |
| `Other \| … NOTED - CAR SAFETY LIGHTS` | — |

Monte Carlo had achttien berichten met "safety car" erin en drie echte safety
cars. Een filter op het losse woord zou daar zes keer te veel tellen, en het
zou nooit opvallen omdat er geen tweede bron is om het tegen af te zetten.

Vandaar dat `SAFETYCAR_START` de zinnen met naam en toenaam noemt, verankerd
aan het begin van het bericht. Hetzelfde bij de rode vlag: `RED FLAG - RACE
SUSPENDED` telt, `… - RED FLAG INFRINGEMENT` niet.

Drie dingen die de gegevens zelf lieten zien en die je niet verzint:

- **Dezelfde gebeurtenis heeft twee namen.** Zandvoort meldde zijn safety cars
  als `SAFETY CAR LIGHTS ON` (category `Other`), andere races als `SAFETY CAR
  DEPLOYED` (category `SafetyCar`). Daarom telt `telSafetyCars()` per ronde en
  niet per bericht: twee zinnen over hetzelfde moment zijn één safety car.
- **Gelijke tijden bestaan echt.** Zandvoort had twee coureurs op 74.321, en
  `pit_duration` komt soms in hele seconden terug. Bij gelijk wint wie hem het
  eerst reed.
- **Niet elke race in de kalender wordt gereden.** Van de kwalificatie én de
  race van Sakhir en Jeddah 2026 bestaat geen enkele rij — alleen de sessie in
  de kalender. Zie de sectie hieronder: die races zijn afgelast.

### Telt een virtual safety car mee?

Ja, en dat is een keuze geweest. Acht van de veertien races hadden geen enkele
échte safety car; met alleen die telling is "0" bijna altijd het goede antwoord
en is de vraag niet de moeite waard. Met de virtual erbij zit een race meestal
op één tot drie.

Belangrijker dan welke kant het opvalt: **de regel staat nu in de app**, bij de
vraag zelf. Een vraag waarvan de spelers de telregel niet kennen is geen
eerlijke vraag, en dit is precies het soort ding waar in een groepsapp ruzie
over ontstaat. Andersom willen? Het VSC-deel uit `SAFETYCAR_START` halen en de
zin in `EXTRAVRAAG.safety_cars.uitleg` aanpassen.

### Twee bugs die hierbij boven water kwamen

**Sakhir en Jeddah kregen nooit hun race-uitslag.** Alle ophaalacties van een
race stonden in één `try`. Hun kwalificatie geeft een 404, en daardoor sloeg de
sync de rest van diezelfde race over — inclusief de race-uitslag, die er wel
had kunnen zijn. Twee weekenden lang geen punten, en in de log stond alleen dat
de kwalificatie ontbrak. Elk stukje gaat nu apart via `probeer()`.

**Een 429 is geen ontbrekende data.** De eerste droogloop meldde dat OpenF1
voor Budapest en Zandvoort niets had — terwijl Zandvoort 333 berichten en 1369
rondes heeft. Het waren rate limits: zes verzoeken per race, met `laps` als
zware. Vier pogingen van maximaal acht seconden waren te kort. Nu zes pogingen
met oplopende pauzes, en de log zegt erbij dat de gegevens er wél zijn. Zonder
dat onderscheid lijkt een drukke run op een gat in de data, en ga je zoeken
waar niets te vinden is.

### `leeg()` en de valstrik met nul

In `sync.mjs` staat `leeg = (w) => w === null || w === undefined`, en dat is
geen omslachtigheid. Nul safety cars en "geen rode vlag" zijn echte uitslagen.
Met een gewone `!`-controle zou de sync ze elk uur opnieuw ophalen, en —
erger — een met de hand ingevulde nul niet als ingevuld herkennen en
overschrijven. Dezelfde valstrik als `leegAntwoord()` in de app.

---

## Afgelaste races

Correctie op de vorige sectie. Daar staat dat OpenF1 "gaten" heeft omdat er van
Sakhir en Jeddah 2026 geen enkele rij bestaat. Dat klopt als waarneming, maar de
verklaring erbij was verkeerd: **die races zijn afgelast.** Er is niets te
missen, er is nooit iets geweest.

Dat is geen detail, want het leidde tot de verkeerde oplossing. Bij een gat in
de gegevens is handmatig invoeren het antwoord. Bij een afgelaste race is dat
juist níét het antwoord — er is geen uitslag om in te voeren, en het probleem
is dat de race eeuwig op "wacht op uitslag" bleef staan. Voor iemand in de
poule is dat niet te onderscheiden van een app die stuk is, en op een kalender
van vijfentwintig races met twee zulke regels is dat het eerste wat opvalt.

**Hoe de sync het merkt.** OpenF1 heeft geen veld dat "afgelast" zegt. Wat je
ziet is een sessie die in de kalender staat en waar verder niets van bestaat.
`lijktAfgelast()` maakt daar een regel van: een race die zeven dagen na zijn
geplande tijd nog steeds een 404 geeft, is niet doorgegaan.

Twee dingen die die regel voorzichtig houden:

- **Alleen een 404 telt als bewijs.** Een 429 betekent dat wij te snel vroegen,
  en de gegevens er wél zijn. Zonder dat onderscheid zou een drukke run races
  als afgelast markeren — precies de fout die de droogloop eerder maakte toen
  hij zei dat Zandvoort niets had.
- **Zeven dagen.** Een echte uitslag staat er binnen een uur. Een week is ruim
  genoeg om nooit een gewone vertraging te raken.

**Een uitslag wint altijd van de vlag.** Overal waar het ertoe doet staat
`afgelastEnLeeg(r)`: afgelast én zonder uitslag. Blijkt de race toch verreden,
of vult iemand hem met de hand in, dan telt hij gewoon weer mee zonder dat er
een vlaggetje omgezet hoeft te worden. Dat is de weg terug als de regel er een
keer naast zit, en die moest er zijn — een automatische gevolgtrekking zonder
handmatige uitweg is een val.

**`new Date(null)` is 1 januari 1970.** Dat kostte een test. De eerste versie
van `lijktAfgelast()` controleerde alleen met `Number.isFinite()`, en nul is
een keurig eindig getal dat ruim een week geleden ligt — een race zonder
geplande tijd zou dus stilzwijgend als afgelast eindigen.

**En één die de browsertest ving.** De afgelast-melding stond eerst in
`geslotenWeergave()`, de tak voor een race waarvan de deadline verstreken is.
Maar een race kan afgelast worden terwijl zijn deadline nog loopt, en dan komt
hij daar nooit langs: je kreeg gewoon het invulscherm voor een race die nooit
gereden wordt. Nu is `afgelastEnLeeg(r)` in `vulPaneel()` genoeg om hem dicht
te zetten, wat de klok ook zegt.

---

## Het onderlinge duel: van wie is "1 – 0"?

Aanleiding: een screenshot met de rij "JOE" en daarnaast "1 – 0", met de
vraag "als het 1-0 voor Danny is, waarom staat er dan 1-0 bij Joe?"

Het antwoord was niet een rekenfout — `scores/controle-stand.mjs` (zie de
vorige sectie) had de 1-0 al bevestigd tegen de echte database. Het was de
weergave: de rij heet naar de tegenstander ("onderlinge duels · jij tegen
JOE"), en dan lijkt het eerste cijfer van "1 – 0" bij die naam te horen.
Feitelijk is het eerste cijfer altijd `d.ik` (jouw score) en het tweede
`d.ander` — maar die volgorde staat nergens met woorden bij, alleen als een
kleurtje op het cijfer (`.duel.voor .mijn{color:var(--groen)}`), en een
kleurtje lees je niet hardop voor jezelf terug als "dit is van mij".

De oplossing is één woord: een `.jij`-label (dezelfde badge die al overal
elders in de app naast je eigen naam staat) vlak ná je eigen cijfer, zodat
er "1 jij – 0" staat in plaats van kaal "1 – 0". Geen kleur nodig om het te
snappen, en het staat vast aan jouw cijfer — ook als dat cijfer toevallig het
laagste is (dus "0 jij – 1" als je achterstaat), niet aan het grootste getal.
`test/duel-weergave.test.mjs` test beide kanten expliciet, en is gecontroleerd
tegen de oude weergave: zonder het label faalt hij op precies dit punt.

Dit relativeert niets aan de vorige sectie: de rekenkern was en is correct.
Het is een herinnering dat "de code klopt" en "de gebruiker snapt het scherm"
twee verschillende dingen zijn, en bij een app voor het grote publiek is het
tweede net zo belangrijk.

---

## De sync draait nu elk uur, niet elke drie uur

Aanleiding: twee keer achter elkaar "de race/kwalificatie is klaar maar de
sync heeft het nog niet gedaan". Beide keren bleek de uitslag bij OpenF1 al
lang klaar te staan; de sync had 'm alleen nog niet opgehaald. Niet omdat er
iets stuk was aan `sync.mjs` — hij had het prima gevonden zodra hij draaide —
maar omdat de geplande run zelf te laat kwam.

`workflow_dispatch`-cron in GitHub Actions is best-effort: bij drukte op
GitHub's platform kan een geplande run een tijd later starten dan gepland, en
dat "een tijd later" bleek in de praktijk 2 tot 5 uur te kunnen zijn — zie de
tijdstippen van de runs in het Actions-tabblad, die met een schema van elke 3
uur soms 5 uur uit elkaar lagen in plaats van 3. Uitgerekend tijdens een
raceweekend, als er het meest te zien valt, is dat wanneer GitHub Actions het
drukst is.

Elk uur in plaats van elke 3 uur maakt zo'n vertraging minder erg voelen. Het
kost niets extra: draait de sync en is er niets nieuws, dan schrijft hij ook
niets weg (`console.log('Niks nieuws')` en klaar). Het is geen garantie — een
geplande run kan nog steeds laat komen — maar de bandbreedte van de
vertraging wordt kleiner.

**Wat dit niet oplost:** als iemand precies pech heeft en de eerstvolgende
geplande run zelf ook laat is, duurt het nog steeds langer dan een uur. Voor
dat moment is er de knop in het Actions-tabblad (`Uitslagen synchroniseren` →
Run workflow) om hem meteen te laten draaien.

## Terugkijken: je eigen inzending en die van de anderen

Twee klachten die onder water hetzelfde probleem waren.

*"Als de kwalificatie begint kan ik niet meer zien wat ik gekozen had."* Klopte.
Zodra de deadline voorbij was viel je in `geslotenWeergave()`, en daar stond
alleen "Inzendingen zijn gesloten" plus de punten van de rest. Je eigen keuze
was tot de uitslag binnenkwam nergens meer te vinden — precies op het moment
dat je hem wilt nakijken.

*"Ik wil zien wat de andere spelers gekozen hebben."* De namen onder "de rest"
waren dode tekstregels met een getal erachter.

Allebei willen ze een ingeleverde voorspelling zien zonder eraan te kunnen
zitten. Dat staat nu één keer in `keuzeOverzicht()`: de top 10, de losse
vragen, de extra vragen en de duels, met per regel wat het werd en wat het
opleverde zodra de uitslag er is.

Twee keuzes daarin die het uitleggen waard zijn:

**Geen puntenkolom zolang de uitslag er niet is.** Een dikke `0` bij een vraag
waarvan de uitslag simpelweg nog niet binnen is leest als "fout", terwijl er
nog niets beslist is. `null` betekent hier "daar valt nog niets over te
zeggen", en dat is iets anders dan nul punten — dezelfde onderscheiding die
`leeg()` in de sync maakt.

**Niet `uitslagWeergave()` hergebruikt.** Die is van jou, gaat over de uitslag,
en heeft de weekendwinnaar, de knop voor de groepsapp en de losse invoervelden
om zich heen. `keuzeOverzicht()` is van iemand, gaat over de inzending, en mag
nergens een knop hebben. Ze delen de scoreregels, niet het scherm.

De grendel op andermans keuze zit in `vulPaneel()` en niet alleen op de knop:

```js
const gesloten = !!lijstKlaar || afgelastEnLeeg(r) || dicht[S.tab];
if (S.bekijk && !gesloten) S.bekijk = null;
```

Sta je bij iemands gesloten kwalificatie en klik je door naar de race die nog
openstaat, dan val je er vanzelf uit. Vóór de deadline is andermans keuze
geheim, en dat hoort niet van één knop af te hangen.

Meegenomen: "de rest" hing zijn puntenaantal op aan een ingevulde top 10. Wie
alleen de pole of een paar duels invulde stond daardoor op `—` terwijl hij
gewoon punten had. Nu telt `heeftVoorspeld()`, net als in de stand.

## Wis alles, met twee tikken in plaats van een confirm()

*"Ik wilde een nieuwe voorspelling doen maar er stond geen wis alles knop. Ik
moest het 1 voor 1."*

De knop wist alleen het tabblad waar je op staat. De kwalificatie en de race
zijn twee losse inzendingen; wie zijn race overdoet mag zijn kwalificatie niet
kwijtraken.

Geen `confirm()`. Die popup is op een telefoon lelijk, hij wordt in sommige
browsers geblokkeerd, en hij ziet er precies zo uit als de meldingen die mensen
geleerd hebben blind weg te klikken — dus beschermt hij niet tegen de misklik
waar hij voor bedoeld is. De knop stelt de vraag zelf ("Alles wissen? Tik nog
een keer"), en vergeet hem na vijf seconden weer. Een losse misklik is daarmee
nooit gevaarlijk, en het is te testen zonder dialoogafhandeling.

## De deelnemerslijst bevroor op de eerste keer dat we hem ophaalden

*"Soms valt er wel eens een coureur uit. Dan komt er een reserve coureur of ze
gaan wisselen van team. Dat zag ik niet gebeuren."*

Eén regel in `sync.mjs` verklaarde dat:

```js
if (!race.drivers && race.quali_key) { ... }
```

De lijst werd één keer opgehaald — bij de kwalificatie — en daarna nooit meer
aangeraakt. Wat er die ene keer in stond, stond er de rest van het seizoen in.
Dat is meer dan een verkeerde naam op het scherm: de teamgenoot-duels worden
gescoord op `teamParen(race.drivers)`, dus een verouderde lijst scoort de duels
op de verkeerde paren.

`deelnemersUit()` beslist nu per race waar de lijst vandaan moet komen:

- Geen lijst? Ophalen, hoe ver de race ook weg is — anders valt er niets te
  kiezen zodra OpenF1 hem publiceert.
- Weekend nog niet gereden en binnen veertien dagen? Verversen. De lijst mag
  in die periode nog schuiven.
- Race gereden? Met rust laten. `sync.mjs` heeft hem op het moment dat de
  uitslag binnenkwam één keer uit de **rácesessie** gehaald, en dat is de enige
  lijst die zegt wie er echt gereden heeft.

Het venster van veertien dagen staat er om te voorkomen dat we elk uur de
deelnemers van een race in december ophalen.

### Wat OpenF1 hier wél en niet weet

Voor Monza is nagekeken of OpenF1 het verschil zelf kent, met
`COUREURS=Monza node scripts/verkennen.mjs` op een runner. Het antwoord is
nee: de kwalificatie (11357) en de race (11361) geven exact dezelfde 22
coureurs met exact dezelfde teams. In OpenF1's velddata voor 2026 rijdt Lawson
het hele seizoen voor Red Bull en komt Hadjar helemaal niet voor.

### Wat er dan wél mis was, en hoe het zichzelf repareert

`scripts/controle-coureurs.mjs` over alle 25 races gaf één afwijking, en die
was raak. Alleen Monza:

```
=== ronde 15 Monza ===
  opgeslagen: 22 coureurs
  kwalificatie (11357): 22 coureurs bij OpenF1
      #30 LAW: database Racing Bulls -> openf1-kwalificatie Red Bull Racing
      #6 HAD (Red Bull Racing) staat alleen in database
      #22 TSU (Racing Bulls) staat alleen in openf1-kwalificatie
  race (11361): ... hetzelfde
      LET OP: #22 staat in de race-uitslag maar niet in onze deelnemerslijst
```

De andere 24 races komen exact overeen. Dus de klacht klopte, alleen zat de
oorzaak niet waar hij leek te zitten: **OpenF1 heeft geen wissel geregistreerd
tussen kwalificatie en race — de opgeslagen lijst van Monza was al verouderd
voordat het weekend begon.** Hij is opgehaald op een moment dat OpenF1's
opgave nog de oude was, en daarna bevroren. Hadjar stond erin terwijl hij dit
seizoen bij OpenF1 nergens voorkomt, Lawson stond bij het verkeerde team, en
Tsunoda ontbrak volledig — terwijl die de race gewoon uitreed.

Dat laatste is het aanknopingspunt. **Niemand finisht een race zonder aan de
start te staan**, dus een uitslag met een coureur die niet in onze lijst staat
bewijst dat de lijst kapot is — en dat is vast te stellen zonder OpenF1 ook
maar iets te vragen, uit gegevens die we al hebben. `deelnemersUit()` maakt
daar één uitzondering voor op "een gereden race laten we met rust", en haalt de
lijst dan alsnog uit de racesessie. Monza repareert zichzelf zo bij de
eerstvolgende sync, en dezelfde vergissing kan nergens blijven staan.

Wat dit *niet* vangt is een lijst met alleen een teveel — een coureur die er
niet meer bij hoort maar wiens afwezigheid nergens uit blijkt. Daar is geen
bewijs voor zonder het aan OpenF1 te vragen, en dat elk uur voor elke gereden
race doen is het niet waard. `controle-coureurs.mjs` meldt het wel, en dan is
één sync met de kalenderknop genoeg.

De eerlijke restrictie blijft staan: **een wissel die OpenF1 zelf niet
registreert, kan de app ook niet laten zien.**

## Kuala Lumpur bestaat niet

*"Ik weet niet hoe je aan Kuala Lumpur komt maar volgens mij is dat geen race."*

Terecht. `sync.mjs` nam letterlijk over wat OpenF1 op
`sessions?year=2026&session_name=Race` teruggeeft, zonder één controle. Daar
zit een testrecord tussen:

```
2026-09-26  meeting 1295  Baku          ... AZERBAIJAN GRAND PRIX 2026
2026-10-04  meeting 1308  Kuala Lumpur  ... BAHRAIN GRAND PRIX IN MALAYSIA 2026
2026-10-11  meeting 1296  Marina Bay    ... SINGAPORE GRAND PRIX 2026
```

"Bahrain Grand Prix in Malaysia" bestaat niet, en de `meeting_key` valt buiten
de hele reeks van het seizoen (1279 t/m 1302). Dat tweede is het bruikbare
signaal, want daar hoef je geen namen voor te lezen: OpenF1 deelt `meeting_key`
op kalendervolgorde uit, dus bij de echte races loopt hij gelijk op met de
datum. Precies één record breekt dat.

`hoortNietInDeKalender()` rekent per race uit welk deel van de races vóór hem
een hogere `meeting_key` heeft, en welk deel van de races ná hem een lagere.
Bewust een **aandeel** en geen aantal: Kuala Lumpur staat op vier na achteraan,
dus er kunnen maar zeven races na hem misstaan. Met een vaste drempel verdwijnt
zo'n record precies daar waar het staat — en niemand zet een testrecord bij
voorkeur in het midden. Als aandeel is het glashelder: van de zeven races die
erna komen, staan er zeven fout. Bij de echte kalender van 2026 komt geen
enkele race boven 0,06 uit; Kuala Lumpur zit op 1,00.

Daarachter zit een rem. Deze uitkomst leidt tot het doorstrepen van races, dus
hij mag nooit een heel seizoen meenemen. Wijst hij meer dan een kwart van de
kalender aan, dan is niet de kalender raar maar deze regel niet van toepassing
— bijvoorbeeld als OpenF1 ooit aflopend gaat nummeren. Dan liever niets doen
dan alles weggooien. Dat is precies wat de test aantoonde: zonder die rem
haalde een aflopend genummerde kalender alle 24 races onderuit.

Niet op de naam gefilterd, en bewust. Een lijst van "echte" circuits zou elk
jaar bijgewerkt moeten worden en zou een nieuwe Grand Prix weggooien — en juist
een nieuwe race is er een die niemand verwacht.

Een record dat er al in stond wordt **doorgestreept en niet verwijderd**: er
kunnen voorspellingen aan hangen, en `afgelast` vertelt in de app precies het
goede verhaal — hij telt voor niemand mee, en wat je had ingevuld blijft staan.

## De knip op regelnummers brak, en dat hoorde een test te vangen

`scripts/controle-stand.mjs` knipt de rekenkern letterlijk uit `index.html`, om
de audit op de productiecode te laten draaien in plaats van op een kopie. Dat
ging op regelnummers:

```js
const primitieven = knip(675, 769);
```

Die schoven mee met elke bewerking erboven. Na een wijziging van 247 regels
begon het blok midden in een functie en viel het script om op `SyntaxError:
Illegal return statement` — een foutmelding die niets zegt over wat er echt aan
de hand was, en pas zichtbaar op een GitHub-runner, want hier is Supabase niet
bereikbaar.

Nu staan er merktekens in `index.html`:

```js
// <knip primitieven>
...
// </knip primitieven>
```

Namen schuiven niet mee. Het knippen zelf staat in `scripts/knipsel.mjs`, zodat
de audit en de test hetzelfde gebruiken, en `test/knipsel.test.mjs` bouwt de
rekenkern bij elke pull request op en rekent er een uitkomst mee na die met de
hand na te rekenen is. Zakt die, dan is de audit stuk — nog vóór iemand hem
start.

## Het rondenummer bleek een identiteit te zijn

Dit kwam pas boven water toen het kalenderfilter van hierboven voor het eerst
echt draaide. De log zag er goed uit:

```
overgeslagen: Kuala Lumpur 2026-10-04 — meeting 1308 valt buiten de reeks
24 races weggeschreven
Uitslagen controleren voor 25 races      <- 25?
ronde 18 Marina Bay: drivers             <- Marina Bay stond op 19
```

De upsert gaat op `(season, round)`:

```js
sb('races?on_conflict=season,round', ...)
```

en het rondenummer werd doorgeteld over de races die overbleven. Haal je er
halverwege één uit, dan schuift alles erachter een plaats op. De rij die Kuala
Lumpur was werd Marina Bay, de rij die Marina Bay was werd Austin, en de
laatste ronde bleef als wees achter — een tweede Yas Marina.

**Het rondenummer is in de praktijk de identiteit van een rij**, en aan die rij
hangen via `races.id` alle voorspellingen. Schuift het nummer, dan komt een
voorspelling bij een andere race te staan. Dit keer viel dat mee: alle 26
antwoorden zaten op Monza en op de verschoven races stond nog niets. Maar dat
is geluk en geen ontwerp — was dit twee weken later gebeurd, dan had iedereen
zijn Marina Bay-voorspelling bij Austin teruggevonden.

De echte identiteit van een race is zijn `race_key`: dat is de sessie bij
OpenF1 en die verandert nooit. `rondeToewijzing()` houdt dat vast — een race
die we al kennen houdt het rondenummer dat hij had, wat er ook vóór hem
gebeurt. Alleen een race die we nog nooit gezien hebben krijgt een nieuw
nummer, en dan één hoger dan het hoogste dat al bestaat.

Nadrukkelijk niet het laagste vrije nummer. Een gat in de nummering is precies
de plek waar ooit een race stond die eruit gehaald is; daar een nieuwe race in
schuiven maakt van dat gat weer een verwarring. En het geeft rare uitkomsten:
een race die in december wordt toegevoegd zou zo ronde 1 kunnen krijgen. Dat
was ook precies wat de test liet zien — de eerste versie deed het wel zo.

De achtergebleven dubbele rij ruimt `ruimDubbelenOp()` op, maar met een rem
die er echt toe doet: `answers.race_id` heeft `on delete cascade`, dus een rij
weggooien gooit de voorspellingen die eraan hangen mee weg. Hangt er iets aan,
dan wordt hij doorgestreept in plaats van verwijderd en staat er hardop in de
log dat er een mens naar moet kijken.

Wat hier eigenlijk misging is een schemakeuze: `(season, round)` als sleutel
van de upsert terwijl `race_key` de sleutel is die betekenis heeft. Dat
rechtzetten in `schema.sql` is netter dan dit, maar het is een migratie op een
draaiende database met voorspellingen erin. `rondeToewijzing()` maakt de fout
onbereikbaar zonder dat risico; de schemawijziging is een aparte klus voor als
er ooit toch aan die tabel gewerkt wordt.
