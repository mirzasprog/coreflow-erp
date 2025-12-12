import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { useAbsences, useCreateAbsence, useUpdateAbsence, useHREmployees } from "@/hooks/useHR";
import { ArrowLeft, Plus, Check, Calendar } from "lucide-react";

const ABSENCE_TYPES = [
  { value: "annual_leave", label: "Annual Leave" },
  { value: "sick_leave", label: "Sick Leave" },
  { value: "unpaid_leave", label: "Unpaid Leave" },
  { value: "maternity_leave", label: "Maternity Leave" },
  { value: "other", label: "Other" },
];

export default function AbsenceList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedEmployee = searchParams.get("employee");
  const { toast } = useToast();

  const { data: absences, isLoading } = useAbsences();
  const { data: employees } = useHREmployees();
  const createAbsence = useCreateAbsence();
  const updateAbsence = useUpdateAbsence();

  const [showModal, setShowModal] = useState(!!preselectedEmployee);
  const [employeeId, setEmployeeId] = useState(preselectedEmployee || "");
  const [absenceType, setAbsenceType] = useState<string>("annual_leave");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const handleCreate = async () => {
    if (!employeeId || !startDate || !endDate) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      await createAbsence.mutateAsync({
        employee_id: employeeId,
        type: absenceType as any,
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
        approved: false,
      });
      toast({ title: "Absence registered" });
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateAbsence.mutateAsync({ id, approved: true });
      toast({ title: "Absence approved" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEmployeeId("");
    setAbsenceType("annual_leave");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
  };

  return (
    <div>
      <Header title="Absences" subtitle="Evidencija odsutnosti • Leave Management" />

      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/hr")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to HR
        </Button>

        <div className="module-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">All Absences</h3>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Register Absence
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : !absences?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              No absences recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absences.map((absence) => {
                  const days = Math.ceil(
                    (new Date(absence.end_date).getTime() - new Date(absence.start_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                  ) + 1;
                  return (
                    <TableRow key={absence.id}>
                      <TableCell className="font-medium">
                        {absence.employees
                          ? `${absence.employees.first_name} ${absence.employees.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{absence.type.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(absence.start_date), "dd.MM.yyyy")}</TableCell>
                      <TableCell>{format(new Date(absence.end_date), "dd.MM.yyyy")}</TableCell>
                      <TableCell>{days}</TableCell>
                      <TableCell>
                        <Badge variant={absence.approved ? "default" : "outline"}>
                          {absence.approved ? "Approved" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!absence.approved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(absence.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Absence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={absenceType} onValueChange={setAbsenceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ABSENCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createAbsence.isPending}>
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
