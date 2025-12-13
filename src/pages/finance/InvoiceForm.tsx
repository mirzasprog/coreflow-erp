import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
import { usePartners, useItems, useVatRates } from '@/hooks/useMasterData';
import {
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  usePostInvoice,
  InvoiceLine
} from '@/hooks/useInvoices';
import { toast } from 'sonner';

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isOutgoing = location.pathname.includes('/outgoing');
  const invoiceType = isOutgoing ? 'outgoing' : 'incoming';
  const isEdit = !!id && id !== 'new';
  
  const partnerType = isOutgoing ? 'customer' : 'supplier';
  const { data: partners } = usePartners(partnerType);
  const { data: items } = useItems();
  const { data: vatRates } = useVatRates();
  const { data: existingInv, isLoading: loadingInv } = useInvoice(isEdit ? id : undefined);
  
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const postInvoice = usePostInvoice();

  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    partner_id: '',
    notes: ''
  });

  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [newLine, setNewLine] = useState<Partial<InvoiceLine>>({
    item_id: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    vat_rate_id: ''
  });

  useEffect(() => {
    if (existingInv) {
      setFormData({
        invoice_number: existingInv.invoice_number,
        invoice_date: existingInv.invoice_date,
        due_date: existingInv.due_date || '',
        partner_id: existingInv.partner_id || '',
        notes: existingInv.notes || ''
      });
      setLines(existingInv.lines || []);
    } else if (!isEdit) {
      const prefix = isOutgoing ? 'OUT' : 'IN';
      setFormData(prev => ({
        ...prev,
        invoice_number: `${prefix}-${Date.now().toString().slice(-6)}`
      }));
    }
  }, [existingInv, isEdit, isOutgoing]);

  const calculateLineTotal = (qty: number, price: number, vatRateId: string | null) => {
    const vatRate = vatRates?.find(v => v.id === vatRateId);
    const baseTotal = qty * price;
    const vatAmount = vatRate ? baseTotal * (vatRate.rate / 100) : 0;
    return { baseTotal, vatAmount, total: baseTotal + vatAmount };
  };

  const addLine = () => {
    if (!newLine.description && !newLine.item_id) {
      toast.error('Please enter a description or select an item');
      return;
    }

    const item = items?.find(i => i.id === newLine.item_id);
    const { baseTotal, vatAmount, total } = calculateLineTotal(
      newLine.quantity || 1,
      newLine.unit_price || 0,
      newLine.vat_rate_id || null
    );
    const vatRate = vatRates?.find(v => v.id === newLine.vat_rate_id);

    setLines([...lines, {
      item_id: newLine.item_id || null,
      description: newLine.description || item?.name || '',
      quantity: newLine.quantity || 1,
      unit_price: newLine.unit_price || 0,
      vat_rate_id: newLine.vat_rate_id || null,
      vat_amount: vatAmount,
      total: total,
      items: item ? { code: item.code, name: item.name } : null,
      vat_rates: vatRate ? { code: vatRate.code, rate: vatRate.rate } : null
    }]);

    setNewLine({ item_id: '', description: '', quantity: 1, unit_price: 0, vat_rate_id: '' });
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = lines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
    const vatAmount = lines.reduce((sum, line) => sum + line.vat_amount, 0);
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  };

  const handleSave = async (shouldPost = false) => {
    if (!formData.partner_id) {
      toast.error(`Please select a ${isOutgoing ? 'customer' : 'supplier'}`);
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one line');
      return;
    }

    const totals = calculateTotals();
    const invoice = {
      invoice_type: invoiceType,
      invoice_number: formData.invoice_number,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date || null,
      partner_id: formData.partner_id,
      notes: formData.notes || null,
      subtotal: totals.subtotal,
      vat_amount: totals.vatAmount,
      total: totals.total,
      status: 'draft' as const
    };

    try {
      if (isEdit) {
        await updateInvoice.mutateAsync({ id, invoice, lines });
        if (shouldPost) {
          await postInvoice.mutateAsync(id);
        }
      } else {
        const result = await createInvoice.mutateAsync({ invoice, lines });
        if (shouldPost && result?.id) {
          await postInvoice.mutateAsync(result.id);
        }
      }
      navigate(`/finance/invoices/${invoiceType}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (loadingInv) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isPosted = existingInv?.status === 'posted';
  const totals = calculateTotals();
  const backUrl = `/finance/invoices/${invoiceType}`;
  const title = isOutgoing ? 'Outgoing Invoice' : 'Incoming Invoice';
  const subtitle = isOutgoing ? 'Izlazna faktura' : 'Ulazna faktura';

  return (
    <div>
      <Header 
        title={isEdit ? `Edit ${title} ${formData.invoice_number}` : `New ${title}`} 
        subtitle={`${subtitle} • ${isEdit ? 'Edit' : 'Create'} invoice`} 
      />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to={backUrl} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to {isOutgoing ? 'Outgoing' : 'Incoming'} Invoices
          </NavLink>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Invoice Header</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  disabled={isPosted}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_date">Invoice Date</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  disabled={isPosted}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner_id">{isOutgoing ? 'Customer' : 'Supplier'}</Label>
                <Select
                  value={formData.partner_id || undefined}
                  onValueChange={(value) => setFormData({ ...formData, partner_id: value })}
                  disabled={isPosted}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${isOutgoing ? 'customer' : 'supplier'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {partners?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  disabled={isPosted}
                />
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
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">€{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT:</span>
                  <span className="font-medium">€{totals.vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">€{totals.total.toFixed(2)}</span>
                </div>
              </div>
              {!isPosted && (
                <div className="mt-4 space-y-2">
                  <Button className="w-full" onClick={() => handleSave(false)} disabled={createInvoice.isPending || updateInvoice.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button className="w-full" variant="default" onClick={() => handleSave(true)} disabled={createInvoice.isPending || updateInvoice.isPending || postInvoice.isPending}>
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
            <CardTitle>Invoice Lines</CardTitle>
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
                      description: item?.name || '',
                      unit_price: isOutgoing ? (item?.selling_price || 0) : (item?.purchase_price || 0),
                      vat_rate_id: item?.vat_rate_id || ''
                    });
                  }}
                >
                  <SelectTrigger className="w-48">
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
                  placeholder="Description"
                  className="w-48"
                  value={newLine.description || ''}
                  onChange={(e) => setNewLine({ ...newLine, description: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Qty"
                  className="w-20"
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
                  value={newLine.vat_rate_id || undefined}
                  onValueChange={(value) => setNewLine({ ...newLine, vat_rate_id: value })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="VAT" />
                  </SelectTrigger>
                  <SelectContent>
                    {vatRates?.map((vat) => (
                      <SelectItem key={vat.id} value={vat.id}>
                        {vat.code} ({vat.rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addLine}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {!isPosted && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isPosted ? 6 : 7} className="py-8 text-center text-muted-foreground">
                      No lines added
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{line.items?.code || '-'}</TableCell>
                      <TableCell>{line.description || line.items?.name || '-'}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">€{line.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {line.vat_rates ? `${line.vat_rates.rate}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right">€{line.total.toFixed(2)}</TableCell>
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
