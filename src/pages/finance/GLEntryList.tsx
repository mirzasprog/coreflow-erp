import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Plus, Loader2, Eye, FileText } from "lucide-react";
import { useGLEntries } from "@/hooks/useGLEntries";
import { format } from "date-fns";

export default function GLEntryList() {
  const { data: entries, isLoading } = useGLEntries();

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
      <Header title="General Ledger Entries" subtitle="Temeljnice • Journal entries" />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <NavLink to="/finance" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Finance
          </NavLink>
          <NavLink to="/finance/gl-entries/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </NavLink>
        </div>

        <div className="module-card">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!entries?.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      No GL entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {format(new Date(entry.entry_date), 'dd.MM.yyyy')}
                      </TableCell>
                      <TableCell>{entry.description || '-'}</TableCell>
                      <TableCell>
                        {entry.reference_type ? `${entry.reference_type}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{(entry.total_debit || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{(entry.total_credit || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell>
                        <NavLink to={`/finance/gl-entries/${entry.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </NavLink>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
