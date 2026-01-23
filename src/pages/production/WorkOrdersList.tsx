import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, ClipboardList } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function WorkOrdersList() {
  const [search, setSearch] = useState("");

  return (
    <div>
      <Header title="Radni nalozi" subtitle="Pregled proizvodnih naloga" />

      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pretraži radne naloge..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button asChild>
            <Link to="/production/work-orders/new">
              <Plus className="h-4 w-4 mr-2" />
              Novi radni nalog
            </Link>
          </Button>
        </div>

        {/* Work Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Radni nalozi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nema radnih naloga</p>
              <p className="text-sm mt-1">Kreirajte prvi radni nalog za početak proizvodnje</p>
              <Button className="mt-4" asChild>
                <Link to="/production/work-orders/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Novi radni nalog
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
