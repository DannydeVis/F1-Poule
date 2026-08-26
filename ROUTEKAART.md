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

### Uitnodigingslink met de code erin
`https://dannydevis.github.io/F1-Poule/?code=10D4FD` en de app vult de
poulecode automatisch in. Scheelt je vrienden een stap en een typefout.

### Handmatig een uitslag invullen in de app
Je bent al twee keer tegen ontbrekende OpenF1-data aangelopen en moest toen de
Supabase Table Editor in. Een simpel schermpje waarin je de volgorde van
coureurs kunt slepen en opslaan lost dat voorgoed op. Zet er een vinkje
"handmatig ingevuld" bij zodat je later ziet welke uitslagen niet uit de API
komen.

---

## Groep 2: maakt het leuker om terug te komen

### Onderlinge duels
"Jij tegen Davy dit seizoen: 8 tegen 6." Per raceweekend wie van twee spelers
meer punten pakte, opgeteld over het seizoen. Puur een berekening over data die
je al hebt.

Dit is waar mensen elkaar in de groepsapp op aanspreken, veel meer dan op de
totaalstand.

### Bijna-goed terugkoppeling
Na de race: "Was Norris P4 geworden in plaats van P5, dan had je 8 punten meer
gehad." Cheap uit te rekenen, en precies het soort ding dat gesprek oplevert.

### Je persoonlijke blinde vlek
Over een heel seizoen aan voorspellingen: "Je zet Verstappen gemiddeld 2
plekken te laag" of "Je bent het scherpst op het middenveld, P7 tot P10 heb je
vaker goed dan de rest van de poule."

Dit soort inzicht bestaat alleen omdat jij alle historische voorspellingen
bewaart. Geen enkele standaard poule-app heeft dit, en het is niet meer dan een
gemiddelde over bestaande rijen.

### Moeilijkste race van het seizoen
Toon per race het gemiddelde aantal punten van de hele poule. Zo zie je welk
weekend iedereen verrastte. Leuk voor de terugblik in december.

---

## Groep 3: extra vraagsoorten

Pas hieraan beginnen als groep 1 en 2 staan. En dan niet alles, maar hooguit
vier of vijf.

### De beste vier, wat mij betreft

| Vraag | Waarom deze |
|---|---|
| **Winnaar apart, 25 punten** | Meest gevraagde toevoeging, één extra kolom |
| **Teamgenoot-duels** | Bijna 50/50, dus de poule splitst zich altijd. Beste verhouding tussen spreiding en kennis van alle vraagsoorten |
| **Aantal safety cars** | Hard te tellen, geen discussie over de uitslag |
| **Rode vlag ja/nee** | Simpel, en een goed gevoel als je hem goed hebt |

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

### Slechtste twee races vallen weg
Bij 24 races tellen de beste 22. Vangt één vakantie en één ramprace op.

### Automatisch invullen bij vergeten
Wie niks inlevert krijgt de huidige WK-stand als top 10, gemarkeerd als
"automatisch". Houdt iemand die twee races mist in de race.

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
4. Handmatige uitslag-invoer
5. Onderlinge duels
6. Winnaar als aparte vraag
7. Uitnodigingslink met code

Punt 1 tot en met 3 samen zijn waarschijnlijk een avond werk en hebben meer
effect op of je poule het seizoen haalt dan de hele rest van deze lijst bij
elkaar. Die drie staan er nu in; zie `OVERDRACHT.md` voor hoe ze werken.
Punt 4 is de eerstvolgende, en de enige op deze lijst die de app iets naar
de database laat schrijven wat er nu nog niet in gaat.
