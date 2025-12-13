import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DocumentType = 'goods_receipt' | 'goods_issue' | 'transfer' | 'inventory';

// Standard account codes for warehouse GL entries
const GL_ACCOUNTS = {
  INVENTORY: '1200',           // Zalihe / Inventory
  INVENTORY_ADJUSTMENT: '7900', // Viškovi i manjkovi / Inventory Adjustment (P&L)
  COGS: '6000',                // Nabavna vrijednost / Cost of Goods Sold
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

export interface WarehouseDocument {
  id: string;
  document_type: string;
  document_number: string;
  document_date: string;
  location_id: string | null;
  target_location_id: string | null;
  partner_id: string | null;
  status: 'draft' | 'posted' | 'cancelled';
  notes: string | null;
  total_value: number;
  created_at: string;
  locations?: { name: string } | null;
  target_locations?: { name: string } | null;
  partners?: { name: string } | null;
}

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
          partners(name)
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
          partners(name)
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
          notes: line.notes
        }));
        
        const { error: linesError } = await supabase
          .from('warehouse_document_lines')
          .insert(linesWithDocId);
        
        if (linesError) throw linesError;
      }

      return doc;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-documents', variables.document.document_type] });
      toast.success('Document created successfully');
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
        .update(document)
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
      // Get document with lines
      const { data: doc, error: docError } = await supabase
        .from('warehouse_documents')
        .select(`
          *,
          warehouse_document_lines(*, items(code, name))
        `)
        .eq('id', id)
        .single();
      
      if (docError) throw docError;

      let totalAdjustmentValue = 0;
      const adjustmentDetails: { itemName: string; difference: number; value: number }[] = [];

      // Update stock based on document type
      for (const line of (doc as any).warehouse_document_lines) {
        if (documentType === 'goods_receipt') {
          // Increase stock
          await updateStock(line.item_id, doc.location_id, line.quantity);
        } else if (documentType === 'goods_issue') {
          // Decrease stock
          await updateStock(line.item_id, doc.location_id, -line.quantity);
        } else if (documentType === 'transfer') {
          // Decrease source, increase target
          await updateStock(line.item_id, doc.location_id, -line.quantity);
          await updateStock(line.item_id, doc.target_location_id, line.quantity);
        } else if (documentType === 'inventory') {
          // Set stock to counted quantity
          const difference = (line.counted_quantity || 0) - line.quantity;
          await updateStock(line.item_id, doc.location_id, difference);
          
          // Track adjustment value for GL entry
          if (difference !== 0) {
            const adjustmentValue = difference * (line.unit_price || 0);
            totalAdjustmentValue += adjustmentValue;
            adjustmentDetails.push({
              itemName: line.items?.name || 'Unknown item',
              difference,
              value: adjustmentValue,
            });
          }
        }
      }

      let glEntryNumber: string | null = null;

      // Create GL entry for inventory adjustments
      if (documentType === 'inventory' && totalAdjustmentValue !== 0) {
        // Get accounts
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, code, name')
          .eq('active', true);

        if (accounts && accounts.length > 0) {
          const findAccount = (codePrefix: string) => 
            accounts.find((a) => a.code.startsWith(codePrefix));

          const inventoryAccount = findAccount(GL_ACCOUNTS.INVENTORY) || accounts[0];
          const adjustmentAccount = findAccount(GL_ACCOUNTS.INVENTORY_ADJUSTMENT) || accounts[0];

          glEntryNumber = await generateGLDocumentNumber();

          const glLines: Array<{
            account_id: string;
            debit: number;
            credit: number;
            description: string | null;
            partner_id: string | null;
          }> = [];

          const docDate = doc.document_date;
          const adjustmentDesc = adjustmentDetails
            .map((d) => `${d.itemName}: ${d.difference > 0 ? '+' : ''}${d.difference}`)
            .join(', ');

          if (totalAdjustmentValue > 0) {
            // Surplus: Debit Inventory, Credit Adjustment Income
            glLines.push({
              account_id: inventoryAccount.id,
              debit: totalAdjustmentValue,
              credit: 0,
              description: `Inventory surplus: ${adjustmentDesc}`,
              partner_id: null,
            });
            glLines.push({
              account_id: adjustmentAccount.id,
              debit: 0,
              credit: totalAdjustmentValue,
              description: `Inventory surplus - Document ${doc.document_number}`,
              partner_id: null,
            });
          } else {
            // Shortage: Debit Adjustment Expense, Credit Inventory
            const absValue = Math.abs(totalAdjustmentValue);
            glLines.push({
              account_id: adjustmentAccount.id,
              debit: absValue,
              credit: 0,
              description: `Inventory shortage - Document ${doc.document_number}`,
              partner_id: null,
            });
            glLines.push({
              account_id: inventoryAccount.id,
              debit: 0,
              credit: absValue,
              description: `Inventory shortage: ${adjustmentDesc}`,
              partner_id: null,
            });
          }

          // Create GL entry
          const { data: glEntry, error: glError } = await supabase
            .from('gl_entries')
            .insert({
              entry_date: docDate,
              description: `Inventory adjustment - ${doc.document_number}`,
              reference_type: 'inventory',
              reference_id: id,
              status: 'posted',
              document_number: glEntryNumber,
            })
            .select()
            .single();

          if (glError) {
            console.error('Failed to create GL entry:', glError);
          } else {
            // Create GL entry lines
            const linesWithEntryId = glLines.map((line) => ({
              entry_id: glEntry.id,
              ...line,
            }));

            const { error: linesError } = await supabase
              .from('gl_entry_lines')
              .insert(linesWithEntryId);

            if (linesError) {
              console.error('Failed to create GL entry lines:', linesError);
              // Rollback GL entry
              await supabase.from('gl_entries').delete().eq('id', glEntry.id);
              glEntryNumber = null;
            }
          }
        }
      }

      // Update document status
      const { error: updateError } = await supabase
        .from('warehouse_documents')
        .update({ status: 'posted', posted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (updateError) throw updateError;

      return { id, glEntryNumber, totalAdjustmentValue };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-documents'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-document'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      
      if (data.glEntryNumber) {
        toast.success(`Document posted. GL Entry ${data.glEntryNumber} created for adjustment of ${data.totalAdjustmentValue?.toFixed(2)} KM.`);
      } else {
        toast.success('Document posted successfully');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to post document: ${error.message}`);
    }
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
