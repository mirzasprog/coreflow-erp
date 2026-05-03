import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, CreditCard, Truck, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { useWebShopSettings, useSaveWebShopSettings } from "@/hooks/useEcommerce";

interface ShopSettings {
  shop_name: string;
  shop_url: string;
  pay_stripe: boolean;
  pay_cod: boolean;
  pay_bank: boolean;
  shipping_flat: number;
  shipping_free_threshold: number;
  email_order_confirm: boolean;
  email_shipped: boolean;
}

const defaults: ShopSettings = {
  shop_name: "",
  shop_url: "",
  pay_stripe: false,
  pay_cod: true,
  pay_bank: true,
  shipping_flat: 5,
  shipping_free_threshold: 100,
  email_order_confirm: true,
  email_shipped: true,
};

export default function WebShopSettings() {
  const { data, isLoading } = useWebShopSettings();
  const save = useSaveWebShopSettings();
  const [enabled, setEnabled] = useState(false);
  const [s, setS] = useState<ShopSettings>(defaults);

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setS({ ...defaults, ...((data.settings as any) || {}) });
    }
  }, [data]);

  const update = (k: keyof ShopSettings, v: any) => setS((p) => ({ ...p, [k]: v }));

  if (isLoading) return <div className="p-6">Učitavanje...</div>;

  return (
    <div>
      <Header title="Postavke Web Shopa" subtitle="Konfiguracija online prodaje" />
      <div className="p-6">
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Općenito</TabsTrigger>
            <TabsTrigger value="payments">Plaćanja</TabsTrigger>
            <TabsTrigger value="shipping">Dostava</TabsTrigger>
            <TabsTrigger value="emails">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6 space-y-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Osnovne postavke</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><Label>Web Shop aktivan</Label></div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>
                <div><Label>Naziv shopa</Label><Input value={s.shop_name} onChange={(e) => update("shop_name", e.target.value)} /></div>
                <div><Label>URL shopa</Label><Input value={s.shop_url} onChange={(e) => update("shop_url", e.target.value)} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Načini plaćanja</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><Label>Stripe</Label><Switch checked={s.pay_stripe} onCheckedChange={(v) => update("pay_stripe", v)} /></div>
                <div className="flex items-center justify-between"><Label>Pouzeće</Label><Switch checked={s.pay_cod} onCheckedChange={(v) => update("pay_cod", v)} /></div>
                <div className="flex items-center justify-between"><Label>Virman</Label><Switch checked={s.pay_bank} onCheckedChange={(v) => update("pay_bank", v)} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="mt-6">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Dostava</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Cijena dostave (KM)</Label><Input type="number" value={s.shipping_flat} onChange={(e) => update("shipping_flat", Number(e.target.value))} /></div>
                <div><Label>Besplatna dostava iznad (KM)</Label><Input type="number" value={s.shipping_free_threshold} onChange={(e) => update("shipping_free_threshold", Number(e.target.value))} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="mt-6">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email obavijesti</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><Label>Potvrda narudžbe</Label><Switch checked={s.email_order_confirm} onCheckedChange={(v) => update("email_order_confirm", v)} /></div>
                <div className="flex items-center justify-between"><Label>Obavijest o slanju</Label><Switch checked={s.email_shipped} onCheckedChange={(v) => update("email_shipped", v)} /></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Button onClick={() => save.mutate({ enabled, settings: s })} disabled={save.isPending}>
            {save.isPending ? "Spremam..." : "Spremi postavke"}
          </Button>
        </div>
      </div>
    </div>
  );
}
