import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Package, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ClipboardList, BarChart3, ShoppingCart, Box, Scale, MapPin, ListChecks, Loader2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";
import { getExpiryStatus } from "@/lib/warehouseWms";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExpiryWarnings } from "@/components/warehouse/ExpiryWarnings";

const documentTypes = [
  { icon: ArrowDownToLine, label: "Goods Receipt", labelAlt: "Primka", href: "/warehouse/receipts", count: null },
  { icon: ArrowUpFromLine, label: "Goods Issue", labelAlt: "Otpremnica", href: "/warehouse/issues", count: null },
  { icon: ArrowLeftRight, label: "Transfer", labelAlt: "Međuskladišnica", href: "/warehouse/transfers", count: null },
  { icon: ClipboardList, label: "Inventory", labelAlt: "Inventura", href: "/warehouse/inventory", count: null },
  { icon: ShoppingCart, label: "Purchase Orders", labelAlt: "Narudžbenice", href: "/warehouse/purchase-orders", count: null },
  { icon: Box, label: "Items", labelAlt: "Artikli", href: "/warehouse/items", count: null },
  { icon: MapPin, label: "Locations", labelAlt: "Lokacije", href: "/warehouse/locations", count: null },
  { icon: ListChecks, label: "Picking", labelAlt: "Komisioniranje", href: "/warehouse/picking", count: null },
  { icon: Scale, label: "Price Comparison", labelAlt: "Usporedba cijena", href: "/warehouse/price-comparison", count: null },
  { icon: BarChart3, label: "Stock Report", labelAlt: "Izvještaj o zalihama", href: "/warehouse/stock-report", count: null },
];

// Hook for fetching stock overview from database
function useStockOverview(search: string, locationId: string) {
  return useQuery({
    queryKey: ['stock-overview', search, locationId],
    queryFn: async () => {
      // Fetch stock with item and location details
      let query = supabase
        .from('stock')
        .select(`
          id,
          quantity,
          reserved_quantity,
          item_id,
          location_id,
          items:item_id (id, code, name, min_stock, max_stock, selling_price, category_id, item_categories:category_id (name)),
          locations:location_id (id, code, name)
        `)
        .gt('quantity', 0)
        .order('quantity', { ascending: true })
        .limit(50);

      if (locationId && locationId !== 'all') {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search if provided
      let filtered = data || [];
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(item => 
          item.items?.code?.toLowerCase().includes(searchLower) ||
          item.items?.name?.toLowerCase().includes(searchLower)
        );
      }

      return filtered;
    },
    staleTime: 30000
  });
}

// Hook for fetching LOT status from stock_lots
function useLotStatus() {
  return useQuery({
    queryKey: ['lot-status-dashboard'],
    queryFn: async () => {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 90); // Show lots expiring in next 90 days or already expired

      const { data, error } = await supabase
        .from('stock_lots')
        .select(`
          id,
          lot_number,
          expiry_date,
          quantity,
          bin_location,
          item_id,
          location_id,
          items:item_id (code, name),
          locations:location_id (code, name)
        `)
        .gt('quantity', 0)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000
  });
}

// Hook for fetching locations
function useLocations() {
  return useQuery({
    queryKey: ['locations-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, code, name')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000
  });
}

// Hook for WMS stats from real data
function useWmsStats() {
  return useQuery({
    queryKey: ['wms-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's picking orders
      const { data: pickingToday } = await supabase
        .from('picking_orders')
        .select('id, status')
        .gte('created_at', `${today}T00:00:00`)
        .eq('status', 'completed');
      
      // Get total items in stock
      const { data: stockData } = await supabase
        .from('stock')
        .select('quantity')
        .gt('quantity', 0);
      
      // Get low stock items
      const { data: lowStockData } = await supabase
        .from('stock')
        .select('id, quantity, items:item_id (min_stock)')
        .gt('quantity', 0);
      
      const lowStockCount = (lowStockData || []).filter(s => 
        s.items?.min_stock && s.quantity <= s.items.min_stock
      ).length;

      // Get expiring lots count
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: expiringLots } = await supabase
        .from('stock_lots')
        .select('id')
        .gt('quantity', 0)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0]);

      return [
        { label: "Danas kompletirano", value: String(pickingToday?.length || 0), helper: "Picking nalozi" },
        { label: "Artikala na stanju", value: String(stockData?.length || 0), helper: "Različitih pozicija" },
        { label: "Low stock upozorenja", value: String(lowStockCount), helper: "Ispod minimuma" },
        { label: "Ističe uskoro", value: String(expiringLots?.length || 0), helper: "Sljedećih 30 dana" },
      ];
    },
    staleTime: 30000
  });
}

