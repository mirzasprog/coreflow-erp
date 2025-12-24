import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Calendar, Search, Percent, Tag } from 'lucide-react';
import { usePromoActivities, useCreatePromoActivity, useUpdatePromoActivity } from '@/hooks/usePriceManagement';
import { useLocations } from '@/hooks/useMasterData';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const promoTypes = [
  { value: 'discount', label: 'Popust' },
  { value: 'bundle', label: 'Paket ponuda' },
  { value: 'bogo', label: 'Kupi 1 dobij 1' },
  { value: 'seasonal', label: 'Sezonska akcija' }
];

const seasons = [
  { value: 'spring', label: 'Proljeće' },
  { value: 'summer', label: 'Ljeto' },
  { value: 'autumn', label: 'Jesen' },
  { value: 'winter', label: 'Zima' }
];

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

export default function PromoActivitiesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: promoActivities, isLoading } = usePromoActivities();
  const { data: locations } = useLocations();
  const createPromo = useCreatePromoActivity();
  const updatePromo = useUpdatePromoActivity();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    promo_type: 'discount',
    discount_percent: '',
    discount_amount: '',
    start_date: '',
    end_date: '',
    is_weekend_only: false,
    is_holiday_promo: false,
    season: '',
    location_ids: [] as string[]
  });

  const filteredPromos = promoActivities?.filter(promo => {
    const matchesSearch = promo.code.toLowerCase().includes(search.toLowerCase()) ||
      promo.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || promo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openNewDialog = () => {
    setEditingPromo(null);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    setFormData({
      code: `PROMO-${String(Date.now()).slice(-6)}`,
      name: '',
      description: '',
      promo_type: 'discount',
      discount_percent: '',
      discount_amount: '',
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(nextWeek, 'yyyy-MM-dd'),
      is_weekend_only: false,
      is_holiday_promo: false,
      season: '',
      location_ids: []
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: any) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      description: promo.description || '',
      promo_type: promo.promo_type,
      discount_percent: promo.discount_percent?.toString() || '',
      discount_amount: promo.discount_amount?.toString() || '',
      start_date: promo.start_date,
      end_date: promo.end_date,
      is_weekend_only: promo.is_weekend_only || false,
      is_holiday_promo: promo.is_holiday_promo || false,
      season: promo.season || '',
      location_ids: promo.promo_activity_locations?.map((pl: any) => pl.location_id) || []
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.start_date || !formData.end_date) {
      toast({
        title: 'Greška',
        description: 'Popunite sva obavezna polja',
        variant: 'destructive'
      });
      return;
    }

    try {
      const payload = {
        ...formData,
        discount_percent: formData.discount_percent ? parseFloat(formData.discount_percent) : undefined,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : undefined,
        season: formData.season || undefined
      };

      if (editingPromo) {
        await updatePromo.mutateAsync({ id: editingPromo.id, ...payload });
        toast({ title: 'Uspješno', description: 'Promocija ažurirana' });
      } else {
        await createPromo.mutateAsync(payload);
        toast({ title: 'Uspješno', description: 'Promocija kreirana' });
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
    }
  };

  const toggleLocation = (locationId: string) => {
    setFormData(prev => ({
      ...prev,
      location_ids: prev.location_ids.includes(locationId)
        ? prev.location_ids.filter(id => id !== locationId)
        : [...prev.location_ids, locationId]
    }));
  };

  return (
    <div>
      <Header title="Promo Aktivnosti" subtitle="Promotional Activities" />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/pricing" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Nazad na Upravljanje Cijenama
          </NavLink>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Lista Promocija</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pretraži..."
                    className="w-48 pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Svi statusi</SelectItem>
                    <SelectItem value="draft">Priprema</SelectItem>
                    <SelectItem value="active">Aktivne</SelectItem>
                    <SelectItem value="completed">Završene</SelectItem>
                    <SelectItem value="cancelled">Otkazane</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Promocija
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Učitavanje...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Šifra</TableHead>
                    <TableHead>Naziv</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Popust</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Artikala</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromos?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Nema promocija
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPromos?.map((promo) => (
                      <TableRow 
                        key={promo.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/pricing/promos/${promo.id}`)}
                      >
                        <TableCell className="font-medium">{promo.code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {promo.name}
                            {promo.is_weekend_only && <Badge variant="outline" className="text-xs">Vikend</Badge>}
                            {promo.is_holiday_promo && <Badge variant="outline" className="text-xs">Praznik</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {promoTypes.find(t => t.value === promo.promo_type)?.label || promo.promo_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {promo.discount_percent && <span>{promo.discount_percent}%</span>}
                          {promo.discount_amount && <span>{promo.discount_amount} KM</span>}
                          {!promo.discount_percent && !promo.discount_amount && '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(promo.start_date), 'dd.MM')} - {format(new Date(promo.end_date), 'dd.MM.yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{(promo as any).promo_items?.[0]?.count || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[promo.status] || 'secondary'}>
                            {statusLabels[promo.status] || promo.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(promo);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPromo ? 'Uredi Promociju' : 'Nova Promocija'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Šifra *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tip promocije</Label>
                  <Select value={formData.promo_type} onValueChange={(v) => setFormData({ ...formData, promo_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {promoTypes.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Naziv *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ljetna rasprodaja"
                />
              </div>

              <div>
                <Label>Opis</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Popust (%)</Label>
                  <Input
                    type="number"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
                    placeholder="15"
                  />
                </div>
                <div>
                  <Label>Popust (KM)</Label>
                  <Input
                    type="number"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                    placeholder="5.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Početak *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Završetak *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Godišnje doba</Label>
                <Select value={formData.season} onValueChange={(v) => setFormData({ ...formData, season: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nije definirano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nije definirano</SelectItem>
                    {seasons.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_weekend_only}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_weekend_only: checked })}
                  />
                  <Label>Samo vikend</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_holiday_promo}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_holiday_promo: checked })}
                  />
                  <Label>Praznična akcija</Label>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Lokacije</Label>
                <div className="max-h-32 overflow-y-auto rounded border p-2 space-y-2">
                  {locations?.map((location) => (
                    <div key={location.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.location_ids.includes(location.id)}
                        onCheckedChange={() => toggleLocation(location.id)}
                      />
                      <span className="text-sm">{location.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Odustani
                </Button>
                <Button onClick={handleSave} disabled={createPromo.isPending || updatePromo.isPending}>
                  {editingPromo ? 'Sačuvaj' : 'Kreiraj'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}