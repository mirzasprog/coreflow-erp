import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PickingOrderLine {
  id: string;
  picking_order_id: string;
  item_id: string;
  required_quantity: number;
  picked_quantity: number;
  lot_number: string | null;
  expiry_date: string | null;
  bin_location: string | null;
  zone: string | null;
  picked: boolean;
  picked_at: string | null;
  notes: string | null;
  items?: {
    code: string;
    name: string;
  } | null;
}

export interface PickingOrder {
  id: string;
  picking_number: string;
  source_document_id: string | null;
  source_document_type: string;
  location_id: string | null;
  partner_id: string | null;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  picker_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  locations?: { name: string } | null;
  partners?: { name: string } | null;
  employees?: { first_name: string; last_name: string } | null;
  warehouse_documents?: { document_number: string } | null;
  lines?: PickingOrderLine[];
}

export function usePickingOrders(status?: string) {
  return useQuery({
    queryKey: ['picking-orders', status],
    queryFn: async () => {
      let query = supabase
        .from('picking_orders')
        .select(`
          *,
          locations(name),
          partners(name),
          employees:picker_id(first_name, last_name),
          warehouse_documents:source_document_id(document_number),
          lines:picking_order_lines(
            *,
            items(code, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as PickingOrder[];
    }
  });
}

export function usePickingOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['picking-order', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('picking_orders')
        .select(`
          *,
          locations(name),
          partners(name),
          employees:picker_id(first_name, last_name),
          warehouse_documents:source_document_id(document_number),
          lines:picking_order_lines(
            *,
            items(code, name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as PickingOrder;
    },
    enabled: !!id
  });
}

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

export function useCreatePickingFromIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (issueDocumentId: string) => {
      // Get the issue document with lines
      const { data: issueDoc, error: issueError } = await supabase
        .from('warehouse_documents')
        .select(`
          *,
          lines:warehouse_document_lines(
            *,
            items(code, name)
          )
        `)
        .eq('id', issueDocumentId)
        .single();

      if (issueError) throw issueError;
      if (!issueDoc) throw new Error('Issue document not found');
      if (issueDoc.document_type !== 'goods_issue') {
        throw new Error('Document is not a goods issue');
      }

      const pickingNumber = await generatePickingNumber();

      // Create picking order
      const { data: pickingOrder, error: pickingError } = await supabase
        .from('picking_orders')
        .insert({
          picking_number: pickingNumber,
          source_document_id: issueDocumentId,
          source_document_type: 'goods_issue',
          location_id: issueDoc.location_id,
          partner_id: issueDoc.partner_id,
          status: 'open',
          notes: `Picking za izdatnicu ${issueDoc.document_number}`
        })
        .select()
        .single();

      if (pickingError) throw pickingError;

      // Create picking order lines from issue lines
      const pickingLines = (issueDoc.lines || []).map((line: any) => {
        // Parse WMS meta from notes if available
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
        
        if (linesError) throw linesError;
      }

      return pickingOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picking-orders'] });
      toast.success('Picking nalog kreiran');
    },
    onError: (error: Error) => {
      toast.error(`Greška: ${error.message}`);
    }
  });
}

export function useAssignPicker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pickingOrderId, pickerId }: { pickingOrderId: string; pickerId: string | null }) => {
      const updateData: any = {
        picker_id: pickerId
      };

      if (pickerId) {
        updateData.status = 'in_progress';
        updateData.started_at = new Date().toISOString();
      } else {
        updateData.status = 'open';
        updateData.started_at = null;
      }

      const { error } = await supabase
        .from('picking_orders')
        .update(updateData)
        .eq('id', pickingOrderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picking-orders'] });
      queryClient.invalidateQueries({ queryKey: ['picking-order'] });
    }
  });
}

export function useUpdatePickingLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      lineId, 
      pickedQuantity, 
      picked 
    }: { 
      lineId: string; 
      pickedQuantity: number;
      picked: boolean;
    }) => {
      const { error } = await supabase
        .from('picking_order_lines')
        .update({
          picked_quantity: pickedQuantity,
          picked: picked,
          picked_at: picked ? new Date().toISOString() : null
        })
        .eq('id', lineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picking-orders'] });
      queryClient.invalidateQueries({ queryKey: ['picking-order'] });
    }
  });
}

export function useCompletePickingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pickingOrderId: string) => {
      // Check if all lines are picked
      const { data: lines, error: linesError } = await supabase
        .from('picking_order_lines')
        .select('id, picked, required_quantity, picked_quantity')
        .eq('picking_order_id', pickingOrderId);

      if (linesError) throw linesError;

      const allPicked = lines?.every(line => line.picked && line.picked_quantity >= line.required_quantity);
      if (!allPicked) {
        throw new Error('Sve stavke moraju biti pokupljene prije završetka');
      }

      const { error } = await supabase
        .from('picking_orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', pickingOrderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['picking-orders'] });
      toast.success('Picking nalog završen');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}
