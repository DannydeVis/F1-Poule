/**
 * Welke race een pagina op de site heeft (1 november).
 *
 * Danny: de app linkt nergens naar de racepagina's, terwijl daar de
 * sessietijden, de top 10 van de vrije trainingen en de circuitcijfers staan.
 * De deelteksten, het uitslagscherm en kalender.ics wijzen er nu naartoe.
 *
 * De generator maakt een pagina voor de races in site/races.mjs met een
 * vorige editie (site/data/races-<jaar>.json). De sync leest dat bestand en
 * kijkt of de pagina ook echt in de repo staat, en zet het laatste stuk van
 * de url in races.pagina. Zo weet de app het zonder iets van de site te
 * hoeven lezen. Geen pagina: null, en dan wijst een link naar de voorpagina.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * race_key (de racesessie bij OpenF1) naar het stuk url, voor de races in het
 * bestand waarvan de pagina bestaat. `bestaat(pad)` kijkt in de repo.
 */
export function racePaginas(data, bestaat) {
  const uit = new Map();
  for (const r of data?.races ?? []) {
    const race = (r.sessies ?? []).find((s) => s.naam === 'Race');
    if (!race?.sessie || !/^[a-z0-9-]{1,40}$/.test(r.slug ?? '')) continue;
    if (!bestaat(`races/${data.jaar}/${r.slug}/index.html`)) continue;
    uit.set(String(race.sessie), r.slug);
  }
  return uit;
}

/** Alle jaren die er in site/data staan, samen. */
export function leesRacePaginas(wortel) {
  const uit = new Map();
  let bestanden = [];
  try { bestanden = readdirSync(join(wortel, 'site', 'data')); } catch { return uit; }
  for (const f of bestanden.filter((x) => /^races-\d{4}\.json$/.test(x))) {
    try {
      const data = JSON.parse(readFileSync(join(wortel, 'site', 'data', f), 'utf8'));
      for (const [k, v] of racePaginas(data, (pad) => existsSync(join(wortel, pad)))) uit.set(k, v);
    } catch { /* een kapot bestand: dan geen pagina's uit dat jaar */ }
  }
  return uit;
}

/**
 * De paden uit sitemap.xml, zoals de browser ze ziet (location.pathname):
 * '/', '/en/', '/races/2026/sao-paulo/'. Voor de teller (tel_pagina).
 */
export function sitemapPaden(xml = '') {
  return [...new Set([...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
    .map(([, url]) => { try { return new URL(url).pathname; } catch { return null; } })
    .filter((p) => p && /^\/[a-z0-9/_-]{0,120}$/.test(p)))];
}
