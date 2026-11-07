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
  source_receipt_id: string | null;
  status: 'draft' | 'posted' | 'cancelled';
  subtotal: number;
  vat_amount: number;
  total: number;
  paid_amount: number;
  notes: string | null;
  warehouse_document_id: string | null;
  created_at: string;
  partners?: { name: string; code: string; tax_id?: string; address?: string; city?: string; postal_code?: string; country?: string } | null;
  warehouse_documents?: { document_number: string } | null;
  source_receipt?: { document_number: string; status: string; total_value: number } | null;
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
          partners(name, code, tax_id, address, city, postal_code, country),
          warehouse_documents:warehouse_document_id(document_number),
          source_receipt:source_receipt_id(document_number, status, total_value)
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
          partners(name, code, tax_id, address, city, postal_code, country),
          warehouse_documents:warehouse_document_id(document_number),
          source_receipt:source_receipt_id(document_number, status, total_value)
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
        .update(invoice as never)
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

// Standard account codes - these should match your chart of accounts
const GL_ACCOUNTS = {
  CASH: '1000',                // Gotovina / Cash
  BANK: '1020',                // Žiro račun / Bank account
  ACCOUNTS_RECEIVABLE: '1200', // Potraživanja od kupaca
  ACCOUNTS_PAYABLE: '2200',    // Obveze prema dobavljačima
  GRNI: '2210',                // Roba primljena nefakturisana / Goods Received Not Invoiced
  SALES_REVENUE: '7000',       // Prihodi od prodaje
  PURCHASE_EXPENSE: '4000',    // Troškovi nabave
  VAT_OUTPUT: '2400',          // PDV - izlazni
  VAT_INPUT: '1400',           // PDV - ulazni (pretporez)
};

export function usePostInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('erp_invoice_action', { p_id: id, p_action: 'post' });
      if (error) throw error;
      return data as { id: string; glEntryId: string; documentNumber: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      toast.success(`Invoice posted successfully. GL Entry ${data.documentNumber} created.`);
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
      const { data, error } = await supabase.rpc('erp_invoice_action', { p_id: id, p_action: 'cancel' });
      if (error) throw error;
      return data as { id: string };
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
    mutationFn: async ({ id, amount, requestId = crypto.randomUUID() }: { id: string; amount: number; requestId?: string }) => {
      const { data, error } = await supabase.rpc('erp_invoice_action', { p_id: id, p_action: 'payment', p_amount: amount, p_key: requestId });
      if (error) throw error;
      return data as { id: string; newPaidAmount: number; glEntryId: string; documentNumber: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'cash-balance'] });
      toast.success(`Payment recorded. GL Entry ${data.documentNumber} created.`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    }
  });
}
