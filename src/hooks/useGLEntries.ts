import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GLEntry {
  id: string;
  entry_date: string;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  document_number: string | null;
  reversed_entry_id: string | null;
  status: 'draft' | 'posted' | 'cancelled';
  created_at: string;
  total_debit?: number;
  total_credit?: number;
}

export interface GLEntryLine {
  id?: string;
  entry_id?: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  partner_id: string | null;
  accounts?: { code: string; name: string } | null;
  partners?: { name: string } | null;
}

export interface GLEntryFilters {
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  partnerId?: string;
  referenceType?: string;
  status?: string;
}

export function useGLEntries(filters?: GLEntryFilters) {
  return useQuery({
    queryKey: ['gl-entries', filters],
    queryFn: async () => {
      let query = supabase
        .from('gl_entries')
        .select(`
          *,
          gl_entry_lines(debit, credit, account_id, partner_id)
        `)
        .order('entry_date', { ascending: false });
      
      if (filters?.dateFrom) {
        query = query.gte('entry_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('entry_date', filters.dateTo);
      }
      if (filters?.referenceType) {
        query = query.eq('reference_type', filters.referenceType);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status as 'draft' | 'posted' | 'cancelled');
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      let entries = (data || []).map(entry => ({
        ...entry,
        total_debit: (entry.gl_entry_lines || []).reduce((sum: number, line: any) => sum + (line.debit || 0), 0),
        total_credit: (entry.gl_entry_lines || []).reduce((sum: number, line: any) => sum + (line.credit || 0), 0)
      }));

      // Client-side filter for account and partner (requires checking lines)
      if (filters?.accountId) {
        entries = entries.filter(entry => 
          entry.gl_entry_lines?.some((line: any) => line.account_id === filters.accountId)
        );
      }
      if (filters?.partnerId) {
        entries = entries.filter(entry => 
          entry.gl_entry_lines?.some((line: any) => line.partner_id === filters.partnerId)
        );
      }

      return entries as GLEntry[];
    }
  });
}

export function useGLEntry(id: string | undefined) {
  return useQuery({
    queryKey: ['gl-entry', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data: entry, error: entryError } = await supabase
        .from('gl_entries')
        .select('*')
        .eq('id', id)
        .single();
      
      if (entryError) throw entryError;

      const { data: lines, error: linesError } = await supabase
        .from('gl_entry_lines')
        .select(`
          *,
          accounts:account_id(code, name),
          partners:partner_id(name)
        `)
        .eq('entry_id', id);
      
      if (linesError) throw linesError;

      const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

      return { ...entry, lines: lines as GLEntryLine[], total_debit: totalDebit, total_credit: totalCredit };
    },
    enabled: !!id
  });
}

export function useCreateGLEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ entry, lines }: { entry: Record<string, unknown>; lines: GLEntryLine[] }) => {
      const { data: newEntry, error: entryError } = await supabase
        .from('gl_entries')
        .insert(entry as any)
        .select()
        .single();
      
      if (entryError) throw entryError;

      if (lines.length > 0) {
        const linesWithEntryId = lines.map(line => ({
          entry_id: newEntry.id,
          account_id: line.account_id,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description,
          partner_id: line.partner_id
        }));
        
        const { error: linesError } = await supabase
          .from('gl_entry_lines')
          .insert(linesWithEntryId);
        
        if (linesError) throw linesError;
      }

      return newEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      toast.success('GL Entry created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create GL entry: ${error.message}`);
    }
  });
}

export function useUpdateGLEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, entry, lines }: { id: string; entry: Record<string, unknown>; lines: GLEntryLine[] }) => {
      const { error: entryError } = await supabase
        .from('gl_entries')
        .update(entry)
        .eq('id', id);
      
      if (entryError) throw entryError;

      await supabase
        .from('gl_entry_lines')
        .delete()
        .eq('entry_id', id);

      if (lines.length > 0) {
        const linesWithEntryId = lines.map(line => ({
          entry_id: id,
          account_id: line.account_id,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description,
          partner_id: line.partner_id
        }));
        
        const { error: linesError } = await supabase
          .from('gl_entry_lines')
          .insert(linesWithEntryId);
        
        if (linesError) throw linesError;
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      queryClient.invalidateQueries({ queryKey: ['gl-entry'] });
      toast.success('GL Entry updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update GL entry: ${error.message}`);
    }
  });
}

