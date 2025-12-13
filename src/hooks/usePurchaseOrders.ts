import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PurchaseOrder {
  id: string;
  order_number: string;
  partner_id: string | null;
  location_id: string | null;
  order_date: string;
  expected_date: string | null;
  status: string;
  total_value: number | null;
  notes: string | null;
  created_at: string | null;
  partners?: { name: string; code: string } | null;
  locations?: { name: string; code: string } | null;
}

interface PurchaseOrderLine {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  items?: { code: string; name: string };
}

interface LowStockItem {
  item_id: string;
  item_code: string;
  item_name: string;
  location_id: string;
  location_name: string;
  current_quantity: number;
  min_stock: number;
  order_quantity: number;
  purchase_price: number;
  preferred_supplier_id: string | null;
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`*, partners(name, code), locations(name, code)`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as PurchaseOrder[];
    }
  });
}

export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['purchase-order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`*, partners(name, code), locations(name, code)`)
        .eq('id', id!)
        .single();
      
      if (error) throw error;

      const { data: lines, error: linesError } = await supabase
        .from('purchase_order_lines')
        .select(`*, items(code, name)`)
        .eq('order_id', id!);
      
      if (linesError) throw linesError;

      return { ...data, lines: lines as unknown as PurchaseOrderLine[] };
    }
  });
}

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  
  const { data } = await supabase
    .from('purchase_orders')
    .select('order_number')
    .like('order_number', `${prefix}%`)
    .order('order_number', { ascending: false })
    .limit(1);
  
  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].order_number.replace(prefix, ''), 10);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
}

export function useGeneratePurchaseOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lowStockItems: LowStockItem[]) => {
      if (lowStockItems.length === 0) {
        throw new Error('No items to order');
      }

      // Group items by supplier (or 'no-supplier' for items without preferred supplier)
      const groupedBySupplier = lowStockItems.reduce((acc, item) => {
        const supplierId = item.preferred_supplier_id || 'no-supplier';
        if (!acc[supplierId]) {
          acc[supplierId] = [];
        }
        acc[supplierId].push(item);
        return acc;
      }, {} as Record<string, LowStockItem[]>);

      // Also group by location within each supplier
      const orders: Array<{
        supplierId: string | null;
        locationId: string;
        items: LowStockItem[];
      }> = [];

      for (const [supplierId, items] of Object.entries(groupedBySupplier)) {
        const byLocation = items.reduce((acc, item) => {
          if (!acc[item.location_id]) {
            acc[item.location_id] = [];
          }
          acc[item.location_id].push(item);
          return acc;
        }, {} as Record<string, LowStockItem[]>);

        for (const [locationId, locationItems] of Object.entries(byLocation)) {
          orders.push({
            supplierId: supplierId === 'no-supplier' ? null : supplierId,
            locationId,
            items: locationItems
          });
        }
      }

      const createdOrders: string[] = [];

      for (const order of orders) {
        const orderNumber = await generateOrderNumber();
        const totalValue = order.items.reduce(
          (sum, item) => sum + (item.order_quantity * item.purchase_price), 0
        );

        // Create the purchase order
        const { data: poData, error: poError } = await supabase
          .from('purchase_orders')
          .insert({
            order_number: orderNumber,
            partner_id: order.supplierId,
            location_id: order.locationId,
            order_date: new Date().toISOString().split('T')[0],
            expected_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'draft',
            total_value: totalValue,
            notes: 'Auto-generated from low stock alerts'
          })
          .select()
          .single();

        if (poError) throw poError;

        // Create the order lines
        const lines = order.items.map(item => ({
          order_id: poData.id,
          item_id: item.item_id,
          quantity: item.order_quantity,
          unit_price: item.purchase_price,
          total_price: item.order_quantity * item.purchase_price,
          notes: `Current stock: ${item.current_quantity}, Min stock: ${item.min_stock}`
        }));

        const { error: linesError } = await supabase
          .from('purchase_order_lines')
          .insert(lines);

        if (linesError) throw linesError;

        createdOrders.push(orderNumber);
      }

      return createdOrders;
    },
    onSuccess: (orderNumbers) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({
        title: 'Purchase Orders Created',
        description: `Created ${orderNumbers.length} purchase order(s): ${orderNumbers.join(', ')}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}
