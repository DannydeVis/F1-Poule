# F1 Poule: bediening en schermindeling

Ontwerp voor de navigatie en het aanmaakproces. Hoort bij `ROUTEKAART.md`.

---

## 1. Wat er eerst moet gebeuren

Vinkjes bij het aanmaken vragen om een `questions`-tabel met een rij per
vraag, in plaats van vaste kolommen `quali_top10` en `race_top10`.

**Doe die migratie nu.** Er is nog geen seizoen aan echte voorspellingen om
over te zetten. Over tien races is dezelfde wijziging een stuk vervelender.

Bundel het met minstens vier extra vragen, anders toont het keuzescherm twee
vinkjes en heeft het geen zin:

- Winnaar (25 punten)
- Pole (10 punten)
- Aantal safety cars (12 punten, tolerantie)
- Rode vlag ja/nee (20 als het gebeurt, 3 als het niet gebeurt)

---

## 2. Navigatie: vaste balk onderin

De huidige opzet stapelt schermen met een Terug-knop. Dat houdt op zodra
weekendwinnaars, duels en handmatige invoer erbij komen.

Drie tabs, vast onderin beeld:

```
┌─────────────────────────────────────┐
│                                     │
│           schermruimte              │
│                                     │
├─────────────────────────────────────┤
│   Races      Stand       Poule      │
└─────────────────────────────────────┘
```

### Races
De lijst met raceweekenden, dit is het startscherm. Per race zichtbaar of hij
open is, wacht op de uitslag, of gescoord is. Tik erop en je komt in het
invulscherm of het uitslagscherm.

Bovenaan een strook met wat er nu speelt: "Kwalificatie sluit zaterdag 16:00,
Davy heeft nog niks ingevuld."

### Stand
Drie onderdelen op één scherm, gescheiden door koppen:
- Seizoensstand
- Weekendoverwinningen (wie won de meeste losse weekenden)
- Onderlinge duels (jij tegen elke andere speler)

Bovenaan de knop **Kopieer voor WhatsApp**.

### Poule
Leden, poulecode, uitnodiglink met deelknop, en de instellingen. Voor de
poulebaas staat hier ook het beheergedeelte: welke vragen meedoen, de
omschrijving van de poule, en handmatig een uitslag invoeren als OpenF1 het
laat afweten. Verder je eigen link (zie §4) en, onderaan, je andere poules om
naar over te stappen.

---

## 3. Poule aanmaken: vier stappen

Eén vraag per scherm. Werkt beter op een telefoon dan een lang formulier.

### Stap 1: Hoe heet de poule
Twee velden: de naam, met "Vrijdagmiddagpoule" als voorbeeld eronder, en een
omschrijving die leeg mag blijven ("Met de collega's, 5 euro inleg"). Die
omschrijving is er voor wie in meer dan één poule zit: twee poules die allebei
"Poule 2026" heten zijn uit elkaar te houden aan waar ze over gaan. Hij staat
onder de naam en in het lijstje waarmee je tussen poules wisselt, en de
poulebaas kan hem later aanpassen onder Poule.

### Stap 2: Hoe heet jij
Je wordt meteen het eerste lid, en de eigenaar van de poule.

### Stap 3: Wat gaan jullie voorspellen

Drie knoppen, groot en tikbaar:

| Preset | Bevat | Punten per weekend |
|---|---|---|
| **Simpel** | Top 10 kwalificatie, top 10 race | 100 |
| **Klassiek** | + winnaar, pole, snelste ronde | 145 |
| **Gevorderd** | + safety cars, rode vlag, snelste pitstop, teamgenoot-duels | ongeveer 200 |

Daaronder een regel **Zelf samenstellen**, die pas een lijst met vinkjes
openklapt als je erop tikt. Bij elk vinkje staat het aantal punten, en
onderaan telt hij live op: "Maximaal 178 punten per weekend."

Standaard staat **Klassiek** geselecteerd. Wie doorklikt zonder na te denken
krijgt daarmee iets dat leuker is dan alleen twee top-tienen, zonder overweldigd
te worden.

### Stap 4: Klaar, nodig je vrienden uit
Toont de poulecode groot, plus een deelknop met de uitnodiglink erin:

```
https://dannydevis.github.io/F1-Poule/?code=10D4FD
```

Wie die link opent slaat het codescherm over en komt direct bij "hoe heet jij".

---

## 4. Meedoen met een poule

Twee routes:

