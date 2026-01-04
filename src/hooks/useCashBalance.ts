import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CashBalanceData {
  cashBalance: number;
  previousMonthBalance: number;
  monthlyProfit: number;
  previousMonthProfit: number;
  cashChangePercent: number;
  profitChangePercent: number;
}

export function useCashBalance() {
  return useQuery({
    queryKey: ['finance', 'cash-balance'],
    queryFn: async (): Promise<CashBalanceData> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get GL entries for cash accounts (accounts starting with 1 - assets, 10/11 typically cash)
      const { data: cashAccounts } = await supabase
        .from('accounts')
        .select('id, code')
        .or('code.like.10%,code.like.11%,code.like.1000%,code.like.1100%');

      const cashAccountIds = cashAccounts?.map(a => a.id) || [];

      // Calculate current cash balance from GL entries
      let cashBalance = 0;
      if (cashAccountIds.length > 0) {
        const { data: glLines } = await supabase
          .from('gl_entry_lines')
          .select(`
            debit,
            credit,
            account_id,
            gl_entries!inner(status)
          `)
          .in('account_id', cashAccountIds)
          .eq('gl_entries.status', 'posted');

        glLines?.forEach((line: any) => {
          cashBalance += (line.debit || 0) - (line.credit || 0);
        });
      }

      // Get revenue accounts (7xxx) and expense accounts (4xxx, 5xxx, 6xxx)
      const { data: revenueAccounts } = await supabase
        .from('accounts')
        .select('id')
        .like('code', '7%');

      const { data: expenseAccounts } = await supabase
        .from('accounts')
        .select('id')
        .or('code.like.4%,code.like.5%,code.like.6%');

      const revenueIds = revenueAccounts?.map(a => a.id) || [];
      const expenseIds = expenseAccounts?.map(a => a.id) || [];

      // Calculate monthly profit from GL entries
      let monthlyRevenue = 0;
      let monthlyExpenses = 0;
      let prevMonthRevenue = 0;
      let prevMonthExpenses = 0;

      if (revenueIds.length > 0) {
        // Current month revenue
        const { data: currentRevenue } = await supabase
          .from('gl_entry_lines')
          .select(`
            credit,
            debit,
            gl_entries!inner(entry_date, status)
          `)
          .in('account_id', revenueIds)
          .eq('gl_entries.status', 'posted')
          .gte('gl_entries.entry_date', startOfMonth.toISOString().split('T')[0]);

        currentRevenue?.forEach((line: any) => {
          monthlyRevenue += (line.credit || 0) - (line.debit || 0);
        });

        // Previous month revenue
        const { data: prevRevenue } = await supabase
          .from('gl_entry_lines')
          .select(`
            credit,
            debit,
            gl_entries!inner(entry_date, status)
          `)
          .in('account_id', revenueIds)
          .eq('gl_entries.status', 'posted')
          .gte('gl_entries.entry_date', startOfPrevMonth.toISOString().split('T')[0])
          .lte('gl_entries.entry_date', endOfPrevMonth.toISOString().split('T')[0]);

        prevRevenue?.forEach((line: any) => {
          prevMonthRevenue += (line.credit || 0) - (line.debit || 0);
        });
      }

      if (expenseIds.length > 0) {
        // Current month expenses
        const { data: currentExpenses } = await supabase
          .from('gl_entry_lines')
          .select(`
            debit,
            credit,
            gl_entries!inner(entry_date, status)
          `)
          .in('account_id', expenseIds)
          .eq('gl_entries.status', 'posted')
          .gte('gl_entries.entry_date', startOfMonth.toISOString().split('T')[0]);

        currentExpenses?.forEach((line: any) => {
          monthlyExpenses += (line.debit || 0) - (line.credit || 0);
        });

        // Previous month expenses
        const { data: prevExpenses } = await supabase
          .from('gl_entry_lines')
          .select(`
            debit,
            credit,
            gl_entries!inner(entry_date, status)
          `)
          .in('account_id', expenseIds)
          .eq('gl_entries.status', 'posted')
          .gte('gl_entries.entry_date', startOfPrevMonth.toISOString().split('T')[0])
          .lte('gl_entries.entry_date', endOfPrevMonth.toISOString().split('T')[0]);

        prevExpenses?.forEach((line: any) => {
          prevMonthExpenses += (line.debit || 0) - (line.credit || 0);
        });
      }

      const monthlyProfit = monthlyRevenue - monthlyExpenses;
      const previousMonthProfit = prevMonthRevenue - prevMonthExpenses;

      // Calculate change percentages
      const profitChangePercent = previousMonthProfit !== 0 
        ? ((monthlyProfit - previousMonthProfit) / Math.abs(previousMonthProfit)) * 100 
        : 0;

      // For cash balance change, we'd need historical data - using a simplified approach
      // based on this month's profit contribution
      const cashChangePercent = cashBalance > 0 && monthlyProfit !== 0
        ? (monthlyProfit / cashBalance) * 100
        : 0;

      return {
        cashBalance,
        previousMonthBalance: cashBalance - monthlyProfit,
        monthlyProfit,
        previousMonthProfit,
        cashChangePercent,
        profitChangePercent,
      };
    },
  });
}
