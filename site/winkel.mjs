// Wat alleen in de Play Store staat (scripts/maak-winkel.mjs, BEDIENING §21).
// De rest van de winkeltekst komt van de voorpagina (site/teksten.mjs), zodat
// de winkel nooit iets anders zegt dan de site.
//
// titel: zonder "F1". Dat is een merk van Formula One Licensing, en een merk
// van een ander in de titel van een app is een bekende reden om af te wijzen.
// In de omschrijving staat het wel, met de disclaimer van de site eronder.
//
// Per taal:
//   taal   de taalcode in de Play Console. Portugees is Braziliaans, net als de
//          site ("celular", "equipe").
//   nieuw  "Wat is er nieuw" bij deze versie, hoogstens 500 tekens.
export const WINKEL = {
  titel: 'Predict the Race',
  talen: {
    nl: { taal: 'nl-NL', nieuw: 'Eerste versie in de Play Store.' },
    en: { taal: 'en-US', nieuw: 'First version on Google Play.' },
    de: { taal: 'de-DE', nieuw: 'Erste Version bei Google Play.' },
    fr: { taal: 'fr-FR', nieuw: 'Première version sur Google Play.' },
    es: { taal: 'es-ES', nieuw: 'Primera versión en Google Play.' },
    it: { taal: 'it-IT', nieuw: 'Prima versione su Google Play.' },
    pt: { taal: 'pt-BR', nieuw: 'Primeira versão no Google Play.' },
  },
};

// De grenzen van de Play Console, in tekens.
export const GRENZEN = { titel: 30, kort: 80, lang: 4000, nieuw: 500 };
