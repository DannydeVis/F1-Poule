# RacePicks: wat er nog bij kan

Overzicht van alles wat besproken is, plus nieuwe ideeën, op volgorde van
wat het oplevert gedeeld door wat het kost.

Uitgangspunt: de app werkt. Alles hieronder is optioneel.

---

## De belangrijkste les vooraf

Eerder is er een catalogus van ruim twintig extra vraagsoorten voorgesteld
(safety cars, track limits, topsnelheid, inhaalacties enzovoort). Bij nader
inzien is dat niet wat een vriendenpoule beter maakt.

Wat vriendenpoules kapot maakt:

1. Iemand staat na acht races onbereikbaar achter en haakt af
2. Mensen vergeten in te vullen
3. Er is geen reden om na de race terug te komen

Geen van die drie wordt opgelost door meer vraagsoorten. De eerste helft van
deze lijst gaat daarom over sociale mechaniek, niet over voorspellingen.

---

## Op de rol: een eigen domein

`racepicks.com` bleek bezet. De naam RacePicks zit inmiddels wél in de app, en
dat hoeft geen probleem te zijn — een `.com` die weg is betekent niet dat de
naam weg is. `.app`, `.nl` of `.eu` houden hem gewoon overeind, en dat scheelt
een hernoeming. Wordt het toch een andere naam, zie dan de checklist onderaan
dit hoofdstuk: dat is twintig minuten werk, geen verbouwing.

Hieronder staat `<domein>` voor wat het ook wordt. Zodra dat er is:

