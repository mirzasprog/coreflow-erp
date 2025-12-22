import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Gather relevant data based on the query
    let contextData: string[] = [];

    // Check for expiring stock
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + 30);
    
    const { data: expiringStock } = await supabase
      .from('stock_lots')
      .select(`
        *,
        items(code, name),
        locations(name)
      `)
      .gt('quantity', 0)
      .lte('expiry_date', expiryThreshold.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })
      .limit(20);

    if (expiringStock && expiringStock.length > 0) {
      const expiringInfo = expiringStock.map((s: any) => 
        `- ${s.items?.name || 'N/A'} (${s.items?.code || 'N/A'}): LOT ${s.lot_number}, ističe ${s.expiry_date}, količina: ${s.quantity}, lokacija: ${s.locations?.name || 'N/A'}, bin: ${s.bin_location || 'N/A'}`
      ).join('\n');
      contextData.push(`ROBA KOJA ISTIČE (sljedećih 30 dana):\n${expiringInfo}`);
    }

    // Get pending purchase orders
    const { data: pendingOrders } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        partners(name),
        locations(name)
      `)
      .in('status', ['draft', 'sent', 'confirmed'])
      .order('order_date', { ascending: false })
      .limit(10);

    if (pendingOrders && pendingOrders.length > 0) {
      const ordersInfo = pendingOrders.map((o: any) => 
        `- ${o.order_number}: ${o.partners?.name || 'N/A'}, vrijednost: €${o.total_value || 0}, status: ${o.status}, očekivano: ${o.expected_date || 'N/A'}`
      ).join('\n');
      contextData.push(`AKTIVNE NARUDŽBE:\n${ordersInfo}`);
    }

    // Get low stock items
    const { data: lowStock } = await supabase
      .from('stock')
      .select(`
        *,
        items(code, name, min_stock),
        locations(name)
      `)
      .limit(100);

    const lowStockItems = (lowStock || []).filter((s: any) => 
      s.items?.min_stock && s.quantity < s.items.min_stock
    );

    if (lowStockItems.length > 0) {
      const lowStockInfo = lowStockItems.slice(0, 10).map((s: any) => 
        `- ${s.items?.name || 'N/A'}: trenutno ${s.quantity}, minimalno: ${s.items?.min_stock}`
      ).join('\n');
      contextData.push(`ARTIKLI ISPOD MINIMALNIH ZALIHA:\n${lowStockInfo}`);
    }

    // Get recent sales (POS receipts)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentSales } = await supabase
      .from('pos_receipts')
      .select('*')
      .gte('receipt_date', sevenDaysAgo.toISOString())
      .order('receipt_date', { ascending: false });

    if (recentSales && recentSales.length > 0) {
      const totalSales = recentSales.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const cashSales = recentSales.filter((r: any) => r.payment_type === 'cash').reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const cardSales = recentSales.filter((r: any) => r.payment_type === 'card').reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      contextData.push(`PRODAJA (zadnjih 7 dana):\n- Ukupno: €${totalSales.toFixed(2)}\n- Gotovina: €${cashSales.toFixed(2)}\n- Kartica: €${cardSales.toFixed(2)}\n- Broj računa: ${recentSales.length}`);
    }

    // Get picking orders status
    const { data: pickingOrders } = await supabase
      .from('picking_orders')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .limit(10);

    if (pickingOrders && pickingOrders.length > 0) {
      const pickingInfo = pickingOrders.map((p: any) => 
        `- ${p.picking_number}: status ${p.status}`
      ).join('\n');
      contextData.push(`AKTIVNI PICKING NALOZI:\n${pickingInfo}`);
    }

    // Get company documents/procedures
    const { data: documents } = await supabase
      .from('company_documents')
      .select('*')
      .eq('active', true)
      .limit(50);

    let proceduresContext = '';
    if (documents && documents.length > 0) {
      proceduresContext = documents.map((d: any) => 
        `DOKUMENT: ${d.title}\nKATEGORIJA: ${d.category}\nSADRŽAJ:\n${d.content}\n---`
      ).join('\n');
    }

    const systemPrompt = `Ti si AI asistent za upravljanje skladištem i poslovanjem. Odgovaraš SAMO na temelju podataka koje dobiješ.

KRITIČNO VAŽNO:
- Ako nemaš informaciju, reci "Nemam tu informaciju u bazi podataka."
- NIKADA ne izmišljaj podatke, brojeve ili činjenice
- Odgovaraj samo na temelju stvarnih podataka iz sustava
- Ako te pitaju o procedurama a nemaš dokument o tome, reci "Procedura za to nije definirana u sustavu."

TVOJI PODACI IZ SUSTAVA:
${contextData.length > 0 ? contextData.join('\n\n') : 'Nema relevantnih podataka u sustavu.'}

${proceduresContext ? `INTERNI PRAVILNICI I PROCEDURE:\n${proceduresContext}` : 'Nema definiranih internih pravilnika i procedura u sustavu.'}

Kada te pitaju:
- O isteku robe: koristi podatke iz ROBA KOJA ISTIČE
- O narudžbama: koristi podatke iz AKTIVNE NARUDŽBE
- O zalihama: koristi podatke iz ARTIKLI ISPOD MINIMALNIH ZALIHA
- O prodaji: koristi podatke iz PRODAJA
- O picking nalozima: koristi podatke iz AKTIVNI PICKING NALOZI
- O pravilnicima/procedurama: koristi INTERNI PRAVILNICI I PROCEDURE

Budi koncizan i jasan. Koristi bullet points. Odgovaraj na hrvatskom jeziku.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Previše zahtjeva, pokušajte ponovo za nekoliko sekundi." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Potrebno je nadopuniti kredite za AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Greška AI servisa" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Nažalost, ne mogu odgovoriti na to pitanje.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Nepoznata greška" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
