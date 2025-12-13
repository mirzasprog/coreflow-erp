import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface PLData {
  revenues: { code: string; name: string; amount: number }[];
  expenses: { code: string; name: string; amount: number }[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

function useProfitLoss(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ["profit-loss", dateFrom, dateTo],
    queryFn: async (): Promise<PLData> => {
      // Get all GL entry lines with accounts for the period
      const { data: lines, error } = await supabase
        .from("gl_entry_lines")
        .select(`
          debit,
          credit,
          accounts!inner(id, code, name, account_type),
          gl_entries!inner(entry_date, status)
        `)
        .eq("gl_entries.status", "posted")
        .gte("gl_entries.entry_date", dateFrom)
        .lte("gl_entries.entry_date", dateTo);

      if (error) throw error;

      // Group by account and calculate net amounts
      const accountTotals = new Map<string, { code: string; name: string; type: string; net: number }>();

      (lines || []).forEach((line: any) => {
        const account = line.accounts;
        const key = account.id;
        const current = accountTotals.get(key) || {
          code: account.code,
          name: account.name,
          type: account.account_type || "",
          net: 0,
        };

        // For revenue accounts: credits increase, debits decrease
        // For expense accounts: debits increase, credits decrease
        if (account.account_type === "revenue") {
          current.net += (line.credit || 0) - (line.debit || 0);
        } else if (account.account_type === "expense") {
          current.net += (line.debit || 0) - (line.credit || 0);
        }

        accountTotals.set(key, current);
      });

      // Separate into revenues and expenses
      const revenues: { code: string; name: string; amount: number }[] = [];
      const expenses: { code: string; name: string; amount: number }[] = [];

      accountTotals.forEach((account) => {
        if (account.type === "revenue" && account.net !== 0) {
          revenues.push({ code: account.code, name: account.name, amount: account.net });
        } else if (account.type === "expense" && account.net !== 0) {
          expenses.push({ code: account.code, name: account.name, amount: account.net });
        }
      });

      // Sort by code
      revenues.sort((a, b) => a.code.localeCompare(b.code));
      expenses.sort((a, b) => a.code.localeCompare(b.code));

      const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalRevenue - totalExpenses;

      return { revenues, expenses, totalRevenue, totalExpenses, netProfit };
    },
    enabled: !!dateFrom && !!dateTo,
  });
}

export function ProfitLossWidget() {
  const today = new Date();
  const defaultFrom = format(startOfMonth(today), "yyyy-MM-dd");
  const defaultTo = format(endOfMonth(today), "yyyy-MM-dd");

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  const { data, isLoading } = useProfitLoss(dateFrom, dateTo);

  const profitMargin =
    data && data.totalRevenue > 0
      ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="module-card">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Profit & Loss</h3>
          <p className="text-sm text-muted-foreground">Bilans uspjeha • Income Statement</p>
        </div>
        <div className="flex gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-32 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-32 text-xs"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data || (data.revenues.length === 0 && data.expenses.length === 0) ? (
        <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
          <DollarSign className="mb-2 h-12 w-12" />
          <p>No P&L data for this period</p>
          <p className="text-sm">Post GL entries with revenue/expense accounts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-success/10 p-3">
              <div className="flex items-center gap-2 text-success">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xs font-medium">Revenue</span>
              </div>
              <p className="mt-1 text-lg font-bold">{data.totalRevenue.toFixed(2)} KM</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3">
              <div className="flex items-center gap-2 text-destructive">
                <ArrowDownRight className="h-4 w-4" />
                <span className="text-xs font-medium">Expenses</span>
              </div>
              <p className="mt-1 text-lg font-bold">{data.totalExpenses.toFixed(2)} KM</p>
            </div>
            <div
              className={`rounded-lg p-3 ${
                data.netProfit >= 0 ? "bg-success/10" : "bg-destructive/10"
              }`}
            >
              <div
                className={`flex items-center gap-2 ${
                  data.netProfit >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {data.netProfit >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-xs font-medium">Net {data.netProfit >= 0 ? "Profit" : "Loss"}</span>
              </div>
              <p className="mt-1 text-lg font-bold">{data.netProfit.toFixed(2)} KM</p>
              <p className="text-xs text-muted-foreground">{profitMargin}% margin</p>
            </div>
          </div>

          {/* Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Revenues */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-success">
                <TrendingUp className="h-4 w-4" />
                Revenues (Prihodi)
              </h4>
              {data.revenues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No revenue entries</p>
              ) : (
                <div className="space-y-1">
                  {data.revenues.map((r) => (
                    <div
                      key={r.code}
                      className="flex items-center justify-between rounded bg-muted/50 px-2 py-1 text-sm"
                    >
                      <span className="truncate" title={r.name}>
                        <span className="font-mono text-xs text-muted-foreground">{r.code}</span>{" "}
                        {r.name}
                      </span>
                      <span className="font-medium text-success">{r.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t pt-1 text-sm font-medium">
                    <span>Total Revenue</span>
                    <span className="text-success">{data.totalRevenue.toFixed(2)} KM</span>
                  </div>
                </div>
              )}
            </div>

            {/* Expenses */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
                <TrendingDown className="h-4 w-4" />
                Expenses (Rashodi)
              </h4>
              {data.expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expense entries</p>
              ) : (
                <div className="space-y-1">
                  {data.expenses.map((e) => (
                    <div
                      key={e.code}
                      className="flex items-center justify-between rounded bg-muted/50 px-2 py-1 text-sm"
                    >
                      <span className="truncate" title={e.name}>
                        <span className="font-mono text-xs text-muted-foreground">{e.code}</span>{" "}
                        {e.name}
                      </span>
                      <span className="font-medium text-destructive">{e.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t pt-1 text-sm font-medium">
                    <span>Total Expenses</span>
                    <span className="text-destructive">{data.totalExpenses.toFixed(2)} KM</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
