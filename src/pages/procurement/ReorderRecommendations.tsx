import { useMemo, useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, ShoppingCart, Info, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { useReorderRecommendations, ReorderRecommendation } from '@/hooks/useReorderRecommendations';
import { useLocations, usePartners } from '@/hooks/useMasterData';
import { useGeneratePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useToast } from '@/hooks/use-toast';

const urgencyColor: Record<string, any> = {
  critical: 'destructive',
  high: 'default',
  normal: 'secondary',
  low: 'outline',
};
const urgencyLabel: Record<string, string> = {
  critical: 'Kritično',
  high: 'Visoko',
  normal: 'Normalno',
  low: 'Nisko',
};

export default function ReorderRecommendations() {
  const [locationId, setLocationId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, { qty: number; supplierId: string | null }>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: locations } = useLocations();
  const { data: partners } = usePartners('supplier');
  const { data: recs, isLoading } = useReorderRecommendations(locationId || undefined);
  const generate = useGeneratePurchaseOrders();
  const { toast } = useToast();

  // Initialize overrides whenever data refreshes
  useEffect(() => {
    if (!recs) return;
    setOverrides((prev) => {
      const next = { ...prev };
      recs.forEach((r) => {
        const key = `${r.item_id}|${r.location_id}`;
        if (!next[key]) {
          next[key] = { qty: r.recommended_quantity, supplierId: r.preferred_supplier_id };
        }
      });
      return next;
    });
  }, [recs]);

  const filtered = useMemo(() => {
    return (recs || []).filter((r) => {
      if (onlyPromo && !r.has_active_promo) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.item_code.toLowerCase().includes(q) || r.item_name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [recs, search, onlyPromo]);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => `${r.item_id}|${r.location_id}`)));
  };

  const totalValue = useMemo(() => {
    return Array.from(selected).reduce((sum, key) => {
      const r = filtered.find((x) => `${x.item_id}|${x.location_id}` === key);
      const o = overrides[key];
      if (!r || !o) return sum;
      return sum + o.qty * r.purchase_price;
    }, 0);
  }, [selected, filtered, overrides]);

  const handleGenerate = async () => {
    const items = Array.from(selected)
      .map((key) => {
        const r = filtered.find((x) => `${x.item_id}|${x.location_id}` === key);
        const o = overrides[key];
        if (!r || !o || o.qty <= 0) return null;
        return {
          item_id: r.item_id,
          item_code: r.item_code,
          item_name: r.item_name,
          location_id: r.location_id,
          location_name: r.location_name,
          current_quantity: r.current_quantity,
          min_stock: r.min_stock,
          order_quantity: o.qty,
          purchase_price: r.purchase_price,
          preferred_supplier_id: o.supplierId,
        };
      })
      .filter(Boolean) as any[];

    if (!items.length) {
      toast({ title: 'Nema odabranih', description: 'Odaberi najmanje jedan artikl.', variant: 'destructive' });
      return;
    }
    await generate.mutateAsync(items);
    setSelected(new Set());
  };

  const stats = useMemo(() => {
    const critical = (recs || []).filter((r) => r.urgency === 'critical').length;
    const high = (recs || []).filter((r) => r.urgency === 'high').length;
    const promo = (recs || []).filter((r) => r.has_active_promo).length;
    return { critical, high, promo, total: recs?.length || 0 };
  }, [recs]);

  return (
    <TooltipProvider>
      <Header title="AI preporuka narudžbi" subtitle="Inteligentne preporuke uz historijske podatke, sezonalnost, promo aktivnosti i forecasting" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ukupno preporuka</CardTitle>
              <Brain className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kritično</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-destructive">{stats.critical}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Visok prioritet</CardTitle>
              <TrendingUp className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.high}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pod promo akcijom</CardTitle>
              <Sparkles className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.promo}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <CardTitle>Preporuke ({filtered.length})</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="Pretraži..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
                <Select value={locationId || 'all'} onValueChange={(v) => setLocationId(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Sve lokacije" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Sve lokacije</SelectItem>
                    {locations?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={onlyPromo} onCheckedChange={(v) => setOnlyPromo(!!v)} />
                  Samo promo
                </label>
                <Button onClick={handleGenerate} disabled={selected.size === 0 || generate.isPending}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Generiraj PO ({selected.size}) — {totalValue.toFixed(2)} KM
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nema preporuka. Sve zalihe su iznad sigurnosnog praga.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selected.size === filtered.length && filtered.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Artikl</TableHead>
                      <TableHead>Lokacija</TableHead>
                      <TableHead className="text-right">Stanje</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead className="text-right">Pokrivenost</TableHead>
                      <TableHead className="text-right">Predviđena potrošnja</TableHead>
                      <TableHead className="text-right">Preporuka</TableHead>
                      <TableHead>Količina</TableHead>
                      <TableHead>Dobavljač</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const key = `${r.item_id}|${r.location_id}`;
                      const ov = overrides[key] || { qty: r.recommended_quantity, supplierId: r.preferred_supplier_id };
                      return (
                        <TableRow key={key}>
                          <TableCell>
                            <Checkbox
                              checked={selected.has(key)}
                              onCheckedChange={(v) => {
                                const next = new Set(selected);
                                if (v) next.add(key); else next.delete(key);
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
                          <TableCell className="text-right">{r.available_quantity.toFixed(0)}</TableCell>
                          <TableCell className="text-right">{r.min_stock || '-'}</TableCell>
                          <TableCell className="text-right">{r.turnover_days >= 9999 ? '∞' : `${r.turnover_days}d`}</TableCell>
                          <TableCell className="text-right">{r.forecast_demand}</TableCell>
                          <TableCell className="text-right font-semibold">{r.recommended_quantity}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={ov.qty}
                              onChange={(e) => setOverrides({ ...overrides, [key]: { ...ov, qty: Number(e.target.value) } })}
                              className="w-20 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={ov.supplierId || 'none'}
                              onValueChange={(v) => setOverrides({ ...overrides, [key]: { ...ov, supplierId: v === 'none' ? null : v } })}
                            >
                              <SelectTrigger className="w-44 h-8"><SelectValue placeholder="Bez dobavljača" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Bez dobavljača</SelectItem>
                                {partners?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant={urgencyColor[r.urgency]}>{urgencyLabel[r.urgency]}</Badge>
                            <div className="text-xs text-muted-foreground mt-1">Pouzdanost: {r.confidence}</div>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="text-xs space-y-1">
                                  {r.reasoning.map((x, i) => <div key={i}>• {x}</div>)}
                                  <div className="pt-1 border-t mt-1">
                                    Sigurnosna zaliha: {r.safety_stock} · Lead time: {r.lead_time_days}d
                                  </div>
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
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
