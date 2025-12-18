import { useMemo, useState } from "react";
import { format, addMonths } from "date-fns";
import { differenceInCalendarDays } from "date-fns";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HeartPulse, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useMedicalCheckStats, useCreateMedicalCheck } from "@/hooks/useHSE";
import { useHREmployees } from "@/hooks/useHR";
import { useToast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = {
  sanitary_booklet: "Sanitary Booklet",
  periodic_medical: "Periodic Medical",
  other: "Other",
};

type StatusFilter = "all" | "overdue" | "expiring" | "valid";

export default function HSEMedicalChecks() {
  const { data: checks, stats, isLoading } = useMedicalCheckStats();
  const { data: employees } = useHREmployees();
  const createMedicalCheck = useCreateMedicalCheck();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Form state
  const [employeeId, setEmployeeId] = useState<string>("");
  const [checkType, setCheckType] = useState<string>("periodic_medical");
  const [checkDate, setCheckDate] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const enrichedChecks = useMemo(() => {
    const today = new Date();
    return (
      checks?.map((check) => {
        const validUntilDate = check.valid_until ? new Date(check.valid_until) : null;
        const daysRemaining = validUntilDate ? differenceInCalendarDays(validUntilDate, today) : null;

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

  const handleCreate = async () => {
    if (!employeeId || !checkDate || !checkType) {
      toast({
        title: "Nedostaju podaci",
        description: "Odaberite zaposlenika, tip pregleda i datum.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createMedicalCheck.mutateAsync({
        employee_id: employeeId,
        check_type: checkType as "sanitary_booklet" | "periodic_medical" | "other",
        check_date: checkDate,
        valid_until: validUntil || null,
        result: result || null,
        notes: notes || null,
      });

      toast({ title: "Pregled spremljen" });
      setEmployeeId("");
      setCheckDate("");
      setValidUntil("");
      setResult("");
      setNotes("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      toast({
        title: "Greška",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Auto-calculate valid_until based on check type
  const handleCheckDateChange = (date: string) => {
    setCheckDate(date);
    if (date) {
      const checkDateObj = new Date(date);
      // Default validity: sanitary booklet = 6 months, medical = 12 months
      const months = checkType === "sanitary_booklet" ? 6 : 12;
      const validUntilDate = addMonths(checkDateObj, months);
      setValidUntil(format(validUntilDate, "yyyy-MM-dd"));
    }
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
            changeType={stats.expiringSoon > 0 ? "negative" : "positive"}
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

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="module-card lg:col-span-2">
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

          {/* New Medical Check Form */}
          <div className="module-card space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Novi pregled</h3>
              <p className="text-sm text-muted-foreground">Evidentiraj liječnički pregled</p>
            </div>

            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberi zaposlenika" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={checkType} onValueChange={setCheckType}>
              <SelectTrigger>
                <SelectValue placeholder="Tip pregleda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="periodic_medical">Periodični liječnički</SelectItem>
                <SelectItem value="sanitary_booklet">Sanitarna knjižica</SelectItem>
                <SelectItem value="other">Ostalo</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Datum pregleda</label>
              <Input 
                type="date" 
                value={checkDate} 
                onChange={(e) => handleCheckDateChange(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Vrijedi do</label>
              <Input 
                type="date" 
                value={validUntil} 
                onChange={(e) => setValidUntil(e.target.value)} 
              />
            </div>

            <Input
              placeholder="Rezultat (npr. Sposoban)"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            />

            <Textarea
              placeholder="Bilješke..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <Button onClick={handleCreate} disabled={createMedicalCheck.isPending} className="w-full">
              Spremi pregled
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
