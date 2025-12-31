import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();
    const format = url.searchParams.get('format') || 'json';

    console.log(`BI Analytics request: ${endpoint}, format: ${format}`);

    let data: any = null;

    switch (endpoint) {
      case 'stock-value': {
        // Stock value by location
        const { data: stock, error } = await supabase
          .from('stock')
          .select(`
            quantity,
            locations (id, code, name),
            items (id, code, name, purchase_price, selling_price)
          `)
          .gt('quantity', 0);

        if (error) throw error;

        const locationMap = new Map();
        stock?.forEach((s: any) => {
          const locId = s.locations?.id;
          if (!locId) return;
          
          const current = locationMap.get(locId) || {
            location_id: locId,
            location_code: s.locations.code,
            location_name: s.locations.name,
            total_items: 0,
            total_quantity: 0,
            stock_value: 0,
            potential_revenue: 0,
          };
          
          current.total_items++;
          current.total_quantity += s.quantity;
          current.stock_value += s.quantity * (s.items?.purchase_price || 0);
          current.potential_revenue += s.quantity * (s.items?.selling_price || 0);
          
          locationMap.set(locId, current);
        });

        data = Array.from(locationMap.values());
        break;
      }

      case 'margin-analysis': {
        // Margin by category
        const { data: items, error: itemsError } = await supabase
          .from('items')
          .select(`
            id, code, name, purchase_price, selling_price,
            item_categories (id, code, name)
          `)
          .eq('active', true);

        if (itemsError) throw itemsError;

        const { data: stock } = await supabase
          .from('stock')
          .select('item_id, quantity');

        const stockMap = new Map();
        stock?.forEach(s => {
          const current = stockMap.get(s.item_id) || 0;
          stockMap.set(s.item_id, current + (s.quantity || 0));
        });

        data = items?.map((item: any) => {
          const purchase = item.purchase_price || 0;
          const selling = item.selling_price || 0;
          const margin = selling - purchase;
          const marginPercent = purchase > 0 ? (margin / purchase) * 100 : 0;
          const qty = stockMap.get(item.id) || 0;

          return {
            item_id: item.id,
            item_code: item.code,
            item_name: item.name,
            category_id: item.item_categories?.id,
            category_name: item.item_categories?.name,
            purchase_price: purchase,
            selling_price: selling,
            margin_amount: margin,
            margin_percent: marginPercent,
            stock_quantity: qty,
            stock_value: qty * purchase,
            potential_revenue: qty * selling,
          };
        });
        break;
      }

      case 'turnover': {
        // Sales turnover from POS receipts
        const startDate = url.searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = url.searchParams.get('end') || new Date().toISOString().split('T')[0];

        const { data: receipts, error } = await supabase
          .from('pos_receipts')
          .select(`
            id, receipt_date, total, subtotal, vat_amount, payment_type, is_return,
            pos_terminals (id, name, locations (id, code, name))
          `)
          .gte('receipt_date', startDate)
          .lte('receipt_date', endDate + 'T23:59:59')
          .eq('is_return', false);

        if (error) throw error;

        // Group by date
        const dateMap = new Map();
        receipts?.forEach((r: any) => {
          const date = r.receipt_date?.split('T')[0];
          if (!date) return;

          const current = dateMap.get(date) || {
            date,
            receipt_count: 0,
            total_sales: 0,
            total_vat: 0,
            cash_sales: 0,
            card_sales: 0,
          };

          current.receipt_count++;
          current.total_sales += r.total || 0;
          current.total_vat += r.vat_amount || 0;
          if (r.payment_type === 'cash') {
            current.cash_sales += r.total || 0;
          } else {
            current.card_sales += r.total || 0;
          }

          dateMap.set(date, current);
        });

        data = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
        break;
      }

      case 'dead-stock': {
        const days = parseInt(url.searchParams.get('days') || '90');
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: stock, error: stockError } = await supabase
          .from('stock')
          .select(`
            item_id, location_id, quantity,
            items (id, code, name, purchase_price),
            locations (id, code, name)
          `)
          .gt('quantity', 0);

        if (stockError) throw stockError;

        // Get last movements
        const { data: movements } = await supabase
          .from('warehouse_document_lines')
          .select(`
            item_id,
            warehouse_documents:document_id (document_date, location_id)
          `)
          .order('warehouse_documents(document_date)', { ascending: false });

        const lastMoveMap = new Map();
        movements?.forEach((m: any) => {
          const key = `${m.item_id}-${m.warehouse_documents?.location_id}`;
          if (!lastMoveMap.has(key) && m.warehouse_documents?.document_date) {
            lastMoveMap.set(key, m.warehouse_documents.document_date);
          }
        });

        const now = new Date();
        data = stock?.filter((s: any) => {
          const key = `${s.item_id}-${s.location_id}`;
          const lastMove = lastMoveMap.get(key);
          if (!lastMove) return true;
          const daysSince = Math.floor((now.getTime() - new Date(lastMove).getTime()) / (1000 * 60 * 60 * 24));
          return daysSince >= days;
        }).map((s: any) => {
          const key = `${s.item_id}-${s.location_id}`;
          const lastMove = lastMoveMap.get(key);
          const daysSince = lastMove 
            ? Math.floor((now.getTime() - new Date(lastMove).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          return {
            item_id: s.item_id,
            item_code: s.items?.code,
            item_name: s.items?.name,
            location_id: s.location_id,
            location_name: s.locations?.name,
            quantity: s.quantity,
            stock_value: s.quantity * (s.items?.purchase_price || 0),
            days_since_movement: daysSince,
            last_movement_date: lastMove,
          };
        });
        break;
      }

      case 'cashflow': {
        // Cashflow projections
        const { data: outgoing, error: outError } = await supabase
          .from('invoices')
          .select('total, paid_amount, due_date')
          .eq('invoice_type', 'outgoing')
          .neq('status', 'cancelled');

        if (outError) throw outError;

        const { data: incoming, error: inError } = await supabase
          .from('invoices')
          .select('total, paid_amount, due_date')
          .eq('invoice_type', 'incoming')
          .neq('status', 'cancelled');

        if (inError) throw inError;

        const projections = [];
        const now = new Date();
        let cumulative = 0;

        for (let i = 0; i < 6; i++) {
          const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
          const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

          const inflows = (outgoing || [])
            .filter(inv => {
              if (!inv.due_date) return false;
              const due = new Date(inv.due_date);
              return due >= month && due <= monthEnd;
            })
            .reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paid_amount || 0)), 0);

          const outflows = (incoming || [])
            .filter(inv => {
              if (!inv.due_date) return false;
              const due = new Date(inv.due_date);
              return due >= month && due <= monthEnd;
            })
            .reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paid_amount || 0)), 0);

          const net = inflows - outflows;
          cumulative += net;

          projections.push({
            month: monthKey,
            expected_inflows: inflows,
            expected_outflows: outflows,
            net_cashflow: net,
            cumulative_balance: cumulative,
          });
        }

        data = projections;
        break;
      }

      case 'summary': {
        // Overall summary for dashboards
        const { data: stockData } = await supabase
          .from('stock')
          .select('quantity, items(purchase_price, selling_price)')
          .gt('quantity', 0);

        let totalStockValue = 0;
        let totalPotentialRevenue = 0;
        stockData?.forEach((s: any) => {
          if (s.items) {
            totalStockValue += (s.quantity || 0) * (s.items.purchase_price || 0);
            totalPotentialRevenue += (s.quantity || 0) * (s.items.selling_price || 0);
          }
        });

        const { data: outInv } = await supabase
          .from('invoices')
          .select('total, paid_amount')
          .eq('invoice_type', 'outgoing')
          .neq('status', 'cancelled');

        const { data: inInv } = await supabase
          .from('invoices')
          .select('total, paid_amount')
          .eq('invoice_type', 'incoming')
          .neq('status', 'cancelled');

        const receivables = outInv?.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paid_amount || 0)), 0) || 0;
        const payables = inInv?.reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paid_amount || 0)), 0) || 0;

        data = {
          total_stock_value: totalStockValue,
          total_potential_revenue: totalPotentialRevenue,
          gross_margin: totalPotentialRevenue - totalStockValue,
          margin_percent: totalStockValue > 0 ? ((totalPotentialRevenue - totalStockValue) / totalStockValue) * 100 : 0,
          receivables,
          payables,
          net_working_capital: receivables - payables + totalStockValue,
          generated_at: new Date().toISOString(),
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({
            error: 'Unknown endpoint',
            available_endpoints: [
              'stock-value',
              'margin-analysis', 
              'turnover',
              'dead-stock',
              'cashflow',
              'summary',
            ],
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Return based on format
    if (format === 'csv') {
      if (!Array.isArray(data) || data.length === 0) {
        return new Response('No data', { headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
      ];

      return new Response(csvRows.join('\n'), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${endpoint}_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('BI Analytics error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
