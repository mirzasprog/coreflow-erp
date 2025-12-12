import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHREmployee, useContracts, useAbsences } from "@/hooks/useHR";
import {
  ArrowLeft,
  Edit,
  MapPin,
  Mail,
  Phone,
  Building,
  Calendar,
  FileText,
  User,
  Banknote,
} from "lucide-react";

export default function EmployeeView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: employee, isLoading } = useHREmployee(id);
  const { data: contracts } = useContracts(id);
  const { data: absences } = useAbsences(id);

  if (isLoading) {
    return (
      <div>
        <Header title="Loading..." />
        <div className="p-6">Loading employee details...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div>
        <Header title="Not Found" />
        <div className="p-6">Employee not found.</div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={`${employee.first_name} ${employee.last_name}`}
        subtitle={`${employee.employee_code} • Employee Profile`}
      />

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/hr")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to HR
          </Button>
          <Button onClick={() => navigate(`/hr/employees/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Employee
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="module-card">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {employee.first_name[0]}{employee.last_name[0]}
              </div>
              <h2 className="text-xl font-semibold">
                {employee.first_name} {employee.last_name}
              </h2>
              <p className="text-muted-foreground">{employee.position || "No position"}</p>
              <Badge variant={employee.active ? "default" : "secondary"} className="mt-2">
                {employee.active ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="mt-6 space-y-3 border-t pt-4">
              {employee.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.phone}</span>
                </div>
              )}
              {employee.departments && (
                <div className="flex items-center gap-3 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.departments.name}</span>
                </div>
              )}
              {employee.locations && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{employee.locations.name}</span>
                </div>
              )}
              {employee.hire_date && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Hired: {format(new Date(employee.hire_date), "dd.MM.yyyy")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Details & History */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="contracts">
              <TabsList>
                <TabsTrigger value="contracts">
                  <FileText className="mr-2 h-4 w-4" />
                  Contracts
                </TabsTrigger>
                <TabsTrigger value="absences">
                  <Calendar className="mr-2 h-4 w-4" />
                  Absences
                </TabsTrigger>
                <TabsTrigger value="payslips">
                  <Banknote className="mr-2 h-4 w-4" />
                  Payslips
                </TabsTrigger>
                <TabsTrigger value="details">
                  <User className="mr-2 h-4 w-4" />
                  Details
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contracts" className="module-card mt-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Employment Contracts</h3>
                  <Button size="sm" onClick={() => navigate(`/hr/contracts/new?employee=${id}`)}>
                    Add Contract
                  </Button>
                </div>
                {contracts && contracts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                              {contract.contract_type || "Standard"}
                            </TableCell>
                            <TableCell>
                              {format(new Date(contract.start_date), "dd.MM.yyyy")}
                            </TableCell>
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
                ) : (
                  <p className="py-8 text-center text-muted-foreground">No contracts found.</p>
                )}
              </TabsContent>

              <TabsContent value="absences" className="module-card mt-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Absence History</h3>
                  <Button size="sm" onClick={() => navigate(`/hr/absences/new?employee=${id}`)}>
                    Register Absence
                  </Button>
                </div>
                {absences && absences.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
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
                            <TableCell className="font-medium capitalize">
                              {absence.type.replace("_", " ")}
                            </TableCell>
                            <TableCell>
                              {format(new Date(absence.start_date), "dd.MM.yyyy")}
                            </TableCell>
                            <TableCell>
                              {format(new Date(absence.end_date), "dd.MM.yyyy")}
                            </TableCell>
                            <TableCell>{days}</TableCell>
                            <TableCell>
                              <Badge variant={absence.approved ? "default" : "outline"}>
                                {absence.approved ? "Approved" : "Pending"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">No absences recorded.</p>
                )}
              </TabsContent>

              <TabsContent value="payslips" className="module-card mt-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Payslip History</h3>
                  <Button size="sm" onClick={() => navigate(`/hr/employees/${id}/payslips`)}>
                    View Full History
                  </Button>
                </div>
                <p className="text-muted-foreground py-4">
                  Click "View Full History" to see all payslips with detailed summaries and totals.
                </p>
              </TabsContent>

              <TabsContent value="details" className="module-card mt-4">
                <h3 className="mb-4 font-semibold">Personal Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">JMBG (ID Number)</p>
                    <p className="font-medium">{employee.jmbg || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{employee.address || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {employee.created_at
                        ? format(new Date(employee.created_at), "dd.MM.yyyy HH:mm")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {employee.updated_at
                        ? format(new Date(employee.updated_at), "dd.MM.yyyy HH:mm")
                        : "—"}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
