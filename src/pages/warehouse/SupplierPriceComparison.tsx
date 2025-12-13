import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, TrendingDown, TrendingUp, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';

interface PriceData {
  item_id: string;
  item_code: string;
  item_name: string;
  supplier_id: string;
  supplier_name: string;
  unit_price: number;
  last_order_date: string;
  order_count: number;
}

export default function SupplierPriceComparison() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const { data: priceData, isLoading } = useQuery({
    queryKey: ['supplier-price-comparison'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_lines')
        .select(`
          item_id,
          unit_price,
          items!inner(id, code, name),
          purchase_orders!inner(
            id,
            order_date,
            partner_id,
            partners!inner(id, name)
          )
        `)
        .gt('unit_price', 0)
        .order('item_id');

      if (error) throw error;

      // Group by item and supplier
      const grouped = new Map<string, PriceData>();
      
      data?.forEach((line: any) => {
        const key = `${line.item_id}-${line.purchase_orders.partner_id}`;
        const existing = grouped.get(key);
        
        if (!existing || new Date(line.purchase_orders.order_date) > new Date(existing.last_order_date)) {
          grouped.set(key, {
            item_id: line.item_id,
            item_code: line.items.code,
            item_name: line.items.name,
            supplier_id: line.purchase_orders.partner_id,
            supplier_name: line.purchase_orders.partners.name,
            unit_price: Number(line.unit_price),
            last_order_date: line.purchase_orders.order_date,
            order_count: existing ? existing.order_count + 1 : 1
          });
        } else if (existing) {
          existing.order_count += 1;
        }
      });

      return Array.from(grouped.values());
    }
  });

  // Get unique items
  const items = priceData?.reduce((acc, curr) => {
    if (!acc.find(i => i.item_id === curr.item_id)) {
      acc.push({ item_id: curr.item_id, item_code: curr.item_code, item_name: curr.item_name });
    }
    return acc;
  }, [] as { item_id: string; item_code: string; item_name: string }[]) || [];

  const filteredItems = items.filter(item =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get prices for selected item
  const selectedItemPrices = selectedItem
    ? priceData?.filter(p => p.item_id === selectedItem).sort((a, b) => a.unit_price - b.unit_price)
    : [];

  const lowestPrice = selectedItemPrices?.[0]?.unit_price;
  const highestPrice = selectedItemPrices?.[selectedItemPrices.length - 1]?.unit_price;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Usporedba cijena dobavljača</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usporedba cijena dobavljača</h1>
        <Badge variant="outline" className="text-sm">
          <ArrowUpDown className="mr-1 h-3 w-3" />
          {items.length} artikala s poviješću cijena
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Item Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Odabir artikla</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pretraži artikle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto space-y-1">
              {filteredItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nema podataka o cijenama. Kreirajte narudžbenice s cijenama.
                </p>
              ) : (
                filteredItems.map((item) => {
                  const supplierCount = priceData?.filter(p => p.item_id === item.item_id).length || 0;
                  return (
                    <button
                      key={item.item_id}
                      onClick={() => setSelectedItem(item.item_id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedItem === item.item_id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="font-medium">{item.item_name}</div>
                      <div className={`text-sm ${selectedItem === item.item_id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {item.item_code} • {supplierCount} dobavljač{supplierCount !== 1 ? 'a' : ''}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Price Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedItem 
                ? `Cijene: ${items.find(i => i.item_id === selectedItem)?.item_name}`
                : 'Odaberite artikal'}
            </CardTitle>
            {selectedItemPrices && selectedItemPrices.length > 1 && (
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <TrendingDown className="h-4 w-4" />
                  Najniža: {lowestPrice?.toFixed(2)} KM
                </span>
                <span className="flex items-center gap-1 text-red-600">
                  <TrendingUp className="h-4 w-4" />
                  Najviša: {highestPrice?.toFixed(2)} KM
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!selectedItem ? (
              <p className="text-center text-muted-foreground py-8">
                Odaberite artikal s lijeve strane za prikaz cijena
              </p>
            ) : selectedItemPrices?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nema podataka o cijenama za ovaj artikal
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dobavljač</TableHead>
                    <TableHead className="text-right">Cijena</TableHead>
                    <TableHead className="text-right">Narudžbi</TableHead>
                    <TableHead className="text-right">Zadnja narudžba</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItemPrices?.map((price, index) => (
                    <TableRow key={price.supplier_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {index === 0 && selectedItemPrices.length > 1 && (
                            <Badge variant="default" className="bg-green-600 text-xs">
                              Najbolja
                            </Badge>
                          )}
                          {price.supplier_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {price.unit_price.toFixed(2)} KM
                        {lowestPrice && price.unit_price > lowestPrice && (
                          <span className="text-xs text-red-600 ml-1">
                            (+{((price.unit_price - lowestPrice) / lowestPrice * 100).toFixed(0)}%)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{price.order_count}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {format(new Date(price.last_order_date), 'dd.MM.yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
