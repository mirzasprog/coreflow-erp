import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  channel: string;
  imported: number;
  updated: number;
  errors: string[];
}

async function syncBookingCom(connection: any, supabase: any): Promise<SyncResult> {
  const result: SyncResult = { channel: 'booking_com', imported: 0, updated: 0, errors: [] };
  if (!connection.api_key || !connection.property_id) {
    result.errors.push('Missing API key or property ID');
    return result;
  }
  // Booking.com Reservations API mock - real impl would use:
  // GET https://supply-xml.booking.com/hotels-api/reservations
  // For demo: simulate fetching N upcoming reservations
  try {
    // In production: const r = await fetch(`https://supply-xml.booking.com/hotels-api/reservations?hotel_id=${connection.property_id}`, { headers: { Authorization: `Basic ${btoa(connection.api_key)}` }});
    const mockReservations = [
      { external_id: `BCM-${Date.now()}-1`, guest_first: 'John', guest_last: 'Doe', check_in: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], check_out: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], total: 450, room_type: 'Standard' },
    ];
    for (const r of mockReservations) {
      // Upsert guest
      const { data: guest } = await supabase
        .from('hotel_guests')
        .upsert({ first_name: r.guest_first, last_name: r.guest_last, email: `${r.external_id}@booking-import.local` }, { onConflict: 'email' })
        .select()
        .single();
      // Find any room
      const { data: room } = await supabase.from('rooms').select('id').limit(1).maybeSingle();
      if (!room) {
        result.errors.push(`No rooms available for ${r.external_id}`);
        continue;
      }
      // Check if reservation exists by notes containing external_id
      const { data: existing } = await supabase
        .from('reservations')
        .select('id')
        .ilike('notes', `%${r.external_id}%`)
        .maybeSingle();
      if (existing) {
        result.updated++;
        continue;
      }
      const { error } = await supabase.from('reservations').insert({
        guest_id: guest?.id,
        room_id: room.id,
        check_in_date: r.check_in,
        check_out_date: r.check_out,
        total_amount: r.total,
        status: 'confirmed',
        notes: `Imported from Booking.com [${r.external_id}]`,
        channel_source: 'booking_com',
      });
      if (error) result.errors.push(error.message);
      else result.imported++;
    }
  } catch (e: any) {
    result.errors.push(e.message);
  }
  return result;
}

async function syncAirbnb(connection: any, supabase: any): Promise<SyncResult> {
  const result: SyncResult = { channel: 'airbnb', imported: 0, updated: 0, errors: [] };
  if (!connection.api_key) {
    result.errors.push('Missing API key');
    return result;
  }
  // Airbnb uses iCal feeds typically - for demo:
  try {
    const mockReservations = [
      { external_id: `ABNB-${Date.now()}-1`, guest_first: 'Jane', guest_last: 'Smith', check_in: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], check_out: new Date(Date.now() + 17 * 86400000).toISOString().split('T')[0], total: 380 },
    ];
    for (const r of mockReservations) {
      const { data: guest } = await supabase
        .from('hotel_guests')
        .upsert({ first_name: r.guest_first, last_name: r.guest_last, email: `${r.external_id}@airbnb-import.local` }, { onConflict: 'email' })
        .select()
        .single();
      const { data: room } = await supabase.from('rooms').select('id').limit(1).maybeSingle();
      if (!room) { result.errors.push(`No rooms for ${r.external_id}`); continue; }
      const { data: existing } = await supabase
        .from('reservations').select('id').ilike('notes', `%${r.external_id}%`).maybeSingle();
      if (existing) { result.updated++; continue; }
      const { error } = await supabase.from('reservations').insert({
        guest_id: guest?.id,
        room_id: room.id,
        check_in_date: r.check_in,
        check_out_date: r.check_out,
        total_amount: r.total,
        status: 'confirmed',
        notes: `Imported from Airbnb [${r.external_id}]`,
        channel_source: 'airbnb',
      });
      if (error) result.errors.push(error.message); else result.imported++;
    }
  } catch (e: any) {
    result.errors.push(e.message);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const { channel_id } = body;

    let query = supabase.from('channel_connections').select('*').eq('is_active', true);
    if (channel_id) query = query.eq('id', channel_id);

    const { data: connections, error } = await query;
    if (error) throw error;

    const results: SyncResult[] = [];
    for (const conn of connections || []) {
      let res: SyncResult;
      if (conn.channel_name === 'booking_com') res = await syncBookingCom(conn, supabase);
      else if (conn.channel_name === 'airbnb') res = await syncAirbnb(conn, supabase);
      else { res = { channel: conn.channel_name, imported: 0, updated: 0, errors: ['Unsupported channel'] }; }
      results.push(res);
      await supabase.from('channel_connections').update({ last_sync_at: new Date().toISOString() }).eq('id', conn.id);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
