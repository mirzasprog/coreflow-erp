import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, FileText, Check, X, ArrowRight, Brain, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePartners, useLocations, useItems } from "@/hooks/useMasterData";
import {
  usePurchaseRequests,
  useCreatePurchaseRequest,
  useUpdatePRStatus,
  useConvertPRToPO,
  PurchaseRequestLine,
} from "@/hooks/usePurchaseRequests";
import { useReorderRecommendations } from "@/hooks/useReorderRecommendations";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const statusLabels: Record<string, { label: string; variant: any }> = {
  draft: { label: "Skica", variant: "secondary" },
  submitted: { label: "Poslano", variant: "default" },
  approved: { label: "Odobreno", variant: "default" },
  rejected: { label: "Odbijeno", variant: "destructive" },
  converted: { label: "U narudžbi", variant: "outline" },
};

export default function PurchaseRequests() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: requests, isLoading } = usePurchaseRequests();
  const { data: partners } = usePartners("supplier");
  const { data: locations } = useLocations();
  const { data: items } = useItems();
  const createPR = useCreatePurchaseRequest();
  const updateStatus = useUpdatePRStatus();
  const convert = useConvertPRToPO();
  const { toast } = useToast();

  const [partnerId, setPartnerId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [neededBy, setNeededBy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<PurchaseRequestLine[]>([
    { item_id: null, quantity: 1, estimated_unit_price: 0, estimated_total: 0 },
  ]);
  const [aiNotice, setAiNotice] = useState<string>("");

  const { data: recommendations, isFetching: loadingRecs, refetch: refetchRecs } =
    useReorderRecommendations(locationId || undefined);

  const applyAiSuggestions = async () => {
    if (!locationId) {
      toast({ title: "Odaberi lokaciju", description: "AI prijedlog koristi lokaciju za izračun zaliha.", variant: "destructive" });
      return;
    }
    const res = await refetchRecs();
    let recs = res.data || recommendations || [];
    if (partnerId) recs = recs.filter((r) => r.preferred_supplier_id === partnerId);
    recs = recs.filter((r) => r.recommended_quantity > 0);
    if (!recs.length) {
      toast({ title: "Nema preporuka", description: partnerId ? "Za odabranog dobavljača nema preporuka." : "Trenutno nema artikala za naručivanje." });
      return;
    }
    const newLines: PurchaseRequestLine[] = recs.map((r) => ({
      item_id: r.item_id,
      quantity: r.recommended_quantity,
      estimated_unit_price: r.purchase_price,
      estimated_total: r.recommended_quantity * r.purchase_price,
    }));
    setLines(newLines);
    const critical = recs.filter((r) => r.urgency === "critical").length;
    const promo = recs.filter((r) => r.has_active_promo).length;
    setAiNotice(`AI prijedlog: ${recs.length} artikala (kritično: ${critical}, promo: ${promo}). Sezonalnost, trend i min/max su uzeti u obzir.`);
    toast({ title: "Primjenjen AI prijedlog", description: `${recs.length} artikala dodano. Količine možete korigirati.` });
  };

  const filtered = requests?.filter((r) =>
    r.request_number.toLowerCase().includes(search.toLowerCase())
  );

  const updateLine = (idx: number, patch: Partial<PurchaseRequestLine>) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const merged = { ...l, ...patch };
        merged.estimated_total = (Number(merged.quantity) || 0) * (Number(merged.estimated_unit_price) || 0);
        return merged;
      })
    );
  };

  const addLine = () =>
    setLines((p) => [...p, { item_id: null, quantity: 1, estimated_unit_price: 0, estimated_total: 0 }]);
  const removeLine = (idx: number) => setLines((p) => p.filter((_, i) => i !== idx));

  const submit = async (status: "draft" | "submitted") => {
    await createPR.mutateAsync({
      header: {
        partner_id: partnerId || null,
        location_id: locationId || null,
        needed_by_date: neededBy || null,
        notes,
        status,
      },
      lines: lines.filter((l) => l.item_id),
    });
    setOpen(false);
    setLines([{ item_id: null, quantity: 1, estimated_unit_price: 0, estimated_total: 0 }]);
    setPartnerId("");
    setLocationId("");
    setNeededBy("");
    setNotes("");
    setAiNotice("");
  };

  return (
    <div>
      <Header title="Zahtjevi za nabavu" subtitle="Upravljanje zahtjevima za nabavku" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pretraži zahtjeve..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novi zahtjev
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Zahtjevi ({filtered?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Učitavanje...</p>
            ) : !filtered?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nema zahtjeva</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Broj</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Dobavljač</TableHead>
                    <TableHead>Lokacija</TableHead>
                    <TableHead>Vrijednost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const s = statusLabels[r.status] || { label: r.status, variant: "secondary" };
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono">{r.request_number}</TableCell>
                        <TableCell>{r.request_date}</TableCell>
                        <TableCell>{r.partners?.name || "-"}</TableCell>
                        <TableCell>{r.locations?.name || "-"}</TableCell>
                        <TableCell>{Number(r.total_estimated_value).toFixed(2)} KM</TableCell>
                        <TableCell>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </TableCell>
                        <TableCell className="flex gap-1">
                          {r.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: "submitted" })}>
                              Pošalji
                            </Button>
                          )}
                          {r.status === "submitted" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: "approved" })}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <Button size="sm" onClick={() => convert.mutate(r.id)}>
                              <ArrowRight className="h-3 w-3 mr-1" /> u PO
                            </Button>
                          )}
                          {r.converted_po_id && (
                            <Button size="sm" variant="ghost" asChild>
                              <Link to={`/warehouse/purchase-orders/${r.converted_po_id}`}>PO</Link>
                            </Button>
                          )}
                        </TableCell>
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
          <DialogHeader>
            <DialogTitle>Novi zahtjev za nabavu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Dobavljač</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger><SelectValue placeholder="Odaberi" /></SelectTrigger>
                  <SelectContent>
                    {partners?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lokacija</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger><SelectValue placeholder="Odaberi" /></SelectTrigger>
                  <SelectContent>
                    {locations?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Potrebno do</Label>
                <Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Napomena</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="rounded-md border bg-muted/40 p-3 flex items-start justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> AI prijedlog stavki</div>
                <div className="text-muted-foreground text-xs mt-1">
                  Koristi historijske podatke, sezonalnost, trend, promo aktivnosti i min/max zalihu da predloži artikle i količine.
                  {partnerId ? " Filter: samo artikli odabranog dobavljača." : ""}
                </div>
                {aiNotice && <div className="text-xs mt-1 text-foreground">{aiNotice}</div>}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="secondary" onClick={applyAiSuggestions} disabled={loadingRecs || !locationId}>
                      {loadingRecs ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Brain className="h-3 w-3 mr-1" />}
                      Primijeni AI prijedlog
                    </Button>
                  </TooltipTrigger>
                  {!locationId && <TooltipContent>Prvo odaberi lokaciju</TooltipContent>}
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Stavke</Label>
                <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Dodaj</Button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Select value={l.item_id || ""} onValueChange={(v) => updateLine(i, { item_id: v, estimated_unit_price: items?.find((it) => it.id === v)?.purchase_price || 0, estimated_total: (items?.find((it) => it.id === v)?.purchase_price || 0) * l.quantity })}>
                        <SelectTrigger><SelectValue placeholder="Artikl" /></SelectTrigger>
                        <SelectContent>
                          {items?.map((it) => <SelectItem key={it.id} value={it.id}>{it.code} - {it.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Količina" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Cijena" value={l.estimated_unit_price} onChange={(e) => updateLine(i, { estimated_unit_price: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2 text-sm">{l.estimated_total.toFixed(2)} KM</div>
                    <Button size="sm" variant="ghost" onClick={() => removeLine(i)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => submit("draft")} disabled={createPR.isPending}>Spremi skicu</Button>
            <Button onClick={() => submit("submitted")} disabled={createPR.isPending}>Pošalji na odobrenje</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
