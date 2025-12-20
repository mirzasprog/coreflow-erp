import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, CheckCircle, Loader2, FileText, ShoppingCart, Link2, Wand2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  getWarehouseStatusLabel,
  getWarehouseStatusTone,
  useGenerateInvoiceProposal,
  useWarehouseDocument,
  usePostDocument,
} from '@/hooks/useWarehouseDocuments';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { StatusBadge } from '@/components/ui/status-badge';

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
  const generateInvoice = useGenerateInvoiceProposal();

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
  const statusTone = getWarehouseStatusTone(document.status);
  const statusLabel = getWarehouseStatusLabel(document.status);
  const getInvoiceStatusTone = (status: string | null) => {
    if (!status) return 'draft';
    if (status === 'draft') return 'draft';
    if (status === 'posted') return 'posted';
    if (status === 'paid') return 'closed';
    if (status === 'cancelled') return 'closed';
    return 'approved';
  };
  const getInvoiceStatusLabel = (status: string | null) => {
    if (!status) return 'Nacrt';
    if (status === 'draft') return 'Nacrt';
    if (status === 'posted') return 'Proknjiženo';
    if (status === 'paid') return 'Zatvoreno';
    if (status === 'cancelled') return 'Zatvoreno';
    return status;
  };

  return (
    <div>
      <Header 
        title={`Primka ${document.document_number}`} 
        subtitle="Primka • Pregled dokumenta" 
      />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <NavLink to="/warehouse">Skladište</NavLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <NavLink to="/warehouse/receipts">Primke</NavLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{document.document_number}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
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
                <StatusBadge tone={statusTone} label={statusLabel} />
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

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => generateInvoice.mutate({ receiptId: document.id })}
                  disabled={!!linkedInvoice || generateInvoice.isPending}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generiši fakturu iz primke
                </Button>
                {linkedInvoice && (
                  <p className="text-xs text-muted-foreground">
                    Faktura je već povezana sa primkom.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Linked Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Povezani dokumenti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!purchaseOrder && !linkedInvoice ? (
                  <p className="text-sm text-muted-foreground">Još nema povezanih dokumenata.</p>
                ) : (
                  <>
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
                        <StatusBadge
                          tone={getInvoiceStatusTone(linkedInvoice.status)}
                          label={getInvoiceStatusLabel(linkedInvoice.status)}
                          className="ml-auto text-xs"
                        />
                      </NavLink>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
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
                  <TableHead>LOT</TableHead>
                  <TableHead>Rok trajanja</TableHead>
                  <TableHead>Lokacija</TableHead>
                  <TableHead className="text-right">Količina</TableHead>
                  <TableHead className="text-right">Jedinična cijena</TableHead>
                  <TableHead className="text-right">Ukupno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.lines?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nema stavki
                    </TableCell>
                  </TableRow>
                ) : (
                  document.lines?.map((line, index) => {
                    const meta = parseWmsLineMeta(line.notes);
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{line.items?.code || '-'}</TableCell>
                        <TableCell>{line.items?.name || '-'}</TableCell>
                        <TableCell>{meta?.lotNumber || '-'}</TableCell>
                        <TableCell>{meta?.expiryDate || '-'}</TableCell>
                        <TableCell>{meta?.binLocation || '-'}</TableCell>
                        <TableCell className="text-right">{line.quantity}</TableCell>
                        <TableCell className="text-right">€{line.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">€{line.total_price.toFixed(2)}</TableCell>
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
