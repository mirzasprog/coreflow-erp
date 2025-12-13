import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Clock, ShoppingCart, CheckCircle, Pencil, Trash2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PurchaseOrderLine {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  items?: { code: string; name: string };
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  partner_id: string | null;
  location_id: string | null;
  order_date: string;
  expected_date: string | null;
  status: string;
  total_value: number | null;
  notes: string | null;
  created_at: string | null;
  partners?: { name: string; code: string } | null;
  locations?: { name: string; code: string } | null;
  lines?: PurchaseOrderLine[];
}

function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['purchase-order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`*, partners(name, code), locations(name, code)`)
        .eq('id', id!)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;

      const { data: lines, error: linesError } = await supabase
        .from('purchase_order_lines')
        .select(`*, items(code, name)`)
        .eq('order_id', id!);
      
      if (linesError) throw linesError;

      return { ...data, lines: lines as unknown as PurchaseOrderLine[] } as PurchaseOrder;
    }
  });
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType; color: string }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: Clock, color: 'text-muted-foreground' },
  ordered: { label: 'Ordered', variant: 'default', icon: ShoppingCart, color: 'text-blue-600' },
  received: { label: 'Received', variant: 'outline', icon: CheckCircle, color: 'text-green-600' },
};

export default function PurchaseOrderView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: order, isLoading } = usePurchaseOrder(id);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id!);
      
      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      toast({
        title: 'Status Updated',
        description: `Order status changed to ${statusConfig[newStatus]?.label || newStatus}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id!);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      toast({
        title: 'Order Deleted',
        description: 'Purchase order has been deleted'
      });
      navigate('/warehouse/purchase-orders');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  if (isLoading) {
    return (
      <div>
        <Header title="Purchase Order" subtitle="Loading..." />
        <div className="p-6">
          <div className="py-8 text-center text-muted-foreground">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <Header title="Purchase Order" subtitle="Not found" />
        <div className="p-6">
          <NavLink to="/warehouse/purchase-orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Purchase Orders
          </NavLink>
          <div className="py-8 text-center text-muted-foreground">Purchase order not found</div>
        </div>
      </div>
    );
  }

  const config = statusConfig[order.status] || statusConfig.draft;
  const StatusIcon = config.icon;

  return (
    <div>
      <Header title={order.order_number} subtitle="Narudžbenica • Purchase Order Details" />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <NavLink to="/warehouse/purchase-orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Purchase Orders
          </NavLink>
          <div className="flex gap-2">
            {order.status === 'draft' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/warehouse/purchase-orders/${id}/edit`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the purchase order and all its lines.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* Order Header */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-medium">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">{order.partners?.name || 'No supplier assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Location</p>
                  <p className="font-medium">{order.locations?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{format(new Date(order.order_date), 'dd.MM.yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">
                    {order.expected_date ? format(new Date(order.expected_date), 'dd.MM.yyyy') : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold">
                    €{(order.total_value || 0).toLocaleString('en', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {order.notes && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="mt-1">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-3">
                <div className={`rounded-full bg-muted p-3 ${config.color}`}>
                  <StatusIcon className="h-6 w-6" />
                </div>
                <div>
                  <Badge variant={config.variant} className="text-base px-3 py-1">
                    {config.label}
                  </Badge>
                </div>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-sm text-muted-foreground">Change Status</p>
                <Select 
                  value={order.status} 
                  onValueChange={(value) => updateStatusMutation.mutate(value)}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Order Lines ({order.lines?.length || 0} items)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No items in this order
                    </TableCell>
                  </TableRow>
                ) : (
                  order.lines?.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium">{line.items?.code}</TableCell>
                      <TableCell>{line.items?.name}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">€{line.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">€{line.total_price.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{line.notes || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
