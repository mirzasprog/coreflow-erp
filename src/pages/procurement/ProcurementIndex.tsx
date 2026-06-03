import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";
import { ShoppingBag, FileText, TrendingUp, Users, AlertTriangle, CheckCircle, Brain } from "lucide-react";
import { usePurchaseRequests, useSupplierAnalytics } from "@/hooks/usePurchaseRequests";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";

export default function ProcurementIndex() {
  const { data: requests } = usePurchaseRequests();
  const { data: pos } = usePurchaseOrders();
  const { data: suppliers } = useSupplierAnalytics();

  const pendingPRs = requests?.filter(r => r.status === 'submitted' || r.status === 'draft').length || 0;
  const activePOs = pos?.filter(p => p.status !== 'received' && p.status !== 'cancelled').length || 0;
  const activeSuppliers = suppliers?.filter(s => s.count > 0).length || 0;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const monthSpend = pos?.filter(p => new Date(p.order_date) >= monthStart).reduce((s, p) => s + Number(p.total_value || 0), 0) || 0;

  return (
    <div>
      <Header title="Nabava" subtitle="Upravljanje nabavnim procesima" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktivni zahtjevi</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPRs}</div>
              <p className="text-xs text-muted-foreground">Čeka odobrenje</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Narudžbenice</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activePOs}</div>
              <p className="text-xs text-muted-foreground">U tijeku</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktivni dobavljači</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSuppliers}</div>
              <p className="text-xs text-muted-foreground">S narudžbama</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Potrošnja ovaj mjesec</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthSpend.toFixed(2)} KM</div>
              <p className="text-xs text-muted-foreground">Vrijednost PO</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <NavLink to="/procurement/requests" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <FileText className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Zahtjevi za nabavu</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {requests?.length || 0} ukupno
                </p>
              </CardContent>
            </Card>
          </NavLink>

          <NavLink to="/warehouse/purchase-orders" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <ShoppingBag className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Narudžbenice</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {pos?.length || 0} ukupno
                </p>
              </CardContent>
            </Card>
          </NavLink>

          <NavLink to="/procurement/reorder" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-primary/40">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Brain className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">AI preporuka narudžbi</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Min/max zalihe + historija, sezonalnost, promo, forecast
                </p>
              </CardContent>
            </Card>
          </NavLink>

          <NavLink to="/procurement/supplier-analysis" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <TrendingUp className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Analiza dobavljača</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {suppliers?.length || 0} dobavljača
                </p>
              </CardContent>
            </Card>
          </NavLink>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Upozorenja
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingPRs === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-success" />
                <p>Nema aktivnih upozorenja</p>
              </div>
            ) : (
              <p className="text-sm">{pendingPRs} zahtjeva čeka obradu.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
