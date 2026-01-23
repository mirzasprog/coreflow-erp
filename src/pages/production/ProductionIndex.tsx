import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";
import { Factory, ClipboardList, Package, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function ProductionIndex() {
  return (
    <div>
      <Header title="Proizvodnja" subtitle="Upravljanje proizvodnim procesima" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktivni radni nalozi</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">U tijeku</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Završeno danas</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Radnih naloga</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Čeka materijal</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Blokirano</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Efikasnost</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <p className="text-xs text-muted-foreground">Ovaj mjesec</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <NavLink to="/production/work-orders" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <ClipboardList className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Radni nalozi</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Pregled i kreiranje radnih naloga za proizvodnju
                </p>
              </CardContent>
            </Card>
          </NavLink>
          
          <NavLink to="/production/bom" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Package className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Sastavnice (BOM)</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Definiranje sastava proizvoda
                </p>
              </CardContent>
            </Card>
          </NavLink>

          <NavLink to="/production/work-orders/new" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-primary">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Factory className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Novi radni nalog</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Kreiraj novi proizvodni nalog
                </p>
              </CardContent>
            </Card>
          </NavLink>
        </div>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Proizvodni modul</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Radni nalozi
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Kreiranje i praćenje naloga</li>
                  <li>• Automatska rezervacija materijala</li>
                  <li>• Praćenje vremena i troškova</li>
                  <li>• Status i napredak</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Sastavnice (BOM)
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Višerazinske sastavnice</li>
                  <li>• Automatski izračun potreba</li>
                  <li>• Verzioniranje</li>
                  <li>• Kopiranje i izmjena</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Analitika
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Efikasnost proizvodnje</li>
                  <li>• Troškovi po proizvodu</li>
                  <li>• Vrijeme ciklusa</li>
                  <li>• OEE pokazatelji</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
