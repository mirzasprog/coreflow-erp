import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { NavLink } from "@/components/NavLink";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  FolderTree,
  Plus,
  TrendingUp,
  Wallet,
  PieChart,
  Landmark,
  BarChart3,
} from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";
import { useCashBalance } from "@/hooks/useCashBalance";

export default function FinanceIndex() {
  const { data: outgoingInvoices } = useInvoices('outgoing');
  const { data: incomingInvoices } = useInvoices('incoming');
  const { data: cashData } = useCashBalance();

  const receivables = outgoingInvoices?.reduce((sum, inv) => sum + (inv.total - (inv.paid_amount || 0)), 0) || 0;
  const payables = incomingInvoices?.reduce((sum, inv) => sum + (inv.total - (inv.paid_amount || 0)), 0) || 0;
  const openOutgoing = outgoingInvoices?.filter(inv => inv.status !== 'cancelled' && inv.paid_amount < inv.total).length || 0;
  const openIncoming = incomingInvoices?.filter(inv => inv.status !== 'cancelled' && inv.paid_amount < inv.total).length || 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

  const formatChangePercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}% this month`;
  };

  const modules = [
    {
      title: "Izlazne fakture",
      titleEn: "Outgoing Invoices",
      icon: ArrowDownLeft,
      iconBg: "bg-success/10 text-success",
      to: "/finance/invoices/outgoing",
      newTo: "/finance/invoices/outgoing/new",
      meta: `${openOutgoing} otvorenih`,
    },
    {
      title: "Ulazne fakture",
      titleEn: "Incoming Invoices",
      icon: ArrowUpRight,
      iconBg: "bg-destructive/10 text-destructive",
      to: "/finance/invoices/incoming",
      newTo: "/finance/invoices/incoming/new",
      meta: `${openIncoming} za platiti`,
    },
    {
      title: "Temeljnice (GL)",
      titleEn: "GL Entries",
      icon: Calculator,
      iconBg: "bg-module-finance/10 text-module-finance",
      to: "/finance/gl-entries",
      newTo: "/finance/gl-entries/new",
    },
    {
      title: "Kontni plan",
      titleEn: "Chart of Accounts",
      icon: FolderTree,
      iconBg: "bg-primary/10 text-primary",
      to: "/finance/accounts",
    },
    {
      title: "Bruto bilanca",
      titleEn: "Balance Report",
      icon: BarChart3,
      iconBg: "bg-info/10 text-info",
      to: "/finance/balance-report",
    },
    {
      title: "Sparivanje izvoda",
      titleEn: "Bank Reconciliation",
      icon: Landmark,
      iconBg: "bg-warning/10 text-warning",
      to: "/finance/reconciliation",
    },
    {
      title: "Kontroling i BI",
      titleEn: "Controlling",
      icon: PieChart,
      iconBg: "bg-primary/10 text-primary",
      to: "/finance/controlling",
    },
  ];

  return (
    <div>
      <Header title="Finance" subtitle="Financijsko poslovanje • Financial Management" />

      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Receivables"
            value={`€${receivables.toFixed(0)}`}
            change={`${openOutgoing} open invoices`}
            icon={ArrowDownLeft}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Payables"
            value={`€${payables.toFixed(0)}`}
            change={`${openIncoming} pending bills`}
            icon={ArrowUpRight}
            iconColor="bg-destructive/10 text-destructive"
          />
          <StatCard
            title="Cash Balance"
            value={formatCurrency(cashData?.cashBalance || 0)}
            change={formatChangePercent(cashData?.cashChangePercent || 0)}
            changeType={cashData?.cashChangePercent && cashData.cashChangePercent >= 0 ? "positive" : "negative"}
            icon={Wallet}
            iconColor="bg-module-finance/10 text-module-finance"
          />
          <StatCard
            title="Monthly Profit"
            value={formatCurrency(cashData?.monthlyProfit || 0)}
            change={formatChangePercent(cashData?.profitChangePercent || 0)}
            changeType={cashData?.profitChangePercent && cashData.profitChangePercent >= 0 ? "positive" : "negative"}
            icon={TrendingUp}
            iconColor="bg-primary/10 text-primary"
          />
        </div>

        {/* Modules — single, non-duplicated card per area */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div key={m.to} className="module-card p-5 flex flex-col justify-between">
              <NavLink to={m.to} className="flex items-center gap-3 hover:opacity-90">
                <div className={`rounded-lg p-3 ${m.iconBg}`}>
                  <m.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{m.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{m.titleEn}{m.meta ? ` • ${m.meta}` : ''}</p>
                </div>
              </NavLink>
              {m.newTo && (
                <NavLink to={m.newTo} className="mt-3">
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> Novo
                  </Button>
                </NavLink>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
