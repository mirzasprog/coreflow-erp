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
  partners?: { name: string; code: string; email?: string } | null;
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

export interface RelatedGoodsReceipt {
  id: string;
  document_number: string;
  document_date: string;
  status: string | null;
  total_value: number | null;
}

export interface RelatedInvoice {
  id: string;
  invoice_number: string;
  status: string | null;
  total: number | null;
  source_receipt_id: string | null;
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

export function usePurchaseOrderRelatedDocuments(orderId: string | undefined) {
  return useQuery({
    queryKey: ['purchase-order-related-documents', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return { receipts: [], invoices: [] };

      // Centralized related-document lookup keeps PO → GR → Invoice navigation consistent.
      const { data: receipts, error: receiptsError } = await supabase
        .from('warehouse_documents')
        .select('id, document_number, document_date, status, total_value')
        .eq('document_type', 'goods_receipt')
        .eq('purchase_order_id', orderId)
        .order('document_date', { ascending: false });

      if (receiptsError) throw receiptsError;

      const receiptIds = (receipts || []).map((receipt) => receipt.id);
      if (receiptIds.length === 0) {
        return { receipts: receipts as RelatedGoodsReceipt[], invoices: [] };
      }

      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total, source_receipt_id')
        .in('source_receipt_id', receiptIds)
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      return {
        receipts: (receipts || []) as RelatedGoodsReceipt[],
        invoices: (invoices || []) as RelatedInvoice[],
      };
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
        .select(`*, partners(name, code, email), locations(name, code)`)
        .eq('id', id!)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;

      const { data: lines, error: linesError } = await supabase
        .from('purchase_order_lines')
        .select(`*, items(code, name), received_quantity`)
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

async function generateDocumentNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;
  
  const { data } = await supabase
    .from('warehouse_documents')
    .select('document_number')
    .like('document_number', `${fullPrefix}%`)
    .order('document_number', { ascending: false })
    .limit(1);
  
  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].document_number.replace(fullPrefix, ''), 10);
    nextNumber = lastNumber + 1;
  }
  
  return `${fullPrefix}${String(nextNumber).padStart(5, '0')}`;
}

// Send email to supplier when order status changes to 'ordered'
async function sendOrderEmail(orderId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-purchase-order-email', {
      body: { orderId }
    });
    
    if (error) {
      console.error('Error calling email function:', error);
      return { success: false, message: error.message };
    }
    
    return data as { success: boolean; message: string };
  } catch (err) {
    console.error('Error sending email:', err);
    return { success: false, message: 'Failed to send email' };
  }
}

// Update stock when order is received
async function updateStockForReceivedOrder(orderId: string, locationId: string): Promise<void> {
  // Get order lines
  const { data: lines, error: linesError } = await supabase
    .from('purchase_order_lines')
    .select('item_id, quantity')
    .eq('order_id', orderId);
  
  if (linesError) throw linesError;
  
  // Update stock for each item
  for (const line of lines || []) {
    // Check if stock record exists
    const { data: existingStock } = await supabase
      .from('stock')
      .select('id, quantity')
      .eq('item_id', line.item_id)
      .eq('location_id', locationId)
      .maybeSingle();
    
    if (existingStock) {
      // Update existing stock
      const newQuantity = (existingStock.quantity || 0) + line.quantity;
      await supabase
        .from('stock')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', existingStock.id);
    } else {
      // Create new stock record
      await supabase
        .from('stock')
        .insert({
          item_id: line.item_id,
          location_id: locationId,
          quantity: line.quantity
        });
    }
  }
}

export function useUpdatePurchaseOrderStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, newStatus, locationId }: { orderId: string; newStatus: string; locationId: string | null }) => {
      // Update order status
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      
      if (error) throw error;

      let emailResult = null;
      
      // If status is 'ordered', send email to supplier
      if (newStatus === 'ordered') {
        emailResult = await sendOrderEmail(orderId);
      }
      
      // If status is 'received', update stock
      if (newStatus === 'received' && locationId) {
        await updateStockForReceivedOrder(orderId, locationId);
      }

      return { newStatus, emailResult };
    },
    onSuccess: ({ newStatus, emailResult }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-report'] });
      
      if (newStatus === 'ordered') {
        if (emailResult?.success) {
          toast({
            title: 'Order Sent',
            description: `Status updated to Ordered. ${emailResult.message}`
          });
        } else {
          toast({
            title: 'Status Updated',
            description: `Status changed to Ordered. ${emailResult?.message || 'Email not sent (no supplier email configured)'}`
          });
        }
      } else if (newStatus === 'received') {
        toast({
          title: 'Order Received',
          description: 'Status updated to Received. Inventory has been updated automatically.'
        });
      } else {
        toast({
          title: 'Status Updated',
          description: `Order status changed to ${newStatus}`
        });
      }
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

export function useConvertToGoodsReceipt() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // Get the order with lines
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .select('*, partners(name, code), locations(name, code)')
        .eq('id', orderId)
        .single();
      
      if (orderError) throw orderError;
      if (!order) throw new Error('Order not found');
      if (order.status !== 'received') throw new Error('Only received orders can be converted');

      const { data: lines, error: linesError } = await supabase
        .from('purchase_order_lines')
        .select('*, items(code, name)')
        .eq('order_id', orderId);
      
      if (linesError) throw linesError;

      // Generate goods receipt document number
      const documentNumber = await generateDocumentNumber('GR');

      // Create goods receipt document
      const { data: grDoc, error: grError } = await supabase
        .from('warehouse_documents')
        .insert({
          document_number: documentNumber,
          document_type: 'goods_receipt',
          document_date: new Date().toISOString().split('T')[0],
          location_id: order.location_id,
          partner_id: order.partner_id,
          status: 'draft',
          total_value: order.total_value,
          notes: `Created from Purchase Order ${order.order_number}`
        })
        .select()
        .single();
      
      if (grError) throw grError;

      // Create goods receipt lines
      const grLines = (lines || []).map(line => ({
        document_id: grDoc.id,
        item_id: line.item_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_price: line.total_price,
        notes: line.notes
      }));

      const { error: grLinesError } = await supabase
        .from('warehouse_document_lines')
        .insert(grLines);
      
      if (grLinesError) throw grLinesError;

      return { documentNumber, documentId: grDoc.id };
    },
    onSuccess: ({ documentNumber }) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-documents'] });
      toast({
        title: 'Goods Receipt Created',
        description: `Created goods receipt ${documentNumber}`
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
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
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
