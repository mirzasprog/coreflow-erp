import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Play, Loader2, Warehouse, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type Loc = { id: string; name: string; type: string | null; is_central: boolean | null };
type Run = { id: string; triggered_by: string; total_suggestions: number; po_drafts_created: number; transfer_drafts_created: number; created_at: string };

export default function ReplenishmentSettings({ onChanged }: { onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const loadAll = async () => {
    const [{ data: locs }, { data: rs }] = await Promise.all([
      supabase.from('locations').select('id, name, type, is_central').eq('active', true).order('name'),
      supabase.from('replenishment_runs').select('*').order('created_at', { ascending: false }).limit(5),
    ]);
    setLocations((locs || []) as any);
    setRuns((rs || []) as any);
  };

  useEffect(() => { if (open) loadAll(); }, [open]);

  const toggleCentral = async (loc: Loc, value: boolean) => {
    setSavingId(loc.id);
    const { error } = await supabase.from('locations').update({ is_central: value }).eq('id', loc.id);
    setSavingId(null);
    if (error) { toast({ title: 'Greška', description: error.message, variant: 'destructive' }); return; }
    setLocations((prev) => prev.map((l) => (l.id === loc.id ? { ...l, is_central: value } : l)));
    onChanged?.();
  };

  const bulkMarkWarehousesCentral = async () => {
    setBulkBusy('warehouses');
    const { error } = await supabase.from('locations').update({ is_central: true }).eq('type', 'warehouse').eq('active', true);
    setBulkBusy(null);
    if (error) { toast({ title: 'Greška', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Sva skladišta označena kao centralna' });
    await loadAll();
    onChanged?.();
  };

  const bulkResetItemsToAuto = async () => {
    setBulkBusy('items');
    const { error } = await supabase.from('items').update({ replenishment_source: 'auto' }).is('replenishment_source', null);
    setBulkBusy(null);
    if (error) { toast({ title: 'Greška', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Artikli bez izvora postavljeni na "auto"' });
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-replenishment', { body: { triggered_by: 'manual' } });
      if (error) throw error;
      toast({
        title: 'Replenishment pokrenut',
        description: `Prijedlozi: ${data?.total_suggestions ?? 0} • PR: ${data?.pr_created ?? 0} • Transferi: ${data?.transfer_created ?? 0}`,
      });
      await loadAll();
      qc.invalidateQueries({ queryKey: ['reorder-recommendations'] });
      qc.invalidateQueries({ queryKey: ['purchase-requests'] });
      qc.invalidateQueries({ queryKey: ['warehouse-documents'] });
      onChanged?.();
    } catch (e: any) {
      toast({ title: 'Greška', description: e.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline"><Settings className="h-4 w-4 mr-2" />Postavke</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Replenishment postavke</SheetTitle>
          <SheetDescription>
            Konfiguriraj centralna skladišta, pokreni AI generiranje na zahtjev i pregledaj historiju automatskih ciklusa (cron 06:00).
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2"><Play className="h-4 w-4" /> Manualni pokretač</h4>
            <Button onClick={runNow} disabled={running} className="w-full">
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Pokreni Auto-replenishment sada
            </Button>
            <p className="text-xs text-muted-foreground">
              Edge funkcija generira draft zahtjeve za nabavku i transfer dokumente. Cron job radi automatski svaki dan u 06:00.
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2"><Warehouse className="h-4 w-4" /> Centralna skladišta</h4>
            <p className="text-xs text-muted-foreground">
              Lokacije označene kao centralne služe kao izvor za interne transfere prema prodavaonicama i ambulanti. Fallback: ako artikl nema definiran izvor (replenishment_source = auto), sistem koristi centralna skladišta.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={bulkMarkWarehousesCentral} disabled={bulkBusy === 'warehouses'}>
                {bulkBusy === 'warehouses' && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                Označi sva skladišta kao centralna
              </Button>
              <Button size="sm" variant="secondary" onClick={bulkResetItemsToAuto} disabled={bulkBusy === 'items'}>
                {bulkBusy === 'items' && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                Artikle bez izvora → "auto"
              </Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border p-2">
              {locations.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/40">
                  <div>
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">{l.type || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.is_central && <Badge variant="secondary">Centralno</Badge>}
                    <Switch
                      checked={!!l.is_central}
                      onCheckedChange={(v) => toggleCentral(l, v)}
                      disabled={savingId === l.id}
                    />
                  </div>
                </div>
              ))}
              {locations.length === 0 && <div className="text-xs text-muted-foreground p-2">Nema lokacija.</div>}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Posljednji ciklusi</h4>
            <div className="space-y-1">
              {runs.length === 0 && <div className="text-xs text-muted-foreground">Nema zabilježenih ciklusa.</div>}
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b py-1.5">
                  <div>
                    <Badge variant={r.triggered_by === 'cron' ? 'default' : 'secondary'} className="mr-2">{r.triggered_by}</Badge>
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString('hr-HR')}</span>
                  </div>
                  <Label className="text-xs">
                    {r.total_suggestions} • PR {r.po_drafts_created} • TR {r.transfer_drafts_created}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
