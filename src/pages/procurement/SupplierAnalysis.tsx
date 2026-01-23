import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { usePartners } from "@/hooks/useMasterData";

export default function SupplierAnalysis() {
  const [search, setSearch] = useState("");
  const { data: partners } = usePartners('supplier');

  const suppliers = partners?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Analiza dobavljača" subtitle="Usporedba cijena i performansi dobavljača" />

      <div className="p-6 space-y-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pretraži dobavljače..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Suppliers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Dobavljači ({suppliers?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {suppliers?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nema dobavljača</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naziv</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Narudžbi</TableHead>
                    <TableHead>Ukupna vrijednost</TableHead>
                    <TableHead>Prosječna dostava</TableHead>
                    <TableHead>Ocjena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers?.map(supplier => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.email || supplier.phone || '-'}</TableCell>
                      <TableCell>0</TableCell>
                      <TableCell>0,00 KM</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
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
