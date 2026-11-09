import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { invoiceLineAmounts, invoiceTotals, roundMoney } from '@/lib/money';

export type DocumentType = 'goods_receipt' | 'goods_issue' | 'transfer' | 'inventory';

// Standard account codes for warehouse GL entries
const GL_ACCOUNTS = {
  INVENTORY: '1200',           // Zalihe / Inventory
  INVENTORY_ADJUSTMENT: '7900', // Viškovi i manjkovi / Inventory Adjustment (P&L)
  COGS: '6000',                // Nabavna vrijednost / Cost of Goods Sold
  ACCOUNTS_PAYABLE: '2200',    // Dobavljači / Accounts Payable
  GRNI: '2210',                // Roba primljena nefakturisana / Goods Received Not Invoiced
};

// Helper function to generate GL document number
async function generateGLDocumentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  
  const { data } = await supabase
    .from('gl_entries')
    .select('document_number')
    .like('document_number', `${prefix}%`)
    .order('document_number', { ascending: false })
    .limit(1);
  
  let nextNumber = 1;
  if (data && data.length > 0 && data[0].document_number) {
    const lastNumber = parseInt(data[0].document_number.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(6, '0')}`;
}

// Helper function to generate invoice number
async function generateInvoiceNumber(type: 'incoming' | 'outgoing'): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === 'incoming' ? `UF-${year}-` : `IF-${year}-`;
  
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);
  
  let nextNumber = 1;
  if (data && data.length > 0 && data[0].invoice_number) {
    const lastNumber = parseInt(data[0].invoice_number.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
}

// Create invoice proposal from goods receipt
async function createInvoiceProposal(receiptId: string, receipt: any): Promise<string | null> {
  try {
    const invoiceNumber = await generateInvoiceNumber('incoming');
    
    // Get receipt lines
    const { data: lines } = await supabase
      .from('warehouse_document_lines')
      .select('*, items(code, name, vat_rate_id)')
      .eq('document_id', receiptId);
    
    if (!lines || lines.length === 0) return null;

    // Calculate totals with VAT
    let subtotal = 0;
    let vatAmount = 0;
    
    // Get default VAT rate
    const { data: vatRates } = await supabase
      .from('vat_rates')
      .select('*')
      .eq('active', true)
      .limit(1);
    
    const defaultVatRate = vatRates?.[0];

    const invoiceLines = lines.map(line => {
      const lineTotal = line.total_price || (line.quantity * (line.unit_price || 0));
      const vatRate = defaultVatRate?.rate || 17;
      const lineVat = lineTotal * (vatRate / 100);
      subtotal += lineTotal;
      vatAmount += lineVat;
      
      return {
        item_id: line.item_id,
        description: line.items?.name || '',
        quantity: line.quantity,
        unit_price: line.unit_price || 0,
        vat_rate_id: line.items?.vat_rate_id || defaultVatRate?.id,
        vat_amount: lineVat,
        total: lineTotal + lineVat
      };
    });

    const total = roundMoney(subtotal + vatAmount);

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        invoice_type: 'incoming',
        invoice_date: receipt.document_date,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        partner_id: receipt.partner_id,
        warehouse_document_id: receiptId,
        source_receipt_id: receiptId,
        status: 'draft',
        subtotal,
        vat_amount: vatAmount,
        total,
        notes: `Prijedlog fakture iz primke ${receipt.document_number}`
      })
      .select()
      .single();
    
    if (invoiceError) {
      console.error('Failed to create invoice proposal:', invoiceError);
      return null;
    }

    // Create invoice lines
    const linesWithInvoiceId = invoiceLines.map(line => ({
      invoice_id: invoice.id,
      ...line
    }));

    const { error: linesError } = await supabase
      .from('invoice_lines')
      .insert(linesWithInvoiceId);
    
    if (linesError) {
      console.error('Failed to create invoice lines:', linesError);
      await supabase.from('invoices').delete().eq('id', invoice.id);
      return null;
    }

    return invoiceNumber;
  } catch (error) {
    console.error('Error creating invoice proposal:', error);
    return null;
  }
}

export interface WarehouseDocument {
  id: string;
  document_type: string;
  document_number: string;
  document_date: string;
  location_id: string | null;
  target_location_id: string | null;
  partner_id: string | null;
  purchase_order_id: string | null;
  status: 'draft' | 'posted' | 'cancelled';
  notes: string | null;
  total_value: number;
  created_at: string;
  locations?: { name: string } | null;
  target_locations?: { name: string } | null;
  partners?: { name: string } | null;
  purchase_orders?: { order_number: string } | null;
}

export type WarehouseStatusTone = 'draft' | 'approved' | 'posted' | 'closed';

export const getWarehouseStatusTone = (status: WarehouseDocument['status'] | string): WarehouseStatusTone => {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'posted':
      return 'posted';
    case 'cancelled':
      return 'closed';
    default:
      return 'draft';
  }
};

export const getWarehouseStatusLabel = (status: WarehouseDocument['status'] | string) => {
  switch (status) {
    case 'draft':
      return 'Nacrt';
    case 'posted':
      return 'Proknjiženo';
    case 'cancelled':
      return 'Zatvoreno';
    default:
      return status;
  }
};

export interface DocumentLine {
  id?: string;
  document_id?: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  counted_quantity?: number | null;
  difference_quantity?: number | null;
  notes?: string | null;
  purchase_order_line_id?: string | null;
  production_material_id?: string | null;
  items?: { code: string; name: string } | null;
}

export function useWarehouseDocuments(documentType: DocumentType) {
  return useQuery({
    queryKey: ['warehouse-documents', documentType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_documents')
        .select(`
          *,
          locations!warehouse_documents_location_id_fkey(name),
          target_locations:locations!warehouse_documents_target_location_id_fkey(name),
          partners(name),
          purchase_orders(order_number)
        `)
        .eq('document_type', documentType)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as WarehouseDocument[];
    }
  });
}

export function useWarehouseDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['warehouse-document', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data: doc, error: docError } = await supabase
        .from('warehouse_documents')
        .select(`
          *,
          locations!warehouse_documents_location_id_fkey(name),
          target_locations:locations!warehouse_documents_target_location_id_fkey(name),
          partners(name),
          purchase_orders(order_number)
        `)
        .eq('id', id)
        .single();
      
      if (docError) throw docError;

      const { data: lines, error: linesError } = await supabase
        .from('warehouse_document_lines')
        .select(`
          *,
          items:item_id(code, name)
        `)
        .eq('document_id', id);
      
      if (linesError) throw linesError;

      return { ...doc, lines: lines as DocumentLine[] };
    },
    enabled: !!id
  });
}

// Helper to generate picking number
async function generatePickingNumber(): Promise<string> {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const { data } = await supabase
    .from('picking_orders')
    .select('picking_number')
    .like('picking_number', `PO-${datePrefix}%`)
    .order('picking_number', { ascending: false })
    .limit(1);

  let sequence = 1;
  if (data && data.length > 0) {
    const lastNum = data[0].picking_number;
    const lastSeq = parseInt(lastNum.split('-').pop() || '0', 10);
    sequence = lastSeq + 1;
  }

  return `PO-${datePrefix}-${sequence.toString().padStart(4, '0')}`;
}

// Helper to auto-create picking order for goods issue
async function createPickingOrderForIssue(docId: string, doc: any, lines: DocumentLine[]) {
  try {
    const pickingNumber = await generatePickingNumber();

    const { data: pickingOrder, error: pickingError } = await supabase
      .from('picking_orders')
      .insert({
        picking_number: pickingNumber,
        source_document_id: docId,
        source_document_type: 'goods_issue',
        location_id: doc.location_id,
        partner_id: doc.partner_id,
        status: 'open',
        notes: `Picking za izdatnicu ${doc.document_number}`
      })
      .select()
      .single();

    if (pickingError) {
      console.error('Failed to create picking order:', pickingError);
      return null;
    }

    // Create picking order lines
    const pickingLines = lines.map((line: any) => {
      let lotNumber = null;
      let expiryDate = null;
      let binLocation = null;
      let zone = null;
      
      if (line.notes) {
        try {
          const parsed = JSON.parse(line.notes);
          if (parsed?.wms) {
            lotNumber = parsed.wms.lotNumber || null;
            expiryDate = parsed.wms.expiryDate || null;
            binLocation = parsed.wms.binLocation || null;
            zone = parsed.wms.binZone || null;
          }
        } catch {}
      }

      return {
        picking_order_id: pickingOrder.id,
        item_id: line.item_id,
        required_quantity: line.quantity,
        picked_quantity: 0,
        lot_number: lotNumber,
        expiry_date: expiryDate,
        bin_location: binLocation,
        zone: zone,
        picked: false
      };
    });

    if (pickingLines.length > 0) {
      const { error: linesError } = await supabase
        .from('picking_order_lines')
        .insert(pickingLines);
      
      if (linesError) {
        console.error('Failed to create picking order lines:', linesError);
      }
    }

    return pickingOrder;
  } catch (error) {
    console.error('Error creating picking order:', error);
    return null;
  }
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ document, lines }: { document: Record<string, unknown>; lines: DocumentLine[] }) => {
      const { data: doc, error: docError } = await supabase
        .from('warehouse_documents')
        .insert(document as any)
        .select()
        .single();
      
      if (docError) throw docError;

      if (lines.length > 0) {
        const linesWithDocId = lines.map(line => ({
          document_id: doc.id,
          item_id: line.item_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total_price: line.total_price,
          counted_quantity: line.counted_quantity,
          difference_quantity: line.difference_quantity,
          notes: line.notes,
          purchase_order_line_id: line.purchase_order_line_id,
          production_material_id: line.production_material_id
        }));
        
        const { error: linesError } = await supabase
          .from('warehouse_document_lines')
          .insert(linesWithDocId);
        
        if (linesError) throw linesError;
      }

      // Auto-create picking order for goods issues
      if (document.document_type === 'goods_issue') {
        await createPickingOrderForIssue(doc.id, doc, lines);
      }

      return doc;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-documents', variables.document.document_type] });
      queryClient.invalidateQueries({ queryKey: ['picking-orders'] });
      
      if (variables.document.document_type === 'goods_issue') {
        toast.success('Izdatnica kreirana s picking nalogom');
      } else {
        toast.success('Document created successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to create document: ${error.message}`);
    }
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, document, lines }: { id: string; document: Record<string, unknown>; lines: DocumentLine[] }) => {
      const { error: docError } = await supabase
        .from('warehouse_documents')
        .update(document as never)
        .eq('id', id);
      
      if (docError) throw docError;

      // Delete existing lines and insert new ones
      await supabase
        .from('warehouse_document_lines')
        .delete()
        .eq('document_id', id);

      if (lines.length > 0) {
        const linesWithDocId = lines.map(line => ({
          item_id: line.item_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total_price: line.total_price,
          counted_quantity: line.counted_quantity,
          difference_quantity: line.difference_quantity,
          notes: line.notes,
          document_id: id
        }));
        
        const { error: linesError } = await supabase
          .from('warehouse_document_lines')
          .insert(linesWithDocId);
        
        if (linesError) throw linesError;
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-documents'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-document'] });
      toast.success('Document updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update document: ${error.message}`);
    }
  });
}

