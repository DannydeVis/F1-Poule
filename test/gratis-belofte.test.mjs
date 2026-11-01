// Wat de site en de app over geld zeggen (Danny, 1 november).
//
// "De site en de app beloven dat alles gratis is, maar er zijn premiumfuncties
// (eigen profiel, teams, eigen vragen, tussenklassementen, aantikken). Trek de
// teksten gelijk." De lijn, overal hetzelfde: meespelen is en blijft gratis,
// zonder advertenties. Alles wat je nodig hebt voor een poule met vrienden zit
// erin. Voor grote poules en bedrijven komen er later extra's tegen betaling.
// Geen prijs noemen zolang betalen niet live staat.
//
// Wat hier vastligt:
//   1. Nergens in de repo een belofte dat elke functie gratis is, of dat het
//      gratis blijft tot in de eeuwigheid, in geen van de zeven talen. Ook
//      niet in de werkdocumenten: wie de oude zin wil aanhalen, omschrijft
//      hem. Alleen dit bestand noemt ze. Wat online staat (de site, llms.txt,
//      de app, de README) zegt ook nergens dat "alles" gratis is: een citaat
//      van Danny in OVERDRACHT mag dat wel.
//   2. Het cijfer bij de 0 euro zegt waar die 0 voor geldt: om mee te spelen.
//   3. De FAQ "Is Predict the Race gratis?" zegt in elke taal dat meespelen
//      gratis blijft en dat er later extra's tegen betaling komen. Op de pagina,
//      in de JSON-LD en in llms.txt hetzelfde.
//   4. Er is in elke taal een FAQ over wat premium kost en wat je krijgt: wat
//      er nu in zit, dat betalen nog niet aanstaat, en waar je het aanvraagt.
//   5. Geen prijs: geen bedrag bij premium of de extra's, op de site, in
//      llms.txt en in de app; in de JSON-LD alleen de 0 van meespelen.
//   6. In de app zegt de uitleg voor de poulebaas van een poule zonder premium
//      in gewone taal dat het extra's zijn, dat meespelen gratis blijft en dat
//      betalen nog niet kan. In alle zeven talen, ook de melding bij aantikken.
//
// Zonder browser: alles staat in de bronbestanden en de gemaakte pagina's.
// test/premium.test.mjs kijkt in de browser naar de uitleg in de app.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { maakControle, wortel, gepubliceerd } from './hulp.mjs';
import { teksten, TALEN } from '../site/teksten.mjs';
import { PAGINAS } from '../site/paginas.mjs';
import { VRAGEN } from '../site/vragen.mjs';
import { CONTACT } from '../site/privacy.mjs';

const { check, afronden } = maakControle('wat de site en de app over geld zeggen');
const lees = (pad) => readFileSync(join(wortel, pad), 'utf8');

// ---- 1. geen belofte dat alles (voor altijd) gratis is --------------------------
// Per taal: "nu en altijd" en "alle functies" (Danny), met de andere woorden
// voor dezelfde belofte. Hoofdletters tellen niet, en een woord moet heel zijn
// ("ora e sempre" mag niet, "ancora e sempre" wel).
const BELOFTES = {
  nl: ['nu en altijd', 'alle functies', 'voor altijd gratis', 'altijd gratis'],
  en: ['now and always', 'now and forever', 'every feature', 'all features', 'all functions', 'free forever',
    'forever free', 'always free', 'free for ever'],
  de: ['jetzt und immer', 'alle Funktionen', 'für immer kostenlos', 'immer kostenlos'],
  fr: ['maintenant et toujours', 'toutes les fonctions', 'toutes les fonctionnalités', 'gratuit pour toujours',
    'toujours gratuit'],
  es: ['ahora y siempre', 'todas las funciones', 'todas las funcionalidades', 'gratis para siempre',
    'siempre gratis'],
  it: ['ora e sempre', 'tutte le funzioni', 'tutte le funzionalità', 'gratis per sempre', 'sempre gratis'],
  pt: ['agora e sempre', 'todas as funções', 'todas as funcionalidades', 'todos os recursos',
    'grátis para sempre', 'sempre grátis'],
};
// En in wat online staat ook niet dat "alles" gratis is. In de docs mag het,
// als citaat: Danny's eigen zin begint ermee.
const ALLES_GRATIS = ['alles gratis', 'alles is gratis', 'everything is free', 'everything free',
  'alles kostenlos', 'alles ist kostenlos', 'tout est gratuit', 'todo es gratis', 'todo gratis',
  'tutto è gratis', 'tutto gratis', 'tudo é grátis', 'tudo grátis'];
