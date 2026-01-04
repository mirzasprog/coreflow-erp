import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BankStatement {
  id: string;
  statement_date: string;
  bank_name: string;
  account_number: string | null;
  opening_balance: number;
  closing_balance: number;
  currency: string;
  imported_at: string;
  notes: string | null;
  lines?: BankStatementLine[];
}

export interface BankStatementLine {
  id: string;
  statement_id: string;
  transaction_date: string;
  value_date: string | null;
  description: string | null;
  reference: string | null;
  amount: number;
  transaction_type: string | null;
  partner_name: string | null;
  partner_account: string | null;
  matched: boolean;
  matched_invoice_id: string | null;
  matched_at: string | null;
  notes: string | null;
  invoices?: {
    id: string;
    invoice_number: string;
    total: number;
    paid_amount: number;
  } | null;
}

export interface MatchSuggestion {
  lineId: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: number;
  remainingAmount: number;
  matchScore: number;
  matchReason: string;
}

export function useBankStatements() {
  return useQuery({
    queryKey: ['bank-statements'],
    queryFn: async (): Promise<BankStatement[]> => {
      const { data, error } = await supabase
        .from('bank_statements')
        .select('*')
        .order('statement_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useBankStatement(id: string | undefined) {
  return useQuery({
    queryKey: ['bank-statement', id],
    queryFn: async (): Promise<BankStatement | null> => {
      if (!id) return null;

      const { data: statement, error: stmtError } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (stmtError) throw stmtError;
      if (!statement) return null;

      const { data: lines, error: linesError } = await supabase
        .from('bank_statement_lines')
        .select(`
          *,
          invoices (id, invoice_number, total, paid_amount)
        `)
        .eq('statement_id', id)
        .order('transaction_date', { ascending: true });

      if (linesError) throw linesError;

      return {
        ...statement,
        lines: lines || [],
      };
    },
    enabled: !!id,
  });
}

export function useImportBankStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      bank_name: string;
      account_number?: string;
      statement_date: string;
      opening_balance: number;
      closing_balance: number;
      lines: Array<{
        transaction_date: string;
        value_date?: string;
        description?: string;
        reference?: string;
        amount: number;
        transaction_type?: string;
        partner_name?: string;
        partner_account?: string;
      }>;
    }) => {
      // Create statement
      const { data: statement, error: stmtError } = await supabase
        .from('bank_statements')
        .insert({
          bank_name: data.bank_name,
          account_number: data.account_number,
          statement_date: data.statement_date,
          opening_balance: data.opening_balance,
          closing_balance: data.closing_balance,
        })
        .select()
        .single();

      if (stmtError) throw stmtError;

      // Create lines
      if (data.lines.length > 0) {
        const linesToInsert = data.lines.map(line => ({
          statement_id: statement.id,
          ...line,
        }));

        const { error: linesError } = await supabase
          .from('bank_statement_lines')
          .insert(linesToInsert);

        if (linesError) throw linesError;
      }

      return statement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statements'] });
      toast.success('Bankovni izvod uspješno importiran');
    },
    onError: (error) => {
      toast.error('Greška pri importu: ' + error.message);
    },
  });
}

