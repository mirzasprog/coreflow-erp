import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Users,
  UserPlus,
  Calendar,
  FileText,
  Search,
  Building,
  Clock,
} from "lucide-react";

const employees = [
  { id: "EMP-001", name: "John Doe", position: "Software Developer", department: "IT", location: "Office HQ", status: "active", startDate: "2022-03-15" },
  { id: "EMP-002", name: "Sarah Miller", position: "HR Manager", department: "HR", location: "Office HQ", status: "active", startDate: "2021-01-10" },
  { id: "EMP-003", name: "Mike Smith", position: "Sales Rep", department: "Sales", location: "Store 1", status: "on-leave", startDate: "2023-06-01" },
  { id: "EMP-004", name: "Ana Kovač", position: "Cashier", department: "Retail", location: "Store 2", status: "active", startDate: "2023-09-15" },
  { id: "EMP-005", name: "Peter Johnson", position: "Warehouse Mgr", department: "Logistics", location: "Warehouse", status: "active", startDate: "2020-08-20" },
];

export default function HRIndex() {
  return (
    <div>
      <Header title="Human Resources" subtitle="Ljudski resursi • Employee Management" />

      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Employees"
            value="47"
            change="3 new this month"
            changeType="positive"
            icon={Users}
            iconColor="bg-module-hr/10 text-module-hr"
          />
          <StatCard
            title="On Leave"
            value="4"
            change="2 returning tomorrow"
            icon={Calendar}
            iconColor="bg-warning/10 text-warning"
          />
          <StatCard
            title="Open Positions"
            value="3"
            change="12 applications"
            icon={UserPlus}
            iconColor="bg-info/10 text-info"
          />
          <StatCard
            title="Active Contracts"
            value="52"
            change="5 expiring soon"
            icon={FileText}
            iconColor="bg-primary/10 text-primary"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction icon={UserPlus} title="Add Employee" subtitle="Novi zaposlenik" />
          <QuickAction icon={Calendar} title="Register Absence" subtitle="Evidencija odsutnosti" />
          <QuickAction icon={FileText} title="New Contract" subtitle="Novi ugovor" />
          <QuickAction icon={Clock} title="Time Tracking" subtitle="Evidencija radnog vremena" />
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
                <Input placeholder="Search employees..." className="w-64 pl-9" />
              </div>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Location</th>
                  <th>Start Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="cursor-pointer">
                    <td className="font-medium">{emp.id}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {emp.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        {emp.name}
                      </div>
                    </td>
                    <td>{emp.position}</td>
                    <td>
                      <span className="rounded bg-muted px-2 py-1 text-xs">{emp.department}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        {emp.location}
                      </div>
                    </td>
                    <td>{emp.startDate}</td>
                    <td>
                      {emp.status === "active" ? (
                        <span className="badge-success">Active</span>
                      ) : (
                        <span className="badge-warning">On Leave</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <button className="module-card flex items-center gap-4 text-left">
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
