import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { ProfitLossWidget } from "@/components/dashboard/ProfitLossWidget";
import { PurchaseOrdersWidget } from "@/components/dashboard/PurchaseOrdersWidget";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  Shield,
  TrendingUp,
} from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const navigate = useNavigate();

  return (
    <div>
      <Header title="Dashboard" subtitle="Overview of your ERP system" />
      
      <div className="p-6">
        {/* Stats Grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {isLoading ? (
            <>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[100px] rounded-lg" />
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Total Stock Value"
                value={formatCurrency(stats?.totalStockValue || 0)}
                change="Current inventory"
                changeType="neutral"
                icon={Package}
                iconColor="bg-module-warehouse/10 text-module-warehouse"
              />
              <StatCard
                title="Open Invoices"
                value={formatCurrency(stats?.openInvoicesValue || 0)}
                change={`${stats?.openInvoicesCount || 0} pending`}
                changeType="neutral"
                icon={DollarSign}
                iconColor="bg-module-finance/10 text-module-finance"
              />
              <StatCard
                title="Today's Sales"
                value={formatCurrency(stats?.todaySales || 0)}
                change="POS transactions"
                changeType={stats?.todaySales ? "positive" : "neutral"}
                icon={ShoppingCart}
                iconColor="bg-module-pos/10 text-module-pos"
              />
              <StatCard
                title="Active Employees"
                value={stats?.activeEmployees || 0}
                change={`${stats?.employeesOnLeave || 0} on leave`}
                changeType="neutral"
                icon={Users}
                iconColor="bg-module-hr/10 text-module-hr"
              />
              <StatCard
                title="HSE Alerts"
                value={stats?.hseAlerts || 0}
                change={stats?.hseUrgent ? `${stats.hseUrgent} overdue` : "All clear"}
                changeType={stats?.hseUrgent ? "negative" : "positive"}
                icon={Shield}
                iconColor="bg-module-hse/10 text-module-hse"
              />
              <StatCard
                title="Monthly Revenue"
                value={formatCurrency(stats?.monthlyRevenue || 0)}
                change="This month"
                changeType={stats?.monthlyRevenue ? "positive" : "neutral"}
                icon={TrendingUp}
                iconColor="bg-primary/10 text-primary"
              />
            </>
          )}
        </div>

        {/* Profit & Loss Report */}
        <div className="mb-6">
          <ProfitLossWidget />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          <RecentActivity />
          <AlertsWidget />
          <PurchaseOrdersWidget />
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <QuickActionCard
              title="New Goods Receipt"
              description="Record incoming inventory"
              color="bg-module-warehouse"
              onClick={() => navigate('/warehouse/receipts/new')}
            />
            <QuickActionCard
              title="Create Invoice"
              description="Issue new invoice"
              color="bg-module-finance"
              onClick={() => navigate('/finance/invoices/outgoing/new')}
            />
            <QuickActionCard
              title="Open POS"
              description="Start selling"
              color="bg-module-pos"
              onClick={() => navigate('/pos')}
            />
            <QuickActionCard
              title="Add Employee"
              description="Register new staff"
              color="bg-module-hr"
              onClick={() => navigate('/hr/employees/new')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, color, onClick }: { title: string; description: string; color: string; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg border bg-card p-4 text-left transition-all hover:shadow-md"
    >
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full ${color} opacity-10 transition-transform group-hover:scale-150`} />
      <h4 className="font-medium">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
