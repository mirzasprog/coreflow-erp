import { useMemo, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { HeartPulse, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useMedicalCheckStats } from "@/hooks/useHSE";

const typeLabels: Record<string, string> = {
  sanitary_booklet: "Sanitary Booklet",
  periodic_medical: "Periodic Medical",
  other: "Other",
};

type StatusFilter = "all" | "overdue" | "expiring" | "valid";

export default function HSEMedicalChecks() {
  const { data: checks, stats, isLoading } = useMedicalCheckStats();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const enrichedChecks = useMemo(() => {
    const today = new Date();
    return (
      checks?.map((check) => {
        const validUntil = check.valid_until ? new Date(check.valid_until) : null;
        const daysRemaining = validUntil ? differenceInCalendarDays(validUntil, today) : null;

        let status: StatusFilter = "valid";
        if (daysRemaining === null) status = "valid";
        else if (daysRemaining < 0) status = "overdue";
        else if (daysRemaining <= 30) status = "expiring";

        return {
          ...check,
          daysRemaining,
          status,
        };
      }) || []
    );
  }, [checks]);

  const filteredChecks = useMemo(() => {
    return enrichedChecks.filter((check) => {
      if (statusFilter !== "all" && check.status !== statusFilter) return false;
      if (!search) return true;
      const haystack = `${check.employees?.first_name || ""} ${check.employees?.last_name || ""} ${typeLabels[check.check_type] || check.check_type}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [enrichedChecks, statusFilter, search]);

  const renderStatus = (status: StatusFilter, daysRemaining: number | null) => {
    if (status === "overdue") {
      return <Badge className="bg-destructive/20 text-destructive">Overdue ({Math.abs(daysRemaining || 0)}d)</Badge>;
    }
    if (status === "expiring") {
      return <Badge className="bg-warning/20 text-warning">Expires in {daysRemaining}d</Badge>;
    }
    return <Badge className="bg-success/20 text-success">Valid</Badge>;
  };

  return (
    <div>
      <Header title="Medical Checks" subtitle="Liječnički i sanitarni pregledi zaposlenika" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Checks"
            value={stats.total.toString()}
            change="Evidentirani pregledi"
            icon={HeartPulse}
            iconColor="bg-module-hse/10 text-module-hse"
          />
          <StatCard
            title="Overdue"
            value={stats.overdue.toString()}
            change="Istekli pregledi"
            changeType={stats.overdue > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
            iconColor="bg-destructive/10 text-destructive"
          />
          <StatCard
            title="Expiring Soon"
            value={stats.expiringSoon.toString()}
            change="30 dana"
            changeType={stats.expiringSoon > 0 ? "warning" : "positive"}
            icon={Clock}
            iconColor="bg-warning/10 text-warning"
          />
          <StatCard
            title="Compliance Rate"
            value={`${stats.complianceRate}%`}
            change="Validni pregledi"
            changeType="positive"
            icon={CheckCircle}
            iconColor="bg-success/10 text-success"
          />
        </div>

        <div className="module-card">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Pregledi zaposlenika</h3>
              <p className="text-sm text-muted-foreground">Realni podaci iz evidencije medicinskih pregleda</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex gap-2">
                {(["all", "overdue", "expiring", "valid"] as StatusFilter[]).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                  >
                    {status === "all" ? "Sve" : status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Search employees or type..."
                className="w-full min-w-[240px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Učitavanje podataka...</div>
          ) : filteredChecks.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Nema pregleda za odabrani filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zaposlenik</TableHead>
                    <TableHead>Vrsta pregleda</TableHead>
                    <TableHead>Datum pregleda</TableHead>
                    <TableHead>Vrijedi do</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChecks.map((check) => (
                    <TableRow key={check.id}>
                      <TableCell className="font-medium">
                        {check.employees
                          ? `${check.employees.first_name} ${check.employees.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell>{typeLabels[check.check_type] || check.check_type}</TableCell>
                      <TableCell>
                        {check.check_date ? format(new Date(check.check_date), "dd.MM.yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {check.valid_until
                          ? format(new Date(check.valid_until), "dd.MM.yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {renderStatus(check.status, check.daysRemaining)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