const patroon = (zin) => new RegExp(`(?<![\\p{L}\\p{N}])${zin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  .replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'iu');
const ALLE_BELOFTES = Object.values(BELOFTES).flat().map((zin) => ({ zin, re: patroon(zin) }));
const ALLES = ALLES_GRATIS.map((zin) => ({ zin, re: patroon(zin) }));

// Elk tekstbestand in de repo, behalve de mappen die er niet bij horen en dit
// bestand zelf (dat noemt ze nu eenmaal).
const OVERSLAAN = new Set(['.git', 'node_modules', 'build', '.gradle']);
const TEKST = new Set(['.html', '.mjs', '.js', '.json', '.md', '.txt', '.sql', '.yml', '.yaml', '.xml', '.css',
  '.webmanifest', '.svg', '.ts', '.sh', '.toml', '.kts', '.gradle', '.properties']);
const DIT = relative(wortel, new URL(import.meta.url).pathname);
function* bestanden(map) {
  for (const naam of readdirSync(map)) {
    if (OVERSLAAN.has(naam)) continue;
    const pad = join(map, naam);
    const st = statSync(pad);
    if (st.isDirectory()) yield* bestanden(pad);
    else if (TEKST.has(extname(naam)) && st.size < 8e6) yield relative(wortel, pad);
  }
}
const ALLE = [...bestanden(wortel)].filter((f) => f !== DIT);
check('de repo is doorzocht, met de bronnen en de gemaakte pagina\'s', ALLE.length > 200
  && ['site/teksten.mjs', 'site/paginas.mjs', 'app/index.html', 'app/talen/de.json', 'index.html', 'en/index.html',
    'llms.txt', 'README.md', 'docs/zoekplan/3-geo.md'].every((f) => ALLE.includes(f)), String(ALLE.length));
// Eerst bewijzen dat de zoektocht iets vindt: de oude zinnen, letterlijk.
check('de zoektocht vindt de oude zinnen ("nu en altijd", "Every feature ... everyone", "ora e sempre")',
  ['euro, nu en altijd', 'Every feature is available to everyone.', 'euro, ora e sempre',
    'Todas as funções estão disponíveis', 'Alle Funktionen stehen allen zur Verfügung']
    .every((oud) => ALLE_BELOFTES.some(({ re }) => re.test(oud)))
  && ['Bij ons is alles gratis.', 'Everything is free.'].every((oud) => ALLES.some(({ re }) => re.test(oud)))
  && !ALLE_BELOFTES.some(({ re }) => re.test('ancora e sempre')) && !ALLE_BELOFTES.some(({ re }) => re.test('Meespelen is en blijft gratis')));
// Wat online staat of wie de repo opent als eerste leest: de site (bronnen en
// gemaakte pagina's), llms.txt, de app met zijn vertalingen, en de README.
const ONLINE = ALLE.filter((f) => f === 'README.md' || /^site\/.*\.mjs$/.test(f) || f === 'scripts/maak-site.mjs'
  || (gepubliceerd(f) && /\.(html|txt|json|js|webmanifest|xml)$/.test(f)));
check('wat online staat is erbij: de voorpagina\'s, de gidsen, llms.txt, de app en zijn vertalingen',
  ['index.html', 'en/index.html', 'llms.txt', 'app/index.html', 'app/talen/pt.json', 'README.md', 'site/teksten.mjs',
    'en/about/index.html'].every((f) => ONLINE.includes(f)) && !ONLINE.includes('OVERDRACHT.md'), String(ONLINE.length));
{
  const fout = [];
  for (const f of ALLE) {
    const regels = lees(f).split('\n');
    const zinnen = ONLINE.includes(f) ? [...ALLE_BELOFTES, ...ALLES] : ALLE_BELOFTES;
    regels.forEach((r, i) => {
      for (const { zin, re } of zinnen) if (re.test(r)) fout.push(`${f}:${i + 1} "${zin}"`);
    });
  }
  check(`nergens een belofte dat elke functie gratis is of het altijd blijft, en online nergens "alles gratis" (${ALLE.length} bestanden)`,
    fout.length === 0, fout.slice(0, 8).join(' · '));
}

// ---- de gemaakte voorpagina's ----------------------------------------------------
const voorpagina = (c) => lees(teksten[c].pad ? `${teksten[c].pad}/index.html` : 'index.html');
const zonderTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const faqOpPagina = (html) => [...(html.match(/<section class="blok" id="faq">[\s\S]*?<\/section>/)?.[0] ?? '')
  .matchAll(/<details><summary><h3>([\s\S]*?)<\/h3><\/summary><p>([\s\S]*?)<\/p><\/details>/g)]
  .map(([, v, a]) => ({ vraag: zonderTags(v), antwoord: zonderTags(a), html: a }));
const graaf = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap(([, j]) => { try { return JSON.parse(j.replace(/<\\\//g, '</'))['@graph'] ?? []; } catch { return []; } });

// ---- 2. het cijfer bij de 0 euro -------------------------------------------------
const SPELEN = {
  nl: 'euro om mee te spelen', en: 'euros to play', de: 'Euro zum Mitspielen', fr: 'euro pour jouer',
  es: 'euros por jugar', it: 'euro per giocare', pt: 'euros para jogar',
};
for (const c of TALEN) {
  check(`${c}: bij de 0 staat "${SPELEN[c]}"`, teksten[c].cijfers[2] === SPELEN[c]
    && voorpagina(c).includes(`<b data-tel="0">0</b><span>${SPELEN[c]}</span>`), teksten[c].cijfers[2]);
}

// ---- 3. de FAQ over gratis -------------------------------------------------------
// Per taal: de vraag, het woord voor gratis met "blijft", en de extra's tegen
// betaling die later komen.
const GRATIS = {
  nl: ['Is Predict the Race gratis?', 'Meespelen is en blijft gratis, zonder advertenties.', 'poule met vrienden', 'later extra\'s tegen betaling'],
  en: ['Is Predict the Race free?', 'Playing is free and will stay free, without ads.', 'league with friends', 'paid extras later'],
  de: ['Ist Predict the Race kostenlos?', 'Mitspielen ist und bleibt kostenlos, ohne Werbung.', 'Tipprunde mit Freunden', 'später kostenpflichtige Extras'],
  fr: ['Predict the Race est-il gratuit ?', 'Jouer est gratuit et le restera, sans publicité.', 'ligue entre amis', 'extras payants viendront plus tard'],
  es: ['¿Predict the Race es gratis?', 'Jugar es y seguirá siendo gratis, sin anuncios.', 'liga con amigos', 'extras de pago más adelante'],
  it: ['Predict the Race è gratis?', 'Giocare è e resterà gratis, senza pubblicità.', 'lega tra amici', 'extra a pagamento'],
  pt: ['O Predict the Race é grátis?', 'Jogar é e continuará sendo grátis, sem anúncios.', 'bolão com amigos', 'extras pagos mais adiante'],
};
const JA = { nl: 'Ja', en: 'Yes', de: 'Ja', fr: 'Oui', es: 'Sí', it: 'Sì', pt: 'Sim' };
const llms = lees('llms.txt');
for (const c of TALEN) {
  const [vraag, blijft, vrienden, later] = GRATIS[c];
  const item = teksten[c].faq.items.find(([v]) => v === vraag);
  const a = item?.[1] ?? '';
  check(`${c}: "${vraag}" zegt dat meespelen gratis blijft, met alles voor een poule met vrienden, en extra's later`,
    teksten[c].faq.items[0]?.[0] === vraag && a.startsWith(`${JA[c]}. ${blijft}`) && a.includes(vrienden) && a.includes(later), a);
  const html = voorpagina(c);
  const opPagina = faqOpPagina(html).find((x) => x.vraag === vraag);
  const ld = graaf(html).find((x) => x['@type'] === 'FAQPage')?.mainEntity?.find((q) => q.name === vraag);
  check(`${c}: op de pagina en in de JSON-LD hetzelfde antwoord`,
    opPagina?.antwoord === a && ld?.acceptedAnswer?.text === a, `${opPagina?.antwoord} | ${ld?.acceptedAnswer?.text}`);
}
check('llms.txt: de FAQ over gratis en de regel "Price:" volgen de lijn',
  llms.includes(`### Is Predict the Race free?\n\n${teksten.en.faq.items[0][1]}`)
    && /^- Price: playing is free and will stay free, without ads\..*Paid extras for big leagues and companies \(premium\) will come later; paying is not switched on yet, so there is no price yet\./m.test(llms),
  llms.match(/^- Price:.*$/m)?.[0] ?? '');

