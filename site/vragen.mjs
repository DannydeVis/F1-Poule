// Elke vraag die mensen stellen, met precies één plek op de site waar het
// antwoord staat. Andere woorden voor dezelfde vraag zijn varianten, geen
// nieuwe vraag: die krijgen nooit een eigen sectie of pagina.
//
// Zoekplan AEO fase 1 (docs/zoekplan/2-aeo.md). Dit bestand komt niet online
// (_config.yml sluit site/*.mjs uit); test/vragen.test.mjs legt het naast de
// gegenereerde pagina's.
//
// Per vraag:
//   vraag      zo staat hij als kop (h2) of als FAQ-vraag op de pagina
//   taal       een code uit TALEN in site/teksten.mjs
//   varianten  andere woorden voor dezelfde vraag, ook zoektermen. Die mogen
//              nergens als kop of FAQ staan.
//   bron       hypothese | autocomplete | paa | reddit | gsc | bing | zoekresultaat
//              Het sterkste bewijs dat de vraag of een van zijn varianten leeft.
//              zoekresultaat: een andere site stelt hem als titel, kop of FAQ,
//              gevonden met een zoekmachine (dus niet uit de suggesties of
//              "Mensen vragen ook", die vanuit Claude Code niet te bereiken zijn).
//   doel       een id uit site/paginas.mjs (of 'voorpagina') met het id van de
//              sectie erachter: 'puntentelling#gelijk', 'voorpagina#faq'. Een
//              open vraag mag alleen een pagina noemen, als de sectie er nog
//              niet is en de ids in die taal nog niet vastliggen.
//   status     open (nog geen antwoord op de site) | beantwoord | bewust-niet
//   waarom     alleen bij bewust-niet, en dan verplicht
//
// Een beantwoorde vraag staat letterlijk op zijn plek. Elke vraag-kop en elke
// FAQ op de voorpagina en de gidsen staat hier, in elke taal waarin er een gids
// is (sinds 13 oktober alle zeven). Twee vragen op één plek kan alleen in een
// FAQ.
//
// Nieuwe vragen (uit Search Console, "Mensen vragen ook", Reddit) komen hier
// eerst. Een nieuwe vraag krijgt een plek in een bestaande sectie of FAQ, alleen
// een nieuwe sectie als het echt een nieuwe vraag is, en nooit een eigen pagina.

// Pagina's uit het zoekplan die er nog niet zijn. Een open vraag mag erheen
// wijzen; staat de pagina in site/paginas.mjs, dan gaat hij hier weg.
export const GEPLANDE_PAGINAS = [];

