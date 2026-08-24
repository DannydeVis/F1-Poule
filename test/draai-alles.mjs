// Draait alle tests en geeft een samenvatting.
//   node test/draai-alles.mjs

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(hier).filter((n) => n.endsWith('.test.mjs')).sort();

const draai = (bestand) => new Promise((klaar) => {
  const p = spawn(process.execPath, [join(hier, bestand)], { stdio: 'inherit' });
  p.on('close', (code) => klaar(code === 0));
});

const gezakt = [];
for (const bestand of tests) if (!await draai(bestand)) gezakt.push(bestand);

console.log('\n' + '='.repeat(52));
if (gezakt.length) {
  console.log(`${gezakt.length} van de ${tests.length} testbestanden gezakt:`);
  for (const b of gezakt) console.log(`  - ${b}`);
  process.exit(1);
}
console.log(`alle ${tests.length} testbestanden geslaagd`);
