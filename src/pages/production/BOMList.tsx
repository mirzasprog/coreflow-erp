import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Package } from "lucide-react";
import { useState } from "react";

export default function BOMList() {
  const [search, setSearch] = useState("");

  return (
    <div>
      <Header title="Sastavnice (BOM)" subtitle="Bill of Materials - Sastav proizvoda" />

      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pretraži sastavnice..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova sastavnica
          </Button>
        </div>

        {/* BOM Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Sastavnice proizvoda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nema definiranih sastavnica</p>
              <p className="text-sm mt-1">Definirajte sastavnice za proizvode koji se proizvode</p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Nova sastavnica
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
