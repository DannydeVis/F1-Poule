/**
 * Een gemerkt blok uit index.html knippen.
 *
 * index.html is één bestand zonder bouwstap, dus de rekenkern is niet te
 * importeren. Om die kern toch te kunnen controleren tegen de echte database
 * knippen we hem er letterlijk uit — de productiecode dus, en niet een kopie
 * die uit de pas kan lopen.
 *
 * Dat ging eerder op regelnummers, en die schoven mee met elke bewerking
 * erboven. Eén keer zo ver dat het blok midden in een functie begon en het
 * script omviel op "Illegal return statement": een foutmelding die niets zegt
 * over wat er echt aan de hand was. Namen schuiven niet mee, dus staan er nu
 * merktekens in index.html:
 *
 *     // <knip primitieven>
 *     ...
 *     // </knip primitieven>
 */

export const BLOKKEN = ['primitieven', 'vragen', 'zoeken', 'optellen'];

export function knipUit(bron, naam) {
  const open = `// <knip ${naam}>`;
  const dicht = `// </knip ${naam}>`;
  const van = bron.indexOf(open);
  const tot = bron.indexOf(dicht);
  if (van === -1) throw new Error(`het merkteken ${open} ontbreekt in index.html`);
  if (tot === -1) throw new Error(`het merkteken ${dicht} ontbreekt in index.html`);
  if (tot < van) throw new Error(`${dicht} staat vóór ${open} in index.html`);
  const stuk = bron.slice(bron.indexOf('\n', van) + 1, tot);
  if (!stuk.trim()) throw new Error(`het blok <knip ${naam}> is leeg`);
  return stuk;
}

/**
 * De vier blokken aan elkaar, met een toestand S eromheen. Dat is precies
 * wat de rekenkern nodig heeft: S.leden, S.races, S.antwoorden, S.vragen,
 * S.poulevragen, S.ik, S.poule, S.jokers en S.preds. bouwPreds() vult
 * S.preds uit S.antwoorden.
 *
 * De poule en de jokers zijn verplicht. Ze stonden er eerst niet in, en dan
 * rekent de kern gewoon door: zonder `poule.jokers_vanaf` staan de jokers uit
 * en telt elk weekend enkel. Dat gaf een stand die er geloofwaardig uitzag
 * en toch niet die van de app was, zodra iemand een joker had gelegd.
 */
export function rekenkern(bron, toestand) {
  const mist = ['poule', 'jokers'].filter((k) => !(k in toestand));
  if (mist.length) {
    throw new Error(`rekenkern: ${mist.join(' en ')} ontbreekt; zonder rekent hij een andere stand dan de app`);
  }
  return `
const S = ${JSON.stringify({ preds: [], ...toestand })};

${BLOKKEN.map((naam) => knipUit(bron, naam)).join('\n\n')}

bouwPreds();
`;
}
