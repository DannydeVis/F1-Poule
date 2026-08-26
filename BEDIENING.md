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
poulebaas staat hier ook het beheergedeelte: welke vragen meedoen, en
handmatig een uitslag invoeren als OpenF1 het laat afweten.

---

## 3. Poule aanmaken: vier stappen

Eén vraag per scherm. Werkt beter op een telefoon dan een lang formulier.

### Stap 1: Hoe heet de poule
Eén invoerveld. Voorbeeld eronder als hint: "Vrijdagmiddagpoule".

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

---

## 5. Startscherm bij binnenkomst

De app onthoudt in `localStorage` in welke poules je zit. Bij binnenkomst:

- **Nul poules bekend**: keuze tussen meedoen en aanmaken, met meedoen bovenaan
  (dat is verreweg het vaakste geval)
- **Eén poule bekend**: direct naar de Races-tab van die poule
- **Meerdere poules bekend**: korte lijst om uit te kiezen

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
alleen aan die speler.

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
