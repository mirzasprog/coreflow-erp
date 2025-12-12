import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GLEntry {
  id: string;
  entry_date: string;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
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

export function useGLEntries() {
  return useQuery({
    queryKey: ['gl-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gl_entries')
        .select(`
          *,
          gl_entry_lines(debit, credit)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(entry => ({
        ...entry,
        total_debit: (entry.gl_entry_lines || []).reduce((sum: number, line: any) => sum + (line.debit || 0), 0),
        total_credit: (entry.gl_entry_lines || []).reduce((sum: number, line: any) => sum + (line.credit || 0), 0)
      })) as GLEntry[];
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

      const { error } = await supabase
        .from('gl_entries')
        .update({ status: 'posted' })
        .eq('id', id);
      
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-entries'] });
      queryClient.invalidateQueries({ queryKey: ['gl-entry'] });
      toast.success('GL Entry posted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to post GL entry: ${error.message}`);
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