// ---- 4. de FAQ over premium ------------------------------------------------------
// De vraag, en per taal: wat er nu in zit (teams, eigen vragen, logo) en dat
// betalen nog niet aanstaat.
const PREMIUM = {
  nl: ['Wat kost premium en wat krijg je?', ['teams', 'eigen vragen', 'logo'], 'Betalen staat nog niet aan, dus er is nog geen prijs.'],
  en: ['What does premium cost and what do you get?', ['teams', 'own questions', 'logo'], 'Paying is not switched on yet, so there is no price yet.'],
  de: ['Was kostet Premium und was bekommt man?', ['Teams', 'eigene Fragen', 'Logo'], 'Bezahlen ist noch nicht freigeschaltet, deshalb gibt es noch keinen Preis.'],
  fr: ['Combien coûte premium et que contient-il ?', ['équipes', 'propres questions', 'logo'], 'Le paiement n\'est pas encore activé, il n\'y a donc pas encore de prix.'],
  es: ['¿Cuánto cuesta premium y qué incluye?', ['equipos', 'preguntas propias', 'logo'], 'El pago todavía no está activado, así que aún no hay precio.'],
  it: ['Quanto costa premium e cosa offre?', ['squadre', 'domande proprie', 'logo'], 'Il pagamento non è ancora attivo, quindi non c\'è ancora un prezzo.'],
  pt: ['Quanto custa o premium e o que ele inclui?', ['times', 'perguntas próprias', 'logo'], 'O pagamento ainda não está ativado, então ainda não há preço.'],
};
for (const c of TALEN) {
  const [vraag, nu, nogNiet] = PREMIUM[c];
  const items = teksten[c].faq.items;
  const i = items.findIndex(([v]) => v === vraag);
  const a = items[i]?.[1] ?? '';
  check(`${c}: een FAQ "${vraag}" met wat er nu in zit, dat betalen nog niet aanstaat en waar je het aanvraagt`,
    i > 0 && nu.every((w) => a.includes(w)) && a.includes(nogNiet) && a.includes('{contact}'), a);
  const html = voorpagina(c);
  const opPagina = faqOpPagina(html).find((x) => x.vraag === vraag);
  const ld = graaf(html).find((x) => x['@type'] === 'FAQPage')?.mainEntity?.find((q) => q.name === vraag);
  const metAdres = a.replace('{contact}', CONTACT);
  check(`${c}: op de pagina met een maillink naar ${CONTACT}, in de JSON-LD met het adres als tekst`,
    opPagina?.antwoord === metAdres && opPagina.html.includes(`<a href="mailto:${CONTACT}">${CONTACT}</a>`)
      && ld?.acceptedAnswer?.text === metAdres, `${opPagina?.html ?? '(niet op de pagina)'} | ${ld?.acceptedAnswer?.text}`);
  check(`${c}: de vraag staat in site/vragen.mjs, beantwoord op de voorpagina`,
    VRAGEN.some((v) => v.vraag === vraag && v.taal === c && v.doel === 'voorpagina#faq' && v.status === 'beantwoord'));
}
check('llms.txt: de FAQ over premium, met het adres',
  llms.includes(`### What does premium cost and what do you get?\n\n${teksten.en.faq.items.find(([v]) => v === PREMIUM.en[0])?.[1].replace('{contact}', CONTACT)}`));
