import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShieldOff, ShieldCheck, Eye } from "lucide-react";
import { useEcommerceCustomers, useUpdateCustomer } from "@/hooks/useEcommerceCustomers";

export default function CustomersList() {
  const { data, isLoading } = useEcommerceCustomers();
  const update = useUpdateCustomer();
  const [search, setSearch] = useState("");

  const filtered = (data || []).filter(c => {
    const q = search.toLowerCase();
    return !q || c.email.toLowerCase().includes(q) || `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(q);
  });

  return (
    <div>
      <Header title="Registrirani kupci" subtitle="E-commerce korisnici" />
      <div className="p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kupci ({filtered.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pretraga..." className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Učitavanje...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nema registriranih kupaca</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ime i prezime</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Grad</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registriran</TableHead>
                    <TableHead className="text-right">Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => {
                    const blocked = c.status === "blocked";
                    return (
                      <TableRow key={c.id}>
                        <TableCell>{[c.first_name, c.last_name].filter(Boolean).join(' ') || '-'}</TableCell>
                        <TableCell>{c.email}</TableCell>
                        <TableCell>{c.phone || '-'}</TableCell>
                        <TableCell>{c.city || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={blocked ? "destructive" : "default"}>
                            {blocked ? "Blokiran" : "Aktivan"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(c.created_at).toLocaleDateString('hr')}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/ecommerce/customers/${c.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button
                            size="sm"
                            variant={blocked ? "ghost" : "ghost"}
                            onClick={() => update.mutate({ id: c.id, patch: { status: blocked ? "active" : "blocked" } })}
                          >
                            {blocked ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <ShieldOff className="h-4 w-4 text-destructive" />}
                          </Button>
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
