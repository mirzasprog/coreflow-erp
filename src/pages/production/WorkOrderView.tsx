import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Package, Play, CheckCircle } from "lucide-react";
import { useWorkOrder, useUpdateWOStatus, useIssueMaterials, useReceiveProduction } from "@/hooks/useProduction";
import { useItems, useLocations } from "@/hooks/useMasterData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BomTreeView } from "@/components/production/BomTreeView";

export default function WorkOrderView() {
  const { id } = useParams();
  const { data: wo, isLoading } = useWorkOrder(id);
  const { data: items } = useItems();
  const { data: locations } = useLocations();
  const updateStatus = useUpdateWOStatus();
  const issueMats = useIssueMaterials();
  const receiveProd = useReceiveProduction();

  if (isLoading) return <div className="p-6">Učitavanje...</div>;
  if (!wo) return <div className="p-6">Nije pronađeno.</div>;

  const itemMap = new Map(items?.map((i) => [i.id, i]));
  const product = itemMap.get(wo.product_item_id);
  const loc = locations?.find((l) => l.id === wo.location_id);

  return (
    <div>
      <Header title={`Radni nalog ${wo.work_order_number}`} subtitle={product ? `${product.code} - ${product.name}` : ""} />
      <div className="p-6 space-y-4">
        <Link to="/production/work-orders" className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Nazad
        </Link>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card><CardHeader><CardTitle>Osnovno</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>Proizvod: {product?.name}</div>
              <div>Lokacija: {loc?.name}</div>
              <div>Status: <Badge>{wo.status}</Badge></div>
              <div>Planirano: {wo.planned_quantity} / Proizvedeno: {wo.produced_quantity}</div>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Datumi</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>Plan start: {wo.planned_start_date || "-"}</div>
              <div>Plan end: {wo.planned_end_date || "-"}</div>
              <div>Stvarni start: {wo.actual_start_date ? new Date(wo.actual_start_date).toLocaleString() : "-"}</div>
              <div>Stvarni end: {wo.actual_end_date ? new Date(wo.actual_end_date).toLocaleString() : "-"}</div>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Akcije</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {wo.status === "draft" && (
                <Button className="w-full" onClick={() => updateStatus.mutate({ id: wo.id, status: "released" })}>Pusti u proizvodnju</Button>
              )}
              {wo.status === "released" && (
                <>
                  <Button className="w-full" variant="outline" onClick={() => issueMats.mutate(wo.id)}><Package className="h-4 w-4 mr-2" /> Izdaj materijale</Button>
                  <Button className="w-full" onClick={() => updateStatus.mutate({ id: wo.id, status: "in_progress" })}><Play className="h-4 w-4 mr-2" /> Start</Button>
                </>
              )}
              {wo.status === "in_progress" && (
                <>
                  <Button className="w-full" variant="outline" onClick={() => receiveProd.mutate({ workOrderId: wo.id, quantity: wo.planned_quantity - wo.produced_quantity })}>
                    Prijem gotovog ({wo.planned_quantity - wo.produced_quantity})
                  </Button>
                  <Button className="w-full" onClick={() => updateStatus.mutate({ id: wo.id, status: "completed" })}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Završi
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Materijali</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Artikl</TableHead><TableHead>Planirano</TableHead><TableHead>Utrošeno</TableHead></TableRow></TableHeader>
              <TableBody>
                {wo.materials?.map((m) => {
                  const it = itemMap.get(m.item_id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{it ? `${it.code} - ${it.name}` : "-"}</TableCell>
                      <TableCell>{m.planned_quantity}</TableCell>
                      <TableCell>{m.consumed_quantity}</TableCell>
                    </TableRow>
                  );
                })}
                {!wo.materials?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nema materijala</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
