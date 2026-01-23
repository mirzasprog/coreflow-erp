import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useItems, useLocations } from "@/hooks/useMasterData";
import { Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";

export default function WorkOrderForm() {
  const { data: items } = useItems();
  const { data: locations } = useLocations();

  return (
    <div>
      <Header title="Novi radni nalog" subtitle="Kreiranje proizvodnog naloga" />

      <div className="p-6">
        <Link to="/production/work-orders" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Nazad na radne naloge
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Osnovni podaci</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Broj naloga</Label>
                    <Input placeholder="Automatski" disabled className="mt-1" />
                  </div>
                  <div>
                    <Label>Datum</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Proizvod</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Odaberi proizvod" />
                    </SelectTrigger>
                    <SelectContent>
                      {items?.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.code} - {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Količina</Label>
                    <Input type="number" placeholder="0" className="mt-1" />
                  </div>
                  <div>
                    <Label>Lokacija</Label>
                    <Select>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Odaberi lokaciju" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations?.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Napomena</Label>
                  <Textarea placeholder="Dodatne upute za proizvodnju..." className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Materijali (BOM)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-4">
                  Materijali će se automatski učitati nakon odabira proizvoda sa definiranom sastavnicom
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Akcije</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Spremi nalog
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/production/work-orders">Odustani</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
