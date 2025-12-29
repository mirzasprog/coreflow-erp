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
    const { message, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Gather relevant data based on the query
    let contextData: string[] = [];
    const messageLower = message.toLowerCase();

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

    // Get all stock items with detailed info
    const { data: allStock } = await supabase
      .from('stock')
      .select(`
        *,
        items(code, name, min_stock, max_stock, selling_price, purchase_price),
        locations(name)
      `)
      .limit(500);

    const lowStockItems = (allStock || []).filter((s: any) => 
      s.items?.min_stock && s.quantity < s.items.min_stock
    );

    if (lowStockItems.length > 0) {
      const lowStockInfo = lowStockItems.slice(0, 15).map((s: any) => 
        `- ${s.items?.name || 'N/A'}: trenutno ${s.quantity}, minimalno: ${s.items?.min_stock}, lokacija: ${s.locations?.name || 'N/A'}`
      ).join('\n');
      contextData.push(`ARTIKLI ISPOD MINIMALNIH ZALIHA (${lowStockItems.length} ukupno):\n${lowStockInfo}`);
    }

    // Calculate total stock value
    if (allStock && allStock.length > 0) {
      const totalStockValue = allStock.reduce((sum: number, s: any) => {
        const price = s.items?.purchase_price || 0;
        return sum + (s.quantity * price);
      }, 0);
      contextData.push(`UKUPNA VRIJEDNOST ZALIHA: €${totalStockValue.toFixed(2)}`);
    }

    // Get sales data for multiple periods
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoDaysAgo = new Date(todayStart);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Fetch all receipts for the last 30 days for flexible analysis
    const { data: allSales } = await supabase
      .from('pos_receipts')
      .select(`
        *,
        pos_receipt_lines(
          quantity,
          unit_price,
          total,
          items(name, code)
        )
      `)
      .gte('receipt_date', thirtyDaysAgo.toISOString())
      .order('receipt_date', { ascending: false });

    if (allSales && allSales.length > 0) {
      // Today's sales
      const todaySales = allSales.filter((r: any) => new Date(r.receipt_date) >= todayStart);
      const todayTotal = todaySales.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      
      // Last 2 days sales
      const last2DaysSales = allSales.filter((r: any) => new Date(r.receipt_date) >= twoDaysAgo);
      const last2DaysTotal = last2DaysSales.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const last2DaysCash = last2DaysSales.filter((r: any) => r.payment_type === 'cash').reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const last2DaysCard = last2DaysSales.filter((r: any) => r.payment_type === 'card').reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      
      // Last 7 days sales
      const last7DaysSales = allSales.filter((r: any) => new Date(r.receipt_date) >= sevenDaysAgo);
      const last7DaysTotal = last7DaysSales.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const last7DaysCash = last7DaysSales.filter((r: any) => r.payment_type === 'cash').reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const last7DaysCard = last7DaysSales.filter((r: any) => r.payment_type === 'card').reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      
      // Last 30 days
      const last30DaysTotal = allSales.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const last30DaysCash = allSales.filter((r: any) => r.payment_type === 'cash').reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      const last30DaysCard = allSales.filter((r: any) => r.payment_type === 'card').reduce((sum: number, r: any) => sum + (r.total || 0), 0);

      // Calculate average daily sales
      const avgDailySales = last30DaysTotal / 30;

      contextData.push(`PRODAJA - DETALJNI PREGLED:

DANAS:
- Ukupno: €${todayTotal.toFixed(2)}
- Broj računa: ${todaySales.length}

ZADNJA 2 DANA:
- Ukupno: €${last2DaysTotal.toFixed(2)}
- Gotovina: €${last2DaysCash.toFixed(2)}
- Kartica: €${last2DaysCard.toFixed(2)}
- Broj računa: ${last2DaysSales.length}

ZADNJIH 7 DANA:
- Ukupno: €${last7DaysTotal.toFixed(2)}
- Gotovina: €${last7DaysCash.toFixed(2)}
- Kartica: €${last7DaysCard.toFixed(2)}
- Broj računa: ${last7DaysSales.length}
- Prosječno dnevno: €${(last7DaysTotal / 7).toFixed(2)}

ZADNJIH 30 DANA:
- Ukupno: €${last30DaysTotal.toFixed(2)}
- Gotovina: €${last30DaysCash.toFixed(2)}
- Kartica: €${last30DaysCard.toFixed(2)}
- Broj računa: ${allSales.length}
- Prosječno dnevno: €${avgDailySales.toFixed(2)}`);

      // Top selling items in last 7 days
      const itemSales: Record<string, { name: string, quantity: number, total: number }> = {};
      last7DaysSales.forEach((receipt: any) => {
        (receipt.pos_receipt_lines || []).forEach((line: any) => {
          const itemName = line.items?.name || 'Nepoznato';
          if (!itemSales[itemName]) {
            itemSales[itemName] = { name: itemName, quantity: 0, total: 0 };
          }
          itemSales[itemName].quantity += line.quantity || 0;
          itemSales[itemName].total += line.total || 0;
        });
      });
      
      const topItems = Object.values(itemSales)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      
      if (topItems.length > 0) {
        const topItemsInfo = topItems.map((item, idx) => 
          `${idx + 1}. ${item.name}: ${item.quantity} kom, €${item.total.toFixed(2)}`
        ).join('\n');
        contextData.push(`TOP 10 NAJPRODAVANIJIH ARTIKALA (zadnjih 7 dana):\n${topItemsInfo}`);
      }
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

    // Get employee count and active employees
    const { data: employees, count: employeeCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact' })
      .eq('active', true);

    if (employeeCount) {
      contextData.push(`ZAPOSLENICI: ${employeeCount} aktivnih zaposlenika`);
    }

    // Get open invoices
    const { data: openInvoices } = await supabase
      .from('invoices')
      .select('*')
      .in('status', ['draft', 'posted'])
      .limit(50);

    if (openInvoices && openInvoices.length > 0) {
      const incomingTotal = openInvoices
        .filter((i: any) => i.invoice_type === 'incoming')
        .reduce((sum: number, i: any) => sum + (i.total || 0) - (i.paid_amount || 0), 0);
      const outgoingTotal = openInvoices
        .filter((i: any) => i.invoice_type === 'outgoing')
        .reduce((sum: number, i: any) => sum + (i.total || 0) - (i.paid_amount || 0), 0);
      
      contextData.push(`OTVORENE FAKTURE:
- Ulazne (za platiti): €${incomingTotal.toFixed(2)}
- Izlazne (za naplatiti): €${outgoingTotal.toFixed(2)}`);
    }

    // Get items count
    const { count: itemsCount } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    if (itemsCount) {
      contextData.push(`KATALOG: ${itemsCount} aktivnih artikala u sustavu`);
    }

    // Get company documents/procedures - search by keywords from user message
    const { data: documents } = await supabase
      .from('company_documents')
      .select('*')
      .eq('active', true);

    let proceduresContext = '';
    let relevantDocs: any[] = [];
    let hasKnowledgeGap = false;
    
    if (documents && documents.length > 0) {
      // Search for relevant documents based on user message keywords
      const messageLower = message.toLowerCase();
      // Extract meaningful keywords (longer than 2 chars, remove common words)
      const stopWords = ['kako', 'što', 'sto', 'gdje', 'kada', 'zašto', 'zasto', 'koji', 'koja', 'koje', 'mogu', 'moze', 'može', 'imam', 'imati', 'treba', 'trebam', 'hocu', 'hoću', 'zelim', 'želim', 'molim', 'hvala'];
      const keywords = messageLower
        .split(/\s+/)
        .filter((w: string) => w.length > 2 && !stopWords.includes(w));
      
      console.log(`Searching with keywords: ${keywords.join(', ')}`);
      
      // Score documents by relevance
      const scoredDocs = documents.map((d: any) => {
        const titleLower = d.title.toLowerCase();
        const contentLower = d.content.toLowerCase();
        const categoryLower = d.category.toLowerCase();
        const docKeywords = (d.keywords || []).map((k: string) => k.toLowerCase());
        
        let score = 0;
        
        keywords.forEach((kw: string) => {
          // Title match = highest priority
          if (titleLower.includes(kw)) score += 10;
          // Keyword match = high priority
          if (docKeywords.some((dk: string) => dk.includes(kw) || kw.includes(dk))) score += 8;
          // Category match
          if (categoryLower.includes(kw)) score += 5;
          // Content match
          if (contentLower.includes(kw)) score += 3;
        });
        
        return { doc: d, score };
      });
      
      // Get documents with score > 0, sorted by score
      relevantDocs = scoredDocs
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(s => s.doc);
      
      console.log(`Found ${relevantDocs.length} relevant docs with scores`);
      
      // If relevant docs found, use them. Otherwise mark as knowledge gap
      if (relevantDocs.length > 0) {
        proceduresContext = relevantDocs.slice(0, 5).map((d: any) => 
          `=== DOKUMENT: ${d.title} ===\nKATEGORIJA: ${d.category}\nKLJUČNE RIJEČI: ${(d.keywords || []).join(', ')}\n\nSADRŽAJ:\n${d.content}\n\n${'='.repeat(50)}`
        ).join('\n\n');
      } else {
        // Check if this is a question that SHOULD have an answer in knowledge base
        const questionIndicators = ['kako', 'što', 'sto', 'gdje', 'kada', 'zašto', 'zasto', 'procedura', 'uputa', 'pravilnik', 'pravilo', 'postupak'];
        const isKnowledgeQuestion = questionIndicators.some(q => messageLower.includes(q));
        
        if (isKnowledgeQuestion) {
          hasKnowledgeGap = true;
          console.log('Detected potential knowledge gap - no relevant docs for question');
        }
      }
    } else {
      // No documents at all
      hasKnowledgeGap = true;
    }

    console.log(`Found ${documents?.length || 0} total docs, ${relevantDocs.length} relevant docs for query: "${message}"`);

    const systemPrompt = `Ti si AI asistent tvrtke koji pomaže s poslovnim analizama i internim procedurama.

IMAŠ PRISTUP PODACIMA IZ ERP SUSTAVA! Koristi ih za odgovaranje na pitanja o prodaji, zalihama, narudžbama, itd.

POSLOVNI PODACI IZ SUSTAVA (AKTUALNI PODACI):
${contextData.length > 0 ? contextData.join('\n\n') : 'Trenutno nema podataka u sustavu.'}

INTERNI DOKUMENTI (BAZA ZNANJA):
${proceduresContext || 'Nema relevantnih dokumenata za ovo pitanje.'}

PRAVILA ODGOVARANJA:

1. ZA PITANJA O POSLOVNIM PODACIMA (prodaja, promet, zalihe, narudžbe, fakture):
   - UVIJEK KORISTI podatke iz "POSLOVNI PODACI IZ SUSTAVA" sekcije
   - Ako korisnik pita za "zadnja 2 dana" - koristi podatke za ZADNJA 2 DANA
   - Ako korisnik pita za "zadnjih 7 dana" - koristi podatke za ZADNJIH 7 DANA
   - Ako korisnik pita za "danas" - koristi podatke za DANAS
   - NIKADA ne reci da nemaš podatke ako su prikazani gore!
   - Daj konkretne brojke i statistike

2. ZA PITANJA O PROCEDURAMA I UPUTAMA:
   - Koristi DOSLOVNO sadržaj iz dokumenata ako postoji
   - Ako nema dokumenta - reci: "Nemam internu dokumentaciju o ovoj temi. Predlažem da se doda u bazu znanja."

3. OPĆE:
   - Odgovaraj na hrvatskom jeziku
   - Koristi bullet points za jasnoću
   - Budi koncizan i precizan

${hasKnowledgeGap ? 'NAPOMENA: Za ovo pitanje nema interne dokumentacije - predloži da se doda u bazu znanja.' : ''}`;

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

    // Save chat history to database
    try {
      const { error: insertError } = await supabase
        .from('chatbot_history')
        .insert({
          user_id: userId || null,
          question: message,
          answer: reply,
          has_knowledge_gap: hasKnowledgeGap
        });
      
      if (insertError) {
        console.error('Error saving chat history:', insertError);
      } else {
        console.log('Chat history saved successfully');
      }
    } catch (historyError) {
      console.error('Failed to save chat history:', historyError);
    }

    return new Response(JSON.stringify({ reply, hasKnowledgeGap }), {
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
