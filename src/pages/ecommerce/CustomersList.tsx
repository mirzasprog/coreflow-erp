import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { useEcommerceCustomers } from "@/hooks/useEcommerceCustomers";

export default function CustomersList() {
  const { data, isLoading } = useEcommerceCustomers();
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
                    <TableHead>Marketing</TableHead>
                    <TableHead>Registriran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{[c.first_name, c.last_name].filter(Boolean).join(' ') || '-'}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.phone || '-'}</TableCell>
                      <TableCell>{c.city || '-'}</TableCell>
                      <TableCell>{c.marketing_consent ? '✓' : '-'}</TableCell>
                      <TableCell>{new Date(c.created_at).toLocaleDateString('hr')}</TableCell>
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
