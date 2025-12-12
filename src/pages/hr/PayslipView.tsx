import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { usePayslip, usePayslipDeductions, usePayrollPeriod } from "@/hooks/usePayroll";

export default function PayslipView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: payslip, isLoading: payslipLoading } = usePayslip(id);
  const { data: deductions, isLoading: deductionsLoading } = usePayslipDeductions(id);
  const { data: period } = usePayrollPeriod(payslip?.payroll_period_id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
    }).format(amount);
  };

  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  if (payslipLoading || deductionsLoading) {
    return <div className="p-6">Učitavanje...</div>;
  }

  if (!payslip) {
    return <div className="p-6">Platna lista nije pronađena</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Platna lista</h1>
          <p className="text-muted-foreground">
            {payslip.employee?.first_name} {payslip.employee?.last_name} -{" "}
            {period && format(new Date(period.period_month), "MMMM yyyy")}
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Štampaj / Sačuvaj PDF
        </Button>
      </div>

      <Card ref={contentRef} className="print:shadow-none print:border-none">
        <CardHeader className="print:pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">PLATNA LISTA</CardTitle>
              <p className="text-muted-foreground mt-1">
                Za period: {period && format(new Date(period.period_month), "MMMM yyyy")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Datum izdavanja</p>
              <p className="font-medium">{format(new Date(), "dd.MM.yyyy")}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Employee Info */}
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg print:bg-gray-100">
            <div>
              <p className="text-sm text-muted-foreground">Zaposlenik</p>
              <p className="font-medium text-lg">
                {payslip.employee?.first_name} {payslip.employee?.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Šifra zaposlenika</p>
              <p className="font-mono">{payslip.employee?.employee_code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Radni dani</p>
              <p>
                {payslip.worked_days} / {payslip.working_days}
              </p>
            </div>
          </div>

          <Separator />

          {/* Earnings */}
          <div>
            <h3 className="font-semibold mb-3">Bruto plaća</h3>
            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg print:bg-blue-50">
              <span>Osnovna bruto plaća</span>
              <span className="font-bold text-lg">{formatCurrency(payslip.gross_salary)}</span>
            </div>
          </div>

          <Separator />

          {/* Deductions */}
          <div>
            <h3 className="font-semibold mb-3">Odbici</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vrsta odbitka</TableHead>
                  <TableHead className="text-right">Stopa</TableHead>
                  <TableHead className="text-right">Iznos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions?.map((ded) => (
                  <TableRow key={ded.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ded.deduction_type?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {ded.deduction_type?.code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {ded.deduction_type?.percentage
                        ? `${ded.deduction_type.percentage}%`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      -{formatCurrency(ded.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell colSpan={2}>Ukupni odbici</TableCell>
                  <TableCell className="text-right text-destructive">
                    -{formatCurrency(payslip.total_deductions)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <Separator />

          {/* Net Salary */}
          <div className="p-4 bg-primary/10 rounded-lg print:bg-green-50">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">NETO ZA ISPLATU</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(payslip.net_salary)}
              </span>
            </div>
          </div>

          {payslip.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Napomena</h3>
                <p className="text-muted-foreground">{payslip.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
