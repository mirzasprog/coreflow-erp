import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { NavLink } from "@/components/NavLink";
import {
  Monitor,
  Smartphone,
  ShoppingCart,
  CreditCard,
  Receipt,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";

const todaySales = [
  { id: "R-2024-0125", time: "14:32", terminal: "POS-1", cashier: "Mike R.", items: 5, total: 127.50, payment: "Card" },
  { id: "R-2024-0124", time: "14:15", terminal: "POS-2", cashier: "Sarah M.", items: 2, total: 45.00, payment: "Cash" },
  { id: "R-2024-0123", time: "13:48", terminal: "POS-1", cashier: "Mike R.", items: 8, total: 234.80, payment: "Card" },
  { id: "R-2024-0122", time: "13:22", terminal: "POS-1", cashier: "Mike R.", items: 1, total: 15.99, payment: "Cash" },
];

export default function POSIndex() {
  return (
    <div>
      <Header title="Point of Sale" subtitle="Blagajna • Cash Register System" />

      <div className="p-6">
        {/* POS Mode Selection */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <NavLink to="/pos/classic">
            <div className="module-card group cursor-pointer border-2 border-transparent transition-all hover:border-module-pos">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-module-pos/10 p-4">
                  <Monitor className="h-8 w-8 text-module-pos" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Classic POS</h3>
                  <p className="text-muted-foreground">Klasična blagajna</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Keyboard & mouse interface for desktop workstations
                  </p>
                </div>
              </div>
              <Button className="mt-4 w-full bg-module-pos hover:bg-module-pos/90">
                Open Classic POS
              </Button>
            </div>
          </NavLink>

          <NavLink to="/pos/touch">
            <div className="module-card group cursor-pointer border-2 border-transparent transition-all hover:border-module-pos">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-module-pos/10 p-4">
                  <Smartphone className="h-8 w-8 text-module-pos" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Touch POS</h3>
                  <p className="text-muted-foreground">Touch screen blagajna</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Touch-optimized interface with large buttons and numpad
                  </p>
                </div>
              </div>
              <Button className="mt-4 w-full bg-module-pos hover:bg-module-pos/90">
                Open Touch POS
              </Button>
            </div>
          </NavLink>
        </div>

        {/* Today's Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Sales"
            value="€3,847.29"
            change="47 transactions"
            icon={ShoppingCart}
            iconColor="bg-module-pos/10 text-module-pos"
          />
          <StatCard
            title="Cash Payments"
            value="€1,234.50"
            change="32% of total"
            icon={DollarSign}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Card Payments"
            value="€2,612.79"
            change="68% of total"
            icon={CreditCard}
            iconColor="bg-primary/10 text-primary"
          />
          <StatCard
            title="Avg. Transaction"
            value="€81.86"
            change="+12% vs yesterday"
            changeType="positive"
            icon={TrendingUp}
            iconColor="bg-info/10 text-info"
          />
        </div>

        {/* Recent Receipts */}
        <div className="module-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Today's Receipts</h3>
              <p className="text-sm text-muted-foreground">Današnji računi</p>
            </div>
            <Button variant="outline">
              <Receipt className="mr-2 h-4 w-4" />
              Z-Report
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt No.</th>
                  <th>Time</th>
                  <th>Terminal</th>
                  <th>Cashier</th>
                  <th className="text-right">Items</th>
                  <th className="text-right">Total</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {todaySales.map((sale) => (
                  <tr key={sale.id} className="cursor-pointer">
                    <td className="font-medium">{sale.id}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {sale.time}
                      </div>
                    </td>
                    <td>{sale.terminal}</td>
                    <td>{sale.cashier}</td>
                    <td className="text-right">{sale.items}</td>
                    <td className="text-right font-medium">€{sale.total.toFixed(2)}</td>
                    <td>
                      {sale.payment === "Card" ? (
                        <span className="badge-info">Card</span>
                      ) : (
                        <span className="badge-success">Cash</span>
                      )}
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
