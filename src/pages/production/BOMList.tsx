import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Plus, Package, X } from "lucide-react";
import { useState } from "react";
import { useBOMs, useCreateBOM, BOMItem } from "@/hooks/useProduction";
import { useItems } from "@/hooks/useMasterData";

export default function BOMList() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: boms, isLoading } = useBOMs();
  const { data: items } = useItems();
  const createBOM = useCreateBOM();

  const itemMap = new Map(items?.map((i) => [i.id, i]));

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [outputQty, setOutputQty] = useState(1);
  const [desc, setDesc] = useState("");
  const [bomItems, setBomItems] = useState<BOMItem[]>([{ component_item_id: "", quantity: 1 }]);

  const filtered = boms?.filter((b) =>
    b.code.toLowerCase().includes(search.toLowerCase()) ||
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const addLine = () => setBomItems((p) => [...p, { component_item_id: "", quantity: 1 }]);
  const removeLine = (i: number) => setBomItems((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<BOMItem>) =>
    setBomItems((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    if (!code || !name || !productId) return;
    await createBOM.mutateAsync({
      header: { code, name, product_item_id: productId, output_quantity: outputQty, description: desc },
      items: bomItems.filter((b) => b.component_item_id),
    });
    setOpen(false);
    setCode(""); setName(""); setProductId(""); setOutputQty(1); setDesc("");
    setBomItems([{ component_item_id: "", quantity: 1 }]);
  };

  return (
    <div>
      <Header title="Sastavnice (BOM)" subtitle="Bill of Materials" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pretraži..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nova sastavnica</Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Sastavnice ({filtered?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-center py-8 text-muted-foreground">Učitavanje...</p> :
             !filtered?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nema sastavnica</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Šifra</TableHead>
                    <TableHead>Naziv</TableHead>
                    <TableHead>Proizvod</TableHead>
                    <TableHead>Izlazna količina</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => {
                    const it = itemMap.get(b.product_item_id);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono">{b.code}</TableCell>
                        <TableCell>{b.name}</TableCell>
                        <TableCell>{it ? `${it.code} - ${it.name}` : "-"}</TableCell>
                        <TableCell>{b.output_quantity}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova sastavnica</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Šifra *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} /></div>
              <div><Label>Naziv *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Proizvod *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Odaberi" /></SelectTrigger>
                  <SelectContent>
                    {items?.map((i) => <SelectItem key={i.id} value={i.id}>{i.code} - {i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Izlazna količina</Label><Input type="number" value={outputQty} onChange={(e) => setOutputQty(Number(e.target.value))} /></div>
            </div>
            <div><Label>Opis</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Komponente</Label>
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Dodaj</Button>
              </div>
              {bomItems.map((b, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                  <div className="col-span-8">
                    <Select value={b.component_item_id} onValueChange={(v) => updateLine(i, { component_item_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Komponenta" /></SelectTrigger>
                      <SelectContent>
                        {items?.map((it) => <SelectItem key={it.id} value={it.id}>{it.code} - {it.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input type="number" placeholder="Količina" value={b.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeLine(i)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Odustani</Button>
            <Button onClick={submit} disabled={createBOM.isPending}>Spremi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
