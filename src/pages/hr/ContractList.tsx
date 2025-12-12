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
import { useContracts, useCreateContract, useHREmployees } from "@/hooks/useHR";
import { ArrowLeft, Plus, FileText } from "lucide-react";

const CONTRACT_TYPES = [
  { value: "indefinite", label: "Indefinite" },
  { value: "fixed_term", label: "Fixed Term" },
  { value: "part_time", label: "Part Time" },
  { value: "temporary", label: "Temporary" },
];

export default function ContractList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedEmployee = searchParams.get("employee");
  const { toast } = useToast();

  const { data: contracts, isLoading } = useContracts();
  const { data: employees } = useHREmployees();
  const createContract = useCreateContract();

  const [showModal, setShowModal] = useState(!!preselectedEmployee);
  const [employeeId, setEmployeeId] = useState(preselectedEmployee || "");
  const [contractType, setContractType] = useState("indefinite");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [workingHours, setWorkingHours] = useState("40");
  const [salary, setSalary] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = async () => {
    if (!employeeId || !startDate) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    try {
      await createContract.mutateAsync({
        employee_id: employeeId,
        contract_type: contractType,
        start_date: startDate,
        end_date: endDate || null,
        working_hours: parseInt(workingHours) || 40,
        salary: salary ? parseFloat(salary) : null,
        notes: notes || null,
      });
      toast({ title: "Contract created" });
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEmployeeId("");
    setContractType("indefinite");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate("");
    setWorkingHours("40");
    setSalary("");
    setNotes("");
  };

  return (
    <div>
      <Header title="Contracts" subtitle="Ugovori o radu • Employment Contracts" />

      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/hr")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to HR
        </Button>

        <div className="module-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">All Contracts</h3>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Contract
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : !contracts?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              No contracts created yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Working Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => {
                  const isActive = !contract.end_date || new Date(contract.end_date) >= new Date();
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {contract.employees
                          ? `${contract.employees.first_name} ${contract.employees.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{contract.contract_type?.replace("_", " ") || "Standard"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(contract.start_date), "dd.MM.yyyy")}</TableCell>
                      <TableCell>
                        {contract.end_date
                          ? format(new Date(contract.end_date), "dd.MM.yyyy")
                          : "Indefinite"}
                      </TableCell>
                      <TableCell>{contract.working_hours}h/week</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>
                          {isActive ? "Active" : "Expired"}
                        </Badge>
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
            <DialogTitle>New Contract</DialogTitle>
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
              <Label>Contract Type</Label>
              <Select value={contractType} onValueChange={setContractType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map((type) => (
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
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Working Hours/Week</Label>
                <Input
                  type="number"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Salary (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
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
            <Button onClick={handleCreate} disabled={createContract.isPending}>
              Create Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