export function useAutoMatchSuggestions(statementId: string | undefined) {
  return useQuery({
    queryKey: ['match-suggestions', statementId],
    queryFn: async (): Promise<MatchSuggestion[]> => {
      if (!statementId) return [];

      // Get unmatched lines
      const { data: lines, error: linesError } = await supabase
        .from('bank_statement_lines')
        .select('*')
        .eq('statement_id', statementId)
        .eq('matched', false);

      if (linesError) throw linesError;
      if (!lines || lines.length === 0) return [];

      // Get unpaid invoices
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, paid_amount, invoice_type, partners(name)')
        .neq('status', 'cancelled');

      if (invError) throw invError;

      const suggestions: MatchSuggestion[] = [];

      for (const line of lines) {
        const isCredit = line.amount > 0;
        const absAmount = Math.abs(line.amount);

        // Filter invoices by type (credits match outgoing, debits match incoming)
        const relevantInvoices = invoices?.filter(inv => {
          const remaining = (inv.total || 0) - (inv.paid_amount || 0);
          if (remaining <= 0) return false;
          return isCredit ? inv.invoice_type === 'outgoing' : inv.invoice_type === 'incoming';
        }) || [];

        for (const invoice of relevantInvoices) {
          const remaining = (invoice.total || 0) - (invoice.paid_amount || 0);
          let matchScore = 0;
          let matchReason = '';

          // Exact amount match
          if (Math.abs(absAmount - remaining) < 0.01) {
            matchScore = 100;
            matchReason = 'Točan iznos';
          } else if (Math.abs(absAmount - remaining) < remaining * 0.05) {
            // Within 5%
            matchScore = 80;
            matchReason = 'Približan iznos (±5%)';
          }

          // Check for invoice number in description/reference
          if (line.description?.includes(invoice.invoice_number) || 
              line.reference?.includes(invoice.invoice_number)) {
            matchScore += 50;
            matchReason += (matchReason ? ' + ' : '') + 'Broj fakture u opisu';
          }

          // Check partner name
          const partnerName = (invoice as any).partners?.name?.toLowerCase() || '';
          if (partnerName && line.partner_name?.toLowerCase().includes(partnerName)) {
            matchScore += 30;
            matchReason += (matchReason ? ' + ' : '') + 'Partner se poklapa';
          }

          if (matchScore >= 50) {
            suggestions.push({
              lineId: line.id,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoice_number,
              invoiceTotal: invoice.total || 0,
              remainingAmount: remaining,
              matchScore,
              matchReason,
            });
          }
        }
      }

      // Sort by score descending
      return suggestions.sort((a, b) => b.matchScore - a.matchScore);
    },
    enabled: !!statementId,
  });
}

export function useMatchTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lineId, invoiceId }: { lineId: string; invoiceId: string }) => {
      // Get line amount
      const { data: line, error: lineError } = await supabase
        .from('bank_statement_lines')
        .select('amount, statement_id')
        .eq('id', lineId)
        .single();

      if (lineError) throw lineError;

      // Update line as matched
      const { error: updateError } = await supabase
        .from('bank_statement_lines')
        .update({
          matched: true,
          matched_invoice_id: invoiceId,
          matched_at: new Date().toISOString(),
        })
        .eq('id', lineId);

      if (updateError) throw updateError;

      // Update invoice paid_amount
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select('paid_amount')
        .eq('id', invoiceId)
        .single();

      if (invError) throw invError;

      const newPaidAmount = (invoice.paid_amount || 0) + Math.abs(line.amount);

      const { error: payError } = await supabase
        .from('invoices')
        .update({ paid_amount: newPaidAmount })
        .eq('id', invoiceId);

      if (payError) throw payError;

      return { lineId, invoiceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement'] });
      queryClient.invalidateQueries({ queryKey: ['match-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Transakcija uspješno sparena');
    },
    onError: (error) => {
      toast.error('Greška pri sparivanju: ' + error.message);
    },
  });
}

export function useUnmatchTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineId: string) => {
      // Get line details first
      const { data: line, error: lineError } = await supabase
        .from('bank_statement_lines')
        .select('amount, matched_invoice_id, statement_id')
        .eq('id', lineId)
        .single();

      if (lineError) throw lineError;
      if (!line.matched_invoice_id) throw new Error('Transakcija nije sparena');

      // Revert invoice payment
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select('paid_amount')
        .eq('id', line.matched_invoice_id)
        .single();

      if (invError) throw invError;

      const newPaidAmount = Math.max(0, (invoice.paid_amount || 0) - Math.abs(line.amount));

      await supabase
        .from('invoices')
        .update({ paid_amount: newPaidAmount })
        .eq('id', line.matched_invoice_id);

      // Unmatch line
      const { error: updateError } = await supabase
        .from('bank_statement_lines')
        .update({
          matched: false,
          matched_invoice_id: null,
          matched_at: null,
        })
        .eq('id', lineId);

      if (updateError) throw updateError;

      return lineId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement'] });
      queryClient.invalidateQueries({ queryKey: ['match-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Sparivanje poništeno');
    },
    onError: (error) => {
      toast.error('Greška: ' + error.message);
    },
  });
}