export default function WarehouseIndex() {
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  
  const { data: stockData, isLoading: stockLoading } = useStockOverview(search, selectedLocation);
  const { data: lotData, isLoading: lotLoading } = useLotStatus();
  const { data: locations } = useLocations();
  const { data: wmsStats, isLoading: statsLoading } = useWmsStats();

  return (
    <div>
      <Header title="Warehouse" subtitle="Skladišno poslovanje • Inventory Management" />

      <div className="p-6">
        {/* Document Types Grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {documentTypes.map((doc) => (
            <NavLink key={doc.href} to={doc.href}>
              <div className="module-card group cursor-pointer border-l-4 border-l-module-warehouse">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-module-warehouse/10 p-2">
                    <doc.icon className="h-5 w-5 text-module-warehouse" />
                  </div>
                  {doc.count !== null && (
                    <span className="text-2xl font-bold text-module-warehouse">{doc.count}</span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="font-medium">{doc.label}</p>
                  <p className="text-sm text-muted-foreground">{doc.labelAlt}</p>
                </div>
              </div>
            </NavLink>
          ))}
        </div>

        {/* WMS Stats */}
        <div className="mb-6 grid gap-4 lg:grid-cols-4">
          {statsLoading ? (
            <div className="col-span-4 flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            wmsStats?.map((stat) => (
              <div key={stat.label} className="rounded-lg border bg-card p-4">
                <p className="text-xs uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.helper}</p>
              </div>
            ))
          )}
        </div>

        {/* Stock Overview */}
        <div className="module-card">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Stock Overview</h3>
              <p className="text-sm text-muted-foreground">Pregled zaliha</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search items..." 
                  className="w-64 pl-9" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sva skladišta</SelectItem>
                  {locations?.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NavLink to="/warehouse/items">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Item
                </Button>
              </NavLink>
            </div>
          </div>

          <div className="overflow-x-auto">
            {stockLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : stockData?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nema podataka o zalihama
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Warehouse</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Min Qty</th>
                    <th>Status</th>
                    <th className="text-right">Unit Value</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData?.map((item) => {
                    const isLowStock = item.items?.min_stock && item.quantity <= item.items.min_stock;
                    return (
                      <tr key={item.id} className="cursor-pointer">
                        <td className="font-medium">{item.items?.code || '-'}</td>
                        <td>{item.items?.name || '-'}</td>
                        <td>
                          <span className="rounded bg-muted px-2 py-1 text-xs">
                            {item.items?.item_categories?.name || '-'}
                          </span>
                        </td>
                        <td>{item.locations?.name || '-'}</td>
                        <td className="text-right font-medium">{item.quantity}</td>
                        <td className="text-right text-muted-foreground">{item.items?.min_stock || '-'}</td>
                        <td>
                          {isLowStock ? (
                            <span className="badge-warning">Low Stock</span>
                          ) : (
                            <span className="badge-success">In Stock</span>
                          )}
                        </td>
                        <td className="text-right">€{(item.items?.selling_price || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Expiry Warnings Card */}
          <ExpiryWarnings />

          <div className="module-card">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">WMS Checklist</h3>
              <p className="text-sm text-muted-foreground">Operativni podsjetnik</p>
            </div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-module-warehouse" />
                Potvrdi LOT i rok trajanja prije izlaza robe.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-module-warehouse" />
                Prati FIFO putanju u komisioniranju.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-module-warehouse" />
                Ispis lokacijskih naljepnica dostupan za svaku zonu.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-module-warehouse" />
                Prati produktivnost komisionara kroz WMS statistiku.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
