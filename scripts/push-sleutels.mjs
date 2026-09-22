/**
 * Een VAPID-sleutelpaar maken voor de deadlineherinneringen.
 *
 *     node scripts/push-sleutels.mjs
 *
 * Eén keer per project. De publieke helft gaat in index.html bij
 * VAPID_PUBLIEK; die is met opzet openbaar, net als de anon key. De privé-
 * helft gaat als repository-secret VAPID_PRIVE naar GitHub en nergens anders
 * heen: wie hem heeft kan meldingen namens deze app versturen.
 *
 * Kwijtgeraakt? Maak een nieuw paar. Alle bestaande abonnementen vervallen
 * dan — elk toestel moet opnieuw op "Zet meldingen aan" tikken — maar er gaat
 * niets anders verloren.
 */

import { nieuwSleutelpaar } from './push.mjs';

const { prive, publiek } = nieuwSleutelpaar();

console.log(`
Een vers VAPID-sleutelpaar.

  1. In index.html, bij de instellingen bovenaan:

     const VAPID_PUBLIEK = '${publiek}';

  2. In GitHub → Settings → Secrets and variables → Actions → New secret:

     naam:   VAPID_PRIVE
     waarde: ${prive}

  3. En één keer, ook als secret, waar de pushdiensten je kunnen bereiken als
     er iets mis is met je verkeer. Een mailadres dat je leest:

     naam:   PUSH_CONTACT
     waarde: mailto:jij@voorbeeld.nl

Zet de privésleutel nergens anders neer. Hij hoort niet in index.html, niet in
een commit en niet in een chat.
`);
