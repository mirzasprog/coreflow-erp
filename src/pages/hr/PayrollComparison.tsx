import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, TrendingUp, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { usePayrollPeriodsList, usePayrollComparison } from "@/hooks/usePayrollComparison";

export default function PayrollComparison() {
  const [period1Id, setPeriod1Id] = useState<string | null>(null);
  const [period2Id, setPeriod2Id] = useState<string | null>(null);

  const { data: periods, isLoading: periodsLoading } = usePayrollPeriodsList();
  const { period1, period2, employeeComparison, isLoading } = usePayrollComparison(period1Id, period2Id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toFixed(1)}%`;
  };

  const summaryData = useMemo(() => {
    if (!period1 || !period2) return null;

    return {
      grossChange: period2.total_gross - period1.total_gross,
      grossChangePercent: period1.total_gross > 0 
        ? ((period2.total_gross - period1.total_gross) / period1.total_gross) * 100 
        : 0,
      netChange: period2.total_net - period1.total_net,
      netChangePercent: period1.total_net > 0 
        ? ((period2.total_net - period1.total_net) / period1.total_net) * 100 
        : 0,
      deductionsChange: period2.total_deductions - period1.total_deductions,
      employeeChange: period2.employee_count - period1.employee_count,
    };
  }, [period1, period2]);

  const chartData = useMemo(() => {
    if (!period1 || !period2) return [];

    return [
      {
        name: "Bruto",
        [format(parseISO(period1.period_month), "MMM yyyy")]: period1.total_gross,
        [format(parseISO(period2.period_month), "MMM yyyy")]: period2.total_gross,
      },
      {
        name: "Neto",
        [format(parseISO(period1.period_month), "MMM yyyy")]: period1.total_net,
        [format(parseISO(period2.period_month), "MMM yyyy")]: period2.total_net,
      },
      {
        name: "Doprinosi",
        [format(parseISO(period1.period_month), "MMM yyyy")]: period1.total_deductions,
        [format(parseISO(period2.period_month), "MMM yyyy")]: period2.total_deductions,
      },
    ];
  }, [period1, period2]);

  const ChangeIndicator = ({ value, isPercent = false }: { value: number; isPercent?: boolean }) => {
    if (Math.abs(value) < 0.01) {
      return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> 0</span>;
    }
    if (value > 0) {
      return (
        <span className="text-green-600 flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3" />
          {isPercent ? formatPercent(value) : formatCurrency(value)}
        </span>
      );
    }
    return (
      <span className="text-red-600 flex items-center gap-1">
        <ArrowDownRight className="h-3 w-3" />
        {isPercent ? formatPercent(value) : formatCurrency(value)}
      </span>
    );
  };

  if (periodsLoading) {
    return <div className="p-6">Učitavanje...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/hr/payroll">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Usporedba perioda</h1>
          <p className="text-muted-foreground">Usporedite podatke o platama između dva perioda</p>
        </div>
      </div>

      {/* Period Selectors */}
      <Card>
        <CardHeader>
          <CardTitle>Odaberite periode za usporedbu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prvi period (stariji)</label>
              <Select value={period1Id || ""} onValueChange={(v) => setPeriod1Id(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Odaberite period" />
                </SelectTrigger>
                <SelectContent>
                  {periods?.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === period2Id}>
                      {format(parseISO(p.period_month), "MMMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Drugi period (noviji)</label>
              <Select value={period2Id || ""} onValueChange={(v) => setPeriod2Id(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Odaberite period" />
                </SelectTrigger>
                <SelectContent>
                  {periods?.map((p) => (
                    <SelectItem key={p.id} value={p.id} disabled={p.id === period1Id}>
                      {format(parseISO(p.period_month), "MMMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && <div className="text-center py-8">Učitavanje usporedbe...</div>}

      {period1 && period2 && summaryData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promjena bruto plate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <ChangeIndicator value={summaryData.grossChange} />
                </div>
                <p className="text-xs text-muted-foreground">
                  <ChangeIndicator value={summaryData.grossChangePercent} isPercent />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promjena neto plate</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <ChangeIndicator value={summaryData.netChange} />
                </div>
                <p className="text-xs text-muted-foreground">
                  <ChangeIndicator value={summaryData.netChangePercent} isPercent />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promjena doprinosa</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <ChangeIndicator value={summaryData.deductionsChange} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promjena br. zaposlenika</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryData.employeeChange > 0 ? "+" : ""}{summaryData.employeeChange}
                </div>
                <p className="text-xs text-muted-foreground">
                  {period1.employee_count} → {period2.employee_count}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Vizualna usporedba</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar 
                    dataKey={format(parseISO(period1.period_month), "MMM yyyy")} 
                    fill="hsl(var(--primary))" 
                  />
                  <Bar 
                    dataKey={format(parseISO(period2.period_month), "MMM yyyy")} 
                    fill="hsl(var(--chart-2))" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Employee Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Usporedba po zaposlenicima</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zaposlenik</TableHead>
                    <TableHead className="text-right">Bruto ({format(parseISO(period1.period_month), "MMM")})</TableHead>
                    <TableHead className="text-right">Bruto ({format(parseISO(period2.period_month), "MMM")})</TableHead>
                    <TableHead className="text-right">Promjena bruto</TableHead>
                    <TableHead className="text-right">Neto ({format(parseISO(period1.period_month), "MMM")})</TableHead>
                    <TableHead className="text-right">Neto ({format(parseISO(period2.period_month), "MMM")})</TableHead>
                    <TableHead className="text-right">Promjena neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeComparison.length > 0 ? (
                    employeeComparison.map((emp) => (
                      <TableRow key={emp.employee_id}>
                        <TableCell className="font-medium">{emp.employee_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(emp.period1_gross)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(emp.period2_gross)}</TableCell>
                        <TableCell className="text-right">
                          <ChangeIndicator value={emp.gross_change} />
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(emp.period1_net)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(emp.period2_net)}</TableCell>
                        <TableCell className="text-right">
                          <ChangeIndicator value={emp.net_change} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nema podataka za usporedbu
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!period1Id && !period2Id && (
        <div className="text-center py-12 text-muted-foreground">
          Odaberite dva perioda za usporedbu
        </div>
      )}
    </div>
  );
}
