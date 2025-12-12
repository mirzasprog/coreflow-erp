import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type InvoiceType = 'outgoing' | 'incoming';

export interface Invoice {
  id: string;
  invoice_type: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  partner_id: string | null;
  status: 'draft' | 'posted' | 'cancelled';
  subtotal: number;
  vat_amount: number;
  total: number;
  paid_amount: number;
  notes: string | null;
  warehouse_document_id: string | null;
  created_at: string;
  partners?: { name: string; code: string } | null;
  warehouse_documents?: { document_number: string } | null;
}

export interface InvoiceLine {
  id?: string;
  invoice_id?: string;
  item_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  vat_rate_id: string | null;
  vat_amount: number;
  total: number;
  items?: { code: string; name: string } | null;
  vat_rates?: { code: string; rate: number } | null;
}

export function useInvoices(invoiceType: InvoiceType) {
  return useQuery({
    queryKey: ['invoices', invoiceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          partners(name, code),
          warehouse_documents(document_number)
        `)
        .eq('invoice_type', invoiceType)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as Invoice[];
    }
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          partners(name, code),
          warehouse_documents(document_number)
        `)
        .eq('id', id)
        .single();
      
      if (invoiceError) throw invoiceError;

      const { data: lines, error: linesError } = await supabase
        .from('invoice_lines')
        .select(`
          *,
          items:item_id(code, name),
          vat_rates:vat_rate_id(code, rate)
        `)
        .eq('invoice_id', id);
      
      if (linesError) throw linesError;

      return { ...invoice, lines: lines as InvoiceLine[] };
    },
    enabled: !!id
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ invoice, lines }: { invoice: Record<string, unknown>; lines: InvoiceLine[] }) => {
      const { data: inv, error: invError } = await supabase
        .from('invoices')
        .insert(invoice as any)
        .select()
        .single();
      
      if (invError) throw invError;

      if (lines.length > 0) {
        const linesWithInvId = lines.map(line => ({
          invoice_id: inv.id,
          item_id: line.item_id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          vat_rate_id: line.vat_rate_id,
          vat_amount: line.vat_amount,
          total: line.total
        }));
        
        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(linesWithInvId);
        
        if (linesError) throw linesError;
      }

      return inv;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.invoice.invoice_type] });
      toast.success('Invoice created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    }
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, invoice, lines }: { id: string; invoice: Record<string, unknown>; lines: InvoiceLine[] }) => {
      const { error: invError } = await supabase
        .from('invoices')
        .update(invoice)
        .eq('id', id);
      
      if (invError) throw invError;

      await supabase
        .from('invoice_lines')
        .delete()
        .eq('invoice_id', id);

      if (lines.length > 0) {
        const linesWithInvId = lines.map(line => ({
          invoice_id: id,
          item_id: line.item_id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          vat_rate_id: line.vat_rate_id,
          vat_amount: line.vat_amount,
          total: line.total
        }));
        
        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(linesWithInvId);
        
        if (linesError) throw linesError;
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast.success('Invoice updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update invoice: ${error.message}`);
    }
  });
}

export function usePostInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'posted', posted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast.success('Invoice posted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to post invoice: ${error.message}`);
    }
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', id);
      
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast.success('Invoice cancelled successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel invoice: ${error.message}`);
    }
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete invoice: ${error.message}`);
    }
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('paid_amount, total')
        .eq('id', id)
        .single();
      
      if (!invoice) throw new Error('Invoice not found');
      
      const newPaidAmount = (invoice.paid_amount || 0) + amount;
      
      const { error } = await supabase
        .from('invoices')
        .update({ paid_amount: newPaidAmount })
        .eq('id', id);
      
      if (error) throw error;
      return { id, newPaidAmount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    }
  });
}
