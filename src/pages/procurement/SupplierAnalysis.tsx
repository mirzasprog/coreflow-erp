import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import { useSupplierAnalytics } from "@/hooks/usePurchaseRequests";

export default function SupplierAnalysis() {
  const [search, setSearch] = useState("");
  const { data: suppliers, isLoading } = useSupplierAnalytics();

  const filtered = suppliers?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Analiza dobavljača" subtitle="Performanse i vrijednosti narudžbi" />
      <div className="p-6 space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pretraži dobavljače..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Dobavljači ({filtered?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Učitavanje...</p>
            ) : !filtered?.length ? (
              <p className="text-center py-8 text-muted-foreground">Nema dobavljača</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naziv</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Narudžbi</TableHead>
                    <TableHead>Zaprimljenih</TableHead>
                    <TableHead>Ukupna vrijednost</TableHead>
                    <TableHead>% isporuke</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.email || s.phone || "-"}</TableCell>
                      <TableCell>{s.count}</TableCell>
                      <TableCell>{s.received}</TableCell>
                      <TableCell>{s.totalValue.toFixed(2)} KM</TableCell>
                      <TableCell>{s.count ? Math.round((s.received / s.count) * 100) : 0}%</TableCell>
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
