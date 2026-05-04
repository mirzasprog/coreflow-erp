import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";
import { Factory, ClipboardList, Package, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useWorkOrders, useBOMs } from "@/hooks/useProduction";

export default function ProductionIndex() {
  const { data: workOrders } = useWorkOrders();
  const { data: boms } = useBOMs();

  const active = workOrders?.filter(w => w.status === 'in_progress').length || 0;
  const today = new Date().toDateString();
  const completedToday = workOrders?.filter(w => w.status === 'completed' && w.actual_end_date && new Date(w.actual_end_date).toDateString() === today).length || 0;
  const draft = workOrders?.filter(w => w.status === 'draft').length || 0;
  const totalCompleted = workOrders?.filter(w => w.status === 'completed').length || 0;
  const totalNonDraft = workOrders?.filter(w => w.status !== 'draft').length || 0;
  const efficiency = totalNonDraft > 0 ? Math.round((totalCompleted / totalNonDraft) * 100) : 0;

  return (
    <div>
      <Header title="Proizvodnja" subtitle="Upravljanje proizvodnim procesima" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktivni radni nalozi</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{active}</div>
              <p className="text-xs text-muted-foreground">U tijeku</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Završeno danas</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedToday}</div>
              <p className="text-xs text-muted-foreground">Radnih naloga</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Nacrt / pripremljeno</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draft}</div>
              <p className="text-xs text-muted-foreground">Čeka pokretanje</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Efikasnost</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{efficiency}%</div>
              <p className="text-xs text-muted-foreground">Završeni / pokrenuti</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <NavLink to="/production/work-orders" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <ClipboardList className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-semibold">Radni nalozi</h3>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {workOrders?.length || 0} ukupno
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
                  {boms?.length || 0} aktivnih
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
      </div>
    </div>
  );
}
