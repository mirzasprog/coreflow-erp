import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserPlus,
  Calendar,
  FileText,
  Search,
  Building,
  DollarSign,
  FileSpreadsheet,
  ListFilter,
} from "lucide-react";
import { useState } from "react";
import { useHREmployees, useHRStats } from "@/hooks/useHR";
import { format } from "date-fns";
import { exportToExcel, exportToPrintablePdf } from "@/lib/exporters";

export default function HRIndex() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: employees, isLoading } = useHREmployees();
  const { data: stats } = useHRStats();

  const employeeExportRows = (employees || []).map((emp) => ({
    ID: emp.employee_code,
    Name: `${emp.first_name} ${emp.last_name}`,
    Position: emp.position || "—",
    Department: emp.departments?.name || "—",
    Location: emp.locations?.name || "—",
    "Hire Date": emp.hire_date ? format(new Date(emp.hire_date), "dd.MM.yyyy") : "—",
    Status: emp.active ? "Active" : "Inactive",
  }));

  const exportEmployees = (type: "excel" | "pdf") => {
    if (!employeeExportRows.length) return;

    if (type === "excel") {
      exportToExcel(employeeExportRows, "Employees", "employee-directory.xlsx");
      return;
    }

    const rows = employeeExportRows.map((row) => [
      row.ID,
      row.Name,
      row.Position,
      row.Department,
      row.Location,
      row["Hire Date"],
      row.Status,
    ]);

    exportToPrintablePdf(
      "Employee Directory",
      "Napredni izvještaj zaposlenika spreman za PDF/print.",
      ["ID", "Name", "Position", "Department", "Location", "Hire Date", "Status"],
      rows
    );
  };

  const filteredEmployees = employees?.filter(
    (emp) =>
      emp.first_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      emp.position?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Human Resources" subtitle="Ljudski resursi • Employee Management" />

      <div className="p-6">
        <div className="mb-6 flex flex-col gap-3 rounded-lg border bg-card/70 p-4 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">HR module tools</p>
            <p className="text-sm text-muted-foreground">
              Glavne opcije dostupne u zaglavlju modula za mobitel i desktop.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button className="w-full sm:w-auto" onClick={() => navigate("/hr/employees/new")}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Module menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Advanced reports</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportEmployees("excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportEmployees("pdf")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export to PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/hr/payroll/reports")}>Payroll reports</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Employees"
            value={stats?.totalEmployees.toString() || "0"}
            change={`${stats?.activeEmployees || 0} active`}
            changeType="positive"
            icon={Users}
            iconColor="bg-module-hr/10 text-module-hr"
          />
          <StatCard
            title="On Leave"
            value={stats?.onLeave.toString() || "0"}
            change={`${stats?.pendingAbsences || 0} pending approval`}
            icon={Calendar}
            iconColor="bg-warning/10 text-warning"
          />
          <StatCard
            title="Active Contracts"
            value={stats?.totalContracts.toString() || "0"}
            change={`${stats?.expiringContracts || 0} expiring soon`}
            icon={FileText}
            iconColor="bg-primary/10 text-primary"
          />
          <StatCard
            title="Departments"
            value={stats?.totalDepartments?.toString() || "0"}
            change="Manage structure"
            icon={Building}
            iconColor="bg-info/10 text-info"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            icon={UserPlus}
            title="Add Employee"
            subtitle="Novi zaposlenik"
            onClick={() => navigate("/hr/employees/new")}
          />
          <QuickAction
            icon={Calendar}
            title="Absences"
            subtitle="Evidencija odsutnosti"
            onClick={() => navigate("/hr/absences")}
          />
          <QuickAction
            icon={Calendar}
            title="Absence Calendar"
            subtitle="Kalendar odsutnosti"
            onClick={() => navigate("/hr/absences/calendar")}
          />
          <QuickAction
            icon={FileText}
            title="Contracts"
            subtitle="Ugovori o radu"
            onClick={() => navigate("/hr/contracts")}
          />
          <QuickAction
            icon={Building}
            title="Departments"
            subtitle="Odjeli"
            onClick={() => navigate("/hr/departments")}
          />
          <QuickAction
            icon={DollarSign}
            title="Payroll"
            subtitle="Obračun plaća"
            onClick={() => navigate("/hr/payroll")}
          />
          <QuickAction
            icon={Calendar}
            title="Leave Balances"
            subtitle="Stanje godišnjih odmora"
            onClick={() => navigate("/hr/leave-balances")}
          />
          <QuickAction
            icon={DollarSign}
            title="Deduction Types"
            subtitle="Vrste odbitaka"
            onClick={() => navigate("/hr/deduction-types")}
          />
        </div>

        {/* Employees Table */}
        <div className="module-card">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Employee Directory</h3>
              <p className="text-sm text-muted-foreground">Imenik zaposlenika</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="w-full pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <FileText className="mr-2 h-4 w-4" />
                    Reports
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Napredni izvještaji</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => exportEmployees("excel")}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel export
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportEmployees("pdf")}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF export
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button className="w-full sm:w-auto" onClick={() => navigate("/hr/employees/new")}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading employees...</div>
          ) : !filteredEmployees?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              {search ? "No employees match your search." : "No employees registered yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/hr/employees/${emp.id}`)}
                    >
                      <TableCell className="font-medium">{emp.employee_code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          {emp.first_name} {emp.last_name}
                        </div>
                      </TableCell>
                      <TableCell>{emp.position || "—"}</TableCell>
                      <TableCell>
                        {emp.departments && (
                          <span className="rounded bg-muted px-2 py-1 text-xs">
                            {emp.departments.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.locations && (
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-muted-foreground" />
                            {emp.locations.name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.hire_date ? format(new Date(emp.hire_date), "dd.MM.yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {emp.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
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

function QuickAction({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: any;
  title: string;
  subtitle: string;
  onClick?: () => void;
}) {
  return (
    <button className="module-card flex items-center gap-4 text-left" onClick={onClick}>
      <div className="rounded-lg bg-module-hr/10 p-3">
        <Icon className="h-6 w-6 text-module-hr" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}