export function usePostDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, documentType }: { id: string; documentType: DocumentType }) => {
      const { data, error } = await supabase.rpc('erp_post_warehouse', { p_id: id });
      if (error) throw error;
      return data as { id: string; documentType: DocumentType; glEntryNumber?: string; glValue?: number; invoiceProposalNumber?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-documents'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-document'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      let message = 'Document posted successfully';
      
      if (data.glEntryNumber) {
        let valueLabel = 'value';
        if (data.documentType === 'goods_receipt') valueLabel = 'receipt value';
        else if (data.documentType === 'goods_issue') valueLabel = 'COGS';
        else if (data.documentType === 'inventory') valueLabel = 'adjustment';
        
        message = `Dokument proknjižen. GL Entry ${data.glEntryNumber} kreiran (${valueLabel}: ${Math.abs(data.glValue || 0).toFixed(2)} KM).`;
      }
      
      if (data.invoiceProposalNumber) {
        message += ` Prijedlog fakture ${data.invoiceProposalNumber} kreiran.`;
      }
      
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(`Failed to post document: ${error.message}`);
    }
  });
}

export function useGenerateInvoiceProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiptId }: { receiptId: string }) => {
      const { data: receipt, error } = await supabase
        .from('warehouse_documents')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (error) throw error;

      const invoiceNumber = await createInvoiceProposal(receiptId, receipt);
      if (!invoiceNumber) throw new Error('Failed to create invoice proposal');

      return invoiceNumber;
    },
    onSuccess: (invoiceNumber) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['linked-invoice'] });
      toast.success(`Prijedlog fakture ${invoiceNumber} kreiran.`);
    },
    onError: (error: Error) => {
      toast.error(`Neuspješno kreiranje fakture: ${error.message}`);
    },
  });
}

async function updateStock(itemId: string, locationId: string, quantityChange: number) {
  // Check if stock record exists
  const { data: existing } = await supabase
    .from('stock')
    .select('*')
    .eq('item_id', itemId)
    .eq('location_id', locationId)
    .maybeSingle();

  if (existing) {
    const newQty = (existing.quantity || 0) + quantityChange;
    await supabase
      .from('stock')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('stock')
      .insert({ item_id: itemId, location_id: locationId, quantity: quantityChange });
  }
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warehouse_documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-documents'] });
      toast.success('Document deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    }
  });
}

export function useCancelDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warehouse_documents')
        .update({ status: 'cancelled' })
        .eq('id', id);
      
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-documents'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-document'] });
      toast.success('Document cancelled successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel document: ${error.message}`);
    }
  });
}
