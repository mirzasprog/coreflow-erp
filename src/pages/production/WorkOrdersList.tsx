import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, ClipboardList, Play, CheckCircle, Package } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkOrders, useUpdateWOStatus, useIssueMaterials, useReceiveProduction } from "@/hooks/useProduction";
import { useItems, useLocations } from "@/hooks/useMasterData";

const statusVariant: Record<string, any> = {
  draft: "secondary",
  released: "default",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
};

export default function WorkOrdersList() {
  const [search, setSearch] = useState("");
  const { data: wos, isLoading } = useWorkOrders();
  const { data: items } = useItems();
  const { data: locations } = useLocations();
  const updateStatus = useUpdateWOStatus();
  const issueMats = useIssueMaterials();
  const receiveProd = useReceiveProduction();

  const itemMap = new Map(items?.map((i) => [i.id, i]));
  const locMap = new Map(locations?.map((l) => [l.id, l]));

  const filtered = wos?.filter((w) =>
    w.work_order_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Radni nalozi" subtitle="Pregled proizvodnih naloga" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pretraži..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button asChild><Link to="/production/work-orders/new"><Plus className="h-4 w-4 mr-2" /> Novi RN</Link></Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Radni nalozi ({filtered?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-center py-8 text-muted-foreground">Učitavanje...</p> :
             !filtered?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nema radnih naloga</p>
              </div>
             ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Broj</TableHead>
                    <TableHead>Proizvod</TableHead>
                    <TableHead>Lokacija</TableHead>
                    <TableHead>Plan / Proizv.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((w) => {
                    const item = itemMap.get(w.product_item_id);
                    const loc = locMap.get(w.location_id || "");
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono"><Link to={`/production/work-orders/${w.id}`} className="hover:underline">{w.work_order_number}</Link></TableCell>
                        <TableCell>{item ? `${item.code} - ${item.name}` : "-"}</TableCell>
                        <TableCell>{loc?.name || "-"}</TableCell>
                        <TableCell>{w.planned_quantity} / {w.produced_quantity}</TableCell>
                        <TableCell><Badge variant={statusVariant[w.status] || "secondary"}>{w.status}</Badge></TableCell>
                        <TableCell className="flex gap-1">
                          {w.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: w.id, status: "released" })}>Pusti</Button>
                          )}
                          {w.status === "released" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => issueMats.mutate(w.id)} title="Izdaj materijale">
                                <Package className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: w.id, status: "in_progress" })}>
                                <Play className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {w.status === "in_progress" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => receiveProd.mutate({ workOrderId: w.id, quantity: w.planned_quantity - w.produced_quantity })}>
                                Prijem
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: w.id, status: "completed" })}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