async function generateDocumentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  
  // Get the last document number for this year
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

export function usePostGLEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Validate that debits equal credits
      const { data: lines } = await supabase
        .from('gl_entry_lines')
        .select('debit, credit')
        .eq('entry_id', id);
      
      const totalDebit = (lines || []).reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = (lines || []).reduce((sum, line) => sum + (line.credit || 0), 0);
      
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error('Debits and credits must be equal');
      }

      // Generate document number
      const documentNumber = await generateDocumentNumber();

      const { error } = await supabase
        .from('gl_entries')
        .update({ 
          status: 'posted',
          document_number: documentNumber
        })
        .eq('id', id);
      
      if (error) throw error;
      return { id, documentNumber };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      queryClient.invalidateQueries({ queryKey: ['gl-entry'] });
      toast.success(`GL Entry posted successfully (${data.documentNumber})`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to post GL entry: ${error.message}`);
    }
  });
}

export function useReverseGLEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Get the original entry with lines
      const { data: originalEntry, error: entryError } = await supabase
        .from('gl_entries')
        .select('*')
        .eq('id', id)
        .single();
      
      if (entryError) throw entryError;
      if (originalEntry.status !== 'posted') {
        throw new Error('Only posted entries can be reversed');
      }

      const { data: originalLines, error: linesError } = await supabase
        .from('gl_entry_lines')
        .select('*')
        .eq('entry_id', id);
      
      if (linesError) throw linesError;

      // Generate document number for reversal
      const documentNumber = await generateDocumentNumber();

      // Create reverse entry
      const { data: reversedEntry, error: createError } = await supabase
        .from('gl_entries')
        .insert({
          entry_date: new Date().toISOString().split('T')[0],
          description: `Storno: ${originalEntry.description || originalEntry.document_number}`,
          reference_type: originalEntry.reference_type,
          reference_id: originalEntry.reference_id,
          reversed_entry_id: id,
          status: 'posted',
          document_number: documentNumber
        })
        .select()
        .single();
      
      if (createError) throw createError;

      // Create reversed lines (swap debit and credit)
      const reversedLines = originalLines.map(line => ({
        entry_id: reversedEntry.id,
        account_id: line.account_id,
        debit: line.credit || 0,
        credit: line.debit || 0,
        description: line.description,
        partner_id: line.partner_id
      }));

      const { error: linesInsertError } = await supabase
        .from('gl_entry_lines')
        .insert(reversedLines);
      
      if (linesInsertError) throw linesInsertError;

      // Mark original as cancelled
      await supabase
        .from('gl_entries')
        .update({ status: 'cancelled' })
        .eq('id', id);

      return { originalId: id, reversedId: reversedEntry.id, documentNumber };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      queryClient.invalidateQueries({ queryKey: ['gl-entry'] });
      toast.success(`Entry reversed successfully (${data.documentNumber})`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reverse GL entry: ${error.message}`);
    }
  });
}

export function useCancelGLEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gl_entries')
        .update({ status: 'cancelled' })
        .eq('id', id);
      
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      queryClient.invalidateQueries({ queryKey: ['gl-entry'] });
      toast.success('GL Entry cancelled successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel GL entry: ${error.message}`);
    }
  });
}

export function useDeleteGLEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First delete lines
      await supabase
        .from('gl_entry_lines')
        .delete()
        .eq('entry_id', id);

      const { error } = await supabase
        .from('gl_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      toast.success('GL Entry deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete GL entry: ${error.message}`);
    }
  });
}

export function exportGLEntriesToCSV(entries: GLEntry[]): void {
  const headers = ['Document Number', 'Date', 'Description', 'Type', 'Status', 'Debit', 'Credit'];
  const rows = entries.map(entry => [
    entry.document_number || '-',
    entry.entry_date,
    entry.description || '',
    entry.reference_type || '',
    entry.status,
    (entry.total_debit || 0).toFixed(2),
    (entry.total_credit || 0).toFixed(2)
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gl-entries-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
