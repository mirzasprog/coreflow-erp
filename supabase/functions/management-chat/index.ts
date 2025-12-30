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

    // ERP User Guide - comprehensive instructions on how to use the system
    const erpUserGuide = `
=== VODIČ ZA KORIŠTENJE ERP SUSTAVA ===

📦 SKLADIŠTE (WAREHOUSE MODULE)

KAKO NAPRAVITI NARUDŽBENICU DOBAVLJAČU:
1. Idite na Skladište → Narudžbe → Narudžbe dobavljačima
2. Kliknite "Nova narudžba"
3. Odaberite dobavljača iz padajućeg izbornika
4. Odaberite lokaciju/skladište za prijem
5. Postavite očekivani datum isporuke
6. Dodajte artikle:
   - Pretražite artikl po šifri ili nazivu
   - Unesite količinu
   - Cijena se automatski povlači iz artikla
7. Kliknite "Spremi" za nacrt ili "Pošalji" za slanje dobavljaču
8. Status narudžbe: Nacrt → Poslano → Potvrđeno → Primljeno

KAKO NAPRAVITI PRIJEM ROBE (PRIMKA):
1. Idite na Skladište → Dokumenti → Primke
2. Kliknite "Nova primka" ili "Prijem po narudžbi"
3. Ako je po narudžbi - odaberite narudžbenicu
4. Unesite stvarno primljene količine
5. Za artikle s LOT praćenjem unesite:
   - Broj LOT-a
   - Datum proizvodnje
   - Rok trajanja
   - Bin lokaciju (opciono)
6. Pregledajte i potvrdite prijem
7. Zalihe se automatski ažuriraju

KAKO NAPRAVITI IZDAVANJE ROBE (OTPREMNICA):
1. Idite na Skladište → Dokumenti → Otpremnice
2. Kliknite "Nova otpremnica"
3. Odaberite kupca/primatelja
4. Odaberite skladište iz kojeg izdajete
5. Dodajte artikle i količine
6. Za LOT artikle - odaberite koji LOT izdajete (FIFO princip)
7. Potvrdite dokument
8. Opcionalno: Kreirajte picking nalog za skladištara

KAKO NAPRAVITI MEĐUSKLADIŠNI PRIJENOS:
1. Idite na Skladište → Dokumenti → Prijenosi
2. Kliknite "Novi prijenos"
3. Odaberite izlazno skladište (Od)
4. Odaberite ulazno skladište (Do)
5. Dodajte artikle za prijenos
6. Za LOT artikle - specificirajte LOT
7. Potvrdite prijenos
8. Zalihe se automatski ažuriraju na obje lokacije

KAKO NAPRAVITI INVENTURU:
1. Idite na Skladište → Dokumenti → Inventure
2. Kliknite "Nova inventura"
3. Odaberite skladište
4. Sustav povlači trenutne zalihe
5. Unesite stvarno stanje (brojeno stanje)
6. Sustav automatski računa razliku
7. Pregledajte viškove i manjkove
8. Potvrdite inventuru - zalihe se ažuriraju

KAKO PREGLEDATI ZALIHE:
1. Idite na Skladište → Izvještaji → Stanje zaliha
2. Filtrirajte po lokaciji, kategoriji ili artiklu
3. Vidite: trenutnu količinu, rezervirano, dostupno
4. Za LOT artikle - vidite sve LOT-ove s rokovima
5. Eksportirajte u Excel ako trebate

KAKO UPRAVLJATI ARTIKLIMA:
1. Idite na Skladište → Master podaci → Artikli
2. Za novi artikl: Kliknite "Novi artikl"
3. Obavezna polja: Šifra, Naziv, Jedinica mjere
4. Opcionalno: Kategorija, PDV stopa, Nabavna/Prodajna cijena
5. Za LOT praćenje: Uključite "Praćenje LOT-a"
6. Postavite min/max zalihe za automatske alarme

💰 FINANCIJE (FINANCE MODULE)

KAKO KREIRATI ULAZNU FAKTURU:
1. Idite na Financije → Ulazne fakture
2. Kliknite "Nova faktura"
3. Odaberite dobavljača
4. Unesite broj i datum fakture dobavljača
5. Dodajte stavke:
   - Odaberite artikl ili unesite opis
   - Količina, cijena, PDV stopa
6. Povežite s primkom ako postoji
7. Spremite ili proknjižite

KAKO KREIRATI IZLAZNU FAKTURU:
1. Idite na Financije → Izlazne fakture
2. Kliknite "Nova faktura"
3. Odaberite kupca
4. Dodajte stavke s količinama i cijenama
5. Sustav automatski računa PDV
6. Proknjižite fakturu
7. Opcionalno: Isprintajte ili pošaljite emailom

KAKO NAPRAVITI TEMELJNICU (GL ENTRY):
1. Idite na Financije → Glavna knjiga → Nova temeljnica
2. Unesite datum i opis
3. Dodajte stavke knjiženja:
   - Odaberite konto
   - Unesite duguje ili potražuje
4. Osigurajte da je bilanca = 0 (duguje = potražuje)
5. Proknjižite temeljnicu

👥 HR MODUL

KAKO DODATI NOVOG ZAPOSLENIKA:
1. Idite na HR → Zaposlenici
2. Kliknite "Novi zaposlenik"
3. Unesite osnovne podatke: Ime, Prezime, Email
4. Dodijelite odjel i lokaciju
5. Unesite datum zaposlenja
6. Spremite
7. Nakon toga kreirajte ugovor

KAKO KREIRATI UGOVOR:
1. Idite na HR → Ugovori
2. Kliknite "Novi ugovor"
3. Odaberite zaposlenika
4. Unesite: Datum početka, Tip ugovora, Plaću
5. Opcionalno: Datum kraja, Radno vrijeme, Dani godišnjeg
6. Spremite ugovor

KAKO EVIDENTIRATI ODSUTNOST:
1. Idite na HR → Odsutnosti
2. Kliknite "Nova odsutnost"
3. Odaberite zaposlenika
4. Tip: Godišnji, Bolovanje, Plaćeni dopust, itd.
5. Unesite period (od - do)
6. Spremite
7. Opcionalno: Odobrite odsutnost

KAKO NAPRAVITI OBRAČUN PLAĆE:
1. Idite na HR → Plaće → Periodi
2. Kliknite "Novi period" ili odaberite postojeći
3. Kliknite "Obračunaj plaće"
4. Sustav automatski:
   - Povlači bruto plaće iz ugovora
   - Računa odbitke (doprinosi, porez)
   - Generira platne liste
5. Pregledajte obračun
6. Odobrite i izvezite za isplatu

🛒 POS (BLAGAJNA)

KAKO KORISTITI BLAGAJNU:
1. Idite na POS → Touch POS ili Klasični POS
2. Otvorite smjenu:
   - Unesite početno stanje blagajne
   - Potvrdite
3. Za prodaju:
   - Skenirajte barkod ili pretražite artikl
   - Artikl se dodaje u košaricu
   - Prilagodite količinu ako treba
4. Za naplatu:
   - Kliknite "Naplati"
   - Odaberite način plaćanja (Gotovina/Kartica)
   - Unesite primljeni iznos
   - Potvrdite
5. Račun se automatski ispisuje

KAKO ZATVORITI SMJENU:
1. Na POS-u kliknite "Završi smjenu"
2. Unesite završno stanje blagajne
3. Sustav prikazuje:
   - Ukupnu prodaju
   - Gotovina vs Kartica
   - Razliku u blagajni
4. Potvrdite Z izvještaj

💵 CIJENE I PROMOCIJE

KAKO POSTAVITI CIJENE:
1. Idite na Cijene → Cjenici
2. Odaberite cjenik ili kreirajte novi
3. Dodajte artikle s cijenama
4. Postavite min/max cijenu ako treba
5. Aktivirajte cjenik
6. Povežite s lokacijama

KAKO KREIRATI PROMOCIJU:
1. Idite na Cijene → Promo aktivnosti
2. Kliknite "Nova promocija"
3. Unesite naziv i period
4. Odaberite tip: Popust u %, Fiksna cijena
5. Dodajte artikle u promociju
6. Aktivirajte

🔧 OSTALO

KAKO DODATI NOVOG PARTNERA (DOBAVLJAČ/KUPAC):
1. Idite na Postavke → Partneri
2. Kliknite "Novi partner"
3. Unesite: Šifra, Naziv, OIB/PDV ID
4. Odaberite tip: Dobavljač, Kupac, ili Oba
5. Unesite kontakt podatke
6. Spremite

KAKO KORISTITI DOKUMENTE U BAZU ZNANJA:
1. Idite na Postavke → Dokumenti tvrtke
2. Kliknite "Novi dokument"
3. Unesite naslov i kategoriju
4. Dodajte sadržaj (procedure, pravilnike)
5. Dodajte ključne riječi za pretragu
6. Spremite
7. Chatbot može sada koristiti ovaj dokument

NAVIGACIJA:
- Koristite bočni izbornik za module
- Svaki modul ima podkategorije
- Pretraživanje je dostupno u većini tablica
- Kliknite na red za detalje
- Akcije su dostupno putem gumba ili kontekstnog izbornika
`;

    const systemPrompt = `Ti si AI asistent tvrtke koji pomaže s poslovnim analizama, internim procedurama I UPUTAMA ZA KORIŠTENJE ERP SUSTAVA.

IMAŠ PRISTUP PODACIMA IZ ERP SUSTAVA! Koristi ih za odgovaranje na pitanja o prodaji, zalihama, narudžbama, itd.

${erpUserGuide}

POSLOVNI PODACI IZ SUSTAVA (AKTUALNI PODACI):
${contextData.length > 0 ? contextData.join('\n\n') : 'Trenutno nema podataka u sustavu.'}

INTERNI DOKUMENTI (BAZA ZNANJA):
${proceduresContext || 'Nema relevantnih dokumenata za ovo pitanje.'}

PRAVILA ODGOVARANJA:

1. ZA PITANJA "KAKO SE RADI..." (upute za korištenje ERP-a):
   - OBAVEZNO KORISTI VODIČ ZA ERP iznad
   - Objasni korak po korak
   - Navedi točno gdje u meniju korisnik treba ići
   - Koristi bullet points i numeraciju za jasnoću
   - Primjeri: "Kako napraviti narudžbu?", "Kako izdati robu?", "Kako zatvoriti smjenu?"

2. ZA PITANJA O POSLOVNIM PODACIMA (prodaja, promet, zalihe, narudžbe, fakture):
   - UVIJEK KORISTI podatke iz "POSLOVNI PODACI IZ SUSTAVA" sekcije
   - Ako korisnik pita za "zadnja 2 dana" - koristi podatke za ZADNJA 2 DANA
   - Ako korisnik pita za "zadnjih 7 dana" - koristi podatke za ZADNJIH 7 DANA
   - Ako korisnik pita za "danas" - koristi podatke za DANAS
   - NIKADA ne reci da nemaš podatke ako su prikazani gore!
   - Daj konkretne brojke i statistike

3. ZA PITANJA O PROCEDURAMA I PRAVILNICIMA:
   - Koristi DOSLOVNO sadržaj iz INTERNIH DOKUMENATA ako postoji
   - Ako nema dokumenta - reci: "Nemam internu dokumentaciju o ovoj temi. Predlažem da se doda u bazu znanja."

4. OPĆE:
   - Odgovaraj na hrvatskom jeziku
   - Koristi emoji ikone za vizualnu jasnoću
   - Koristi bullet points i numeraciju
   - Budi koncizan ali detaljan za upute

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
