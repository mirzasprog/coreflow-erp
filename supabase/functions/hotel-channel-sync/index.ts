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

async function importReservation(supabase: any, channel: string, ext: any, result: SyncResult) {
  // Upsert guest by email
  const fakeEmail = `${ext.external_id}@${channel}-import.local`;
  let { data: guest } = await supabase.from('hotel_guests').select('id').eq('email', fakeEmail).maybeSingle();
  if (!guest) {
    const { data: g, error: ge } = await supabase
      .from('hotel_guests')
      .insert({ first_name: ext.guest_first, last_name: ext.guest_last, email: fakeEmail })
      .select('id').single();
    if (ge) { result.errors.push(`guest: ${ge.message}`); return; }
    guest = g;
  }

  const { data: room } = await supabase.from('rooms').select('id').limit(1).maybeSingle();
  if (!room) { result.errors.push(`No rooms available`); return; }

  // Check duplicate by channel_reservation_id
  const { data: existing } = await supabase
    .from('reservations').select('id')
    .eq('channel_reservation_id', ext.external_id).maybeSingle();
  if (existing) { result.updated++; return; }

  const reservationNumber = `RES-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*999)}`;
  const { data: newRes, error } = await supabase.from('reservations').insert({
    reservation_number: reservationNumber,
    guest_id: guest.id,
    room_id: room.id,
    check_in: ext.check_in,
    check_out: ext.check_out,
    total_price: ext.total,
    status: 'confirmed',
    source: channel,
    channel_reservation_id: ext.external_id,
    notes: `Imported from ${channel}`,
  }).select('id').single();
  if (error) { result.errors.push(error.message); return; }
  result.imported++;

  // Auto-create draft invoice in ERP for the new reservation
  try {
    const year = new Date().getFullYear();
    const prefix = `HTL-${year}-`;
    const { data: lastInv } = await supabase
      .from('invoices').select('invoice_number')
      .like('invoice_number', `${prefix}%`)
      .order('invoice_number', { ascending: false }).limit(1);
    let n = 1;
    if (lastInv && lastInv.length > 0) {
      const ln = parseInt(lastInv[0].invoice_number.replace(prefix, ''), 10);
      if (!isNaN(ln)) n = ln + 1;
    }
    const invNumber = `${prefix}${String(n).padStart(5, '0')}`;
    const { data: inv, error: ierr } = await supabase.from('invoices').insert({
      invoice_type: 'outgoing',
      invoice_number: invNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      subtotal: ext.total,
      vat_amount: 0,
      total: ext.total,
      notes: `${channel} rezervacija ${reservationNumber} (${ext.check_in} → ${ext.check_out})`,
    }).select('id').single();
    if (!ierr && inv) {
      await supabase.from('invoice_lines').insert({
        invoice_id: inv.id,
        description: `Smještaj ${ext.check_in} - ${ext.check_out} (${channel})`,
        quantity: 1,
        unit_price: ext.total,
        total: ext.total,
        vat_amount: 0,
      });
    }
  } catch (e: any) {
    result.errors.push(`invoice: ${e.message}`);
  }
}

async function syncBookingCom(connection: any, supabase: any): Promise<SyncResult> {
  const result: SyncResult = { channel: 'booking_com', imported: 0, updated: 0, errors: [] };
  if (!connection.api_key || !connection.property_id) {
    result.errors.push('Missing API key or property ID');
    return result;
  }
  // Production: GET https://supply-xml.booking.com/hotels-api/reservations
  // Mock data for demo (replace with real fetch when going live)
  const mock = [
    { external_id: `BCM-${connection.property_id}-${Date.now()}`, guest_first: 'John', guest_last: 'Doe',
      check_in: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      check_out: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], total: 450 },
  ];
  for (const r of mock) await importReservation(supabase, 'booking_com', r, result);
  return result;
}

async function syncAirbnb(connection: any, supabase: any): Promise<SyncResult> {
  const result: SyncResult = { channel: 'airbnb', imported: 0, updated: 0, errors: [] };
  if (!connection.api_key) { result.errors.push('Missing API key'); return result; }
  // Production: parse iCal feed at connection.settings.ical_url
  const mock = [
    { external_id: `ABNB-${Date.now()}`, guest_first: 'Jane', guest_last: 'Smith',
      check_in: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      check_out: new Date(Date.now() + 17 * 86400000).toISOString().split('T')[0], total: 380 },
  ];
  for (const r of mock) await importReservation(supabase, 'airbnb', r, result);
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

    let q = supabase.from('channel_connections').select('*').eq('is_active', true);
    if (channel_id) q = q.eq('id', channel_id);
    const { data: connections, error } = await q;
    if (error) throw error;

    const results: SyncResult[] = [];
    for (const conn of connections || []) {
      let res: SyncResult;
      if (conn.channel_name === 'booking_com') res = await syncBookingCom(conn, supabase);
      else if (conn.channel_name === 'airbnb') res = await syncAirbnb(conn, supabase);
      else res = { channel: conn.channel_name, imported: 0, updated: 0, errors: ['Unsupported channel'] };
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
