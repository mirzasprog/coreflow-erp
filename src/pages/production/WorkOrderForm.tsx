import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useItems, useLocations } from "@/hooks/useMasterData";
import { useBOMs, useCreateWorkOrder } from "@/hooks/useProduction";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";

export default function WorkOrderForm() {
  const navigate = useNavigate();
  const { data: items } = useItems();
  const { data: locations } = useLocations();
  const { data: boms } = useBOMs();
  const createWO = useCreateWorkOrder();

  const [productId, setProductId] = useState("");
  const [bomId, setBomId] = useState<string>("");
  const [locationId, setLocationId] = useState("");
  const [qty, setQty] = useState(1);
  const [start, setStart] = useState(new Date().toISOString().split("T")[0]);
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  const filteredBoms = boms?.filter((b) => !productId || b.product_item_id === productId);

  const submit = async () => {
    if (!productId) return;
    await createWO.mutateAsync({
      header: {
        product_item_id: productId,
        bom_id: bomId || null,
        location_id: locationId || null,
        planned_quantity: qty,
        planned_start_date: start || null,
        planned_end_date: end || null,
        notes,
      },
    });
    navigate("/production/work-orders");
  };

  return (
    <div>
      <Header title="Novi radni nalog" subtitle="Kreiranje proizvodnog naloga" />
      <div className="p-6">
        <Link to="/production/work-orders" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Nazad
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Osnovni podaci</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Proizvod *</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger><SelectValue placeholder="Odaberi" /></SelectTrigger>
                    <SelectContent>
                      {items?.map((i) => <SelectItem key={i.id} value={i.id}>{i.code} - {i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sastavnica (BOM)</Label>
                  <Select value={bomId} onValueChange={setBomId}>
                    <SelectTrigger><SelectValue placeholder="Bez BOM-a" /></SelectTrigger>
                    <SelectContent>
                      {filteredBoms?.map((b) => <SelectItem key={b.id} value={b.id}>{b.code} - {b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Količina</Label><Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
                  <div>
                    <Label>Lokacija</Label>
                    <Select value={locationId} onValueChange={setLocationId}>
                      <SelectTrigger><SelectValue placeholder="Odaberi" /></SelectTrigger>
                      <SelectContent>
                        {locations?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Plan. start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
                  <div><Label>Plan. end</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
                </div>
                <div><Label>Napomena</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader><CardTitle>Akcije</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={submit} disabled={!productId || createWO.isPending}>
                  <Save className="h-4 w-4 mr-2" /> Spremi
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
