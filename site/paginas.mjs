// De losse pagina's naast de voorpagina: gidsen, de about-pagina, en later een
// vergelijkingspagina. Alles wat scripts/maak-site.mjs nodig heeft om er een
// pagina van te maken staat hier; een nieuwe pagina toevoegen is data invullen,
// geen HTML kopiëren.
//
// Eén item per onderwerp. Het id is gelijk over alle talen: dat is het
// hreflang-cluster. Een taal die er niet is, staat er niet in, en krijgt dus
// ook geen link in het taalmenu of in de hreflang.
//
// Per taal:
//   pad            de map, zonder slash aan het begin of eind
//   titel          30 tot 65 tekens, de zoekterm vooraan (test/site.test.mjs)
//   omschrijving   110 tot 165 tekens
//   kop            de h1
//   kort           het korte antwoord bovenaan: eerst het antwoord, geen inleiding
//   teaser         de linktekst op de voorpagina van die taal
//   secties        { id, vraag, kort, tekst?, stappen?, tabel?, rekenvoorbeeld?,
//                    voorbeeld?, vragentabel?, formules?, punten?, lijst? }
//                  vraag wordt een h2, kort de eerste alinea eronder
//                  Elk kort antwoord (ook dat bovenaan): het antwoord in de
//                  eerste zin, 25 tot 80 woorden, het onderwerp bij naam, niet
//                  beginnen met een verwijswoord (Dit, Deze, This, That...),
//                  geen HTML. Zo kan hij los overgenomen worden
//                  (test/antwoordvorm.test.mjs).
//   tabel          { bijschrift, kop, rijen }: de eerste cel van elke rij wordt
//                  een th, het bijschrift de caption (verplicht)
//   faq            [vraag, antwoord], alleen vragen die niet al op de voorpagina staan
//   leesOok        [anker op de voorpagina, linktekst]
//
// Per pagina, voor alle talen samen:
//   soort          'gids' (onder "Gidsen" in de voet, met een teaser op de
//                  voorpagina) of 'over' (de about-pagina: een AboutPage in de
//                  JSON-LD, een link in de voet en bij de naam van de maker)
//   verwant        de ids van de gidsen die onder "Lees ook" komen
//   teaserPlek     onder welk blok van de voorpagina de link staat: 'hoe'
//                  (standaard, onder de stappen) of 'punten' (onder de puntentabel)
//   rekenvoorbeeld { voorspeld: tien coureurs, uitslag: de uitslag op volgorde }.
//                  Een sectie met rekenvoorbeeld: { bijschrift, kop, geenPlek, totaal } toont
//                  het als tabel, uitgerekend door scoreLijst() uit de app, en
//                  {voorbeeldTotaal}, {voorbeeldExact} en {voorbeeldDichtbij}
//                  komen daar ook uit. Wie niet in de uitslag staat, kreeg geen plek.
//
// In een sectie:
//   vragentabel    true: de losse vragen en de seizoensvragen met hun punten,
//                  zoals op de voorpagina (namen uit site/teksten.mjs)
//   formules       [wat, formule]: formules voor een spreadsheet, als code
//   circuittabel   { bijschrift, kop }: per circuit de races, de safety cars en
//                  de races met een rode vlag, uit site/data/circuits.json (de
//                  workflow "Circuitcijfers", zoekplan GEO 3.2). De cijfers
//                  zelf staan in de tekst als {scRaces}, {scMet}, {rvMet},
//                  {scGemiddeld}, {scTot} enzovoort (circuitFeiten() in maak-site.mjs).
//
// Getallen over de app (punten, aantal vragen, jokers, meldingen) staan er als
// {naam} in en komen bij het maken uit de app zelf (APP_GETALLEN en
// feitenVoor() in maak-site.mjs; de spreadsheetformule als {formuleNL} en
// {formuleEN}). Nooit overtypen: verandert de app, dan verandert de pagina mee.
// Een getal dat bewust niet uit de app komt, schrijf je als {=25}.
//
// Schrijfregels uit het zoekplan: het antwoord eerst, geen en-dash of em-dash,
// en Nederlands en Engels elk zelf geschreven, niet de een uit de ander
// vertaald. Danny leest beide voordat ze online gaan.
//
// Sinds 13 oktober staan organiseren en puntentelling ook in het Duits, Frans,
// Spaans, Italiaans en Portugees: naar het Engels, met de woorden van de
// voorpagina en de app in die taal (Tipprunde, ligue, porra, lega, bolão; de
// namen van de niveaus; Joker, jolly, comodín, coringa). De ids van de secties
// zijn per taal; safety-cars is overal hetzelfde, daar linken de racepagina's
// naartoe. Een moedertaalspreker die meeleest blijft welkom.

