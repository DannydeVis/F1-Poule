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
//   bron       hypothese | autocomplete | paa | reddit | gsc | bing
//   doel       een id uit site/paginas.mjs (of 'voorpagina') met het id van de
//              sectie erachter: 'puntentelling#gelijk', 'voorpagina#faq'. Een
//              open vraag mag alleen een pagina noemen, als de sectie er nog
//              niet is en de ids in die taal nog niet vastliggen.
//   status     open (nog geen antwoord op de site) | beantwoord | bewust-niet
//   waarom     alleen bij bewust-niet, en dan verplicht
//
// Een beantwoorde vraag staat letterlijk op zijn plek. Elke vraag-kop en elke
// FAQ op de voorpagina en de gidsen staat hier, in elke taal waarin er een gids
// is; de andere talen hebben alleen de voorpagina, een vertaling van dezelfde
// vragen. Twee vragen op één plek kan alleen in een FAQ.
//
// Nieuwe vragen (uit Search Console, "Mensen vragen ook", Reddit) komen hier
// eerst. Een nieuwe vraag krijgt een plek in een bestaande sectie of FAQ, alleen
// een nieuwe sectie als het echt een nieuwe vraag is, en nooit een eigen pagina.

// Pagina's uit het zoekplan die er nog niet zijn. Een open vraag mag erheen
// wijzen; staat de pagina in site/paginas.mjs, dan gaat hij hier weg.
export const GEPLANDE_PAGINAS = ['vergelijking', 'over'];

