import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShoppingCart, Truck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useEcommerceOrders, useUpdateOrderStatus, useConvertOrderToShipment } from "@/hooks/useEcommerce";

const statusVariant: Record<string, any> = {
  new: "default",
  processing: "secondary",
  shipped: "default",
  delivered: "outline",
  cancelled: "destructive",
};

export default function OrdersList() {
  const [search, setSearch] = useState("");
  const { data: orders, isLoading } = useEcommerceOrders();
  const updateStatus = useUpdateOrderStatus();
  const ship = useConvertOrderToShipment();

  const filtered = orders?.filter((o) =>
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    new: orders?.filter((o) => o.status === "new").length || 0,
    processing: orders?.filter((o) => o.status === "processing").length || 0,
    shipped: orders?.filter((o) => o.status === "shipped").length || 0,
    delivered: orders?.filter((o) => o.status === "delivered").length || 0,
  };

  return (
    <div>
      <Header title="Online narudžbe" subtitle="Pregled i obrada web shop narudžbi" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <Card><CardContent className="p-4"><div className="text-2xl font-bold">{counts.new}</div><p className="text-sm text-muted-foreground">Nove</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold">{counts.processing}</div><p className="text-sm text-muted-foreground">U obradi</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold">{counts.shipped}</div><p className="text-sm text-muted-foreground">Poslano</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-2xl font-bold">{counts.delivered}</div><p className="text-sm text-muted-foreground">Završeno</p></CardContent></Card>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pretraži..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Narudžbe ({filtered?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-center py-8 text-muted-foreground">Učitavanje...</p> :
             !filtered?.length ? <p className="text-center py-8 text-muted-foreground">Nema narudžbi</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Broj</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Kupac</TableHead>
                    <TableHead>Iznos</TableHead>
                    <TableHead>Plaćanje</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono"><Link to={`/ecommerce/orders/${o.id}`} className="hover:underline">{o.order_number}</Link></TableCell>
                      <TableCell>{new Date(o.order_date).toLocaleDateString()}</TableCell>
                      <TableCell>{o.customer_name}</TableCell>
                      <TableCell>{Number(o.total).toFixed(2)} KM</TableCell>
                      <TableCell><Badge variant="outline">{o.payment_status}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant[o.status] || "secondary"}>{o.status}</Badge></TableCell>
                      <TableCell className="flex gap-1">
                        {o.status === "new" && (
                          <Button size="sm" variant="outline" onClick={() => ship.mutate(o.id)}>
                            <Truck className="h-3 w-3 mr-1" /> Otpremnica
                          </Button>
                        )}
                        {o.status === "processing" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: o.id, status: "shipped" })}>Poslano</Button>
                        )}
                        {o.status === "shipped" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: o.id, status: "delivered" })}>Isporučeno</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