check('nergens op de site of in llms.txt een losse {contact}',
  !llms.includes('{contact}') && TALEN.every((c) => !voorpagina(c).includes('{contact}')));

// ---- 5. geen prijs ---------------------------------------------------------------
// Een bedrag: een munt met een getal ervoor of erna.
const BEDRAG = /(?:[€$£]\s?\d)|(?:\d+(?:[.,]\d+)?\s?(?:€|eur\b|euros?\b|dollars?\b|dólares\b|pounds?\b|pond\b))/i;
check('de bedragtest herkent een bedrag', ['€ 2,99 per poule', '2,99 euro', '$3', '3 EUR', 'vanaf 59 euro']
  .every((x) => BEDRAG.test(x)) && !BEDRAG.test('0 euro om mee te spelen'.replace(/^0 /, '')));
// Elke tekst op de site die over premium of extra's tegen betaling gaat.
const OVER_BETALEN = /premium|extra's|\bextras?\b|\bextras\b|kostenpflichtig|payants?|de pago|a pagamento|pagos/i;
const teksten_ = [];
const verzamel = (x, waar) => {
  if (typeof x === 'string') teksten_.push({ x, waar });
  else if (Array.isArray(x)) x.forEach((y, i) => verzamel(y, `${waar}[${i}]`));
  else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) verzamel(y, `${waar}.${k}`);
};
verzamel(teksten, 'teksten');
verzamel(PAGINAS, 'paginas');
llms.split('\n').forEach((r, i) => teksten_.push({ x: r, waar: `llms.txt:${i + 1}` }));
{
  const overBetalen = teksten_.filter(({ x }) => OVER_BETALEN.test(x));
  const metBedrag = overBetalen.filter(({ x }) => BEDRAG.test(x));
  check(`geen bedrag in wat de site en llms.txt over premium en de extra's zeggen (${overBetalen.length} teksten)`,
    overBetalen.length >= 20 && metBedrag.length === 0, metBedrag.slice(0, 4).map(({ waar, x }) => `${waar}: ${x.slice(0, 90)}`).join(' · '));
}
for (const c of TALEN) {
  const g = graaf(voorpagina(c));
  const app = g.find((x) => x['@type'] === 'WebApplication');
  const offers = [app?.offers].flat().filter(Boolean);
  check(`${c}: in de JSON-LD één aanbod, de 0 van meespelen, en geen prijs voor premium`,
    offers.length === 1 && offers[0].price === '0' && app.isAccessibleForFree === true
      && !JSON.stringify(g).match(/"price"\s*:\s*"(?!0")/), JSON.stringify(app?.offers));
}

