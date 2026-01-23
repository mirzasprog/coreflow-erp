import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";
import { ShoppingBag, FileText, TrendingUp, Users, AlertTriangle, CheckCircle } from "lucide-react";

export default function ProcurementIndex() {
  return (
    <div>
      <Header title="Nabava" subtitle="Upravljanje nabavnim procesima" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktivni zahtjevi</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Čeka odobrenje</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Narudžbenice</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">U tijeku</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktivni dobavljači</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">S narudžbama</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Uštede</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0,00 KM</div>
              <p className="text-xs text-muted-foreground">Ovaj mjesec</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <NavLink to="/procurement/requests" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <FileText className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Zahtjevi za nabavu</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Pregled i odobravanje zahtjeva
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
                  Pregled i kreiranje narudžbenica
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
                  Usporedba cijena i performansi
                </p>
              </CardContent>
            </Card>
          </NavLink>
        </div>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Upozorenja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
              <p>Nema aktivnih upozorenja</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
