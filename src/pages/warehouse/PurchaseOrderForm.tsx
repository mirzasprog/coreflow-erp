import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocations, usePartners, useItems } from '@/hooks/useMasterData';
import { useToast } from '@/hooks/use-toast';

interface OrderLine {
  id?: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string;
}

export default function PurchaseOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: locations } = useLocations();
  const { data: suppliers } = usePartners('supplier');
  const { data: items } = useItems();

  const [formData, setFormData] = useState({
    partner_id: '',
    location_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: ''
  });
  const [lines, setLines] = useState<OrderLine[]>([]);

  // Fetch existing order if editing
  const { data: existingOrder } = useQuery({
    queryKey: ['purchase-order-edit', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      
      if (error) throw error;
      
      const { data: orderLines, error: linesError } = await supabase
        .from('purchase_order_lines')
        .select('*')
        .eq('order_id', id!);
      
      if (linesError) throw linesError;
      
      return { ...data, lines: orderLines };
    }
  });

  useEffect(() => {
    if (existingOrder) {
      setFormData({
        partner_id: existingOrder.partner_id || '',
        location_id: existingOrder.location_id || '',
        order_date: existingOrder.order_date || new Date().toISOString().split('T')[0],
        expected_date: existingOrder.expected_date || '',
        notes: existingOrder.notes || ''
      });
      setLines(existingOrder.lines?.map((line: OrderLine) => ({
        id: line.id,
        item_id: line.item_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_price: line.total_price,
        notes: line.notes || ''
      })) || []);
    }
  }, [existingOrder]);

  const addLine = () => {
    setLines([...lines, {
      item_id: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      notes: ''
    }]);
  };

  const updateLine = (index: number, field: keyof OrderLine, value: string | number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate total
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total_price = updated[index].quantity * updated[index].unit_price;
    }
    
    // Auto-fill price when item is selected
    if (field === 'item_id' && items) {
      const item = items.find(i => i.id === value);
      if (item) {
        updated[index].unit_price = item.purchase_price || 0;
        updated[index].total_price = updated[index].quantity * updated[index].unit_price;
      }
    }
    
    setLines(updated);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalValue = lines.reduce((sum, line) => sum + line.total_price, 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const orderNumber = isEdit ? existingOrder?.order_number : await generateOrderNumber();
      
      const orderData = {
        order_number: orderNumber,
        partner_id: formData.partner_id || null,
        location_id: formData.location_id || null,
        order_date: formData.order_date,
        expected_date: formData.expected_date || null,
        notes: formData.notes || null,
        total_value: totalValue,
        status: 'draft'
      };

      let orderId = id;

      if (isEdit) {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ ...orderData, updated_at: new Date().toISOString() })
          .eq('id', id!);
        if (error) throw error;

        // Delete existing lines
        await supabase.from('purchase_order_lines').delete().eq('order_id', id!);
      } else {
        const { data, error } = await supabase
          .from('purchase_orders')
          .insert(orderData)
          .select()
          .single();
        if (error) throw error;
        orderId = data.id;
      }

      // Insert lines
      if (lines.length > 0) {
        const lineData = lines.map(line => ({
          order_id: orderId,
          item_id: line.item_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total_price: line.total_price,
          notes: line.notes || null
        }));

        const { error: linesError } = await supabase
          .from('purchase_order_lines')
          .insert(lineData);
        if (linesError) throw linesError;
      }

      return orderId;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', orderId] });
      toast({
        title: isEdit ? 'Order Updated' : 'Order Created',
        description: `Purchase order has been ${isEdit ? 'updated' : 'created'} successfully`
      });
      navigate(`/warehouse/purchase-orders/${orderId}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  async function generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    
    const { data } = await supabase
      .from('purchase_orders')
      .select('order_number')
      .like('order_number', `${prefix}%`)
      .order('order_number', { ascending: false })
      .limit(1);
    
    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].order_number.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }
    
    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  }

  return (
    <div>
      <Header 
        title={isEdit ? 'Edit Purchase Order' : 'New Purchase Order'} 
        subtitle="Narudžbenica • Create or edit supplier order" 
      />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/warehouse/purchase-orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Purchase Orders
          </NavLink>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="partner_id">Supplier</Label>
                  <Select 
                    value={formData.partner_id || undefined} 
                    onValueChange={(value) => setFormData({ ...formData, partner_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location_id">Delivery Location</Label>
                  <Select 
                    value={formData.location_id || undefined} 
                    onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="order_date">Order Date</Label>
                  <Input
                    id="order_date"
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="expected_date">Expected Delivery</Label>
                  <Input
                    id="expected_date"
                    type="date"
                    value={formData.expected_date}
                    onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{lines.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">€{totalValue.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || lines.length === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Order'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Lines */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order Lines</CardTitle>
              <Button onClick={addLine}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Item</TableHead>
                  <TableHead className="w-[100px]">Quantity</TableHead>
                  <TableHead className="w-[120px]">Unit Price</TableHead>
                  <TableHead className="w-[120px]">Total</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No items added. Click "Add Item" to start.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select 
                          value={line.item_id || undefined} 
                          onValueChange={(value) => updateLine(index, 'item_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items?.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.code} - {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        €{line.total_price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.notes}
                          onChange={(e) => updateLine(index, 'notes', e.target.value)}
                          placeholder="Notes..."
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeLine(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
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