export const VRAGEN = [
  // ================================================================ NL
  // ---- voorpagina ----
  // Het antwoordblok legt in één alinea het hele spel uit; daar hoort ook
  // "hoe werkt een F1-poule?" (speluitleg, spelregels) bij, dat andere
  // poulesites (f1poule.com, gppoule.nl, poules.com) als kop gebruiken.
  { vraag: 'Wat is Predict the Race?', taal: 'nl', varianten: ['Hoe werkt een F1-poule?', 'f1 poule speluitleg', 'f1 poule spelregels'],
    bron: 'zoekresultaat', doel: 'voorpagina#wat', status: 'beantwoord' },
  { vraag: 'Is Predict the Race gratis?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Hoe doe ik mee met een poule?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Moet ik een account aanmaken?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Hoe werkt de puntentelling?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Waar komen de uitslagen vandaan?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Tot wanneer kan ik invullen?', taal: 'nl', varianten: ['Tot wanneer kan iedereen invullen?'],
    bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Wat als ik een race vergeet?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Wat is een joker?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Werkt het op mijn telefoon?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'In welke talen is de app er?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  // Andere poulesites leggen uit hoe je een pot afspreekt (poules.com).
  { vraag: 'Speel je om geld?', taal: 'nl', varianten: ['f1 poule inleg'], bron: 'zoekresultaat', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Is dit een officiële Formule 1-app?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  // Sinds AEO fase 3.1, in alle zeven talen.
  { vraag: 'Hoeveel punten kun je per weekend halen?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Wat is het verschil met F1 Fantasy?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  // Met de link naar de open poule (OPEN_POULE in site/teksten.mjs).
  { vraag: 'Kan ik meedoen zonder eigen groep?', taal: 'nl', varianten: ['open poule'], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },

  // ---- organiseren ----
  // De vragen uit de startlijst van het plan die een bestaande sectie al
  // beantwoordt, staan als variant bij die sectie.
  { vraag: 'Hoe zet je een F1-poule op?', taal: 'nl',
    varianten: ['Hoe maak je een F1-poule?', 'f1 poule maken', 'f1 poule opzetten', 'f1 pronostiek maken'],
    bron: 'hypothese', doel: 'organiseren#opzetten', status: 'beantwoord' },
  { vraag: 'Hoeveel vragen laat je meetellen?', taal: 'nl', varianten: ['Wat laat je iedereen voorspellen?'],
    bron: 'hypothese', doel: 'organiseren#vragen', status: 'beantwoord' },
  { vraag: 'Speel je met jokers?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'organiseren#jokers', status: 'beantwoord' },
  { vraag: 'Waar loopt een F1-poule op stuk?', taal: 'nl', varianten: ['Hoe houd je een F1-poule het hele seizoen spannend?',
    'Wat doe je als iemand vergeet in te vullen?', 'Krijg je een herinnering voor de deadline?'],
    // Kwartaalronde oktober 2026: tippevent.de zet herinneringsmails in zijn FAQ.
    bron: 'zoekresultaat', doel: 'organiseren#valkuilen', status: 'beantwoord' },
  { vraag: 'Wat regel je voordat het seizoen begint?', taal: 'nl', varianten: ['Checklist voor de poulebaas'],
    bron: 'hypothese', doel: 'organiseren#checklist', status: 'beantwoord' },
  { vraag: 'Kan iemand halverwege het seizoen nog instappen?', taal: 'nl', varianten: ['Kun je halverwege het seizoen nog beginnen?'],
    bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  // Kwartaalronde oktober 2026: voorspelsites als tippevent.de zetten "hoeveel
  // deelnemers" in hun FAQ; het antwoord (geen maximum) staat in deze sectie.
  { vraag: 'Hoe organiseer je een F1-poule op je werk?', taal: 'nl', varianten: ['f1 poule op het werk', 'f1 poule met collega\'s', 'f1 poule kantoor',
    'Hoeveel spelers kunnen er in een poule?'],
    bron: 'zoekresultaat', doel: 'organiseren#werk', status: 'beantwoord' },
  { vraag: 'Kan ik in meer dan één poule zitten?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Kan een poule openbaar zijn?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Wat is het verschil tussen een poule en een pronostiek?', taal: 'nl', varianten: ['Wat is een F1-pronostiek?'],
    bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },

  // ---- puntentelling ----
  { vraag: 'Welke puntentellingen zijn er?', taal: 'nl', varianten: ['Welke puntentelling is het eerlijkst voor een F1-poule?', 'f1 poule punten'],
    bron: 'hypothese', doel: 'puntentelling#systemen', status: 'beantwoord' },
  { vraag: 'Hoe reken je een top 10 uit?', taal: 'nl', varianten: ['Hoe reken je de punten voor een top 10 uit?'],
    bron: 'hypothese', doel: 'puntentelling#rekenvoorbeeld', status: 'beantwoord' },
  { vraag: 'Waarom telt bijna goed mee?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#bijna-goed', status: 'beantwoord' },
  { vraag: 'Welke vragen kun je nog meer laten meetellen?', taal: 'nl',
    // Kwartaalronde oktober 2026: F1 Predict en GP Poule noemen de sprint apart.
    varianten: ['Hoeveel punten geef je voor de losse vragen?', 'Welke bonusvragen kun je stellen in een F1-poule?', 'Telt de sprint ook mee?'],
    bron: 'hypothese', doel: 'puntentelling#losse-vragen', status: 'beantwoord' },
  { vraag: 'Wat als twee spelers evenveel punten hebben?', taal: 'nl', varianten: ['Wat gebeurt er bij een gelijke stand?'],
    bron: 'hypothese', doel: 'puntentelling#gelijk', status: 'beantwoord' },
  { vraag: 'Wat doet een joker met je punten?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#jokers', status: 'beantwoord' },
  // Met de circuitcijfers (zoekplan GEO 3.2).
  { vraag: 'Hoe vaak komt de safety car in een race?', taal: 'nl', varianten: ['hoeveel safety cars per race', 'safety car per circuit'],
    bron: 'hypothese', doel: 'puntentelling#safety-cars', status: 'beantwoord' },
  { vraag: 'Wat als iedereen hetzelfde voorspelt?', taal: 'nl', varianten: ['contrair voorspellen'], bron: 'hypothese', doel: 'puntentelling#hetzelfde', status: 'beantwoord' },
  { vraag: 'Kan ik de punten per vraag zelf aanpassen?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Telt een coureur buiten de top 10 mee?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Wat krijg je voor een coureur die uitvalt?', taal: 'nl', varianten: ['Krijg je punten als een coureur uitvalt?'],
    bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Wanneer staan de punten erin?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },

  // ---- excel ----
  // Op Excel-fora (helpmij.nl, pc-helpforum.be) vragen mensen hulp bij hun
  // eigen Formule 1-poule.
  { vraag: 'Welke kolommen heb je nodig?', taal: 'nl', varianten: ['Hoe houd je een F1-poule bij in Excel?', 'f1 poule excel'],
    bron: 'zoekresultaat', doel: 'excel#kolommen', status: 'beantwoord' },
  { vraag: 'Welke formule rekent de punten uit?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'excel#formule', status: 'beantwoord' },
  { vraag: 'Wat doe je met coureurs buiten de top 10?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'excel#buiten-top-10', status: 'beantwoord' },
  { vraag: 'Waar gaat het mis met Excel?', taal: 'nl', varianten: ['Waar gaat een Excel-poule mis?'],
    bron: 'hypothese', doel: 'excel#misgaat', status: 'beantwoord' },
  // "Excel WK poule vervangen? Dit is de betere oplossing" (sportspoule.com).
  { vraag: 'Kan het ook zonder spreadsheet?', taal: 'nl', varianten: ['Wat is beter dan een Excel-poule?'],
    bron: 'zoekresultaat', doel: 'excel#zonder-spreadsheet', status: 'beantwoord' },
  { vraag: 'Werkt dit ook in Google Spreadsheets?', taal: 'nl', varianten: ['Werkt het ook in Google Sheets?'],
    bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Hoe tel ik de winnaar en de pole position mee?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Hoe zet ik spelers met evenveel punten op dezelfde plek?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },

  // ---- vergelijking (SEO fase 2) en over ----
  { vraag: 'Welke F1-poule-app past bij jouw groep?', taal: 'nl', varianten: ['Wat is de beste F1-poule-app?', 'f1 poule app'],
    bron: 'hypothese', doel: 'vergelijking#welke', status: 'beantwoord' },
  // Formula 1 heeft een eigen voorspelspel, F1 Predict; vergelijkingen ermee
  // staan al online ("Podium Prophets vs F1 Predict").
  { vraag: 'Wat is het verschil met F1 Predict?', taal: 'nl', varianten: [], bron: 'zoekresultaat', doel: 'vergelijking#f1-predict', status: 'beantwoord' },
  { vraag: 'Wat is een gratis alternatief voor F1 Fantasy?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'vergelijking#alternatief', status: 'beantwoord' },
  { vraag: 'Wanneer past iets anders beter?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'vergelijking#anders', status: 'beantwoord' },
  { vraag: 'Wie maakt Predict the Race?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'over#wie', status: 'beantwoord' },
  { vraag: 'Hoe blijft Predict the Race gratis?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'over#gratis', status: 'beantwoord' },
  { vraag: 'Hoe werkt Predict the Race achter de schermen?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'over#techniek', status: 'beantwoord' },

  // ---- bewust niet ----
  { vraag: 'Hoe laat begint de race?', taal: 'nl', varianten: [], bron: 'hypothese', doel: '', status: 'bewust-niet',
    waarom: 'Formula1.com en de grote sportsites winnen die vraag altijd, en hij brengt geen poules. De racepagina\'s noemen de tijden wel, maar mikken er niet op.' },
  { vraag: 'Wie wint de Grand Prix?', taal: 'nl', varianten: [], bron: 'hypothese', doel: '', status: 'bewust-niet',
    waarom: 'We spelen geen tipgever. De racepagina\'s geven cijfers, geen voorspelling.' },
  { vraag: 'Hoe stel je een F1 Fantasy-team samen?', taal: 'nl', varianten: [], bron: 'hypothese', doel: '', status: 'bewust-niet',
    waarom: 'Ander spel. Alleen het verschil met Predict the Race krijgt een antwoord (voorpagina#faq).' },

  // ================================================================ EN
  // ---- voorpagina ----
  { vraag: 'What is Predict the Race?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#wat', status: 'beantwoord' },
  { vraag: 'Is Predict the Race free?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'How do I join a league?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Do I need an account?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'How does scoring work?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Where do the results come from?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'When is the deadline?', taal: 'en', varianten: ['When do predictions close?'],
    bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'What if I forget a race?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'What is a joker?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Does it work on my phone?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Which languages is the app in?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Do you play for money?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Is this an official Formula 1 app?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'How many points can you score per weekend?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  // "F1 Prediction Game vs Fantasy F1: What's the Difference?" (podiumprophets.com).
  { vraag: 'How is this different from F1 Fantasy?', taal: 'en',
    varianten: ['What is the difference between an F1 prediction game and F1 Fantasy?'],
    bron: 'zoekresultaat', doel: 'voorpagina#faq', status: 'beantwoord' },
  // With the link to the open league (OPEN_POULE in site/teksten.mjs).
  { vraag: 'Can I play without my own group?', taal: 'en', varianten: ['open league'], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },

  // ---- organiseren ----
  { vraag: 'How do you set up an F1 prediction league?', taal: 'en', varianten: ['How do you run an F1 prediction league?'],
    bron: 'hypothese', doel: 'organiseren#set-up', status: 'beantwoord' },
  { vraag: 'How many questions should count?', taal: 'en', varianten: ['What should everyone predict?'],
    bron: 'hypothese', doel: 'organiseren#questions', status: 'beantwoord' },
  { vraag: 'Should you play with jokers?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'organiseren#jokers', status: 'beantwoord' },
  { vraag: 'What kills an F1 prediction league?', taal: 'en', varianten: ['How do you keep an F1 league exciting all season?',
    'What if someone forgets to predict?', 'Do you get a reminder before the deadline?'],
    bron: 'zoekresultaat', doel: 'organiseren#pitfalls', status: 'beantwoord' },
  { vraag: 'What should you sort out before the season starts?', taal: 'en', varianten: ['A checklist for the league admin'],
    bron: 'hypothese', doel: 'organiseren#checklist', status: 'beantwoord' },
  { vraag: 'Can someone join halfway through the season?', taal: 'en', varianten: ['Can you start an F1 prediction league mid-season?'],
    bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  // Stond eerst als FAQ "Does it work for an office league?"; die vraag is nu
  // een variant, het antwoord staat in de sectie.
  { vraag: 'How do you run an F1 prediction league at work?', taal: 'en', varianten: ['Does it work for an office league?', 'f1 office pool',
    'How many players can join a league?'],
    bron: 'zoekresultaat', doel: 'organiseren#at-work', status: 'beantwoord' },
  { vraag: 'Can I be in more than one league?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Can a league be public?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },

  // ---- puntentelling ----
  { vraag: 'What scoring systems are there?', taal: 'en', varianten: ['What is the fairest scoring system for F1 predictions?'],
    bron: 'hypothese', doel: 'puntentelling#systems', status: 'beantwoord' },
  { vraag: 'How do you score a top 10?', taal: 'en', varianten: ['How do you score a top 10 prediction?'],
    bron: 'hypothese', doel: 'puntentelling#worked-example', status: 'beantwoord' },
  { vraag: 'Why should nearly right count?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'puntentelling#nearly-right', status: 'beantwoord' },
  // Pagina's met ideeën voor bonusvragen en seizoensvoorspellingen.
  { vraag: 'What else can you score?', taal: 'en',
    varianten: ['How many points should the extra questions be worth?', 'What bonus questions can you add to an F1 prediction league?', 'Does the sprint count too?'],
    bron: 'zoekresultaat', doel: 'puntentelling#extra-questions', status: 'beantwoord' },
  { vraag: 'What happens when two players are level on points?', taal: 'en', varianten: [],
    bron: 'hypothese', doel: 'puntentelling#ties', status: 'beantwoord' },
  { vraag: 'What does a joker do to your points?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'puntentelling#jokers', status: 'beantwoord' },
  { vraag: 'How often is there a safety car in an F1 race?', taal: 'en', varianten: ['how many safety cars per race', 'safety car statistics by circuit'],
    bron: 'hypothese', doel: 'puntentelling#safety-cars', status: 'beantwoord' },
  { vraag: 'What if everyone predicts the same thing?', taal: 'en', varianten: ['contrarian picks'], bron: 'hypothese', doel: 'puntentelling#same-picks', status: 'beantwoord' },
  { vraag: 'Can I change the points per question?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Does a driver outside the top 10 still count?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'What do you get for a driver who retires?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'When do the points show up?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },

  // ---- excel ----
  { vraag: 'What columns do you need?', taal: 'en',
    varianten: ['How do you run an F1 prediction league in a spreadsheet?', 'f1 prediction spreadsheet'],
    bron: 'hypothese', doel: 'excel#columns', status: 'beantwoord' },
  { vraag: 'Which formula scores the points?', taal: 'en', varianten: ['Which formula calculates the points?'],
    bron: 'hypothese', doel: 'excel#formula', status: 'beantwoord' },
  { vraag: 'What about drivers outside the top 10?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'excel#outside-top-10', status: 'beantwoord' },
  { vraag: 'Where does a spreadsheet let you down?', taal: 'en', varianten: ['Where does a spreadsheet league go wrong?'],
    bron: 'hypothese', doel: 'excel#problems', status: 'beantwoord' },
  { vraag: 'Can you do it without a spreadsheet?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'excel#without-a-spreadsheet', status: 'beantwoord' },
  { vraag: 'Does this work in Google Sheets?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'How do I score the race winner and pole position?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'How do I put players on equal points in the same position?', taal: 'en', varianten: [],
    bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },

  // ---- vergelijking en over ----
  // "Best F1 Prediction Apps & Games 2026" en meer van zulke lijstjes.
  { vraag: 'Which F1 prediction game suits your group?', taal: 'en', varianten: ['What is the best F1 prediction app?', 'best f1 prediction game'],
    bron: 'zoekresultaat', doel: 'vergelijking#which', status: 'beantwoord' },
  { vraag: 'How is Predict the Race different from F1 Predict?', taal: 'en', varianten: [],
    bron: 'zoekresultaat', doel: 'vergelijking#f1-predict', status: 'beantwoord' },
  { vraag: 'What is a free alternative to F1 Fantasy?', taal: 'en', varianten: ['f1 fantasy alternative'],
    bron: 'hypothese', doel: 'vergelijking#alternative', status: 'beantwoord' },
  { vraag: 'When does something else fit better?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'vergelijking#something-else', status: 'beantwoord' },
  { vraag: 'Who makes Predict the Race?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'over#who', status: 'beantwoord' },
  { vraag: 'How does Predict the Race stay free?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'over#free', status: 'beantwoord' },
  { vraag: 'How does Predict the Race work behind the scenes?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'over#behind-the-scenes', status: 'beantwoord' },

  // ---- bewust niet ----
  { vraag: 'What time does the race start?', taal: 'en', varianten: [], bron: 'hypothese', doel: '', status: 'bewust-niet',
    waarom: 'Formula1.com en de grote sportsites winnen die vraag altijd, en hij brengt geen poules.' },
  { vraag: 'Who will win the Grand Prix?', taal: 'en', varianten: [], bron: 'hypothese', doel: '', status: 'bewust-niet',
    waarom: 'We spelen geen tipgever.' },
  { vraag: 'How do you build an F1 Fantasy team?', taal: 'en', varianten: [], bron: 'hypothese', doel: '', status: 'bewust-niet',
    waarom: 'Ander spel. Alleen het verschil met Predict the Race krijgt een antwoord (voorpagina#faq).' },

  // ================================================================ DE
  // ---- voorpagina ----
  { vraag: 'Was ist Predict the Race?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#wat', status: 'beantwoord' },
  { vraag: 'Ist Predict the Race kostenlos?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Wie trete ich einer Tipprunde bei?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Brauche ich ein Konto?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Wie funktioniert die Punktevergabe?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Woher kommen die Ergebnisse?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Bis wann kann ich tippen?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Was, wenn ich ein Rennen vergesse?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Was ist ein Joker?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Funktioniert es auf meinem Handy?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'In welchen Sprachen gibt es die App?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Spielt man um Geld?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Ist das eine offizielle Formel-1-App?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Wie viele Punkte kann man pro Wochenende holen?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Was ist der Unterschied zu F1 Fantasy?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Kann ich ohne eigene Gruppe mitspielen?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  // ---- organiseren ----
  // (organiseren#einrichten: de vraag uit de zoekresultaten, hieronder bij de zoektermen)
  { vraag: 'Wie viele Fragen sollten zählen?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'organiseren#fragen', status: 'beantwoord' },
  { vraag: 'Sollte man mit Jokern spielen?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'organiseren#joker', status: 'beantwoord' },
  { vraag: 'Woran scheitert ein F1-Tippspiel?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'organiseren#fallen', status: 'beantwoord' },
  { vraag: 'Was solltest du vor Saisonbeginn klären?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'organiseren#checkliste', status: 'beantwoord' },
  { vraag: 'Wie organisiert man ein F1-Tippspiel im Büro?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'organiseren#buero', status: 'beantwoord' },
  { vraag: 'Kann jemand mitten in der Saison einsteigen?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Kann ich in mehr als einer Tipprunde sein?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Kann eine Tipprunde öffentlich sein?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  // ---- puntentelling ----
  { vraag: 'Welche Punktesysteme gibt es?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#systeme', status: 'beantwoord' },
  { vraag: 'Wie wertet man eine Top 10 aus?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#rechenbeispiel', status: 'beantwoord' },
  { vraag: 'Warum sollte knapp daneben zählen?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#knapp-daneben', status: 'beantwoord' },
  { vraag: 'Wofür gibt es sonst noch Punkte?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#zusatzfragen', status: 'beantwoord' },
  { vraag: 'Was, wenn alle dasselbe tippen?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#gleiche-tipps', status: 'beantwoord' },
  { vraag: 'Wie oft gibt es ein Safety Car in einem F1-Rennen?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#safety-cars', status: 'beantwoord' },
  { vraag: 'Was passiert bei Punktgleichheit?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#gleichstand', status: 'beantwoord' },
  { vraag: 'Was macht ein Joker mit deinen Punkten?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#joker', status: 'beantwoord' },
  { vraag: 'Kann ich die Punkte pro Frage ändern?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Zählt ein Fahrer außerhalb der Top 10 noch?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Was bekommt man für einen Fahrer, der ausfällt?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Wann erscheinen die Punkte?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  // ---- excel ----
  { vraag: 'Welche Spalten brauchst du?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'excel#spalten', status: 'beantwoord' },
  { vraag: 'Welche Formel berechnet die Punkte?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'excel#formel', status: 'beantwoord' },
  { vraag: 'Was machst du mit Fahrern außerhalb der Top 10?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'excel#ausserhalb-top-10', status: 'beantwoord' },
  { vraag: 'Wo hakt es mit Excel?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'excel#probleme', status: 'beantwoord' },
  { vraag: 'Geht es auch ohne Tabelle?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'excel#ohne-tabelle', status: 'beantwoord' },
  { vraag: 'Funktioniert das auch in Google Tabellen?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Wie zähle ich den Sieger und die Pole-Position mit?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Wie setze ich Spieler mit gleich vielen Punkten auf denselben Platz?', taal: 'de', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  // ================================================================ FR
  // ---- voorpagina ----
  { vraag: 'Qu\'est-ce que Predict the Race ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#wat', status: 'beantwoord' },
  { vraag: 'Predict the Race est-il gratuit ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Comment rejoindre une ligue ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Faut-il créer un compte ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Comment sont calculés les points ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'D\'où viennent les résultats ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Jusqu\'à quand puis-je pronostiquer ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Et si j\'oublie une course ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Qu\'est-ce qu\'un joker ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Est-ce que ça marche sur mon téléphone ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'En quelles langues est l\'appli ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Joue-t-on de l\'argent ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Est-ce une application officielle de la Formule 1 ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Combien de points peut-on marquer par week-end ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Quelle est la différence avec F1 Fantasy ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Puis-je jouer sans mon propre groupe ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  // ---- organiseren ----
  // (organiseren#lancer: de vraag uit de zoekresultaten, hieronder bij de zoektermen)
  { vraag: 'Combien de questions faut-il compter ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'organiseren#questions', status: 'beantwoord' },
  { vraag: 'Faut-il jouer avec des jokers ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'organiseren#jokers', status: 'beantwoord' },
  { vraag: 'Qu\'est-ce qui tue une ligue de pronostics F1 ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'organiseren#pieges', status: 'beantwoord' },
  { vraag: 'Que faut-il régler avant le début de la saison ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'organiseren#checklist', status: 'beantwoord' },
  { vraag: 'Comment organiser des pronostics F1 au bureau ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'organiseren#bureau', status: 'beantwoord' },
  { vraag: 'Peut-on rejoindre une ligue en cours de saison ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Puis-je être dans plusieurs ligues ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Une ligue peut-elle être publique ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  // ---- puntentelling ----
  { vraag: 'Quels barèmes existe-t-il ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#baremes', status: 'beantwoord' },
  { vraag: 'Comment compter les points d\'un top 10 ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#exemple', status: 'beantwoord' },
  { vraag: 'Pourquoi le presque juste doit-il compter ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#presque-juste', status: 'beantwoord' },
  { vraag: 'Que peut-on marquer d\'autre ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#questions-supplementaires', status: 'beantwoord' },
  { vraag: 'Et si tout le monde pronostique la même chose ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#memes-pronostics', status: 'beantwoord' },
  { vraag: 'Combien de safety cars y a-t-il dans une course de F1 ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#safety-cars', status: 'beantwoord' },
  { vraag: 'Que se passe-t-il quand deux joueurs sont à égalité de points ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#egalite', status: 'beantwoord' },
  { vraag: 'Que fait un joker à vos points ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#jokers', status: 'beantwoord' },
  { vraag: 'Puis-je changer les points par question ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Un pilote hors du top 10 compte-t-il encore ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Que rapporte un pilote qui abandonne ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Quand les points apparaissent-ils ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  // ---- excel ----
  { vraag: 'De quelles colonnes avez-vous besoin ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'excel#colonnes', status: 'beantwoord' },
  { vraag: 'Quelle formule calcule les points ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'excel#formule', status: 'beantwoord' },
  { vraag: 'Que faire des pilotes hors du top 10 ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'excel#hors-top-10', status: 'beantwoord' },
  { vraag: 'Où ça coince avec Excel ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'excel#problemes', status: 'beantwoord' },
  { vraag: 'Peut-on se passer de tableur ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'excel#sans-tableur', status: 'beantwoord' },
  { vraag: 'Est-ce que ça marche dans Google Sheets ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Comment compter le vainqueur et la pole position ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Comment mettre à la même place des joueurs à égalité de points ?', taal: 'fr', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  // ================================================================ ES
  // ---- voorpagina ----
  { vraag: '¿Qué es Predict the Race?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#wat', status: 'beantwoord' },
  { vraag: '¿Predict the Race es gratis?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Cómo me uno a una liga?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Necesito una cuenta?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Cómo funciona la puntuación?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿De dónde salen los resultados?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Hasta cuándo puedo predecir?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Y si me olvido de una carrera?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Qué es un comodín?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Funciona en mi móvil?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿En qué idiomas está la app?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Se juega con dinero?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Es una app oficial de la Fórmula 1?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Cuántos puntos se pueden sumar por fin de semana?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿En qué se diferencia de F1 Fantasy?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: '¿Puedo jugar sin un grupo propio?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  // ---- organiseren ----
  // (organiseren#montar: de vraag uit de zoekresultaten, hieronder bij de zoektermen)
  { vraag: '¿Cuántas preguntas deberían contar?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'organiseren#preguntas', status: 'beantwoord' },
  { vraag: '¿Conviene jugar con comodines?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'organiseren#comodines', status: 'beantwoord' },
  { vraag: '¿Qué acaba con una porra de F1?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'organiseren#trampas', status: 'beantwoord' },
  { vraag: '¿Qué hay que dejar listo antes de que empiece la temporada?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'organiseren#lista', status: 'beantwoord' },
  { vraag: '¿Cómo se organiza una porra de F1 en la oficina?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'organiseren#oficina', status: 'beantwoord' },
  { vraag: '¿Puede alguien unirse a mitad de temporada?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: '¿Puedo estar en más de una liga?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: '¿Puede una liga ser pública?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  // ---- puntentelling ----
  { vraag: '¿Qué sistemas de puntos hay?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#sistemas', status: 'beantwoord' },
  { vraag: '¿Cómo se puntúa un top 10?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#ejemplo', status: 'beantwoord' },
  { vraag: '¿Por qué debería contar casi acertar?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#casi', status: 'beantwoord' },
  { vraag: '¿Qué más se puede puntuar?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#preguntas-extra', status: 'beantwoord' },
  { vraag: '¿Y si todos predicen lo mismo?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#lo-mismo', status: 'beantwoord' },
  { vraag: '¿Cuántas veces sale el safety car en una carrera de F1?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#safety-cars', status: 'beantwoord' },
  { vraag: '¿Qué pasa cuando dos jugadores empatan a puntos?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#empate', status: 'beantwoord' },
  { vraag: '¿Qué hace un comodín con tus puntos?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#comodines', status: 'beantwoord' },
  { vraag: '¿Puedo cambiar los puntos de cada pregunta?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: '¿Cuenta un piloto fuera del top 10?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: '¿Qué sumas por un piloto que abandona?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: '¿Cuándo aparecen los puntos?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  // ---- excel ----
  { vraag: '¿Qué columnas necesitas?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'excel#columnas', status: 'beantwoord' },
  { vraag: '¿Qué fórmula calcula los puntos?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'excel#formula', status: 'beantwoord' },
  { vraag: '¿Qué haces con los pilotos fuera del top 10?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'excel#fuera-top-10', status: 'beantwoord' },
  { vraag: '¿Dónde falla Excel?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'excel#problemas', status: 'beantwoord' },
  { vraag: '¿Se puede hacer sin hoja de cálculo?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'excel#sin-hoja', status: 'beantwoord' },
  { vraag: '¿Funciona en Google Sheets?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: '¿Cómo cuento el ganador y la pole position?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: '¿Cómo pongo en la misma posición a jugadores empatados a puntos?', taal: 'es', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  // ================================================================ IT
  // ---- voorpagina ----
  { vraag: 'Che cos\'è Predict the Race?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#wat', status: 'beantwoord' },
  { vraag: 'Predict the Race è gratis?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Come entro in una lega?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Serve un account?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Come funziona il punteggio?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Da dove arrivano i risultati?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Fino a quando posso pronosticare?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'E se mi dimentico una gara?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Che cos\'è un jolly?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Funziona sul mio telefono?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'In che lingue è l\'app?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Si gioca con soldi?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'È un\'app ufficiale della Formula 1?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Quanti punti si possono fare a weekend?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Che differenza c\'è con F1 Fantasy?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Posso giocare senza un gruppo mio?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  // ---- organiseren ----
  // (organiseren#creare: de vraag uit de zoekresultaten, hieronder bij de zoektermen)
  { vraag: 'Quante domande dovrebbero contare?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'organiseren#domande', status: 'beantwoord' },
  { vraag: 'Conviene giocare con i jolly?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'organiseren#jolly', status: 'beantwoord' },
  { vraag: 'Che cosa fa morire una lega di pronostici F1?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'organiseren#trappole', status: 'beantwoord' },
  { vraag: 'Cosa sistemare prima che inizi la stagione?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'organiseren#checklist', status: 'beantwoord' },
  { vraag: 'Come si organizzano i pronostici F1 in ufficio?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'organiseren#ufficio', status: 'beantwoord' },
  { vraag: 'Si può entrare in una lega a stagione iniziata?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Posso essere in più di una lega?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Una lega può essere pubblica?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  // ---- puntentelling ----
  { vraag: 'Quali sistemi di punteggio esistono?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#sistemi', status: 'beantwoord' },
  { vraag: 'Come si calcolano i punti di una top 10?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#esempio', status: 'beantwoord' },
  { vraag: 'Perché il quasi giusto dovrebbe contare?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#quasi-giusto', status: 'beantwoord' },
  { vraag: 'Per cos\'altro si possono fare punti?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#domande-extra', status: 'beantwoord' },
  { vraag: 'E se tutti pronosticano la stessa cosa?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#stesso-pronostico', status: 'beantwoord' },
  { vraag: 'Quante volte entra la safety car in una gara di F1?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#safety-cars', status: 'beantwoord' },
  { vraag: 'Cosa succede quando due giocatori sono a pari punti?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#parita', status: 'beantwoord' },
  { vraag: 'Cosa fa un jolly ai tuoi punti?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#jolly', status: 'beantwoord' },
  { vraag: 'Posso cambiare i punti di ogni domanda?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Un pilota fuori dalla top 10 conta ancora?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Cosa prendi per un pilota che si ritira?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Quando compaiono i punti?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  // ---- excel ----
  { vraag: 'Quali colonne servono?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'excel#colonne', status: 'beantwoord' },
  { vraag: 'Quale formula calcola i punti?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'excel#formula', status: 'beantwoord' },
  { vraag: 'Cosa fai con i piloti fuori dalla top 10?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'excel#fuori-top-10', status: 'beantwoord' },
  { vraag: 'Dove si inceppa Excel?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'excel#problemi', status: 'beantwoord' },
  { vraag: 'Si può fare senza foglio di calcolo?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'excel#senza-foglio', status: 'beantwoord' },
  { vraag: 'Funziona anche in Fogli Google?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Come conto il vincitore e la pole position?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Come metto alla stessa posizione i giocatori a pari punti?', taal: 'it', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  // ================================================================ PT
  // ---- voorpagina ----
  { vraag: 'O que é o Predict the Race?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#wat', status: 'beantwoord' },
  { vraag: 'O Predict the Race é grátis?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Como entro em um bolão?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Preciso criar uma conta?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Como funciona a pontuação?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'De onde vêm os resultados?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Até quando posso dar palpite?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'E se eu esquecer uma corrida?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'O que é um coringa?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Funciona no meu celular?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Em quais idiomas está o app?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Joga-se valendo dinheiro?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'É um app oficial da Fórmula 1?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Quantos pontos dá para fazer por fim de semana?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Qual é a diferença para o F1 Fantasy?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Posso jogar sem um grupo próprio?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  // ---- organiseren ----
  // (organiseren#montar: de vraag uit de zoekresultaten, hieronder bij de zoektermen)
  { vraag: 'Quantas perguntas devem contar?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'organiseren#perguntas', status: 'beantwoord' },
  { vraag: 'Vale a pena jogar com coringas?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'organiseren#coringas', status: 'beantwoord' },
  { vraag: 'O que acaba com um bolão de F1?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'organiseren#armadilhas', status: 'beantwoord' },
  { vraag: 'O que acertar antes do começo da temporada?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'organiseren#checklist', status: 'beantwoord' },
  { vraag: 'Como organizar um bolão de F1 no trabalho?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'organiseren#trabalho', status: 'beantwoord' },
  { vraag: 'Alguém pode entrar no meio da temporada?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Posso estar em mais de um bolão?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Um bolão pode ser público?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  // ---- puntentelling ----
  { vraag: 'Quais sistemas de pontuação existem?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#sistemas', status: 'beantwoord' },
  { vraag: 'Como se pontua um top 10?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#exemplo', status: 'beantwoord' },
  { vraag: 'Por que quase acertar deve contar?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#quase', status: 'beantwoord' },
  { vraag: 'O que mais dá para pontuar?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#perguntas-extras', status: 'beantwoord' },
  { vraag: 'E se todo mundo der o mesmo palpite?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#mesmo-palpite', status: 'beantwoord' },
  { vraag: 'Quantas vezes o safety car entra numa corrida de F1?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#safety-cars', status: 'beantwoord' },
  { vraag: 'O que acontece quando dois jogadores empatam em pontos?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#empate', status: 'beantwoord' },
  { vraag: 'O que um coringa faz com os seus pontos?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#coringas', status: 'beantwoord' },
  { vraag: 'Posso mudar os pontos de cada pergunta?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Um piloto fora do top 10 ainda conta?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Quanto vale um piloto que abandona?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Quando os pontos aparecem?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  // ---- excel ----
  { vraag: 'De quais colunas você precisa?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'excel#colunas', status: 'beantwoord' },
  { vraag: 'Qual fórmula calcula os pontos?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'excel#formula', status: 'beantwoord' },
  { vraag: 'E os pilotos fora do top 10?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'excel#fora-top-10', status: 'beantwoord' },
  { vraag: 'Onde a planilha complica?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'excel#problemas', status: 'beantwoord' },
  { vraag: 'Dá para fazer sem planilha?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'excel#sem-planilha', status: 'beantwoord' },
  { vraag: 'Funciona no Planilhas Google?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Como conto o vencedor e a pole position?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Como coloco na mesma posição jogadores empatados em pontos?', taal: 'pt', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  // ================================================================ DE, FR, ES, IT, PT: de zoektermen
  // De zoektermen voor een poule maken in de andere talen (SEO fase 5). Sinds
  // 13 oktober staat de gids organiseren in die talen, met deze vragen als
  // eerste kop. Nagezocht op 27 september 2026: Tippspiel, pronostics entre amis, porra
  // en bolão geven sites en apps om met vrienden te spelen. Het Italiaanse
  // "pronostici F1" geeft vooral goktips; welk woord Italianen voor een spel
  // met vrienden gebruiken, moet Search Console nog laten zien.
  { vraag: 'Wie erstellt man ein F1-Tippspiel?', taal: 'de', varianten: ['F1-Tippspiel erstellen', 'Tipprunde F1', 'F1 Tippspiel mit Freunden'],
    bron: 'zoekresultaat', doel: 'organiseren#einrichten', status: 'beantwoord' },
  { vraag: 'Comment organiser des pronostics F1 entre amis ?', taal: 'fr',
    varianten: ['organiser des pronostics F1 entre amis', 'pronostic F1 jeu gratuit entre amis'],
    bron: 'zoekresultaat', doel: 'organiseren#lancer', status: 'beantwoord' },
  { vraag: '¿Cómo se hace una porra de F1?', taal: 'es', varianten: ['cómo hacer una porra de F1', 'porra F1 amigos'],
    bron: 'zoekresultaat', doel: 'organiseren#montar', status: 'beantwoord' },
  { vraag: 'Come si organizzano i pronostici F1 con gli amici?', taal: 'it', varianten: ['come organizzare i pronostici F1 con gli amici'],
    bron: 'hypothese', doel: 'organiseren#creare', status: 'beantwoord' },
  { vraag: 'Como organizar um bolão de F1 com os amigos?', taal: 'pt', varianten: ['como fazer um bolão de F1', 'bolão F1 amigos'],
    bron: 'zoekresultaat', doel: 'organiseren#montar', status: 'beantwoord' },
];
