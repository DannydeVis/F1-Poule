# F1 Poule: wat er nog bij kan

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

## Op de rol: het eigen domein racepicks.com

Nog niet nu, wel binnenkort. Zodra racepicks.com er is:

- **Google Cloud** (Google Auth Platform → Clients): `https://racepicks.com`
  toevoegen als Authorized JavaScript origin, en
  `https://etifamdwqxjfaeaordlr.supabase.co/auth/v1/callback` staat er al
  goed (die verandert niet — dat is Supabase's adres, niet dat van de app).
  De oude GitHub Pages-origin mag erbij blijven staan zolang die nog gebruikt
  wordt.
- **Supabase** (Authentication → URL Configuration): Site URL naar
  `https://racepicks.com`, en `https://racepicks.com/**` toevoegen aan
  Redirect URLs. De oude GitHub Pages-regel pas weghalen als niemand die
  link meer gebruikt.
- **GitHub Pages**: een `CNAME`-bestand met `racepicks.com` erin, plus een
  DNS-record bij de domeinregistrar die naar GitHub Pages wijst.
- De app zelf hoeft niet aangepast: `linkBasis()` leest `location.origin`
  dynamisch uit, dus uitnodigingslinks en OAuth-redirects werken vanzelf op
  elk domein waar de app draait.
- **Eigen SMTP met racepicks.com-adres.** Nu staat er in elke mail (magic
  link, mailkoppeling) een afzenderadres van Supabase zelf
  (`noreply@mail.app.supabase.io`) — dat kan pas veranderen naar iets met
  `racepicks.com` erin zodra dat domein bestaat én er een mailserver aan
  gekoppeld wordt (Supabase → Authentication → Settings → SMTP). De
  zichtbare *tekst* in de mail (onderwerp, inhoud) is trouwens nu al vrij
  aan te passen via Authentication → Emails → sjablonen, zonder dat
  daarvoor het domein nodig is.

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

### Contrair-multiplier
Punten schalen met hoe zeldzaam je antwoord was binnen de poule:
`min(1 + (1 - aandeel), 2.0)`. Iedereen dezelfde gok is 1x, in je eentje goed
gokken bijna 2x.

Lost het probleem op dat "wie wint" nul verschil maakt als iedereen dezelfde
naam invult. Corrigeert zichzelf als één team het seizoen domineert.

### Jokers
Vijf per seizoen, niet twee keer op dezelfde vraag. Maakt het een strategische
keuze in plaats van een automatisme.

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

### Seizoenslaag
Vragen die je vóór race 1 invult en aan het eind scoort: wereldkampioen,
constructeurstitel, aantal verschillende winnaars, welk team wordt vierde. Rond
de 150 punten in totaal, dus zes races aan gewicht.

### Sprintweekenden
Sprints hebben een eigen sessie via `session_name = 'Sprint'`. Alle resolvers
werken ongewijzigd op een andere `session_key`. Verkorte set op halve punten.

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
deze lijst aangepakt. Wat rest is dit:

| | wat het is | de haak eraan |
|---|---|---|
| Contrair-multiplier | punten schalen met hoe zeldzaam je antwoord was | verandert wat een punt waard is |
| Jokers | vijf per seizoen, dubbele punten | nieuwe keuze per race, dus nieuw scherm |
| Seizoenslaag | vragen vóór race 1, gescoord aan het eind | hoort aan het begin van een seizoen te beginnen |
| Sprintweekenden | de sprint als eigen sessie meetellen | de sync pakt nu alleen `session_name=Race` en `Qualifying` |

Alle vier raken de telling. Dat is de reden dat ze hier nog staan en niet
gebouwd zijn: midden in een lopend seizoen de puntentelling omgooien is geen
verbetering, ook niet als de nieuwe regel op zichzelf beter is. Kijk hoe de twee die er
wél zijn dat hebben opgelost: "slechtste twee races" staat náást de stand in
plaats van erin, en "automatisch invullen" geldt alleen vanaf het moment dat de
poulebaas hem aanzet. Wie hieraan begint beantwoordt die vraag dus eerst: geldt
dit vanaf nu, of met terugwerkende kracht over races die al gereden zijn?
