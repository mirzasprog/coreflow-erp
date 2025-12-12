import { useParams, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Loader2, Edit, XCircle, CheckCircle } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useGLEntry, usePostGLEntry, useCancelGLEntry } from '@/hooks/useGLEntries';
import { format } from 'date-fns';

export default function GLEntryView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: entry, isLoading } = useGLEntry(id);
  const postEntry = usePostGLEntry();
  const cancelEntry = useCancelGLEntry();

  const handlePost = async () => {
    if (!id) return;
    await postEntry.mutateAsync(id);
  };

  const handleCancel = async () => {
    if (!id) return;
    await cancelEntry.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        GL Entry not found
      </div>
    );
  }

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

  const isBalanced = Math.abs((entry.total_debit || 0) - (entry.total_credit || 0)) < 0.01;

  return (
    <div>
      <Header 
        title={`GL Entry - ${format(new Date(entry.entry_date), 'dd.MM.yyyy')}`} 
        subtitle="Temeljnica • View details" 
      />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <NavLink to="/finance/gl-entries" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to GL Entries
          </NavLink>
          <div className="flex gap-2">
            {entry.status === 'draft' && (
              <>
                <NavLink to={`/finance/gl-entries/${id}/edit`}>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </NavLink>
                <Button onClick={handlePost} disabled={postEntry.isPending || !isBalanced}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Post
                </Button>
              </>
            )}
            {entry.status === 'posted' && (
              <Button variant="destructive" onClick={handleCancel} disabled={cancelEntry.isPending}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Entry Details
                {getStatusBadge(entry.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Entry Date</p>
                <p className="font-medium">{format(new Date(entry.entry_date), 'dd.MM.yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reference Type</p>
                <p className="font-medium">{entry.reference_type || '-'}</p>
              </div>
              {entry.description && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{entry.description}</p>
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
                  <span className="text-muted-foreground">Total Debit:</span>
                  <span className="font-medium">€{(entry.total_debit || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Credit:</span>
                  <span className="font-medium">€{(entry.total_credit || 0).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between border-t pt-2 ${isBalanced ? 'text-success' : 'text-destructive'}`}>
                  <span className="font-medium">Status:</span>
                  <span className="font-bold">{isBalanced ? 'Balanced' : 'Unbalanced'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Entry Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No lines
                    </TableCell>
                  </TableRow>
                ) : (
                  entry.lines?.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {line.accounts?.code} - {line.accounts?.name}
                      </TableCell>
                      <TableCell>{line.partners?.name || '-'}</TableCell>
                      <TableCell>{line.description || '-'}</TableCell>
                      <TableCell className="text-right">
                        {line.debit > 0 ? `€${line.debit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.credit > 0 ? `€${line.credit.toFixed(2)}` : '-'}
                      </TableCell>
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
