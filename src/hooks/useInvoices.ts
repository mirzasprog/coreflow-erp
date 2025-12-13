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
  ACCOUNTS_RECEIVABLE: '1200', // Potraživanja od kupaca
  ACCOUNTS_PAYABLE: '2200',    // Obveze prema dobavljačima
  SALES_REVENUE: '7000',       // Prihodi od prodaje
  PURCHASE_EXPENSE: '4000',    // Troškovi nabave
  VAT_OUTPUT: '2400',          // PDV - izlazni
  VAT_INPUT: '1400',           // PDV - ulazni (pretporez)
};

export function usePostInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Get invoice with lines
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select(`
          *,
          partners(id, name),
          invoice_lines(*)
        `)
        .eq('id', id)
        .single();
      
      if (invError) throw invError;
      if (!invoice) throw new Error('Invoice not found');

      // Get matching accounts from chart of accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, code, name')
        .eq('active', true);
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in chart of accounts. Please set up accounts first.');
      }

      // Find accounts by code prefix
      const findAccount = (codePrefix: string) => {
        return accounts.find(a => a.code.startsWith(codePrefix));
      };

      const isOutgoing = invoice.invoice_type === 'outgoing';
      
      // Determine accounts based on invoice type
      const receivableAccount = findAccount(GL_ACCOUNTS.ACCOUNTS_RECEIVABLE);
      const payableAccount = findAccount(GL_ACCOUNTS.ACCOUNTS_PAYABLE);
      const revenueAccount = findAccount(GL_ACCOUNTS.SALES_REVENUE);
      const expenseAccount = findAccount(GL_ACCOUNTS.PURCHASE_EXPENSE);
      const vatOutputAccount = findAccount(GL_ACCOUNTS.VAT_OUTPUT);
      const vatInputAccount = findAccount(GL_ACCOUNTS.VAT_INPUT);

      // For outgoing (sales): Debit Receivable, Credit Revenue + VAT Output
      // For incoming (purchase): Debit Expense + VAT Input, Credit Payable
      const glLines: Array<{
        account_id: string;
        debit: number;
        credit: number;
        description: string | null;
        partner_id: string | null;
      }> = [];

      const partnerId = invoice.partner_id;
      const subtotal = invoice.subtotal || 0;
      const vatAmount = invoice.vat_amount || 0;
      const total = invoice.total || 0;

      if (isOutgoing) {
        // Sales invoice
        if (!receivableAccount) {
          console.warn('Accounts receivable account not found, using first available account');
        }
        if (!revenueAccount) {
          console.warn('Sales revenue account not found, using first available account');
        }
        
        const arAccount = receivableAccount || accounts[0];
        const revAccount = revenueAccount || accounts[0];
        const vatOutAccount = vatOutputAccount || accounts[0];

        // Debit: Accounts Receivable (total)
        glLines.push({
          account_id: arAccount.id,
          debit: total,
          credit: 0,
          description: `Invoice ${invoice.invoice_number} - Receivable`,
          partner_id: partnerId
        });

        // Credit: Sales Revenue (subtotal)
        if (subtotal > 0) {
          glLines.push({
            account_id: revAccount.id,
            debit: 0,
            credit: subtotal,
            description: `Invoice ${invoice.invoice_number} - Revenue`,
            partner_id: partnerId
          });
        }

        // Credit: VAT Output (vat amount)
        if (vatAmount > 0) {
          glLines.push({
            account_id: vatOutAccount.id,
            debit: 0,
            credit: vatAmount,
            description: `Invoice ${invoice.invoice_number} - VAT`,
            partner_id: partnerId
          });
        }
      } else {
        // Purchase invoice
        const apAccount = payableAccount || accounts[0];
        const expAccount = expenseAccount || accounts[0];
        const vatInAccount = vatInputAccount || accounts[0];

        // Debit: Expense (subtotal)
        if (subtotal > 0) {
          glLines.push({
            account_id: expAccount.id,
            debit: subtotal,
            credit: 0,
            description: `Invoice ${invoice.invoice_number} - Expense`,
            partner_id: partnerId
          });
        }

        // Debit: VAT Input (vat amount)
        if (vatAmount > 0) {
          glLines.push({
            account_id: vatInAccount.id,
            debit: vatAmount,
            credit: 0,
            description: `Invoice ${invoice.invoice_number} - Input VAT`,
            partner_id: partnerId
          });
        }

        // Credit: Accounts Payable (total)
        glLines.push({
          account_id: apAccount.id,
          debit: 0,
          credit: total,
          description: `Invoice ${invoice.invoice_number} - Payable`,
          partner_id: partnerId
        });
      }

      // Generate document number
      const documentNumber = await generateGLDocumentNumber();

      // Create GL entry
      const { data: glEntry, error: glError } = await supabase
        .from('gl_entries')
        .insert({
          entry_date: invoice.invoice_date,
          description: `${isOutgoing ? 'Sales' : 'Purchase'} Invoice: ${invoice.invoice_number}`,
          reference_type: 'invoice',
          reference_id: id,
          status: 'posted',
          document_number: documentNumber
        })
        .select()
        .single();
      
      if (glError) {
        console.error('Failed to create GL entry:', glError);
        throw new Error(`Failed to create GL entry: ${glError.message}`);
      }

      // Create GL entry lines
      if (glLines.length > 0) {
        const linesWithEntryId = glLines.map(line => ({
          entry_id: glEntry.id,
          account_id: line.account_id,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
          partner_id: line.partner_id
        }));

        const { error: linesError } = await supabase
          .from('gl_entry_lines')
          .insert(linesWithEntryId);
        
        if (linesError) {
          console.error('Failed to create GL entry lines:', linesError);
          // Rollback GL entry if lines fail
          await supabase.from('gl_entries').delete().eq('id', glEntry.id);
          throw new Error(`Failed to create GL entry lines: ${linesError.message}`);
        }
      }

      // Update invoice status
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'posted', posted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      return { id, glEntryId: glEntry.id, documentNumber };
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
