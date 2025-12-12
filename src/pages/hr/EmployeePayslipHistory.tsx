import { Link, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEmployeePayslipHistory } from "@/hooks/useEmployeePayslipHistory";

export default function EmployeePayslipHistory() {
  const { id } = useParams();
  const { employee, payslips, totals, isLoading } = useEmployeePayslipHistory(id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
    }).format(amount);
  };

  if (isLoading) {
    return <div className="p-6">Učitavanje...</div>;
  }

  if (!employee) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Zaposlenik nije pronađen.</p>
        <Button variant="ghost" asChild className="mt-4">
          <Link to="/hr">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nazad na HR
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/hr/employees/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Historija platnih listića</h1>
          <p className="text-muted-foreground">
            {employee.first_name} {employee.last_name} ({employee.employee_code})
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupna bruto plata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalGross)}</div>
            <p className="text-xs text-muted-foreground">svih vremena</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupna neto plata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalNet)}</div>
            <p className="text-xs text-muted-foreground">svih vremena</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ukupni doprinosi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalDeductions)}</div>
            <p className="text-xs text-muted-foreground">svih vremena</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Broj platnih listića</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payslips.length}</div>
            <p className="text-xs text-muted-foreground">ukupno</p>
          </CardContent>
        </Card>
      </div>

      {/* Payslip History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Svi platni listići
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payslips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status perioda</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Doprinosi</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-center">Radnih dana</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((payslip) => (
                  <TableRow key={payslip.id}>
                    <TableCell className="font-medium">
                      {payslip.period_month
                        ? format(parseISO(payslip.period_month), "MMMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payslip.period_status === "paid"
                            ? "default"
                            : payslip.period_status === "processed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {payslip.period_status === "paid"
                          ? "Isplaćeno"
                          : payslip.period_status === "processed"
                          ? "Obrađeno"
                          : "Nacrt"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payslip.gross_salary)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(payslip.total_deductions)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(payslip.net_salary)}
                    </TableCell>
                    <TableCell className="text-center">
                      {payslip.worked_days}/{payslip.working_days}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/hr/payslip/${payslip.id}`}>
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nema platnih listića za ovog zaposlenika.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
