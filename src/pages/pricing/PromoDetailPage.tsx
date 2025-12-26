import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NavLink } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, CheckCircle, AlertTriangle, XCircle, Loader2, Calendar, MapPin, Tag, Percent, Lock } from 'lucide-react';
import { usePromoActivity, useAddPromoItem, useUpdatePromoActivity, analyzePriceWithAI } from '@/hooks/usePriceManagement';
import { useItems } from '@/hooks/useMasterData';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  draft: 'secondary',
  completed: 'outline',
  cancelled: 'destructive'
};

const statusLabels: Record<string, string> = {
  active: 'Aktivna',
  draft: 'Priprema',
  completed: 'Završena',
  cancelled: 'Otkazana'
};

export default function PromoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: promo, isLoading } = usePromoActivity(id);
  const { data: allItems } = useItems();
  const addPromoItem = useAddPromoItem();
  const updatePromo = useUpdatePromoActivity();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const existingItemIds = promo?.promo_items?.map((pi: any) => pi.item_id) || [];
  const availableItems = allItems?.filter(item => !existingItemIds.includes(item.id));
  const selectedItem = allItems?.find(i => i.id === selectedItemId);

  const handleAnalyzePrice = async () => {
    if (!selectedItem || !promoPrice) return;
    setIsAnalyzing(true);
    setAiResult(null);
    try {
      const result = await analyzePriceWithAI({
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        currentPrice: selectedItem.selling_price || 0,
        proposedPrice: parseFloat(promoPrice),
        purchasePrice: selectedItem.purchase_price || 0,
        isWeekend: promo?.is_weekend_only,
        isHoliday: promo?.is_holiday_promo,
        season: promo?.season,
        promoType: promo?.promo_type
      });
      setAiResult(result);
    } catch (error: any) {
      toast({ title: 'Greška AI analize', description: error.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedItemId || !promoPrice || !id || !selectedItem) return;
    try {
      await addPromoItem.mutateAsync({
        promo_activity_id: id,
        item_id: selectedItemId,
        original_price: selectedItem.selling_price || 0,
        promo_price: parseFloat(promoPrice),
        ai_suggested_price: aiResult?.suggestedPrice,
        ai_suggestion_reason: aiResult?.reasoning
      });
      toast({ title: 'Uspješno', description: 'Artikal dodan u promociju' });
      setIsAddDialogOpen(false);
      setSelectedItemId('');
      setPromoPrice('');
      setAiResult(null);
    } catch (error: any) {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    if (promo?.status !== 'draft' && newStatus !== promo?.status) {
      // Can only change status from draft, or cancel active promo
      if (promo?.status === 'active' && newStatus !== 'cancelled') {
        toast({ title: 'Greška', description: 'Aktivna promocija se može samo otkazati', variant: 'destructive' });
        return;
      }
      if (promo?.status === 'completed' || promo?.status === 'cancelled') {
        toast({ title: 'Greška', description: 'Završena ili otkazana promocija se ne može mijenjati', variant: 'destructive' });
        return;
      }
    }
    try {
      await updatePromo.mutateAsync({ id, status: newStatus });
      toast({ title: 'Uspješno', description: 'Status promocije ažuriran' });
    } catch (error: any) {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
    }
  };

  const isLocked = promo?.status !== 'draft';

  if (isLoading || !promo) {
    return <div className="flex items-center justify-center p-12"><div className="text-muted-foreground">Učitavanje...</div></div>;
  }

  const promoLocations = promo.promo_activity_locations || [];

  return (
    <div>
      <Header title={promo.name} subtitle={`Promocija ${promo.code}`} />
      <div className="p-6 space-y-6">
        <NavLink to="/pricing/promos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Nazad
        </NavLink>

        {/* Promo Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Detalji Promocije
              </CardTitle>
              <div className="flex items-center gap-2">
                {promo.status === 'draft' ? (
                  <Select value={promo.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Priprema</SelectItem>
                      <SelectItem value="active">Aktivna</SelectItem>
                      <SelectItem value="cancelled">Otkazana</SelectItem>
                    </SelectContent>
                  </Select>
                ) : promo.status === 'active' ? (
                  <Button variant="destructive" size="sm" onClick={() => handleStatusChange('cancelled')}>
                    Otkaži promociju
                  </Button>
                ) : null}
                <Badge variant={statusColors[promo.status] || 'secondary'}>
                  {statusLabels[promo.status] || promo.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Period</div>
                  <div className="font-medium">
                    {format(new Date(promo.start_date), 'dd.MM.yyyy')} - {format(new Date(promo.end_date), 'dd.MM.yyyy')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Percent className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Popust</div>
                  <div className="font-medium">
                    {promo.discount_percent && `${promo.discount_percent}%`}
                    {promo.discount_percent && promo.discount_amount && ' / '}
                    {promo.discount_amount && `${promo.discount_amount} KM`}
                    {!promo.discount_percent && !promo.discount_amount && 'Nije definiran'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Lokacije</div>
                  <div className="font-medium">
                    {promoLocations.length > 0 
                      ? promoLocations.map((pl: any) => pl.locations?.name).filter(Boolean).join(', ')
                      : 'Sve lokacije'
                    }
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Dodatno</div>
                  <div className="flex gap-1">
                    {promo.is_weekend_only && <Badge variant="outline">Vikend</Badge>}
                    {promo.is_holiday_promo && <Badge variant="outline">Praznik</Badge>}
                    {promo.season && <Badge variant="outline">{promo.season}</Badge>}
                    {!promo.is_weekend_only && !promo.is_holiday_promo && !promo.season && <span className="text-muted-foreground">-</span>}
                  </div>
                </div>
              </div>
            </div>
            {promo.description && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">Opis</div>
                <div>{promo.description}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Promo Items Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Artikli u Promociji ({promo.promo_items?.length || 0})</CardTitle>
            {!isLocked && (
              <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Dodaj Artikal</Button>
            )}
          </CardHeader>
          {isLocked && (
            <CardContent className="pt-0 pb-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                <Lock className="h-4 w-4" />
                <span>Promocija je zaključana. Artikli se ne mogu dodavati niti mijenjati.</span>
              </div>
            </CardContent>
          )}
          <CardContent>
            {promo.promo_items?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nema artikala u promociji. Dodajte artikle klikom na "Dodaj Artikal".
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artikal</TableHead>
                    <TableHead className="text-right">Originalna</TableHead>
                    <TableHead className="text-right">Promo cijena</TableHead>
                    <TableHead className="text-right">Popust</TableHead>
                    <TableHead>AI Sugestija</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promo.promo_items?.map((pi: any) => {
                    const discount = pi.original_price > 0 ? ((pi.original_price - pi.promo_price) / pi.original_price * 100) : 0;
                    return (
                      <TableRow key={pi.id}>
                        <TableCell>{pi.items?.code} - {pi.items?.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{pi.original_price.toFixed(2)} KM</TableCell>
                        <TableCell className="text-right font-medium">{pi.promo_price.toFixed(2)} KM</TableCell>
                        <TableCell className="text-right"><Badge variant="secondary">-{discount.toFixed(0)}%</Badge></TableCell>
                        <TableCell>{pi.ai_suggestion_reason || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Dodaj Artikal s AI Analizom</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Artikal</Label>
                <Select value={selectedItemId} onValueChange={(v) => { setSelectedItemId(v); setAiResult(null); }}>
                  <SelectTrigger><SelectValue placeholder="Odaberi artikal" /></SelectTrigger>
                  <SelectContent>
                    {availableItems?.map(item => (
                      <SelectItem key={item.id} value={item.id}>{item.code} - {item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItem && (
                <div className="rounded bg-muted p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>Nabavna:</span><span>{(selectedItem.purchase_price || 0).toFixed(2)} KM</span></div>
                  <div className="flex justify-between"><span>Trenutna:</span><span>{(selectedItem.selling_price || 0).toFixed(2)} KM</span></div>
                </div>
              )}

              <div>
                <Label>Akcijska cijena (KM)</Label>
                <Input type="number" value={promoPrice} onChange={(e) => { setPromoPrice(e.target.value); setAiResult(null); }} step="0.01" />
              </div>

              <Button variant="outline" className="w-full" onClick={handleAnalyzePrice} disabled={!selectedItemId || !promoPrice || isAnalyzing}>
                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Analiziraj cijenu s AI
              </Button>

              {aiResult && (
                <div className={`rounded p-3 text-sm ${aiResult.recommendation === 'approve' ? 'bg-green-500/10 border border-green-500/30' : aiResult.recommendation === 'adjust' ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {aiResult.recommendation === 'approve' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {aiResult.recommendation === 'adjust' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                    {aiResult.recommendation === 'reject' && <XCircle className="h-5 w-5 text-red-500" />}
                    <span className="font-medium">{aiResult.recommendation === 'approve' ? 'Cijena odobrena' : aiResult.recommendation === 'adjust' ? 'Preporučena korekcija' : 'Cijena nije preporučena'}</span>
                  </div>
                  <p className="text-muted-foreground">{aiResult.reasoning}</p>
                  {aiResult.suggestedPrice && <p className="mt-2 font-medium">Predložena cijena: {aiResult.suggestedPrice.toFixed(2)} KM</p>}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Odustani</Button>
                <Button onClick={handleAddItem} disabled={!selectedItemId || !promoPrice}>Dodaj</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}