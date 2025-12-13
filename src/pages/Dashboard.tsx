import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { ProfitLossWidget } from "@/components/dashboard/ProfitLossWidget";
import {
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  Shield,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  return (
    <div>
      <Header title="Dashboard" subtitle="Overview of your ERP system" />
      
      <div className="p-6">
        {/* Stats Grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Total Stock Value"
            value="€125,420"
            change="+12.5% from last month"
            changeType="positive"
            icon={Package}
            iconColor="bg-module-warehouse/10 text-module-warehouse"
          />
          <StatCard
            title="Open Invoices"
            value="€48,230"
            change="15 pending"
            changeType="neutral"
            icon={DollarSign}
            iconColor="bg-module-finance/10 text-module-finance"
          />
          <StatCard
            title="Today's Sales"
            value="€3,847"
            change="+8.2% vs yesterday"
            changeType="positive"
            icon={ShoppingCart}
            iconColor="bg-module-pos/10 text-module-pos"
          />
          <StatCard
            title="Active Employees"
            value="47"
            change="2 on leave"
            changeType="neutral"
            icon={Users}
            iconColor="bg-module-hr/10 text-module-hr"
          />
          <StatCard
            title="HSE Alerts"
            value="5"
            change="3 urgent"
            changeType="negative"
            icon={Shield}
            iconColor="bg-module-hse/10 text-module-hse"
          />
          <StatCard
            title="Monthly Revenue"
            value="€89,540"
            change="+18.3% growth"
            changeType="positive"
            icon={TrendingUp}
            iconColor="bg-primary/10 text-primary"
          />
        </div>

        {/* Profit & Loss Report */}
        <div className="mb-6">
          <ProfitLossWidget />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RecentActivity />
          <AlertsWidget />
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <QuickActionCard
              title="New Goods Receipt"
              description="Record incoming inventory"
              color="bg-module-warehouse"
            />
            <QuickActionCard
              title="Create Invoice"
              description="Issue new invoice"
              color="bg-module-finance"
            />
            <QuickActionCard
              title="Open POS"
              description="Start selling"
              color="bg-module-pos"
            />
            <QuickActionCard
              title="Add Employee"
              description="Register new staff"
              color="bg-module-hr"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, color }: { title: string; description: string; color: string }) {
  return (
    <button className="group relative overflow-hidden rounded-lg border bg-card p-4 text-left transition-all hover:shadow-md">
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full ${color} opacity-10 transition-transform group-hover:scale-150`} />
      <h4 className="font-medium">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
