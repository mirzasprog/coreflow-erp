import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { NavLink } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Search, Building2 } from 'lucide-react';
import { usePriceList, useUpdatePriceListItem } from '@/hooks/usePriceManagement';
import { useItems } from '@/hooks/useMasterData';
import { useToast } from '@/hooks/use-toast';

export default function PriceListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: priceList, isLoading } = usePriceList(id);
  const { data: allItems } = useItems();
  const updatePriceListItem = useUpdatePriceListItem();

  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const existingItemIds = priceList?.price_list_items?.map((pli: any) => pli.item_id) || [];
  const availableItems = allItems?.filter(item => !existingItemIds.includes(item.id));

  const filteredItems = priceList?.price_list_items?.filter((pli: any) =>
    pli.items?.code.toLowerCase().includes(search.toLowerCase()) ||
    pli.items?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddItem = async () => {
    if (!selectedItemId || !newPrice || !id) return;

    try {
      await updatePriceListItem.mutateAsync({
        price_list_id: id,
        item_id: selectedItemId,
        selling_price: parseFloat(newPrice)
      });
      toast({ title: 'Uspješno', description: 'Artikal dodan u cjenik' });
      setIsAddDialogOpen(false);
      setSelectedItemId('');
      setNewPrice('');
    } catch (error: any) {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdatePrice = async (itemId: string) => {
    if (!editPrice || !id) return;

    try {
      await updatePriceListItem.mutateAsync({
        price_list_id: id,
        item_id: itemId,
        selling_price: parseFloat(editPrice)
      });
      toast({ title: 'Uspješno', description: 'Cijena ažurirana' });
      setEditingItem(null);
    } catch (error: any) {
      toast({ title: 'Greška', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header title="Cjenik" subtitle="Loading..." />
        <div className="flex items-center justify-center p-12">
          <div className="text-muted-foreground">Učitavanje...</div>
        </div>
      </div>
    );
  }

  if (!priceList) {
    return (
      <div>
        <Header title="Cjenik" subtitle="Not Found" />
        <div className="p-6">
          <div className="text-center text-muted-foreground">Cjenik nije pronađen</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={priceList.name} subtitle={`Cjenik ${priceList.code}`} />

      <div className="p-6 space-y-6">
        <div className="mb-4">
          <NavLink to="/pricing/lists" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Nazad na Cjenike
          </NavLink>
        </div>

        {/* Price List Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Šifra:</span>
                <span className="ml-2 font-medium">{priceList.code}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Lokacije:</span>
                <div className="flex gap-1">
                  {priceList.price_list_locations?.map((pl: any) => (
                    <Badge key={pl.location_id} variant="secondary">
                      {pl.locations?.name}
                    </Badge>
                  ))}
                  {priceList.price_list_locations?.length === 0 && (
                    <span className="text-sm text-muted-foreground">Sve lokacije</span>
                  )}
                </div>
              </div>
              <Badge variant={priceList.active ? 'default' : 'secondary'}>
                {priceList.active ? 'Aktivan' : 'Neaktivan'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Items in Price List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Artikli u Cjeniku ({priceList.price_list_items?.length || 0})</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pretraži artikle..."
                    className="w-64 pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj Artikal
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Šifra</TableHead>
                  <TableHead>Naziv</TableHead>
                  <TableHead className="text-right">Nabavna cijena</TableHead>
                  <TableHead className="text-right">Osnovna cijena</TableHead>
                  <TableHead className="text-right">Cijena u cjeniku</TableHead>
                  <TableHead className="text-right">Marža</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nema artikala u cjeniku
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems?.map((pli: any) => {
                    const purchasePrice = pli.items?.purchase_price || 0;
                    const basePrice = pli.items?.selling_price || 0;
                    const listPrice = pli.selling_price || 0;
                    const margin = listPrice > 0 ? ((listPrice - purchasePrice) / listPrice * 100) : 0;
                    const isEditing = editingItem === pli.item_id;

                    return (
                      <TableRow key={pli.id}>
                        <TableCell className="font-medium">{pli.items?.code}</TableCell>
                        <TableCell>{pli.items?.name}</TableCell>
                        <TableCell className="text-right">{purchasePrice.toFixed(2)} KM</TableCell>
                        <TableCell className="text-right text-muted-foreground">{basePrice.toFixed(2)} KM</TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-24 text-right"
                              step="0.01"
                            />
                          ) : (
                            <span className="font-medium">{listPrice.toFixed(2)} KM</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={margin >= 20 ? 'default' : margin >= 10 ? 'secondary' : 'destructive'}>
                            {margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Button size="sm" onClick={() => handleUpdatePrice(pli.item_id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingItem(pli.item_id);
                                setEditPrice(listPrice.toString());
                              }}
                            >
                              Uredi
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Item Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj Artikal u Cjenik</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Artikal</Label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberi artikal" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} - {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItemId && (
                <div className="rounded bg-muted p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Nabavna cijena:</span>
                    <span>{allItems?.find(i => i.id === selectedItemId)?.purchase_price?.toFixed(2) || '0.00'} KM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trenutna prodajna cijena:</span>
                    <span>{allItems?.find(i => i.id === selectedItemId)?.selling_price?.toFixed(2) || '0.00'} KM</span>
                  </div>
                </div>
              )}

              <div>
                <Label>Cijena u ovom cjeniku (KM)</Label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Odustani
                </Button>
                <Button onClick={handleAddItem} disabled={!selectedItemId || !newPrice}>
                  Dodaj
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}