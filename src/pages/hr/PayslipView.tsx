import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Printer, FileDown } from "lucide-react";
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

  const periodMonth = period ? format(new Date(period.period_month), "MMMM yyyy") : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Platna lista</h1>
          <p className="text-muted-foreground">
            {payslip.employee?.first_name} {payslip.employee?.last_name} - {periodMonth}
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <FileDown className="h-4 w-4 mr-2" />
          Sačuvaj PDF
        </Button>
      </div>

      <Card ref={contentRef} className="print-payslip print:shadow-none print:border-2 print:border-black">
        <CardHeader className="print:pb-4">
          {/* Company Header for Print */}
          <div className="hidden print:block print-company-header">
            <h2 className="text-xl font-bold">PLATNA LISTA</h2>
            <p className="text-sm mt-1">Za period: {periodMonth}</p>
          </div>
          
          <div className="flex justify-between items-start print:hidden">
            <div>
              <CardTitle className="text-2xl">PLATNA LISTA</CardTitle>
              <p className="text-muted-foreground mt-1">
                Za period: {periodMonth}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Datum izdavanja</p>
              <p className="font-medium">{format(new Date(), "dd.MM.yyyy")}</p>
            </div>
          </div>

          {/* Print-only date */}
          <div className="hidden print:flex print:justify-end print:text-sm">
            <span>Datum izdavanja: {format(new Date(), "dd.MM.yyyy")}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Employee Info */}
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg print-section print:bg-gray-100">
            <div>
              <p className="text-sm text-muted-foreground print:text-gray-600">Zaposlenik</p>
              <p className="font-medium text-lg">
                {payslip.employee?.first_name} {payslip.employee?.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground print:text-gray-600">Šifra zaposlenika</p>
              <p className="font-mono">{payslip.employee?.employee_code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground print:text-gray-600">Radni dani</p>
              <p>
                {payslip.worked_days} / {payslip.working_days}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground print:text-gray-600">Period</p>
              <p>{periodMonth}</p>
            </div>
          </div>

          <Separator className="print:hidden" />
          <hr className="hidden print:block border-gray-300" />

          {/* Earnings */}
          <div>
            <h3 className="font-semibold mb-3">Bruto plaća</h3>
            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg print-highlight">
              <span>Osnovna bruto plaća</span>
              <span className="font-bold text-lg">{formatCurrency(payslip.gross_salary)}</span>
            </div>
          </div>

          <Separator className="print:hidden" />
          <hr className="hidden print:block border-gray-300" />

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
                        <p className="text-sm text-muted-foreground print:text-gray-600">
                          {ded.deduction_type?.code}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {ded.deduction_type?.percentage
                        ? `${ded.deduction_type.percentage}%`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right text-destructive print:text-red-600">
                      -{formatCurrency(ded.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell colSpan={2}>Ukupni odbici</TableCell>
                  <TableCell className="text-right text-destructive print:text-red-600">
                    -{formatCurrency(payslip.total_deductions)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <Separator className="print:hidden" />
          <hr className="hidden print:block border-gray-300" />

          {/* Net Salary */}
          <div className="p-4 bg-primary/10 rounded-lg print-net-salary">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">NETO ZA ISPLATU</span>
              <span className="text-2xl font-bold text-primary print:text-green-700">
                {formatCurrency(payslip.net_salary)}
              </span>
            </div>
          </div>

          {payslip.notes && (
            <>
              <Separator className="print:hidden" />
              <hr className="hidden print:block border-gray-300" />
              <div>
                <h3 className="font-semibold mb-2">Napomena</h3>
                <p className="text-muted-foreground print:text-gray-600">{payslip.notes}</p>
              </div>
            </>
          )}

          {/* Print Footer with Signatures */}
          <div className="hidden print:block print-footer mt-8">
            <div className="print-signature">
              <span className="text-sm">Potpis zaposlenika</span>
            </div>
            <div className="print-signature">
              <span className="text-sm">Potpis poslodavca</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
