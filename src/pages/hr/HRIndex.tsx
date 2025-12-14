import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
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
} from "lucide-react";
import { useState } from "react";
import { useHREmployees, useHRStats } from "@/hooks/useHR";
import { format } from "date-fns";

export default function HRIndex() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: employees, isLoading } = useHREmployees();
  const { data: stats } = useHRStats();

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
            value="—"
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
            icon={DollarSign}
            title="Deduction Types"
            subtitle="Vrste odbitaka"
            onClick={() => navigate("/hr/deduction-types")}
          />
        </div>

        {/* Employees Table */}
        <div className="module-card">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Employee Directory</h3>
              <p className="text-sm text-muted-foreground">Imenik zaposlenika</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="w-64 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button onClick={() => navigate("/hr/employees/new")}>
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
