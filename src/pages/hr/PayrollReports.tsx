import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, startOfYear, endOfYear, parseISO } from "date-fns";
import { ArrowLeft, TrendingUp, Users, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { usePayrollReportData } from "@/hooks/usePayrollReports";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function PayrollReports() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  
  const { 
    periodSummaries, 
    departmentBreakdown, 
    deductionBreakdown,
    yearlyTotals,
    isLoading 
  } = usePayrollReportData(parseInt(selectedYear));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
    }).format(amount);
  };

  const years = useMemo(() => {
    const result = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      result.push(y.toString());
    }
    return result;
  }, [currentYear]);

  const chartData = useMemo(() => {
    return periodSummaries.map(p => ({
      month: format(parseISO(p.period_month), "MMM"),
      gross: p.total_gross,
      net: p.total_net,
      deductions: p.total_deductions,
    }));
  }, [periodSummaries]);

  if (isLoading) {
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
          <h1 className="text-3xl font-bold">Izvještaji o platama</h1>
          <p className="text-muted-foreground">Mjesečni i godišnji pregledi</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Yearly Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupna bruto plata</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotals.totalGross)}</div>
            <p className="text-xs text-muted-foreground">za {selectedYear}. godinu</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupna neto plata</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotals.totalNet)}</div>
            <p className="text-xs text-muted-foreground">za {selectedYear}. godinu</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupni doprinosi</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotals.totalDeductions)}</div>
            <p className="text-xs text-muted-foreground">za {selectedYear}. godinu</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prosječna plata</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotals.averageNet)}</div>
            <p className="text-xs text-muted-foreground">neto po zaposleniku</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Mjesečni pregled</TabsTrigger>
          <TabsTrigger value="departments">Po odjeljenjima</TabsTrigger>
          <TabsTrigger value="deductions">Doprinosi</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mjesečni trend plata</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Mjesec: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="gross" name="Bruto" fill="hsl(var(--primary))" />
                    <Bar dataKey="net" name="Neto" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="deductions" name="Doprinosi" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nema podataka za odabranu godinu</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mjesečni pregled</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Doprinosi</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodSummaries.length > 0 ? (
                    periodSummaries.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">
                          {format(parseISO(period.period_month), "MMMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            period.status === "paid" 
                              ? "bg-green-100 text-green-700" 
                              : period.status === "processed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {period.status === "paid" ? "Isplaćeno" : period.status === "processed" ? "Obrađeno" : "Nacrt"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(period.total_gross)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(period.total_deductions)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(period.total_net)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nema podataka za odabranu godinu
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Raspodjela po odjeljenjima</CardTitle>
              </CardHeader>
              <CardContent>
                {departmentBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={departmentBreakdown}
                        dataKey="total_net"
                        nameKey="department_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {departmentBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nema podataka</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalji po odjeljenjima</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Odjeljenje</TableHead>
                      <TableHead className="text-right">Zaposlenika</TableHead>
                      <TableHead className="text-right">Ukupna neto plata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentBreakdown.length > 0 ? (
                      departmentBreakdown.map((dept, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{dept.department_name || "Bez odjeljenja"}</TableCell>
                          <TableCell className="text-right">{dept.employee_count}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(dept.total_net)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Nema podataka
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deductions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Struktura doprinosa</CardTitle>
              </CardHeader>
              <CardContent>
                {deductionBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={deductionBreakdown}
                        dataKey="total_amount"
                        nameKey="deduction_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {deductionBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nema podataka</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ukupni doprinosi za {selectedYear}.</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vrsta doprinosa</TableHead>
                      <TableHead>Šifra</TableHead>
                      <TableHead className="text-right">Ukupan iznos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductionBreakdown.length > 0 ? (
                      deductionBreakdown.map((ded, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{ded.deduction_name}</TableCell>
                          <TableCell className="font-mono text-sm">{ded.deduction_code}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(ded.total_amount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          Nema podataka
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
