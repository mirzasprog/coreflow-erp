import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Cost per item analysis
export interface ItemCostAnalysis {
  itemId: string;
  itemCode: string;
  itemName: string;
  categoryId?: string;
  categoryName?: string;
  purchasePrice: number;
  sellingPrice: number;
  marginAmount: number;
  marginPercent: number;
  totalStock: number;
  stockValue: number;
  potentialRevenue: number;
}

// Cost per location analysis
export interface LocationCostAnalysis {
  locationId: string;
  locationCode: string;
  locationName: string;
  totalItems: number;
  totalStock: number;
  stockValue: number;
  potentialRevenue: number;
  averageMargin: number;
}

// Category margin analysis
export interface CategoryMarginAnalysis {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  itemCount: number;
  averagePurchasePrice: number;
  averageSellingPrice: number;
  averageMarginPercent: number;
  totalStockValue: number;
  totalPotentialRevenue: number;
}

// Cashflow projection
export interface CashflowProjection {
  month: string;
  expectedInflows: number;
  expectedOutflows: number;
  netCashflow: number;
  cumulativeBalance: number;
}

// Dead stock analysis
export interface DeadStockItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  locationId: string;
  locationName: string;
  quantity: number;
  stockValue: number;
  daysSinceLastMovement: number;
  lastMovementDate?: string;
}

export function useItemCostAnalysis() {
  return useQuery({
    queryKey: ['controlling', 'item-cost-analysis'],
    queryFn: async (): Promise<ItemCostAnalysis[]> => {
      // Fetch items with stock
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select(`
          id,
          code,
          name,
          purchase_price,
          selling_price,
          category_id,
          item_categories (id, code, name)
        `)
        .eq('active', true);

      if (itemsError) throw itemsError;

      const { data: stock, error: stockError } = await supabase
        .from('stock')
        .select('item_id, quantity');

      if (stockError) throw stockError;

      // Build stock map
      const stockMap = new Map<string, number>();
      stock?.forEach(s => {
        const current = stockMap.get(s.item_id) || 0;
        stockMap.set(s.item_id, current + (s.quantity || 0));
      });

      return (items || []).map(item => {
        const purchasePrice = item.purchase_price || 0;
        const sellingPrice = item.selling_price || 0;
        const marginAmount = sellingPrice - purchasePrice;
        const marginPercent = purchasePrice > 0 ? (marginAmount / purchasePrice) * 100 : 0;
        const totalStock = stockMap.get(item.id) || 0;
        const category = item.item_categories as any;

        return {
          itemId: item.id,
          itemCode: item.code,
          itemName: item.name,
          categoryId: item.category_id || undefined,
          categoryName: category?.name,
          purchasePrice,
          sellingPrice,
          marginAmount,
          marginPercent,
          totalStock,
          stockValue: totalStock * purchasePrice,
          potentialRevenue: totalStock * sellingPrice,
        };
      });
    },
  });
}

export function useLocationCostAnalysis() {
  return useQuery({
    queryKey: ['controlling', 'location-cost-analysis'],
    queryFn: async (): Promise<LocationCostAnalysis[]> => {
      const { data: locations, error: locError } = await supabase
        .from('locations')
        .select('id, code, name')
        .eq('active', true);

      if (locError) throw locError;

      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, purchase_price, selling_price')
        .eq('active', true);

      if (itemsError) throw itemsError;

      const { data: stock, error: stockError } = await supabase
        .from('stock')
        .select('item_id, location_id, quantity');

      if (stockError) throw stockError;

      // Build item price map
      const itemMap = new Map<string, { purchase: number; selling: number }>();
      items?.forEach(i => {
        itemMap.set(i.id, { 
          purchase: i.purchase_price || 0, 
          selling: i.selling_price || 0 
        });
      });

      // Aggregate by location
      return (locations || []).map(loc => {
        const locStock = stock?.filter(s => s.location_id === loc.id) || [];
        let totalItems = 0;
        let totalStock = 0;
        let stockValue = 0;
        let potentialRevenue = 0;
        let totalMarginPercent = 0;

        locStock.forEach(s => {
          const prices = itemMap.get(s.item_id);
          if (prices && s.quantity > 0) {
            totalItems++;
            totalStock += s.quantity;
            stockValue += s.quantity * prices.purchase;
            potentialRevenue += s.quantity * prices.selling;
            if (prices.purchase > 0) {
              totalMarginPercent += ((prices.selling - prices.purchase) / prices.purchase) * 100;
            }
          }
        });

        return {
          locationId: loc.id,
          locationCode: loc.code,
          locationName: loc.name,
          totalItems,
          totalStock,
          stockValue,
          potentialRevenue,
          averageMargin: totalItems > 0 ? totalMarginPercent / totalItems : 0,
        };
      });
    },
  });
}

