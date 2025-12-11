import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DocumentType = 'goods_receipt' | 'goods_issue' | 'transfer' | 'inventory';

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
          locations:location_id(name),
          target_locations:target_location_id(name),
          partners:partner_id(name)
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
          warehouse_document_lines(*)
        `)
        .eq('id', id)
        .single();
      
      if (docError) throw docError;

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
        }
      }

      // Update document status
      const { error: updateError } = await supabase
        .from('warehouse_documents')
        .update({ status: 'posted', posted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (updateError) throw updateError;

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-documents'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-document'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Document posted successfully');
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
    .single();

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
