import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Truck, FileText } from "lucide-react";
import { useEcommerceOrder, useConvertOrderToShipment, useUpdateOrderStatus, useCreateInvoiceFromOrder } from "@/hooks/useEcommerce";

export default function OrderView() {
  const { id } = useParams();
  const { data: order, isLoading } = useEcommerceOrder(id);
  const ship = useConvertOrderToShipment();
  const updateStatus = useUpdateOrderStatus();
  const createInvoice = useCreateInvoiceFromOrder();

  if (isLoading) return <div className="p-6">Učitavanje...</div>;
  if (!order) return <div className="p-6">Narudžba nije pronađena.</div>;

  return (
    <div>
      <Header title={`Narudžba ${order.order_number}`} subtitle={order.customer_name} />
      <div className="p-6 space-y-4">
        <Link to="/ecommerce/orders" className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Nazad
        </Link>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Kupac</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div><strong>{order.customer_name}</strong></div>
              <div>{order.customer_email}</div>
              <div>{order.customer_phone}</div>
              <div className="pt-2">{order.shipping_address}</div>
              <div>{order.shipping_postal_code} {order.shipping_city}</div>
              <div>{order.shipping_country}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Plaćanje i dostava</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>Plaćanje: <Badge variant="outline">{order.payment_method || "-"}</Badge> <Badge>{order.payment_status}</Badge></div>
              <div>Dostava: {order.shipping_method || "-"} ({Number(order.shipping_cost).toFixed(2)} KM)</div>
              <div>Tracking: {order.tracking_number || "-"}</div>
              <div>Status: <Badge>{order.status}</Badge></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Iznosi</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>Subtotal: {Number(order.subtotal).toFixed(2)} KM</div>
              <div>PDV: {Number(order.vat_amount).toFixed(2)} KM</div>
              <div>Popust: {Number(order.discount_amount).toFixed(2)} KM</div>
              <div className="text-lg font-bold pt-2 border-t">Ukupno: {Number(order.total).toFixed(2)} KM</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Stavke</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Artikl</TableHead><TableHead>Količina</TableHead><TableHead>Cijena</TableHead><TableHead>Ukupno</TableHead></TableRow></TableHeader>
              <TableBody>
                {order.lines?.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.items?.name || l.description || "-"}</TableCell>
                    <TableCell>{l.quantity}</TableCell>
                    <TableCell>{Number(l.unit_price).toFixed(2)} KM</TableCell>
                    <TableCell>{Number(l.total).toFixed(2)} KM</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          {order.status === "new" && (
            <Button onClick={() => ship.mutate(order.id)}><Truck className="h-4 w-4 mr-2" /> Kreiraj otpremnicu</Button>
          )}
          {order.status === "processing" && (
            <Button onClick={() => updateStatus.mutate({ id: order.id, status: "shipped" })}>Označi poslano</Button>
          )}
          {order.status === "shipped" && (
            <Button onClick={() => updateStatus.mutate({ id: order.id, status: "delivered" })}>Označi isporučeno</Button>
          )}
          {(order.status === "processing" || order.status === "shipped" || order.status === "delivered") && (
            <Button variant="outline" onClick={() => createInvoice.mutate(order.id)} disabled={createInvoice.isPending}>
              <FileText className="h-4 w-4 mr-2" /> Kreiraj fakturu
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