**Via de uitnodiglink** (`?code=...`): direct naar "hoe heet jij", geen code
intypen. Dit wordt de standaardroute, want zo deel je hem in de groepsapp.

**Via de code**: invoerveld op het startscherm voor wie de link kwijt is.

Daarna in beide gevallen: kies jezelf uit de lijst als je er al in staat, of
maak jezelf aan als nieuwe speler.

**Via je eigen link** (`?code=...&speler=...`): voor jezelf, niet om te delen.
De app weet alleen per toestel wie je bent, dus wie op zijn telefoon én op zijn
laptop meedoet maakt zichzelf twee keer aan en ziet zijn punten over twee
spelers verdeeld. Deze link zet je op het tweede toestel meteen als dezelfde
speler neer. Hij staat onder Poule, met de waarschuwing erbij: wie hem heeft
speelt onder jouw naam.

Staat de speler uit de link niet (meer) in de poule, dan gedraagt hij zich als
een gewone uitnodiging en kom je op "wie ben jij?" uit. Een foutmelding over
een id dat niemand herkent helpt niemand.

---

## 5. Startscherm bij binnenkomst

De app onthoudt in `localStorage` in welke poules je zit. Bij binnenkomst:

- **Nul poules bekend**: keuze tussen meedoen en aanmaken, met meedoen bovenaan
  (dat is verreweg het vaakste geval)
- **Eén of meer poules bekend**: direct naar de Races-tab van de poule die je
  het laatst gebruikte

Dat laatste wijkt af van het oorspronkelijke plan, waarin je bij meer dan één
poule eerst een lijstje kreeg. In de praktijk speel je vrijwel altijd in
dezelfde poule verder, en dan is een keuzescherm ertussen een extra tik. Het
lijstje staat er wel, op de twee plekken waar je het nodig hebt: onderaan de
Poule-tab ("jouw andere poules"), en op het startscherm zodra je op **Andere
poule** hebt gedrukt.

Wisselen haalt de poule opnieuw uit de database op in plaats van uit het
lijstje: de naam of de omschrijving kan veranderd zijn, en een poule die
verwijderd is hoort uit het lijstje te verdwijnen in plaats van je op een leeg
scherm te zetten.

Let op wat dit lijstje **niet** is: het staat in `localStorage`, dus het is per
toestel. Wie op zijn telefoon én op zijn laptop speelt heeft twee lijstjes. Eén
lijst over al je toestellen vraagt om een login; zie OVERDRACHT.md.

---

## 6. De vragenset op slot

Zodra de eerste race van het seizoen gescoord is, worden de vinkjes in
Poule → beheer alleen-lezen, met een regel eronder:

> De vragenset ligt vast sinds Melbourne. Zo blijven alle races vergelijkbaar.

Technisch: een veld `questions_locked` op de poule, gezet door de scoringslogica
zodra de eerste race een uitslag krijgt.

---

## 7. Wie mag wat

Zonder login kan de database niet controleren wie de poulebaas is. Praktische
oplossing: sla `owner_member_id` op bij de poule, en toon het beheergedeelte
alleen aan die speler. Dat geldt voor de vragenset én voor de omschrijving.

Wees eerlijk over wat dat is: dit voorkomt ongelukken, geen kwaadwilligheid.
Iemand die de anon key uit de broncode plukt kan er alsnog omheen. Voor een
vriendenpoule is dat prima, maar bouw er geen dingen op die echt beschermd
moeten zijn.

---

## 8. Waar je op moet letten bij de vrije selectie

Als spelers zelf mogen samenstellen, kiest iemand vroeg of laat alleen de
gokvragen (rode vlag, regen, safety cars) omdat die het hoogst scoren per stuk.
Dan wint de gelukkigste in plaats van degene die de sport volgt.

Ingebouwde rem: toon onder de lijst een waarschuwing zodra de gokvragen samen
boven de 30% van het maximum uitkomen.

> Let op: meer dan een derde van de punten hangt nu van geluk af. Overweeg er
> een paar uit te zetten.

Blokkeer het niet, alleen een melding. Het is hun poule.

---

## 9. Volgorde van bouwen

1. Migratie naar de `questions`-tabel, met de vier extra vragen erbij
2. Tabbalk onderin, bestaande schermen erin hangen
3. Aanmaakproces in vier stappen, met de presets
4. Uitnodiglink met `?code=`
5. Beheergedeelte onder Poule, inclusief handmatige uitslaginvoer

Stap 1 en 2 zijn los van elkaar te doen en raken elkaar nauwelijks. Stap 3 heeft
stap 1 nodig.