export const PAGINAS = [
  {
    id: 'organiseren',
    soort: 'gids',
    verwant: ['puntentelling', 'excel'],
    talen: {
      nl: {
        pad: 'f1-poule-organiseren',
        titel: 'F1-poule organiseren in 5 minuten | Predict the Race',
        omschrijving: 'Zo zet je een F1-poule op met vrienden of collega\'s: de vier stappen, de keuzes die ertoe doen en de drie valkuilen waardoor een poule halverwege stilvalt.',
        kop: 'Een F1-poule organiseren',
        kort: 'Een F1-poule zet je in vijf minuten op: geef hem een naam, kies hoeveel vragen er meetellen en deel de code in de groepsapp. Het seizoen doorkomen is het lastige deel. Een poule valt stil als iemand onbereikbaar achter raakt, als mensen vergeten in te vullen, of als er na de race niets te bespreken is.',
        teaser: 'Alles over een poule opzetten: de keuzes en de valkuilen',
        secties: [
          {
            id: 'opzetten',
            vraag: 'Hoe zet je een F1-poule op?',
            kort: 'Een F1-poule zet je in vier stappen op: geef hem een naam, vul je eigen naam in, kies hoeveel er te voorspellen valt en deel de code in de groepsapp. Daarna hoeft de poulebaas niets meer bij te houden, want de kalender, de coureurs en de uitslagen komen vanzelf binnen.',
            stappen: [
              'Geef de poule een naam. Die staat in de app en in de uitnodiging. Zit iemand in meer dan één poule, dan helpt een korte omschrijving erbij, zoals "met de collega\'s, om de eer".',
              'Vul je eigen naam in. Je bent meteen de eerste speler en de poulebaas: jij kiest de vragen en de spelregels.',
              'Kies hoeveel er te voorspellen valt: Simpel, Klassiek of Gevorderd, of stel zelf samen welke vragen meetellen.',
              'Deel de uitnodigingslink of de code van zes tekens in de groepsapp. Wie hem opent, kiest een naam en doet mee, zonder account en zonder wachtwoord.',
            ],
            tekst: [
              'Daarna gaat het vanzelf. De kalender en de coureurs staan er al, en na elke kwalificatie en race komt de officiële uitslag binnen en rekent de app de punten uit. Niemand hoeft iets over te typen.',
              'Doe het ruim voor de eerste race. Tot die gereden is kun je de vragen nog aanpassen; daarna ligt de set vast, zodat elk weekend met dezelfde regels telt.',
            ],
          },
          {
            id: 'vragen',
            vraag: 'Hoeveel vragen laat je meetellen?',
            kort: 'Laat zo veel vragen meetellen als je groep volhoudt. De twee top 10\'s per weekend, van de kwalificatie en de race, zijn genoeg voor een fanatieke poule. Wie meer wil, kiest Klassiek met de sprint, de winnaar, de pole position en de snelste ronde erbij, of Gevorderd met alle {nGevorderd} vragen.',
            tabel: {
              bijschrift: 'De drie niveaus van Predict the Race',
              kop: ['Niveau', 'Vragen', 'Punten per weekend'],
              rijen: [
                ['Simpel', '{nSimpel}', '{simpel}'],
                ['Klassiek', '{nKlassiek}', '{klassiek}, plus sprint'],
                ['Gevorderd', '{nGevorderd}', '{gevorderd}, plus sprint en seizoen'],
              ],
            },
            tekst: [
              'Simpel is alleen de twee top 10\'s. Gevorderd zet alles aan, van snelste pitstop en teamgenoot-duels tot het aantal safety cars en een rode vlag.',
              'Meer vragen betekent meer te winnen, maar ook langer invullen. In een groep waar de helft pas op zaterdagochtend aan de kwalificatie denkt, houdt Simpel het langer vol dan Gevorderd.',
            ],
          },
          {
            id: 'jokers',
            vraag: 'Speel je met jokers?',
            kort: 'Ja, als je wilt dat wie achter staat iets heeft om op te hopen. Met een joker tellen al je punten van één raceweekend dubbel. Staan jokers aan, dan heeft iedereen er standaard {jokers} per seizoen; als poulebaas kies je er 1 tot {jokersMax}, of je laat ze uit.',
            tekst: [
              'Je zet een joker voordat het weekend begint, daarna ligt hij vast. Zo wordt elk weekend een kleine gok: is dit het circuit waar jij het beter weet dan de rest?',
            ],
          },
          {
            id: 'valkuilen',
            vraag: 'Waar loopt een F1-poule op stuk?',
            kort: 'Een F1-poule loopt zelden op de vragen stuk. Bijna altijd is het een van drie dingen: een achterstand die niet meer in te halen is, spelers die vergeten in te vullen, of niets om na de race over te praten. Tegen elk daarvan helpt iets anders: meer te winnen dan de eindstand, herinneringen voor de deadline, en elk weekend iets om te laten zien.',
            punten: [
              ['Een onbereikbare achterstand', 'Wie na acht races ver achter staat, haakt af. Geef daarom meer te winnen dan alleen de eindstand: de weekendwinnaar (wie een weekend de meeste punten pakt, wint dat weekend), de onderlinge duels (per vriend zie je wie er vaker won) en de jokers.'],
              ['Vergeten in te vullen', 'Eén gemiste race zet je op achterstand, na twee haak je af. Daartegen helpen het agenda-abonnement met een melding {agendaUur} voor elke deadline, een pushmelding als je {venster} voor een deadline nog niets hebt ingevuld, en automatisch invullen: wat iemand liet liggen, vult de app willekeurig in, van de top 10 tot de losse vragen, in plaats van nul punten.'],
              ['Niets om over te praten', 'Na de race moet er iets te zien zijn. De uitslag per coureur, de stand met wie er klom en wie er zakte, en een plaatje van de uitslag voor de groepsapp geven de groep elk weekend iets om over na te praten.'],
            ],
          },
          {
            id: 'checklist',
            vraag: 'Wat regel je voordat het seizoen begint?',
            kort: 'Regel vóór de eerste kwalificatie de poule en de code, het niveau, de jokers en automatisch invullen. Zorg dat iedereen de agenda of de meldingen aanzet en de seizoensvragen invult, en spreek af waar je om speelt. Wie dat op tijd regelt, hoeft er de rest van het seizoen niet meer aan te denken.',
            lijst: [
              'De poule staat klaar en de code is gedeeld, vóór de eerste kwalificatie.',
              'Het niveau is gekozen: Simpel, Klassiek, Gevorderd of zelf samengesteld.',
              'Jokers: aan of uit, en hoeveel per speler.',
              'Automatisch invullen: samen afgesproken of het aan blijft.',
              'Iedereen heeft zich op de agenda geabonneerd of de meldingen aangezet.',
              'De seizoensvragen zijn ingevuld vóór de eerste race.',
              'Iedereen weet waar je om speelt: om de eer. De app kent geen inleg, pot of prijzen.',
            ],
          },
          {
            id: 'werk',
            vraag: 'Hoe organiseer je een F1-poule op je werk?',
            kort: 'Een F1-poule op je werk zet je op zoals elke andere, maar houd de drempel laag: kies Simpel met alleen de twee top 10\'s, deel de code in de chat van je team en speel om de eer. Predict the Race is gratis, ook voor een grote poule op het werk. Niemand hoeft een account aan te maken of een app te installeren, want het werkt in de browser op elke telefoon of computer.',
            punten: [
              ['Simpel houdt iedereen erbij', 'Niet elke collega kijkt elke race. Met twee top 10\'s ben je in een minuut klaar, en wie meer wil, kan in een eigen poule met vrienden Gevorderd spelen.'],
              ['Om de eer', 'De app kent geen inleg, pot of prijzen. Er valt dus niets te innen of uit te betalen, en niemand hoeft na te denken over geld op het werk.'],
              ['Gratis, hoe groot ook', 'Een poule heeft geen maximum aantal spelers en er is geen zakelijk tarief. Doet de hele afdeling of het hele bedrijf mee, dan blijft het gratis.'],
              ['Automatisch invullen aan', 'Wie op vakantie is of een weekend vergeet, krijgt een willekeurige invulling in plaats van nul punten, en haakt niet af.'],
              ['Een omschrijving erbij', 'Zet er iets bij als "met de collega\'s, om de eer". Wie ook een poule met vrienden heeft, ziet bij het wisselen meteen welke het is.'],
            ],
            tekst: [
              'Op maandag heb je dan iets om over te praten: de weekendwinnaar, wie er in de stand klom, en het plaatje van de uitslag dat je met één tik in de chat zet.',
            ],
          },
        ],
        faq: [
          ['Kan iemand halverwege het seizoen nog instappen?', 'Ja. Wie later meedoet, scoort vanaf de eerstvolgende race. De seizoensvragen die hij nog niet had, kan hij alsnog invullen, maar wat eenmaal is ingevuld ligt vast.'],
          ['Kan ik in meer dan één poule zitten?', 'Ja. In de app wissel je tussen je poules, en de omschrijving die de poulebaas erbij zet, staat erbij als je wisselt.'],
          ['Kan een poule openbaar zijn?', 'Ja. Standaard is hij besloten en doe je mee met de code, maar je kunt hem ook vindbaar maken, zodat iedereen kan meedoen.'],
          ['Wat is het verschil tussen een poule en een pronostiek?', 'Er is geen verschil. In Vlaanderen heet een voorspelspel vaak een pronostiek, in Nederland meestal een poule. Je voorspelt de uitslag en speelt om punten tegen elkaar.'],
        ],
        leesOok: [
          ['niveaus', 'Simpel, Klassiek of Gevorderd: de drie niveaus naast elkaar'],
          ['punten', 'De hele puntentelling, met de losse vragen en de seizoensvragen'],
          ['faq', 'Veelgestelde vragen over de app'],
        ],
      },
      en: {
        pad: 'en/how-to-run-an-f1-prediction-league',
        titel: 'How to run an F1 prediction league | Predict the Race',
        omschrijving: 'Set up an F1 prediction league with friends or colleagues in five minutes: the four steps, the choices that matter and the three things that kill a league.',
        kop: 'How to run an F1 prediction league',
        kort: 'Setting up takes five minutes: name the league, decide how much to predict and drop the code in the group chat. Keeping it alive all season is the hard part. Leagues die when someone falls hopelessly behind, when people forget to enter, or when there is nothing to talk about after the race.',
        teaser: 'Everything about running a league: the choices and the pitfalls',
        secties: [
          {
            id: 'set-up',
            vraag: 'How do you set up an F1 prediction league?',
            kort: 'You set up an F1 prediction league in four steps: name the league, enter your own name, decide how much to predict and share the code in your group chat. After that the league admin has nothing to keep track of, because the calendar, the drivers and the results come in on their own.',
            stappen: [
              'Name the league. The name shows in the app and in the invite. A short description helps anyone who plays in more than one league, something like "work league, for the glory".',
              'Enter your own name. You are the first player and the league admin, so you pick the questions and the rules.',
              'Decide how much to predict: Simple, Classic or Advanced, or build your own set of questions.',
              'Share the invite link or the six-character code in your group chat. Anyone who opens it picks a name and is in, with no account and no password.',
            ],
            tekst: [
              'From then on it runs itself. The calendar and the drivers are already there, and after every qualifying session and race the official result comes in and the points are worked out. Nobody types anything in.',
              'Do it well before the first race. Until that race has been run you can still change the questions; after that the set is locked, so every weekend is scored by the same rules.',
            ],
          },
          {
            id: 'questions',
            vraag: 'How many questions should count?',
            kort: 'Count as many questions as your group will keep up with. The two top 10s each weekend, qualifying and race, are plenty for a competitive league. If you want more, Classic adds the sprint, the winner, pole position and fastest lap, and Advanced switches on all {nGevorderd} questions.',
            tabel: {
              bijschrift: 'The three levels in Predict the Race',
              kop: ['Level', 'Questions', 'Points per weekend'],
              rijen: [
                ['Simple', '{nSimpel}', '{simpel}'],
                ['Classic', '{nKlassiek}', '{klassiek}, plus sprint'],
                ['Advanced', '{nGevorderd}', '{gevorderd}, plus sprint and season'],
              ],
            },
            tekst: [
              'Simple is just the two top 10s. Advanced switches everything on, from fastest pit stop and teammate battles to the number of safety cars and a red flag.',
              'More questions means more to win, but also more to fill in. In a group where half the players only think about qualifying on Saturday morning, Simple lasts longer than Advanced.',
            ],
          },
          {
            id: 'jokers',
            vraag: 'Should you play with jokers?',
            kort: 'Yes, if you want players who are behind to have something to hope for. A joker doubles all your points for one race weekend. With jokers switched on, everyone gets {jokers} per season by default; as the league admin you can set anything from 1 to {jokersMax}, or leave them off.',
            tekst: [
              'You play a joker before the weekend starts, and then it is locked in. It turns every weekend into a small bet: is this the circuit where you know better than everyone else?',
            ],
          },
          {
            id: 'pitfalls',
            vraag: 'What kills an F1 prediction league?',
            kort: 'An F1 prediction league rarely dies because of the questions. It is almost always one of three things: a gap nobody can close, people forgetting to enter, or nothing to talk about after the race. Each has its own fix: more to win than the final standings, reminders before the deadline, and something to show every weekend.',
            punten: [
              ['A gap nobody can close', 'Someone who is miles behind after eight races stops playing. So give people more to win than the final standings: the weekend winner (whoever scores the most in a weekend wins that weekend), head-to-head records (you see who has won more often against each friend) and jokers.'],
              ['Forgetting to enter', 'Miss one race and you are behind; miss two and you are gone. What helps: the calendar subscription with a reminder {agendaUur} before every deadline, a push notification when you have not entered anything {venster} before a deadline, and auto-fill, which randomly fills in whatever someone left blank, from the top 10 to the extra questions, instead of zero.'],
              ['Nothing to talk about', 'After the race there has to be something to look at. The result per driver, the standings showing who climbed and who dropped, and a result image for the group chat give everyone something to argue about every weekend.'],
            ],
          },
          {
            id: 'checklist',
            vraag: 'What should you sort out before the season starts?',
            kort: 'Before the first qualifying session, sort out the league and the code, the level, jokers and auto-fill. Make sure everyone subscribes to the calendar or switches on notifications, fills in the season questions, and knows what you are playing for. Sort that out early and nobody has to think about it again all season.',
            lijst: [
              'The league exists and the code is shared, before the first qualifying session.',
              'The level is chosen: Simple, Classic, Advanced or your own set.',
              'Jokers: on or off, and how many each.',
              'Auto-fill: agreed together whether it stays on.',
              'Everyone has subscribed to the calendar or switched on notifications.',
              'The season questions are filled in before the first race.',
              'Everyone knows what you are playing for: bragging rights. There is no entry fee, pot or prize in the app.',
            ],
          },
          {
            id: 'at-work',
            vraag: 'How do you run an F1 prediction league at work?',
            kort: 'Run an office league like any other, but keep it easy to join: pick Simple with just the two top 10s, share the code in your team chat and play for bragging rights. Predict the Race is free, even for a big league at work. Nobody needs an account or an app store download, because it runs in the browser on any phone or computer.',
            punten: [
              ['Simple keeps everyone in', 'Not every colleague watches every race. Two top 10s take a minute, and the fans can play Advanced in a league of their own with friends.'],
              ['Bragging rights only', 'There is no entry fee, pot or prize in the app. Nothing to collect or pay out, and nobody has to think about money at work.'],
              ['Free at any size', 'A league has no player limit and there is no business pricing. If the whole department or the whole company joins, it is still free.'],
              ['Switch on auto-fill', 'Whoever is on holiday or forgets a weekend gets a random entry instead of zero points, and does not drop out.'],
              ['Add a description', 'Something like "work league, for glory". Anyone who is also in a league with friends sees at once which one is which when they switch.'],
            ],
            tekst: [
              'Come Monday there is something to talk about: the weekend winner, who climbed the standings, and the result image you share in the chat with one tap.',
            ],
          },
        ],
        faq: [
          ['Can someone join halfway through the season?', 'Yes. Late joiners score from the next race on. Any season questions they have not answered yet can still be filled in, but an answer cannot be changed once it is in.'],
          ['Can I be in more than one league?', 'Yes. You switch between leagues in the app, and the description the league admin adds is shown when you switch.'],
          ['Can a league be public?', 'Yes. By default it is private and people join with the code, but you can make it findable so anyone can join.'],
        ],
        leesOok: [
          ['niveaus', 'Simple, Classic or Advanced: the three levels side by side'],
          ['punten', 'The full scoring, with the extra questions and season questions'],
          ['faq', 'Frequently asked questions about the app'],
        ],
      },
      de: {
        pad: 'de/f1-tippspiel-organisieren',
        titel: 'F1-Tippspiel organisieren in 5 Minuten | Predict the Race',
        omschrijving: 'So richtest du ein F1-Tippspiel mit Freunden oder Kollegen ein: vier Schritte, die wichtigen Entscheidungen und die drei Fallen, an denen Tipprunden scheitern.',
        kop: 'Ein F1-Tippspiel organisieren',
        kort: 'Ein F1-Tippspiel richtest du in fünf Minuten ein: Gib der Tipprunde einen Namen, entscheide, wie viel getippt wird, und teile den Code in der Gruppe. Schwierig ist, die ganze Saison durchzuhalten. Eine Tipprunde schläft ein, wenn jemand hoffnungslos zurückliegt, wenn Leute das Tippen vergessen oder wenn es nach dem Rennen nichts zu bereden gibt.',
        teaser: 'Alles zum Organisieren einer Tipprunde: die Entscheidungen und die Fallen',
        secties: [
          {
            id: 'einrichten',
            vraag: 'Wie erstellt man ein F1-Tippspiel?',
            kort: 'Ein F1-Tippspiel erstellst du in vier Schritten: Gib der Tipprunde einen Namen, trag deinen eigenen Namen ein, entscheide, wie viel getippt wird, und teile den Code in deiner Gruppe. Danach musst du als Administrator nichts mehr pflegen, denn Rennkalender, Fahrer und Ergebnisse kommen von selbst.',
            stappen: [
              'Gib der Tipprunde einen Namen. Der Name steht in der App und in der Einladung. Eine kurze Beschreibung hilft allen, die in mehreren Tipprunden spielen, etwa "Büro-Tipprunde, um die Ehre".',
              'Trag deinen eigenen Namen ein. Du bist der erste Spieler und der Administrator der Tipprunde, du wählst also die Fragen und die Regeln.',
              'Entscheide, wie viel getippt wird: Einfach, Klassisch oder Fortgeschritten, oder stell deine eigenen Fragen zusammen.',
              'Teile den Einladungslink oder den sechsstelligen Code in deiner Gruppe. Wer ihn öffnet, wählt einen Namen und ist dabei, ohne Konto und ohne Passwort.',
            ],
            tekst: [
              'Ab dann läuft alles von selbst. Kalender und Fahrer sind schon da, und nach jedem Qualifying und jedem Rennen kommt das offizielle Ergebnis herein und die Punkte werden berechnet. Niemand tippt etwas ab.',
              'Mach das rechtzeitig vor dem ersten Rennen. Bis dieses Rennen gefahren ist, kannst du die Fragen noch ändern; danach sind sie fest, damit jedes Wochenende nach denselben Regeln zählt.',
            ],
          },
          {
            id: 'fragen',
            vraag: 'Wie viele Fragen sollten zählen?',
            kort: 'Lass so viele Fragen zählen, wie deine Gruppe durchhält. Die beiden Top 10 pro Wochenende, Qualifying und Rennen, reichen für eine spannende Tipprunde. Wer mehr will, nimmt mit Klassisch den Sprint, den Rennsieger, die Pole-Position und die schnellste Runde dazu, und Fortgeschritten schaltet alle {nGevorderd} Fragen ein.',
            tabel: {
              bijschrift: 'Die drei Niveaus in Predict the Race',
              kop: ['Niveau', 'Fragen', 'Punkte pro Wochenende'],
              rijen: [
                ['Einfach', '{nSimpel}', '{simpel}'],
                ['Klassisch', '{nKlassiek}', '{klassiek}, plus Sprint'],
                // Met een zacht afbreekstreepje: anders past de tabel niet op 360 pixels.
                ['Fortge\u00adschritten', '{nGevorderd}', '{gevorderd}, plus Sprint und Saison'],
              ],
            },
            tekst: [
              'Einfach sind nur die beiden Top 10. Fortgeschritten schaltet alles ein, vom schnellsten Boxenstopp und den Teamduellen bis zur Zahl der Safety-Car-Phasen und einer roten Flagge.',
              'Mehr Fragen heißt mehr zu gewinnen, aber auch mehr auszufüllen. In einer Gruppe, in der die Hälfte erst am Samstagmorgen an das Qualifying denkt, hält Einfach länger durch als Fortgeschritten.',
            ],
          },
          {
            id: 'joker',
            vraag: 'Sollte man mit Jokern spielen?',
            kort: 'Ja, wenn Spieler, die zurückliegen, noch etwas zu hoffen haben sollen. Ein Joker verdoppelt alle deine Punkte eines Rennwochenendes. Mit Jokern bekommt jeder standardmäßig {jokers} pro Saison; als Administrator kannst du 1 bis {jokersMax} einstellen oder sie ausgeschaltet lassen.',
            tekst: [
              'Den Joker setzt du vor Beginn des Wochenendes, danach ist er fest. So wird jedes Wochenende zu einer kleinen Wette: Ist das die Strecke, auf der du es besser weißt als alle anderen?',
            ],
          },
          {
            id: 'fallen',
            vraag: 'Woran scheitert ein F1-Tippspiel?',
            kort: 'Ein F1-Tippspiel scheitert selten an den Fragen. Fast immer ist es eines von drei Dingen: ein Rückstand, den niemand aufholen kann, Leute, die das Tippen vergessen, oder nichts zu bereden nach dem Rennen. Für jedes gibt es eine Lösung: mehr zu gewinnen als die Endwertung, Erinnerungen vor der Deadline und jedes Wochenende etwas zum Zeigen.',
            punten: [
              ['Ein Rückstand, den niemand aufholt', 'Wer nach acht Rennen meilenweit zurückliegt, hört auf. Gib den Leuten also mehr zu gewinnen als die Endwertung: den Wochenendsieger (wer an einem Wochenende die meisten Punkte holt, gewinnt dieses Wochenende), die direkten Duelle (du siehst, wer gegen jeden Freund öfter gewonnen hat) und Joker.'],
              ['Vergessen zu tippen', 'Ein verpasstes Rennen bringt dich in Rückstand, nach zwei bist du raus. Dagegen helfen das Kalender-Abo mit einer Erinnerung {agendaUur} vor jeder Deadline, eine Push-Benachrichtigung, wenn du {venster} vor einer Deadline noch nichts getippt hast, und das automatische Ausfüllen: Was jemand offen gelassen hat, füllt die App zufällig aus, von der Top 10 bis zu den Zusatzfragen, statt null Punkte.'],
              ['Nichts zu bereden', 'Nach dem Rennen muss es etwas zu sehen geben. Das Ergebnis pro Fahrer, die Tabelle mit Aufsteigern und Absteigern und ein Ergebnisbild für die Gruppe liefern jedes Wochenende Gesprächsstoff.'],
            ],
          },
          {
            id: 'checkliste',
            vraag: 'Was solltest du vor Saisonbeginn klären?',
            kort: 'Kläre vor dem ersten Qualifying die Tipprunde und den Code, das Niveau, die Joker und das automatische Ausfüllen. Sorg dafür, dass alle den Kalender abonnieren oder Benachrichtigungen einschalten, die Saisonfragen ausfüllen und wissen, worum ihr spielt. Wer das früh klärt, muss die ganze Saison nicht mehr daran denken.',
            lijst: [
              'Die Tipprunde existiert und der Code ist geteilt, vor dem ersten Qualifying.',
              'Das Niveau ist gewählt: Einfach, Klassisch, Fortgeschritten oder eigene Fragen.',
              'Joker: an oder aus, und wie viele pro Person.',
              'Automatisches Ausfüllen: gemeinsam abgesprochen, ob es an bleibt.',
              'Alle haben den Kalender abonniert oder Benachrichtigungen eingeschaltet.',
              'Die Saisonfragen sind vor dem ersten Rennen ausgefüllt.',
              'Alle wissen, worum ihr spielt: um die Ehre. In der App gibt es keinen Einsatz, keinen Pott und keinen Preis.',
            ],
          },
          {
            id: 'buero',
            vraag: 'Wie organisiert man ein F1-Tippspiel im Büro?',
            kort: 'Ein Tippspiel im Büro läuft wie jedes andere, nur sollte der Einstieg leicht sein: Nimm Einfach mit den beiden Top 10, teile den Code im Team-Chat und spielt um die Ehre. Predict the Race ist kostenlos, auch für eine große Tipprunde im Büro. Niemand braucht ein Konto oder einen App-Store, denn es läuft im Browser auf jedem Handy und Computer.',
            punten: [
              ['Einfach hält alle dabei', 'Nicht jeder Kollege schaut jedes Rennen. Zwei Top 10 dauern eine Minute, und die Fans spielen Fortgeschritten in einer eigenen Tipprunde mit Freunden.'],
              ['Nur um die Ehre', 'In der App gibt es keinen Einsatz, keinen Pott und keinen Preis. Nichts einzusammeln oder auszuzahlen, und niemand muss bei der Arbeit an Geld denken.'],
              ['Kostenlos bei jeder Größe', 'Eine Tipprunde hat keine Spielergrenze, und es gibt keine Firmenpreise. Macht die ganze Abteilung oder die ganze Firma mit, bleibt es kostenlos.'],
              ['Automatisches Ausfüllen einschalten', 'Wer im Urlaub ist oder ein Wochenende vergisst, bekommt einen zufälligen Tipp statt null Punkte und fällt nicht raus.'],
              ['Eine Beschreibung dazuschreiben', 'Etwa "Büro-Tipprunde, um die Ehre". Wer auch mit Freunden in einer Tipprunde ist, sieht beim Wechseln sofort, welche welche ist.'],
            ],
            tekst: [
              'Am Montag gibt es dann Gesprächsstoff: den Wochenendsieger, wer in der Tabelle geklettert ist, und das Ergebnisbild, das du mit einem Fingertipp im Chat teilst.',
            ],
          },
        ],
        faq: [
          ['Kann jemand mitten in der Saison einsteigen?', 'Ja. Wer später einsteigt, sammelt ab dem nächsten Rennen Punkte. Saisonfragen, die noch offen sind, kann er noch ausfüllen, aber eine Antwort lässt sich nicht mehr ändern, sobald sie abgegeben ist.'],
          ['Kann ich in mehr als einer Tipprunde sein?', 'Ja. In der App wechselst du zwischen deinen Tipprunden, und die Beschreibung, die der Administrator dazuschreibt, steht beim Wechseln dabei.'],
          ['Kann eine Tipprunde öffentlich sein?', 'Ja. Standardmäßig ist sie privat und man macht mit dem Code mit, aber du kannst sie auch auffindbar machen, sodass jeder mitmachen kann.'],
        ],
        leesOok: [
          ['niveaus', 'Einfach, Klassisch oder Fortgeschritten: die drei Niveaus nebeneinander'],
          ['punten', 'Das ganze Punktesystem, mit Zusatzfragen und Saisonfragen'],
          ['faq', 'Häufige Fragen zur App'],
        ],
      },
      fr: {
        pad: 'fr/organiser-pronostics-f1',
        titel: 'Organiser des pronostics F1 entre amis | Predict the Race',
        omschrijving: 'Lancez une ligue de pronostics F1 entre amis ou collègues en cinq minutes : les quatre étapes, les choix qui comptent et les trois pièges qui tuent une ligue.',
        kop: 'Organiser des pronostics F1 entre amis',
        kort: 'Une ligue de pronostics F1 se lance en cinq minutes : donnez-lui un nom, choisissez combien de questions comptent et partagez le code dans votre groupe. Le plus dur, c\'est de tenir toute la saison. Une ligue s\'essouffle quand quelqu\'un est trop loin derrière, quand les gens oublient de pronostiquer, ou quand il n\'y a rien à commenter après la course.',
        teaser: 'Tout pour organiser une ligue : les choix et les pièges',
        secties: [
          {
            id: 'lancer',
            vraag: 'Comment organiser des pronostics F1 entre amis ?',
            kort: 'Vous organisez des pronostics F1 entre amis en quatre étapes : nommez la ligue, entrez votre propre nom, choisissez combien pronostiquer et partagez le code dans votre groupe. Ensuite, l\'administrateur n\'a plus rien à suivre : le calendrier, les pilotes et les résultats arrivent tout seuls.',
            stappen: [
              'Nommez la ligue. Le nom apparaît dans l\'appli et dans l\'invitation. Une courte description aide ceux qui jouent dans plusieurs ligues, par exemple "ligue du bureau, pour la gloire".',
              'Entrez votre propre nom. Vous êtes le premier joueur et l\'administrateur de la ligue : c\'est vous qui choisissez les questions et les règles.',
              'Choisissez combien pronostiquer : Simple, Classique ou Avancé, ou composez vos propres questions.',
              'Partagez le lien d\'invitation ou le code à six caractères dans votre groupe. Qui l\'ouvre choisit un nom et c\'est parti, sans compte ni mot de passe.',
            ],
            tekst: [
              'À partir de là, tout tourne tout seul. Le calendrier et les pilotes sont déjà là, et après chaque séance de qualifications et chaque course, le résultat officiel arrive et les points sont calculés. Personne ne recopie rien.',
              'Faites-le bien avant la première course. Tant que cette course n\'a pas eu lieu, vous pouvez encore changer les questions ; ensuite, elles sont verrouillées, pour que chaque week-end compte selon les mêmes règles.',
            ],
          },
          {
            id: 'questions',
            vraag: 'Combien de questions faut-il compter ?',
            kort: 'Comptez autant de questions que votre groupe peut suivre. Les deux top 10 de chaque week-end, qualifications et course, suffisent pour une ligue disputée. Pour aller plus loin, Classique ajoute le sprint, le vainqueur, la pole position et le meilleur tour, et Avancé active les {nGevorderd} questions.',
            tabel: {
              bijschrift: 'Les trois niveaux de Predict the Race',
              kop: ['Niveau', 'Questions', 'Points par week-end'],
              rijen: [
                ['Simple', '{nSimpel}', '{simpel}'],
                ['Classique', '{nKlassiek}', '{klassiek}, plus le sprint'],
                ['Avancé', '{nGevorderd}', '{gevorderd}, plus sprint et saison'],
              ],
            },
            tekst: [
              'Simple, ce sont juste les deux top 10. Avancé active tout, de l\'arrêt au stand le plus rapide et des duels entre coéquipiers jusqu\'au nombre de voitures de sécurité et au drapeau rouge.',
              'Plus de questions, c\'est plus à gagner, mais aussi plus à remplir. Dans un groupe où la moitié ne pense aux qualifications que le samedi matin, Simple tient plus longtemps qu\'Avancé.',
            ],
          },
          {
            id: 'jokers',
            vraag: 'Faut-il jouer avec des jokers ?',
            kort: 'Oui, si vous voulez que les joueurs en retard gardent de l\'espoir. Un joker double tous vos points d\'un week-end de course. Avec les jokers activés, chacun en reçoit {jokers} par saison par défaut ; en tant qu\'administrateur, vous pouvez en régler de 1 à {jokersMax}, ou les laisser désactivés.',
            tekst: [
              'Vous posez un joker avant le début du week-end, puis il est verrouillé. Chaque week-end devient un petit pari : est-ce le circuit où vous en savez plus que tout le monde ?',
            ],
          },
          {
            id: 'pieges',
            vraag: 'Qu\'est-ce qui tue une ligue de pronostics F1 ?',
            kort: 'Une ligue de pronostics F1 meurt rarement à cause des questions. C\'est presque toujours l\'une de ces trois choses : un écart que personne ne peut combler, des joueurs qui oublient de pronostiquer, ou rien à commenter après la course. Chacune a sa solution : plus à gagner que le classement final, des rappels avant l\'échéance et quelque chose à montrer chaque week-end.',
            punten: [
              ['Un écart que personne ne comble', 'Celui qui est loin derrière après huit courses arrête de jouer. Donnez donc plus à gagner que le classement final : le vainqueur du week-end (celui qui marque le plus en un week-end gagne ce week-end), les face-à-face (vous voyez qui a gagné le plus souvent contre chaque ami) et les jokers.'],
              ['Oublier de pronostiquer', 'Une course manquée et vous êtes en retard ; deux, et vous décrochez. Ce qui aide : l\'abonnement au calendrier avec un rappel {agendaUur} avant chaque échéance, une notification quand vous n\'avez rien rempli {venster} avant une échéance, et le remplissage automatique, qui remplit au hasard ce que quelqu\'un a laissé vide, du top 10 aux questions supplémentaires, au lieu de zéro.'],
              ['Rien à commenter', 'Après la course, il faut quelque chose à regarder. Le résultat pilote par pilote, le classement avec qui monte et qui descend, et une image du résultat pour le groupe donnent à chacun de quoi débattre chaque week-end.'],
            ],
          },
          {
            id: 'checklist',
            vraag: 'Que faut-il régler avant le début de la saison ?',
            kort: 'Avant les premières qualifications, réglez la ligue et le code, le niveau, les jokers et le remplissage automatique. Assurez-vous que chacun s\'abonne au calendrier ou active les notifications, remplit les questions de saison et sait pour quoi vous jouez. Réglez cela tôt et personne n\'aura à y repenser de la saison.',
            lijst: [
              'La ligue existe et le code est partagé, avant les premières qualifications.',
              'Le niveau est choisi : Simple, Classique, Avancé ou vos propres questions.',
              'Jokers : activés ou non, et combien chacun.',
              'Remplissage automatique : décidé ensemble s\'il reste activé.',
              'Chacun s\'est abonné au calendrier ou a activé les notifications.',
              'Les questions de saison sont remplies avant la première course.',
              'Tout le monde sait pour quoi vous jouez : la gloire. Il n\'y a ni mise, ni cagnotte, ni prix dans l\'appli.',
            ],
          },
          {
            id: 'bureau',
            vraag: 'Comment organiser des pronostics F1 au bureau ?',
            kort: 'Une ligue au bureau s\'organise comme les autres, mais doit rester facile à rejoindre : choisissez Simple avec les deux top 10, partagez le code dans le chat de l\'équipe et jouez pour la gloire. Predict the Race est gratuit, même pour une grande ligue au travail. Personne n\'a besoin de compte ni de store, car tout fonctionne dans le navigateur, sur tout téléphone ou ordinateur.',
            punten: [
              ['Simple garde tout le monde', 'Tous les collègues ne regardent pas chaque course. Deux top 10 prennent une minute, et les passionnés peuvent jouer en Avancé dans leur propre ligue entre amis.'],
              ['Pour la gloire seulement', 'Il n\'y a ni mise, ni cagnotte, ni prix dans l\'appli. Rien à collecter ni à reverser, et personne n\'a à penser à l\'argent au travail.'],
              ['Gratuit quelle que soit la taille', 'Une ligue n\'a pas de limite de joueurs et il n\'y a pas de tarif entreprise. Si tout le service ou toute l\'entreprise participe, c\'est toujours gratuit.'],
              ['Activez le remplissage automatique', 'Celui qui est en vacances ou oublie un week-end reçoit un pronostic au hasard au lieu de zéro point, et ne décroche pas.'],
              ['Ajoutez une description', 'Par exemple "ligue du bureau, pour la gloire". Ceux qui jouent aussi dans une ligue entre amis voient tout de suite laquelle est laquelle quand ils changent.'],
            ],
            tekst: [
              'Le lundi, il y a de quoi parler : le vainqueur du week-end, qui a grimpé au classement, et l\'image du résultat que vous partagez dans le chat d\'un seul geste.',
            ],
          },
        ],
        faq: [
          ['Peut-on rejoindre une ligue en cours de saison ?', 'Oui. Les retardataires marquent à partir de la course suivante. Les questions de saison auxquelles ils n\'ont pas encore répondu peuvent encore être remplies, mais une réponse ne peut plus être changée une fois donnée.'],
          ['Puis-je être dans plusieurs ligues ?', 'Oui. Vous passez d\'une ligue à l\'autre dans l\'appli, et la description ajoutée par l\'administrateur s\'affiche quand vous changez.'],
          ['Une ligue peut-elle être publique ?', 'Oui. Par défaut elle est privée et on la rejoint avec le code, mais vous pouvez la rendre visible pour que tout le monde puisse la rejoindre.'],
        ],
        leesOok: [
          ['niveaus', 'Simple, Classique ou Avancé : les trois niveaux côte à côte'],
          ['punten', 'Le barème complet, avec les questions supplémentaires et les questions de saison'],
          ['faq', 'Questions fréquentes sur l\'appli'],
        ],
      },
      es: {
        pad: 'es/organizar-porra-f1',
        titel: 'Cómo organizar una porra de F1 | Predict the Race',
        omschrijving: 'Monta una porra de F1 con amigos o compañeros en cinco minutos: los cuatro pasos, las decisiones que importan y las tres trampas que acaban con una liga.',
        kop: 'Cómo organizar una porra de F1',
        kort: 'Una porra de F1 se monta en cinco minutos: ponle nombre a la liga, decide cuánto se predice y comparte el código en el grupo. Lo difícil es aguantar toda la temporada. Una porra se apaga cuando alguien se queda demasiado atrás, cuando la gente se olvida de predecir o cuando no hay nada de qué hablar después de la carrera.',
        teaser: 'Todo sobre organizar una liga: las decisiones y las trampas',
        secties: [
          {
            id: 'montar',
            vraag: '¿Cómo se hace una porra de F1?',
            kort: 'Una porra de F1 se hace en cuatro pasos: ponle nombre a la liga, escribe tu propio nombre, decide cuánto se predice y comparte el código en tu grupo. Después, el administrador no tiene que llevar nada, porque el calendario, los pilotos y los resultados llegan solos.',
            stappen: [
              'Ponle nombre a la liga. El nombre aparece en la app y en la invitación. Una descripción corta ayuda a quien juega en varias ligas, algo como "porra de la oficina, por la gloria".',
              'Escribe tu propio nombre. Eres el primer jugador y el administrador de la liga, así que tú eliges las preguntas y las reglas.',
              'Decide cuánto se predice: Sencillo, Clásico o Avanzado, o arma tu propio juego de preguntas.',
              'Comparte el enlace de invitación o el código de seis caracteres en tu grupo. Quien lo abre elige un nombre y ya está dentro, sin cuenta y sin contraseña.',
            ],
            tekst: [
              'A partir de ahí funciona solo. El calendario y los pilotos ya están, y después de cada clasificación y cada carrera llega el resultado oficial y se calculan los puntos. Nadie tiene que copiar nada.',
              'Hazlo con tiempo antes de la primera carrera. Hasta que se dispute esa carrera aún puedes cambiar las preguntas; después quedan fijas, para que cada fin de semana se puntúe con las mismas reglas.',
            ],
          },
          {
            id: 'preguntas',
            vraag: '¿Cuántas preguntas deberían contar?',
            kort: 'Cuenta tantas preguntas como tu grupo vaya a seguir. Los dos top 10 de cada fin de semana, clasificación y carrera, bastan para una liga reñida. Si quieres más, Clásico añade la sprint, el ganador, la pole position y la vuelta rápida, y Avanzado activa las {nGevorderd} preguntas.',
            tabel: {
              bijschrift: 'Los tres niveles de Predict the Race',
              kop: ['Nivel', 'Preguntas', 'Puntos por fin de semana'],
              rijen: [
                ['Sencillo', '{nSimpel}', '{simpel}'],
                ['Clásico', '{nKlassiek}', '{klassiek}, más sprint'],
                ['Avanzado', '{nGevorderd}', '{gevorderd}, más sprint y temporada'],
              ],
            },
            tekst: [
              'Sencillo son solo los dos top 10. Avanzado lo activa todo, desde la parada en boxes más rápida y los duelos entre compañeros hasta el número de coches de seguridad y la bandera roja.',
              'Más preguntas significa más para ganar, pero también más que rellenar. En un grupo donde la mitad solo piensa en la clasificación el sábado por la mañana, Sencillo aguanta más que Avanzado.',
            ],
          },
          {
            id: 'comodines',
            vraag: '¿Conviene jugar con comodines?',
            kort: 'Sí, si quieres que los jugadores que van atrás tengan algo que esperar. Un comodín duplica todos tus puntos de un fin de semana de carrera. Con los comodines activados, cada uno recibe {jokers} por temporada por defecto; como administrador puedes elegir de 1 a {jokersMax}, o dejarlos desactivados.',
            tekst: [
              'El comodín se pone antes de que empiece el fin de semana, y después queda fijo. Así cada fin de semana es una pequeña apuesta: ¿es este el circuito donde sabes más que nadie?',
            ],
          },
          {
            id: 'trampas',
            vraag: '¿Qué acaba con una porra de F1?',
            kort: 'Una porra de F1 rara vez muere por las preguntas. Casi siempre es una de tres cosas: una distancia que nadie puede recortar, gente que se olvida de predecir o nada de qué hablar después de la carrera. Cada una tiene su solución: más que ganar que la clasificación final, recordatorios antes del plazo y algo que enseñar cada fin de semana.',
            punten: [
              ['Una distancia que nadie recorta', 'Quien va muy atrás después de ocho carreras deja de jugar. Así que da más que ganar que la clasificación final: el ganador del fin de semana (quien más puntos suma en un fin de semana gana ese fin de semana), los cara a cara (ves quién ha ganado más veces contra cada amigo) y los comodines.'],
              ['Olvidarse de predecir', 'Te pierdes una carrera y vas por detrás; te pierdes dos y te descuelgas. Lo que ayuda: la suscripción al calendario con un aviso {agendaUur} antes de cada plazo, una notificación si no has rellenado nada {venster} antes de un plazo, y el relleno automático, que rellena al azar lo que alguien dejó en blanco, del top 10 a las preguntas extra, en vez de cero.'],
              ['Nada de qué hablar', 'Después de la carrera tiene que haber algo que mirar. El resultado piloto a piloto, la clasificación con quién sube y quién baja, y una imagen del resultado para el grupo dan tema de discusión cada fin de semana.'],
            ],
          },
          {
            id: 'lista',
            vraag: '¿Qué hay que dejar listo antes de que empiece la temporada?',
            kort: 'Antes de la primera clasificación, deja listos la liga y el código, el nivel, los comodines y el relleno automático. Asegúrate de que todos se suscriban al calendario o activen las notificaciones, rellenen las preguntas de temporada y sepan por qué jugáis. Si lo dejas listo pronto, nadie tendrá que volver a pensarlo en toda la temporada.',
            lijst: [
              'La liga existe y el código está compartido, antes de la primera clasificación.',
              'El nivel está elegido: Sencillo, Clásico, Avanzado o tus propias preguntas.',
              'Comodines: sí o no, y cuántos por persona.',
              'Relleno automático: acordado entre todos si sigue activado.',
              'Todos se han suscrito al calendario o han activado las notificaciones.',
              'Las preguntas de temporada están rellenadas antes de la primera carrera.',
              'Todos saben por qué jugáis: por la gloria. En la app no hay cuota, ni bote, ni premio.',
            ],
          },
          {
            id: 'oficina',
            vraag: '¿Cómo se organiza una porra de F1 en la oficina?',
            kort: 'Una porra en la oficina se organiza como cualquier otra, pero tiene que ser fácil entrar: elige Sencillo con los dos top 10, comparte el código en el chat del equipo y jugad por la gloria. Predict the Race es gratis, incluso para una liga grande en el trabajo. Nadie necesita cuenta ni tienda de apps, porque funciona en el navegador de cualquier móvil u ordenador.',
            punten: [
              ['Sencillo mantiene a todos', 'No todos los compañeros ven cada carrera. Dos top 10 llevan un minuto, y los fans pueden jugar Avanzado en su propia liga con amigos.'],
              ['Solo por la gloria', 'En la app no hay cuota, ni bote, ni premio. Nada que recaudar ni que repartir, y nadie tiene que pensar en dinero en el trabajo.'],
              ['Gratis sea cual sea el tamaño', 'Una liga no tiene límite de jugadores y no hay precio para empresas. Si se apunta todo el departamento o toda la empresa, sigue siendo gratis.'],
              ['Activa el relleno automático', 'Quien está de vacaciones u olvida un fin de semana recibe una predicción al azar en vez de cero puntos, y no se descuelga.'],
              ['Añade una descripción', 'Algo como "porra de la oficina, por la gloria". Quien también juega en una liga con amigos ve enseguida cuál es cuál al cambiar.'],
            ],
            tekst: [
              'El lunes hay de qué hablar: el ganador del fin de semana, quién ha subido en la clasificación y la imagen del resultado que compartes en el chat con un toque.',
            ],
          },
        ],
        faq: [
          ['¿Puede alguien unirse a mitad de temporada?', 'Sí. Quien llega tarde puntúa desde la siguiente carrera. Las preguntas de temporada que aún no haya contestado las puede rellenar, pero una respuesta ya no se puede cambiar una vez enviada.'],
          ['¿Puedo estar en más de una liga?', 'Sí. En la app cambias entre tus ligas, y la descripción que pone el administrador aparece al cambiar.'],
          ['¿Puede una liga ser pública?', 'Sí. Por defecto es privada y se entra con el código, pero puedes hacerla visible para que cualquiera pueda unirse.'],
        ],
        leesOok: [
          ['niveaus', 'Sencillo, Clásico o Avanzado: los tres niveles lado a lado'],
          ['punten', 'Toda la puntuación, con las preguntas extra y las de temporada'],
          ['faq', 'Preguntas frecuentes sobre la app'],
        ],
      },
      it: {
        pad: 'it/organizzare-pronostici-f1',
        titel: 'Organizzare i pronostici F1 con gli amici | Predict the Race',
        omschrijving: 'Crea una lega di pronostici F1 con amici o colleghi in cinque minuti: i quattro passi, le scelte che contano e le tre trappole che fanno morire una lega.',
        kop: 'Organizzare i pronostici F1 con gli amici',
        kort: 'Una lega di pronostici F1 si crea in cinque minuti: dai un nome alla lega, decidi quanto pronosticare e condividi il codice nel gruppo. La parte difficile è tenerla viva tutta la stagione. Una lega si spegne quando qualcuno resta troppo indietro, quando la gente si dimentica di pronosticare o quando dopo la gara non c\'è niente di cui parlare.',
        teaser: 'Tutto su come organizzare una lega: le scelte e le trappole',
        secties: [
          {
            id: 'creare',
            vraag: 'Come si organizzano i pronostici F1 con gli amici?',
            kort: 'I pronostici F1 con gli amici si organizzano in quattro passi: dai un nome alla lega, inserisci il tuo nome, decidi quanto pronosticare e condividi il codice nel tuo gruppo. Poi l\'amministratore non deve più seguire niente, perché calendario, piloti e risultati arrivano da soli.',
            stappen: [
              'Dai un nome alla lega. Il nome compare nell\'app e nell\'invito. Una breve descrizione aiuta chi gioca in più leghe, per esempio "lega dell\'ufficio, per la gloria".',
              'Inserisci il tuo nome. Sei il primo giocatore e l\'amministratore della lega, quindi scegli tu le domande e le regole.',
              'Decidi quanto pronosticare: Semplice, Classico o Avanzato, oppure componi le tue domande.',
              'Condividi il link di invito o il codice di sei caratteri nel tuo gruppo. Chi lo apre sceglie un nome ed è dentro, senza account e senza password.',
            ],
            tekst: [
              'Da lì in poi va tutto da solo. Calendario e piloti ci sono già, e dopo ogni qualifica e ogni gara arriva il risultato ufficiale e i punti vengono calcolati. Nessuno deve ricopiare niente.',
              'Fallo con anticipo rispetto alla prima gara. Finché quella gara non si è corsa puoi ancora cambiare le domande; dopo restano fisse, così ogni weekend conta con le stesse regole.',
            ],
          },
          {
            id: 'domande',
            vraag: 'Quante domande dovrebbero contare?',
            kort: 'Fai contare tante domande quante il tuo gruppo riesce a seguire. Le due top 10 di ogni weekend, qualifiche e gara, bastano per una lega combattuta. Se vuoi di più, Classico aggiunge la sprint, vincitore, pole position e giro più veloce, e Avanzato attiva tutte le {nGevorderd} domande.',
            tabel: {
              bijschrift: 'I tre livelli di Predict the Race',
              kop: ['Livello', 'Domande', 'Punti per weekend'],
              rijen: [
                ['Semplice', '{nSimpel}', '{simpel}'],
                ['Classico', '{nKlassiek}', '{klassiek}, più sprint'],
                ['Avanzato', '{nGevorderd}', '{gevorderd}, più sprint e stagione'],
              ],
            },
            tekst: [
              'Semplice sono solo le due top 10. Avanzato attiva tutto, dal pit stop più veloce e i duelli tra compagni di squadra fino al numero di safety car e alla bandiera rossa.',
              'Più domande vuol dire più da vincere, ma anche più da compilare. In un gruppo dove metà pensa alle qualifiche solo il sabato mattina, Semplice dura più di Avanzato.',
            ],
          },
          {
            id: 'jolly',
            vraag: 'Conviene giocare con i jolly?',
            kort: 'Sì, se vuoi che chi è indietro abbia ancora qualcosa da sperare. Un jolly raddoppia tutti i tuoi punti di un weekend di gara. Con i jolly attivi, ognuno ne riceve {jokers} a stagione di default; come amministratore puoi sceglierne da 1 a {jokersMax}, oppure lasciarli spenti.',
            tekst: [
              'Il jolly si gioca prima che inizi il weekend, poi resta bloccato. Così ogni weekend diventa una piccola scommessa: è questo il circuito dove ne sai più di tutti?',
            ],
          },
          {
            id: 'trappole',
            vraag: 'Che cosa fa morire una lega di pronostici F1?',
            kort: 'Una lega di pronostici F1 muore di rado per colpa delle domande. Quasi sempre è una di tre cose: un distacco che nessuno può recuperare, gente che si dimentica di pronosticare, o niente di cui parlare dopo la gara. Ognuna ha il suo rimedio: più da vincere della classifica finale, promemoria prima della scadenza e qualcosa da mostrare ogni weekend.',
            punten: [
              ['Un distacco che nessuno recupera', 'Chi dopo otto gare è lontanissimo smette di giocare. Quindi metti in palio più della classifica finale: il vincitore del weekend (chi fa più punti in un weekend vince quel weekend), i testa a testa (vedi chi ha vinto più spesso contro ogni amico) e i jolly.'],
              ['Dimenticarsi di pronosticare', 'Salti una gara e sei indietro; ne salti due e molli. Cosa aiuta: l\'abbonamento al calendario con un promemoria {agendaUur} prima di ogni scadenza, una notifica se non hai compilato niente {venster} prima di una scadenza, e la compilazione automatica, che riempie a caso quello che qualcuno ha lasciato vuoto, dalla top 10 alle domande extra, invece di zero.'],
              ['Niente di cui parlare', 'Dopo la gara deve esserci qualcosa da guardare. Il risultato pilota per pilota, la classifica con chi sale e chi scende, e un\'immagine del risultato per il gruppo danno a tutti qualcosa su cui discutere ogni weekend.'],
            ],
          },
          {
            id: 'checklist',
            vraag: 'Cosa sistemare prima che inizi la stagione?',
            kort: 'Prima delle prime qualifiche, sistema la lega e il codice, il livello, i jolly e la compilazione automatica. Fai in modo che tutti si abbonino al calendario o attivino le notifiche, compilino le domande di stagione e sappiano per cosa giocate. Se lo sistemi presto, nessuno dovrà più pensarci per tutta la stagione.',
            lijst: [
              'La lega esiste e il codice è condiviso, prima delle prime qualifiche.',
              'Il livello è scelto: Semplice, Classico, Avanzato o le tue domande.',
              'Jolly: sì o no, e quanti a testa.',
              'Compilazione automatica: deciso insieme se resta attiva.',
              'Tutti si sono abbonati al calendario o hanno attivato le notifiche.',
              'Le domande di stagione sono compilate prima della prima gara.',
              'Tutti sanno per cosa giocate: per la gloria. Nell\'app non ci sono quote, né montepremi, né premi.',
            ],
          },
          {
            id: 'ufficio',
            vraag: 'Come si organizzano i pronostici F1 in ufficio?',
            kort: 'Una lega in ufficio si organizza come le altre, ma deve restare facile entrarci: scegli Semplice con le due top 10, condividi il codice nella chat del team e giocate per la gloria. Predict the Race è gratis, anche per una lega grande al lavoro. Nessuno ha bisogno di account o di scaricare app, perché funziona nel browser di qualsiasi telefono o computer.',
            punten: [
              ['Semplice tiene dentro tutti', 'Non tutti i colleghi guardano ogni gara. Due top 10 richiedono un minuto, e gli appassionati possono giocare in Avanzato in una lega loro con gli amici.'],
              ['Solo per la gloria', 'Nell\'app non ci sono quote, né montepremi, né premi. Niente da raccogliere o da pagare, e nessuno deve pensare ai soldi al lavoro.'],
              ['Gratis a qualsiasi dimensione', 'Una lega non ha limite di giocatori e non ci sono prezzi per aziende. Se partecipa tutto il reparto o tutta l\'azienda, resta gratis.'],
              ['Attiva la compilazione automatica', 'Chi è in ferie o si dimentica un weekend riceve un pronostico a caso invece di zero punti, e non resta indietro.'],
              ['Aggiungi una descrizione', 'Per esempio "lega dell\'ufficio, per la gloria". Chi gioca anche in una lega con gli amici vede subito quale è quale quando cambia.'],
            ],
            tekst: [
              'Il lunedì c\'è di che parlare: il vincitore del weekend, chi è salito in classifica e l\'immagine del risultato che condividi nella chat con un tocco.',
            ],
          },
        ],
        faq: [
          ['Si può entrare in una lega a stagione iniziata?', 'Sì. Chi entra tardi fa punti dalla gara successiva. Le domande di stagione a cui non ha ancora risposto può ancora compilarle, ma una risposta non si può più cambiare una volta data.'],
          ['Posso essere in più di una lega?', 'Sì. Nell\'app passi da una lega all\'altra, e la descrizione che aggiunge l\'amministratore compare quando cambi.'],
          ['Una lega può essere pubblica?', 'Sì. Di default è privata e si entra con il codice, ma puoi renderla visibile così chiunque può entrare.'],
        ],
        leesOok: [
          ['niveaus', 'Semplice, Classico o Avanzato: i tre livelli a confronto'],
          ['punten', 'Tutto il punteggio, con le domande extra e quelle di stagione'],
          ['faq', 'Domande frequenti sull\'app'],
        ],
      },
      pt: {
        pad: 'pt/organizar-bolao-f1',
        titel: 'Como organizar um bolão de F1 | Predict the Race',
        omschrijving: 'Monte um bolão de F1 com amigos ou colegas em cinco minutos: os quatro passos, as escolhas que importam e as três armadilhas que acabam com um bolão.',
        kop: 'Como organizar um bolão de F1',
        kort: 'Um bolão de F1 se monta em cinco minutos: dê um nome ao bolão, decida quanto palpitar e compartilhe o código no grupo. O difícil é manter o bolão vivo a temporada inteira. Um bolão morre quando alguém fica para trás sem chance, quando o pessoal esquece de palpitar ou quando não há nada para comentar depois da corrida.',
        teaser: 'Tudo sobre organizar um bolão: as escolhas e as armadilhas',
        secties: [
          {
            id: 'montar',
            vraag: 'Como organizar um bolão de F1 com os amigos?',
            kort: 'Você organiza um bolão de F1 com os amigos em quatro passos: dê um nome ao bolão, digite seu próprio nome, decida quanto palpitar e compartilhe o código no seu grupo. Depois disso o administrador não precisa acompanhar nada, porque o calendário, os pilotos e os resultados chegam sozinhos.',
            stappen: [
              'Dê um nome ao bolão. O nome aparece no app e no convite. Uma descrição curta ajuda quem joga em mais de um bolão, algo como "bolão do trabalho, pela glória".',
              'Digite seu próprio nome. Você é o primeiro jogador e o administrador do bolão, então escolhe as perguntas e as regras.',
              'Decida quanto palpitar: Simples, Clássico ou Avançado, ou monte suas próprias perguntas.',
              'Compartilhe o link de convite ou o código de seis caracteres no seu grupo. Quem abre escolhe um nome e já está dentro, sem conta e sem senha.',
            ],
            tekst: [
              'A partir daí tudo funciona sozinho. O calendário e os pilotos já estão lá, e depois de cada classificação e cada corrida chega o resultado oficial e os pontos são calculados. Ninguém digita nada.',
              'Faça isso com antecedência, antes da primeira corrida. Até essa corrida acontecer, você ainda pode mudar as perguntas; depois elas ficam travadas, para que todo fim de semana seja pontuado pelas mesmas regras.',
            ],
          },
          {
            id: 'perguntas',
            vraag: 'Quantas perguntas devem contar?',
            kort: 'Conte tantas perguntas quanto o seu grupo conseguir acompanhar. Os dois top 10 de cada fim de semana, classificação e corrida, bastam para um bolão disputado. Se quiser mais, o Clássico acrescenta a sprint, vencedor, pole position e volta mais rápida, e o Avançado liga todas as {nGevorderd} perguntas.',
            tabel: {
              bijschrift: 'Os três níveis do Predict the Race',
              kop: ['Nível', 'Perguntas', 'Pontos por fim de semana'],
              rijen: [
                ['Simples', '{nSimpel}', '{simpel}'],
                ['Clássico', '{nKlassiek}', '{klassiek}, mais sprint'],
                ['Avançado', '{nGevorderd}', '{gevorderd}, mais sprint e temporada'],
              ],
            },
            tekst: [
              'O Simples tem só os dois top 10. O Avançado liga tudo, do pit stop mais rápido e os duelos entre companheiros até o número de safety cars e a bandeira vermelha.',
              'Mais perguntas significa mais para ganhar, mas também mais para preencher. Num grupo em que metade só pensa na classificação no sábado de manhã, o Simples dura mais que o Avançado.',
            ],
          },
          {
            id: 'coringas',
            vraag: 'Vale a pena jogar com coringas?',
            kort: 'Sim, se você quer que quem está atrás ainda tenha o que esperar. Um coringa dobra todos os seus pontos de um fim de semana de corrida. Com os coringas ligados, cada um recebe {jokers} por temporada por padrão; como administrador, você pode escolher de 1 a {jokersMax}, ou deixá-los desligados.',
            tekst: [
              'Você coloca o coringa antes de o fim de semana começar, e depois ele fica travado. Assim cada fim de semana vira uma pequena aposta: é esse o circuito em que você sabe mais que todo mundo?',
            ],
          },
          {
            id: 'armadilhas',
            vraag: 'O que acaba com um bolão de F1?',
            kort: 'Um bolão de F1 raramente morre por causa das perguntas. Quase sempre é uma de três coisas: uma diferença que ninguém consegue tirar, gente que esquece de palpitar, ou nada para comentar depois da corrida. Cada uma tem sua solução: mais para ganhar do que a classificação final, lembretes antes do prazo e algo para mostrar a cada fim de semana.',
            punten: [
              ['Uma diferença que ninguém tira', 'Quem está muito atrás depois de oito corridas para de jogar. Então dê mais para ganhar do que a classificação final: o vencedor do fim de semana (quem faz mais pontos num fim de semana ganha aquele fim de semana), o confronto direto (você vê quem venceu mais vezes contra cada amigo) e os coringas.'],
              ['Esquecer de palpitar', 'Perdeu uma corrida, ficou para trás; perdeu duas, desistiu. O que ajuda: a assinatura do calendário com um lembrete {agendaUur} antes de cada prazo, uma notificação se você não preencheu nada {venster} antes de um prazo, e o preenchimento automático, que preenche ao acaso o que alguém deixou em branco, do top 10 às perguntas extras, em vez de zero.'],
              ['Nada para comentar', 'Depois da corrida tem que haver algo para ver. O resultado piloto por piloto, a classificação com quem subiu e quem caiu, e uma imagem do resultado para o grupo dão assunto a cada fim de semana.'],
            ],
          },
          {
            id: 'checklist',
            vraag: 'O que acertar antes do começo da temporada?',
            kort: 'Antes da primeira classificação, acerte o bolão e o código, o nível, os coringas e o preenchimento automático. Garanta que todos assinem o calendário ou liguem as notificações, preencham as perguntas da temporada e saibam pelo que vocês jogam. Acertando isso cedo, ninguém precisa pensar nisso de novo a temporada toda.',
            lijst: [
              'O bolão existe e o código foi compartilhado, antes da primeira classificação.',
              'O nível está escolhido: Simples, Clássico, Avançado ou suas próprias perguntas.',
              'Coringas: ligados ou não, e quantos para cada um.',
              'Preenchimento automático: combinado entre todos se fica ligado.',
              'Todos assinaram o calendário ou ligaram as notificações.',
              'As perguntas da temporada estão preenchidas antes da primeira corrida.',
              'Todos sabem pelo que vocês jogam: pela glória. No app não há taxa de entrada, nem vaquinha, nem prêmio.',
            ],
          },
          {
            id: 'trabalho',
            vraag: 'Como organizar um bolão de F1 no trabalho?',
            kort: 'Um bolão no trabalho se organiza como qualquer outro, mas precisa ser fácil de entrar: escolha o Simples com os dois top 10, compartilhe o código no chat da equipe e joguem pela glória. O Predict the Race é grátis, até para um bolão grande no trabalho. Ninguém precisa de conta nem de loja de apps, porque funciona no navegador de qualquer celular ou computador.',
            punten: [
              ['O Simples mantém todo mundo', 'Nem todo colega assiste a todas as corridas. Dois top 10 levam um minuto, e os fãs podem jogar no Avançado num bolão próprio com os amigos.'],
              ['Só pela glória', 'No app não há taxa de entrada, nem vaquinha, nem prêmio. Nada para recolher ou pagar, e ninguém precisa pensar em dinheiro no trabalho.'],
              ['Grátis de qualquer tamanho', 'Um bolão não tem limite de jogadores e não há preço para empresas. Se o departamento inteiro ou a empresa inteira entrar, continua grátis.'],
              ['Ligue o preenchimento automático', 'Quem está de férias ou esquece um fim de semana recebe um palpite ao acaso em vez de zero, e não fica para trás.'],
              ['Coloque uma descrição', 'Algo como "bolão do trabalho, pela glória". Quem também joga num bolão com os amigos vê na hora qual é qual ao trocar.'],
            ],
            tekst: [
              'Na segunda-feira tem assunto: o vencedor do fim de semana, quem subiu na classificação e a imagem do resultado que você compartilha no chat com um toque.',
            ],
          },
        ],
        faq: [
          ['Alguém pode entrar no meio da temporada?', 'Sim. Quem entra depois pontua a partir da próxima corrida. As perguntas da temporada que ainda não respondeu podem ser preenchidas, mas uma resposta não pode mais ser mudada depois de enviada.'],
          ['Posso estar em mais de um bolão?', 'Sim. No app você troca entre seus bolões, e a descrição que o administrador coloca aparece quando você troca.'],
          ['Um bolão pode ser público?', 'Sim. Por padrão ele é privado e se entra com o código, mas você pode deixá-lo visível para que qualquer pessoa entre.'],
        ],
        leesOok: [
          ['niveaus', 'Simples, Clássico ou Avançado: os três níveis lado a lado'],
          ['punten', 'A pontuação completa, com as perguntas extras e as da temporada'],
          ['faq', 'Perguntas frequentes sobre o app'],
        ],
      },
    },
  },
  {
    id: 'puntentelling',
    soort: 'gids',
    verwant: ['organiseren', 'excel'],
    teaserPlek: 'punten',
    // Een verzonnen race. Sainz staat niet in de uitslag: uitgevallen.
    rekenvoorbeeld: {
      voorspeld: ['Verstappen', 'Norris', 'Leclerc', 'Piastri', 'Hamilton', 'Russell', 'Antonelli', 'Alonso', 'Sainz', 'Albon'],
      uitslag: ['Norris', 'Verstappen', 'Leclerc', 'Russell', 'Piastri', 'Hamilton', 'Alonso', 'Antonelli', 'Gasly', 'Hadjar', 'Albon'],
    },
    // Contrair voorspellen: zoveel spelers vulden de winnaar in en hadden hem
    // goed. De generator rekent met contrairVoor() uit de app wat dat per
    // aantal gelijke antwoorden oplevert.
    contrairvoorbeeld: { spelers: 5, vraag: 'winnaar' },
    talen: {
      nl: {
        pad: 'f1-poule-puntentelling',
        titel: 'Puntentelling voor een F1-poule | Predict the Race',
        omschrijving: 'Vier manieren om punten te geven in een F1-poule, met de voor- en nadelen, een uitgerekend voorbeeld en de telling die Predict the Race gebruikt.',
        kop: 'Puntentelling voor een F1-poule',
        kort: 'In een F1-poule krijg je punten voor elke coureur in je top 10, en hoe dichter hij bij jouw plek eindigt, hoe meer. Predict the Race geeft {exact} punten voor precies goed, {bijna} bij één plek ernaast en {twee} bij twee plekken ernaast. Alleen exact goed laten tellen klinkt streng en eerlijk, maar dan scoort bijna niemand en beslist geluk de stand.',
        teaser: 'De puntentelling uitgelegd, met een rekenvoorbeeld',
        secties: [
          {
            id: 'systemen',
            vraag: 'Welke puntentellingen zijn er?',
            kort: 'Er zijn vier gangbare puntentellingen voor een F1-poule: alleen exact goed, punten naar afstand, de echte WK-punten, en alleen winnaar en podium. Het grote verschil is of bijna goed ook punten oplevert. Predict the Race telt naar afstand, omdat wie het veld goed inschat dan ook scoort als de volgorde net anders uitvalt.',
            punten: [
              ['Alleen exact goed', 'Punten als een coureur precies eindigt op de plek waar jij hem zette. Makkelijk uit te leggen, maar een top 10 die overal één plek naast zit, levert niets op. Na een paar races staat iedereen rond nul en beslist één gelukstreffer de stand.'],
              ['Punten naar afstand', '{exact} punten voor precies goed, {bijna} voor één plek ernaast, {twee} voor twee plekken ernaast, en daarna niets. Zo telt Predict the Race. Wie het veld goed inschat, scoort ook als de volgorde net anders uitvalt. Het nadeel is het rekenwerk: met de hand zijn dat tien coureurs per sessie per speler.'],
              ['De WK-punten', 'Voor elke coureur op de goede plek krijg je de punten die hij in het echt krijgt: {wkPunten}. Dat voelt als echte Formule 1, maar een goede P10 is {wkLaatste} punt waard en de winnaar {wkEerste}. Wie de winnaar mist, staat meteen ver achter, en de onderkant van je top 10 telt nauwelijks mee.'],
              ['Alleen winnaar en podium', 'Snel ingevuld, maar de meeste mensen kiezen dezelfde favoriet. Dan scoort iedereen ongeveer hetzelfde en valt er weinig te winnen.'],
            ],
            tekst: [
              'Losse vragen, zoals de pole position of de snelste ronde, komen daar bovenop. Die leveren een vast aantal punten op als je ze goed hebt.',
            ],
          },
          {
            id: 'rekenvoorbeeld',
            vraag: 'Hoe reken je een top 10 uit?',
            kort: 'Een top 10 reken je per coureur uit: {exact} punten als hij precies op jouw plek eindigt, {een} bij één plek ernaast, {twee} bij twee plekken ernaast, en daarna niets. Tel de tien regels op; een perfecte top 10 is {perfect} punten. Hieronder een verzonnen race, uitgerekend met dezelfde code die in de app de punten geeft.',
            rekenvoorbeeld: { bijschrift: 'Een verzonnen race: jouw top 10 naast de uitslag',
              kop: ['Coureur', 'Jouw plek', 'Uitslag', 'Punten'], geenPlek: 'uitgevallen', totaal: 'Totaal' },
            voorbeeld: 'Totaal {voorbeeldTotaal} van de {top10} punten. Als alleen exact goed telde, was het {voorbeeldExact} geweest, terwijl {voorbeeldDichtbij} van de 10 coureurs hooguit één plek van hun voorspelde plek eindigden.',
            tekst: [
              'Kijk naar Albon: in de voorspelling op P10, in de uitslag elfde. Dat is één plek ernaast en dus {bijna} punten, ook al valt hij buiten de top 10. Sainz viel uit en kreeg geen plek in de uitslag, dus nul.',
            ],
          },
          {
            id: 'bijna-goed',
            vraag: 'Waarom telt bijna goed mee?',
            kort: 'Bijna goed telt mee omdat een F1-uitslag altijd een beetje toeval is: één trage pitstop en je P4 wordt P5. Als alleen exact goed telt, wint wie geluk heeft. Telt de afstand mee, dan wint wie het veld het best inschat, en daar hoort een poule over te gaan.',
            tekst: [
              'Het houdt de poule ook spannend. Wie een slecht weekend heeft, pakt toch punten, en de achterstand op de koploper blijft in te halen.',
            ],
          },
          {
            id: 'losse-vragen',
            vraag: 'Welke vragen kun je nog meer laten meetellen?',
            kort: 'Naast de twee top 10\'s kun je losse vragen per weekend laten meetellen, zoals de winnaar, de pole position en de snelste ronde, plus {nSeizoen} seizoensvragen voor het hele jaar. Elke vraag levert een vast aantal punten op voor een goed antwoord: de winnaar is {winnaar} punten waard, de pole position {pole}.',
            vragentabel: true,
            tekst: [
              'Wat een weekend kan opleveren, hangt af van het niveau dat de poulebaas kiest: {simpel} punten bij Simpel, {klassiek} bij Klassiek en {gevorderd} bij Gevorderd. Op een sprintweekend komt de sprint erbij, en de seizoensvragen tellen aan het eind van het seizoen mee.',
            ],
          },
          {
            id: 'hetzelfde',
            vraag: 'Wat als iedereen hetzelfde voorspelt?',
            kort: 'Als iedereen hetzelfde voorspelt, maakt die vraag geen verschil in de stand: iedereen krijgt dezelfde punten, of niemand. Daarom kan de poulebaas in Predict the Race contrair voorspellen aanzetten. Een goed antwoord op een losse vraag telt dan zwaarder naarmate minder spelers hetzelfde zeiden, tot bijna dubbel. De top 10 en de teamgenoot-duels tellen gewoon.',
            contrairtabel: { bijschrift: 'Wat een goede winnaar oplevert als {contrairSpelers} spelers de vraag invulden',
              kop: ['Zeiden hetzelfde', 'Telt', 'Punten'], rij: '{zelfde} van de {spelers}' },
            tekst: [
              'De app telt hoeveel spelers de vraag zelf invulden, en hoeveel van hen hetzelfde zeiden als jij. Het deel dat iets anders zei, komt er als extra bij. Was je de enige van de {contrairSpelers}, dan telt je goede antwoord {contrairEen} keer, en is een goede winnaar {contrairPunten} punten waard in plaats van {winnaar}. Zei iedereen hetzelfde, dan verandert er niets. De vermenigvuldiger wordt afgerond op één decimaal, zodat het getal op het racescherm ook het getal is waarmee de app rekent.',
              'Wat de app zelf invulde, telt niet mee: dat antwoord is van niemand, en het zou jouw keuze minder zeldzaam maken dan hij was. Vulde maar één speler de vraag in, dan is er niets zeldzaams aan. En de regel werkt niet terug: hij geldt pas voor weekenden die beginnen nadat de poulebaas hem aanzette.',
              'De top 10 en de duels doen bewust niet mee. Bij een top 10 zou elke plek een eigen zeldzaamheid krijgen, en dan kan niemand meer navertellen waar zijn punten vandaan komen. Een puntentelling die je niet kunt uitleggen, maakt meer kapot dan een vraag die geen verschil maakt.',
            ],
          },
          {
            id: 'safety-cars',
            vraag: 'Hoe vaak komt de safety car in een race?',
            kort: 'Van de {scRaces} Formule 1-races sinds {scVanaf} hadden er {scMet} minstens één safety car, de virtuele safety car meegeteld. Gemiddeld kwam de safety car {scGemiddeld} keer per race de baan op, en {rvMet} races werden stilgelegd met een rode vlag. Zo telt Predict the Race ook bij de vraag hoeveel safety cars er komen. Hieronder de cijfers per circuit, tot en met {scTot}.',
            circuittabel: { bijschrift: 'Per circuit: races sinds {scVanaf}, safety cars (de virtuele safety car meegeteld) en races met een rode vlag, tot en met {scTot}',
              kop: ['Circuit', 'Races', 'Safety cars', 'Rode vlag'] },
            tekst: [
              'Het vaakst kwam de safety car in {scMeestPlek}: {scMeestAantal} keer in {scMeestRaces} races. Het minst in {scMinstPlek}: {scMinstAantal} keer in {scMinstRaces} races. Alleen circuits met minstens {scMinRaces} races tellen hier mee.',
              'De cijfers komen uit de berichten van de wedstrijdleiding bij OpenF1 en zijn geteld met dezelfde regels als de app. Afgelaste races tellen niet mee. De tabel wordt automatisch bijgewerkt.',
            ],
          },
          {
            id: 'gelijk',
            vraag: 'Wat als twee spelers evenveel punten hebben?',
            kort: 'Twee spelers met evenveel punten delen de plek. Staan ze samen op twee, dan is de volgende speler vierde: 1, 2, 2, 4. Zo telt Predict the Race de stand. Bij de weekendwinnaar werkt het net zo: hebben twee spelers dezelfde hoogste score, dan hebben ze dat weekend allebei gewonnen.',
          },
          {
            id: 'jokers',
            vraag: 'Wat doet een joker met je punten?',
            kort: 'Een joker verdubbelt al je punten van één weekend: de top 10\'s, de sprint en de losse vragen. De seizoensvragen tellen nooit dubbel. Staan jokers aan in je poule, dan heeft iedereen er standaard {jokers} per seizoen, en je zet een joker voordat het weekend begint.',
          },
        ],
        faq: [
          ['Kan ik de punten per vraag zelf aanpassen?', 'Nee. De punten per vraag liggen vast, zodat een score in elke poule hetzelfde betekent. Als poulebaas kies je wel welke vragen meetellen en of je met jokers speelt.'],
          ['Telt een coureur buiten de top 10 mee?', 'Ja. Je voorspelt een top 10, maar de hele uitslag telt. Zet je iemand op P10 en wordt hij elfde, dan krijg je {bijna} punten.'],
          ['Wat krijg je voor een coureur die uitvalt?', 'Niets, als hij geen plek in de uitslag krijgt. Dat is pech, maar het is dezelfde pech voor iedereen die hem in zijn top 10 had.'],
          ['Wanneer staan de punten erin?', 'Na elke kwalificatie en race, zodra de officiële uitslag binnen is. Verandert de uitslag kort na de race nog door een straf, dan rekent de app opnieuw.'],
        ],
        leesOok: [
          ['niveaus', 'Simpel, Klassiek of Gevorderd: welke vragen bij elk niveau horen'],
          ['faq', 'Veelgestelde vragen over de app'],
        ],
      },
      en: {
        pad: 'en/f1-prediction-scoring-system',
        titel: 'F1 prediction scoring systems explained | Predict the Race',
        omschrijving: 'Four ways to score an F1 prediction league, what each gets right and wrong, a fully worked example, and the scoring Predict the Race uses.',
        kop: 'F1 prediction scoring systems',
        kort: 'Most F1 prediction leagues score every driver in your top 10, with more points the closer he finishes to where you put him. Predict the Race gives {exact} points for the exact spot, {bijna} for one place off and {twee} for two places off. Scoring exact hits only sounds strict but fair; in practice almost nobody scores and luck decides the table.',
        teaser: 'Scoring systems explained, with a worked example',
        secties: [
          {
            id: 'systems',
            vraag: 'What scoring systems are there?',
            kort: 'There are four common scoring systems for F1 predictions: exact spot only, points by distance, real championship points, and winner and podium only. What sets them apart is whether nearly right still scores. Predict the Race scores by distance, so anyone who reads the field well still scores when the order comes out slightly different.',
            punten: [
              ['Exact position only', 'You score when a driver finishes exactly where you put him. Easy to explain, but a top 10 that is one place off everywhere scores nothing. A few races in, everyone is close to zero and one lucky guess decides the league.'],
              ['Points by distance', '{exact} points for the exact spot, {bijna} for one place off, {twee} for two places off, nothing beyond that. This is how Predict the Race scores. If you read the field well, you score even when the order shuffles a little. The catch is the maths: by hand, that is ten drivers per session for every player.'],
              ['Real F1 points', 'For each driver in the right spot you get the points he gets in the championship: {wkPunten}. It feels like the real thing, but a correct P10 is worth {wkLaatste} point and the winner {wkEerste}. Miss the winner and you are miles behind, and the bottom half of your top 10 barely matters.'],
              ['Winner and podium only', 'Quick to fill in, but most people pick the same favourite. Everyone ends up with roughly the same score and there is little to play for.'],
            ],
            tekst: [
              'Extra questions such as pole position or fastest lap come on top, each worth a fixed number of points when you get it right.',
            ],
          },
          {
            id: 'worked-example',
            vraag: 'How do you score a top 10?',
            kort: 'Score a top 10 driver by driver: {exact} points if he finishes exactly where you put him, {een} for one place off, {twee} for two places off, and nothing after that. Add up the ten rows; a perfect top 10 is worth {perfect}. Below is a made-up race, scored with the same code the app uses.',
            rekenvoorbeeld: { bijschrift: 'A made-up race: your top 10 against the result',
              kop: ['Driver', 'Your pick', 'Result', 'Points'], geenPlek: 'DNF', totaal: 'Total' },
            voorbeeld: '{voorbeeldTotaal} out of {top10} points. Counting exact hits only, it would have been {voorbeeldExact}, even though {voorbeeldDichtbij} of the 10 drivers finished within one place of the prediction.',
            tekst: [
              'Look at Albon: predicted P10, finished eleventh. That is one place off, so {bijna} points, even though he ended up outside the top 10. Sainz retired and has no classified position, so he scores zero.',
            ],
          },
          {
            id: 'nearly-right',
            vraag: 'Why should nearly right count?',
            kort: 'Nearly right should count because an F1 result always has some luck in it: one slow pit stop and your P4 becomes P5. If only the exact spot counts, the luckiest player wins. If distance counts, the player who reads the field best wins, and that is what a prediction league should be about.',
            tekst: [
              'It also keeps the league alive. A bad weekend still earns you something, and the leader stays within reach.',
            ],
          },
          {
            id: 'extra-questions',
            vraag: 'What else can you score?',
            kort: 'Besides the two top 10s, you can score extra questions every weekend, such as the winner, pole position and fastest lap, plus {nSeizoen} season questions for the whole year. Each one is worth a fixed number of points for a right answer: the winner {winnaar}, pole position {pole}.',
            vragentabel: true,
            tekst: [
              'How much a weekend is worth depends on the level the league admin picks: {simpel} points on Simple, {klassiek} on Classic and {gevorderd} on Advanced. On sprint weekends the sprint comes on top, and the season questions are settled at the end of the season.',
            ],
          },
          {
            id: 'same-picks',
            vraag: 'What if everyone predicts the same thing?',
            kort: 'If everyone predicts the same thing, that question makes no difference to the standings: everyone gets the same points, or nobody does. For that case the league admin in Predict the Race can switch on contrarian picks. A right answer to an extra question then counts for more the fewer players said the same, up to almost double. The top 10 and the teammate duels score as usual.',
            contrairtabel: { bijschrift: 'What a right winner is worth when {contrairSpelers} players answered',
              kop: ['Said the same', 'Counts', 'Points'], rij: '{zelfde} of {spelers}' },
            tekst: [
              'The app counts how many players answered the question themselves, and how many of them said the same as you. The share that said something else comes on top. If you were the only one of {contrairSpelers}, your right answer counts {contrairEen} times, and a right winner is worth {contrairPunten} points instead of {winnaar}. If everyone said the same, nothing changes. The multiplier is rounded to one decimal, so the number on the race screen is the number the app scores with.',
              'Answers the app filled in itself do not count: they belong to nobody, and they would make your pick look less rare than it was. If only one player answered, there is nothing rare about it. And the rule does not work backwards: it only applies to weekends that start after the league admin switched it on.',
              'The top 10 and the duels are left out on purpose. In a top 10, every position would get its own rarity, and nobody could explain where their points came from. A scoring system you cannot explain does more damage than a question that makes no difference.',
            ],
          },
          {
            id: 'safety-cars',
            vraag: 'How often is there a safety car in an F1 race?',
            kort: 'Of the {scRaces} Formula 1 races since {scVanaf}, {scMet} had at least one safety car, counting the virtual safety car. On average the safety car came out {scGemiddeld} times per race, and {rvMet} races were stopped with a red flag. That is also how Predict the Race scores the question on the number of safety cars. Below are the numbers per circuit, up to {scTot}.',
            circuittabel: { bijschrift: 'Per circuit: races since {scVanaf}, safety cars (virtual included) and races with a red flag, up to {scTot}',
              kop: ['Circuit', 'Races', 'Safety cars', 'Red flag'] },
            tekst: [
              'The safety car came out most often in {scMeestPlek}: {scMeestAantal} times in {scMeestRaces} races. The fewest were in {scMinstPlek}: {scMinstAantal} in {scMinstRaces} races. Only circuits with at least {scMinRaces} races count here.',
              'The numbers come from the race control messages in OpenF1, counted with the same rules as the app. Cancelled races are not included. The table updates automatically.',
            ],
          },
          {
            id: 'ties',
            vraag: 'What happens when two players are level on points?',
            kort: 'Two players on the same points share the position. If they are level in second, the next player is fourth: 1, 2, 2, 4. Predict the Race ranks the standings that way. The weekend winner works the same: if two players share the top score, they both won that weekend.',
          },
          {
            id: 'jokers',
            vraag: 'What does a joker do to your points?',
            kort: 'A joker doubles everything you score in one weekend: both top 10s, the sprint and the extra questions. Season questions are never doubled. With jokers switched on in your league, everyone gets {jokers} per season by default, and you play a joker before the weekend starts.',
          },
        ],
        faq: [
          ['Can I change the points per question?', 'No. The points per question are fixed, so a score means the same thing in every league. As the league admin you choose which questions count and whether jokers are on.'],
          ['Does a driver outside the top 10 still count?', 'Yes. You predict a top 10, but the whole result counts. Put someone in P10, he finishes eleventh, and you get {bijna} points.'],
          ['What do you get for a driver who retires?', 'Nothing, if he has no classified position. That is bad luck, but it is the same bad luck for everyone who had him in their top 10.'],
          ['When do the points show up?', 'After every qualifying session and race, as soon as the official result is in. If a penalty changes the result shortly after the race, the app scores it again.'],
        ],
        leesOok: [
          ['niveaus', 'Simple, Classic or Advanced: which questions each level includes'],
          ['faq', 'Frequently asked questions about the app'],
        ],
      },
      de: {
        pad: 'de/f1-tippspiel-punktesystem',
        titel: 'Punktesystem für ein F1-Tippspiel | Predict the Race',
        omschrijving: 'Vier Arten, Punkte in einem F1-Tippspiel zu vergeben, mit Vor- und Nachteilen, einem durchgerechneten Beispiel und dem System von Predict the Race.',
        kop: 'Punktesystem für ein F1-Tippspiel',
        kort: 'In den meisten F1-Tippspielen gibt es Punkte für jeden Fahrer in deiner Top 10, und je näher er an deinem Platz landet, desto mehr. Predict the Race gibt {exact} Punkte für den genauen Platz, {bijna} bei einem Platz daneben und {twee} bei zwei Plätzen daneben. Nur genaue Treffer zu zählen klingt streng und fair, aber dann punktet fast niemand und das Glück entscheidet die Tabelle.',
        teaser: 'Das Punktesystem erklärt, mit Rechenbeispiel',
        secties: [
          {
            id: 'systeme',
            vraag: 'Welche Punktesysteme gibt es?',
            kort: 'Für F1-Tipps gibt es vier gängige Punktesysteme: nur der genaue Platz, Punkte nach Abstand, echte WM-Punkte, und nur Sieger und Podium. Der Unterschied liegt darin, ob knapp daneben noch zählt. Predict the Race zählt nach Abstand, damit auch punktet, wer das Feld gut einschätzt, wenn die Reihenfolge leicht anders ausfällt.',
            punten: [
              ['Nur der genaue Platz', 'Du punktest, wenn ein Fahrer genau auf deinem Platz ankommt. Leicht zu erklären, aber eine Top 10, die überall einen Platz daneben liegt, bringt nichts. Nach ein paar Rennen stehen alle fast bei null, und ein Glückstreffer entscheidet die Tipprunde.'],
              ['Punkte nach Abstand', '{exact} Punkte für den genauen Platz, {bijna} bei einem Platz daneben, {twee} bei zwei Plätzen daneben, danach nichts. So zählt Predict the Race. Wer das Feld gut einschätzt, punktet auch, wenn die Reihenfolge etwas durcheinandergerät. Der Haken ist das Rechnen: Von Hand sind das zehn Fahrer pro Session für jeden Spieler.'],
              ['Echte WM-Punkte', 'Für jeden Fahrer auf dem richtigen Platz bekommst du die Punkte, die er in der WM bekommt: {wkPunten}. Das fühlt sich echt an, aber ein richtiger P10 ist {wkLaatste} Punkt wert und der Sieger {wkEerste}. Wer den Sieger verpasst, liegt weit zurück, und die untere Hälfte deiner Top 10 zählt kaum.'],
              ['Nur Sieger und Podium', 'Schnell ausgefüllt, aber die meisten tippen denselben Favoriten. Alle landen bei ungefähr derselben Punktzahl, und es gibt wenig zu gewinnen.'],
            ],
            tekst: [
              'Zusatzfragen wie Pole-Position oder schnellste Runde kommen obendrauf, jede mit einer festen Punktzahl für eine richtige Antwort.',
            ],
          },
          {
            id: 'rechenbeispiel',
            vraag: 'Wie wertet man eine Top 10 aus?',
            kort: 'Werte eine Top 10 Fahrer für Fahrer aus: {exact} Punkte, wenn er genau auf deinem Platz landet, {een} bei einem Platz daneben, {twee} bei zwei Plätzen daneben, danach nichts. Zähl die zehn Zeilen zusammen; eine perfekte Top 10 ist {perfect} wert. Unten ein erfundenes Rennen, gerechnet mit demselben Code wie die App.',
            rekenvoorbeeld: { bijschrift: 'Ein erfundenes Rennen: deine Top 10 gegen das Ergebnis',
              kop: ['Fahrer', 'Dein Tipp', 'Ergebnis', 'Punkte'], geenPlek: 'Ausfall', totaal: 'Gesamt' },
            voorbeeld: '{voorbeeldTotaal} von {top10} Punkten. Nur mit genauen Treffern wären es {voorbeeldExact} gewesen, obwohl {voorbeeldDichtbij} der 10 Fahrer höchstens einen Platz neben dem Tipp landeten.',
            tekst: [
              'Schau dir Albon an: getippt auf P10, ins Ziel gekommen als Elfter. Das ist ein Platz daneben, also {bijna} Punkte, obwohl er außerhalb der Top 10 landete. Sainz ist ausgefallen und hat keine gewertete Position, also gibt es für ihn nichts.',
            ],
          },
          {
            id: 'knapp-daneben',
            vraag: 'Warum sollte knapp daneben zählen?',
            kort: 'Knapp daneben sollte zählen, weil in einem F1-Ergebnis immer Glück steckt: ein langsamer Boxenstopp, und aus deinem P4 wird P5. Zählt nur der genaue Platz, gewinnt der Glücklichste. Zählt der Abstand, gewinnt, wer das Feld am besten einschätzt, und darum sollte es in einem Tippspiel gehen.',
            tekst: [
              'Es hält die Tipprunde auch lebendig. Ein schlechtes Wochenende bringt trotzdem etwas, und der Spitzenreiter bleibt in Reichweite.',
            ],
          },
          {
            id: 'zusatzfragen',
            vraag: 'Wofür gibt es sonst noch Punkte?',
            kort: 'Neben den beiden Top 10 gibt es jedes Wochenende Zusatzfragen wie Rennsieger, Pole-Position und schnellste Runde, dazu {nSeizoen} Saisonfragen für das ganze Jahr. Jede bringt eine feste Punktzahl für eine richtige Antwort: der Rennsieger {winnaar}, die Pole-Position {pole}.',
            vragentabel: true,
            tekst: [
              'Wie viel ein Wochenende wert ist, hängt vom Niveau ab, das der Administrator wählt: {simpel} Punkte bei Einfach, {klassiek} bei Klassisch und {gevorderd} bei Fortgeschritten. An Sprint-Wochenenden kommt der Sprint dazu, und die Saisonfragen werden am Saisonende gewertet.',
            ],
          },
          {
            id: 'gleiche-tipps',
            vraag: 'Was, wenn alle dasselbe tippen?',
            kort: 'Wenn alle dasselbe tippen, ändert diese Frage nichts an der Tabelle: Alle bekommen dieselben Punkte oder keiner. Für diesen Fall kann der Administrator in Predict the Race "gegen den Strom" einschalten. Eine richtige Antwort auf eine Zusatzfrage zählt dann umso mehr, je weniger Spieler dasselbe gesagt haben, bis fast doppelt. Die Top 10 und die Teamduelle zählen wie gewohnt.',
            contrairtabel: { bijschrift: 'Was ein richtiger Rennsieger wert ist, wenn {contrairSpelers} Spieler geantwortet haben',
              kop: ['Dasselbe gesagt', 'Zählt', 'Punkte'], rij: '{zelfde} von {spelers}' },
            tekst: [
              'Die App zählt, wie viele Spieler die Frage selbst beantwortet haben und wie viele davon dasselbe gesagt haben wie du. Der Anteil, der etwas anderes gesagt hat, kommt obendrauf. Warst du der Einzige von {contrairSpelers}, wird deine richtige Antwort mit {contrairEen} multipliziert, und ein richtiger Rennsieger ist {contrairPunten} Punkte wert statt {winnaar}. Haben alle dasselbe gesagt, ändert sich nichts. Der Faktor wird auf eine Nachkommastelle gerundet, damit die Zahl auf dem Rennbildschirm die Zahl ist, mit der die App rechnet.',
              'Antworten, die die App selbst ausgefüllt hat, zählen nicht: Sie gehören niemandem und würden deinen Tipp weniger selten aussehen lassen, als er war. Hat nur ein Spieler geantwortet, ist daran nichts selten. Und die Regel wirkt nicht rückwirkend: Sie gilt nur für Wochenenden, die beginnen, nachdem der Administrator sie eingeschaltet hat.',
              'Die Top 10 und die Duelle sind absichtlich ausgenommen. In einer Top 10 bekäme jeder Platz seine eigene Seltenheit, und niemand könnte erklären, woher seine Punkte kommen. Ein Punktesystem, das man nicht erklären kann, schadet mehr als eine Frage, die nichts ändert.',
            ],
          },
          {
            id: 'safety-cars',
            vraag: 'Wie oft gibt es ein Safety Car in einem F1-Rennen?',
            kort: 'Von den {scRaces} Formel-1-Rennen seit {scVanaf} hatten {scMet} mindestens ein Safety Car, das virtuelle Safety Car mitgezählt. Im Schnitt kam das Safety Car {scGemiddeld}-mal pro Rennen, und {rvMet} Rennen wurden mit einer roten Flagge unterbrochen. Genauso wertet Predict the Race die Frage nach der Zahl der Safety-Car-Phasen. Unten die Zahlen pro Strecke, Stand {scTot}.',
            circuittabel: { bijschrift: 'Pro Strecke: Rennen seit {scVanaf}, Safety Cars (virtuelle mitgezählt) und Rennen mit roter Flagge, Stand {scTot}',
              kop: ['Strecke', 'Rennen', 'Safety Cars', 'Rote Flagge'] },
            tekst: [
              'Am häufigsten kam das Safety Car in {scMeestPlek}: {scMeestAantal}-mal in {scMeestRaces} Rennen. Am seltensten in {scMinstPlek}: {scMinstAantal}-mal in {scMinstRaces} Rennen. Es zählen nur Strecken mit mindestens {scMinRaces} Rennen.',
              'Die Zahlen stammen aus den Meldungen der Rennleitung in OpenF1, gezählt nach denselben Regeln wie in der App. Abgesagte Rennen sind nicht dabei. Die Tabelle aktualisiert sich automatisch.',
            ],
          },
          {
            id: 'gleichstand',
            vraag: 'Was passiert bei Punktgleichheit?',
            kort: 'Zwei Spieler mit gleich vielen Punkten teilen sich den Platz. Liegen zwei gleichauf auf Platz zwei, ist der Nächste Vierter: 1, 2, 2, 4. Genau so ordnet Predict the Race die Tabelle. Beim Wochenendsieger ist es genauso: Teilen sich zwei Spieler die höchste Punktzahl, haben beide dieses Wochenende gewonnen.',
          },
          {
            id: 'joker',
            vraag: 'Was macht ein Joker mit deinen Punkten?',
            kort: 'Ein Joker verdoppelt alles, was du an einem Wochenende holst: beide Top 10, den Sprint und die Zusatzfragen. Saisonfragen werden nie verdoppelt. Sind Joker in deiner Tipprunde eingeschaltet, bekommt jeder standardmäßig {jokers} pro Saison, und du setzt einen Joker vor Beginn des Wochenendes.',
          },
        ],
        faq: [
          ['Kann ich die Punkte pro Frage ändern?', 'Nein. Die Punkte pro Frage sind fest, damit eine Punktzahl in jeder Tipprunde dasselbe bedeutet. Als Administrator wählst du, welche Fragen zählen und ob Joker an sind.'],
          ['Zählt ein Fahrer außerhalb der Top 10 noch?', 'Ja. Du tippst eine Top 10, aber das ganze Ergebnis zählt. Setzt du jemanden auf P10 und er wird Elfter, bekommst du {bijna} Punkte.'],
          ['Was bekommt man für einen Fahrer, der ausfällt?', 'Nichts, wenn er keine gewertete Position hat. Das ist Pech, aber dasselbe Pech für alle, die ihn in ihrer Top 10 hatten.'],
          ['Wann erscheinen die Punkte?', 'Nach jedem Qualifying und jedem Rennen, sobald das offizielle Ergebnis da ist. Ändert eine Strafe das Ergebnis kurz nach dem Rennen, rechnet die App neu.'],
        ],
        leesOok: [
          ['niveaus', 'Einfach, Klassisch oder Fortgeschritten: welche Fragen jedes Niveau hat'],
          ['faq', 'Häufige Fragen zur App'],
        ],
      },
      fr: {
        pad: 'fr/bareme-pronostics-f1',
        titel: 'Barème de points pour des pronostics F1 | Predict the Race',
        omschrijving: 'Quatre façons de compter les points de pronostics F1, leurs forces et leurs défauts, un exemple entièrement calculé et le barème de Predict the Race.',
        kop: 'Le barème de points des pronostics F1',
        kort: 'La plupart des ligues de pronostics F1 comptent chaque pilote de votre top 10, avec plus de points quand il finit près de la place prévue. Predict the Race donne {exact} points pour la place exacte, {bijna} à une place près et {twee} à deux places près. Ne compter que les places exactes semble strict mais juste ; en pratique presque personne ne marque et la chance décide du classement.',
        teaser: 'Le barème expliqué, avec un exemple calculé',
        secties: [
          {
            id: 'baremes',
            vraag: 'Quels barèmes existe-t-il ?',
            kort: 'Il existe quatre barèmes courants pour les pronostics F1 : la place exacte seulement, les points selon l\'écart, les vrais points du championnat, et le vainqueur et le podium seulement. Ce qui les distingue, c\'est si le presque juste rapporte encore. Predict the Race compte selon l\'écart, pour que celui qui lit bien la course marque même quand l\'ordre change un peu.',
            punten: [
              ['Place exacte seulement', 'Vous marquez quand un pilote finit exactement à la place prévue. Facile à expliquer, mais un top 10 décalé d\'une place partout ne rapporte rien. Après quelques courses, tout le monde est proche de zéro et un coup de chance décide de la ligue.'],
              ['Points selon l\'écart', '{exact} points pour la place exacte, {bijna} à une place près, {twee} à deux places près, rien au-delà. C\'est le barème de Predict the Race. Si vous lisez bien la course, vous marquez même quand l\'ordre bouge un peu. Le hic, c\'est le calcul : à la main, ce sont dix pilotes par séance pour chaque joueur.'],
              ['Vrais points F1', 'Pour chaque pilote à la bonne place, vous recevez les points qu\'il marque au championnat : {wkPunten}. Ça ressemble au vrai, mais un P10 juste vaut {wkLaatste} point et le vainqueur {wkEerste}. Manquez le vainqueur et vous êtes loin derrière, et le bas de votre top 10 ne compte presque pas.'],
              ['Vainqueur et podium seulement', 'Vite rempli, mais la plupart choisissent le même favori. Tout le monde finit avec à peu près le même score et il y a peu d\'enjeu.'],
            ],
            tekst: [
              'Les questions supplémentaires comme la pole position ou le meilleur tour s\'ajoutent, chacune avec un nombre de points fixe pour une bonne réponse.',
            ],
          },
          {
            id: 'exemple',
            vraag: 'Comment compter les points d\'un top 10 ?',
            kort: 'Comptez un top 10 pilote par pilote : {exact} points s\'il finit exactement à la place prévue, {een} à une place près, {twee} à deux places près, et rien au-delà. Additionnez les dix lignes ; un top 10 parfait vaut {perfect}. Ci-dessous, une course inventée, calculée avec le même code que l\'appli.',
            rekenvoorbeeld: { bijschrift: 'Une course inventée : votre top 10 face au résultat',
              kop: ['Pilote', 'Prévu', 'Arrivée', 'Points'], geenPlek: 'Abandon', totaal: 'Total' },
            voorbeeld: '{voorbeeldTotaal} sur {top10} points. Avec les places exactes seulement, cela aurait fait {voorbeeldExact}, alors que {voorbeeldDichtbij} des 10 pilotes ont fini à une place près du pronostic.',
            tekst: [
              'Regardez Albon : pronostiqué P10, arrivé onzième. C\'est une place d\'écart, donc {bijna} points, même s\'il a fini hors du top 10. Sainz a abandonné et n\'a pas de position classée, il ne rapporte donc rien.',
            ],
          },
          {
            id: 'presque-juste',
            vraag: 'Pourquoi le presque juste doit-il compter ?',
            kort: 'Le presque juste doit compter parce qu\'un résultat de F1 contient toujours une part de chance : un arrêt au stand lent et votre P4 devient P5. Si seule la place exacte compte, le plus chanceux gagne. Si l\'écart compte, c\'est celui qui lit le mieux la course qui gagne, et c\'est tout l\'intérêt d\'une ligue de pronostics.',
            tekst: [
              'Cela garde aussi la ligue en vie. Un mauvais week-end rapporte quand même quelque chose, et le leader reste à portée.',
            ],
          },
          {
            id: 'questions-supplementaires',
            vraag: 'Que peut-on marquer d\'autre ?',
            kort: 'En plus des deux top 10, vous pouvez marquer chaque week-end avec des questions supplémentaires, comme le vainqueur, la pole position et le meilleur tour, et avec {nSeizoen} questions de saison pour toute l\'année. Chacune vaut un nombre de points fixe pour une bonne réponse : le vainqueur {winnaar}, la pole position {pole}.',
            vragentabel: true,
            tekst: [
              'Ce que vaut un week-end dépend du niveau choisi par l\'administrateur : {simpel} points en Simple, {klassiek} en Classique et {gevorderd} en Avancé. Les week-ends sprint, le sprint s\'ajoute, et les questions de saison sont réglées en fin de saison.',
            ],
          },
          {
            id: 'memes-pronostics',
            vraag: 'Et si tout le monde pronostique la même chose ?',
            kort: 'Si tout le monde pronostique la même chose, cette question ne change rien au classement : tout le monde marque les mêmes points, ou personne. Pour ce cas, l\'administrateur peut activer le mode à contre-courant dans Predict the Race. Une bonne réponse à une question supplémentaire compte alors d\'autant plus que peu de joueurs ont dit la même chose, jusqu\'à presque le double. Le top 10 et les duels entre coéquipiers comptent comme d\'habitude.',
            contrairtabel: { bijschrift: 'Ce que vaut un bon vainqueur quand {contrairSpelers} joueurs ont répondu',
              kop: ['Même réponse', 'Compte', 'Points'], rij: '{zelfde} sur {spelers}' },
            tekst: [
              'L\'appli compte combien de joueurs ont répondu eux-mêmes à la question, et combien d\'entre eux ont dit la même chose que vous. La part qui a dit autre chose s\'ajoute. Si vous étiez le seul sur {contrairSpelers}, votre bonne réponse compte {contrairEen} fois, et un bon vainqueur vaut {contrairPunten} points au lieu de {winnaar}. Si tout le monde a dit la même chose, rien ne change. Le multiplicateur est arrondi à une décimale, donc le chiffre affiché sur l\'écran de la course est celui avec lequel l\'appli compte.',
              'Les réponses remplies par l\'appli elle-même ne comptent pas : elles n\'appartiennent à personne et feraient paraître votre choix moins rare qu\'il ne l\'était. Si un seul joueur a répondu, il n\'y a rien de rare. Et la règle n\'est pas rétroactive : elle ne s\'applique qu\'aux week-ends qui commencent après son activation par l\'administrateur.',
              'Le top 10 et les duels sont laissés de côté exprès. Dans un top 10, chaque position aurait sa propre rareté, et personne ne pourrait expliquer d\'où viennent ses points. Un barème qu\'on ne peut pas expliquer fait plus de dégâts qu\'une question qui ne change rien.',
            ],
          },
          {
            id: 'safety-cars',
            vraag: 'Combien de safety cars y a-t-il dans une course de F1 ?',
            kort: 'Sur les {scRaces} courses de Formule 1 depuis {scVanaf}, {scMet} ont connu au moins un safety car, safety car virtuel compris. En moyenne, le safety car est sorti {scGemiddeld} fois par course, et {rvMet} courses ont été interrompues par un drapeau rouge. C\'est aussi ainsi que Predict the Race compte la question sur le nombre de safety cars. Ci-dessous, les chiffres par circuit, jusqu\'au {scTot}.',
            circuittabel: { bijschrift: 'Par circuit : courses depuis {scVanaf}, safety cars (virtuels compris) et courses avec drapeau rouge, jusqu\'au {scTot}',
              kop: ['Circuit', 'GP', 'Safety cars', 'Drapeau rouge'] },
            tekst: [
              'Le safety car est sorti le plus souvent à {scMeestPlek} : {scMeestAantal} fois en {scMeestRaces} courses. Le moins souvent à {scMinstPlek} : {scMinstAantal} fois en {scMinstRaces} courses. Seuls les circuits avec au moins {scMinRaces} courses comptent ici.',
              'Les chiffres viennent des messages de la direction de course dans OpenF1, comptés avec les mêmes règles que l\'appli. Les courses annulées ne sont pas incluses. Le tableau se met à jour automatiquement.',
            ],
          },
          {
            id: 'egalite',
            vraag: 'Que se passe-t-il quand deux joueurs sont à égalité de points ?',
            kort: 'Deux joueurs avec les mêmes points partagent la place. S\'ils sont à égalité à la deuxième place, le suivant est quatrième : 1, 2, 2, 4. Predict the Race établit le classement ainsi. Le vainqueur du week-end fonctionne pareil : si deux joueurs partagent le meilleur score, ils ont tous les deux gagné ce week-end.',
          },
          {
            id: 'jokers',
            vraag: 'Que fait un joker à vos points ?',
            kort: 'Un joker double tout ce que vous marquez en un week-end : les deux top 10, le sprint et les questions supplémentaires. Les questions de saison ne sont jamais doublées. Si les jokers sont activés dans votre ligue, chacun en reçoit {jokers} par saison par défaut, et vous posez un joker avant le début du week-end.',
          },
        ],
        faq: [
          ['Puis-je changer les points par question ?', 'Non. Les points par question sont fixes, pour qu\'un score signifie la même chose dans chaque ligue. En tant qu\'administrateur, vous choisissez les questions qui comptent et si les jokers sont activés.'],
          ['Un pilote hors du top 10 compte-t-il encore ?', 'Oui. Vous pronostiquez un top 10, mais tout le résultat compte. Mettez quelqu\'un en P10, il finit onzième, et vous recevez {bijna} points.'],
          ['Que rapporte un pilote qui abandonne ?', 'Rien, s\'il n\'a pas de position classée. C\'est de la malchance, mais la même pour tous ceux qui l\'avaient dans leur top 10.'],
          ['Quand les points apparaissent-ils ?', 'Après chaque séance de qualifications et chaque course, dès que le résultat officiel est là. Si une pénalité change le résultat peu après la course, l\'appli recompte.'],
        ],
        leesOok: [
          ['niveaus', 'Simple, Classique ou Avancé : les questions de chaque niveau'],
          ['faq', 'Questions fréquentes sur l\'appli'],
        ],
      },
      es: {
        pad: 'es/puntuacion-porra-f1',
        titel: 'Sistema de puntos para una porra de F1 | Predict the Race',
        omschrijving: 'Cuatro formas de puntuar una porra de F1, lo bueno y lo malo de cada una, un ejemplo calculado de principio a fin y la puntuación de Predict the Race.',
        kop: 'Sistema de puntos para una porra de F1',
        kort: 'La mayoría de las porras de F1 puntúan cada piloto de tu top 10, con más puntos cuanto más cerca termina de donde lo pusiste. Predict the Race da {exact} puntos por la posición exacta, {bijna} por una posición de diferencia y {twee} por dos. Puntuar solo los aciertos exactos suena estricto pero justo; en la práctica casi nadie puntúa y la suerte decide la clasificación.',
        teaser: 'Los sistemas de puntos explicados, con un ejemplo calculado',
        secties: [
          {
            id: 'sistemas',
            vraag: '¿Qué sistemas de puntos hay?',
            kort: 'Hay cuatro sistemas de puntos habituales para las predicciones de F1: solo la posición exacta, puntos por distancia, los puntos reales del campeonato, y solo ganador y podio. Lo que los diferencia es si casi acertar todavía puntúa. Predict the Race puntúa por distancia, para que quien lee bien la carrera sume aunque el orden salga un poco distinto.',
            punten: [
              ['Solo la posición exacta', 'Puntúas cuando un piloto termina justo donde lo pusiste. Fácil de explicar, pero un top 10 que falla por una posición en todas no suma nada. A las pocas carreras todos están cerca de cero y un golpe de suerte decide la liga.'],
              ['Puntos por distancia', '{exact} puntos por la posición exacta, {bijna} por una de diferencia, {twee} por dos, nada más allá. Así puntúa Predict the Race. Si lees bien la carrera, sumas aunque el orden cambie un poco. La pega son las cuentas: a mano son diez pilotos por sesión para cada jugador.'],
              ['Puntos reales de F1', 'Por cada piloto en la posición correcta recibes los puntos que él suma en el campeonato: {wkPunten}. Parece lo auténtico, pero acertar el P10 vale {wkLaatste} punto y el ganador {wkEerste}. Si fallas el ganador te quedas muy atrás, y la mitad de abajo de tu top 10 apenas cuenta.'],
              ['Solo ganador y podio', 'Se rellena rápido, pero casi todos eligen al mismo favorito. Todos acaban con más o menos la misma puntuación y hay poco en juego.'],
            ],
            tekst: [
              'Las preguntas extra como la pole position o la vuelta rápida se suman aparte, cada una con un número fijo de puntos si aciertas.',
            ],
          },
          {
            id: 'ejemplo',
            vraag: '¿Cómo se puntúa un top 10?',
            kort: 'Un top 10 se puntúa piloto a piloto: {exact} puntos si termina justo donde lo pusiste, {een} por una posición de diferencia, {twee} por dos, y nada más allá. Suma las diez filas; un top 10 perfecto vale {perfect}. Abajo hay una carrera inventada, puntuada con el mismo código que usa la app.',
            rekenvoorbeeld: { bijschrift: 'Una carrera inventada: tu top 10 frente al resultado',
              kop: ['Piloto', 'Predicho', 'Final', 'Puntos'], geenPlek: 'Retiro', totaal: 'Total' },
            voorbeeld: '{voorbeeldTotaal} de {top10} puntos. Contando solo los aciertos exactos habrían sido {voorbeeldExact}, aunque {voorbeeldDichtbij} de los 10 pilotos terminaron a una posición o menos de la predicción.',
            tekst: [
              'Fíjate en Albon: predicho P10, terminó undécimo. Es una posición de diferencia, así que {bijna} puntos, aunque acabó fuera del top 10. Sainz abandonó y no tiene posición clasificada, así que no suma nada.',
            ],
          },
          {
            id: 'casi',
            vraag: '¿Por qué debería contar casi acertar?',
            kort: 'Casi acertar debería contar porque un resultado de F1 siempre tiene algo de suerte: una parada lenta y tu P4 se convierte en P5. Si solo cuenta la posición exacta, gana el que más suerte tiene. Si cuenta la distancia, gana quien mejor lee la carrera, y de eso debería tratar una porra.',
            tekst: [
              'Además mantiene viva la liga. Un mal fin de semana todavía te da algo, y el líder sigue a tiro.',
            ],
          },
          {
            id: 'preguntas-extra',
            vraag: '¿Qué más se puede puntuar?',
            kort: 'Además de los dos top 10, cada fin de semana puedes puntuar preguntas extra como el ganador, la pole position y la vuelta rápida, y {nSeizoen} preguntas de temporada para todo el año. Cada una vale un número fijo de puntos si aciertas: el ganador {winnaar}, la pole position {pole}.',
            vragentabel: true,
            tekst: [
              'Lo que vale un fin de semana depende del nivel que elija el administrador: {simpel} puntos en Sencillo, {klassiek} en Clásico y {gevorderd} en Avanzado. Los fines de semana con sprint se suma la sprint, y las preguntas de temporada se resuelven al final de la temporada.',
            ],
          },
          {
            id: 'lo-mismo',
            vraag: '¿Y si todos predicen lo mismo?',
            kort: 'Si todos predicen lo mismo, esa pregunta no cambia nada en la clasificación: todos suman los mismos puntos, o nadie. Para ese caso, el administrador puede activar a contracorriente en Predict the Race. Una respuesta correcta a una pregunta extra vale entonces más cuantos menos jugadores dijeron lo mismo, hasta casi el doble. El top 10 y los duelos entre compañeros puntúan como siempre.',
            contrairtabel: { bijschrift: 'Lo que vale acertar el ganador cuando responden {contrairSpelers} jugadores',
              kop: ['Dijeron lo mismo', 'Cuenta', 'Puntos'], rij: '{zelfde} de {spelers}' },
            tekst: [
              'La app cuenta cuántos jugadores respondieron la pregunta ellos mismos y cuántos de ellos dijeron lo mismo que tú. La parte que dijo otra cosa se suma. Si fuiste el único de {contrairSpelers}, tu respuesta correcta cuenta {contrairEen} veces, y acertar el ganador vale {contrairPunten} puntos en vez de {winnaar}. Si todos dijeron lo mismo, no cambia nada. El multiplicador se redondea a un decimal, así que el número de la pantalla de la carrera es el número con el que puntúa la app.',
              'Las respuestas que rellenó la propia app no cuentan: no son de nadie y harían que tu elección pareciera menos rara de lo que fue. Si solo respondió un jugador, no hay nada raro en ello. Y la regla no es retroactiva: solo se aplica a los fines de semana que empiezan después de que el administrador la active.',
              'El top 10 y los duelos se dejan fuera a propósito. En un top 10 cada posición tendría su propia rareza, y nadie podría explicar de dónde salen sus puntos. Un sistema de puntos que no se puede explicar hace más daño que una pregunta que no cambia nada.',
            ],
          },
          {
            id: 'safety-cars',
            vraag: '¿Cuántas veces sale el safety car en una carrera de F1?',
            kort: 'De las {scRaces} carreras de Fórmula 1 desde {scVanaf}, {scMet} tuvieron al menos un safety car, contando el safety car virtual. De media, el safety car salió {scGemiddeld} veces por carrera, y {rvMet} carreras se detuvieron con bandera roja. Así puntúa también Predict the Race la pregunta sobre el número de safety cars. Abajo están las cifras por circuito, hasta el {scTot}.',
            circuittabel: { bijschrift: 'Por circuito: carreras desde {scVanaf}, safety cars (virtual incluido) y carreras con bandera roja, hasta el {scTot}',
              kop: ['Circuito', 'GP', 'Safety cars', 'Bandera roja'] },
            tekst: [
              'El safety car salió más veces en {scMeestPlek}: {scMeestAantal} veces en {scMeestRaces} carreras. Menos veces en {scMinstPlek}: {scMinstAantal} en {scMinstRaces} carreras. Aquí solo cuentan los circuitos con al menos {scMinRaces} carreras.',
              'Las cifras salen de los mensajes de dirección de carrera en OpenF1, contados con las mismas reglas que la app. Las carreras canceladas no se incluyen. La tabla se actualiza sola.',
            ],
          },
          {
            id: 'empate',
            vraag: '¿Qué pasa cuando dos jugadores empatan a puntos?',
            kort: 'Dos jugadores con los mismos puntos comparten la posición. Si empatan en segundo lugar, el siguiente es cuarto: 1, 2, 2, 4. Así ordena Predict the Race la clasificación. Con el ganador del fin de semana pasa lo mismo: si dos jugadores comparten la mejor puntuación, los dos ganaron ese fin de semana.',
          },
          {
            id: 'comodines',
            vraag: '¿Qué hace un comodín con tus puntos?',
            kort: 'Un comodín duplica todo lo que sumas en un fin de semana: los dos top 10, la sprint y las preguntas extra. Las preguntas de temporada nunca se duplican. Si tu liga tiene los comodines activados, cada uno recibe {jokers} por temporada por defecto, y el comodín se pone antes de que empiece el fin de semana.',
          },
        ],
        faq: [
          ['¿Puedo cambiar los puntos de cada pregunta?', 'No. Los puntos de cada pregunta son fijos, para que una puntuación signifique lo mismo en todas las ligas. Como administrador eliges qué preguntas cuentan y si hay comodines.'],
          ['¿Cuenta un piloto fuera del top 10?', 'Sí. Predices un top 10, pero cuenta todo el resultado. Pones a alguien en P10, termina undécimo, y sumas {bijna} puntos.'],
          ['¿Qué sumas por un piloto que abandona?', 'Nada, si no tiene posición clasificada. Es mala suerte, pero la misma para todos los que lo tenían en su top 10.'],
          ['¿Cuándo aparecen los puntos?', 'Después de cada clasificación y cada carrera, en cuanto llega el resultado oficial. Si una sanción cambia el resultado poco después de la carrera, la app vuelve a puntuar.'],
        ],
        leesOok: [
          ['niveaus', 'Sencillo, Clásico o Avanzado: qué preguntas tiene cada nivel'],
          ['faq', 'Preguntas frecuentes sobre la app'],
        ],
      },
      it: {
        pad: 'it/punteggio-pronostici-f1',
        titel: 'Sistema di punteggio per i pronostici F1 | Predict the Race',
        omschrijving: 'Quattro modi di dare i punti nei pronostici F1, pregi e difetti di ognuno, un esempio calcolato per intero e il punteggio usato da Predict the Race.',
        kop: 'Il sistema di punteggio per i pronostici F1',
        kort: 'Quasi tutte le leghe di pronostici F1 danno punti per ogni pilota della tua top 10, di più quanto più finisce vicino a dove l\'hai messo. Predict the Race dà {exact} punti per la posizione esatta, {bijna} per una posizione di scarto e {twee} per due. Contare solo le posizioni esatte sembra severo ma giusto; in pratica quasi nessuno fa punti e la fortuna decide la classifica.',
        teaser: 'Il punteggio spiegato, con un esempio calcolato',
        secties: [
          {
            id: 'sistemi',
            vraag: 'Quali sistemi di punteggio esistono?',
            kort: 'Esistono quattro sistemi di punteggio comuni per i pronostici F1: solo la posizione esatta, punti in base allo scarto, i veri punti del mondiale, e solo vincitore e podio. A distinguerli è se il quasi giusto conta ancora. Predict the Race conta lo scarto, così chi legge bene la gara fa punti anche quando l\'ordine esce un po\' diverso.',
            punten: [
              ['Solo la posizione esatta', 'Fai punti quando un pilota finisce esattamente dove l\'hai messo. Facile da spiegare, ma una top 10 sbagliata di una posizione ovunque non porta niente. Dopo qualche gara sono tutti vicini a zero e un colpo di fortuna decide la lega.'],
              ['Punti in base allo scarto', '{exact} punti per la posizione esatta, {bijna} per una di scarto, {twee} per due, niente oltre. Così conta Predict the Race. Se leggi bene la gara, fai punti anche quando l\'ordine cambia un po\'. Il problema sono i conti: a mano sono dieci piloti per sessione per ogni giocatore.'],
              ['Veri punti F1', 'Per ogni pilota nella posizione giusta ricevi i punti che lui prende nel mondiale: {wkPunten}. Sembra la cosa vera, ma un P10 giusto vale {wkLaatste} punto e il vincitore {wkEerste}. Sbagli il vincitore e sei lontanissimo, e la metà bassa della tua top 10 conta poco.'],
              ['Solo vincitore e podio', 'Si compila in fretta, ma quasi tutti scelgono lo stesso favorito. Tutti finiscono con più o meno lo stesso punteggio e c\'è poco in palio.'],
            ],
            tekst: [
              'Le domande extra come pole position o giro più veloce si aggiungono, ognuna con un numero fisso di punti per una risposta giusta.',
            ],
          },
          {
            id: 'esempio',
            vraag: 'Come si calcolano i punti di una top 10?',
            kort: 'I punti di una top 10 si calcolano pilota per pilota: {exact} punti se finisce esattamente dove l\'hai messo, {een} per una posizione di scarto, {twee} per due, e niente oltre. Somma le dieci righe; una top 10 perfetta vale {perfect}. Qui sotto una gara inventata, calcolata con lo stesso codice dell\'app.',
            rekenvoorbeeld: { bijschrift: 'Una gara inventata: la tua top 10 contro il risultato',
              kop: ['Pilota', 'Previsto', 'Arrivo', 'Punti'], geenPlek: 'Ritirato', totaal: 'Totale' },
            voorbeeld: '{voorbeeldTotaal} su {top10} punti. Contando solo le posizioni esatte sarebbero stati {voorbeeldExact}, anche se {voorbeeldDichtbij} dei 10 piloti sono arrivati entro una posizione dal pronostico.',
            tekst: [
              'Guarda Albon: pronosticato P10, arrivato undicesimo. È una posizione di scarto, quindi {bijna} punti, anche se è finito fuori dalla top 10. Sainz si è ritirato e non ha una posizione classificata, quindi non porta niente.',
            ],
          },
          {
            id: 'quasi-giusto',
            vraag: 'Perché il quasi giusto dovrebbe contare?',
            kort: 'Il quasi giusto dovrebbe contare perché in un risultato di F1 c\'è sempre un po\' di fortuna: un pit stop lento e il tuo P4 diventa P5. Se conta solo la posizione esatta, vince il più fortunato. Se conta lo scarto, vince chi legge meglio la gara, ed è di questo che dovrebbe trattarsi una lega di pronostici.',
            tekst: [
              'Tiene anche viva la lega. Un brutto weekend porta comunque qualcosa, e il primo resta a portata.',
            ],
          },
          {
            id: 'domande-extra',
            vraag: 'Per cos\'altro si possono fare punti?',
            kort: 'Oltre alle due top 10, ogni weekend puoi fare punti con domande extra come vincitore, pole position e giro più veloce, più {nSeizoen} domande di stagione per tutto l\'anno. Ognuna vale un numero fisso di punti per una risposta giusta: il vincitore {winnaar}, la pole position {pole}.',
            vragentabel: true,
            tekst: [
              'Quanto vale un weekend dipende dal livello scelto dall\'amministratore: {simpel} punti in Semplice, {klassiek} in Classico e {gevorderd} in Avanzato. Nei weekend sprint si aggiunge la sprint, e le domande di stagione si chiudono a fine stagione.',
            ],
          },
          {
            id: 'stesso-pronostico',
            vraag: 'E se tutti pronosticano la stessa cosa?',
            kort: 'Se tutti pronosticano la stessa cosa, quella domanda non cambia niente in classifica: tutti prendono gli stessi punti, oppure nessuno. Per questo caso l\'amministratore può attivare controcorrente in Predict the Race. Una risposta giusta a una domanda extra vale allora di più quanti meno giocatori hanno detto la stessa cosa, fino a quasi il doppio. La top 10 e i duelli tra compagni contano come sempre.',
            contrairtabel: { bijschrift: 'Quanto vale un vincitore giusto quando rispondono {contrairSpelers} giocatori',
              kop: ['Stessa risposta', 'Conta', 'Punti'], rij: '{zelfde} su {spelers}' },
            tekst: [
              'L\'app conta quanti giocatori hanno risposto alla domanda da soli, e quanti di loro hanno detto la stessa cosa che hai detto tu. La parte che ha detto altro si aggiunge. Se eri l\'unico su {contrairSpelers}, la tua risposta giusta conta {contrairEen} volte, e un vincitore giusto vale {contrairPunten} punti invece di {winnaar}. Se tutti hanno detto la stessa cosa, non cambia niente. Il moltiplicatore è arrotondato a un decimale, quindi il numero sulla schermata della gara è quello con cui conta l\'app.',
              'Le risposte compilate dall\'app stessa non contano: non sono di nessuno e farebbero sembrare la tua scelta meno rara di quanto fosse. Se ha risposto un solo giocatore, non c\'è niente di raro. E la regola non è retroattiva: vale solo per i weekend che iniziano dopo che l\'amministratore l\'ha attivata.',
              'La top 10 e i duelli sono esclusi di proposito. In una top 10 ogni posizione avrebbe la sua rarità, e nessuno saprebbe spiegare da dove vengono i suoi punti. Un punteggio che non si riesce a spiegare fa più danni di una domanda che non cambia niente.',
            ],
          },
          {
            id: 'safety-cars',
            vraag: 'Quante volte entra la safety car in una gara di F1?',
            kort: 'Delle {scRaces} gare di Formula 1 dal {scVanaf}, {scMet} hanno avuto almeno una safety car, virtual safety car compresa. In media la safety car è entrata {scGemiddeld} volte a gara, e {rvMet} gare sono state fermate con la bandiera rossa. Predict the Race conta allo stesso modo la domanda sul numero di safety car. Qui sotto i numeri per circuito, aggiornati al {scTot}.',
            circuittabel: { bijschrift: 'Per circuito: gare dal {scVanaf}, safety car (virtual compresa) e gare con bandiera rossa, aggiornati al {scTot}',
              kop: ['Circuito', 'Gare', 'Safety car', 'Bandiera rossa'] },
            tekst: [
              'La safety car è entrata più spesso a {scMeestPlek}: {scMeestAantal} volte in {scMeestRaces} gare. Meno spesso a {scMinstPlek}: {scMinstAantal} volte in {scMinstRaces} gare. Contano solo i circuiti con almeno {scMinRaces} gare.',
              'I numeri vengono dai messaggi della direzione gara in OpenF1, contati con le stesse regole dell\'app. Le gare annullate non sono incluse. La tabella si aggiorna da sola.',
            ],
          },
          {
            id: 'parita',
            vraag: 'Cosa succede quando due giocatori sono a pari punti?',
            kort: 'Due giocatori con gli stessi punti condividono la posizione. Se sono pari al secondo posto, il successivo è quarto: 1, 2, 2, 4. Predict the Race ordina la classifica così. Il vincitore del weekend funziona allo stesso modo: se due giocatori condividono il punteggio più alto, hanno vinto entrambi quel weekend.',
          },
          {
            id: 'jolly',
            vraag: 'Cosa fa un jolly ai tuoi punti?',
            kort: 'Un jolly raddoppia tutto quello che fai in un weekend: le due top 10, la sprint e le domande extra. Le domande di stagione non vengono mai raddoppiate. Se nella tua lega i jolly sono attivi, ognuno ne riceve {jokers} a stagione di default, e il jolly si gioca prima che inizi il weekend.',
          },
        ],
        faq: [
          ['Posso cambiare i punti di ogni domanda?', 'No. I punti per domanda sono fissi, così un punteggio significa la stessa cosa in ogni lega. Come amministratore scegli quali domande contano e se i jolly sono attivi.'],
          ['Un pilota fuori dalla top 10 conta ancora?', 'Sì. Pronostichi una top 10, ma conta tutto il risultato. Metti qualcuno in P10, finisce undicesimo, e prendi {bijna} punti.'],
          ['Cosa prendi per un pilota che si ritira?', 'Niente, se non ha una posizione classificata. È sfortuna, ma la stessa per tutti quelli che lo avevano nella top 10.'],
          ['Quando compaiono i punti?', 'Dopo ogni qualifica e ogni gara, appena arriva il risultato ufficiale. Se una penalità cambia il risultato poco dopo la gara, l\'app ricalcola.'],
        ],
        leesOok: [
          ['niveaus', 'Semplice, Classico o Avanzato: quali domande ha ogni livello'],
          ['faq', 'Domande frequenti sull\'app'],
        ],
      },
      pt: {
        pad: 'pt/pontuacao-bolao-f1',
        titel: 'Pontuação de um bolão de F1 explicada | Predict the Race',
        omschrijving: 'Quatro jeitos de pontuar um bolão de F1, os prós e contras de cada um, um exemplo calculado do começo ao fim e a pontuação do Predict the Race.',
        kop: 'A pontuação de um bolão de F1',
        kort: 'A maioria dos bolões de F1 pontua cada piloto do seu top 10, com mais pontos quanto mais perto ele termina de onde você o colocou. O Predict the Race dá {exact} pontos pela posição exata, {bijna} por uma posição de diferença e {twee} por duas. Pontuar só acertos exatos parece rigoroso mas justo; na prática quase ninguém pontua e a sorte decide a classificação.',
        teaser: 'A pontuação explicada, com um exemplo calculado',
        secties: [
          {
            id: 'sistemas',
            vraag: 'Quais sistemas de pontuação existem?',
            kort: 'Existem quatro sistemas de pontuação comuns para palpites de F1: só a posição exata, pontos pela distância, os pontos reais do campeonato, e só vencedor e pódio. O que os diferencia é se quase acertar ainda pontua. O Predict the Race pontua pela distância, para que quem lê bem a corrida pontue mesmo quando a ordem sai um pouco diferente.',
            punten: [
              ['Só a posição exata', 'Você pontua quando um piloto termina exatamente onde você o colocou. Fácil de explicar, mas um top 10 que erra por uma posição em tudo não vale nada. Depois de algumas corridas todo mundo está perto de zero e um chute de sorte decide o bolão.'],
              ['Pontos pela distância', '{exact} pontos pela posição exata, {bijna} por uma de diferença, {twee} por duas, nada além disso. É assim que o Predict the Race pontua. Se você lê bem a corrida, pontua mesmo quando a ordem muda um pouco. O problema é a conta: na mão, são dez pilotos por sessão para cada jogador.'],
              ['Pontos reais da F1', 'Para cada piloto na posição certa você recebe os pontos que ele ganha no campeonato: {wkPunten}. Parece o de verdade, mas acertar o P10 vale {wkLaatste} ponto e o vencedor {wkEerste}. Errou o vencedor, ficou muito para trás, e a metade de baixo do seu top 10 quase não conta.'],
              ['Só vencedor e pódio', 'Rápido de preencher, mas quase todos escolhem o mesmo favorito. Todo mundo acaba com mais ou menos a mesma pontuação e há pouco em jogo.'],
            ],
            tekst: [
              'As perguntas extras, como pole position ou volta mais rápida, vêm por cima, cada uma com um número fixo de pontos para a resposta certa.',
            ],
          },
          {
            id: 'exemplo',
            vraag: 'Como se pontua um top 10?',
            kort: 'Um top 10 se pontua piloto por piloto: {exact} pontos se ele termina exatamente onde você o colocou, {een} por uma posição de diferença, {twee} por duas, e nada além disso. Some as dez linhas; um top 10 perfeito vale {perfect}. Abaixo está uma corrida inventada, pontuada com o mesmo código que o app usa.',
            rekenvoorbeeld: { bijschrift: 'Uma corrida inventada: seu top 10 contra o resultado',
              kop: ['Piloto', 'Palpite', 'Final', 'Pontos'], geenPlek: 'Abandono', totaal: 'Total' },
            voorbeeld: '{voorbeeldTotaal} de {top10} pontos. Contando só os acertos exatos, teriam sido {voorbeeldExact}, mesmo com {voorbeeldDichtbij} dos 10 pilotos terminando a até uma posição do palpite.',
            tekst: [
              'Veja o Albon: palpite P10, terminou em décimo primeiro. É uma posição de diferença, então {bijna} pontos, mesmo tendo terminado fora do top 10. O Sainz abandonou e não tem posição classificada, então não vale nada.',
            ],
          },
          {
            id: 'quase',
            vraag: 'Por que quase acertar deve contar?',
            kort: 'Quase acertar deve contar porque um resultado de F1 sempre tem um pouco de sorte: um pit stop lento e o seu P4 vira P5. Se só a posição exata conta, ganha quem tem mais sorte. Se a distância conta, ganha quem lê melhor a corrida, e é disso que um bolão deveria se tratar.',
            tekst: [
              'Isso também mantém o bolão vivo. Um fim de semana ruim ainda rende alguma coisa, e o líder continua ao alcance.',
            ],
          },
          {
            id: 'perguntas-extras',
            vraag: 'O que mais dá para pontuar?',
            kort: 'Além dos dois top 10, a cada fim de semana dá para pontuar perguntas extras como vencedor, pole position e volta mais rápida, mais {nSeizoen} perguntas da temporada para o ano todo. Cada uma vale um número fixo de pontos para a resposta certa: o vencedor {winnaar}, a pole position {pole}.',
            vragentabel: true,
            tekst: [
              'Quanto vale um fim de semana depende do nível que o administrador escolhe: {simpel} pontos no Simples, {klassiek} no Clássico e {gevorderd} no Avançado. Nos fins de semana com sprint, a sprint vem por cima, e as perguntas da temporada são resolvidas no fim da temporada.',
            ],
          },
          {
            id: 'mesmo-palpite',
            vraag: 'E se todo mundo der o mesmo palpite?',
            kort: 'Se todo mundo der o mesmo palpite, essa pergunta não muda nada na classificação: todos fazem os mesmos pontos, ou ninguém faz. Para esse caso, o administrador pode ligar o contra a maré no Predict the Race. Uma resposta certa numa pergunta extra passa a valer mais quanto menos jogadores disseram o mesmo, até quase o dobro. O top 10 e os duelos entre companheiros pontuam como sempre.',
            contrairtabel: { bijschrift: 'Quanto vale acertar o vencedor quando {contrairSpelers} jogadores responderam',
              kop: ['Disseram o mesmo', 'Conta', 'Pontos'], rij: '{zelfde} de {spelers}' },
            tekst: [
              'O app conta quantos jogadores responderam à pergunta por conta própria e quantos deles disseram o mesmo que você. A parte que disse outra coisa vem por cima. Se você foi o único de {contrairSpelers}, sua resposta certa conta {contrairEen} vezes, e acertar o vencedor vale {contrairPunten} pontos em vez de {winnaar}. Se todos disseram o mesmo, nada muda. O multiplicador é arredondado para uma casa decimal, então o número na tela da corrida é o número com que o app pontua.',
              'Respostas que o próprio app preencheu não contam: elas não são de ninguém e fariam o seu palpite parecer menos raro do que foi. Se só um jogador respondeu, não há nada de raro. E a regra não é retroativa: só vale para fins de semana que começam depois que o administrador a ligou.',
              'O top 10 e os duelos ficam de fora de propósito. Num top 10, cada posição teria sua própria raridade, e ninguém conseguiria explicar de onde vêm seus pontos. Uma pontuação que ninguém consegue explicar faz mais estrago que uma pergunta que não muda nada.',
            ],
          },
          {
            id: 'safety-cars',
            vraag: 'Quantas vezes o safety car entra numa corrida de F1?',
            kort: 'Das {scRaces} corridas de Fórmula 1 desde {scVanaf}, {scMet} tiveram pelo menos um safety car, contando o safety car virtual. Em média o safety car entrou {scGemiddeld} vezes por corrida, e {rvMet} corridas foram interrompidas com bandeira vermelha. É assim também que o Predict the Race pontua a pergunta sobre o número de safety cars. Abaixo estão os números por circuito, até {scTot}.',
            circuittabel: { bijschrift: 'Por circuito: corridas desde {scVanaf}, safety cars (virtual incluído) e corridas com bandeira vermelha, até {scTot}',
              kop: ['Circuito', 'GP', 'Safety cars', 'Bandeira vermelha'] },
            tekst: [
              'O safety car entrou mais vezes em {scMeestPlek}: {scMeestAantal} vezes em {scMeestRaces} corridas. Menos vezes em {scMinstPlek}: {scMinstAantal} em {scMinstRaces} corridas. Aqui só contam os circuitos com pelo menos {scMinRaces} corridas.',
              'Os números vêm das mensagens da direção de prova no OpenF1, contados com as mesmas regras do app. Corridas canceladas não entram. A tabela se atualiza sozinha.',
            ],
          },
          {
            id: 'empate',
            vraag: 'O que acontece quando dois jogadores empatam em pontos?',
            kort: 'Dois jogadores com os mesmos pontos dividem a posição. Se empatam em segundo, o próximo é quarto: 1, 2, 2, 4. É assim que o Predict the Race monta a classificação. O vencedor do fim de semana funciona igual: se dois jogadores dividem a maior pontuação, os dois venceram aquele fim de semana.',
          },
          {
            id: 'coringas',
            vraag: 'O que um coringa faz com os seus pontos?',
            kort: 'Um coringa dobra tudo o que você faz num fim de semana: os dois top 10, a sprint e as perguntas extras. As perguntas da temporada nunca são dobradas. Se o seu bolão tem os coringas ligados, cada um recebe {jokers} por temporada por padrão, e você coloca o coringa antes de o fim de semana começar.',
          },
        ],
        faq: [
          ['Posso mudar os pontos de cada pergunta?', 'Não. Os pontos de cada pergunta são fixos, para que uma pontuação signifique a mesma coisa em todo bolão. Como administrador, você escolhe quais perguntas contam e se os coringas estão ligados.'],
          ['Um piloto fora do top 10 ainda conta?', 'Sim. Você dá palpite num top 10, mas o resultado inteiro conta. Colocou alguém em P10, ele terminou em décimo primeiro, e você ganha {bijna} pontos.'],
          ['Quanto vale um piloto que abandona?', 'Nada, se ele não tiver posição classificada. É azar, mas o mesmo azar para todos que o tinham no top 10.'],
          ['Quando os pontos aparecem?', 'Depois de cada classificação e cada corrida, assim que o resultado oficial chega. Se uma punição muda o resultado logo depois da corrida, o app pontua de novo.'],
        ],
        leesOok: [
          ['niveaus', 'Simples, Clássico ou Avançado: quais perguntas cada nível tem'],
          ['faq', 'Perguntas frequentes sobre o app'],
        ],
      },
    },
  },
  {
    id: 'excel',
    soort: 'gids',
    verwant: ['puntentelling', 'organiseren'],
    teaserPlek: 'punten',
    talen: {
      nl: {
        pad: 'f1-poule-excel',
        titel: 'F1-poule bijhouden in Excel | Predict the Race',
        omschrijving: 'Een F1-poule bijhouden in Excel of Google Spreadsheets: welke kolommen je nodig hebt, de formule voor de punten per plek en waar het in een seizoen misgaat.',
        kop: 'Een F1-poule bijhouden in Excel',
        kort: 'Een F1-poule bijhouden in Excel kan prima. Je hebt per speler vier kolommen nodig en één formule die de punten per coureur uitrekent. Het werk zit niet in de formule maar in het bijhouden: elk raceweekend de hele uitslag overtypen, straffen achteraf verwerken en zorgen dat iedereen op tijd inlevert.',
        teaser: 'Liever zelf bijhouden in Excel? De kolommen en de formule',
        secties: [
          {
            id: 'kolommen',
            vraag: 'Welke kolommen heb je nodig?',
            kort: 'Voor een F1-poule in Excel heb je per speler en per sessie vier kolommen nodig: de coureur, de plek die de speler voorspelde, de plek waar de coureur echt eindigde, en de punten. Maak per race een tabblad met zo\'n blok per speler, en een tabblad met de totalen.',
            tabel: {
              bijschrift: 'De vier kolommen per speler, met een voorbeeldregel',
              kop: ['Kolom', 'Wat erin staat', 'Voorbeeld'],
              rijen: [
                ['A', 'De coureur', 'Verstappen'],
                ['B', 'De voorspelde plek, 1 tot en met 10', '1'],
                ['C', 'De echte plek, leeg als hij geen plek kreeg', '2'],
                ['D', 'De punten, met de formule hieronder', '{bijna}'],
              ],
            },
            tekst: [
              'In rij 1 staan de kopjes, de tien coureurs in rij 2 tot en met 11. Zet de blokken van de spelers naast elkaar; kopieer je het blok voor de volgende speler, dan schuiven de formules vanzelf mee.',
            ],
          },
          {
            id: 'formule',
            vraag: 'Welke formule rekent de punten uit?',
            kort: 'De formule voor de punten is {formuleNL}, in D2 en dan doorgetrokken tot D11. Hij geeft {exact} punten voor precies goed, {formStap} minder voor elke plek ernaast en nooit minder dan nul, dus dezelfde punten als Predict the Race.',
            formules: [
              ['Nederlandstalig Excel', '{formuleNL}'],
              ['Het totaal van de sessie, in D12', '=SOM(D2:D11)'],
            ],
            tekst: [
              'Dat is dezelfde som als in Predict the Race: {exact} punten voor exact, {bijna} voor één plek ernaast, {twee} voor twee plekken ernaast, en vanaf drie plekken niets.',
              'Het ALS-deel is er voor een lege cel. Zonder dat rekent Excel met plek 0, en kan een speler punten krijgen voor een coureur die geen plek in de uitslag had.',
            ],
          },
          {
            id: 'buiten-top-10',
            vraag: 'Wat doe je met coureurs buiten de top 10?',
            kort: 'Een coureur buiten de top 10 vul je gewoon in met zijn echte plek. Zet een speler iemand op P10 en wordt die elfde, dan is dat één plek ernaast en dus {bijna} punten. Alleen een coureur zonder plek in de officiële uitslag laat je leeg; die levert nul op.',
            tekst: [
              'Daarom heb je de hele uitslag nodig, niet alleen de top 10. Geen plek betekent bijvoorbeeld niet geklasseerd of gediskwalificeerd.',
            ],
          },
          {
            id: 'misgaat',
            vraag: 'Waar gaat het mis met Excel?',
            kort: 'Een Excel-poule gaat zelden mis bij de formule, maar bijna altijd bij het bijhouden. Na een paar races doet één persoon al het werk: elke uitslag overtypen, straffen achteraf verwerken, deadlines bewaken en de stand rondsturen, elk weekend opnieuw.',
            punten: [
              ['Elke uitslag overtypen', 'De hele uitslag van kwalificatie en race, elk raceweekend. Eén verwisselde regel en de stand klopt niet meer, zonder dat iemand het merkt.'],
              ['Straffen achteraf', 'Een tijdstraf na de finish schuift de uitslag op. Dan moet je terug naar dat tabblad en alles opnieuw nalopen.'],
              ['Deadlines', 'Wie stuurde zijn top 10 voor de start? In de groepsapp is "ik had hem al getypt" niet te controleren, en een lijst die na de start binnenkomt, geeft discussie.'],
              ['De stand op je telefoon', 'Een gedeeld spreadsheet kan, maar op een telefoon is een tabblad met vier kolommen per speler nauwelijks te lezen.'],
            ],
          },
          {
            id: 'zonder-spreadsheet',
            vraag: 'Kan het ook zonder spreadsheet?',
            kort: 'Ja, een F1-poule kan ook zonder spreadsheet. Predict the Race rekent de punten op dezelfde manier uit, maar haalt na elke kwalificatie en race zelf de officiële uitslag op. Voorspellingen sluiten bij de start van de sessie, dus niemand kan achteraf nog iets veranderen.',
            tekst: [
              'Verandert de uitslag kort na de race nog door een straf, dan rekent de app opnieuw. En de stand staat op ieders telefoon, met wie er klom en wie er zakte.',
              'Het is gratis en er is geen account nodig. Je deelt de poule met een code in de groepsapp.',
            ],
          },
        ],
        faq: [
          ['Werkt dit ook in Google Spreadsheets?', 'Ja, met dezelfde kolommen en dezelfde formule. Geeft hij een fout, kijk dan naar de taal: in het Engels heten de functies IF en SUM, en met een Engelse landinstelling scheid je met komma\'s in plaats van puntkomma\'s.'],
          ['Hoe tel ik de winnaar en de pole position mee?', 'Met een eigen regel per vraag: goed is punten, fout is nul. Staat de voorspelde winnaar in B14 en de echte in C14, dan geeft =ALS(B14=C14;{winnaar};0) de punten. In Predict the Race is de winnaar {winnaar} punten waard en de pole position {pole}; die getallen kun je overnemen.'],
          ['Hoe zet ik spelers met evenveel punten op dezelfde plek?', 'Met RANG op het tabblad met de totalen. Staan tien spelers in B2 tot en met B11, dan geeft =RANG(B2;B$2:B$11) spelers met evenveel punten dezelfde plek: 1, 2, 2, 4. Zo telt Predict the Race ook.'],
        ],
        leesOok: [
          ['hoe', 'Zo werkt Predict the Race'],
          ['faq', 'Veelgestelde vragen over de app'],
        ],
      },
      en: {
        pad: 'en/f1-prediction-league-spreadsheet',
        titel: 'F1 prediction league spreadsheet | Predict the Race',
        omschrijving: 'Run an F1 prediction league in Excel or Google Sheets: the columns you need, the formula that scores each position, and where a spreadsheet lets you down.',
        kop: 'Running an F1 prediction league in a spreadsheet',
        kort: 'An F1 prediction league runs fine in a spreadsheet. Each player needs four columns and one formula to score every driver. The work is not in the formula but in the upkeep: typing in the full result every race weekend, fixing it after penalties, and making sure everyone submits before the start.',
        teaser: 'Prefer a spreadsheet? The columns and the formula',
        secties: [
          {
            id: 'columns',
            vraag: 'What columns do you need?',
            kort: 'An F1 prediction league spreadsheet needs four columns per player per session: the driver, where the player predicted him, where he actually finished, and the points. Use one tab per race with a block like that for each player, and a totals tab that adds everything up.',
            tabel: {
              bijschrift: 'The four columns per player, with an example row',
              kop: ['Column', 'What goes in it', 'Example'],
              rijen: [
                ['A', 'The driver', 'Verstappen'],
                ['B', 'Predicted position, 1 to 10', '1'],
                ['C', 'Actual position, blank if not classified', '2'],
                ['D', 'Points, from the formula below', '{bijna}'],
              ],
            },
            tekst: [
              'Row 1 holds the headers and the ten drivers go in rows 2 to 11. Put the players\' blocks side by side; copy the block for the next player and the formulas move along with it.',
            ],
          },
          {
            id: 'formula',
            vraag: 'Which formula scores the points?',
            kort: 'The formula that scores the points is {formuleEN}, in D2 and filled down to D11. It gives {exact} points for the exact spot, {formStap} fewer for every place off and never less than zero, the same points Predict the Race gives.',
            formules: [
              ['Excel or Google Sheets in English', '{formuleEN}'],
              ['The session total, in D12', '=SUM(D2:D11)'],
            ],
            tekst: [
              'That is the same sum Predict the Race uses: {exact} for exact, {bijna} for one place off, {twee} for two places off, and nothing from three places off.',
              'The IF part is there for blank cells. Without it, a blank counts as position 0, and a player can pick up points for a driver who had no classified position.',
              'Where decimals are written with a comma, as in much of Europe, the commas in the formula become semicolons.',
            ],
          },
          {
            id: 'outside-top-10',
            vraag: 'What about drivers outside the top 10?',
            kort: 'Enter a driver outside the top 10 with his actual position, like any other. If a player puts someone in P10 and he finishes eleventh, that is one place off, so {bijna} points. Only leave the cell blank for a driver with no position in the official classification; he scores zero.',
            tekst: [
              'That is why you need the full result, not just the top 10. No position means, for example, not classified or disqualified.',
            ],
          },
          {
            id: 'problems',
            vraag: 'Where does a spreadsheet let you down?',
            kort: 'A spreadsheet league rarely goes wrong in the formula, and almost always in the upkeep. A few races in, one person is doing all the work: typing in every result, fixing it after penalties, chasing deadlines and sending round the standings, every single weekend.',
            punten: [
              ['Typing in every result', 'The full qualifying and race result, every race weekend. Swap two rows and the standings are wrong, and nobody notices.'],
              ['Penalties after the flag', 'A time penalty after the finish reshuffles the result. Then you go back to that tab and check everything again.'],
              ['Deadlines', 'Who sent their top 10 before the start? In a group chat, "I had already typed it" is impossible to check, and a list that turns up after lights out starts an argument.'],
              ['Standings on a phone', 'You can share the sheet, but four columns per player is hard to read on a phone.'],
            ],
          },
          {
            id: 'without-a-spreadsheet',
            vraag: 'Can you do it without a spreadsheet?',
            kort: 'Yes, an F1 prediction league works without a spreadsheet. Predict the Race scores the same way, but fetches the official result itself after every qualifying session and race. Predictions close when the session starts, so nobody can change anything afterwards.',
            tekst: [
              'If a penalty changes the result shortly after the race, the app scores it again. And the standings are on everyone\'s phone, showing who climbed and who dropped.',
              'It is free and nobody needs an account. You share the league with a code in the group chat.',
            ],
          },
        ],
        faq: [
          ['Does this work in Google Sheets?', 'Yes, with the same columns and the same formula. If it returns an error, check the locale: where the decimal separator is a comma, the formula needs semicolons instead of commas.'],
          ['How do I score the race winner and pole position?', 'With a row per question: right is points, wrong is zero. With the predicted winner in B14 and the actual winner in C14, =IF(B14=C14,{winnaar},0) gives the points. In Predict the Race the winner is worth {winnaar} points and pole position {pole}, so you can borrow those numbers.'],
          ['How do I put players on equal points in the same position?', 'Use RANK on the totals tab. With ten players in B2 to B11, =RANK(B2,B$2:B$11) gives players on the same points the same position: 1, 2, 2, 4. Predict the Race ranks the same way.'],
        ],
        leesOok: [
          ['hoe', 'How Predict the Race works'],
          ['faq', 'Frequently asked questions about the app'],
        ],
      },
      de: {
        pad: 'de/f1-tippspiel-excel',
        titel: 'F1-Tippspiel in Excel auswerten | Predict the Race',
        omschrijving: 'Ein F1-Tippspiel in Excel oder Google Tabellen auswerten: welche Spalten du brauchst, die Formel für die Punkte pro Platz und wo es in einer Saison hakt.',
        kop: 'Ein F1-Tippspiel in Excel auswerten',
        kort: 'Ein F1-Tippspiel lässt sich gut in Excel auswerten. Pro Spieler brauchst du vier Spalten und eine Formel, die die Punkte pro Fahrer berechnet. Die Arbeit steckt nicht in der Formel, sondern in der Pflege: an jedem Rennwochenende das ganze Ergebnis abtippen, Strafen nachträglich einarbeiten und dafür sorgen, dass alle rechtzeitig tippen.',
        teaser: 'Lieber selbst in Excel auswerten? Die Spalten und die Formel',
        secties: [
          {
            id: 'spalten',
            vraag: 'Welche Spalten brauchst du?',
            kort: 'Für ein F1-Tippspiel in Excel brauchst du pro Spieler und pro Session vier Spalten: den Fahrer, den getippten Platz, den echten Platz und die Punkte. Leg pro Rennen ein Tabellenblatt mit so einem Block pro Spieler an, dazu ein Blatt mit den Gesamtpunkten.',
            tabel: {
              bijschrift: 'Die vier Spalten pro Spieler, mit einer Beispielzeile',
              kop: ['Spalte', 'Was hineinkommt', 'Beispiel'],
              rijen: [
                ['A', 'Der Fahrer', 'Verstappen'],
                ['B', 'Der getippte Platz, 1 bis 10', '1'],
                ['C', 'Der echte Platz, leer ohne Wertung', '2'],
                ['D', 'Die Punkte, mit der Formel unten', '{bijna}'],
              ],
            },
            tekst: [
              'In Zeile 1 stehen die Überschriften, die zehn Fahrer in den Zeilen 2 bis 11. Setz die Blöcke der Spieler nebeneinander; kopierst du den Block für den nächsten Spieler, wandern die Formeln mit.',
            ],
          },
          {
            id: 'formel',
            vraag: 'Welche Formel berechnet die Punkte?',
            kort: 'Die Formel für die Punkte ist {formule}, in D2 und dann nach unten gezogen bis D11. Sie gibt {exact} Punkte für den genauen Platz, {formStap} weniger für jeden Platz daneben und nie weniger als null, also dieselben Punkte wie Predict the Race.',
            formules: [
              ['Deutsches Excel', '{formule}'],
              ['Die Summe der Session, in D12', '=SUMME(D2:D11)'],
            ],
            tekst: [
              'Das ist dieselbe Rechnung wie in Predict the Race: {exact} Punkte für den genauen Platz, {bijna} bei einem Platz daneben, {twee} bei zwei Plätzen daneben und ab drei Plätzen nichts.',
              'Der WENN-Teil ist für eine leere Zelle da. Ohne ihn rechnet Excel mit Platz 0, und ein Spieler kann Punkte für einen Fahrer bekommen, der im Ergebnis keinen Platz hatte.',
              'Die Semikolons gelten für ein Excel mit Komma als Dezimalzeichen, wie im deutschen Sprachraum. Nutzt dein Excel den Punkt, werden daraus Kommas.',
            ],
          },
          {
            id: 'ausserhalb-top-10',
            vraag: 'Was machst du mit Fahrern außerhalb der Top 10?',
            kort: 'Einen Fahrer außerhalb der Top 10 trägst du einfach mit seinem echten Platz ein. Tippt ein Spieler jemanden auf P10 und der wird Elfter, ist das ein Platz daneben, also {bijna} Punkte. Nur bei einem Fahrer ohne Platz im offiziellen Ergebnis bleibt die Zelle leer; er bringt nichts.',
            tekst: [
              'Darum brauchst du das ganze Ergebnis, nicht nur die Top 10. Kein Platz heißt zum Beispiel: nicht gewertet oder disqualifiziert.',
            ],
          },
          {
            id: 'probleme',
            vraag: 'Wo hakt es mit Excel?',
            kort: 'Ein Excel-Tippspiel scheitert selten an der Formel, aber fast immer an der Pflege. Nach ein paar Rennen macht eine Person die ganze Arbeit: jedes Ergebnis abtippen, Strafen nachträglich einarbeiten, Deadlines im Blick behalten und die Tabelle herumschicken, jedes Wochenende aufs Neue.',
            punten: [
              ['Jedes Ergebnis abtippen', 'Das ganze Ergebnis von Qualifying und Rennen, an jedem Rennwochenende. Eine vertauschte Zeile, und die Tabelle stimmt nicht mehr, ohne dass es jemand merkt.'],
              ['Strafen nach dem Rennen', 'Eine Zeitstrafe nach dem Zieleinlauf verschiebt das Ergebnis. Dann musst du zurück in dieses Blatt und alles neu prüfen.'],
              ['Deadlines', 'Wer hat seine Top 10 vor dem Start geschickt? In der Gruppe ist "ich hatte es schon getippt" nicht zu prüfen, und eine Liste, die nach dem Start kommt, sorgt für Streit.'],
              ['Die Tabelle auf dem Handy', 'Eine geteilte Tabelle geht, aber auf dem Handy sind vier Spalten pro Spieler kaum zu lesen.'],
            ],
          },
          {
            id: 'ohne-tabelle',
            vraag: 'Geht es auch ohne Tabelle?',
            kort: 'Ja, ein F1-Tippspiel geht auch ohne Tabelle. Predict the Race rechnet die Punkte genauso, holt aber nach jedem Qualifying und jedem Rennen selbst das offizielle Ergebnis. Tipps schließen mit dem Start der Session, also kann niemand nachträglich noch etwas ändern.',
            tekst: [
              'Ändert eine Strafe das Ergebnis kurz nach dem Rennen, rechnet die App neu. Und die Tabelle steht auf jedem Handy, mit allen, die aufgestiegen oder abgerutscht sind.',
              'Es ist kostenlos und niemand braucht ein Konto. Du teilst die Tipprunde mit einem Code in der Gruppe.',
            ],
          },
        ],
        faq: [
          ['Funktioniert das auch in Google Tabellen?', 'Ja, mit denselben Spalten und derselben Rechnung. Gibt die Formel einen Fehler, nimm die englischen Namen, die Google Tabellen immer versteht: IF statt WENN und SUM statt SUMME. Mit deutscher Spracheinstellung trennst du weiterhin mit Semikolons.'],
          ['Wie zähle ich den Sieger und die Pole-Position mit?', 'Mit einer eigenen Zeile pro Frage: richtig gibt Punkte, falsch nichts. Steht der getippte Sieger in B14 und der echte in C14, gibt =WENN(B14=C14;{winnaar};0) die Punkte. In Predict the Race ist der Sieger {winnaar} Punkte wert und die Pole-Position {pole}; diese Zahlen kannst du übernehmen.'],
          ['Wie setze ich Spieler mit gleich vielen Punkten auf denselben Platz?', 'Mit RANG auf dem Blatt mit den Gesamtpunkten. Stehen zehn Spieler in B2 bis B11, gibt =RANG(B2;B$2:B$11) Spielern mit gleich vielen Punkten denselben Platz: 1, 2, 2, 4. So zählt auch Predict the Race.'],
        ],
        leesOok: [
          ['hoe', 'So funktioniert Predict the Race'],
          ['faq', 'Häufige Fragen zur App'],
        ],
      },
      fr: {
        pad: 'fr/pronostics-f1-excel',
        titel: 'Gérer des pronostics F1 sur Excel | Predict the Race',
        omschrijving: 'Gérer une ligue de pronostics F1 sur Excel ou Google Sheets : les colonnes nécessaires, la formule des points par place et ce qui coince en cours de saison.',
        kop: 'Gérer des pronostics F1 sur Excel',
        kort: 'Une ligue de pronostics F1 se gère très bien sur Excel. Il faut quatre colonnes par joueur et une seule formule qui calcule les points de chaque pilote. Le travail n\'est pas dans la formule mais dans le suivi : recopier tout le résultat à chaque week-end de course, corriger après les pénalités et s\'assurer que chacun pronostique à temps.',
        teaser: 'Plutôt sur Excel ? Les colonnes et la formule',
        secties: [
          {
            id: 'colonnes',
            vraag: 'De quelles colonnes avez-vous besoin ?',
            kort: 'Pour des pronostics F1 sur Excel, il faut quatre colonnes par joueur et par séance : le pilote, la place pronostiquée, la place réelle et les points. Créez un onglet par course avec un bloc de ce type par joueur, et un onglet pour les totaux.',
            tabel: {
              bijschrift: 'Les quatre colonnes par joueur, avec une ligne d\'exemple',
              kop: ['Colonne', 'Contenu', 'Exemple'],
              rijen: [
                ['A', 'Le pilote', 'Verstappen'],
                ['B', 'La place prévue, de 1 à 10', '1'],
                ['C', 'La vraie place, vide si non classé', '2'],
                ['D', 'Les points, selon la formule', '{bijna}'],
              ],
            },
            tekst: [
              'La ligne 1 contient les en-têtes et les dix pilotes vont des lignes 2 à 11. Placez les blocs des joueurs côte à côte ; si vous copiez le bloc pour le joueur suivant, les formules suivent.',
            ],
          },
          {
            id: 'formule',
            vraag: 'Quelle formule calcule les points ?',
            kort: 'La formule des points est {formule}, en D2, puis recopiée vers le bas jusqu\'à D11. Elle donne {exact} points pour la place exacte, {formStap} de moins par place d\'écart et jamais moins de zéro : les mêmes points que Predict the Race.',
            formules: [
              ['Excel en français', '{formule}'],
              ['Le total de la séance, en D12', '=SOMME(D2:D11)'],
            ],
            tekst: [
              'C\'est le même calcul que dans Predict the Race : {exact} points pour la place exacte, {bijna} à une place près, {twee} à deux places près, et rien à partir de trois places.',
              'La partie SI sert pour une cellule vide. Sans elle, Excel compte la place 0 et un joueur peut marquer des points pour un pilote qui n\'avait aucune place au classement.',
              'Les points-virgules valent pour un Excel où la virgule sert de séparateur décimal, comme en France. Si votre Excel utilise le point, ils deviennent des virgules.',
            ],
          },
          {
            id: 'hors-top-10',
            vraag: 'Que faire des pilotes hors du top 10 ?',
            kort: 'Un pilote hors du top 10 se note simplement avec sa vraie place. Si un joueur met quelqu\'un en P10 et qu\'il finit onzième, c\'est une place d\'écart, donc {bijna} points. Ne laissez la cellule vide que pour un pilote sans place au classement officiel ; il ne rapporte rien.',
            tekst: [
              'C\'est pour cela qu\'il faut le résultat complet, pas seulement le top 10. Pas de place veut dire, par exemple, non classé ou disqualifié.',
            ],
          },
          {
            id: 'problemes',
            vraag: 'Où ça coince avec Excel ?',
            kort: 'Une ligue sur Excel coince rarement à cause de la formule, et presque toujours à cause du suivi. Après quelques courses, une seule personne fait tout le travail : recopier chaque résultat, corriger après les pénalités, surveiller les échéances et envoyer le classement, chaque week-end.',
            punten: [
              ['Recopier chaque résultat', 'Le résultat complet des qualifications et de la course, à chaque week-end de course. Deux lignes inversées et le classement est faux, sans que personne ne le remarque.'],
              ['Les pénalités après l\'arrivée', 'Une pénalité en temps après l\'arrivée modifie le résultat. Il faut alors revenir à cet onglet et tout revérifier.'],
              ['Les échéances', 'Qui a envoyé son top 10 avant le départ ? Dans le groupe, « je l\'avais déjà tapé » est invérifiable, et une liste qui arrive après le départ lance la dispute.'],
              ['Le classement sur téléphone', 'Un tableur partagé, c\'est possible, mais sur un téléphone quatre colonnes par joueur se lisent mal.'],
            ],
          },
          {
            id: 'sans-tableur',
            vraag: 'Peut-on se passer de tableur ?',
            kort: 'Oui, une ligue de pronostics F1 peut se passer de tableur. Predict the Race compte les points de la même façon, mais récupère lui-même le résultat officiel après chaque qualification et chaque course. Les pronostics ferment au début de la séance, donc personne ne peut rien changer après coup.',
            tekst: [
              'Si une pénalité modifie le résultat peu après la course, l\'appli recalcule. Et le classement est sur le téléphone de chacun, avec ceux qui montent et ceux qui descendent.',
              'C\'est gratuit et personne n\'a besoin de compte. Vous partagez la ligue avec un code dans le groupe.',
            ],
          },
        ],
        faq: [
          ['Est-ce que ça marche dans Google Sheets ?', 'Oui, avec les mêmes colonnes et le même calcul. Si la formule renvoie une erreur, utilisez les noms anglais, que Google Sheets comprend toujours : IF au lieu de SI et SUM au lieu de SOMME. Avec des paramètres français, gardez les points-virgules.'],
          ['Comment compter le vainqueur et la pole position ?', 'Avec une ligne par question : juste rapporte des points, faux ne rapporte rien. Avec le vainqueur pronostiqué en B14 et le vrai en C14, =SI(B14=C14;{winnaar};0) donne les points. Dans Predict the Race, le vainqueur vaut {winnaar} points et la pole position {pole} ; vous pouvez reprendre ces chiffres.'],
          ['Comment mettre à la même place des joueurs à égalité de points ?', 'Avec RANG dans l\'onglet des totaux. Avec dix joueurs en B2 à B11, =RANG(B2;B$2:B$11) donne la même place aux joueurs à égalité : 1, 2, 2, 4. Predict the Race classe de la même façon.'],
        ],
        leesOok: [
          ['hoe', 'Comment fonctionne Predict the Race'],
          ['faq', 'Questions fréquentes sur l\'appli'],
        ],
      },
      es: {
        pad: 'es/porra-f1-excel',
        titel: 'Cómo llevar una porra de F1 en Excel | Predict the Race',
        omschrijving: 'Cómo llevar una porra de F1 en Excel o Google Sheets: qué columnas necesitas, la fórmula de los puntos por posición y dónde falla a lo largo de la temporada.',
        kop: 'Cómo llevar una porra de F1 en Excel',
        kort: 'Una porra de F1 se lleva bien en Excel. Necesitas cuatro columnas por jugador y una fórmula que calcule los puntos de cada piloto. El trabajo no está en la fórmula sino en el mantenimiento: copiar el resultado completo cada fin de semana de carrera, corregirlo tras las sanciones y asegurarte de que todos predicen a tiempo.',
        teaser: '¿Prefieres Excel? Las columnas y la fórmula',
        secties: [
          {
            id: 'columnas',
            vraag: '¿Qué columnas necesitas?',
            kort: 'Para una porra de F1 en Excel necesitas cuatro columnas por jugador y por sesión: el piloto, la posición que predijo el jugador, la posición real y los puntos. Haz una pestaña por carrera con un bloque así por jugador, y una pestaña con los totales.',
            tabel: {
              bijschrift: 'Las cuatro columnas por jugador, con una fila de ejemplo',
              kop: ['Columna', 'Qué va', 'Ejemplo'],
              rijen: [
                ['A', 'El piloto', 'Verstappen'],
                ['B', 'La posición predicha, de 1 a 10', '1'],
                ['C', 'La posición real, vacía si no se clasificó', '2'],
                ['D', 'Los puntos, con la fórmula de abajo', '{bijna}'],
              ],
            },
            tekst: [
              'En la fila 1 van los encabezados y los diez pilotos en las filas 2 a 11. Pon los bloques de los jugadores uno al lado del otro; si copias el bloque para el siguiente jugador, las fórmulas se mueven con él.',
            ],
          },
          {
            id: 'formula',
            vraag: '¿Qué fórmula calcula los puntos?',
            kort: 'La fórmula de los puntos es {formule}, en D2 y arrastrada hasta D11. Da {exact} puntos por la posición exacta, {formStap} menos por cada posición de diferencia y nunca menos de cero: los mismos puntos que da Predict the Race.',
            formules: [
              ['Excel en español', '{formule}'],
              ['El total de la sesión, en D12', '=SUMA(D2:D11)'],
            ],
            tekst: [
              'Es la misma cuenta que usa Predict the Race: {exact} puntos por la posición exacta, {bijna} por una de diferencia, {twee} por dos, y nada a partir de tres.',
              'La parte SI está para una celda vacía. Sin ella, Excel cuenta la posición 0 y un jugador puede sumar puntos por un piloto que no tuvo posición en el resultado.',
              'Los puntos y comas valen para un Excel que usa la coma decimal, como en España. Si tu Excel usa el punto decimal, como en México, se convierten en comas.',
            ],
          },
          {
            id: 'fuera-top-10',
            vraag: '¿Qué haces con los pilotos fuera del top 10?',
            kort: 'Un piloto fuera del top 10 se anota con su posición real, como cualquier otro. Si un jugador pone a alguien en P10 y termina undécimo, es una posición de diferencia, así que {bijna} puntos. Deja la celda vacía solo para un piloto sin posición en la clasificación oficial; ese no suma nada.',
            tekst: [
              'Por eso necesitas el resultado completo, no solo el top 10. Sin posición significa, por ejemplo, no clasificado o descalificado.',
            ],
          },
          {
            id: 'problemas',
            vraag: '¿Dónde falla Excel?',
            kort: 'Una porra en Excel rara vez falla por la fórmula, y casi siempre por el mantenimiento. A las pocas carreras, una sola persona hace todo el trabajo: copiar cada resultado, corregirlo tras las sanciones, vigilar los plazos y mandar la clasificación, cada fin de semana.',
            punten: [
              ['Copiar cada resultado', 'El resultado completo de la clasificación y la carrera, cada fin de semana de carrera. Intercambia dos filas y la clasificación está mal, sin que nadie se dé cuenta.'],
              ['Sanciones tras la bandera', 'Una sanción de tiempo después de la meta cambia el resultado. Entonces toca volver a esa pestaña y revisarlo todo.'],
              ['Plazos', '¿Quién mandó su top 10 antes de la salida? En el grupo, "ya lo había escrito" no se puede comprobar, y una lista que llega después de la salida acaba en discusión.'],
              ['La clasificación en el móvil', 'Se puede compartir la hoja, pero en un móvil cuatro columnas por jugador apenas se leen.'],
            ],
          },
          {
            id: 'sin-hoja',
            vraag: '¿Se puede hacer sin hoja de cálculo?',
            kort: 'Sí, una porra de F1 funciona sin hoja de cálculo. Predict the Race puntúa igual, pero trae él mismo el resultado oficial después de cada clasificación y cada carrera. Las predicciones se cierran al empezar la sesión, así que nadie puede cambiar nada después.',
            tekst: [
              'Si una sanción cambia el resultado poco después de la carrera, la app vuelve a calcular. Y la clasificación está en el móvil de todos, con quién sube y quién baja.',
              'Es gratis y nadie necesita cuenta. Compartes la porra con un código en el grupo.',
            ],
          },
        ],
        faq: [
          ['¿Funciona en Google Sheets?', 'Sí, con las mismas columnas y la misma cuenta. Si la fórmula da error, usa los nombres en inglés, que Google Sheets entiende siempre: IF en lugar de SI y SUM en lugar de SUMA. Con la configuración regional de España, sigue separando con punto y coma.'],
          ['¿Cómo cuento el ganador y la pole position?', 'Con una fila por pregunta: acertar da puntos, fallar no da nada. Con el ganador predicho en B14 y el real en C14, =SI(B14=C14;{winnaar};0) da los puntos. En Predict the Race el ganador vale {winnaar} puntos y la pole position {pole}; puedes usar esas cifras.'],
          ['¿Cómo pongo en la misma posición a jugadores empatados a puntos?', 'Con JERARQUIA en la pestaña de los totales. Con diez jugadores en B2 a B11, =JERARQUIA(B2;B$2:B$11) da la misma posición a los empatados: 1, 2, 2, 4. Predict the Race ordena igual.'],
        ],
        leesOok: [
          ['hoe', 'Cómo funciona Predict the Race'],
          ['faq', 'Preguntas frecuentes sobre la app'],
        ],
      },
      it: {
        pad: 'it/pronostici-f1-excel',
        titel: 'Gestire i pronostici F1 su Excel | Predict the Race',
        omschrijving: 'Gestire una lega di pronostici F1 su Excel o Fogli Google: le colonne che servono, la formula dei punti per posizione e dove si inceppa durante la stagione.',
        kop: 'Gestire i pronostici F1 su Excel',
        kort: 'Una lega di pronostici F1 si gestisce bene su Excel. Servono quattro colonne per giocatore e una formula che calcola i punti di ogni pilota. Il lavoro non sta nella formula ma nella gestione: ricopiare tutto il risultato a ogni weekend di gara, correggerlo dopo le penalità e far sì che tutti pronostichino in tempo.',
        teaser: 'Preferisci Excel? Le colonne e la formula',
        secties: [
          {
            id: 'colonne',
            vraag: 'Quali colonne servono?',
            kort: 'Per i pronostici F1 su Excel servono quattro colonne per giocatore e per sessione: il pilota, la posizione pronosticata, la posizione reale e i punti. Crea un foglio per gara con un blocco del genere per ogni giocatore, più un foglio con i totali.',
            tabel: {
              bijschrift: 'Le quattro colonne per giocatore, con una riga di esempio',
              kop: ['Colonna', 'Cosa contiene', 'Esempio'],
              rijen: [
                ['A', 'Il pilota', 'Verstappen'],
                ['B', 'Posizione prevista, da 1 a 10', '1'],
                ['C', 'Posizione reale, vuota se non in classifica', '2'],
                ['D', 'I punti, con la formula', '{bijna}'],
              ],
            },
            tekst: [
              'Nella riga 1 vanno le intestazioni, i dieci piloti nelle righe da 2 a 11. Metti i blocchi dei giocatori uno accanto all\'altro; se copi il blocco per il giocatore successivo, le formule si spostano da sole.',
            ],
          },
          {
            id: 'formula',
            vraag: 'Quale formula calcola i punti?',
            kort: 'La formula dei punti è {formule}, in D2 e poi trascinata fino a D11. Dà {exact} punti per la posizione esatta, {formStap} in meno per ogni posizione di scarto e mai meno di zero: gli stessi punti di Predict the Race.',
            formules: [
              ['Excel in italiano', '{formule}'],
              ['Il totale della sessione, in D12', '=SOMMA(D2:D11)'],
            ],
            tekst: [
              'È lo stesso calcolo di Predict the Race: {exact} punti per la posizione esatta, {bijna} per una posizione di scarto, {twee} per due, e niente da tre in su.',
              'La parte SE serve per una cella vuota. Senza, Excel conta la posizione 0 e un giocatore può prendere punti per un pilota che non aveva una posizione nel risultato.',
              'In italiano ABS si chiama ASS. I punti e virgola valgono per un Excel con la virgola come separatore decimale, come in Italia; se il tuo Excel usa il punto, diventano virgole.',
            ],
          },
          {
            id: 'fuori-top-10',
            vraag: 'Cosa fai con i piloti fuori dalla top 10?',
            kort: 'Un pilota fuori dalla top 10 si segna con la sua posizione reale, come gli altri. Se un giocatore mette qualcuno in P10 e lui arriva undicesimo, è una posizione di scarto, quindi {bijna} punti. Lascia la cella vuota solo per un pilota senza posizione nella classifica ufficiale; non vale niente.',
            tekst: [
              'Per questo serve il risultato completo, non solo la top 10. Nessuna posizione vuol dire, per esempio, non classificato o squalificato.',
            ],
          },
          {
            id: 'problemi',
            vraag: 'Dove si inceppa Excel?',
            kort: 'Una lega su Excel si inceppa raramente per la formula, e quasi sempre per la gestione. Dopo qualche gara una sola persona fa tutto il lavoro: ricopiare ogni risultato, correggerlo dopo le penalità, controllare le scadenze e mandare la classifica, ogni weekend.',
            punten: [
              ['Ricopiare ogni risultato', 'Il risultato completo di qualifiche e gara, a ogni weekend di gara. Due righe scambiate e la classifica è sbagliata, senza che nessuno se ne accorga.'],
              ['Penalità dopo la bandiera', 'Una penalità di tempo dopo il traguardo cambia il risultato. Allora devi tornare a quel foglio e ricontrollare tutto.'],
              ['Scadenze', 'Chi ha mandato la sua top 10 prima del via? Nel gruppo "l\'avevo già scritto" non si può verificare, e una lista che arriva dopo il via fa litigare.'],
              ['La classifica sul telefono', 'Un foglio condiviso si può fare, ma sul telefono quattro colonne per giocatore si leggono a fatica.'],
            ],
          },
          {
            id: 'senza-foglio',
            vraag: 'Si può fare senza foglio di calcolo?',
            kort: 'Sì, una lega di pronostici F1 funziona anche senza foglio di calcolo. Predict the Race conta i punti allo stesso modo, ma recupera da solo il risultato ufficiale dopo ogni qualifica e ogni gara. I pronostici si chiudono all\'inizio della sessione, quindi nessuno può cambiare niente dopo.',
            tekst: [
              'Se una penalità cambia il risultato poco dopo la gara, l\'app ricalcola. E la classifica è sul telefono di tutti, con chi sale e chi scende.',
              'È gratis e nessuno ha bisogno di un account. Condividi la lega con un codice nel gruppo.',
            ],
          },
        ],
        faq: [
          ['Funziona anche in Fogli Google?', 'Sì, con le stesse colonne e lo stesso calcolo. Se la formula dà errore, usa i nomi inglesi, che Fogli Google capisce sempre: IF al posto di SE, ABS al posto di ASS e SUM al posto di SOMMA. Con le impostazioni italiane continua a separare con il punto e virgola.'],
          ['Come conto il vincitore e la pole position?', 'Con una riga per domanda: giusto vale punti, sbagliato niente. Con il vincitore pronosticato in B14 e quello vero in C14, =SE(B14=C14;{winnaar};0) dà i punti. In Predict the Race il vincitore vale {winnaar} punti e la pole position {pole}; puoi riprendere questi numeri.'],
          ['Come metto alla stessa posizione i giocatori a pari punti?', 'Con RANGO nel foglio dei totali. Con dieci giocatori da B2 a B11, =RANGO(B2;B$2:B$11) dà la stessa posizione ai giocatori a pari punti: 1, 2, 2, 4. Predict the Race ordina allo stesso modo.'],
        ],
        leesOok: [
          ['hoe', 'Come funziona Predict the Race'],
          ['faq', 'Domande frequenti sull\'app'],
        ],
      },
      pt: {
        pad: 'pt/bolao-f1-excel',
        titel: 'Como fazer um bolão de F1 no Excel | Predict the Race',
        omschrijving: 'Como fazer um bolão de F1 no Excel ou no Planilhas Google: as colunas necessárias, a fórmula dos pontos por posição e onde a planilha complica na temporada.',
        kop: 'Como fazer um bolão de F1 no Excel',
        kort: 'Um bolão de F1 funciona bem no Excel. Você precisa de quatro colunas por jogador e de uma fórmula que calcula os pontos de cada piloto. O trabalho não está na fórmula, mas na manutenção: digitar o resultado inteiro a cada fim de semana de corrida, corrigir depois das punições e garantir que todos palpitem a tempo.',
        teaser: 'Prefere o Excel? As colunas e a fórmula',
        secties: [
          {
            id: 'colunas',
            vraag: 'De quais colunas você precisa?',
            kort: 'Para um bolão de F1 no Excel, você precisa de quatro colunas por jogador e por sessão: o piloto, a posição do palpite, a posição real e os pontos. Faça uma aba por corrida com um bloco assim para cada jogador, e uma aba com os totais.',
            tabel: {
              bijschrift: 'As quatro colunas por jogador, com uma linha de exemplo',
              kop: ['Coluna', 'O que vai nela', 'Exemplo'],
              rijen: [
                ['A', 'O piloto', 'Verstappen'],
                ['B', 'A posição do palpite, de 1 a 10', '1'],
                ['C', 'A posição real, vazia se não classificado', '2'],
                ['D', 'Os pontos, com a fórmula abaixo', '{bijna}'],
              ],
            },
            tekst: [
              'Na linha 1 ficam os cabeçalhos, e os dez pilotos nas linhas 2 a 11. Coloque os blocos dos jogadores lado a lado; ao copiar o bloco para o próximo jogador, as fórmulas acompanham.',
            ],
          },
          {
            id: 'formula',
            vraag: 'Qual fórmula calcula os pontos?',
            kort: 'A fórmula dos pontos é {formule}, em D2 e depois arrastada até D11. Ela dá {exact} pontos pela posição exata, {formStap} a menos por posição de diferença e nunca menos que zero: os mesmos pontos do Predict the Race.',
            formules: [
              ['Excel em português', '{formule}'],
              ['O total da sessão, em D12', '=SOMA(D2:D11)'],
            ],
            tekst: [
              'É a mesma conta do Predict the Race: {exact} pontos pela posição exata, {bijna} por uma posição de diferença, {twee} por duas, e nada a partir de três.',
              'A parte SE existe para uma célula vazia. Sem ela, o Excel conta a posição 0 e um jogador pode ganhar pontos por um piloto que não teve posição no resultado.',
              'Em português, MAX se chama MÁXIMO. Os pontos e vírgulas valem para um Excel com vírgula decimal, como no Brasil e em Portugal; se o seu Excel usa ponto, eles viram vírgulas.',
            ],
          },
          {
            id: 'fora-top-10',
            vraag: 'E os pilotos fora do top 10?',
            kort: 'Um piloto fora do top 10 entra com a posição real, como qualquer outro. Se um jogador coloca alguém em P10 e ele termina em décimo primeiro, é uma posição de diferença, então {bijna} pontos. Deixe a célula vazia só para um piloto sem posição na classificação oficial; ele não vale nada.',
            tekst: [
              'Por isso você precisa do resultado completo, não só do top 10. Sem posição quer dizer, por exemplo, não classificado ou desclassificado.',
            ],
          },
          {
            id: 'problemas',
            vraag: 'Onde a planilha complica?',
            kort: 'Um bolão no Excel raramente dá errado por causa da fórmula, e quase sempre por causa da manutenção. Depois de algumas corridas, uma só pessoa faz todo o trabalho: digitar cada resultado, corrigir depois das punições, cuidar dos prazos e mandar a classificação, todo fim de semana.',
            punten: [
              ['Digitar cada resultado', 'O resultado completo da classificação e da corrida, a cada fim de semana de corrida. Duas linhas trocadas e a classificação fica errada, sem ninguém perceber.'],
              ['Punições depois da bandeirada', 'Uma punição de tempo depois da chegada muda o resultado. Aí você volta naquela aba e confere tudo de novo.'],
              ['Prazos', 'Quem mandou o top 10 antes da largada? No grupo, "eu já tinha digitado" não dá para conferir, e uma lista que chega depois da largada vira briga.'],
              ['A classificação no celular', 'Dá para compartilhar a planilha, mas no celular quatro colunas por jogador mal se leem.'],
            ],
          },
          {
            id: 'sem-planilha',
            vraag: 'Dá para fazer sem planilha?',
            kort: 'Sim, um bolão de F1 funciona sem planilha. O Predict the Race conta os pontos do mesmo jeito, mas busca sozinho o resultado oficial depois de cada classificação e de cada corrida. Os palpites fecham no início da sessão, então ninguém consegue mudar nada depois.',
            tekst: [
              'Se uma punição muda o resultado pouco depois da corrida, o app recalcula. E a classificação fica no celular de todo mundo, com quem subiu e quem caiu.',
              'É grátis e ninguém precisa de conta. Você compartilha o bolão com um código no grupo.',
            ],
          },
        ],
        faq: [
          ['Funciona no Planilhas Google?', 'Sim, com as mesmas colunas e a mesma conta. Se a fórmula der erro, use os nomes em inglês, que o Planilhas Google sempre entende: IF no lugar de SE, MAX no lugar de MÁXIMO e SUM no lugar de SOMA. Com a configuração do Brasil, continue separando com ponto e vírgula.'],
          ['Como conto o vencedor e a pole position?', 'Com uma linha por pergunta: acerto vale pontos, erro não vale nada. Com o vencedor do palpite em B14 e o real em C14, =SE(B14=C14;{winnaar};0) dá os pontos. No Predict the Race o vencedor vale {winnaar} pontos e a pole position {pole}; você pode usar esses números.'],
          ['Como coloco na mesma posição jogadores empatados em pontos?', 'Com ORDEM na aba dos totais. Com dez jogadores de B2 a B11, =ORDEM(B2;B$2:B$11) dá a mesma posição aos empatados: 1, 2, 2, 4. O Predict the Race classifica do mesmo jeito.'],
        ],
        leesOok: [
          ['hoe', 'Como funciona o Predict the Race'],
          ['faq', 'Perguntas frequentes sobre o app'],
        ],
      },
    },
  },
  // De vergelijking met andere apps (zoekplan SEO fase 2, AEO 3.2, GEO fase 4).
  // Bovenaan zegt de pagina wie hem schreef (openheid, in de auteursregel).
  // Elk feit over een andere app staat op diens eigen site; wat daar niet te
  // controleren viel, staat hier niet. gecontroleerd is de datum van die
  // controle: hij staat zichtbaar op de pagina ({gecontroleerd}), en na drie
  // maanden waarschuwt scripts/maak-site.mjs. F1 Predict is het officiële spel
  // van de Formule 1 op f1predict.formula1.com, niet een losse app met die naam.
  // Waar de feiten vandaan komen, per app: docs/zoekplan/concurrenten.md.
  {
    id: 'vergelijking',
    soort: 'vergelijking',
    verwant: ['organiseren', 'puntentelling', 'excel'],
    gecontroleerd: '2026-09-29',
    talen: {
      nl: {
        pad: 'f1-poule-apps-vergeleken',
        titel: 'Beste F1-poule-apps van 2026 | Predict the Race',
        omschrijving: 'Predict the Race naast F1 Predict, F1 Fantasy, GP Poule, poules.com, Superbru en Excel: wat je voorspelt, wat het kost en wanneer iets anders beter past.',
        kop: 'De beste F1-poule-apps van 2026, vergeleken',
        openheid: 'Deze vergelijking is geschreven door de maker van Predict the Race.',
        kort: 'F1-poule-apps verschillen vooral in wat je doet: in F1 Fantasy stel je een team samen, in F1 Predict, GP Poule, poules.com, Superbru en Predict the Race voorspel je de uitslag. Daarna verschillen ze in wat het kost en of er prijzen zijn. Predict the Race is gratis en zonder account, maar heeft geen prijzen en geen app in de stores.',
        secties: [
          {
            id: 'welke',
            vraag: 'Welke F1-poule-app past bij jouw groep?',
            kort: 'Voor een vriendengroep die de volgorde wil voorspellen zonder dat er geld in zit, passen Predict the Race en GP Poule: allebei gratis, met een eigen poule. Wil je groep binnen een budget een team samenstellen, neem dan F1 Fantasy. Wie om prijzen wil spelen, kijkt naar F1 Predict of Superbru. En wie alles zelf wil bepalen, houdt het bij in Excel.',
            appstabel: {
              bijschrift: 'F1-poule-apps en Excel naast elkaar, volgens hun eigen site op {gecontroleerd}',
              kop: ['App', 'Wat je doet', 'Wat het kost', 'Met je eigen groep'],
              rijen: [
                { naam: 'Predict the Race', cellen: ['De top 10 van kwalificatie en race voorspellen, plus losse vragen zoals de winnaar', 'Gratis, zonder advertenties en zonder prijzen', 'Een eigen poule met een code, zonder account'] },
                { naam: 'F1 Predict', url: 'https://f1predict.formula1.com/', cellen: ['Vragen over elke Grand Prix beantwoorden', 'Gratis, met prijzen voor wie bovenaan het klassement eindigt', 'Leagues maken en er lid van worden'] },
                { naam: 'F1 Fantasy', url: 'https://fantasy.formula1.com/', cellen: ['Binnen een budget een team van coureurs en constructeurs samenstellen', 'Gratis', 'Een league met een code, na inloggen'] },
                { naam: 'GP Poule', url: 'https://www.gppoule.nl/', cellen: ['De top 10 van elke Grand Prix en sprint voorspellen, plus voorspellingen voor het hele seizoen', 'Gratis, met een betaald premium-lidmaatschap ernaast', 'Een eigen poule, of de landelijke poule'] },
                { naam: 'poules.com', url: 'https://poules.com/nl/start/formule-1', cellen: ['De top 3 van de kwalificatie en de top 10 van de race voorspellen, plus twee bonusvragen', 'Betaald per speler per competitie; de eerste keer gratis', 'Een eigen poule, of een publieke'] },
                { naam: 'Superbru', url: 'https://www.superbru.com/f1/', cellen: ['Pole, podium, plek 4 tot en met 10 en de snelste ronde voorspellen', 'Gratis; zonder advertenties met een betaald seizoensticket', 'Een eigen pool'] },
                { naam: 'Excel of Google Sheets', pagina: 'excel', cellen: ['Wat je samen afspreekt', 'Niets extra als je Excel of Google Sheets al hebt', 'Iedereen die de sheet kan openen; iemand houdt de uitslagen bij'] },
              ],
            },
            tekst: [
              'Alles over de andere apps komt van hun eigen site, gecontroleerd op {gecontroleerd}. Wat daar niet te vinden was, staat hier ook niet. Is er iets veranderd? Het mailadres staat in de privacyverklaring.',
            ],
          },
          {
            id: 'f1-predict',
            vraag: 'Wat is het verschil met F1 Predict?',
            kort: 'F1 Predict is het officiële voorspelspel van de Formule 1: je beantwoordt per Grand Prix vragen over de race en speelt tegen fans over de hele wereld, met prijzen voor wie bovenaan eindigt. In Predict the Race voorspel je de top 10 van kwalificatie en race, in een poule met je eigen groep en zonder prijzen. Predict the Race is geen officiële app.',
            tekst: [
              'De namen lijken op elkaar, maar de spellen staan los van elkaar. F1 Predict staat op f1predict.formula1.com; Predict the Race is een onafhankelijk fanproject en niet verbonden aan de Formule 1, de FIA of een F1-team.',
              'Ook in F1 Predict kun je leagues maken en er lid van worden. Hoeveel vragen er per race zijn en hoe de punten daar precies werken, viel op hun site niet na te gaan; daarom staat het hier niet.',
            ],
          },
          {
            id: 'alternatief',
            vraag: 'Wat is een gratis alternatief voor F1 Fantasy?',
            kort: 'Een gratis alternatief voor F1 Fantasy is een voorspelspel: je voorspelt de uitslag in plaats van een team samen te stellen, dus zonder budget en zonder transfers. Predict the Race is er zo een, net als GP Poule en Superbru. In Predict the Race voorspel je de top 10 van kwalificatie en race, met {exact} punten voor precies goed en {een} bij één plek ernaast.',
            tekst: [
              'Het verschil zit vooral in de telling. GP Poule geeft {=3} punten voor een plek precies goed en {=1} voor één plek ernaast. Predict the Race geeft ook nog {twee} punt bij twee plekken ernaast, zodat wie de volgorde goed inschat daar iets voor terugkrijgt.',
            ],
            links: [
              { pagina: 'puntentelling', anker: 'bijna-goed', tekst: 'Waarom punten voor bijna goed eerlijker zijn' },
            ],
          },
          {
            id: 'anders',
            vraag: 'Wanneer past iets anders beter?',
            kort: 'Iets anders past beter als je groep een team wil samenstellen met een budget en transfers: neem dan F1 Fantasy. Wil je om prijzen spelen, dan is Predict the Race niets voor je, want prijzen zijn er niet. Een app op je telefoon kan wel, alleen niet uit de App Store of Google Play.',
            punten: [
              ['Een team met een budget', 'F1 Fantasy, het officiële fantasyspel van de Formule 1. Je stelt een team van coureurs en constructeurs samen en scoort op wat zij in het echt doen.'],
              ['Om prijzen spelen', 'F1 Predict en Superbru noemen allebei prijzen op hun site. Predict the Race heeft geen inleg, geen pot en geen prijzen.'],
              ['Per se een app uit de store', 'Superbru heeft een app voor iPhone en Android, en F1 Fantasy speel je ook in de officiële F1-app. Predict the Race zet je vanuit de browser op je beginscherm: dan heb je een eigen icoon en meldingen voor je deadlines, maar hij staat niet in de App Store of Google Play.'],
              ['Een andere taal', 'De app en de voorpagina zijn er alleen in het Nederlands, Engels, Duits, Frans, Spaans, Italiaans of Portugees. Wie een andere taal zoekt, moet verder kijken.'],
              ['Alles zelf bepalen', 'Een spreadsheet. Je spreekt zelf de regels af, maar iemand moet na elke sessie de uitslag overtypen.'],
            ],
            tekst: [
              'Predict the Race is bovendien jong: online sinds september 2026 en gemaakt door één persoon.',
            ],
          },
        ],
        faq: [],
        leesOok: [
          ['faq', 'Veelgestelde vragen over de app'],
        ],
      },
      en: {
        pad: 'en/f1-prediction-games-compared',
        titel: 'Best F1 prediction games 2026 | Predict the Race',
        omschrijving: 'Predict the Race next to F1 Predict, F1 Fantasy, Superbru, GridRival, Kicktipp, Podium Prophets and a spreadsheet: what you do, what it costs, what fits.',
        kop: 'The best F1 prediction games of 2026, compared',
        openheid: 'This comparison was written by the maker of Predict the Race.',
        kort: 'F1 prediction games, also called race prediction games, come in two kinds. In F1 Fantasy and GridRival you build a team within a budget; in F1 Predict, Superbru, Kicktipp, Podium Prophets and Predict the Race you predict the results. Beyond that they differ in price, prizes and how much you predict. Predict the Race is free and needs no account, but has no prizes and no app in the stores.',
        secties: [
          {
            id: 'which',
            vraag: 'Which F1 prediction game suits your group?',
            kort: 'For friends who want to predict the order with no money involved, Predict the Race and Podium Prophets fit best: both are free and have private leagues. If your group would rather build a team within a budget, pick F1 Fantasy or GridRival. To play for prizes, look at F1 Predict or Superbru. And a group that wants to set every rule itself can use Kicktipp or a spreadsheet.',
            appstabel: {
              bijschrift: 'F1 prediction games and a spreadsheet side by side, as their own sites described them on {gecontroleerd}',
              kop: ['Game', 'What you do', 'What it costs', 'With your own group'],
              rijen: [
                { naam: 'Predict the Race', cellen: ['Predict the top 10 of qualifying and the race, plus extra questions such as the winner', 'Free, no ads, no prizes', 'A private league with a code, no account needed'] },
                { naam: 'F1 Predict', url: 'https://f1predict.formula1.com/', cellen: ['Answer questions about each Grand Prix', 'Free, with prizes for the top of the leaderboard', 'Create and join leagues'] },
                { naam: 'F1 Fantasy', url: 'https://fantasy.formula1.com/', cellen: ['Build a team of drivers and constructors within a budget', 'Free', 'A league with a code, after logging in'] },
                { naam: 'Superbru', url: 'https://www.superbru.com/f1/', cellen: ['Predict pole, the podium, places 4 to 10 and the fastest lap', 'Free; ad-free with a paid season ticket', 'A private pool'] },
                { naam: 'GridRival', url: 'https://gridrival.com/', cellen: ['Sign five drivers and one constructor on contracts within a budget', 'Free leagues', 'A private league, or a public one'] },
                { naam: 'Kicktipp', url: 'https://www.kicktipp.de/', cellen: ['Predict results in a round you set up yourself; each round has its own points rules', 'Free', 'A private round, or a public one'] },
                { naam: 'Podium Prophets', url: 'https://podiumprophets.com/', cellen: ['Predict the top 10 of qualifying, the race and both sprint sessions', 'Free, no ads', 'A private league with an invite link; each league can set its own points'] },
                { naam: 'Spreadsheet', pagina: 'excel', cellen: ['Whatever you agree on', 'Nothing extra if you already have Excel or Google Sheets', 'Anyone who can open the sheet; someone keeps the results up to date'] },
              ],
            },
            tekst: [
              'Everything about the other games comes from their own sites, checked on {gecontroleerd}. What could not be found there is not here either. Has something changed? The email address is in the privacy statement.',
            ],
          },
          {
            id: 'f1-predict',
            vraag: 'How is Predict the Race different from F1 Predict?',
            kort: 'F1 Predict is the official prediction game of Formula 1: you answer questions about each Grand Prix and play against fans around the world, with prizes for the top of the leaderboard. Predict the Race is an independent fan project where you predict the top 10 of qualifying and the race, in a league with your own group. It has no prizes.',
            tekst: [
              'The names are alike, but the games are not connected. F1 Predict lives at f1predict.formula1.com, and Predict the Race is not affiliated with Formula 1, the FIA or any F1 team.',
              'F1 Predict also lets you create and join leagues. How many questions it asks per race and exactly how its points work could not be checked on its site, so that is left out here.',
            ],
          },
          {
            id: 'alternative',
            vraag: 'What is a free alternative to F1 Fantasy?',
            kort: 'A free alternative to F1 Fantasy is a prediction game: instead of building a team, you predict the results, so there is no budget and there are no transfers. Predict the Race is one, and so are Podium Prophets and Superbru. In Predict the Race you predict the top 10 of qualifying and the race, with {exact} points for the exact spot and {een} for one place off.',
            tekst: [
              'Podium Prophets scores a top 10 the same way by default: {=5} points for the exact spot, {=3} for one place off and {=1} for two. Where the two differ is the extras. Podium Prophets adds race pace charts and session analysis; Predict the Race adds jokers, team-mate duels and a weekend winner.',
            ],
            links: [
              { pagina: 'puntentelling', anker: 'nearly-right', tekst: 'Why points for nearly right are fairer' },
            ],
          },
          {
            id: 'something-else',
            vraag: 'When does something else fit better?',
            kort: 'Something else fits better if your group wants a team with a budget and transfers: that is F1 Fantasy, or GridRival. If you want to play for prizes, Predict the Race is not for you, because it has none. An app on your phone works too, just not from the App Store or Google Play.',
            punten: [
              ['A team with a budget', 'F1 Fantasy, the official fantasy game of Formula 1, or GridRival, where you sign drivers on contracts and pocket it when their value goes up.'],
              ['Playing for prizes', 'F1 Predict and Superbru both mention prizes on their sites. Predict the Race has no entry fee, no pot and no prizes.'],
              ['It has to come from an app store', 'Superbru has apps for iPhone and Android, and F1 Fantasy can also be played in the official F1 app. You add Predict the Race to your home screen from the browser: it then has its own icon and reminders before your deadlines, but it is not in the App Store or Google Play.'],
              ['Another language', 'The app and the home page are only in English, Dutch, German, French, Spanish, Italian, or Portuguese. Anyone looking for another language has to look elsewhere.'],
              ['Race analysis', 'Podium Prophets has race pace charts, long-run data and qualifying breakdowns. Predict the Race sticks to the game.'],
              ['Setting every rule yourself', 'Kicktipp, where each round sets its own points, or a spreadsheet. In a spreadsheet, someone has to type in the results after every session.'],
            ],
            tekst: [
              'Predict the Race is also young: online since September 2026 and made by one person.',
            ],
          },
        ],
        faq: [],
        leesOok: [
          ['faq', 'Frequently asked questions about the app'],
        ],
      },
    },
  },
  // De about-pagina (zoekplan SEO fase 2, GEO 1.3): wie het maakt, hoe het
  // gratis blijft en hoe het werkt. Begint met de kernzin; de feiten over de
  // maker komen uit het zoekplan van Danny zelf. Geen teaser op de voorpagina,
  // wel een link in de voet en bij de naam onder elke gids.
  {
    id: 'over',
    soort: 'over',
    verwant: ['organiseren'],
    talen: {
      nl: {
        pad: 'over',
        titel: 'Over de gratis F1-poule en de maker | Predict the Race',
        omschrijving: 'Wie Predict the Race maakt en waarom, hoe de gratis F1-poule zonder advertenties en abonnement werkt, en waar de uitslagen vandaan komen.',
        kop: 'Over Predict the Race',
        kort: '{kernzin}',
        secties: [
          {
            id: 'wie',
            vraag: 'Wie maakt Predict the Race?',
            kort: '{makerzin} Hij begon eraan voor zijn eigen vriendenpoule. Predict the Race is een onafhankelijk fanproject en is niet verbonden aan de Formule 1, de FIA of een F1-team.',
            tekst: [
              'Een vraag, een idee of een fout gevonden? Het mailadres staat in de privacyverklaring, en daar kun je ook terecht met vragen over je gegevens.',
            ],
          },
          {
            id: 'gratis',
            vraag: 'Hoe blijft Predict the Race gratis?',
            kort: 'Predict the Race is een fanproject zonder verdienmodel: geen advertenties, geen abonnement, geen betaalde functies, en er worden geen gegevens doorverkocht. Iedereen kan alles gebruiken, zonder account. Er zit ook geen geld in het spel: geen inleg, geen pot en geen prijzen.',
            tekst: [
              'Bezoekstatistieken met Google Analytics komen er alleen bij als je daar zelf ja op zegt. Wat er precies bewaard wordt, staat in de privacyverklaring.',
            ],
          },
          {
            id: 'techniek',
            vraag: 'Hoe werkt Predict the Race achter de schermen?',
            kort: 'De kalender, de deelnemers en de uitslagen komen van OpenF1, een openbare bron met Formule 1-gegevens. Een GitHub Action haalt ze automatisch op en zet ze in een database bij Supabase; de app rekent daarmee de punten en de stand uit. De site draait op GitHub Pages.',
            tekst: [
              'Na een race kijkt de sync in twee rondes nog of een straf de uitslag veranderde, en dan rekent de app opnieuw.',
            ],
          },
        ],
        faq: [],
        leesOok: [
          ['faq', 'Veelgestelde vragen over de app'],
        ],
      },
      en: {
        pad: 'en/about',
        titel: 'About this free F1 prediction game | Predict the Race',
        omschrijving: 'Who makes Predict the Race and why, how the free F1 prediction game stays free of ads and subscriptions, and where the results come from.',
        kop: 'About Predict the Race',
        kort: '{kernzin}',
        secties: [
          {
            id: 'who',
            vraag: 'Who makes Predict the Race?',
            kort: '{makerzin} He started it for his own group of friends. Predict the Race is an independent fan project and is not affiliated with Formula 1, the FIA or any F1 team.',
            tekst: [
              'A question, an idea or found a bug? The email address is in the privacy statement, which is also where to go with questions about your data.',
            ],
          },
          {
            id: 'free',
            vraag: 'How does Predict the Race stay free?',
            kort: 'Predict the Race is a fan project with no business model: no ads, no subscription, no paid features, and no data sold on. Everyone can use everything, without an account. There is no money in the game either: no entry fee, no pot and no prizes.',
            tekst: [
              'Visitor statistics with Google Analytics are only added if you say yes to them yourself. What is stored exactly is in the privacy statement.',
            ],
          },
          {
            id: 'behind-the-scenes',
            vraag: 'How does Predict the Race work behind the scenes?',
            kort: 'The calendar, the entry lists and the results come from OpenF1, a public source of Formula 1 data. A GitHub Action fetches them automatically and stores them in a Supabase database, and the app works out the points and the standings from there. The site runs on GitHub Pages.',
            tekst: [
              'After a race, the sync checks in two more rounds whether a penalty changed the result, and the app scores it again if so.',
            ],
          },
        ],
        faq: [],
        leesOok: [
          ['faq', 'Frequently asked questions about the app'],
        ],
      },
    },
  },
];

