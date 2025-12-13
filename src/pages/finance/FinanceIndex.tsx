import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { NavLink } from "@/components/NavLink";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  FileText,
  FolderTree,
  Plus,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";

export default function FinanceIndex() {
  const { data: outgoingInvoices } = useInvoices('outgoing');
  const { data: incomingInvoices } = useInvoices('incoming');

  const receivables = outgoingInvoices?.reduce((sum, inv) => sum + (inv.total - (inv.paid_amount || 0)), 0) || 0;
  const payables = incomingInvoices?.reduce((sum, inv) => sum + (inv.total - (inv.paid_amount || 0)), 0) || 0;
  const openOutgoing = outgoingInvoices?.filter(inv => inv.status !== 'cancelled' && inv.paid_amount < inv.total).length || 0;
  const openIncoming = incomingInvoices?.filter(inv => inv.status !== 'cancelled' && inv.paid_amount < inv.total).length || 0;

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
          <NavLink to="/finance/invoices/outgoing/new">
            <QuickAction icon={FileText} title="Outgoing Invoice" subtitle="Izlazna faktura" />
          </NavLink>
          <NavLink to="/finance/invoices/incoming/new">
            <QuickAction icon={Receipt} title="Incoming Invoice" subtitle="Ulazna faktura" />
          </NavLink>
          <NavLink to="/finance/gl-entries/new">
            <QuickAction icon={Calculator} title="GL Journal Entry" subtitle="Temeljnica" />
          </NavLink>
          <QuickAction icon={FileText} title="VAT Report" subtitle="PDV izvještaj" />
        </div>

        {/* Module Links */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NavLink to="/finance/invoices/outgoing" className="module-card p-6 hover:border-primary transition-colors">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-success/10 p-3">
                <ArrowDownLeft className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">Outgoing Invoices</h3>
                <p className="text-sm text-muted-foreground">Izlazne fakture</p>
              </div>
            </div>
          </NavLink>
          <NavLink to="/finance/invoices/incoming" className="module-card p-6 hover:border-primary transition-colors">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-destructive/10 p-3">
                <ArrowUpRight className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">Incoming Invoices</h3>
                <p className="text-sm text-muted-foreground">Ulazne fakture</p>
              </div>
            </div>
          </NavLink>
          <NavLink to="/finance/gl-entries" className="module-card p-6 hover:border-primary transition-colors">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-module-finance/10 p-3">
                <Calculator className="h-6 w-6 text-module-finance" />
              </div>
              <div>
                <h3 className="font-semibold">GL Entries</h3>
                <p className="text-sm text-muted-foreground">Temeljnice</p>
              </div>
            </div>
          </NavLink>
          <NavLink to="/finance/accounts" className="module-card p-6 hover:border-primary transition-colors">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <FolderTree className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Chart of Accounts</h3>
                <p className="text-sm text-muted-foreground">Kontni plan</p>
              </div>
            </div>
          </NavLink>
          <NavLink to="/finance/balance-report" className="module-card p-6 hover:border-primary transition-colors">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-info/10 p-3">
                <TrendingUp className="h-6 w-6 text-info" />
              </div>
              <div>
                <h3 className="font-semibold">Balance Report</h3>
                <p className="text-sm text-muted-foreground">Bruto bilanca</p>
              </div>
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="module-card flex items-center gap-4 text-left w-full">
      <div className="rounded-lg bg-module-finance/10 p-3">
        <Icon className="h-6 w-6 text-module-finance" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}