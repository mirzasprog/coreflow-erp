import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Globe, CreditCard, Truck, Mail } from "lucide-react";

export default function WebShopSettings() {
  return (
    <div>
      <Header title="Postavke Web Shopa" subtitle="Konfiguracija online prodaje" />

      <div className="p-6">
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Općenito</TabsTrigger>
            <TabsTrigger value="payments">Plaćanja</TabsTrigger>
            <TabsTrigger value="shipping">Dostava</TabsTrigger>
            <TabsTrigger value="emails">Email obavijesti</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Osnovne postavke
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Web Shop aktivan</Label>
                    <p className="text-sm text-muted-foreground">Omogući online prodaju</p>
                  </div>
                  <Switch />
                </div>
                <div>
                  <Label>Naziv shopa</Label>
                  <Input placeholder="Moj Web Shop" className="mt-1" />
                </div>
                <div>
                  <Label>URL shopa</Label>
                  <Input placeholder="https://shop.example.com" className="mt-1" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Načini plaćanja
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Stripe (kartice)</Label>
                    <p className="text-sm text-muted-foreground">Plaćanje karticama online</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Pouzeće</Label>
                    <p className="text-sm text-muted-foreground">Plaćanje pri preuzimanju</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Virman</Label>
                    <p className="text-sm text-muted-foreground">Uplata na žiro račun</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Dostava
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Fiksna cijena dostave (KM)</Label>
                  <Input type="number" placeholder="5.00" className="mt-1" />
                </div>
                <div>
                  <Label>Besplatna dostava iznad (KM)</Label>
                  <Input type="number" placeholder="100.00" className="mt-1" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email obavijesti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Potvrda narudžbe</Label>
                    <p className="text-sm text-muted-foreground">Šalji email nakon narudžbe</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Obavijest o slanju</Label>
                    <p className="text-sm text-muted-foreground">Šalji email kad je poslano</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Button>Spremi postavke</Button>
        </div>
      </div>
    </div>
  );
}