// ---- 6. de app -------------------------------------------------------------------
const bron = lees('app/index.html');
const begin = bron.indexOf('const ENGELS = Object.fromEntries([');
const eind = bron.indexOf('\n]);', begin);
// De lijst is gewoon JavaScript (zie test/talen.test.mjs).
const ENGELS = new Map(new Function(`return ${bron.slice(begin + 'const ENGELS = Object.fromEntries('.length, eind + 2)}`)());
const TALEN_APP = Object.fromEntries(['de', 'fr', 'es', 'it', 'pt']
  .map((c) => [c, JSON.parse(lees(`app/talen/${c}.json`))]));
const vertaling = (nl, c) => (c === 'nl' ? nl : c === 'en' ? ENGELS.get(nl) : TALEN_APP[c]?.[nl]) ?? '';

const UITLEG = [...ENGELS.keys()].find((k) => k.startsWith('Meespelen blijft gratis'));
const LABEL = "premium: extra's voor grote poules";
const TIK = [...ENGELS.keys()].find((k) => k.startsWith('Aantikken is een extra'));
check('de uitleg over premium staat in de app, met het label erboven',
  !!UITLEG && bron.includes(`T("${LABEL}")`) && bron.includes('data-premium-uitleg>${T(\'Meespelen blijft gratis'),
  UITLEG ?? '(geen sleutel)');
// Per taal: gratis, de extra's, en dat betalen nog niet kan.
const APP = {
  nl: ['Meespelen blijft gratis', "extra's", 'Betalen kan nog niet.'],
  en: ['Playing stays free', 'extras', 'Paying is not possible yet.'],
  de: ['Mitspielen bleibt kostenlos', 'Extras', 'Bezahlen geht noch nicht.'],
  fr: ['Jouer reste gratuit', 'extras', 'Le paiement n\'est pas encore possible.'],
  es: ['Jugar sigue siendo gratis', 'extras', 'Todavía no se puede pagar.'],
  it: ['Giocare resta gratis', 'extra', 'Pagare non è ancora possibile.'],
  pt: ['Jogar continua grátis', 'extras', 'Ainda não é possível pagar.'],
};
for (const c of ['nl', 'en', 'de', 'fr', 'es', 'it', 'pt']) {
  const [gratis, extra, nogNiet] = APP[c];
  const u = vertaling(UITLEG, c);
  const l = vertaling(LABEL, c);
  const t = vertaling(TIK, c);
  check(`app ${c}: de uitleg zegt dat meespelen gratis blijft, dat het extra's zijn en dat betalen nog niet kan, zonder prijs`,
    u.startsWith(gratis) && u.includes(extra) && u.includes(nogNiet) && u.includes('{adres}') && !BEDRAG.test(u), u);
  check(`app ${c}: het label noemt de extra's, en aantikken heet een extra`,
    /premium/i.test(l) && l.toLowerCase().includes(extra.toLowerCase()) && /extra/i.test(t), `${l} | ${t}`);
}

process.exit(afronden() ? 0 : 1);
