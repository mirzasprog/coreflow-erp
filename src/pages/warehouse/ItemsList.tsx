import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Pencil, Package } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartners } from '@/hooks/useMasterData';
import { useToast } from '@/hooks/use-toast';


interface Item {
  id: string;
  code: string;
  name: string;
  description: string | null;
  barcode: string | null;
  purchase_price: number | null;
  selling_price: number | null;
  min_stock: number | null;
  max_stock: number | null;
  active: boolean | null;
  preferred_supplier_id: string | null;
  vat_rate_id: string | null;
  unit_id: string | null;
  category_id: string | null;
  preferred_supplier?: { name: string; code: string } | null;
  units_of_measure?: { name: string; code: string } | null;
  vat_rates?: { name: string; rate: number } | null;
  item_categories?: { name: string } | null;
  lot_tracking?: boolean | null;
  require_lot_on_receipt?: boolean | null;
}

function useItemsList() {
  return useQuery({
    queryKey: ['items-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          preferred_supplier:partners!items_preferred_supplier_id_fkey(name, code),
          units_of_measure(name, code),
          vat_rates(name, rate),
          item_categories(name)
        `)
        .order('code');
      
      if (error) throw error;
      return data as unknown as Item[];
    }
  });
}

async function generateNextItemCode(): Promise<string> {
  const { data } = await supabase
    .from('items')
    .select('code')
    .like('code', 'ART-%')
    .order('code', { ascending: false })
    .limit(100);

  let maxNum = 0;
  if (data && data.length > 0) {
    for (const item of data) {
      const match = item.code.match(/^ART-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  
  return `ART-${String(maxNum + 1).padStart(5, '0')}`;
}

function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });
}

function useVatRates() {
  return useQuery({
    queryKey: ['vat-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vat_rates')
        .select('*')
        .eq('active', true)
        .order('rate');
      if (error) throw error;
      return data;
    }
  });
}

function useCategories() {
  return useQuery({
    queryKey: ['item-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_categories')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });
}

export default function ItemsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useItemsList();
  const { data: suppliers } = usePartners('supplier');
  const { data: units } = useUnits();
  const { data: vatRates } = useVatRates();
  const { data: categories } = useCategories();
  
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    barcode: '',
    purchase_price: 0,
    selling_price: 0,
    min_stock: 0,
    max_stock: 0,
    preferred_supplier_id: '',
    unit_id: '',
    vat_rate_id: '',
    category_id: '',
    active: true,
    lot_tracking: false,
    require_lot_on_receipt: false
  });

  const filteredItems = items?.filter(item => 
    item.code.toLowerCase().includes(search.toLowerCase()) ||
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  const openEditDialog = (item: Item) => {
    setEditItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      barcode: item.barcode || '',
      purchase_price: item.purchase_price || 0,
      selling_price: item.selling_price || 0,
      min_stock: item.min_stock || 0,
      max_stock: item.max_stock || 0,
      preferred_supplier_id: item.preferred_supplier_id || '',
      unit_id: item.unit_id || '',
      vat_rate_id: item.vat_rate_id || '',
      category_id: item.category_id || '',
      active: item.active ?? true,
      lot_tracking: item.lot_tracking ?? false,
      require_lot_on_receipt: item.require_lot_on_receipt ?? false
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = async () => {
    setEditItem(null);
    const nextCode = await generateNextItemCode();
    setFormData({
      code: nextCode,
      name: '',
      description: '',
      barcode: '',
      purchase_price: 0,
      selling_price: 0,
      min_stock: 0,
      max_stock: 0,
      preferred_supplier_id: '',
      unit_id: '',
      vat_rate_id: '',
      category_id: '',
      active: true,
      lot_tracking: false,
      require_lot_on_receipt: false
    });
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        barcode: formData.barcode || null,
        purchase_price: formData.purchase_price,
        selling_price: formData.selling_price,
        min_stock: formData.min_stock,
        max_stock: formData.max_stock,
        preferred_supplier_id: formData.preferred_supplier_id || null,
        unit_id: formData.unit_id || null,
        vat_rate_id: formData.vat_rate_id || null,
        category_id: formData.category_id || null,
        active: formData.active,
        lot_tracking: formData.lot_tracking,
        require_lot_on_receipt: formData.require_lot_on_receipt,
        updated_at: new Date().toISOString()
      };

      if (editItem) {
        const { error } = await supabase
          .from('items')
          .update(data)
          .eq('id', editItem.id);
        if (error) throw error;
        return { id: editItem.id };
      } else {
        // Create new item and get the ID
        const { data: newItem, error } = await supabase
          .from('items')
          .insert(data)
          .select('id')
          .single();
        if (error) throw error;

        // Fetch all active locations (warehouses)
        const { data: locations, error: locError } = await supabase
          .from('locations')
          .select('id')
          .eq('active', true);
        
        if (locError) throw locError;

        // Create stock records for each location with initial quantity 0
        if (locations && locations.length > 0) {
          const stockRecords = locations.map(loc => ({
            item_id: newItem.id,
            location_id: loc.id,
            quantity: 0,
            reserved_quantity: 0
          }));

          const { error: stockError } = await supabase
            .from('stock')
            .insert(stockRecords);
          
          if (stockError) throw stockError;
        }
        return { id: newItem.id };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items-list'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-report'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      toast({
        title: editItem ? 'Item Updated' : 'Item Created',
        description: `Item "${formData.name}" has been ${editItem ? 'updated' : 'created'} successfully`
      });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return (
    <div>
      <Header title="Items" subtitle="Artikli • Inventory Master Data" />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/warehouse" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Warehouse
          </NavLink>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Items List
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    className="w-64 pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button onClick={openNewDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Item
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading items...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Preferred Supplier</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Min/Max Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>LOT Tracking</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {filteredItems?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                        No items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.code}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>
                          {item.item_categories?.name ? (
                            <Badge variant="secondary">{item.item_categories.name}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {item.preferred_supplier ? (
                            <span className="text-sm">{item.preferred_supplier.name}</span>
                          ) : (
                            <span className="text-muted-foreground">Not set</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">€{(item.purchase_price || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">€{(item.selling_price || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.min_stock || 0} / {item.max_stock || '∞'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.active ? 'default' : 'secondary'}>
                            {item.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.lot_tracking ? 'default' : 'secondary'}>
                            {item.lot_tracking ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditDialog(item)}
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

        {/* Edit/Create Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editItem ? 'Edit Item' : 'New Item'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Item Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., ART-001"
                  />
                </div>
                <div>
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g., 1234567890123"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Item name"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category_id">Category</Label>
                  <Select 
                    value={formData.category_id || "none"} 
                    onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories?.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="unit_id">Unit of Measure</Label>
                  <Select 
                    value={formData.unit_id || "none"} 
                    onValueChange={(value) => setFormData({ ...formData, unit_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {units?.map(unit => (
                        <SelectItem key={unit.id} value={unit.id}>{unit.name} ({unit.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-module-warehouse/30 bg-module-warehouse/5 p-4">
                <Label className="text-module-warehouse font-medium">Preferred Supplier</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Used for automatic purchase order generation
                </p>
                <Select 
                  value={formData.preferred_supplier_id || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, preferred_supplier_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preferred supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers?.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.code} - {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchase_price">Purchase Price (€)</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="selling_price">Selling Price (€)</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="min_stock">Minimum Stock</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_stock">Maximum Stock</Label>
                  <Input
                    id="max_stock"
                    type="number"
                    value={formData.max_stock}
                    onChange={(e) => setFormData({ ...formData, max_stock: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="vat_rate_id">VAT Rate</Label>
                  <Select 
                    value={formData.vat_rate_id || "none"} 
                    onValueChange={(value) => setFormData({ ...formData, vat_rate_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select VAT" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {vatRates?.map(vat => (
                        <SelectItem key={vat.id} value={vat.id}>{vat.name} ({vat.rate}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="active">Status</Label>
                <Select 
                  value={formData.active ? 'true' : 'false'} 
                  onValueChange={(value) => setFormData({ ...formData, active: value === 'true' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="lot_tracking" className="font-medium">LOT Tracking</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable LOT and expiry tracking for this item
                  </p>
                </div>
                <Switch
                  id="lot_tracking"
                  checked={formData.lot_tracking}
                  onCheckedChange={(checked) => setFormData({ ...formData, lot_tracking: checked })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div>
                  <Label htmlFor="require_lot_on_receipt" className="font-medium text-amber-900">Require LOT on Receipt</Label>
                  <p className="text-xs text-amber-700">
                    Item cannot be received without LOT number and expiry date
                  </p>
                </div>
                <Switch
                  id="require_lot_on_receipt"
                  checked={formData.require_lot_on_receipt}
                  onCheckedChange={(checked) => setFormData({ ...formData, require_lot_on_receipt: checked, lot_tracking: checked ? true : formData.lot_tracking })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !formData.code || !formData.name}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Item'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
