import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { NavLink } from "@/components/NavLink";
import { useTodayReceipts } from "@/hooks/usePOS";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Monitor,
  Smartphone,
  ShoppingCart,
  CreditCard,
  Receipt,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowUpFromLine,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function POSIndex() {
  const { data: receipts = [], isLoading } = useTodayReceipts();

  // Calculate stats
  const totalSales = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
  const cashSales = receipts
    .filter((r) => r.payment_type === "cash")
    .reduce((sum, r) => sum + (r.total || 0), 0);
  const cardSales = receipts
    .filter((r) => r.payment_type === "card")
    .reduce((sum, r) => sum + (r.total || 0), 0);
  const avgTransaction = receipts.length > 0 ? totalSales / receipts.length : 0;
  const cashPercent = totalSales > 0 ? Math.round((cashSales / totalSales) * 100) : 0;
  const cardPercent = totalSales > 0 ? Math.round((cardSales / totalSales) * 100) : 0;

  return (
    <div>
      <Header title="Point of Sale" subtitle="Blagajna • Cash Register System" />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <NavLink to="/">Home</NavLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Point of Sale</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="mb-6 module-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Quick Actions</h3>
              <p className="text-sm text-muted-foreground">Brzi prelaz na skladišne tokove</p>
            </div>
            <NavLink to="/warehouse/issues/new">
              <Button variant="outline">
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                Create Issue from POS
              </Button>
            </NavLink>
          </div>
        </div>

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

          <NavLink to="/pos/shifts">
            <div className="module-card group cursor-pointer border-2 border-transparent transition-all hover:border-module-pos">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-module-pos/10 p-4">
                  <Clock className="h-8 w-8 text-module-pos" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Shift Management</h3>
                  <p className="text-muted-foreground">Upravljanje smjenama</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Open/close shifts and view Z-reports
                  </p>
                </div>
              </div>
              <Button variant="outline" className="mt-4 w-full">
                Manage Shifts
              </Button>
            </div>
          </NavLink>
        </div>

        {/* Today's Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Sales"
            value={`${totalSales.toFixed(2)} KM`}
            change={`${receipts.length} transactions`}
            icon={ShoppingCart}
            iconColor="bg-module-pos/10 text-module-pos"
          />
          <StatCard
            title="Cash Payments"
            value={`${cashSales.toFixed(2)} KM`}
            change={`${cashPercent}% of total`}
            icon={DollarSign}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Card Payments"
            value={`${cardSales.toFixed(2)} KM`}
            change={`${cardPercent}% of total`}
            icon={CreditCard}
            iconColor="bg-primary/10 text-primary"
          />
          <StatCard
            title="Avg. Transaction"
            value={`${avgTransaction.toFixed(2)} KM`}
            change="Today's average"
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

          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : receipts.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <Receipt className="mb-2 h-12 w-12" />
              <p>No receipts today</p>
              <p className="text-sm">Start selling to see transactions here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Receipt No.</th>
                    <th>Time</th>
                    <th className="text-right">Items</th>
                    <th className="text-right">Subtotal</th>
                    <th className="text-right">VAT</th>
                    <th className="text-right">Total</th>
                    <th>Payment</th>
                    <th>Fiscalization</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => {
                    const itemCount = receipt.pos_receipt_lines?.reduce(
                      (sum: number, line: any) => sum + (line.quantity || 0),
                      0
                    ) || 0;
                    
                    return (
                      <tr key={receipt.id} className="cursor-pointer">
                        <td className="font-medium">{receipt.receipt_number}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(new Date(receipt.receipt_date || receipt.created_at), "HH:mm")}
                          </div>
                        </td>
                        <td className="text-right">{itemCount}</td>
                        <td className="text-right">{(receipt.subtotal || 0).toFixed(2)} KM</td>
                        <td className="text-right">{(receipt.vat_amount || 0).toFixed(2)} KM</td>
                        <td className="text-right font-medium">{(receipt.total || 0).toFixed(2)} KM</td>
                        <td>
                          {receipt.payment_type === "card" ? (
                            <span className="inline-flex items-center rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                              Card
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                              Cash
                            </span>
                          )}
                        </td>
                        <td>
                          {receipt.fiscalized ? (
                            <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                              Fiskalizirano
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                              Nefiskalizirano
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
