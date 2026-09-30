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
            kort: 'Laat zo veel vragen meetellen als je groep volhoudt. De twee top 10\'s per weekend, van de kwalificatie en de race, zijn genoeg voor een fanatieke poule. Wie meer wil, kiest Klassiek met de winnaar, de pole position en de snelste ronde erbij, of Gevorderd met alle {nGevorderd} vragen.',
            tabel: {
              bijschrift: 'De drie niveaus van Predict the Race',
              kop: ['Niveau', 'Vragen', 'Punten per weekend'],
              rijen: [
                ['Simpel', '{nSimpel}', '{simpel}'],
                ['Klassiek', '{nKlassiek}', '{klassiek}'],
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
              'Automatisch invullen: samen afgesproken of het aan gaat.',
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
            kort: 'Count as many questions as your group will keep up with. The two top 10s each weekend, qualifying and race, are plenty for a competitive league. If you want more, Classic adds the winner, pole position and fastest lap, and Advanced switches on all {nGevorderd} questions.',
            tabel: {
              bijschrift: 'The three levels in Predict the Race',
              kop: ['Level', 'Questions', 'Points per weekend'],
              rijen: [
                ['Simple', '{nSimpel}', '{simpel}'],
                ['Classic', '{nKlassiek}', '{klassiek}'],
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
              'Auto-fill: agreed together whether it is on.',
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
        titel: 'F1-poule-apps vergeleken | Predict the Race',
        omschrijving: 'Predict the Race naast F1 Predict, F1 Fantasy, GP Poule, poules.com, Superbru en Excel: wat je voorspelt, wat het kost en wanneer iets anders beter past.',
        kop: 'F1-poule-apps vergeleken',
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
            kort: 'Iets anders past beter als je groep een team wil samenstellen met een budget en transfers: neem dan F1 Fantasy. Wil je om prijzen spelen, dan is Predict the Race niets voor je, want prijzen zijn er niet. En wie de app in een andere taal dan Nederlands of Engels wil, of een app uit de App Store of Google Play, moet ook verder kijken.',
            punten: [
              ['Een team met een budget', 'F1 Fantasy, het officiële fantasyspel van de Formule 1. Je stelt een team van coureurs en constructeurs samen en scoort op wat zij in het echt doen.'],
              ['Om prijzen spelen', 'F1 Predict en Superbru noemen allebei prijzen op hun site. Predict the Race heeft geen inleg, geen pot en geen prijzen.'],
              ['Een app uit de store', 'Superbru heeft een app voor iPhone en Android, en F1 Fantasy speel je ook in de officiële F1-app. Predict the Race is een web-app die je vanuit de browser op je beginscherm zet.'],
              ['Een andere taal', 'De app van Predict the Race is er in het Nederlands en het Engels. De voorpagina is er ook in het Duits, Frans, Spaans, Italiaans en Portugees, de app niet.'],
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
        titel: 'F1 prediction games compared | Predict the Race',
        omschrijving: 'Predict the Race next to F1 Predict, F1 Fantasy, Superbru, GridRival, Kicktipp, Podium Prophets and a spreadsheet: what you do, what it costs, what fits.',
        kop: 'F1 prediction games compared',
        openheid: 'This comparison was written by the maker of Predict the Race.',
        kort: 'F1 prediction games come in two kinds. In F1 Fantasy and GridRival you build a team within a budget; in F1 Predict, Superbru, Kicktipp, Podium Prophets and Predict the Race you predict the results. Beyond that they differ in price, prizes and how much you predict. Predict the Race is free and needs no account, but has no prizes and no app in the stores.',
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
            kort: 'Something else fits better if your group wants a team with a budget and transfers: that is F1 Fantasy, or GridRival. If you want to play for prizes, Predict the Race is not for you, because it has none. The same goes if you want the app in a language other than English or Dutch, or an app from the App Store or Google Play.',
            punten: [
              ['A team with a budget', 'F1 Fantasy, the official fantasy game of Formula 1, or GridRival, where you sign drivers on contracts and pocket it when their value goes up.'],
              ['Playing for prizes', 'F1 Predict and Superbru both mention prizes on their sites. Predict the Race has no entry fee, no pot and no prizes.'],
              ['An app from the store', 'Superbru has apps for iPhone and Android, and F1 Fantasy can also be played in the official F1 app. Predict the Race is a web app that you add to your home screen from the browser.'],
              ['Another language', 'The Predict the Race app is in English and Dutch. The home page also exists in German, French, Spanish, Italian and Portuguese; the app does not.'],
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
};
