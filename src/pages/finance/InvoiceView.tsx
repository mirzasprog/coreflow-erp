import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Edit, XCircle, CheckCircle, DollarSign } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useInvoice, usePostInvoice, useCancelInvoice, useRecordPayment } from '@/hooks/useInvoices';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isOutgoing = location.pathname.includes('/outgoing');
  const invoiceType = isOutgoing ? 'outgoing' : 'incoming';
  
  const { data: invoice, isLoading } = useInvoice(id);
  const postInvoice = usePostInvoice();
  const cancelInvoice = useCancelInvoice();
  const recordPayment = useRecordPayment();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  const handlePost = async () => {
    if (!id) return;
    await postInvoice.mutateAsync(id);
  };

  const handleCancel = async () => {
    if (!id) return;
    await cancelInvoice.mutateAsync(id);
  };

  const handleRecordPayment = async () => {
    if (!id || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    await recordPayment.mutateAsync({ id, amount });
    setPaymentDialogOpen(false);
    setPaymentAmount('');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Invoice not found
      </div>
    );
  }

  const backUrl = `/finance/invoices/${invoiceType}`;
  const editUrl = `/finance/invoices/${invoiceType}/${id}/edit`;
  const title = isOutgoing ? 'Outgoing Invoice' : 'Incoming Invoice';
  const remainingAmount = invoice.total - (invoice.paid_amount || 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <span className="badge-success">Posted</span>;
      case 'cancelled':
        return <span className="badge-danger">Cancelled</span>;
      default:
        return <span className="badge-warning">Draft</span>;
    }
  };

  return (
    <div>
      <Header 
        title={`${title} ${invoice.invoice_number}`} 
        subtitle={`${isOutgoing ? 'Izlazna faktura' : 'Ulazna faktura'} • View details`} 
      />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <NavLink to={backUrl} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to {isOutgoing ? 'Outgoing' : 'Incoming'} Invoices
          </NavLink>
          <div className="flex gap-2">
            {invoice.status === 'draft' && (
              <>
                <NavLink to={editUrl}>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </NavLink>
                <Button onClick={handlePost} disabled={postInvoice.isPending}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Post
                </Button>
              </>
            )}
            {invoice.status === 'posted' && (
              <>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(true)}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
                <Button variant="destructive" onClick={handleCancel} disabled={cancelInvoice.isPending}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Invoice Details
                {getStatusBadge(invoice.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="font-medium">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice Date</p>
                <p className="font-medium">{format(new Date(invoice.invoice_date), 'dd.MM.yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{isOutgoing ? 'Customer' : 'Supplier'}</p>
                <p className="font-medium">{invoice.partners?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{invoice.due_date ? format(new Date(invoice.due_date), 'dd.MM.yyyy') : '-'}</p>
              </div>
              {invoice.warehouse_document_id && (invoice as any).warehouse_documents && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Linked Warehouse Document</p>
                  <p className="font-medium">{(invoice as any).warehouse_documents?.document_number || '-'}</p>
                </div>
              )}
              {invoice.notes && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">€{invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT:</span>
                  <span className="font-medium">€{invoice.vat_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">€{invoice.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="font-medium text-success">€{(invoice.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className={`font-medium ${remainingAmount > 0 ? 'text-destructive' : 'text-success'}`}>
                    €{remainingAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Invoice Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No lines
                    </TableCell>
                  </TableRow>
                ) : (
                  invoice.lines?.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{line.items?.code || '-'}</TableCell>
                      <TableCell>{line.description || line.items?.name || '-'}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">€{line.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {line.vat_rates ? `${line.vat_rates.rate}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right">€{line.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter the payment amount for invoice {invoice.invoice_number}. 
              Remaining: €{remainingAmount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment">Payment Amount</Label>
              <Input
                id="payment"
                type="number"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={recordPayment.isPending}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
