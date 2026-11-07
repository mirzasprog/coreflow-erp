import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { AccessError, requireStaff } from '../_shared/staff-auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') throw new AccessError('Method not allowed', 405);
    await requireStaff(req, ['Management']);
    // No provider adapter is configured. Never create demo reservations or invoices.
    return new Response(JSON.stringify({
      success: false,
      error: 'Hotelski kanal nije povezan sa stvarnim pružateljem. Sinkronizacija je onemogućena; rezervacije i fakture nisu kreirane.',
      results: [],
    }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 500;
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Service unavailable' }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
