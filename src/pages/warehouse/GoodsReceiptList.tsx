import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useWarehouseDocuments, useDeleteDocument } from '@/hooks/useWarehouseDocuments';
import { format } from 'date-fns';
import { NavLink } from '@/components/NavLink';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function GoodsReceiptList() {
  const navigate = useNavigate();
  const { data: documents, isLoading } = useWarehouseDocuments('goods_receipt');
  const deleteDocument = useDeleteDocument();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = doc.document_number.toLowerCase().includes(search.toLowerCase()) ||
      doc.partners?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const handleDelete = async () => {
    if (deleteId) {
      await deleteDocument.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div>
      <Header title="Primke" subtitle="Primka • Ulazni dokumenti od dobavljača" />

      <div className="p-6">
        <div className="mb-4">
          <NavLink to="/warehouse" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Natrag na skladište
          </NavLink>
        </div>

        <div className="module-card">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  className="w-64 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => navigate('/warehouse/receipts/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Receipt
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broj dokumenta</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Narudžbenica</TableHead>
                  <TableHead>Dobavljač</TableHead>
                  <TableHead>Skladište</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ukupno</TableHead>
                  <TableHead className="w-32">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nema dokumenata
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments?.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.document_number}</TableCell>
                      <TableCell>{format(new Date(doc.document_date), 'dd.MM.yyyy')}</TableCell>
                      <TableCell>
                        {(doc as any).purchase_orders?.order_number ? (
                          <NavLink to={`/warehouse/purchase-orders/${doc.purchase_order_id}`} className="text-primary hover:underline">
                            {(doc as any).purchase_orders.order_number}
                          </NavLink>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{doc.partners?.name || '-'}</TableCell>
                      <TableCell>{doc.locations?.name || '-'}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell className="text-right">€{doc.total_value.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/warehouse/receipts/${doc.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {doc.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/warehouse/receipts/${doc.id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