export function useCategoryMarginAnalysis() {
  return useQuery({
    queryKey: ['controlling', 'category-margin-analysis'],
    queryFn: async (): Promise<CategoryMarginAnalysis[]> => {
      const { data: categories, error: catError } = await supabase
        .from('item_categories')
        .select('id, code, name')
        .eq('active', true);

      if (catError) throw catError;

      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, category_id, purchase_price, selling_price')
        .eq('active', true);

      if (itemsError) throw itemsError;

      const { data: stock, error: stockError } = await supabase
        .from('stock')
        .select('item_id, quantity');

      if (stockError) throw stockError;

      // Build stock map
      const stockMap = new Map<string, number>();
      stock?.forEach(s => {
        const current = stockMap.get(s.item_id) || 0;
        stockMap.set(s.item_id, current + (s.quantity || 0));
      });

      return (categories || []).map(cat => {
        const catItems = items?.filter(i => i.category_id === cat.id) || [];
        let totalPurchase = 0;
        let totalSelling = 0;
        let totalMarginPercent = 0;
        let totalStockValue = 0;
        let totalPotentialRevenue = 0;

        catItems.forEach(item => {
          const qty = stockMap.get(item.id) || 0;
          const purchase = item.purchase_price || 0;
          const selling = item.selling_price || 0;
          
          totalPurchase += purchase;
          totalSelling += selling;
          if (purchase > 0) {
            totalMarginPercent += ((selling - purchase) / purchase) * 100;
          }
          totalStockValue += qty * purchase;
          totalPotentialRevenue += qty * selling;
        });

        const itemCount = catItems.length;

        return {
          categoryId: cat.id,
          categoryCode: cat.code,
          categoryName: cat.name,
          itemCount,
          averagePurchasePrice: itemCount > 0 ? totalPurchase / itemCount : 0,
          averageSellingPrice: itemCount > 0 ? totalSelling / itemCount : 0,
          averageMarginPercent: itemCount > 0 ? totalMarginPercent / itemCount : 0,
          totalStockValue,
          totalPotentialRevenue,
        };
      });
    },
  });
}

export function useCashflowProjections() {
  return useQuery({
    queryKey: ['controlling', 'cashflow-projections'],
    queryFn: async (): Promise<CashflowProjection[]> => {
      // Get unpaid invoices for projections
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

      // Group by month for next 6 months
      const projections: CashflowProjection[] = [];
      const now = new Date();
      let cumulativeBalance = 0;

      for (let i = 0; i < 6; i++) {
        const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
        const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

        // Expected inflows from outgoing invoices due this month
        const expectedInflows = (outgoing || [])
          .filter(inv => {
            if (!inv.due_date) return false;
            const dueDate = new Date(inv.due_date);
            return dueDate >= month && dueDate <= monthEnd;
          })
          .reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paid_amount || 0)), 0);

        // Expected outflows from incoming invoices due this month
        const expectedOutflows = (incoming || [])
          .filter(inv => {
            if (!inv.due_date) return false;
            const dueDate = new Date(inv.due_date);
            return dueDate >= month && dueDate <= monthEnd;
          })
          .reduce((sum, inv) => sum + ((inv.total || 0) - (inv.paid_amount || 0)), 0);

        const netCashflow = expectedInflows - expectedOutflows;
        cumulativeBalance += netCashflow;

        projections.push({
          month: monthKey,
          expectedInflows,
          expectedOutflows,
          netCashflow,
          cumulativeBalance,
        });
      }

      return projections;
    },
  });
}

