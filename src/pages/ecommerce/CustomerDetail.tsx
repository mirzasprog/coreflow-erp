import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ShieldOff, ShieldCheck, Save } from "lucide-react";
import { useEcommerceCustomer, useUpdateCustomer, useCustomerOrders } from "@/hooks/useEcommerceCustomers";

export default function CustomerDetail() {
  const { id } = useParams();
  const { data: customer, isLoading } = useEcommerceCustomer(id);
  const update = useUpdateCustomer();
  const { data: orders } = useCustomerOrders(id, customer?.email);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => { if (customer) setForm(customer); }, [customer]);

  if (isLoading) return <div className="p-6">Učitavanje...</div>;
  if (!customer) return <div className="p-6">Kupac nije pronađen.</div>;

  const blocked = customer.status === "blocked";
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div>
      <Header title={`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email} subtitle="Detalji kupca" />
      <div className="p-6 space-y-4 max-w-5xl">
        <Link to="/ecommerce/customers" className="inline-flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Nazad
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant={blocked ? "destructive" : "default"}>
            {blocked ? "Blokiran" : "Aktivan"}
          </Badge>
          <Button
            size="sm"
            variant={blocked ? "default" : "destructive"}
            onClick={() => update.mutate({ id: customer.id, patch: { status: blocked ? "active" : "blocked" } })}
          >
            {blocked ? <><ShieldCheck className="h-4 w-4 mr-2" />Odblokiraj</> : <><ShieldOff className="h-4 w-4 mr-2" />Blokiraj</>}
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Podaci</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>Ime</Label><Input value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} /></div>
            <div><Label>Prezime</Label><Input value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} /></div>
            <div><Label>Email</Label><Input value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
            <div><Label>Telefon</Label><Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Adresa</Label><Input value={form.address || ''} onChange={e => set('address', e.target.value)} /></div>
            <div><Label>Grad</Label><Input value={form.city || ''} onChange={e => set('city', e.target.value)} /></div>
            <div><Label>Poštanski broj</Label><Input value={form.postal_code || ''} onChange={e => set('postal_code', e.target.value)} /></div>
            <div><Label>Država</Label><Input value={form.country || ''} onChange={e => set('country', e.target.value)} /></div>
            <div className="md:col-span-2">
              <Button onClick={() => update.mutate({ id: customer.id, patch: {
                first_name: form.first_name, last_name: form.last_name, email: form.email,
                phone: form.phone, address: form.address, city: form.city,
                postal_code: form.postal_code, country: form.country,
              }})} disabled={update.isPending}>
                <Save className="h-4 w-4 mr-2" /> Spremi izmjene
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Narudžbe ({orders?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {!orders || orders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">Nema narudžbi</div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Broj</TableHead><TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Ukupno</TableHead><TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.order_number}</TableCell>
                      <TableCell>{new Date(o.order_date).toLocaleDateString('hr')}</TableCell>
                      <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                      <TableCell className="text-right">{Number(o.total).toFixed(2)} KM</TableCell>
                      <TableCell><Link to={`/ecommerce/orders/${o.id}`} className="text-primary hover:underline">Otvori</Link></TableCell>
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
