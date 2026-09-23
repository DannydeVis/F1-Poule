// Draait alle tests en geeft een samenvatting.
//   node test/draai-alles.mjs

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(hier).filter((n) => n.endsWith('.test.mjs')).sort();

// De uitvoer gaat gewoon door naar het scherm, én wordt bewaard voor het geval
// het bestand zakt. Reden: in de CI staat die uitvoer middenin zeventienhonderd
// regels log, en de samenvatting onderaan zei alleen wélk bestand zakte en niet
// wat eraan mankeerde. Een fout die je niet kunt lezen is bijna net zo erg als
// geen test. Nu staat de uitvoer van wat er zakte nog een keer onderaan, waar
// je hem meteen ziet.
const draai = (bestand) => new Promise((klaar) => {
  const p = spawn(process.execPath, [join(hier, bestand)]);
  let uit = '';
  const vang = (stuk) => { uit += stuk; process.stdout.write(stuk); };
  p.stdout.on('data', vang);
  p.stderr.on('data', vang);
  p.on('close', (code) => klaar({ goed: code === 0, uit }));
});

const gezakt = [];
for (const bestand of tests) {
  const { goed, uit } = await draai(bestand);
  if (!goed) gezakt.push({ bestand, uit });
}

console.log('\n' + '='.repeat(52));
if (gezakt.length) {
  console.log(`${gezakt.length} van de ${tests.length} testbestanden gezakt:`);
  for (const { bestand } of gezakt) console.log(`  - ${bestand}`);
  for (const { bestand, uit } of gezakt) {
    console.log('\n' + '-'.repeat(52));
    console.log(`uitvoer van ${bestand}:`);
    console.log('-'.repeat(52));
    process.stdout.write(uit.endsWith('\n') ? uit : uit + '\n');
  }
  process.exit(1);
}
console.log(`alle ${tests.length} testbestanden geslaagd`);
