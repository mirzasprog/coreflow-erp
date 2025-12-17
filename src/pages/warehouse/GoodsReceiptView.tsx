import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, CheckCircle, Loader2, FileText, ShoppingCart, Link2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useWarehouseDocument, usePostDocument } from '@/hooks/useWarehouseDocuments';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function useLinkedInvoice(receiptId: string | undefined) {
  return useQuery({
    queryKey: ['linked-invoice', receiptId],
    queryFn: async () => {
      if (!receiptId) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total')
        .eq('source_receipt_id', receiptId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!receiptId
  });
}

export default function GoodsReceiptView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: document, isLoading } = useWarehouseDocument(id);
  const { data: linkedInvoice } = useLinkedInvoice(id);
  const postDocument = usePostDocument();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Nacrt</Badge>;
      case 'posted':
        return <Badge variant="default" className="bg-green-600">Proknjiženo</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Stornirano</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handlePost = async () => {
    if (id) {
      await postDocument.mutateAsync({ id, documentType: 'goods_receipt' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Dokument nije pronađen</p>
        <NavLink to="/warehouse/receipts" className="mt-4 inline-block text-primary hover:underline">
          Natrag na primke
        </NavLink>
      </div>
    );
  }

  const isDraft = document.status === 'draft';
  const purchaseOrder = (document as any).purchase_orders;

  return (
    <div>
      <Header 
        title={`Primka ${document.document_number}`} 
        subtitle="Primka • Pregled dokumenta" 
      />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <NavLink to="/warehouse/receipts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Natrag na primke
          </NavLink>
          {isDraft && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/warehouse/receipts/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Uredi
              </Button>
              <Button onClick={handlePost} disabled={postDocument.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Proknjiži
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Podaci dokumenta</CardTitle>
                {getStatusBadge(document.status)}
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Broj dokumenta</dt>
                  <dd className="font-medium">{document.document_number}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Datum</dt>
                  <dd className="font-medium">{format(new Date(document.document_date), 'dd.MM.yyyy')}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Skladište</dt>
                  <dd className="font-medium">{(document as any).locations?.name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Dobavljač</dt>
                  <dd className="font-medium">{(document as any).partners?.name || '-'}</dd>
                </div>
                {document.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-muted-foreground">Napomene</dt>
                    <dd>{document.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sažetak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stavke:</span>
                    <span className="font-medium">{document.lines?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="font-medium">Ukupno:</span>
                    <span className="font-bold">€{document.total_value.toFixed(2)}</span>
                  </div>
                  {document.posted_at && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        Proknjiženo: {format(new Date(document.posted_at), 'dd.MM.yyyy HH:mm')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Linked Documents */}
            {(purchaseOrder || linkedInvoice) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Povezani dokumenti
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {purchaseOrder && (
                    <NavLink 
                      to={`/warehouse/purchase-orders/${document.purchase_order_id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <ShoppingCart className="h-5 w-5 text-module-warehouse" />
                      <div>
                        <p className="font-medium text-sm">Narudžbenica</p>
                        <p className="text-xs text-muted-foreground">{purchaseOrder.order_number}</p>
                      </div>
                    </NavLink>
                  )}
                  {linkedInvoice && (
                    <NavLink 
                      to={`/finance/invoices/incoming/${linkedInvoice.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-module-finance" />
                      <div>
                        <p className="font-medium text-sm">Ulazna faktura</p>
                        <p className="text-xs text-muted-foreground">{linkedInvoice.invoice_number}</p>
                      </div>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {linkedInvoice.status === 'draft' ? 'Nacrt' : linkedInvoice.status === 'posted' ? 'Proknjiženo' : linkedInvoice.status}
                      </Badge>
                    </NavLink>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Stavke dokumenta</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Šifra</TableHead>
                  <TableHead>Naziv artikla</TableHead>
                  <TableHead className="text-right">Količina</TableHead>
                  <TableHead className="text-right">Jedinična cijena</TableHead>
                  <TableHead className="text-right">Ukupno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.lines?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Nema stavki
                    </TableCell>
                  </TableRow>
                ) : (
                  document.lines?.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{line.items?.code || '-'}</TableCell>
                      <TableCell>{line.items?.name || '-'}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">€{line.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{line.total_price.toFixed(2)}</TableCell>
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
