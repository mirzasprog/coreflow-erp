import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Search,
  Loader2,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Scale,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";

interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string | null;
  total_debit: number;
  total_credit: number;
  balance: number;
}

function useAccountBalances(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ["account-balances", dateFrom, dateTo],
    queryFn: async () => {
      // First get all accounts
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("id, code, name, account_type")
        .eq("active", true)
        .order("code", { ascending: true });

      if (accountsError) throw accountsError;

      // Get GL entry lines with date filter
      let query = supabase
        .from("gl_entry_lines")
        .select(`
          account_id,
          debit,
          credit,
          gl_entries!inner(entry_date, status)
        `)
        .eq("gl_entries.status", "posted");

      if (dateFrom) {
        query = query.gte("gl_entries.entry_date", dateFrom);
      }
      if (dateTo) {
        query = query.lte("gl_entries.entry_date", dateTo);
      }

      const { data: lines, error: linesError } = await query;

      if (linesError) throw linesError;

      // Aggregate by account
      const balanceMap = new Map<string, { debit: number; credit: number }>();

      (lines || []).forEach((line) => {
        const current = balanceMap.get(line.account_id) || { debit: 0, credit: 0 };
        balanceMap.set(line.account_id, {
          debit: current.debit + (line.debit || 0),
          credit: current.credit + (line.credit || 0),
        });
      });

      // Build result with all accounts (even those with no entries)
      const result: AccountBalance[] = (accounts || []).map((account) => {
        const totals = balanceMap.get(account.id) || { debit: 0, credit: 0 };
        return {
          account_id: account.id,
          account_code: account.code,
          account_name: account.name,
          account_type: account.account_type,
          total_debit: totals.debit,
          total_credit: totals.credit,
          balance: totals.debit - totals.credit,
        };
      });

      return result;
    },
  });
}

export default function AccountBalanceReport() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: balances = [], isLoading } = useAccountBalances(
    dateFrom || undefined,
    dateTo || undefined
  );

  const filteredBalances = balances.filter(
    (b) =>
      b.account_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.account_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Only show accounts with activity
  const activeBalances = filteredBalances.filter(
    (b) => b.total_debit > 0 || b.total_credit > 0
  );

  // Calculate totals
  const totalDebit = activeBalances.reduce((sum, b) => sum + b.total_debit, 0);
  const totalCredit = activeBalances.reduce((sum, b) => sum + b.total_credit, 0);
  const netBalance = totalDebit - totalCredit;

  const handleExportCSV = () => {
    const headers = ["Code", "Account Name", "Type", "Debit", "Credit", "Balance"];
    const rows = activeBalances.map((b) => [
      b.account_code,
      b.account_name,
      b.account_type || "",
      b.total_debit.toFixed(2),
      b.total_credit.toFixed(2),
      b.balance.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `account-balances-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Header
        title="Account Balance Report"
        subtitle="Bruto bilanca • Trial Balance"
      />

      <div className="p-6">
        {/* Summary Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Debits"
            value={`${totalDebit.toFixed(2)} KM`}
            change={`${activeBalances.length} accounts`}
            icon={TrendingUp}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Total Credits"
            value={`${totalCredit.toFixed(2)} KM`}
            change="All posted entries"
            icon={TrendingDown}
            iconColor="bg-destructive/10 text-destructive"
          />
          <StatCard
            title="Net Difference"
            value={`${Math.abs(netBalance).toFixed(2)} KM`}
            change={netBalance === 0 ? "Balanced ✓" : netBalance > 0 ? "Debit excess" : "Credit excess"}
            changeType={netBalance === 0 ? "positive" : "negative"}
            icon={Scale}
            iconColor="bg-primary/10 text-primary"
          />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36"
              />
            </div>
          </div>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Balance Table */}
        <div className="module-card">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeBalances.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <Calendar className="mb-2 h-12 w-12" />
              <p>No account activity found</p>
              <p className="text-sm">
                {dateFrom || dateTo
                  ? "Try adjusting the date range"
                  : "Post some GL entries to see balances"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Account Name</th>
                    <th>Type</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBalances.map((balance) => (
                    <tr key={balance.account_id}>
                      <td className="font-mono font-medium">
                        {balance.account_code}
                      </td>
                      <td>{balance.account_name}</td>
                      <td>
                        {balance.account_type ? (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                            {balance.account_type}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-right font-mono">
                        {balance.total_debit > 0
                          ? balance.total_debit.toFixed(2)
                          : "-"}
                      </td>
                      <td className="text-right font-mono">
                        {balance.total_credit > 0
                          ? balance.total_credit.toFixed(2)
                          : "-"}
                      </td>
                      <td
                        className={`text-right font-mono font-medium ${
                          balance.balance > 0
                            ? "text-success"
                            : balance.balance < 0
                            ? "text-destructive"
                            : ""
                        }`}
                      >
                        {balance.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-medium">
                    <td colSpan={3}>Total</td>
                    <td className="text-right font-mono">
                      {totalDebit.toFixed(2)}
                    </td>
                    <td className="text-right font-mono">
                      {totalCredit.toFixed(2)}
                    </td>
                    <td
                      className={`text-right font-mono ${
                        netBalance === 0
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {netBalance.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
