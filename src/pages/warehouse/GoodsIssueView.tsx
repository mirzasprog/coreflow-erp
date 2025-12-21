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
import { ArrowLeft, Edit, CheckCircle, XCircle, Loader2, Link2, ClipboardList } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  getWarehouseStatusLabel,
  getWarehouseStatusTone,
  useWarehouseDocument,
  usePostDocument,
  useCancelDocument,
} from '@/hooks/useWarehouseDocuments';
import { parseWmsLineMeta } from '@/lib/warehouseWms';
import { useCreatePickingFromIssue, usePickingOrders } from '@/hooks/usePickingOrders';
import { format } from 'date-fns';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { StatusBadge } from '@/components/ui/status-badge';

export default function GoodsIssueView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: document, isLoading } = useWarehouseDocument(id);
  const postDocument = usePostDocument();
  const cancelDocument = useCancelDocument();
  const createPicking = useCreatePickingFromIssue();
  const { data: pickingOrders } = usePickingOrders();

  // Check if picking order already exists for this issue
  const existingPicking = pickingOrders?.find(po => po.source_document_id === id);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Document not found</div>
      </div>
    );
  }

  const statusTone = getWarehouseStatusTone(document.status);
  const statusLabel = getWarehouseStatusLabel(document.status);

  const handlePost = async () => {
    await postDocument.mutateAsync({ id: id!, documentType: 'goods_issue' });
  };

  const handleCancel = async () => {
    await cancelDocument.mutateAsync(id!);
  };

  return (
    <div>
      <Header 
        title={`Issue ${document.document_number}`} 
        subtitle="Izdatnica • Outgoing goods document" 
      />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <NavLink to="/warehouse">Warehouse</NavLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <NavLink to="/warehouse/issues">Goods Issue</NavLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{document.document_number}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <NavLink to="/warehouse/issues" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Issues
          </NavLink>
          <div className="flex gap-2">
            {document.status === 'draft' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/warehouse/issues/${id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button onClick={handlePost} disabled={postDocument.isPending}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Post Document
                </Button>
              </>
            )}
            {document.status === 'posted' && (
              <Button variant="destructive" onClick={handleCancel} disabled={cancelDocument.isPending}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Document
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Document Details</CardTitle>
              <StatusBadge tone={statusTone} label={statusLabel} className="text-lg px-3 py-1" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Document Number</p>
                <p className="font-medium">{document.document_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(document.document_date), 'dd.MM.yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warehouse</p>
                <p className="font-medium">{document.locations?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{document.partners?.name || '-'}</p>
              </div>
              {document.notes && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{document.notes}</p>
                </div>
              )}
              {document.posted_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Posted At</p>
                  <p className="font-medium">{format(new Date(document.posted_at), 'dd.MM.yyyy HH:mm')}</p>
                </div>
              )}
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
                  <span className="font-medium">{document.lines?.length || 0}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">€{document.total_value.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {document.status === 'draft' && !existingPicking && (
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => createPicking.mutate(id!)}
                  disabled={createPicking.isPending}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Kreiraj picking nalog
                </Button>
              )}
              {existingPicking && (
                <NavLink to="/warehouse/picking" className="block">
                  <Button className="w-full justify-start" variant="outline">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Pregledaj picking ({existingPicking.picking_number})
                  </Button>
                </NavLink>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Povezani dokumenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              {existingPicking ? (
                <NavLink
                  to="/warehouse/picking"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <ClipboardList className="h-5 w-5 text-module-warehouse" />
                  <div>
                    <p className="font-medium text-sm">Picking nalog</p>
                    <p className="text-xs text-muted-foreground">{existingPicking.picking_number}</p>
                  </div>
                  <StatusBadge
                    tone={existingPicking.status === 'completed' ? 'closed' : existingPicking.status === 'in_progress' ? 'approved' : 'draft'}
                    label={existingPicking.status === 'completed' ? 'Završen' : existingPicking.status === 'in_progress' ? 'U tijeku' : 'Otvoren'}
                    className="ml-auto text-xs"
                  />
                </NavLink>
              ) : (
                <p className="text-sm text-muted-foreground">Još nema povezanih dokumenata.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Document Lines</CardTitle>
          </CardHeader>
          <CardContent>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.lines?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No items
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