// De vaste woorden van het sjabloon, alleen voor de talen waarin er pagina's
// zijn. `uren` maakt van een aantal uur een stukje zin ("een uur", "3 uur").
export const PAGINA_UI = {
  nl: {
    kruimel: 'Kruimelpad',
    // Het hoofdmenu bovenaan de voorpagina en elke artikelpagina: losse
    // pagina's, geen sprongen binnen de voorpagina. Google kiest de links
    // onder een zoekresultaat (sitelinks) graag uit het hoofdmenu.
    menu: { naam: 'Hoofdmenu', items: [['puntentelling', 'Puntentelling'], ['organiseren', 'Organiseren'], ['races', 'Races'], ['over', 'Over']] },
    door: 'Door {naam}, bijgewerkt op {datum}',
    faq: 'Veelgestelde vragen',
    leesOok: 'Lees ook',
    gidsen: 'Gidsen',
    over: 'Over Predict the Race',
    terug: 'Naar de voorpagina',
    app: 'Open de app',
    privacy: 'Privacy',
    taal: 'Taal',
    slot: { kop: 'Klaar om te beginnen?', tekst: 'Maak je poule in een minuut en deel de code met je vrienden.', knop: 'Maak je poule' },
    uren: (n) => (n === 1 ? 'een uur' : `${n} uur`),
  },
  en: {
    kruimel: 'Breadcrumb',
    menu: { naam: 'Main menu', items: [['puntentelling', 'Scoring'], ['organiseren', 'Run a league'], ['races', 'Races'], ['over', 'About']] },
    door: 'By {naam}, updated {datum}',
    faq: 'Frequently asked questions',
    leesOok: 'Read next',
    gidsen: 'Guides',
    over: 'About Predict the Race',
    terug: 'Back to the home page',
    app: 'Open the app',
    privacy: 'Privacy',
    taal: 'Language',
    slot: { kop: 'Ready to start?', tekst: 'Start your league in a minute and share the code with your friends.', knop: 'Start your league' },
    uren: (n) => (n === 1 ? 'an hour' : `${n} hours`),
  },
  // De vijf talen hieronder hebben voorlopig alleen de racepagina's; het menu
  // toont wat er in die taal is.
  de: {
    kruimel: 'Navigationspfad',
    menu: { naam: 'Hauptmenü', items: [['puntentelling', 'Punkte'], ['organiseren', 'Tipprunde organisieren'], ['races', 'Rennen'], ['over', 'Über uns']] },
    door: 'Von {naam}, aktualisiert am {datum}',
    faq: 'Häufige Fragen',
    leesOok: 'Weiterlesen',
    gidsen: 'Ratgeber',
    over: 'Über Predict the Race',
    terug: 'Zur Startseite',
    app: 'App öffnen',
    privacy: 'Datenschutz',
    taal: 'Sprache',
    slot: { kop: 'Bereit?', tekst: 'Erstelle deine Tipprunde in einer Minute und teile den Code mit deinen Freunden.', knop: 'Tipprunde erstellen' },
    uren: (n) => (n === 1 ? 'eine Stunde' : `${n} Stunden`),
  },
  fr: {
    kruimel: 'Fil d\'Ariane',
    menu: { naam: 'Menu principal', items: [['puntentelling', 'Points'], ['organiseren', 'Organiser une ligue'], ['races', 'Courses'], ['over', 'À propos']] },
    door: 'Par {naam}, mis à jour le {datum}',
    faq: 'Questions fréquentes',
    leesOok: 'À lire aussi',
    gidsen: 'Guides',
    over: 'À propos de Predict the Race',
    terug: 'Retour à l\'accueil',
    app: 'Ouvrir l\'appli',
    privacy: 'Confidentialité',
    taal: 'Langue',
    slot: { kop: 'Prêt à commencer ?', tekst: 'Créez votre ligue en une minute et partagez le code avec vos amis.', knop: 'Créer une ligue' },
    uren: (n) => (n === 1 ? 'une heure' : `${n} heures`),
  },
  es: {
    kruimel: 'Ruta de navegación',
    menu: { naam: 'Menú principal', items: [['puntentelling', 'Puntuación'], ['organiseren', 'Organizar'], ['races', 'Carreras'], ['over', 'Acerca de']] },
    door: 'Por {naam}, actualizado el {datum}',
    faq: 'Preguntas frecuentes',
    leesOok: 'Sigue leyendo',
    gidsen: 'Guías',
    over: 'Acerca de Predict the Race',
    terug: 'Volver a la portada',
    app: 'Abrir la app',
    privacy: 'Privacidad',
    taal: 'Idioma',
    slot: { kop: '¿Listo para empezar?', tekst: 'Crea tu liga en un minuto y comparte el código con tus amigos.', knop: 'Crea tu liga' },
    uren: (n) => (n === 1 ? 'una hora' : `${n} horas`),
  },
  it: {
    kruimel: 'Percorso',
    menu: { naam: 'Menu principale', items: [['puntentelling', 'Punteggio'], ['organiseren', 'Organizzare'], ['races', 'Gare'], ['over', 'Chi siamo']] },
    door: 'Di {naam}, aggiornato il {datum}',
    faq: 'Domande frequenti',
    leesOok: 'Leggi anche',
    gidsen: 'Guide',
    over: 'Su Predict the Race',
    terug: 'Torna alla home',
    app: 'Apri l\'app',
    privacy: 'Privacy',
    taal: 'Lingua',
    slot: { kop: 'Pronto a iniziare?', tekst: 'Crea la tua lega in un minuto e condividi il codice con i tuoi amici.', knop: 'Crea la tua lega' },
    uren: (n) => (n === 1 ? 'un\'ora' : `${n} ore`),
  },
  pt: {
    kruimel: 'Navegação estrutural',
    menu: { naam: 'Menu principal', items: [['puntentelling', 'Pontuação'], ['organiseren', 'Organizar'], ['races', 'Corridas'], ['over', 'Sobre']] },
    door: 'Por {naam}, atualizado em {datum}',
    faq: 'Perguntas frequentes',
    leesOok: 'Leia também',
    gidsen: 'Guias',
    over: 'Sobre o Predict the Race',
    terug: 'Voltar para a página inicial',
    app: 'Abrir o app',
    privacy: 'Privacidade',
    taal: 'Idioma',
    slot: { kop: 'Pronto para começar?', tekst: 'Crie seu bolão em um minuto e compartilhe o código com seus amigos.', knop: 'Crie seu bolão' },
    uren: (n) => (n === 1 ? 'uma hora' : `${n} horas`),
  },
};
