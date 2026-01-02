import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, CheckCircle, Loader2, Package, AlertCircle, CalendarDays } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { usePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useCreateDocument, usePostDocument } from '@/hooks/useWarehouseDocuments';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { serializeWmsLineMeta } from '@/lib/warehouseWms';

interface ReceiptLine {
  item_id: string;
  ordered_quantity: number;
  previously_received: number;
  receiving_quantity: number;
  unit_price: number;
  items?: { code: string; name: string; lot_tracking?: boolean; require_lot_on_receipt?: boolean } | null;
  lot_number?: string;
  expiry_date?: string;
  bin_location?: string;
}

export default function GoodsReceiptFromPO() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  
  const { data: order, isLoading: loadingOrder } = usePurchaseOrder(orderId);
  const createDocument = useCreateDocument();
  const postDocument = usePostDocument();

  const [formData, setFormData] = useState({
    document_number: '',
    document_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [lines, setLines] = useState<ReceiptLine[]>([]);

  useEffect(() => {
    const generateDocNumber = async () => {
      const year = new Date().getFullYear();
      const prefix = `GR-${year}-`;
      
      const { data } = await supabase
        .from('warehouse_documents')
        .select('document_number')
        .like('document_number', `${prefix}%`)
        .order('document_number', { ascending: false })
        .limit(1);
      
      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].document_number.replace(prefix, ''), 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      
      setFormData(prev => ({
        ...prev,
        document_number: `${prefix}${String(nextNumber).padStart(5, '0')}`
      }));
    };

    generateDocNumber();
  }, []);

  useEffect(() => {
    const loadLinesWithLotInfo = async () => {
      if (!order?.lines) return;
      
      // Fetch item details including lot_tracking
      const itemIds = order.lines.map(l => l.item_id);
      const { data: itemsData } = await supabase
        .from('items')
        .select('id, code, name, lot_tracking, require_lot_on_receipt')
        .in('id', itemIds);
      
      const itemsMap = new Map(itemsData?.map(i => [i.id, i]) || []);
      
      const receiptLines: ReceiptLine[] = order.lines.map(line => {
        const itemData = itemsMap.get(line.item_id);
        return {
          item_id: line.item_id,
          ordered_quantity: line.quantity,
          previously_received: (line as any).received_quantity || 0,
          receiving_quantity: line.quantity - ((line as any).received_quantity || 0),
          unit_price: line.unit_price,
          items: itemData || line.items,
          lot_number: '',
          expiry_date: '',
          bin_location: ''
        };
      });
      setLines(receiptLines);
    };
    
    loadLinesWithLotInfo();
  }, [order]);

  const updateReceivingQuantity = (index: number, value: number) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== index) return line;
      const maxReceivable = line.ordered_quantity - line.previously_received;
      const newQty = Math.min(Math.max(0, value), maxReceivable);
      return { ...line, receiving_quantity: newQty };
    }));
  };

  const updateLotData = (index: number, field: 'lot_number' | 'expiry_date' | 'bin_location', value: string) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== index) return line;
      return { ...line, [field]: value };
    }));
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => sum + (line.receiving_quantity * line.unit_price), 0);
  };

  const hasItemsToReceive = () => {
    return lines.some(line => line.receiving_quantity > 0);
  };

  const validateLotData = () => {
    const errors: string[] = [];
    lines.forEach((line, index) => {
      if (line.receiving_quantity > 0 && line.items?.lot_tracking) {
        if (!line.lot_number?.trim()) {
          errors.push(`${line.items.code || `Stavka ${index + 1}`}: LOT broj je obavezan`);
        }
        if (!line.expiry_date) {
          errors.push(`${line.items.code || `Stavka ${index + 1}`}: Rok trajanja je obavezan`);
        }
      }
    });
    return errors;
  };

  const handleSave = async (shouldPost = false) => {
    if (!hasItemsToReceive()) {
      toast.error('Molimo unesite količine za primku');
      return;
    }

    // Validate LOT data for items with lot_tracking enabled
    const lotErrors = validateLotData();
    if (lotErrors.length > 0) {
      lotErrors.forEach(err => toast.error(err));
      return;
    }

    const filteredLines = lines.filter(line => line.receiving_quantity > 0);

    const document = {
      document_type: 'goods_receipt',
      document_number: formData.document_number,
      document_date: formData.document_date,
      location_id: order?.location_id,
      partner_id: order?.partner_id,
      purchase_order_id: orderId,
      notes: formData.notes || `Primka iz narudžbenice ${order?.order_number}`,
      total_value: calculateTotal(),
      status: 'draft' as const
    };

    const documentLines = filteredLines.map(line => {
      // Serialize WMS metadata for lines with LOT tracking
      const wmsMeta = line.items?.lot_tracking ? serializeWmsLineMeta({
        lotNumber: line.lot_number,
        expiryDate: line.expiry_date,
        binLocation: line.bin_location
      }) : null;

      return {
        item_id: line.item_id,
        quantity: line.receiving_quantity,
        unit_price: line.unit_price,
        total_price: line.receiving_quantity * line.unit_price,
        notes: wmsMeta,
        items: line.items
      };
    });

    try {
      const result = await createDocument.mutateAsync({ document, lines: documentLines });
      
      // Update received quantities on PO lines
      for (const line of filteredLines) {
        const poLine = order?.lines?.find(l => l.item_id === line.item_id);
        if (poLine) {
          // Keep received quantities additive and avoid operator precedence issues.
          const previouslyReceived = (poLine as any).received_quantity || 0;
          const newReceivedQty = previouslyReceived + line.receiving_quantity;
          await supabase
            .from('purchase_order_lines')
            .update({ received_quantity: newReceivedQty })
            .eq('id', poLine.id);
        }
      }

      if (orderId) {
        const { data: updatedLines, error: updatedLinesError } = await supabase
          .from('purchase_order_lines')
          .select('quantity, received_quantity')
          .eq('order_id', orderId);

        if (updatedLinesError) throw updatedLinesError;

        const isFullyReceived = (updatedLines || []).every((line: any) => (
          (line.received_quantity || 0) >= line.quantity
        ));

        if (isFullyReceived) {
          await supabase
            .from('purchase_orders')
            .update({ status: 'received', updated_at: new Date().toISOString() })
            .eq('id', orderId);
        }
      }

      if (shouldPost && result?.id) {
        await postDocument.mutateAsync({ id: result.id, documentType: 'goods_receipt' });
      }
      
      toast.success(shouldPost ? 'Primka kreirana i proknjižena' : 'Primka kreirana kao nacrt');
      navigate('/warehouse/receipts');
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (loadingOrder) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <Header title="Primka" subtitle="Narudžbenica nije pronađena" />
        <div className="p-6">
          <NavLink to="/warehouse/purchase-orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Natrag na narudžbenice
          </NavLink>
        </div>
      </div>
    );
  }

  const allReceived = lines.every(line => line.previously_received >= line.ordered_quantity);

  return (
    <div>
      <Header 
        title={`Nova primka iz ${order.order_number}`} 
        subtitle="Primka • Kreiranje primke iz narudžbenice" 
      />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to={`/warehouse/purchase-orders/${orderId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Natrag na narudžbenicu
          </NavLink>
        </div>

        {allReceived && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Sve stavke iz ove narudžbenice su već primljene.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Header Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Podaci primke
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="document_number">Broj dokumenta</Label>
                <Input
                  id="document_number"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document_date">Datum</Label>
                <Input
                  id="document_date"
                  type="date"
                  value={formData.document_date}
                  onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Narudžbenica</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{order.order_number}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dobavljač</Label>
                <p className="text-sm font-medium">{order.partners?.name || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label>Skladište</Label>
                <p className="text-sm font-medium">{order.locations?.name || '-'}</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Napomene</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Opcionalne napomene..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Sažetak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stavke za primku:</span>
                  <span className="font-medium">{lines.filter(l => l.receiving_quantity > 0).length}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Ukupno:</span>
                  <span className="font-bold">€{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => handleSave(false)} 
                  disabled={createDocument.isPending || !hasItemsToReceive()}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Spremi kao nacrt
                </Button>
                <Button 
                  className="w-full" 
                  onClick={() => handleSave(true)} 
                  disabled={createDocument.isPending || postDocument.isPending || !hasItemsToReceive()}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Spremi i proknjiži
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lines */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Stavke za prijem</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Šifra</TableHead>
                  <TableHead>Naziv artikla</TableHead>
                  <TableHead className="text-right">Preostalo</TableHead>
                  <TableHead className="text-right w-24">Primam</TableHead>
                  <TableHead>LOT broj</TableHead>
                  <TableHead>Rok trajanja</TableHead>
                  <TableHead>Lokacija</TableHead>
                  <TableHead className="text-right">Ukupno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nema stavki
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => {
                    const remaining = line.ordered_quantity - line.previously_received;
                    const requiresLot = line.items?.lot_tracking;
                    return (
                      <TableRow key={index} className={requiresLot ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                        <TableCell className="font-medium">
                          {line.items?.code || '-'}
                          {requiresLot && (
                            <Badge variant="outline" className="ml-2 text-xs border-amber-500 text-amber-700">LOT</Badge>
                          )}
                        </TableCell>
                        <TableCell>{line.items?.name || '-'}</TableCell>
                        <TableCell className="text-right">
                          {remaining > 0 ? (
                            <Badge variant="outline">{remaining}</Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-600">Primljeno</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="w-20 text-right"
                            value={line.receiving_quantity}
                            onChange={(e) => updateReceivingQuantity(index, parseFloat(e.target.value) || 0)}
                            max={remaining}
                            min={0}
                            disabled={remaining <= 0}
                          />
                        </TableCell>
                        <TableCell>
                          {requiresLot ? (
                            <Input
                              className="w-28"
                              placeholder="LOT-YYYY-XX"
                              value={line.lot_number || ''}
                              onChange={(e) => updateLotData(index, 'lot_number', e.target.value)}
                              disabled={remaining <= 0 || line.receiving_quantity === 0}
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {requiresLot ? (
                            <Input
                              type="date"
                              className="w-32"
                              value={line.expiry_date || ''}
                              onChange={(e) => updateLotData(index, 'expiry_date', e.target.value)}
                              disabled={remaining <= 0 || line.receiving_quantity === 0}
                            />
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="w-20"
                            placeholder="A-01-01"
                            value={line.bin_location || ''}
                            onChange={(e) => updateLotData(index, 'bin_location', e.target.value)}
                            disabled={remaining <= 0 || line.receiving_quantity === 0}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{(line.receiving_quantity * line.unit_price).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
