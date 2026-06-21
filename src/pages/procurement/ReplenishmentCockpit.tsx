import { useMemo, useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain, ShoppingCart, Info, AlertTriangle, TrendingUp, Sparkles,
  ArrowLeftRight, Truck, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { useReorderRecommendations, ReorderRecommendation } from '@/hooks/useReorderRecommendations';
import { useLocations } from '@/hooks/useMasterData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const urgencyColor: Record<string, any> = {
  critical: 'destructive', high: 'default', normal: 'secondary', low: 'outline',
};
const urgencyLabel: Record<string, string> = {
  critical: 'Kritično', high: 'Visoko', normal: 'Normalno', low: 'Nisko',
};

type Override = { qty: number; supplierId: string | null; sourceId: string | null };

export default function ReplenishmentCockpit() {
  const [search, setSearch] = useState('');
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'supplier' | 'transfer' | 'mobile'>('supplier');
  const [busy, setBusy] = useState(false);

  const { data: locations } = useLocations();
  const { data: recs, isLoading, refetch } = useReorderRecommendations();
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (!recs) return;
    setOverrides((prev) => {
      const next = { ...prev };
      recs.forEach((r) => {
        const k = `${r.item_id}|${r.location_id}`;
        if (!next[k]) next[k] = {
          qty: r.recommended_quantity,
          supplierId: r.preferred_supplier_id,
          sourceId: r.source_location_id,
        };
      });
      return next;
    });
  }, [recs]);

  // Split recommendations into 3 buckets
  const buckets = useMemo(() => {
    const supplier: ReorderRecommendation[] = [];
    const transfer: ReorderRecommendation[] = [];
    const mobile: ReorderRecommendation[] = [];
    (recs || []).forEach((r) => {
      if (r.recommended_quantity <= 0) return;
      if (r.location_type === 'mobile') mobile.push(r);
      else if (r.routing === 'transfer' && r.source_location_id) transfer.push(r);
      else supplier.push(r);
    });
    return { supplier, transfer, mobile };
  }, [recs]);

  const current = buckets[tab];

  const filtered = useMemo(() => {
    if (!search) return current;
    const q = search.toLowerCase();
    return current.filter((r) =>
      r.item_code.toLowerCase().includes(q) ||
      r.item_name.toLowerCase().includes(q) ||
      r.location_name.toLowerCase().includes(q)
    );
  }, [current, search]);

  const toggleAll = () => {
    if (filtered.every((r) => selected.has(`${r.item_id}|${r.location_id}`))) {
      const next = new Set(selected);
      filtered.forEach((r) => next.delete(`${r.item_id}|${r.location_id}`));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((r) => next.add(`${r.item_id}|${r.location_id}`));
      setSelected(next);
    }
  };

  // ---- Bulk create PR (supplier route) ----
  const createPurchaseRequests = async () => {
    setBusy(true);
    try {
      const items = filtered.filter((r) => selected.has(`${r.item_id}|${r.location_id}`));
      if (!items.length) {
        toast({ title: 'Nema odabranih', variant: 'destructive' });
        return;
      }
      // Group by supplier
      const groups = new Map<string, ReorderRecommendation[]>();
      items.forEach((r) => {
        const key = (overrides[`${r.item_id}|${r.location_id}`]?.supplierId) || r.preferred_supplier_id || 'none';
        const arr = groups.get(key) || [];
        arr.push(r);
        groups.set(key, arr);
      });

      let created = 0;
      for (const [supplierId, lines] of groups.entries()) {
        const { count } = await supabase.from('purchase_requests').select('*', { count: 'exact', head: true });
        const reqNumber = `PR-${new Date().getFullYear()}-${String((count || 0) + created + 1).padStart(5, '0')}`;
        const totalEst = lines.reduce((s, r) => {
          const ov = overrides[`${r.item_id}|${r.location_id}`];
          return s + (ov?.qty ?? r.recommended_quantity) * r.purchase_price;
        }, 0);
        const { data: pr, error } = await supabase.from('purchase_requests').insert({
          request_number: reqNumber,
          partner_id: supplierId === 'none' ? null : supplierId,
          location_id: lines[0].location_id,
          status: 'draft',
          priority: lines.some((r) => r.urgency === 'critical') ? 'high' : 'normal',
          notes: `Auto-generirano iz Replenishment Cockpit-a (AI preporuka)`,
          total_estimated_value: totalEst,
        }).select('id').single();
        if (error) throw error;
        const lineRows = lines.map((r) => {
          const ov = overrides[`${r.item_id}|${r.location_id}`];
          const qty = ov?.qty ?? r.recommended_quantity;
          return {
            request_id: pr.id,
            item_id: r.item_id,
            quantity: qty,
            estimated_unit_price: r.purchase_price,
            estimated_total: qty * r.purchase_price,
            notes: r.reasoning.slice(0, 3).join(' | '),
          };
        });
        await supabase.from('purchase_request_lines').insert(lineRows);
        created++;
      }
      await supabase.from('replenishment_runs').insert({
        triggered_by: 'manual',
        total_suggestions: items.length,
        po_drafts_created: created,
        transfer_drafts_created: 0,
      });
      toast({ title: `Kreirano ${created} zahtjeva za nabavku`, description: `${items.length} stavki` });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['purchase-requests'] });
    } catch (e: any) {
      toast({ title: 'Greška', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // ---- Bulk create transfer documents (transfer route) ----
  const createTransfers = async () => {
    setBusy(true);
    try {
      const items = filtered.filter((r) => selected.has(`${r.item_id}|${r.location_id}`));
      if (!items.length) {
        toast({ title: 'Nema odabranih', variant: 'destructive' });
        return;
      }
      // Group by (source -> target)
      const groups = new Map<string, ReorderRecommendation[]>();
      items.forEach((r) => {
        const ov = overrides[`${r.item_id}|${r.location_id}`];
        const src = ov?.sourceId || r.source_location_id;
        if (!src) return;
        const k = `${src}|${r.location_id}`;
        const arr = groups.get(k) || [];
        arr.push(r);
        groups.set(k, arr);
      });
      let created = 0;
      const year = new Date().getFullYear();
      for (const [k, lines] of groups.entries()) {
        const [src, tgt] = k.split('|');
        const { count } = await supabase
          .from('warehouse_documents')
          .select('*', { count: 'exact', head: true })
          .eq('document_type', 'transfer');
        const docNumber = `TR-${year}-${String((count || 0) + created + 1).padStart(5, '0')}`;
        const totalValue = lines.reduce((s, r) => {
          const ov = overrides[`${r.item_id}|${r.location_id}`];
          return s + (ov?.qty ?? r.recommended_quantity) * r.purchase_price;
        }, 0);
        const { data: doc, error } = await supabase.from('warehouse_documents').insert({
          document_type: 'transfer',
          document_number: docNumber,
          location_id: src,
          target_location_id: tgt,
          status: 'draft',
          notes: 'Auto-generirano iz Replenishment Cockpit-a',
          total_value: totalValue,
        }).select('id').single();
        if (error) throw error;
        const lineRows = lines.map((r) => {
          const ov = overrides[`${r.item_id}|${r.location_id}`];
          const qty = ov?.qty ?? r.recommended_quantity;
          return {
            document_id: doc.id,
            item_id: r.item_id,
            quantity: qty,
            unit_price: r.purchase_price,
            total_price: qty * r.purchase_price,
          };
        });
        await supabase.from('warehouse_document_lines').insert(lineRows);
        created++;
      }
      await supabase.from('replenishment_runs').insert({
        triggered_by: 'manual',
        total_suggestions: items.length,
        po_drafts_created: 0,
        transfer_drafts_created: created,
      });
      toast({ title: `Kreirano ${created} transfer dokumenata`, description: `${items.length} stavki` });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['warehouse-documents'] });
    } catch (e: any) {
      toast({ title: 'Greška', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleAction = () => {
    if (tab === 'transfer') return createTransfers();
    return createPurchaseRequests();
  };

  const stats = useMemo(() => ({
    supplier: buckets.supplier.length,
    transfer: buckets.transfer.length,
    mobile: buckets.mobile.length,
    critical: (recs || []).filter((r) => r.urgency === 'critical').length,
  }), [buckets, recs]);

  return (
    <TooltipProvider>
      <Header
        title="Replenishment Cockpit"
        subtitle="Jedinstveni AI dispečer: nabavka, interni transferi, ambulantna dostava"
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Nabavka</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.supplier}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transferi</CardTitle>
              <ArrowLeftRight className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.transfer}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ambulantna</CardTitle>
              <Truck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.mobile}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kritično</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-destructive">{stats.critical}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI prijedlozi
              </CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Pretraži..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
                <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Osvježi
                </Button>
                <Button onClick={handleAction} disabled={selected.size === 0 || busy}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {tab === 'transfer'
                    ? `Kreiraj transfere (${selected.size})`
                    : `Kreiraj zahtjeve (${selected.size})`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setSelected(new Set()); }}>
              <TabsList>
                <TabsTrigger value="supplier">
                  <ShoppingCart className="h-4 w-4 mr-2" /> Dobavljač ({buckets.supplier.length})
                </TabsTrigger>
                <TabsTrigger value="transfer">
                  <ArrowLeftRight className="h-4 w-4 mr-2" /> Transfer ({buckets.transfer.length})
                </TabsTrigger>
                <TabsTrigger value="mobile">
                  <Truck className="h-4 w-4 mr-2" /> Ambulanta ({buckets.mobile.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="mt-4">
                {isLoading ? (
                  <Skeleton className="h-64" />
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nema preporuka u ovoj kategoriji.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={filtered.every((r) => selected.has(`${r.item_id}|${r.location_id}`))}
                              onCheckedChange={toggleAll}
                            />
                          </TableHead>
                          <TableHead>Artikl</TableHead>
                          <TableHead>Odredište</TableHead>
                          {tab === 'transfer' && <TableHead>Izvor (centralno)</TableHead>}
                          <TableHead className="text-right">Stanje</TableHead>
                          <TableHead className="text-right">Min</TableHead>
                          <TableHead className="text-right">Preporuka</TableHead>
                          <TableHead>Količina</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((r) => {
                          const k = `${r.item_id}|${r.location_id}`;
                          const ov = overrides[k] || { qty: r.recommended_quantity, supplierId: r.preferred_supplier_id, sourceId: r.source_location_id };
                          return (
                            <TableRow key={k}>
                              <TableCell>
                                <Checkbox
                                  checked={selected.has(k)}
                                  onCheckedChange={(v) => {
                                    const next = new Set(selected);
                                    if (v) next.add(k); else next.delete(k);
                                    setSelected(next);
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{r.item_name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{r.item_code}</div>
                                {r.has_active_promo && (
                                  <Badge variant="outline" className="mt-1"><Sparkles className="h-3 w-3 mr-1" />Promo</Badge>
                                )}
                              </TableCell>
                              <TableCell>{r.location_name}</TableCell>
                              {tab === 'transfer' && (
                                <TableCell>
                                  <Select
                                    value={ov.sourceId || ''}
                                    onValueChange={(v) => setOverrides({ ...overrides, [k]: { ...ov, sourceId: v } })}
                                  >
                                    <SelectTrigger className="w-44 h-8">
                                      <SelectValue placeholder="Izaberi izvor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {locations?.filter((l: any) => l.id !== r.location_id).map((l) => (
                                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {r.source_available > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Raspoloživo: {r.source_available.toFixed(0)}
                                    </div>
                                  )}
                                </TableCell>
                              )}
                              <TableCell className="text-right">{r.available_quantity.toFixed(0)}</TableCell>
                              <TableCell className="text-right">{r.min_stock || '-'}</TableCell>
                              <TableCell className="text-right font-semibold">{r.recommended_quantity}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  value={ov.qty}
                                  onChange={(e) => setOverrides({ ...overrides, [k]: { ...ov, qty: Number(e.target.value) } })}
                                  className="w-20 h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant={urgencyColor[r.urgency]}>{urgencyLabel[r.urgency]}</Badge>
                              </TableCell>
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="text-xs space-y-1">
                                      {r.reasoning.map((x, i) => <div key={i}>• {x}</div>)}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
