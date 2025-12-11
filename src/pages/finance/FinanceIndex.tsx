import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  FileText,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";

const invoices = [
  { id: "INV-2024-089", partner: "TechCorp d.o.o.", type: "outgoing", amount: 2450.00, date: "2024-01-15", due: "2024-02-15", status: "pending" },
  { id: "INV-2024-088", partner: "Office Plus", type: "incoming", amount: 890.50, date: "2024-01-14", due: "2024-02-14", status: "paid" },
  { id: "INV-2024-087", partner: "Global Solutions", type: "outgoing", amount: 5670.00, date: "2024-01-12", due: "2024-02-12", status: "overdue" },
  { id: "INV-2024-086", partner: "Supply Chain Ltd", type: "incoming", amount: 1234.00, date: "2024-01-10", due: "2024-02-10", status: "pending" },
];

export default function FinanceIndex() {
  return (
    <div>
      <Header title="Finance" subtitle="Financijsko poslovanje • Financial Management" />

      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Receivables"
            value="€48,230"
            change="12 open invoices"
            icon={ArrowDownLeft}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Payables"
            value="€21,450"
            change="8 pending bills"
            icon={ArrowUpRight}
            iconColor="bg-destructive/10 text-destructive"
          />
          <StatCard
            title="Cash Balance"
            value="€156,780"
            change="+5.2% this month"
            changeType="positive"
            icon={Wallet}
            iconColor="bg-module-finance/10 text-module-finance"
          />
          <StatCard
            title="Monthly Profit"
            value="€12,340"
            change="+18.3% vs last month"
            changeType="positive"
            icon={TrendingUp}
            iconColor="bg-primary/10 text-primary"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction icon={FileText} title="Outgoing Invoice" subtitle="Izlazna faktura" />
          <QuickAction icon={Receipt} title="Incoming Invoice" subtitle="Ulazna faktura" />
          <QuickAction icon={Calculator} title="GL Journal Entry" subtitle="Temeljnica" />
          <QuickAction icon={FileText} title="VAT Report" subtitle="PDV izvještaj" />
        </div>

        {/* Recent Invoices */}
        <div className="module-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Recent Invoices</h3>
              <p className="text-sm text-muted-foreground">Nedavne fakture</p>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Partner</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="cursor-pointer">
                    <td className="font-medium">{inv.id}</td>
                    <td>{inv.partner}</td>
                    <td>
                      {inv.type === "outgoing" ? (
                        <span className="badge-success">Outgoing</span>
                      ) : (
                        <span className="badge-info">Incoming</span>
                      )}
                    </td>
                    <td>{inv.date}</td>
                    <td>{inv.due}</td>
                    <td className="text-right font-medium">€{inv.amount.toFixed(2)}</td>
                    <td>
                      {inv.status === "paid" && <span className="badge-success">Paid</span>}
                      {inv.status === "pending" && <span className="badge-warning">Pending</span>}
                      {inv.status === "overdue" && <span className="badge-danger">Overdue</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <button className="module-card flex items-center gap-4 text-left">
      <div className="rounded-lg bg-module-finance/10 p-3">
        <Icon className="h-6 w-6 text-module-finance" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}
