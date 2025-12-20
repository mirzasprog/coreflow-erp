import { useParams, useNavigate } from 'react-router-dom';
import { useRef } from 'react';
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
import { ArrowLeft, Clock, ShoppingCart, CheckCircle, Pencil, Trash2, Package, Mail, Printer, FileText, Link2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { usePurchaseOrder, useUpdatePurchaseOrderStatus, useConvertToGoodsReceipt, usePurchaseOrderRelatedDocuments } from '@/hooks/usePurchaseOrders';
import { PurchaseOrderPDF } from '@/components/warehouse/PurchaseOrderPDF';
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
  const { data: relatedDocuments } = usePurchaseOrderRelatedDocuments(id);
  const updateStatusMutation = useUpdatePurchaseOrderStatus();
  const convertToGoodsReceiptMutation = useConvertToGoodsReceipt();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Could not open print window. Please allow popups.',
        variant: 'destructive'
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order ${order?.order_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .print-container { padding: 2rem; max-width: 800px; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.875rem; }
            th { background-color: #f3f4f6; font-weight: 600; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-medium { font-weight: 500; }
            .font-semibold { font-weight: 600; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            .text-3xl { font-size: 1.875rem; }
            .text-gray-400 { color: #9ca3af; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-800 { color: #1f2937; }
            .text-gray-900 { color: #111827; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-white { background-color: #ffffff; }
            .border { border: 1px solid #e5e7eb; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .border-gray-300 { border-color: #d1d5db; }
            .border-gray-400 { border-color: #9ca3af; }
            .rounded-lg { border-radius: 0.5rem; }
            .rounded-full { border-radius: 9999px; }
            .p-4 { padding: 1rem; }
            .p-8 { padding: 2rem; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pt-4 { padding-top: 1rem; }
            .pt-8 { padding-top: 2rem; }
            .pb-6 { padding-bottom: 1.5rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-12 { margin-bottom: 3rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-8 { margin-top: 2rem; }
            .mt-12 { margin-top: 3rem; }
            .uppercase { text-transform: uppercase; }
            .capitalize { text-transform: capitalize; }
            .inline-block { display: inline-block; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-8 { gap: 2rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-start { align-items: flex-start; }
            .text-center { text-align: center; }
            @media print { 
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .print-container { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

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

  const handleStatusChange = (newStatus: string) => {
    if (!order) return;
    updateStatusMutation.mutate({
      orderId: id!,
      newStatus,
      locationId: order.location_id
    });
  };

  const handleConvertToGoodsReceipt = () => {
    if (!id) return;
    convertToGoodsReceiptMutation.mutate(id, {
      onSuccess: ({ documentId }) => {
        navigate(`/warehouse/receipts/${documentId}`);
      }
    });
  };

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
  const receiptList = relatedDocuments?.receipts || [];
  const invoiceList = relatedDocuments?.invoices || [];

  const getWarehouseStatusLabel = (status: string | null) => {
    if (!status) return 'Nepoznato';
    if (status === 'draft') return 'Nacrt';
    if (status === 'posted') return 'Proknjiženo';
    if (status === 'cancelled') return 'Stornirano';
    return status;
  };

  return (
    <div>
      <Header title={order.order_number} subtitle="Narudžbenica • Purchase Order Details" />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between print-hidden">
          <NavLink to="/warehouse/purchase-orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Purchase Orders
          </NavLink>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print / PDF
            </Button>
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
            {(order.status === 'ordered' || order.status === 'received') && (
              <Button 
                onClick={() => navigate(`/warehouse/receipts/from-po/${id}`)}
                className="bg-module-warehouse hover:bg-module-warehouse/90"
              >
                <Package className="mr-2 h-4 w-4" />
                Kreiraj primku
              </Button>
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
                  {order.partners?.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {order.partners.email}
                    </p>
                  )}
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
                  onValueChange={handleStatusChange}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ordered">Ordered (Send to Supplier)</SelectItem>
                    <SelectItem value="received">Received (Update Stock)</SelectItem>
                  </SelectContent>
                </Select>
                {updateStatusMutation.isPending && (
                  <p className="mt-2 text-xs text-muted-foreground">Processing...</p>
                )}
              </div>

              {/* Status Action Info */}
              <div className="mt-4 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium mb-1">Status Actions:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Ordered:</strong> Sends email to supplier</li>
                  <li>• <strong>Received:</strong> Updates inventory stock</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Povezani dokumenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Centralized related documents reduce module hopping while keeping PO context visible. */}
            {receiptList.length === 0 && invoiceList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Još nema povezanih dokumenata.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {receiptList.map((receipt) => (
                  <NavLink
                    key={receipt.id}
                    to={`/warehouse/receipts/${receipt.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <Package className="h-5 w-5 text-module-warehouse" />
                    <div>
                      <p className="text-sm font-medium">Primka</p>
                      <p className="text-xs text-muted-foreground">{receipt.document_number}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {getWarehouseStatusLabel(receipt.status)}
                    </Badge>
                  </NavLink>
                ))}

                {invoiceList.map((invoice) => (
                  <NavLink
                    key={invoice.id}
                    to={`/finance/invoices/incoming/${invoice.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <FileText className="h-5 w-5 text-module-finance" />
                    <div>
                      <p className="text-sm font-medium">Ulazna faktura</p>
                      <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {getWarehouseStatusLabel(invoice.status)}
                    </Badge>
                  </NavLink>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Lines with delivery status */}
        <Card>
          <CardHeader>
            <CardTitle>Stavke narudžbenice ({order.lines?.length || 0} artikala)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Šifra</TableHead>
                  <TableHead>Naziv</TableHead>
                  <TableHead className="text-right">Naručeno</TableHead>
                  <TableHead className="text-right">Primljeno</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Cijena</TableHead>
                  <TableHead className="text-right">Ukupno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nema stavki u narudžbenici
                    </TableCell>
                  </TableRow>
                ) : (
                  order.lines?.map((line) => {
                    const receivedQty = (line as any).received_quantity || 0;
                    const isFullyReceived = receivedQty >= line.quantity;
                    const isPartiallyReceived = receivedQty > 0 && receivedQty < line.quantity;
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">{line.items?.code}</TableCell>
                        <TableCell>{line.items?.name}</TableCell>
                        <TableCell className="text-right">{line.quantity}</TableCell>
                        <TableCell className="text-right">{receivedQty}</TableCell>
                        <TableCell className="text-right">
                          {isFullyReceived ? (
                            <Badge className="bg-green-600">Primljeno</Badge>
                          ) : isPartiallyReceived ? (
                            <Badge variant="secondary">Djelomično</Badge>
                          ) : (
                            <Badge variant="outline">Čeka isporuku</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">€{line.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">€{line.total_price.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Hidden printable PDF content */}
        <div className="hidden">
          <div ref={printRef}>
            <PurchaseOrderPDF order={order} />
          </div>
        </div>
      </div>
    </div>
  );
}
