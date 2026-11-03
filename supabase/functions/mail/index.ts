// De functie `mail` (Supabase Edge Function, 3 november): de mails van de sync
// versturen via Resend. De logica staat in mail-kern.mjs; hier alleen het
// verzoek en het antwoord.
//
// Uitrollen: via de MCP van Supabase (deploy_edge_function, naam `mail`,
// verify_jwt aan, met index.ts en mail-kern.mjs), of supabase functions deploy
// mail. Alleen de sync roept hem aan, met de service_role key. Het geheim
// RESEND_API_KEY zet Danny zelf bij de functies in Supabase (BEDIENING §11g);
// zonder dat geheim verstuurt hij niets en zegt hij dat.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verwerkMail } from './mail-kern.mjs';

const antwoord = (status: number, body: unknown) => new Response(JSON.stringify(body),
  { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return antwoord(405, { fout: 'alleen POST' });
  try {
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(Deno.env.get('SUPABASE_URL')!, service,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const uit = await verwerkMail({
      verzoek: await req.json(),
      token,
      service,
      resend: Deno.env.get('RESEND_API_KEY') ?? '',
      afzender: Deno.env.get('MAIL_AFZENDER') || undefined,
      db,
    });
    return antwoord(uit.status, uit.body);
  } catch (e) {
    console.error('mail mislukt:', e instanceof Error ? e.message : String(e));
    return antwoord(500, { fout: 'Er ging iets mis bij het versturen.' });
  }
});
