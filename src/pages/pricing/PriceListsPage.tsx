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
import { ArrowLeft, Plus, Pencil, Building2, Calendar, Search } from 'lucide-react';
import { usePriceLists, useCreatePriceList, useUpdatePriceList } from '@/hooks/usePriceManagement';
import { useLocations } from '@/hooks/useMasterData';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function PriceListsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: priceLists, isLoading } = usePriceLists();
  const { data: locations } = useLocations();
  const createPriceList = useCreatePriceList();
  const updatePriceList = useUpdatePriceList();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    valid_from: '',
    valid_to: '',
    is_default: false,
    location_ids: [] as string[]
  });

  const filteredLists = priceLists?.filter(pl =>
    pl.code.toLowerCase().includes(search.toLowerCase()) ||
    pl.name.toLowerCase().includes(search.toLowerCase())
  );

  const openNewDialog = () => {
    setEditingList(null);
    setFormData({
      code: `CJ-${String(Date.now()).slice(-6)}`,
      name: '',
      description: '',
      valid_from: '',
      valid_to: '',
      is_default: false,
      location_ids: []
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (list: any) => {
    setEditingList(list);
    setFormData({
      code: list.code,
      name: list.name,
      description: list.description || '',
      valid_from: list.valid_from || '',
      valid_to: list.valid_to || '',
      is_default: list.is_default || false,
      location_ids: list.price_list_locations?.map((pl: any) => pl.location_id) || []
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast({
        title: 'Greška',
        description: 'Šifra i naziv su obavezna polja',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (editingList) {
        await updatePriceList.mutateAsync({
          id: editingList.id,
          ...formData,
          valid_from: formData.valid_from || null,
          valid_to: formData.valid_to || null
        });
        toast({ title: 'Uspješno', description: 'Cjenik je ažuriran' });
      } else {
        await createPriceList.mutateAsync(formData);
        toast({ title: 'Uspješno', description: 'Cjenik je kreiran' });
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Greška',
        description: error.message,
        variant: 'destructive'
      });
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
      <Header title="Cjenici" subtitle="Price Lists Management" />

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
              <CardTitle>Lista Cjenika</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pretraži..."
                    className="w-64 pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novi Cjenik
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
                    <TableHead>Lokacije</TableHead>
                    <TableHead>Validnost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLists?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nema cjenika
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLists?.map((list) => (
                      <TableRow key={list.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pricing/lists/${list.id}`)}>
                        <TableCell className="font-medium">{list.code}</TableCell>
                        <TableCell>
                          {list.name}
                          {list.is_default && (
                            <Badge variant="outline" className="ml-2">Default</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {list.price_list_locations?.slice(0, 3).map((pl: any) => (
                              <Badge key={pl.location_id} variant="secondary" className="text-xs">
                                {pl.locations?.name}
                              </Badge>
                            ))}
                            {(list.price_list_locations?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{list.price_list_locations.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {list.valid_from || list.valid_to ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {list.valid_from ? format(new Date(list.valid_from), 'dd.MM.yyyy') : '∞'}
                              {' - '}
                              {list.valid_to ? format(new Date(list.valid_to), 'dd.MM.yyyy') : '∞'}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Bez ograničenja</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={list.active ? 'default' : 'secondary'}>
                            {list.active ? 'Aktivan' : 'Neaktivan'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(list);
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingList ? 'Uredi Cjenik' : 'Novi Cjenik'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Šifra *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="CJ-001"
                  />
                </div>
                <div>
                  <Label>Naziv *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Glavni cjenik"
                  />
                </div>
              </div>

              <div>
                <Label>Opis</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Opis cjenika..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Važi od</Label>
                  <Input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Važi do</Label>
                  <Input
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label>Postavi kao zadani cjenik</Label>
              </div>

              <div>
                <Label className="mb-2 block">Lokacije</Label>
                <div className="max-h-40 overflow-y-auto rounded border p-2 space-y-2">
                  {locations?.map((location) => (
                    <div key={location.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.location_ids.includes(location.id)}
                        onCheckedChange={() => toggleLocation(location.id)}
                      />
                      <span className="text-sm">{location.name}</span>
                      <Badge variant="outline" className="text-xs">{location.code}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Odustani
                </Button>
                <Button onClick={handleSave} disabled={createPriceList.isPending || updatePriceList.isPending}>
                  {editingList ? 'Sačuvaj' : 'Kreiraj'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}