// Geen emoji (Danny, 27 oktober: "Ik wil echt geen emojis").
//
// Niet in de app, niet in de berichten voor de groepsapp die de app klaarzet,
// niet in de meldingen, de mails, het beheer of op de site. Een emoji ziet er
// op elk toestel anders uit en past niet bij de rest van de vormgeving.
//
// Wat wel mag: tekens die als tekst getekend worden, in de kleur en de letter
// van de app, zoals ✓ ✕ ✗ ☆ en →. Die vallen niet onder Extended_Pictographic.
// Eén ervan wel, en die staat hieronder apart: ★, de joker. Dat is geen emoji
// (de emoji-ster is ⭐, U+2B50), maar Unicode houdt hem achter de hand.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('geen emoji');

const MAG = new Set(['★']);
const lijst = (map, eind) => existsSync(join(wortel, map))
  ? readdirSync(join(wortel, map)).filter((f) => f.endsWith(eind)).map((f) => `${map}/${f}`) : [];
const BESTANDEN = [
  'app/index.html', 'sw.js', 'beheer/index.html', 'scripts/herinneringen.mjs', 'scripts/maak-site.mjs',
  ...lijst('app/talen', '.json'), ...lijst('supabase/functions/tik', '.mjs'), ...lijst('site', '.mjs'),
  ...lijst('docs/mail', '.html'),
];

check('de bestanden zijn gevonden', BESTANDEN.length > 15 && BESTANDEN.every((f) => existsSync(join(wortel, f))),
  BESTANDEN.filter((f) => !existsSync(join(wortel, f))).join(', '));
for (const f of BESTANDEN) {
  const regels = readFileSync(join(wortel, f), 'utf8').split('\n');
  const fout = [];
  regels.forEach((r, i) => {
    for (const t of r.match(/[\p{Extended_Pictographic}\u{FE0F}]/gu) ?? []) {
      if (!MAG.has(t)) fout.push(`regel ${i + 1}: ${t}`);
    }
  });
  check(`${f}: geen emoji`, fout.length === 0, fout.slice(0, 5).join(' · '));
}

process.exit(afronden() ? 0 : 1);