- **Google Cloud** (Google Auth Platform → Clients): `https://<domein>`
  toevoegen als Authorized JavaScript origin, en
  `https://etifamdwqxjfaeaordlr.supabase.co/auth/v1/callback` staat er al
  goed (die verandert niet — dat is Supabase's adres, niet dat van de app).
  De oude GitHub Pages-origin mag erbij blijven staan zolang die nog gebruikt
  wordt.
- **Supabase** (Authentication → URL Configuration): Site URL naar
  `https://<domein>`, en `https://<domein>/**` toevoegen aan
  Redirect URLs. De oude GitHub Pages-regel pas weghalen als niemand die
  link meer gebruikt.
- **GitHub Pages**: een `CNAME`-bestand met je domein erin, plus een
  DNS-record bij de domeinregistrar die naar GitHub Pages wijst.
- De app zelf hoeft niet aangepast: `linkBasis()` leest `location.origin`
  dynamisch uit, dus uitnodigingslinks en OAuth-redirects werken vanzelf op
  elk domein waar de app draait.
- **Eigen SMTP met een adres op je eigen domein.** Nu staat er in elke mail (magic
  link, mailkoppeling) een afzenderadres van Supabase zelf
  (`noreply@mail.app.supabase.io`) — dat kan pas veranderen naar iets met
  je eigen domein erin zodra dat bestaat én er een mailserver aan
  gekoppeld wordt (Supabase → Authentication → Settings → SMTP). De
  zichtbare *tekst* in de mail (onderwerp, inhoud) is trouwens nu al vrij
  aan te passen via Authentication → Emails → sjablonen, zonder dat
  daarvoor het domein nodig is.

### Als de naam tóch verandert

De merknaam zit op dertien plekken, en nergens anders. Het gewone woord
"poule" is met opzet níét meeveranderd — je speelt nog steeds in een poule,
met een poulecode en een poulebaas — dus zoeken op "poule" levert honderden
treffers op die allemaal moeten blijven staan. Zoek op de merknaam zelf.

| waar | hoeveel | wat |
|---|---|---|
| `index.html` | 9 | `<title>`, de apple-titel, vier merkbalken, de installatietekst, de `<meta name="description">` |
| `manifest.webmanifest` | 2 | `name` en `short_name` (de `description` is de positioneringszin, die verandert niet mee) |
| `scripts/maak-pictogrammen.py` | 2 | de bestandsnamen die het script wegschrijft |
| `pictogrammen/` | 3 | `-192`, `-512` en `-apple-180`, opnieuw te genereren met dat script |
| `test/eerste-indruk.test.mjs` | 1 | controleert de manifestnaam, dus die verwachting moet mee |
| de drie documenten + `README.md` | 5 | alleen de titels en een paar verwijzingen |

Wat níét meeverandert, en dat is met opzet:

- **De localStorage-sleutels blijven `poule:*`.** Hernoemen gooit iedereen die
  de app al gebruikt uit zijn poule, voor precies nul winst — niemand ziet ze
  ooit.
- **De positioneringszin** ("het F1-voorspelspel voor jou en je vrienden")
  noemt de naam niet en kan dus blijven staan.
- **Het icoon** hoeft niet per se opnieuw: één vak in het accent op een
  startgrid is "één keuze die eruit springt", en dat werkt bij elke naam die
  over voorspellen gaat.

Let op het moment: net als bij de vorige hernoeming pakt een geïnstalleerde
tegel op iemands beginscherm de naam van het moment van installeren en werkt
die niet bij. Hoe langer je wacht, hoe meer mensen de oude naam houden tot ze
hem weggooien en opnieuw zetten.

---

## ~~Publieke en private poules~~ — gebouwd

De drie open vragen zijn met opzet zo klein mogelijk beantwoord:

- **Vindbaar op wat** — alleen een naam en omschrijving in een blader-lijst,
  geen regio of categorie. Dat kan er later bij als er behoefte aan blijkt.
- **Wie mag openbaar zetten** — alleen de poulebaas, via `magBeheren()`,
  hetzelfde mechanisme als de vragenset en de omschrijving.
- **Betekent "privé" iets nieuws** — nee. `pools_lezen` stond al open (zie
  §RLS in `schema.sql`), dus "privé" betekent nog steeds precies wat het al
  betekende: je hebt de code nodig om hem te *vinden*, niet om hem te lezen.
  Geen RLS-wijziging dus, alleen een nieuwe kolom `is_public` en een nieuwe
  weg naar dezelfde, altijd al leesbare data. Zie `OVERDRACHT.md`.

---

## Groep 1: klein werk, groot effect

### ~~Weekendwinnaar naast de seizoensstand~~ — gebouwd
Toon per race wie dat weekend de meeste punten pakte, met een eigen kleine
ranglijst "weekendoverwinningen" over het seizoen.

Waarom dit het belangrijkste punt op deze lijst is: iemand die 300 punten
achterstaat kan nog steeds Monza winnen. Zonder dit is de poule voor de
helft van je deelnemers in juni al afgelopen.

Kosten: een sortering op bestaande data, geen databasewijziging.

### ~~Stand kopiëren als WhatsApp-tekst~~ — gebouwd
Een knop die dit op je klembord zet:

```
🏁 Monza, uitslag poule

1. Danny      78
2. Michael    64
3. Davy       51

Seizoen: Danny 412, Michael 388, Davy 371
```

Je poule leeft in de groepsapp, niet in de app. Zonder dit moet iemand actief
de site openen om te zien hoe het ging, en dat doen mensen na race vier niet
meer uit zichzelf.

Kosten: een template-functie en `navigator.clipboard.writeText()`.

### ~~Wie heeft nog niet ingevuld~~ — gebouwd
Op het racesoverzicht: "Davy heeft nog niks ingevuld voor Monza". Gecombineerd
met de kopieerknop hierboven heb je daarmee je herinneringssysteem, zonder
mailserver of pushmeldingen.

### ~~Uitnodigingslink met de code erin~~ — gebouwd
`https://dannydevis.github.io/F1-Poule/?code=10D4FD` en de app vult de
poulecode automatisch in. Scheelt je vrienden een stap en een typefout.

### ~~Handmatig een uitslag invullen in de app~~ — gebouwd, en weer weggehaald
Was er, is er niet meer. Bij het klaarmaken voor publiek gebruik viel de keuze
op "niemand vult meer zelf uitslagen in": met meer dan één poule in de app is
een verkeerd ingevulde uitslag geen eigen probleem meer maar dat van iedereen
die dat weekend meedeed. De uitslagen komen nu alleen nog van de sync. Zie
`OVERDRACHT.md`, "Uitslagen komen alleen nog van de sync".

---

## Groep 2: maakt het leuker om terug te komen

### ~~Onderlinge duels~~ — gebouwd
"Jij tegen Davy dit seizoen: 8 tegen 6." Per raceweekend wie van twee spelers
meer punten pakte, opgeteld over het seizoen. Puur een berekening over data die
je al hebt.

Dit is waar mensen elkaar in de groepsapp op aanspreken, veel meer dan op de
totaalstand.

### ~~Bijna-goed terugkoppeling~~ — gebouwd
Onder de uitslag staat nu "zo dichtbij": de coureurs waar je er één of twee
plekken naast zat, in zinnen die je in de groepsapp kunt plakken, met wat het
scheelde. Wie er drie of meer naast zat komt er niet in — dat "zo dichtbij"
noemen zou spot zijn.

### ~~Je persoonlijke blinde vlek~~ — gebouwd
Op de standpagina, onder "terugblik": welke coureur je structureel te hoog of
te laag zet, en op welk stuk van de lijst je juist scherp bent.

Met twee drempels erin, want dit is het soort getal waarmee een app makkelijk
met gezag onzin verkoopt: onder zes ingeleverde lijsten zegt hij niets, een
coureur telt pas mee vanaf vier voorspellingen mét uitslag, en een afwijking
van minder dan een hele plek is geen blinde vlek maar gewoon goed spelen.

### ~~Moeilijkste race van het seizoen~~ — gebouwd
Staat in hetzelfde terugblikblok: welk weekend het zwaarst was voor de poule,
met het makkelijkste ernaast. Een race telt pas mee vanaf twee inzendingen —
het gemiddelde van één speler is geen poulegemiddelde.

---

## ~~Groep 3: extra vraagsoorten~~ — de beste vier staan er

Pas hieraan beginnen als groep 1 en 2 staan. En dan niet alles, maar hooguit
vier of vijf.

### De beste vier, wat mij betreft — alle vier gebouwd

| Vraag | Waarom deze |
|---|---|
| ~~**Winnaar apart, 25 punten**~~ — gebouwd | Meest gevraagde toevoeging, één extra kolom |
| ~~**Teamgenoot-duels**~~ — gebouwd | Bijna 50/50, dus de poule splitst zich altijd. Beste verhouding tussen spreiding en kennis van alle vraagsoorten |
| ~~**Aantal safety cars**~~ — gebouwd | Hard te tellen, geen discussie over de uitslag |
| ~~**Rode vlag ja/nee**~~ — gebouwd | Simpel, en een goed gevoel als je hem goed hebt |

Plus snelste ronde en snelste pitstop, die er onderweg bij kwamen. De negen
vragen die de app kent staan in `GEBOUWD` in `index.html`; per poule vink je
aan welke meedoen. Daarmee is deze groep wat mij betreft klaar: hier nog meer
aan toevoegen is precies waar de les bovenaan deze lijst voor waarschuwt.

### De rest van de catalogus

Uit `race_control`: VSC-periodes, tijdstraffen, track limits, stewardsonderzoeken.
Uit `position`: leiderswissels, ronden aan de leiding, leider na ronde 1.
Uit `car_data`: hoogste topsnelheid (let op: filteren met `speed>=330` in de
query, anders haal je miljoenen rijen op).
Uit `pit` en `stints`: snelste pitstop, eerste die pit, band waarop de winnaar
finisht, totaal aantal stops.
Uit `overtakes`: aantal inhaalacties (beta-endpoint, getal kan afwijken van wat
F1 zelf publiceert).
Overig: meeste plekken gewonnen of verloren, marge tussen P1 en P2, regen.

### Belangrijk bij het scoren van getallen
Gebruik voor inhaalacties en track limits een "wie zit er het dichtst bij"
regel, geen vaste marge. Monaco heeft een handvol inhaalacties, Miami tachtig.
Met een vaste tolerantie scoort daar nooit iemand.

### Structuurwijziging die hierbij hoort
Zolang je twee of drie vragen hebt zijn losse kolommen simpeler. Vanaf ongeveer
vijf loont het om over te stappen op een `questions` tabel met een rij per
vraag, plus `pool_questions` om per poule aan te vinken wat meedoet. Doe die
overstap in één keer, niet halverwege.

---

## Groep 4: seizoensmechaniek

### ~~Contrair-multiplier~~ — gebouwd
Punten schalen met hoe zeldzaam je antwoord was binnen de poule:
`min(1 + (1 - aandeel), 2.0)`, afgerond op één decimaal. Iedereen dezelfde gok
is 1×, in je eentje goed gokken 1,8× in een poule van vijf.

Lost het probleem op dat "wie wint" nul verschil maakt als iedereen dezelfde
naam invult. Corrigeert zichzelf als één team het seizoen domineert.

**Alleen de losse vragen.** Bij een top 10 zou je per plek een zeldzaamheid
moeten uitrekenen, en dan is niet meer uit te leggen waar een getal vandaan
komt — terwijl juist een puntentelling die je niet kunt navertellen het
vertrouwen sloopt. De duels vallen er om dezelfde reden buiten.

**Afgerond op één decimaal, en dat is geen slordigheid.** Het scherm toont
"×1,8", dus er hoort ook met 1,8 gerekend te zijn. Met de kale breuk stond er
×1,8 naast een getal dat uit 1,75 kwam.

Aan te zetten door de poulebaas, met dezelfde streep als de jokers en
automatisch invullen: `pools.contrair_vanaf`, en een weekend dat toen al liep
telt niet mee.

### ~~Jokers~~ — gebouwd
Vijf per seizoen, één per weekend, en dat weekend telt dubbel. Hij moet liggen
voordat de eerste sessie begint en kan daarna niet meer verzet worden, dus het
is een gok op welk weekend jou het beste ligt — precies de strategische keuze
waar dit punt voor bedoeld was. Aan te zetten door de poulebaas, en net als bij
automatisch invullen geldt dat vanaf dat moment en niet met terugwerkende
kracht.

### ~~Slechtste twee races vallen weg~~ — gebouwd
Bij 24 races tellen de beste 22. Vangt één vakantie en één ramprace op.

Staat op de standpagina als een eigen blok, nadrukkelijk náást de stand en
niet in plaats van. De officiële stand blijft alles meetellen: iemands punten
midden in een lopend seizoen afpakken is geen verbetering, ook niet als de
uitkomst eerlijker is. Wil je het later wél de officiële telling maken, dan is
dat één regel in `standRijen()`.

De regel groeit mee met het seizoen — per twaalf gereden races valt er één
weekend af. Zou je meteen vanaf race één twee weekenden wegstrepen, dan telt er
na drie races nog één mee en is de stand onzin.

### ~~Automatisch invullen bij vergeten~~ — gebouwd
Wie niks inlevert krijgt de WK-stand als top 10, gemarkeerd als "automatisch".
Houdt iemand die twee races mist in de race.

Staat uit tot de poulebaas hem aanzet, en dan alleen vanaf dat moment — zie
`OVERDRACHT.md` voor waarom dat een datum is en geen vinkje. Je wint er geen
weekend mee: de seizoensstand houdt je aangehaakt, een weekend winnen is iets
wat je doet.

### ~~Seizoenslaag~~ — gebouwd
Vier vragen die je vóór race 1 invult en aan het eind scoort: wereldkampioen
(50), constructeurstitel (40), aantal verschillende racewinnaars (30) en welk
team vierde wordt (30). Samen 150 punten, dus ongeveer zes races aan gewicht.
Ze staan als gewone vragen in `questions` met `sessie = 'seizoen'`, dus een
poule kiest ze bij het aanmaken — en een poule die nu loopt krijgt ze niet.

### ~~Sprintweekenden~~ — gebouwd
Zes weekenden per seizoen hebben een derde sessie. De sync haalt hem op via
`session_name = 'Sprint'`, de app zet er een derde tabblad voor neer, en de
top 10 van de sprint telt voor halve punten. Zie "Sprintweekenden" hieronder
voor waarom dit pas kon nadat `SESSIES` er was.

---

## Wat ik zou overslaan

**De gewogen top 10 (6/9/12 punten per positiegroep).** Eerder voorgesteld om
het middenveld zwaarder te laten tellen. Klopt theoretisch, maar het is lastig
uit te leggen aan je poule en de huidige formule van 5/3/1 werkt prima. Niet
doen tenzij iemand er zelf om vraagt.

**Gele vlaggen tellen.** Eén incident geeft meerdere sectorberichten en
marshalsectoren overlappen, dus het getal is niet eenduidig vast te stellen.
Gebruik safety cars en VSC in plaats daarvan.

**Team radio.** Sinds 2026 geeft F1 vrijwel geen radiodata meer vrij.

**Driver of the Day.** Fanstemming, staat niet in OpenF1, niet te resolven.

---

## Voorgestelde volgorde

1. ~~Weekendwinnaar~~ — gebouwd
2. ~~WhatsApp-kopieerknop~~ — gebouwd
3. ~~Wie heeft nog niet ingevuld~~ — gebouwd
4. ~~Handmatige uitslag-invoer~~ — gebouwd
5. ~~Onderlinge duels~~ — gebouwd
6. ~~Winnaar als aparte vraag~~ — gebouwd
7. ~~Uitnodigingslink met code~~ — gebouwd

Alle zeven staan erin; zie `OVERDRACHT.md` voor hoe ze werken. Punt 1 tot en
met 3 waren samen ongeveer een avond werk en hebben meer effect op of je poule
het seizoen haalt dan de hele rest van deze lijst bij elkaar.

## Wat er nu nog openligt

Groep 1, 2 en 3 staan er, en uit groep 4 "slechtste twee races vallen weg" en
"automatisch invullen bij vergeten" — daarmee zijn alle drie de kwalen bovenaan
deze lijst aangepakt.

Wat hieronder staat is een nieuw plan, in fases. Het komt uit een doorlichting
van de app van buitenaf, naast wat er in groep 4 nog lag. De volgorde is niet
die van dat advies; waar ik ervan afwijk staat erbij waarom.

---

## ~~Fase 0: het lek dichten vóór het publiek live gaat~~ — gebouwd

**Dit is het enige echte blokkade-punt op deze hele lijst, en het staat daarom
bovenaan en niet onderaan.**

`pools_lezen`, `pool_members_lezen` en `answers_lezen` staan alle drie op
`using (true)`. Met de anon key — die met opzet publiek in `index.html` staat —
kan iedereen élke poule, élke spelersnaam en élk antwoord in de hele database
uitlezen. Niet alleen van zijn eigen poule.

Dat is een bewuste keuze geweest en het staat eerlijk in BEDIENING.md §7: zolang
de app onder vrienden draait is het "wie de code heeft, ziet alles", en dat is
niet erger dan de groepsapp waar die code ook in staat. Maar het schaalt niet
naar een publiek domein met onbekenden erop. "Privé" gaat dan betekenen wat
mensen dénken dat het betekent.

Waarom het open stond, en dus wat een oplossing moet kunnen:

- je moet een poule op zijn code kunnen vínden vóórdat je lid bent;
- het "Wie ben jij?"-scherm toont de bestaande spelers, ook vóórdat je lid bent.

De uitweg is allebei die stappen door een `security definer`-functie laten
lopen die een join_code aanneemt en alleen díé poule met díé spelers
teruggeeft, in plaats van `select` open te zetten op de tabellen. Daarna kunnen
de drie policies dicht naar "alleen wat bij een poule hoort waar je lid van
bent".

Kosten: één functie, drie policies, en een ronde door de app waar die twee
schermen data ophalen. Plus flink wat testwerk, want `test/policies.test.sql`
en `test/lidmaatschap.test.sql` leggen het huidige gedrag juist vast.

**Doe dit vóór het domein live gaat, niet erna.** Een lek dichten terwijl er
nog niemand vreemd op zit is onderhoud; erna is het een incident.

---

## ~~Fase 1: RacePicks worden~~ — gebouwd, op het domein na

**Gedaan:** de naam, de positioneringszin, het icoon en het manifest. **Nog
open, en dat is jouw kant:** een domein kiezen en live zetten — zie bovenaan
dit bestand voor de instellingen bij Google Cloud, Supabase en GitHub Pages
die daarbij horen. `racepicks.com` bleek bezet; de naam zelf kan blijven.

De app heette overal "Poule". Een eigen domein staat al langer op de rol (zie bovenaan dit bestand voor de instellingen die daarbij horen).

- de naam overal: `<title>`, `manifest.webmanifest` (`name` én `short_name`),
  het merk in de zijbalk, de "wat is dit?"-tekst, de mailsjablonen in Supabase,
  en `BEDIENING.md`;
- logo en app-icoon: `scripts/maak-pictogrammen.py` maakt ze nu uit het
  startgrid-motief. Een nieuw merk betekent een nieuw motief in dat script —
  en denk aan de drie maten: 192, 512 en de vullende 180 voor iOS;
- kleuren- en iconsysteem: zie hieronder — hier is minder te doen dan het lijkt.

### De positionering

Niet "een website waar je F1-voorspellingen kunt invullen", maar:

> **RacePicks is the F1 prediction game for you and your friends. Pick the
> grid, beat your mates and win the weekend.**

Dat is de betere van de twee, en niet alleen als marketingzin: het beschrijft
preciezer wat er gebouwd is. "Win the weekend" is letterlijk de
weekendoverwinning, en "beat your mates" is het onderlinge duel. Allebei
bestaan ze al.

Deze zin heeft een plek in de app: de "wat is dit?"-tekst op het beginscherm
zegt nu wat de app dóét (top 10 voorspellen, punten per plek). Wat er mist is
waaróm. Wel eerst in het Nederlands vertalen — de rest van de app is Nederlands
en één Engelse zin ertussen leest als een banner.

### Over het kleurensysteem: dat is er al

Het advies noemt als visuele richting "zwart/donkergrijs, off-white, één fel
rood-oranje accent, Barlow/Barlow Condensed behouden". Dat is geen wijziging,
dat is een beschrijving van wat er staat:

| advies | staat al in `:root` |
|---|---|
| zwart/donkergrijs | `--bg:#0b0b0c`, `--paneel:#15161a` (donker thema) |
| off-white | `--ink:#f2f3f5` |
| fel rood-oranje accent | `--accent:#ee4d33` |
| Barlow / Barlow Condensed | `--sans` en `--cond`, zelf gehost in `lettertypen/` |

Wat er van dat advies wél overblijft is niet de kleur maar de **vorm**: veel
grotere cijfers, minder randen, minder losse kadertjes, meer dashboardgevoel.
Dat is geen nieuw kleurensysteem maar een herindeling van het scherm, en het
hoort dus bij fase 2 en niet hier. Hier blijft over: de naam, het logo en het
icoon.

**Waarom dit meteen na fase 0 komt en niet later.** Sinds "zet op beginscherm"
er is, installeren mensen de app als tegel op hun telefoon. Die tegel pakt de
naam en het icoon van het moment van installeren en werkt niet mee bij, ook
niet na een update. Wie nu "Poule" installeert houdt "Poule" tot hij hem
weggooit en opnieuw zet. Elke week wachten is dus een week langer met mensen
die de verkeerde naam op hun beginscherm hebben staan.

---

## ~~Fase 2: het racescherm wordt een dashboard~~ — gebouwd

Het beste idee uit de doorlichting, en het goedkoopste: de data is er al, het
is een herschikking van het scherm.

Wat iemand binnen één seconde na openen wil weten:

1. welke race komt eraan;
2. moet ik nog iets doen;
3. hoe sta ik ervoor.

Nu staan die drie door elkaar in de kalenderlijst. Voorstel is één **race
weekend-kaart** bovenaan die ze op die volgorde beantwoordt — circuit en
ronde, de afteller tot de eerstvolgende deadline, per sessie of je hebt
ingeleverd, en één knop die je naar de plek brengt waar je nog iets moet doen.
Daaronder pas je eigen stand, en daaronder pas de kalender.

Verder in deze fase: de onderbalk, het invulscherm en de standenpagina
compacter, en profiel/poule/instellingen duidelijker uit elkaar.

Opletten bij de afteller: er tikt al een `tikken()` elke 30 seconden. Een
afteller op secondeniveau is een tweede timer, en die moet uit zodra het tabblad
naar de achtergrond gaat — anders loopt hij een uur door in een tabblad dat
niemand ziet.

---

## ~~Fase 3: de leuke dingen~~ — gebouwd wat het waard was

Op volgorde van wat het oplevert gedeeld door wat het kost. Het aardige aan
deze hele fase: er komt geen kolom en geen tabel bij. Het is allemaal rekenwerk
over data die er al ligt, plus één scherm dat vooral bestaand spul bij elkaar
zet.

| | wat het is | kosten |
|---|---|---|
| **Positiewijziging** | ↑2 / ↓1 sinds vorige race, naast de stand | een tweede keer `standRijen()` over de races tot en met de vorige |
| **Reeksen** | "7 weekenden op rij ingeleverd" | telling over `heeftVoorspeld()`, die er al is — en let op: een automatisch ingevulde lijst telt níét mee, precies zoals hij ook geen weekend wint |
| **Seizoensgrafiek** | je positie door het seizoen heen | dezelfde herhaalde stand als bij positiewijziging, als lijngrafiek |
| **Race Recap** | persoonlijke pagina na iedere race | grotendeels al gebouwd, verspreid: "zo dichtbij", de weekendwinnaar, je score en de inkijk bij anderen. Dit is vooral samenbrengen |
| **Profielstatistieken** | race wins, accuracy, beste circuit | rekenwerk over bestaande data, maar kijk eerst naar de drempels in de terugblik: onder een handvol races zegt zo'n percentage niets |

**Share cards als afbeelding zou ik overslaan.** Het advies stelt een plaatje
voor WhatsApp voor, maar er zit al een knop "Kopieer voor de groepsapp" die
tekst op je klembord zet, en tekst is in een groepsapp beter dan een plaatje:
je kunt erop zoeken, hem quoten, en hij leest ook voor wie op 4G zit. Een
afbeelding maken betekent canvas-rendering, lettertypen inladen en twee thema's
onderhouden, voor iets wat al werkt. Niet doen tenzij iemand er zelf om vraagt.

**Kampioenschapsvoorspelling en favoriete coureur**: puur profiel en branding,
geen punten. Leuk, maar het laagste op deze lijst.

**Herinnering vóór de deadline**: er staat al een agenda-abonnement
(`kalender.ics`), en dat is een herinnering die werkt zonder server, zonder
pushrechten en zonder dat iemand een melding hoeft goed te keuren. Web push zou
ik pas overwegen als blijkt dat mensen die agenda-link niet gebruiken.

---

## ~~Fase 4: de fundering~~ — gedaan wat het waard was

**`index.html` opsplitsen — nagemeten en niet gedaan.** Het bestand is ruim
5000 regels, en het plan was om de vier knip-blokken uit `scripts/knipsel.mjs`
echte modules te maken. De telling voordat ik begon:

| blok | regels | verwijzingen naar `S` |
|---|---|---|
| `primitieven` | 235 | 0 |
| `vragen` | 112 | 1 |
| `zoeken` | 4 | 1 |
| `optellen` | 479 | 54 |

`primitieven` is puur en zou zo te verplaatsen zijn. Maar `optellen` — het
grootste blok, en waar het om gaat — hangt met 54 verwijzingen aan de toestand
van de app. Dat is geen module maken maar de state van de hele app verbouwen,
met bijna vijftig testbestanden die erop leunen.

En alleen `primitieven` verplaatsen geeft het slechtste van twee werelden: de
app is dan geen één bestand meer (wat het hele ontwerp is — geen bouwstap, geen
bundel) én `knipsel.mjs` blijft nodig voor de andere drie.

Het advies dat hier eerst stond geldt nog steeds: doe dit als een fúnctie
moeilijk toe te voegen wordt, niet op een regelaantal. Dat moment is er nog
niet geweest — fase 1 tot en met 4 kwamen er zonder gedoe in.

**Toegankelijkheid nalopen.** Hier staat de app er niet slecht voor: de
puntenkleuren zijn nooit het enige signaal (er staat altijd een getal naast, en
`test/puntenkleuren.test.mjs` bewaakt dat), en er is een licht en een donker
thema. Wat een ronde verdient: contrast op de gedempte tekstkleuren,
toetsenbordbediening van het keuzeblad, en of de aanraakvlakken groot genoeg
zijn.

**Fout-, laad- en legescherm nalopen.** Verspreid door de app zitten deze
toestanden er wel, maar niemand heeft ze ooit naast elkaar gelegd. `uitleg()`
vertaalt inmiddels een rij Postgres-codes naar mensentaal, en er zijn
`.leeg`-blokken voor "niets ingevuld" — maar of elk scherm er één heeft, en of
een trage verbinding iets anders laat zien dan een leeg vlak, is nooit
gecontroleerd. Dit is bij uitstek werk dat je in één ronde doet en daarna nooit
meer, dus het verdient een eigen testbestand dat de drie toestanden per scherm
afloopt.

**PWA- en offlinegedrag testen.** Er is met opzet geen service worker (zie de
overdracht bij "zet op beginscherm": een oude stand tonen alsof hij klopt is
erger dan een foutmelding). Wat wél getest hoort te worden is wat er dan
gebeurt als je de app als app opent zonder verbinding. Nu is dat
waarschijnlijk de offlinepagina van de browser, en die ziet eruit alsof de app
stuk is in plaats van dat je even geen bereik hebt.

---

## Fase 5: als de rest staat

Vijf dingen die genoemd zijn en die geen van alle in de weg zitten. Ze staan
hier omdat ze duur zijn, niet omdat ze slecht zijn.

| | wat het is | wat het echt kost |
|---|---|---|
| ~~**Vorige seizoenen**~~ | *gebouwd, zie hieronder* | |
| ~~**Publieke profielen**~~ | *gebouwd, zie hieronder* | |
| ~~**Push-herinneringen**~~ | *gebouwd, zie hieronder* | |
| ~~**Internationale talen**~~ | *gebouwd, zie hieronder* | |
| **Andere raceklassen** | F2, F3, MotoGP | vastgelopen op de data, niet op de app. De hele sync hangt aan OpenF1, en dat is F1-only. Een andere klasse betekent een tweede databron met een eigen vorm, en daar staat `scripts/sync.mjs` nu niet op ingericht |

Over die laatste: het is het soort punt dat klein klinkt in een lijstje en een
week werk is in de praktijk — en anders dan de andere vier stuit het op iets
buiten deze repo.

### Waarom hier niets van gebouwd is, en dat geen uitstel is

Fase 0 tot en met 4 staan er. Fase 5 niet, en dat is een keuze per punt en
geen tekort aan tijd:

- ~~**Vorige seizoenen**~~ is gebouwd, en juist door die twijfel klein
  gebleven. Er is geen archief met een eigen vorm gekomen: de gegevens stonden
  er al (elke race draagt zijn `season`, elk antwoord hangt aan een race) en
  het enige wat een vorig seizoen onzichtbaar maakte was de filter bij het
  ophalen. Zie "Terugbladeren" hieronder.
- ~~**Publieke profielen**~~ is gebouwd, en juist niet op de manier die de
  deur weer zou openzetten: er gaat geen leesrecht open. Zie "Je seizoen delen"
  hieronder.
- ~~**Push-herinneringen**~~ is gebouwd, en het bezwaar is opgelost in plaats
  van genegeerd: `sw.js` heeft geen `fetch`-handler en cachet niets, dus hij
  kan geen oude stand tonen alsof hij klopt. Zie "Een seintje op je telefoon"
  hieronder.
- ~~**Internationale talen**~~ is gebouwd, en de verbouwing die hier gevreesd
  werd is er niet gekomen: de Nederlandse zin is de sleutel geworden. Zie
  "Nederlands en Engels" hieronder.
- **Andere raceklassen** kán niet: `scripts/sync.mjs` hangt volledig aan
  OpenF1, en dat is F1-only. Dat is een feit over de buitenwereld, geen
  keuze in deze repo.

Wat overblijft is dat ene punt, en het kan niet. Het staat hier zodat de
volgende die dit leest niet opnieuw hoeft uit te zoeken waarom het er niet is.

### Nederlands en Engels

Het bezwaar hierboven was terecht en klopte alleen niet helemaal: de tekst zat
inderdaad in de HTML-sjablonen, maar daar hoefde hij niet uit. **De Nederlandse
zin ís de sleutel.** `T('Wis alles')` zoekt die zin op in `ENGELS` en geeft hem
onvertaald terug als hij er niet in staat.

Dat scheelt precies de verbouwing die de tabel vreesde:

- Er komt geen tweede lijst met sleutels als `wis_alles_knop` die na een half
  jaar niemand meer kan lezen. Wie het sjabloon leest, leest de zin.
- Een vergeten vertaling is geen kapotte knop maar een Nederlandse knop. Het
  slechtste geval is lelijk en zichtbaar, en daarmee repareerbaar.
- De achtenvijftig testbestanden die er al stonden kijken allemaal naar de
  Nederlandse tekst. Die tekst is onaangeroerd, dus ze waren tijdens de hele
  omzetting het vangnet — geen enkele test hoefde mee te veranderen.

De taal komt uit de browser zolang je zelf niets kiest: een toestel dat op
Nederlands staat krijgt Nederlands, al het andere Engels. Kies je zelf, dan
wint dat en blijft het staan (`poule:taal` in localStorage). De knop staat
rechtsboven op het beginscherm en nog eens op je profiel, want wie al in een
poule zit komt op dat beginscherm nooit meer.

`test/talen.test.mjs` bewaakt twee dingen die je met de hand fout doet: de
woordenlijst zelf (geen dubbele sleutels, geen lege vertaling, en elke
`{plaatshouder}` in beide talen) en het tegenovergestelde — of er nog
zichtbare tekst in de sjablonen staat die niet door `T()` gaat. Dat tweede is
de check die een nieuw schermpje betrapt dat iemand later toevoegt.

Wat bewust Nederlands is gebleven: de functienamen, de variabelen en het
commentaar. Die staan in de taal waarin over deze app nagedacht is, en dat
vertalen zou de code veranderen zonder dat één gebruiker er iets van merkt.

### Je seizoen delen

Het bezwaar tegen een publiek profiel was dat het de deur weer openzet die
fase 0 dichtdeed. Dus werkt het andersom: **er gaat geen enkel leesrecht open.**

Je eigen app rekent je cijfers uit — met exact dezelfde functies die de stand
tekenen — en legt dat als één blokje jsonb op je eigen spelersrij. De publieke
pagina leest alleen dat blokje, via `publiek_profiel(code)`: een `security
definer`-functie die niets anders kán teruggeven. Geen naam uit
`pool_members`, geen poule, geen medespelers, geen antwoorden.

Dat lost meteen het tweede probleem op: er is nog steeds maar één plek waar de
punten uitgerekend worden. Een profielpagina die de score in PL/pgSQL nabouwt
zou binnen een half jaar iets anders zeggen dan de stand.

Drie dingen om te weten:

- **Wat erin gaat is karig, en met opzet.** Je naam, je punten, je plek, "van 6
  spelers", je beste weekend en hoe vaak je een coureur precies goed zette. Niet
  hoe de poule heet, niet wie erin zitten. Dat is van hen, niet van jou.
- **`pool_members` heeft nu een kolomgrens.** `profiel_code` is de link naar je
  pagina, en die deel je zelf of niet — ook niet met je medespelers. RLS werkt
  per rij en kan dat onderscheid niet maken; `grant select (kolom, …)` wel. Je
  eigen code krijg je gewoon te zien, want `poule_ophalen()` geeft hem mee en
  die functie gaat als `security definer` langs de grants heen.
- **De pagina is zo vers als jouw laatste bezoek.** De momentopname wordt
  bijgewerkt als je de app opent en er iets veranderd is, hooguit één keer per
  minuut. Dat staat er ook op ("bijgewerkt 3 okt").

### Een seintje op je telefoon

Het bezwaar tegen push was de service worker: zodra die verzoeken onderschept
kan hij een oude versie of een oude stand serveren terwijl de speler denkt dat
het klopt, en dat is erger dan een foutmelding. Dat bezwaar is niet genegeerd
maar weggenomen — `sw.js` heeft **geen `fetch`-handler** en cachet niets. Hij
toont een melding en brengt je naar de app, meer niet.
`test/meldingen.test.mjs` zakt als daar ooit een fetch-handler bij komt.

De andere bezwaren staan er nog, en daarom is dit een aanbod en geen
vervanging:

- Meldingsrecht wordt geweigerd. Dan legt het scherm uit wat er aan de hand is
  en wijst het naar het agenda-abonnement, dat het zonder doet.
- Op iOS werkt het alleen als de app op het beginscherm staat. Dat staat er ook
  bij, vóórdat je op de knop drukt.
- Het staat volledig uit tot iemand een VAPID-sleutelpaar maakt. Zonder
  `VAPID_PUBLIEK` in `index.html` biedt de app het niet eens aan, en zonder het
  secret `VAPID_PRIVE` stuurt de sync niets.

Wat het wél kan en de agenda niet: kijken of jíj nog iets open hebt staan. Een
agenda-item geldt voor iedereen; een melding gaat alleen naar wie zijn top 10
nog niet heeft ingeleverd.

Drie dingen om te weten als je hier verder bouwt:

- **Het rekenwerk is nagerekend, niet vertrouwd.** Web push is drie RFC's, en
  twee ervan leveren een testvector mee. `test/push.test.mjs` draait die
  vectoren; gaat er iets kapot in de sleutelafleiding, dan zakt die test en
  niet pas een telefoon die stil blijft.
- **Geen npm install.** `scripts/push.mjs` gebruikt alleen de ingebouwde
  crypto van Node, om dezelfde reden als de rest van de sync.
- **De regel wie een seintje krijgt staat los** in `scripts/herinneringen.mjs`,
  als functie zonder netwerk erin. Een melding te veel is vervelend, één te
  weinig maakt de functie zinloos, en allebei zie je pas op iemands telefoon.

### Terugbladeren naar een vorig seizoen

Wat er wél gebouwd is, en waarom het zo klein kon blijven.

Een poule hoort bij een seizoen (`pools.season`) en de kalender werd opgehaald
met `.eq('season', …)`. Dat was het hele probleem: de gegevens van vorig jaar
gingen nergens heen, ze werden alleen weggefilterd. Dus haalt de app nu alles
op tot en met het seizoen dat de poule speelt (`.lte`), houdt dat in
`S.alleRaces`, en is `S.races` de snede waar je nu naar kijkt. De rest van het
bestand loopt nog steeds over `S.races` en hoeft van het terugbladeren niets
te weten.

Drie keuzes die daarbij gemaakt zijn:

- **De keuzelijst staat in de pagina, niet in de kop.** Op een telefoon staat
  `.kop` op `display:none` en heeft elke pagina zijn eigen titel. Iets wat je
  moet kunnen bedienen hoort dus in de pagina zelf — hier boven de kalender en
  boven de stand.
- **Doorschuiven kan pas als het seizoen erop zit.** Zolang er nog een race te
  rijden valt zou doorschuiven betekenen dat die nergens meer te zien is.
- **De vragenset gaat mee en blijft op slot.** Een nieuw seizoen zou een
  natuurlijk moment zijn om de vragen te herzien, maar `pool_questions` kent
  geen seizoen: een andere set zou de stand van vorig jaar met terugwerkende
  kracht veranderen. Wie echt andere vragen wil maakt een nieuwe poule aan. Wil
  je dat ooit wél, dan is de weg: een `season`-kolom op `pool_questions` en
  `vraagActief()` het seizoen van de race meegeven in plaats van dat van de
  poule.

---

## En dan nog dit, uit groep 4 — inmiddels alle vier gebouwd

Vier punten die er lang lagen en die geen van alle in het nieuwe plan
voorkwamen:

| | wat het is | de haak eraan |
|---|---|---|
| ~~Contrair-multiplier~~ | *gebouwd, zie hierboven* | |
| ~~Jokers~~ | *gebouwd, zie hierboven* | |
| ~~Seizoenslaag~~ | *gebouwd, zie hierboven* | |
| ~~Sprintweekenden~~ | *gebouwd, zie hieronder* | |

Ze raken alle vier de telling. Dat is de reden dat ze hier stonden en niet
gebouwd waren: midden in een lopend seizoen de puntentelling omgooien is geen
verbetering, ook niet als de nieuwe regel op zichzelf beter is. Kijk hoe de twee
die er al waren dat hebben opgelost: "slechtste twee races" staat náást de stand
in plaats van erin, en "automatisch invullen" geldt alleen vanaf het moment dat
de poulebaas hem aanzet. Alle vier beantwoorden die vraag nu, en op twee
manieren: de sprint en de seizoenslaag ontweken hem (het zijn vragen, dus een
lopende poule krijgt ze niet), de jokers en contrair kregen dezelfde streep als
automatisch invullen.

De sprint en de seizoenslaag konden het ontwijken — het zijn vragen, en een
poule kiest zijn vragen bij het aanmaken, dus een lopende poule krijgt ze
simpelweg niet. De jokers en de contrair-multiplier konden dat niet, want dat
zijn geen vragen maar regels over de telling zelf. Die hebben daarom dezelfde
streep gekregen als automatisch invullen: `pools.jokers_vanaf` en
`pools.contrair_vanaf` bewaren wanneer ze aangingen, en een weekend dat toen al
liep telt niet mee. Vier van die momenten staan er nu naast elkaar op de
poulepagina, en dat is met opzet één patroon: wie er een vijfde bij bouwt weet
hoe het hoort.

### De seizoenslaag

Vier vragen op `sessie = 'seizoen'`. Wat daarbij te weten valt:

- **Ze hangen aan ronde 1.** De antwoorden gaan in `answers` met de `race_id`
  van de eerste race van dat seizoen. Dat is geen truc om ze ergens kwijt te
  kunnen: het is precies de deadline die ze nodig hebben. De trigger
  `poule_antwoord_deadline()` heeft een eigen tak die voor `'seizoen'` de
  vroegste sessie van dat weekend pakt, dus "voordat er iets gereden is".
- **De uitslag komt uit de races zelf.** `wkStand()` telt het echte
  WK-puntenschema op over alle races van het seizoen, sprintpunten inbegrepen
  (8-7-6-5-4-3-2-1). Daaruit rollen de kampioen, de constructeurstitel en het
  vierde team. Het aantal verschillende winnaars is een `Set` over
  `race_result[0]`.
- **Gescoord wordt er pas als het seizoen erop zit.** Een halve WK-stand is
  geen kampioen, en een tussenstand tonen zou suggereren dat het al vastligt.
- **Alleen in de volledige stand.** `standRijen(tot)` wordt ook gebruikt om de
  stand van vóór een weekend na te rekenen (voor de pijlen omhoog en omlaag);
  daar hoort een eindstand niet in thuis.

### Jokers, en waarom er vijf zijn en niet per vraag

Het punt hierboven zei "niet twee keer op dezelfde vraag", en dat is bewust
anders geworden: **één joker per weekend, niet per vraag.** Die regel bestond om
te voorkomen dat iedereen zijn jokers automatisch op de race-top-10 legt. Met
een joker per weekend bestaat dat probleem niet — je kiest wélk weekend, en dat
is de keuze. Per vraag doubleren zou bovendien betekenen dat elke puntenregel
in de app een sterretje krijgt; nu staat de verdubbeling op één plek, in
`scoreWeekend()`, en komt hij vanzelf terecht in de stand, de weekendwinst, de
grafiek en de terugblik zonder dat die vier hem apart hoeven te kennen.

Twee dingen om te weten als je hier verder bouwt:

- **De regel staat in de database**, niet in het scherm: trigger
  `jokers_bewaken` in `schema.sql`. Dat is naast de deadline op `answers` de
  tweede regel die daar hard in zit, en om dezelfde reden.
- **Een cascade is geen speler die van gedachten verandert.** De trigger laat
  een delete door zodra `pg_trigger_depth() > 1`. Zonder die uitzondering liep
  "verwijder mijn account" vast op een joker die op een gereden weekend lag, en
  dat is precies het soort deur dat niet op slot hoort te zitten.

### Sprintweekenden, en waarom die er nu wel zijn

De sprint kon dit probleem omzeilen, en dat is de enige reden dat hij er als
eerste van de vier uit is. Een poule kiest bij het aanmaken welke vragen ze
stelt, en die set gaat op slot zodra de eerste race gescoord is. Een poule die
nu loopt heeft `sprint_top10` dus domweg niet in zijn lijst staan en merkt er
niets van; een poule die na dit seizoen wordt aangemaakt kan hem aanzetten. De
telling van een lopende poule verandert nergens — geen streep nodig, geen
knop, geen "vanaf nu".

Wat het wél kostte was de tweedeling. De app was rond precies twee sessies
gebouwd: veertien keer stond er ergens `welk === 'quali' ? r.quali_result :
r.race_result`, en drie keer een handgeschreven `{ quali: ..., race: ... }`.
Zo'n object zegt `undefined` over een sessie die het niet kent, en `undefined`
is niet dicht — een sprint zou dus ná zijn eigen deadline nog invulbaar zijn
geweest. Dat is eerst in één tabel (`SESSIES`) getrokken, in een eigen commit
zonder gedragsverandering, en pas daarna kwam de sprint erbij.

Drie dingen om te weten als je hier verder bouwt:

- **De sprint gaat vóór de kwalificatie.** De sprintkwalificatie ligt op
  vrijdag en de sprint zaterdagochtend; de gewone kwalificatie is zaterdag ná
  de sprint. `SESSIEVOLGORDE` staat daarom op `['sprint', 'quali', 'race']`, en
  `openLijst()` kijkt naar de klok en niet naar die lijst.
- **Halve punten zitten in `SESSIES.sprint.weging`**, niet in het puntenaantal
  van de vraag. Dezelfde top 10, dezelfde 5/3/1 per plek, maal 0,5.
- **"Maximaal per weekend" laat de sprint erbuiten.** Hij bestaat op zes van de
  vierentwintig weekenden; meetellen zet het maximum achttien keer per seizoen
  te hoog. Hij wordt eronder apart genoemd. Zie `weekendSom()` en `sprintSom()`.
- **Automatisch invullen slaat de sprint over.** Die regel bestaat om een
  gemist weekend niet je seizoen te laten kosten, en een sprint is daar geen
  onderdeel van.

---

## De volgorde in één blik

| fase | wat | waarom daar |
|---|---|---|
| ~~0~~ | ~~RLS dichtzetten~~ — **gebouwd**, zie `OVERDRACHT.md` | het enige dat een publieke launch tegenhield |
| ~~1~~ | ~~RacePicks: naam, icoon~~ — **gebouwd**; alleen het domein is nog van jou | vóórdat mensen "Poule" op hun beginscherm zetten |
| ~~2~~ | ~~racescherm wordt dashboard~~ — **gebouwd** | grootste winst per uur werk, data is er al |
| ~~3~~ | ~~positiewijziging, reeksen, grafiek~~ — **gebouwd**; recap en profielstatistieken bewust niet, zie `OVERDRACHT.md` | rekenwerk over wat er al ligt |
| ~~4~~ | ~~toegankelijkheid, offlinescherm~~ — **gebouwd**; opsplitsen nagemeten en niet gedaan | onderhoud, als er geen haast is |
| 5 | ~~vorige seizoenen~~, ~~push~~, ~~publieke profielen~~ en ~~talen~~ — **gebouwd**; andere klassen bewust niet | andere klassen kan niet (OpenF1 is F1-only) |

Fase 0 tot en met 4 zijn gebouwd, en uit fase 5 "vorige seizoenen",
"push-herinneringen", "publieke profielen" en "internationale talen". Er blijft
één punt over, en dat staat er niet als "nog niet aan toegekomen": andere
raceklassen stuit op OpenF1, niet op deze repo — zie de reden hierboven.

Groep 4 is leeg: ~~sprintweekenden~~, ~~jokers~~, ~~seizoenslaag~~ en de
~~contrair-multiplier~~ zijn alle vier gebouwd.

**Fase 0 staat ook echt live**, en dat is iets anders dan gemerged. Op
21 september is `schema.sql` tegen de productiedatabase gedraaid en nagemeten:
vier functies aanwezig, nul leespolicies nog op `using (true)`. De app die
erbij hoort staat sinds dezelfde dag op GitHub Pages. Het gat waarmee je met
de publieke anon key élke poule kon uitlezen is dus dicht waar het telt.

Wil je dat opnieuw controleren — na een `reset.sql`, of op een tweede
project — dan is dit de vraag:

```sql
select 'fase 0 functies (hoort 4)' as controle,
       count(*)::text || ' van 4' as uitkomst
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('poule_ophalen','poule_meedoen','poule_aanmaken','poule_claim_speler')
union all
select 'leespolicies nog op iedereen (hoort 0)', count(*)::text
  from pg_policies
 where schemaname = 'public'
   and tablename in ('pools','pool_members','answers','pool_questions')
   and cmd = 'SELECT' and qual = 'true'
order by 1;
```

Die is bewust zo geschreven dat hij het ook fóút kan zeggen: op een database
van vóór fase 0 geeft hij `0 van 4` en `4`. Een controle die altijd "ok"
antwoordt is geen controle.

Wat er aan jouw kant nog ligt: een naam en een domein kiezen en live zetten
(de instellingen staan bovenaan dit bestand), en `leegmaken.sql` draaien
wanneer je die schone start wilt.
