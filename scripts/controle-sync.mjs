/**
 * Draait de sync echt zo vaak als de cron zegt?
 *
 * Aanleiding: in sync.yml stond `cron: '0 * * * *'` met erboven de aanname
 * dat hij dan ook elk uur draait. Die aanname is nooit nagekeken. Toen dat
 * wel gebeurde, over zes dagen:
 *
 *     ingesteld        24 keer per dag
 *     werkelijk        5 a 7 keer per dag
 *     langste gat      4u59
 *     gaten < 1 uur    geen enkele
 *
 * GitHub laat geplande runs vallen bij drukte en garandeert een tijdstip
 * niet. Dat staat in hun documentatie, maar het verschil tussen "kan wat
 * later worden" en "driekwart komt niet" zie je pas als je het telt.
 *
 * Dit script telt het. Alleen lezen, en geen sleutel nodig: de repo is
 * openbaar, dus de Actions-API van GitHub geeft dit zonder inloggen.
 *
 *   node scripts/controle-sync.mjs
 *   DAGEN=14 node scripts/controle-sync.mjs
 *
 * Zonder token geldt een limiet van zestig verzoeken per uur per IP; dit
 * script doet er één. Zit je eroverheen, dan zegt GitHub dat ook eerlijk.
 */

const REPO = process.env.REPO ?? 'DannydeVis/F1-Poule';
const WORKFLOW = process.env.WORKFLOW ?? 'sync.yml';
const DAGEN = Number(process.env.DAGEN ?? 7);

const url = `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}`
  + '/runs?event=schedule&per_page=100';

// Een token is niet nodig voor een openbare repo, maar wel prettig: zonder
// token deelt GitHub zestig verzoeken per uur uit per IP, en op een gedeeld
// adres is dat zo op. In een workflow staat GITHUB_TOKEN er toch al.
const kop = { Accept: 'application/vnd.github+json' };
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '';
if (token) kop.Authorization = `Bearer ${token}`;

const res = await fetch(url, { headers: kop });
if (!res.ok) {
  console.error(`FOUT: GitHub gaf ${res.status}`
    + (res.status === 403
      ? `${token ? '' : ' zonder token'} — waarschijnlijk de limiet per uur` : ''));
  process.exit(2);
}
const { workflow_runs: runs = [] } = await res.json();

const grens = Date.now() - DAGEN * 86400e3;
const tijden = runs
  .map((r) => new Date(r.run_started_at ?? r.created_at).getTime())
  .filter((t) => Number.isFinite(t) && t >= grens)
  .sort((a, b) => b - a);

if (tijden.length < 2) {
  console.log(`Te weinig runs in ${DAGEN} dagen om iets over te zeggen (${tijden.length}).`);
  process.exit(0);
}

const uur = (ms) => `${Math.floor(ms / 3600e3)}u${String(Math.floor((ms % 3600e3) / 60e3)).padStart(2, '0')}`;
const klok = (t) => new Date(t).toISOString().slice(0, 16).replace('T', ' ');

// Het gat naar de vorige run is wat je echt voelt: zo lang stond er een
// uitslag klaar bij OpenF1 zonder dat iemand in de app hem zag.
const gaten = [];
for (let i = 0; i < tijden.length - 1; i++) gaten.push(tijden[i] - tijden[i + 1]);

console.log(`\n=== ${WORKFLOW} in ${REPO}, laatste ${DAGEN} dagen ===\n`);
for (let i = 0; i < tijden.length - 1; i++) {
  const g = gaten[i];
  console.log(`  ${klok(tijden[i])}   ${uur(g).padStart(6)} na de vorige`
    + `${g > 3 * 3600e3 ? '   <- meer dan drie uur' : ''}`);
}

const span = tijden[0] - tijden[tijden.length - 1];
const perDag = (tijden.length - 1) / (span / 86400e3);
gaten.sort((a, b) => a - b);

console.log(`\n  runs geteld        ${tijden.length}`);
console.log(`  per dag            ${perDag.toFixed(1)}`);
console.log(`  kortste gat        ${uur(gaten[0])}`);
console.log(`  langste gat        ${uur(gaten[gaten.length - 1])}`);
console.log(`  mediaan            ${uur(gaten[Math.floor(gaten.length / 2)])}`);
console.log(`  gaten < 1 uur      ${gaten.filter((g) => g < 3600e3).length} van ${gaten.length}`);
console.log(`\nEen uitslag kan dus tot ${uur(gaten[gaten.length - 1])} op zich laten wachten,`
  + ' hoe vaak de cron ook zegt dat hij draait.');
