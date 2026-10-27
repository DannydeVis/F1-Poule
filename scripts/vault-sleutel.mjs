/**
 * De sleutel van de meldingen ook in de Vault van Supabase, voor de functie
 * `tik` (premium, supabase/functions/tik). Die verstuurt een melding op het
 * moment dat iemand tikt, en heeft daarvoor dezelfde sleutel nodig als de
 * herinneringen van de sync. De sleutel staat als GitHub-secret (VAPID_PRIVE);
 * de sync zet hem, met de publieke helft en het contact, versleuteld in de
 * Vault (Danny, 26 oktober: "Ja, ook in Supabase").
 *
 * Alleen als hij er nog niet of anders staat: de vingerafdruk zegt dat zonder
 * de sleutel terug te lezen. Los van sync.mjs zodat het na te rekenen is
 * (test/tik-versturen.test.mjs); `sb` is de PostgREST-aanroep van de sync.
 */

import { createHash } from 'node:crypto';
import { publiekeSleutel } from './push.mjs';

export async function sleutelInVault({ prive, contact, sb }) {
  if (!prive) return 'geen sleutel';
  const sleutel = { prive, publiek: publiekeSleutel(prive), contact };
  const vingerafdruk = createHash('sha256').update(JSON.stringify(sleutel)).digest('hex');
  const staat = await sb('rpc/push_sleutel_vingerafdruk', { method: 'POST', body: '{}' });
  if (staat === vingerafdruk) return 'staat er al';
  await sb('rpc/push_sleutel_zetten', { method: 'POST',
    body: JSON.stringify({ p_sleutel: { ...sleutel, vingerafdruk } }) });
  return 'gezet';
}
