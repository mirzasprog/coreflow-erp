import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, FileText, CheckCircle, DollarSign, Users, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  usePayrollPeriod,
  usePayslips,
  useGeneratePayslips,
  useUpdatePayrollPeriodStatus,
} from "@/hooks/usePayroll";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  processed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const statusLabels: Record<string, string> = {
  draft: "Nacrt",
  processed: "Obrađeno",
  paid: "Isplaćeno",
};

export default function PayrollView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: period, isLoading: periodLoading } = usePayrollPeriod(id);
  const { data: payslips, isLoading: payslipsLoading } = usePayslips(id);
  const generatePayslips = useGeneratePayslips();
  const updateStatus = useUpdatePayrollPeriodStatus();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
    }).format(amount);
  };

  if (periodLoading) {
    return <div className="p-6">Učitavanje...</div>;
  }

  if (!period) {
    return <div className="p-6">Period nije pronađen</div>;
  }

  const handleGenerate = async () => {
    await generatePayslips.mutateAsync(period.id);
  };

  const handleProcess = async () => {
    await updateStatus.mutateAsync({ id: period.id, status: "processed" });
  };

  const handleMarkPaid = async () => {
    await updateStatus.mutateAsync({ id: period.id, status: "paid" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/hr/payroll")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {format(new Date(period.period_month), "MMMM yyyy")}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={statusColors[period.status]}>
              {statusLabels[period.status]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {period.status === "draft" && (
            <>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={generatePayslips.isPending}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Generiši platne liste
              </Button>
              {payslips && payslips.length > 0 && (
                <Button onClick={handleProcess} disabled={updateStatus.isPending}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Obradi
                </Button>
              )}
            </>
          )}
          {period.status === "processed" && (
            <Button onClick={handleMarkPaid} disabled={updateStatus.isPending}>
              <DollarSign className="h-4 w-4 mr-2" />
              Označi kao isplaćeno
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zaposlenika
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payslips?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ukupno bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(period.total_gross)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ukupni odbici
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              -{formatCurrency(period.total_deductions)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ukupno neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(period.total_net)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Platne liste
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payslipsLoading ? (
            <p className="text-muted-foreground">Učitavanje...</p>
          ) : !payslips?.length ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Nema generisanih platnih listi za ovaj period
              </p>
              {period.status === "draft" && (
                <Button onClick={handleGenerate} disabled={generatePayslips.isPending}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Generiši platne liste
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Šifra</TableHead>
                  <TableHead>Zaposlenik</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Odbici</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((payslip) => (
                  <TableRow key={payslip.id}>
                    <TableCell className="font-mono">
                      {payslip.employee?.employee_code}
                    </TableCell>
                    <TableCell>
                      {payslip.employee?.first_name} {payslip.employee?.last_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payslip.gross_salary)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      -{formatCurrency(payslip.total_deductions)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payslip.net_salary)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/hr/payslip/${payslip.id}`)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
