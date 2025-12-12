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
import { useInvoices } from "@/hooks/useInvoices";
import { format } from "date-fns";

export default function OutgoingInvoiceList() {
  const { data: invoices, isLoading } = useInvoices('outgoing');

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

  const getPaymentStatus = (paid: number, total: number) => {
    if (paid >= total) return <span className="badge-success">Paid</span>;
    if (paid > 0) return <span className="badge-info">Partial</span>;
    return <span className="badge-warning">Unpaid</span>;
  };

  return (
    <div>
      <Header title="Outgoing Invoices" subtitle="Izlazne fakture • Sales invoices" />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <NavLink to="/finance" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Finance
          </NavLink>
          <NavLink to="/finance/invoices/outgoing/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
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
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!invoices?.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{format(new Date(inv.invoice_date), 'dd.MM.yyyy')}</TableCell>
                      <TableCell>{inv.partners?.name || '-'}</TableCell>
                      <TableCell>{inv.due_date ? format(new Date(inv.due_date), 'dd.MM.yyyy') : '-'}</TableCell>
                      <TableCell className="text-right font-medium">€{inv.total.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell>{getPaymentStatus(inv.paid_amount, inv.total)}</TableCell>
                      <TableCell>
                        <NavLink to={`/finance/invoices/outgoing/${inv.id}`}>
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
