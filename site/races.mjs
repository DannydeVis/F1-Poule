// De racepagina's: een pilot met de laatste zeven races van 2026 (zoekplan SEO
// fase 4, docs/zoekplan/1-seo.md). Alleen NL en EN.
//
// Per race het circuit (circuit_key van OpenF1, dezelfde als in
// site/data/circuits.json) en het stuk van de url: /races/2026/<slug>/ en
// /en/races/2026/<slug>/. scripts/racedata.mjs haalt voor precies deze races
// de tijden, de uitslag van vorig jaar en straks de uitslag van dit jaar op, en
// schrijft site/data/races-<jaar>.json. De generator leest alleen dat bestand.
//
// Kuala Lumpur (2 tot 4 oktober) doet niet mee: daar is geen vorige editie in
// OpenF1, en het plan zegt geen pagina zonder vorige editie.
//
// Dit bestand komt niet online (_config.yml sluit site/*.mjs uit).

export const RACE_JAAR = 2026;

export const RACES = [
  { circuit: 61, slug: 'singapore' },
  { circuit: 9, slug: 'austin' },
  { circuit: 65, slug: 'mexico-city' },
  { circuit: 14, slug: 'sao-paulo' },
  { circuit: 152, slug: 'las-vegas' },
  { circuit: 150, slug: 'qatar' },
  { circuit: 70, slug: 'abu-dhabi' },
];