export const VRAGEN = [
  // ================================================================ NL
  // ---- voorpagina ----
  { vraag: 'Wat is Predict the Race?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#wat', status: 'beantwoord' },
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
  { vraag: 'Speel je om geld?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  { vraag: 'Is dit een officiële Formule 1-app?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'beantwoord' },
  // Nieuw in AEO fase 3.1, in alle zeven talen.
  { vraag: 'Hoeveel punten kun je per weekend halen?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'open' },
  { vraag: 'Wat is het verschil met F1 Fantasy?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'open' },

  // ---- organiseren ----
  // De vragen uit de startlijst van het plan die een bestaande sectie al
  // beantwoordt, staan als variant bij die sectie.
  { vraag: 'Hoe zet je een F1-poule op?', taal: 'nl',
    varianten: ['Hoe maak je een F1-poule?', 'f1 poule maken', 'f1 poule opzetten', 'f1 pronostiek maken'],
    bron: 'hypothese', doel: 'organiseren#opzetten', status: 'beantwoord' },
  { vraag: 'Hoeveel vragen laat je meetellen?', taal: 'nl', varianten: ['Wat laat je iedereen voorspellen?'],
    bron: 'hypothese', doel: 'organiseren#vragen', status: 'beantwoord' },
  { vraag: 'Speel je met jokers?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'organiseren#jokers', status: 'beantwoord' },
  { vraag: 'Waar loopt een F1-poule op stuk?', taal: 'nl', varianten: ['Hoe houd je een F1-poule het hele seizoen spannend?'],
    bron: 'hypothese', doel: 'organiseren#valkuilen', status: 'beantwoord' },
  { vraag: 'Wat doe je als iemand vergeet in te vullen?', taal: 'nl', varianten: [],
    bron: 'hypothese', doel: 'organiseren#vergeten', status: 'open' },
  { vraag: 'Kan iemand halverwege het seizoen nog instappen?', taal: 'nl', varianten: ['Kun je halverwege het seizoen nog beginnen?'],
    bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Kan ik in meer dan één poule zitten?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Kan een poule openbaar zijn?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Wat is het verschil tussen een poule en een pronostiek?', taal: 'nl', varianten: ['Wat is een F1-pronostiek?'],
    bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },

  // ---- puntentelling ----
  { vraag: 'Welke puntentellingen zijn er?', taal: 'nl', varianten: ['Welke puntentelling is het eerlijkst voor een F1-poule?'],
    bron: 'hypothese', doel: 'puntentelling#systemen', status: 'beantwoord' },
  { vraag: 'Hoe reken je een top 10 uit?', taal: 'nl', varianten: ['Hoe reken je de punten voor een top 10 uit?'],
    bron: 'hypothese', doel: 'puntentelling#rekenvoorbeeld', status: 'beantwoord' },
  { vraag: 'Waarom telt bijna goed mee?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#bijna-goed', status: 'beantwoord' },
  { vraag: 'Welke vragen kun je nog meer laten meetellen?', taal: 'nl', varianten: ['Hoeveel punten geef je voor de losse vragen?'],
    bron: 'hypothese', doel: 'puntentelling#losse-vragen', status: 'beantwoord' },
  { vraag: 'Wat als twee spelers evenveel punten hebben?', taal: 'nl', varianten: ['Wat gebeurt er bij een gelijke stand?'],
    bron: 'hypothese', doel: 'puntentelling#gelijk', status: 'beantwoord' },
  { vraag: 'Wat doet een joker met je punten?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#jokers', status: 'beantwoord' },
  { vraag: 'Wat als iedereen hetzelfde voorspelt?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#hetzelfde', status: 'open' },
  { vraag: 'Kan ik de punten per vraag zelf aanpassen?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Telt een coureur buiten de top 10 mee?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Wat krijg je voor een coureur die uitvalt?', taal: 'nl', varianten: ['Krijg je punten als een coureur uitvalt?'],
    bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },
  { vraag: 'Wanneer staan de punten erin?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'puntentelling#faq', status: 'beantwoord' },

  // ---- excel ----
  { vraag: 'Welke kolommen heb je nodig?', taal: 'nl', varianten: ['Hoe houd je een F1-poule bij in Excel?', 'f1 poule excel'],
    bron: 'hypothese', doel: 'excel#kolommen', status: 'beantwoord' },
  { vraag: 'Welke formule rekent de punten uit?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'excel#formule', status: 'beantwoord' },
  { vraag: 'Wat doe je met coureurs buiten de top 10?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'excel#buiten-top-10', status: 'beantwoord' },
  { vraag: 'Waar gaat het mis met Excel?', taal: 'nl', varianten: ['Waar gaat een Excel-poule mis?'],
    bron: 'hypothese', doel: 'excel#misgaat', status: 'beantwoord' },
  { vraag: 'Kan het ook zonder spreadsheet?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'excel#zonder-spreadsheet', status: 'beantwoord' },
  { vraag: 'Werkt dit ook in Google Spreadsheets?', taal: 'nl', varianten: ['Werkt het ook in Google Sheets?'],
    bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Hoe tel ik de winnaar en de pole position mee?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },
  { vraag: 'Hoe zet ik spelers met evenveel punten op dezelfde plek?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'excel#faq', status: 'beantwoord' },

  // ---- vergelijking en over (SEO fase 2, nog niet gemaakt) ----
  { vraag: 'Welke F1-poule-app past bij jouw groep?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'vergelijking#welke', status: 'open' },
  { vraag: 'Wat is een gratis alternatief voor F1 Fantasy?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'vergelijking#alternatief', status: 'open' },
  { vraag: 'Wanneer past iets anders beter?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'vergelijking#anders', status: 'open' },
  { vraag: 'Wie maakt Predict the Race?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'over#wie', status: 'open' },
  { vraag: 'Hoe blijft Predict the Race gratis?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'over#gratis', status: 'open' },
  { vraag: 'Hoe werkt Predict the Race achter de schermen?', taal: 'nl', varianten: [], bron: 'hypothese', doel: 'over#techniek', status: 'open' },

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
  { vraag: 'How many points can you score per weekend?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'open' },
  { vraag: 'How is this different from F1 Fantasy?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'voorpagina#faq', status: 'open' },

  // ---- organiseren ----
  { vraag: 'How do you set up an F1 prediction league?', taal: 'en', varianten: ['How do you run an F1 prediction league?'],
    bron: 'hypothese', doel: 'organiseren#set-up', status: 'beantwoord' },
  { vraag: 'How many questions should count?', taal: 'en', varianten: ['What should everyone predict?'],
    bron: 'hypothese', doel: 'organiseren#questions', status: 'beantwoord' },
  { vraag: 'Should you play with jokers?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'organiseren#jokers', status: 'beantwoord' },
  { vraag: 'What kills an F1 prediction league?', taal: 'en', varianten: ['How do you keep an F1 league exciting all season?'],
    bron: 'hypothese', doel: 'organiseren#pitfalls', status: 'beantwoord' },
  { vraag: 'What if someone forgets to predict?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'organiseren#forgetting', status: 'open' },
  { vraag: 'Can someone join halfway through the season?', taal: 'en', varianten: ['Can you start an F1 prediction league mid-season?'],
    bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Can I be in more than one league?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Can a league be public?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },
  { vraag: 'Does it work for an office league?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'organiseren#faq', status: 'beantwoord' },

  // ---- puntentelling ----
  { vraag: 'What scoring systems are there?', taal: 'en', varianten: ['What is the fairest scoring system for F1 predictions?'],
    bron: 'hypothese', doel: 'puntentelling#systems', status: 'beantwoord' },
  { vraag: 'How do you score a top 10?', taal: 'en', varianten: ['How do you score a top 10 prediction?'],
    bron: 'hypothese', doel: 'puntentelling#worked-example', status: 'beantwoord' },
  { vraag: 'Why should nearly right count?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'puntentelling#nearly-right', status: 'beantwoord' },
  { vraag: 'What else can you score?', taal: 'en', varianten: ['How many points should the extra questions be worth?'],
    bron: 'hypothese', doel: 'puntentelling#extra-questions', status: 'beantwoord' },
  { vraag: 'What happens when two players are level on points?', taal: 'en', varianten: [],
    bron: 'hypothese', doel: 'puntentelling#ties', status: 'beantwoord' },
  { vraag: 'What does a joker do to your points?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'puntentelling#jokers', status: 'beantwoord' },
  { vraag: 'What if everyone predicts the same thing?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'puntentelling#same-picks', status: 'open' },
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
  { vraag: 'Which F1 prediction game suits your group?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'vergelijking#which', status: 'open' },
  { vraag: 'What is a free alternative to F1 Fantasy?', taal: 'en', varianten: ['f1 fantasy alternative'],
    bron: 'hypothese', doel: 'vergelijking#alternative', status: 'open' },
  { vraag: 'When does something else fit better?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'vergelijking#something-else', status: 'open' },
  { vraag: 'Who makes Predict the Race?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'over#who', status: 'open' },
  { vraag: 'How does Predict the Race stay free?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'over#free', status: 'open' },
  { vraag: 'How does Predict the Race work behind the scenes?', taal: 'en', varianten: [], bron: 'hypothese', doel: 'over#behind-the-scenes', status: 'open' },

  // ---- bewust niet ----
  { vraag: 'What time does the race start?', taal: 'en', varianten: [], bron: 'hypothese', doel: '', status: 'bewust-niet',
    waarom: 'Formula1.com en de grote sportsites winnen die vraag altijd, en hij brengt geen poules.' },
  { vraag: 'Who will win the Grand Prix?', taal: 'en', varianten: [], bron: 'hypothese', doel: '', status: 'bewust-niet',
    waarom: 'We spelen geen tipgever.' },
  { vraag: 'How do you build an F1 Fantasy team?', taal: 'en', varianten: [], bron: 'hypothese', doel: '', status: 'bewust-niet',
    waarom: 'Ander spel. Alleen het verschil met Predict the Race krijgt een antwoord (voorpagina#faq).' },

  // ================================================================ DE, FR, ES, IT, PT
  // Voor later (SEO fase 5): de zoektermen voor een poule maken in de andere
  // talen. Er is in die talen nog geen gids, dus ook nog geen sectie-id.
  { vraag: 'Wie erstellt man ein F1-Tippspiel?', taal: 'de', varianten: ['F1-Tippspiel erstellen', 'Tipprunde F1'],
    bron: 'hypothese', doel: 'organiseren', status: 'open' },
  { vraag: 'Comment organiser des pronostics F1 entre amis ?', taal: 'fr', varianten: ['organiser des pronostics F1 entre amis'],
    bron: 'hypothese', doel: 'organiseren', status: 'open' },
  { vraag: '¿Cómo se hace una porra de F1?', taal: 'es', varianten: ['cómo hacer una porra de F1'],
    bron: 'hypothese', doel: 'organiseren', status: 'open' },
  { vraag: 'Come si organizzano i pronostici F1 con gli amici?', taal: 'it', varianten: ['come organizzare i pronostici F1 con gli amici'],
    bron: 'hypothese', doel: 'organiseren', status: 'open' },
  { vraag: 'Como organizar um bolão de F1 com os amigos?', taal: 'pt', varianten: ['como fazer um bolão de F1'],
    bron: 'hypothese', doel: 'organiseren', status: 'open' },
];
