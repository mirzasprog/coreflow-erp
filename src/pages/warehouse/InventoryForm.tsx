import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, Save, CheckCircle, Loader2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocations, useItems, useStock } from '@/hooks/useMasterData';
import {
  useWarehouseDocument,
  useCreateDocument,
  useUpdateDocument,
  usePostDocument,
  DocumentLine
} from '@/hooks/useWarehouseDocuments';
import { toast } from 'sonner';

interface InventoryLine extends DocumentLine {
  counted_quantity?: number;
  difference_quantity?: number;
}

export default function InventoryForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  
  const { data: locations } = useLocations();
  const { data: items } = useItems();
  const { data: existingDoc, isLoading: loadingDoc } = useWarehouseDocument(isEdit ? id : undefined);
  
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const postDocument = usePostDocument();

  const [formData, setFormData] = useState({
    document_number: '',
    document_date: new Date().toISOString().split('T')[0],
    location_id: '',
    notes: ''
  });

  const { data: stockData } = useStock(formData.location_id || undefined);

  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [newLine, setNewLine] = useState<Partial<InventoryLine>>({
    item_id: '',
    quantity: 0,
    counted_quantity: 0,
    unit_price: 0
  });

  useEffect(() => {
    if (existingDoc) {
      setFormData({
        document_number: existingDoc.document_number,
        document_date: existingDoc.document_date,
        location_id: existingDoc.location_id || '',
        notes: existingDoc.notes || ''
      });
      setLines(existingDoc.lines?.map(line => ({
        ...line,
        counted_quantity: line.counted_quantity ?? line.quantity,
        difference_quantity: line.difference_quantity ?? 0
      })) || []);
    } else if (!isEdit) {
      setFormData(prev => ({
        ...prev,
        document_number: `INV-${Date.now().toString().slice(-6)}`
      }));
    }
  }, [existingDoc, isEdit]);

  const addLine = () => {
    if (!newLine.item_id) {
      toast.error('Please select an item');
      return;
    }

    const item = items?.find(i => i.id === newLine.item_id);
    const stockItem = stockData?.find(s => s.item_id === newLine.item_id);
    const systemQty = stockItem?.quantity || 0;
    const countedQty = newLine.counted_quantity || 0;
    const difference = countedQty - systemQty;
    const unitPrice = newLine.unit_price || item?.purchase_price || 0;
    const totalPrice = difference * unitPrice;

    setLines([...lines, {
      item_id: newLine.item_id,
      quantity: systemQty,
      counted_quantity: countedQty,
      difference_quantity: difference,
      unit_price: unitPrice,
      total_price: totalPrice,
      items: item ? { code: item.code, name: item.name } : null
    }]);

    setNewLine({ item_id: '', quantity: 0, counted_quantity: 0, unit_price: 0 });
  };

  const updateCountedQuantity = (index: number, countedQty: number) => {
    const updatedLines = [...lines];
    const line = updatedLines[index];
    const systemQty = line.quantity;
    const difference = countedQty - systemQty;
    
    updatedLines[index] = {
      ...line,
      counted_quantity: countedQty,
      difference_quantity: difference,
      total_price: difference * line.unit_price
    };
    setLines(updatedLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => sum + (line.total_price || 0), 0);
  };

  const handleSave = async (shouldPost = false) => {
    if (!formData.location_id) {
      toast.error('Please select a warehouse');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const document = {
      document_type: 'inventory',
      document_number: formData.document_number,
      document_date: formData.document_date,
      location_id: formData.location_id,
      partner_id: null,
      notes: formData.notes || null,
      total_value: calculateTotal(),
      status: 'draft' as const
    };

    const documentLines = lines.map(line => ({
      item_id: line.item_id,
      quantity: line.quantity,
      counted_quantity: line.counted_quantity,
      difference_quantity: line.difference_quantity,
      unit_price: line.unit_price,
      total_price: line.total_price
    }));

    try {
      if (isEdit) {
        await updateDocument.mutateAsync({ id, document, lines: documentLines });
        if (shouldPost) {
          await postDocument.mutateAsync({ id, documentType: 'inventory' });
        }
      } else {
        const result = await createDocument.mutateAsync({ document, lines: documentLines });
        if (shouldPost && result?.id) {
          await postDocument.mutateAsync({ id: result.id, documentType: 'inventory' });
        }
      }
      navigate('/warehouse/inventory');
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (loadingDoc) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isPosted = existingDoc?.status === 'posted';

  return (
    <div>
      <Header 
        title={isEdit ? `Edit Inventory ${formData.document_number}` : 'New Inventory Count'} 
        subtitle="Inventura • Physical stock count" 
      />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/warehouse/inventory" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Inventory
          </NavLink>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Document Header</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="document_number">Document Number</Label>
                <Input
                  id="document_number"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  disabled={isPosted}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document_date">Date</Label>
                <Input
                  id="document_date"
                  type="date"
                  value={formData.document_date}
                  onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                  disabled={isPosted}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="location_id">Warehouse</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, location_id: value });
                    setLines([]);
                  }}
                  disabled={isPosted || lines.length > 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  disabled={isPosted}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lines:</span>
                  <span className="font-medium">{lines.length}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Difference:</span>
                  <span className={`font-bold ${calculateTotal() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
              {!isPosted && (
                <div className="mt-4 space-y-2">
                  <Button className="w-full" onClick={() => handleSave(false)} disabled={createDocument.isPending || updateDocument.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button className="w-full" variant="default" onClick={() => handleSave(true)} disabled={createDocument.isPending || updateDocument.isPending || postDocument.isPending}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save & Post
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Inventory Lines</CardTitle>
          </CardHeader>
          <CardContent>
            {!isPosted && formData.location_id && (
              <div className="mb-4 flex gap-2 flex-wrap">
                <Select
                  value={newLine.item_id}
                  onValueChange={(value) => {
                    const item = items?.find(i => i.id === value);
                    const stockItem = stockData?.find(s => s.item_id === value);
                    setNewLine({ 
                      ...newLine, 
                      item_id: value,
                      quantity: stockItem?.quantity || 0,
                      unit_price: item?.purchase_price || 0
                    });
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} - {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Counted Qty"
                  className="w-32"
                  value={newLine.counted_quantity || ''}
                  onChange={(e) => setNewLine({ ...newLine, counted_quantity: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  type="number"
                  placeholder="Price"
                  className="w-24"
                  value={newLine.unit_price || ''}
                  onChange={(e) => setNewLine({ ...newLine, unit_price: parseFloat(e.target.value) || 0 })}
                />
                <Button onClick={addLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">System Qty</TableHead>
                  <TableHead className="text-right">Counted Qty</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Diff. Value</TableHead>
                  {!isPosted && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isPosted ? 7 : 8} className="py-8 text-center text-muted-foreground">
                      {formData.location_id ? 'No items added' : 'Select a warehouse first'}
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{line.items?.code || '-'}</TableCell>
                      <TableCell>{line.items?.name || '-'}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">
                        {!isPosted ? (
                          <Input
                            type="number"
                            className="w-20 text-right"
                            value={line.counted_quantity || 0}
                            onChange={(e) => updateCountedQuantity(index, parseFloat(e.target.value) || 0)}
                          />
                        ) : (
                          line.counted_quantity
                        )}
                      </TableCell>
                      <TableCell className={`text-right ${(line.difference_quantity || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(line.difference_quantity || 0) > 0 ? '+' : ''}{line.difference_quantity}
                      </TableCell>
                      <TableCell className="text-right">€{line.unit_price.toFixed(2)}</TableCell>
                      <TableCell className={`text-right ${(line.total_price || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        €{(line.total_price || 0).toFixed(2)}
                      </TableCell>
                      {!isPosted && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeLine(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
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
