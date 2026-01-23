import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Upload, Globe } from "lucide-react";
import { useItems } from "@/hooks/useMasterData";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductCatalog() {
  const { data: items, isLoading } = useItems();
  const [search, setSearch] = useState("");

  const filteredItems = items?.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Katalog proizvoda" subtitle="Upravljanje proizvodima za web shop" />

      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pretraži proizvode..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Proizvodi ({filteredItems?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48" />
            ) : filteredItems?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nema proizvoda. Proizvodi se automatski sinkroniziraju iz ERP kataloga artikala.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Šifra</TableHead>
                    <TableHead>Naziv</TableHead>
                    <TableHead>Cijena</TableHead>
                    <TableHead>Zaliha</TableHead>
                    <TableHead>Objavljeno</TableHead>
                    <TableHead>Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.selling_price?.toFixed(2)} KM</TableCell>
                      <TableCell>
                        <Badge variant="outline">N/A</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">Uredi</Button>
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
