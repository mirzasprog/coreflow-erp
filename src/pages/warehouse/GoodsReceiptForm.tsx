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
import { useLocations, usePartners, useItems } from '@/hooks/useMasterData';
import {
  useWarehouseDocument,
  useCreateDocument,
  useUpdateDocument,
  usePostDocument,
  DocumentLine
} from '@/hooks/useWarehouseDocuments';
import { toast } from 'sonner';
import {
  isLotTracked,
  parseWmsLineMeta,
  serializeWmsLineMeta,
  warehouseBinLocations,
} from '@/lib/warehouseWms';

type WmsDocumentLine = DocumentLine & {
  lotNumber?: string;
  expiryDate?: string;
  productionDate?: string;
  binLocation?: string;
  binZone?: string;
};

export default function GoodsReceiptForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  
  const { data: locations } = useLocations();
  const { data: partners } = usePartners('supplier');
  const { data: items } = useItems();
  const { data: existingDoc, isLoading: loadingDoc } = useWarehouseDocument(isEdit ? id : undefined);
  
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const postDocument = usePostDocument();

  const [formData, setFormData] = useState({
    document_number: '',
    document_date: new Date().toISOString().split('T')[0],
    location_id: '',
    partner_id: '',
    notes: ''
  });

  const [lines, setLines] = useState<WmsDocumentLine[]>([]);
  const [newLine, setNewLine] = useState<Partial<WmsDocumentLine>>({
    item_id: '',
    quantity: 0,
    unit_price: 0,
    lotNumber: '',
    expiryDate: '',
    productionDate: '',
    binLocation: ''
  });

  useEffect(() => {
    if (existingDoc) {
      setFormData({
        document_number: existingDoc.document_number,
        document_date: existingDoc.document_date,
        location_id: existingDoc.location_id || '',
        partner_id: existingDoc.partner_id || '',
        notes: existingDoc.notes || ''
      });
      const wmsLines = (existingDoc.lines || []).map((line) => {
        const meta = parseWmsLineMeta(line.notes);
        return {
          ...line,
          lotNumber: meta?.lotNumber,
          expiryDate: meta?.expiryDate,
          productionDate: meta?.productionDate,
          binLocation: meta?.binLocation,
          binZone: meta?.binZone
        };
      });
      setLines(wmsLines);
    } else if (!isEdit) {
      // Generate document number for new documents
      setFormData(prev => ({
        ...prev,
        document_number: `PR-${Date.now().toString().slice(-6)}`
      }));
    }
  }, [existingDoc, isEdit]);

  const addLine = () => {
    if (!newLine.item_id || !newLine.quantity || newLine.quantity <= 0) {
      toast.error('Please select an item and enter a valid quantity');
      return;
    }
    if (!newLine.binLocation) {
      toast.error('Please select a physical bin location');
      return;
    }

    const lotTracked = isLotTracked(newLine.item_id);
    if (lotTracked) {
      if (!newLine.lotNumber || !newLine.expiryDate) {
        toast.error('LOT number and expiry date are required for LOT-controlled items');
        return;
      }
      const duplicateLot = lines.some(
        (line) => line.item_id === newLine.item_id && line.lotNumber === newLine.lotNumber
      );
      if (duplicateLot) {
        toast.error('LOT number must be unique per item');
        return;
      }
    }

    const item = items?.find(i => i.id === newLine.item_id);
    const totalPrice = (newLine.quantity || 0) * (newLine.unit_price || 0);
    const selectedBin = warehouseBinLocations.find((bin) => bin.code === newLine.binLocation);
    const meta = {
      lotNumber: newLine.lotNumber || undefined,
      expiryDate: newLine.expiryDate || undefined,
      productionDate: newLine.productionDate || undefined,
      binLocation: newLine.binLocation || undefined,
      binZone: selectedBin?.zone
    };

    setLines([...lines, {
      item_id: newLine.item_id,
      quantity: newLine.quantity || 0,
      unit_price: newLine.unit_price || 0,
      total_price: totalPrice,
      items: item ? { code: item.code, name: item.name } : null,
      lotNumber: meta.lotNumber,
      expiryDate: meta.expiryDate,
      productionDate: meta.productionDate,
      binLocation: meta.binLocation,
      binZone: meta.binZone,
      notes: serializeWmsLineMeta(meta)
    }]);

    setNewLine({
      item_id: '',
      quantity: 0,
      unit_price: 0,
      lotNumber: '',
      expiryDate: '',
      productionDate: '',
      binLocation: ''
    });
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => sum + line.total_price, 0);
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
    const hasMissingLotData = lines.some((line) => {
      if (!isLotTracked(line.item_id)) return false;
      return !line.lotNumber || !line.expiryDate;
    });
    if (hasMissingLotData) {
      toast.error('LOT-controlled items must include LOT number and expiry date');
      return;
    }
    const hasMissingBinLocation = lines.some((line) => !line.binLocation);
    if (hasMissingBinLocation) {
      toast.error('Every receipt line must include a bin location');
      return;
    }

    const document = {
      document_type: 'goods_receipt',
      document_number: formData.document_number,
      document_date: formData.document_date,
      location_id: formData.location_id,
      partner_id: formData.partner_id || null,
      notes: formData.notes || null,
      total_value: calculateTotal(),
      status: 'draft' as const
    };

    try {
      if (isEdit) {
        await updateDocument.mutateAsync({ id, document, lines });
        if (shouldPost) {
          await postDocument.mutateAsync({ id, documentType: 'goods_receipt' });
        }
      } else {
        const result = await createDocument.mutateAsync({ document, lines });
        if (shouldPost && result?.id) {
          await postDocument.mutateAsync({ id: result.id, documentType: 'goods_receipt' });
        }
      }
      navigate('/warehouse/receipts');
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
  const lotTracked = isLotTracked(newLine.item_id);

  return (
    <div>
      <Header 
        title={isEdit ? `Edit Receipt ${formData.document_number}` : 'New Goods Receipt'} 
        subtitle="Primka • Create incoming goods document" 
      />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/warehouse/receipts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Receipts
          </NavLink>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Header Info */}
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
              <div className="space-y-2">
                <Label htmlFor="location_id">Warehouse</Label>
                <Select
                  value={formData.location_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                  disabled={isPosted}
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
              <div className="space-y-2">
                <Label htmlFor="partner_id">Supplier</Label>
                <Select
                  value={formData.partner_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, partner_id: value })}
                  disabled={isPosted}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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

          {/* Summary */}
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
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">€{calculateTotal().toFixed(2)}</span>
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

        {/* Lines */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Document Lines</CardTitle>
          </CardHeader>
          <CardContent>
            {!isPosted && (
              <div className="mb-4 flex gap-2 flex-wrap">
                <Select
                  value={newLine.item_id || undefined}
                  onValueChange={(value) => {
                    const item = items?.find(i => i.id === value);
                    setNewLine({ 
                      ...newLine, 
                      item_id: value,
                      unit_price: item?.purchase_price || 0,
                      lotNumber: '',
                      expiryDate: '',
                      productionDate: ''
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
                  placeholder="Qty"
                  className="w-24"
                  value={newLine.quantity || ''}
                  onChange={(e) => setNewLine({ ...newLine, quantity: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  type="number"
                  placeholder="Price"
                  className="w-24"
                  value={newLine.unit_price || ''}
                  onChange={(e) => setNewLine({ ...newLine, unit_price: parseFloat(e.target.value) || 0 })}
                />
                <Select
                  value={newLine.binLocation || undefined}
                  onValueChange={(value) => setNewLine({ ...newLine, binLocation: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Bin location" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseBinLocations.map((bin) => (
                      <SelectItem key={bin.id} value={bin.code}>
                        {bin.code} • {bin.zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lotTracked && (
                  <>
                    <Input
                      placeholder="LOT"
                      className="w-32"
                      value={newLine.lotNumber || ''}
                      onChange={(e) => setNewLine({ ...newLine, lotNumber: e.target.value })}
                    />
                    <Input
                      type="date"
                      className="w-40"
                      value={newLine.expiryDate || ''}
                      onChange={(e) => setNewLine({ ...newLine, expiryDate: e.target.value })}
                    />
                    <Input
                      type="date"
                      className="w-40"
                      value={newLine.productionDate || ''}
                      onChange={(e) => setNewLine({ ...newLine, productionDate: e.target.value })}
                    />
                  </>
                )}
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
                  <TableHead>LOT</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Bin</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {!isPosted && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isPosted ? 8 : 9} className="py-8 text-center text-muted-foreground">
                      No items added
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{line.items?.code || '-'}</TableCell>
                      <TableCell>{line.items?.name || '-'}</TableCell>
                      <TableCell>{line.lotNumber || '-'}</TableCell>
                      <TableCell>{line.expiryDate || '-'}</TableCell>
                      <TableCell>{line.binLocation || '-'}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">€{line.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{line.total_price.toFixed(2)}</TableCell>
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
