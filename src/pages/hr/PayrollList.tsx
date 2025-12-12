import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth } from "date-fns";
import { Plus, Eye, FileText, CheckCircle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePayrollPeriods, useCreatePayrollPeriod } from "@/hooks/usePayroll";

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

export default function PayrollList() {
  const navigate = useNavigate();
  const { data: periods, isLoading } = usePayrollPeriods();
  const createPeriod = useCreatePayrollPeriod();
  const [showNewModal, setShowNewModal] = useState(false);
  const [newPeriodMonth, setNewPeriodMonth] = useState(
    format(startOfMonth(new Date()), "yyyy-MM")
  );

  const handleCreate = async () => {
    await createPeriod.mutateAsync(`${newPeriodMonth}-01`);
    setShowNewModal(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bs-BA", {
      style: "currency",
      currency: "BAM",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Obračun plaća</h1>
          <p className="text-muted-foreground">Payroll Management</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novi period
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Periodi obračuna
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Učitavanje...</p>
          ) : !periods?.length ? (
            <p className="text-muted-foreground">Nema kreiranih perioda</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Bruto</TableHead>
                  <TableHead className="text-right">Odbici</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {format(new Date(period.period_month), "MMMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[period.status]}>
                        {statusLabels[period.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(period.total_gross)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(period.total_deductions)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(period.total_net)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/hr/payroll/${period.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novi period obračuna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mjesec</Label>
              <Input
                type="month"
                value={newPeriodMonth}
                onChange={(e) => setNewPeriodMonth(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewModal(false)}>
              Odustani
            </Button>
            <Button onClick={handleCreate} disabled={createPeriod.isPending}>
              Kreiraj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
