import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Truck, Plus, Pencil, ArrowRight, TrendingUp, Clock, CheckCircle, AlertTriangle, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, parseISO } from 'date-fns';

interface Supplier {
  id: string;
  code: string;
  name: string;
  type: 'supplier' | 'customer' | 'both' | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  payment_terms_days: number | null;
  active: boolean | null;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  total_value: number | null;
  updated_at: string | null;
  partner_id: string | null;
}

interface SupplierPerformance {
  supplier: Supplier;
  totalOrders: number;
  receivedOrders: number;
  pendingOrders: number;
  totalValue: number;
  avgDeliveryDays: number | null;
  onTimeRate: number | null;
}

export function SuppliersWidget() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierPerformance | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'supplier' as 'supplier' | 'customer' | 'both',
    address: '',
    city: '',
    postal_code: '',
    country: '',
    email: '',
    phone: '',
    tax_id: '',
    payment_terms_days: 30,
    active: true
  });

  // Fetch suppliers
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['dashboard-suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .in('type', ['supplier', 'both'])
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data as Supplier[];
    }
  });

  // Fetch purchase orders for performance metrics
  const { data: orders } = useQuery({
    queryKey: ['dashboard-supplier-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, order_number, status, order_date, expected_date, total_value, updated_at, partner_id')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PurchaseOrder[];
    }
  });

  // Calculate supplier performance metrics
  const supplierPerformance: SupplierPerformance[] = suppliers?.map(supplier => {
    const supplierOrders = orders?.filter(o => o.partner_id === supplier.id) || [];
    const receivedOrders = supplierOrders.filter(o => o.status === 'received');
    const pendingOrders = supplierOrders.filter(o => o.status === 'ordered');
    
    // Calculate average delivery time for received orders
    let avgDeliveryDays: number | null = null;
    let onTimeCount = 0;
    
    if (receivedOrders.length > 0) {
      const deliveryTimes = receivedOrders
        .filter(o => o.order_date && o.updated_at)
        .map(o => {
          const orderDate = parseISO(o.order_date);
          const receivedDate = parseISO(o.updated_at!);
          const days = differenceInDays(receivedDate, orderDate);
          
          // Check if on time (received before or on expected date)
          if (o.expected_date) {
            const expectedDate = parseISO(o.expected_date);
            if (receivedDate <= expectedDate) onTimeCount++;
          }
          
          return days;
        });
      
      if (deliveryTimes.length > 0) {
        avgDeliveryDays = Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length);
      }
    }

    const ordersWithExpectedDate = receivedOrders.filter(o => o.expected_date).length;
    const onTimeRate = ordersWithExpectedDate > 0 
      ? Math.round((onTimeCount / ordersWithExpectedDate) * 100) 
      : null;

    return {
      supplier,
      totalOrders: supplierOrders.length,
      receivedOrders: receivedOrders.length,
      pendingOrders: pendingOrders.length,
      totalValue: supplierOrders.reduce((sum, o) => sum + (o.total_value || 0), 0),
      avgDeliveryDays,
      onTimeRate
    };
  }).sort((a, b) => b.totalOrders - a.totalOrders) || [];

  // Top performers (by on-time rate)
  const topPerformers = supplierPerformance
    .filter(s => s.onTimeRate !== null && s.receivedOrders >= 2)
    .sort((a, b) => (b.onTimeRate || 0) - (a.onTimeRate || 0))
    .slice(0, 3);

  const openNewDialog = () => {
    setEditSupplier(null);
    setFormData({
      code: '',
      name: '',
      type: 'supplier',
      address: '',
      city: '',
      postal_code: '',
      country: '',
      email: '',
      phone: '',
      tax_id: '',
      payment_terms_days: 30,
      active: true
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      type: supplier.type || 'supplier',
      address: supplier.address || '',
      city: supplier.city || '',
      postal_code: supplier.postal_code || '',
      country: supplier.country || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      tax_id: supplier.tax_id || '',
      payment_terms_days: supplier.payment_terms_days || 30,
      active: supplier.active ?? true
    });
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        type: formData.type,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        country: formData.country.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        tax_id: formData.tax_id.trim() || null,
        payment_terms_days: formData.payment_terms_days,
        active: formData.active,
        updated_at: new Date().toISOString()
      };

      if (!data.code || !data.name) {
        throw new Error('Code and Name are required');
      }

      if (editSupplier) {
        const { error } = await supabase
          .from('partners')
          .update(data)
          .eq('id', editSupplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('partners')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['partners-list'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      toast({
        title: editSupplier ? 'Supplier Updated' : 'Supplier Created',
        description: `Supplier "${formData.name}" has been ${editSupplier ? 'updated' : 'created'} successfully`
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (suppliersLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-module-warehouse" />
            Suppliers
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openNewDialog}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/settings/partners')}
              className="text-muted-foreground hover:text-foreground"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <Truck className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xl font-bold">{suppliers?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Active Suppliers</p>
            </div>
            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
              <Package className="h-4 w-4 mx-auto text-blue-600 mb-1" />
              <p className="text-xl font-bold text-blue-600">
                {supplierPerformance.reduce((sum, s) => sum + s.pendingOrders, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Pending Orders</p>
            </div>
            <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-green-600 mb-1" />
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(supplierPerformance.reduce((sum, s) => sum + s.totalValue, 0))}
              </p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </div>

          {/* Top Performers */}
          {topPerformers.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Top Performers
              </h4>
              <div className="space-y-2">
                {topPerformers.map((perf) => (
                  <div
                    key={perf.supplier.id}
                    className="flex items-center justify-between rounded-lg border p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedSupplier(perf)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{perf.supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{perf.receivedOrders} orders delivered</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {perf.onTimeRate}% on-time
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supplier List */}
          <div>
            <h4 className="text-sm font-medium mb-2">All Suppliers</h4>
            <ScrollArea className="h-[180px]">
              <div className="space-y-1">
                {supplierPerformance.slice(0, 10).map((perf) => (
                  <div
                    key={perf.supplier.id}
                    className="flex items-center justify-between rounded-lg border p-2 hover:bg-muted/50 cursor-pointer transition-colors group"
                    onClick={() => setSelectedSupplier(perf)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{perf.supplier.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {perf.totalOrders} orders • {perf.supplier.payment_terms_days || 30} days terms
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {perf.avgDeliveryDays !== null && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {perf.avgDeliveryDays}d avg
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(perf.supplier);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {suppliers?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No suppliers yet</p>
                    <Button variant="link" size="sm" onClick={openNewDialog}>
                      Add your first supplier
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Performance Detail Dialog */}
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {selectedSupplier?.supplier.name}
            </DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-4">
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{selectedSupplier.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{selectedSupplier.receivedOrders}</p>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">
                    {selectedSupplier.avgDeliveryDays !== null ? `${selectedSupplier.avgDeliveryDays}d` : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Delivery</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">
                    {selectedSupplier.onTimeRate !== null ? `${selectedSupplier.onTimeRate}%` : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">On-Time Rate</p>
                </div>
              </div>

              {/* Supplier Details */}
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Code:</span>
                  <span className="font-medium">{selectedSupplier.supplier.code}</span>
                </div>
                {selectedSupplier.supplier.email && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{selectedSupplier.supplier.email}</span>
                  </div>
                )}
                {selectedSupplier.supplier.phone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{selectedSupplier.supplier.phone}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Terms:</span>
                  <span>{selectedSupplier.supplier.payment_terms_days || 30} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-medium">{formatCurrency(selectedSupplier.totalValue)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedSupplier(null);
                    openEditDialog(selectedSupplier.supplier);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Supplier
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setSelectedSupplier(null);
                    navigate(`/warehouse/purchase-orders?supplier=${selectedSupplier.supplier.id}`);
                  }}
                >
                  View Orders
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSupplier ? 'Edit Supplier' : 'New Supplier'}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Supplier Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., SUP-001"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Partner Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'supplier' | 'customer' | 'both') => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier">Supplier Only</SelectItem>
                      <SelectItem value="both">Supplier & Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Company name"
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="e.g., BA123456789"
                  maxLength={50}
                />
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
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 pt-4">
              <div>
                <Label htmlFor="address">Street Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street name and number"
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="71000"
                    maxLength={20}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Sarajevo"
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Bosnia"
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@supplier.com"
                    maxLength={255}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+387 33 123 456"
                    maxLength={50}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="terms" className="space-y-4 pt-4">
              <div>
                <Label htmlFor="payment_terms">Payment Terms (days)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  value={formData.payment_terms_days}
                  onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 30 })}
                  min={0}
                  max={365}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number of days after invoice date for payment due
                </p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <h4 className="text-sm font-medium mb-2">Common Payment Terms</h4>
                <div className="flex flex-wrap gap-2">
                  {[0, 7, 14, 30, 45, 60, 90].map((days) => (
                    <Button
                      key={days}
                      variant={formData.payment_terms_days === days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, payment_terms_days: days })}
                    >
                      {days === 0 ? 'Due on receipt' : `${days} days`}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !formData.code.trim() || !formData.name.trim()}
            >
              {saveMutation.isPending ? 'Saving...' : editSupplier ? 'Update Supplier' : 'Create Supplier'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
