import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Search, ArrowLeft, Package, AlertCircle, ShoppingCart } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PurchaseOrderWithDelivery {
  id: string;
  order_number: string;
  partner_id: string | null;
  location_id: string | null;
  order_date: string;
  expected_date: string | null;
  status: string;
  total_value: number | null;
  partners?: { name: string } | null;
  locations?: { name: string } | null;
  total_ordered: number;
  total_received: number;
}

function usePurchaseOrdersForReceipt() {
  return useQuery({
    queryKey: ['purchase-orders-for-receipt'],
    queryFn: async () => {
      // Get POs that are ordered (not draft, not fully received)
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          partners(name),
          locations(name),
          purchase_order_lines(quantity, received_quantity)
        `)
        .in('status', ['ordered', 'partially_received'])
        .order('order_date', { ascending: false });
      
      if (error) throw error;

      // Calculate totals and filter out fully received orders
      const ordersWithDelivery = (data || []).map(order => {
        const lines = (order as any).purchase_order_lines || [];
        const totalOrdered = lines.reduce((sum: number, l: any) => sum + (l.quantity || 0), 0);
        const totalReceived = lines.reduce((sum: number, l: any) => sum + (l.received_quantity || 0), 0);
        
        return {
          ...order,
          total_ordered: totalOrdered,
          total_received: totalReceived,
        };
      }).filter(order => order.total_received < order.total_ordered);

      return ordersWithDelivery as PurchaseOrderWithDelivery[];
    }
  });
}

export default function SelectPOForReceipt() {
  const navigate = useNavigate();
  const { data: orders, isLoading } = usePurchaseOrdersForReceipt();
  const [search, setSearch] = useState('');

  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.partners?.name?.toLowerCase().includes(search.toLowerCase()) ||
      order.locations?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getDeliveryBadge = (ordered: number, received: number) => {
    const percentage = ordered > 0 ? Math.round((received / ordered) * 100) : 0;
    if (received === 0) {
      return <Badge variant="outline">Čeka isporuku</Badge>;
    }
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
        Djelomično ({percentage}%)
      </Badge>
    );
  };

  return (
    <div>
      <Header 
        title="Nova primka" 
        subtitle="Primka • Odaberite narudžbenicu za kreiranje primke" 
      />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/warehouse/receipts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Natrag na primke
          </NavLink>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Primka se može kreirati samo iz postojeće narudžbenice. Odaberite narudžbenicu iz liste ispod.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Narudžbenice za prijem
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pretraži..."
                  className="w-64 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Učitavanje narudžbenica...</div>
            ) : filteredOrders?.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Nema narudžbenica za prijem</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sve narudžbenice su već potpuno primljene ili nema aktivnih narudžbenica.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/warehouse/purchase-orders/new')}
                >
                  Kreiraj novu narudžbenicu
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Broj narudžbenice</TableHead>
                    <TableHead>Dobavljač</TableHead>
                    <TableHead>Skladište</TableHead>
                    <TableHead>Datum narudžbe</TableHead>
                    <TableHead>Očekivana isporuka</TableHead>
                    <TableHead>Status isporuke</TableHead>
                    <TableHead className="text-right">Akcija</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.partners?.name || '-'}</TableCell>
                      <TableCell>{order.locations?.name || '-'}</TableCell>
                      <TableCell>{format(new Date(order.order_date), 'dd.MM.yyyy')}</TableCell>
                      <TableCell>
                        {order.expected_date ? format(new Date(order.expected_date), 'dd.MM.yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {getDeliveryBadge(order.total_ordered, order.total_received)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/warehouse/receipts/from-po/${order.id}`)}
                        >
                          <Package className="mr-2 h-4 w-4" />
                          Kreiraj primku
                        </Button>
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