export function useDeadStockAnalysis(daysThreshold: number = 90) {
  return useQuery({
    queryKey: ['controlling', 'dead-stock', daysThreshold],
    queryFn: async (): Promise<DeadStockItem[]> => {
      // Get stock with items and locations
      const { data: stock, error: stockError } = await supabase
        .from('stock')
        .select(`
          item_id,
          location_id,
          quantity,
          items (id, code, name, purchase_price),
          locations (id, name)
        `)
        .gt('quantity', 0);

      if (stockError) throw stockError;

      // Get last movement dates from warehouse documents
      const { data: movements, error: movError } = await supabase
        .from('warehouse_document_lines')
        .select(`
          item_id,
          warehouse_documents:document_id (document_date, location_id, destination_location_id)
        `)
        .order('warehouse_documents(document_date)', { ascending: false });

      if (movError) throw movError;

      // Build last movement map
      const lastMovementMap = new Map<string, Date>();
      movements?.forEach((m: any) => {
        const doc = m.warehouse_documents;
        if (doc && doc.document_date) {
          const key = `${m.item_id}-${doc.location_id}`;
          const destKey = `${m.item_id}-${doc.destination_location_id}`;
          const moveDate = new Date(doc.document_date);
          
          if (!lastMovementMap.has(key) || lastMovementMap.get(key)! < moveDate) {
            lastMovementMap.set(key, moveDate);
          }
          if (doc.destination_location_id && (!lastMovementMap.has(destKey) || lastMovementMap.get(destKey)! < moveDate)) {
            lastMovementMap.set(destKey, moveDate);
          }
        }
      });

      const now = new Date();
      const deadStock: DeadStockItem[] = [];

      (stock || []).forEach((s: any) => {
        const key = `${s.item_id}-${s.location_id}`;
        const lastMove = lastMovementMap.get(key);
        const daysSince = lastMove 
          ? Math.floor((now.getTime() - lastMove.getTime()) / (1000 * 60 * 60 * 24))
          : 365; // Assume old if no movement found

        if (daysSince >= daysThreshold) {
          deadStock.push({
            itemId: s.item_id,
            itemCode: s.items?.code || '',
            itemName: s.items?.name || '',
            locationId: s.location_id,
            locationName: s.locations?.name || '',
            quantity: s.quantity,
            stockValue: s.quantity * (s.items?.purchase_price || 0),
            daysSinceLastMovement: daysSince,
            lastMovementDate: lastMove?.toISOString().split('T')[0],
          });
        }
      });

      return deadStock.sort((a, b) => b.daysSinceLastMovement - a.daysSinceLastMovement);
    },
  });
}

// Summary stats for dashboard
export function useControllingSummary() {
  return useQuery({
    queryKey: ['controlling', 'summary'],
    queryFn: async () => {
      const { data: items } = await supabase
        .from('items')
        .select('purchase_price, selling_price')
        .eq('active', true);

      const { data: stock } = await supabase
        .from('stock')
        .select('item_id, quantity');

      const { data: outgoingInv } = await supabase
        .from('invoices')
        .select('total, paid_amount')
        .eq('invoice_type', 'outgoing')
        .neq('status', 'cancelled');

      const { data: incomingInv } = await supabase
        .from('invoices')
        .select('total, paid_amount')
        .eq('invoice_type', 'incoming')
        .neq('status', 'cancelled');

      // Build item map
      const itemMap = new Map<string, { purchase: number; selling: number }>();
      items?.forEach((i, idx) => {
        // We need item IDs, let's use stock data
      });

      // Calculate totals
      let totalStockValue = 0;
      let totalPotentialRevenue = 0;
      
      // We need to join items with stock
      const { data: stockWithItems } = await supabase
        .from('stock')
        .select('quantity, items(purchase_price, selling_price)')
        .gt('quantity', 0);

      stockWithItems?.forEach((s: any) => {
        if (s.items) {
          totalStockValue += (s.quantity || 0) * (s.items.purchase_price || 0);
          totalPotentialRevenue += (s.quantity || 0) * (s.items.selling_price || 0);
        }
      });

      const receivables = outgoingInv?.reduce((sum, inv) => 
        sum + ((inv.total || 0) - (inv.paid_amount || 0)), 0) || 0;
      
      const payables = incomingInv?.reduce((sum, inv) => 
        sum + ((inv.total || 0) - (inv.paid_amount || 0)), 0) || 0;

      const averageMargin = totalStockValue > 0 
        ? ((totalPotentialRevenue - totalStockValue) / totalStockValue) * 100 
        : 0;

      return {
        totalStockValue,
        totalPotentialRevenue,
        grossMargin: totalPotentialRevenue - totalStockValue,
        averageMarginPercent: averageMargin,
        receivables,
        payables,
        netWorkingCapital: receivables - payables + totalStockValue,
      };
    },
  });
}
