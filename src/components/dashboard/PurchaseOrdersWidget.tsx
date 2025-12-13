import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Clock, Truck, ArrowRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  expected_date: string | null;
  total_value: number | null;
  partners: { name: string } | null;
}

export function PurchaseOrdersWidget() {
  const navigate = useNavigate();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['dashboard-purchase-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, order_number, status, expected_date, total_value, partners(name)')
        .in('status', ['draft', 'ordered'])
        .order('expected_date', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      return data as PurchaseOrder[];
    }
  });

  const draftOrders = orders?.filter(o => o.status === 'draft') || [];
  const orderedOrders = orders?.filter(o => o.status === 'ordered') || [];
  
  const expectedThisWeek = orderedOrders.filter(o => {
    if (!o.expected_date) return false;
    const expectedDate = parseISO(o.expected_date);
    return isWithinInterval(expectedDate, { start: weekStart, end: weekEnd });
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-module-warehouse" />
          Purchase Orders
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/warehouse/purchase-orders')}
          className="text-muted-foreground hover:text-foreground"
        >
          View All
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{draftOrders.length}</p>
            <p className="text-xs text-muted-foreground">Draft Orders</p>
          </div>
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
            <Truck className="h-5 w-5 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold text-blue-600">{orderedOrders.length}</p>
            <p className="text-xs text-muted-foreground">Awaiting Delivery</p>
          </div>
          <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-3 text-center">
            <Package className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold text-green-600">{expectedThisWeek.length}</p>
            <p className="text-xs text-muted-foreground">Due This Week</p>
          </div>
        </div>

        {/* Expected Deliveries This Week */}
        {expectedThisWeek.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Expected Deliveries This Week
            </h4>
            <div className="space-y-2">
              {expectedThisWeek.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/warehouse/purchase-orders/${order.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{order.order_number}</span>
                      <Badge variant="default" className="text-xs">Ordered</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.partners?.name || 'No supplier'}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium">
                      {formatCurrency(order.total_value || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.expected_date && format(parseISO(order.expected_date), 'EEE, dd MMM')}
                    </p>
                  </div>
                </div>
              ))}
              {expectedThisWeek.length > 5 && (
                <p className="text-xs text-center text-muted-foreground pt-1">
                  +{expectedThisWeek.length - 5} more deliveries expected
                </p>
              )}
            </div>
          </div>
        ) : orderedOrders.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Pending Deliveries
            </h4>
            <div className="space-y-2">
              {orderedOrders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/warehouse/purchase-orders/${order.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{order.order_number}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.partners?.name || 'No supplier'}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-medium">
                      {formatCurrency(order.total_value || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.expected_date 
                        ? format(parseISO(order.expected_date), 'dd MMM yyyy')
                        : 'No date set'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending purchase orders</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
