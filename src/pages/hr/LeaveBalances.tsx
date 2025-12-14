import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Users, TrendingDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/layout/Header";
import { useLeaveBalances } from "@/hooks/useLeaveBalance";
import { useDepartments } from "@/hooks/useHR";

export default function LeaveBalances() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const { data: balances, isLoading } = useLeaveBalances(year);
  const { data: departments } = useDepartments();

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const filteredBalances = (balances || []).filter((b) => {
    const matchesSearch =
      b.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      b.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchesDepartment =
      departmentFilter === "all" || b.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  // Summary stats
  const totalEntitled = filteredBalances.reduce((sum, b) => sum + b.entitledDays, 0);
  const totalUsed = filteredBalances.reduce((sum, b) => sum + b.usedDays, 0);
  const totalRemaining = filteredBalances.reduce((sum, b) => sum + b.remainingDays, 0);
  const totalPending = filteredBalances.reduce((sum, b) => sum + b.pendingDays, 0);

  const getStatusBadge = (remaining: number, entitled: number) => {
    const percentage = (remaining / entitled) * 100;
    if (remaining <= 0) {
      return <Badge variant="destructive">Iskorišteno</Badge>;
    } else if (percentage <= 25) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Malo preostalo</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-100 text-green-800">Dostupno</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Stanje godišnjih odmora" subtitle="Pregled korištenja godišnjih odmora po zaposleniku" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/hr")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nazad na HR
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ukupno pravo</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEntitled} dana</div>
              <p className="text-xs text-muted-foreground">Za {filteredBalances.length} zaposlenika</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Iskorišteno</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsed} dana</div>
              <p className="text-xs text-muted-foreground">
                {totalEntitled > 0 ? Math.round((totalUsed / totalEntitled) * 100) : 0}% ukupnog prava
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Preostalo</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRemaining} dana</div>
              <p className="text-xs text-muted-foreground">Dostupno za korištenje</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Na čekanju</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPending} dana</div>
              <p className="text-xs text-muted-foreground">Zahtjevi za odobrenje</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Pretraži po imenu ili šifri..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Godina" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Svi odjeli" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Svi odjeli</SelectItem>
                  {(departments || []).map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balance Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zaposlenik</TableHead>
                  <TableHead>Odjel</TableHead>
                  <TableHead className="text-center">Pravo (dana)</TableHead>
                  <TableHead className="text-center">Iskorišteno</TableHead>
                  <TableHead className="text-center">Preostalo</TableHead>
                  <TableHead className="text-center">Na čekanju</TableHead>
                  <TableHead>Korištenje</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Učitavanje...
                    </TableCell>
                  </TableRow>
                ) : filteredBalances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nema podataka za prikaz
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBalances.map((balance) => {
                    const usagePercentage = balance.entitledDays > 0 
                      ? Math.round((balance.usedDays / balance.entitledDays) * 100) 
                      : 0;
                    return (
                      <TableRow 
                        key={balance.employeeId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/hr/employees/${balance.employeeId}`)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{balance.employeeName}</div>
                            <div className="text-sm text-muted-foreground">{balance.employeeCode}</div>
                          </div>
                        </TableCell>
                        <TableCell>{balance.department || "-"}</TableCell>
                        <TableCell className="text-center font-medium">{balance.entitledDays}</TableCell>
                        <TableCell className="text-center">{balance.usedDays}</TableCell>
                        <TableCell className="text-center font-medium">
                          <span className={balance.remainingDays <= 0 ? "text-destructive" : ""}>
                            {balance.remainingDays}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {balance.pendingDays > 0 ? (
                            <Badge variant="outline">{balance.pendingDays}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="w-[150px]">
                          <div className="flex items-center gap-2">
                            <Progress value={usagePercentage} className="h-2" />
                            <span className="text-xs text-muted-foreground w-10">{usagePercentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(balance.remainingDays, balance.entitledDays)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
