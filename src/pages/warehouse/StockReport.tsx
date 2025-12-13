import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, ArrowLeft, AlertTriangle, Package, TrendingDown, Warehouse, ShoppingCart } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocations } from '@/hooks/useMasterData';
import { useGeneratePurchaseOrders } from '@/hooks/usePurchaseOrders';

interface StockItem {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
  reserved_quantity: number;
  items: {
    code: string;
    name: string;
    min_stock: number | null;
    max_stock: number | null;
    purchase_price: number | null;
    selling_price: number | null;
    category_id: string | null;
    preferred_supplier_id: string | null;
    item_categories?: { name: string } | null;
  };
  locations: {
    code: string;
    name: string;
  };
}

function useStockReport() {
  return useQuery({
    queryKey: ['stock-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock')
        .select(`
          *,
          items!inner(code, name, min_stock, max_stock, purchase_price, selling_price, category_id, preferred_supplier_id, item_categories(name)),
          locations!inner(code, name)
        `)
        .order('quantity', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as StockItem[];
    }
  });
}

export default function StockReport() {
  const { data: stockItems, isLoading } = useStockReport();
  const { data: locations } = useLocations();
  const generatePurchaseOrders = useGeneratePurchaseOrders();
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // Get low stock items for purchase order generation
  const lowStockItemsData = stockItems?.filter(item => item.quantity <= (item.items.min_stock || 0)) || [];
  
  const handleGeneratePurchaseOrders = () => {
    const orderItems = lowStockItemsData.map(item => ({
      item_id: item.item_id,
      item_code: item.items.code,
      item_name: item.items.name,
      location_id: item.location_id,
      location_name: item.locations.name,
      current_quantity: item.quantity,
      min_stock: item.items.min_stock || 0,
      // Order quantity: bring stock up to min_stock level, or at least min_stock quantity
      order_quantity: Math.max((item.items.min_stock || 0) - item.quantity, item.items.min_stock || 10),
      purchase_price: item.items.purchase_price || 0,
      preferred_supplier_id: item.items.preferred_supplier_id
    }));
    
    generatePurchaseOrders.mutate(orderItems);
  };

  const filteredItems = stockItems?.filter(item => {
    const matchesSearch = 
      item.items.code.toLowerCase().includes(search.toLowerCase()) ||
      item.items.name.toLowerCase().includes(search.toLowerCase());
    const matchesLocation = locationFilter === 'all' || item.location_id === locationFilter;
    const isLowStock = item.quantity <= (item.items.min_stock || 0);
    const isOverStock = item.quantity >= (item.items.max_stock || Infinity);
    const matchesStockFilter = 
      stockFilter === 'all' ||
      (stockFilter === 'low' && isLowStock) ||
      (stockFilter === 'normal' && !isLowStock && !isOverStock) ||
      (stockFilter === 'over' && isOverStock);
    return matchesSearch && matchesLocation && matchesStockFilter;
  });

  // Calculate summary stats
  const totalItems = stockItems?.length || 0;
  const lowStockItems = stockItems?.filter(item => item.quantity <= (item.items.min_stock || 0)).length || 0;
  const totalValue = stockItems?.reduce((sum, item) => sum + (item.quantity * (item.items.purchase_price || 0)), 0) || 0;
  const uniqueLocations = new Set(stockItems?.map(item => item.location_id)).size;

  const getStockStatus = (quantity: number, minStock: number | null, maxStock: number | null) => {
    if (quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (quantity <= (minStock || 0)) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600">Low Stock</Badge>;
    }
    if (maxStock && quantity >= maxStock) {
      return <Badge variant="outline" className="border-blue-500 text-blue-600">Over Stock</Badge>;
    }
    return <Badge variant="outline" className="border-green-500 text-green-600">In Stock</Badge>;
  };

  return (
    <div>
      <Header title="Stock Report" subtitle="Izvještaj o zalihama • Current inventory levels" />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/warehouse" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Warehouse
          </NavLink>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">Across all warehouses</p>
            </CardContent>
          </Card>

          <Card className={lowStockItems > 0 ? 'border-amber-500' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${lowStockItems > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lowStockItems > 0 ? 'text-amber-600' : ''}`}>{lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Items below minimum level</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Value</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totalValue.toLocaleString('en', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground">Based on purchase prices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Warehouses</CardTitle>
              <Warehouse className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueLocations}</div>
              <p className="text-xs text-muted-foreground">Active locations with stock</p>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems > 0 && (
          <Card className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  Low Stock Alerts ({lowStockItems})
                </CardTitle>
                <Button 
                  onClick={handleGeneratePurchaseOrders}
                  disabled={generatePurchaseOrders.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {generatePurchaseOrders.isPending ? 'Creating...' : 'Create Purchase Orders'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stockItems
                  ?.filter(item => item.quantity <= (item.items.min_stock || 0))
                  .slice(0, 10)
                  .map(item => (
                    <Badge key={item.id} variant="outline" className="border-amber-500 bg-background text-amber-700">
                      {item.items.code} - {item.items.name} ({item.quantity} / {item.items.min_stock || 0})
                    </Badge>
                  ))}
                {lowStockItems > 10 && (
                  <Badge variant="secondary">+{lowStockItems - 10} more</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stock Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Stock Levels</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    className="w-48 pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {locations?.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="over">Over Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading stock data...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Min / Max</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                        No stock records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.items.code}</TableCell>
                        <TableCell>{item.items.name}</TableCell>
                        <TableCell>
                          {item.items.item_categories?.name ? (
                            <Badge variant="secondary">{item.items.item_categories.name}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{item.locations.name}</TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.reserved_quantity || 0}</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.quantity - (item.reserved_quantity || 0)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.items.min_stock || 0} / {item.items.max_stock || '∞'}
                        </TableCell>
                        <TableCell>
                          {getStockStatus(item.quantity, item.items.min_stock, item.items.max_stock)}
                        </TableCell>
                        <TableCell className="text-right">
                          €{((item.quantity * (item.items.purchase_price || 0))).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
