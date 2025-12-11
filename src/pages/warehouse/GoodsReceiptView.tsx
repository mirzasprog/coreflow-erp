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
import { ArrowLeft, Edit, CheckCircle, Loader2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useWarehouseDocument, usePostDocument } from '@/hooks/useWarehouseDocuments';
import { format } from 'date-fns';

export default function GoodsReceiptView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: document, isLoading } = useWarehouseDocument(id);
  const postDocument = usePostDocument();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'posted':
        return <Badge variant="default" className="bg-green-600">Posted</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
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
        <p className="text-muted-foreground">Document not found</p>
        <NavLink to="/warehouse/receipts" className="mt-4 inline-block text-primary hover:underline">
          Back to Receipts
        </NavLink>
      </div>
    );
  }

  const isDraft = document.status === 'draft';

  return (
    <div>
      <Header 
        title={`Receipt ${document.document_number}`} 
        subtitle="Primka • View goods receipt details" 
      />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <NavLink to="/warehouse/receipts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Receipts
          </NavLink>
          {isDraft && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/warehouse/receipts/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button onClick={handlePost} disabled={postDocument.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Post Document
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Document Details</CardTitle>
                {getStatusBadge(document.status)}
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Document Number</dt>
                  <dd className="font-medium">{document.document_number}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Date</dt>
                  <dd className="font-medium">{format(new Date(document.document_date), 'dd.MM.yyyy')}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Warehouse</dt>
                  <dd className="font-medium">{(document as any).locations?.name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Supplier</dt>
                  <dd className="font-medium">{(document as any).partners?.name || '-'}</dd>
                </div>
                {document.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-muted-foreground">Notes</dt>
                    <dd>{document.notes}</dd>
                  </div>
                )}
              </dl>
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
                {document.posted_at && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      Posted: {format(new Date(document.posted_at), 'dd.MM.yyyy HH:mm')}
                    </span>
                  </div>
                )}
              </div>
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
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.lines?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No items
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
