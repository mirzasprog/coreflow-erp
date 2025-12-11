import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { NavLink } from "@/components/NavLink";
import {
  Shield,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Flame,
  HeartPulse,
  Users,
  FileCheck,
} from "lucide-react";

const upcomingInspections = [
  { id: "1", device: "Fire Extinguisher FE-001", type: "Fire Extinguisher", location: "Store 1", dueDate: "2024-01-20", daysUntil: 5 },
  { id: "2", device: "Hydrant H-003", type: "Hydrant", location: "Warehouse", dueDate: "2024-01-25", daysUntil: 10 },
  { id: "3", device: "Elevator EL-001", type: "Elevator", location: "Office HQ", dueDate: "2024-02-01", daysUntil: 17 },
];

const overdueChecks = [
  { id: "1", employee: "Ana Kovač", type: "Sanitary Booklet", expiredDate: "2024-01-10", daysOverdue: 5 },
  { id: "2", employee: "Mike Smith", type: "Medical Exam", expiredDate: "2024-01-05", daysOverdue: 10 },
];

export default function HSEIndex() {
  return (
    <div>
      <Header title="Health, Safety & Environment" subtitle="Zaštita na radu • Occupational Safety" />

      <div className="p-6">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Safety Devices"
            value="84"
            change="12 due for inspection"
            icon={Shield}
            iconColor="bg-module-hse/10 text-module-hse"
          />
          <StatCard
            title="Overdue Inspections"
            value="3"
            change="Urgent attention required"
            changeType="negative"
            icon={AlertTriangle}
            iconColor="bg-destructive/10 text-destructive"
          />
          <StatCard
            title="Employee Checks"
            value="47"
            change="2 expired, 5 expiring soon"
            changeType="negative"
            icon={HeartPulse}
            iconColor="bg-warning/10 text-warning"
          />
          <StatCard
            title="Compliance Rate"
            value="94%"
            change="+2% from last month"
            changeType="positive"
            icon={CheckCircle}
            iconColor="bg-success/10 text-success"
          />
        </div>

        {/* Quick Navigation */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NavLink to="/hse/devices">
            <QuickNavCard
              icon={Flame}
              title="Safety Devices"
              subtitle="Uređaji zaštite"
              count="84 devices"
            />
          </NavLink>
          <NavLink to="/hse/inspections">
            <QuickNavCard
              icon={FileCheck}
              title="Inspections"
              subtitle="Pregledi uređaja"
              count="12 pending"
            />
          </NavLink>
          <NavLink to="/hse/medical">
            <QuickNavCard
              icon={HeartPulse}
              title="Medical Checks"
              subtitle="Liječnički pregledi"
              count="7 expiring"
            />
          </NavLink>
          <NavLink to="/hse/calendar">
            <QuickNavCard
              icon={Calendar}
              title="Calendar"
              subtitle="Kalendar pregleda"
              count="View schedule"
            />
          </NavLink>
        </div>

        {/* Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Inspections */}
          <div className="module-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Upcoming Inspections</h3>
                <p className="text-sm text-muted-foreground">Predstojeći pregledi uređaja</p>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            <div className="space-y-3">
              {upcomingInspections.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-module-hse/10 p-2">
                      <Flame className="h-4 w-4 text-module-hse" />
                    </div>
                    <div>
                      <p className="font-medium">{item.device}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.location} • Due: {item.dueDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span
                      className={
                        item.daysUntil <= 7
                          ? "font-medium text-warning"
                          : "text-muted-foreground"
                      }
                    >
                      {item.daysUntil} days
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Medical Checks */}
          <div className="module-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Overdue Medical Checks</h3>
                <p className="text-sm text-muted-foreground">Istekli liječnički pregledi</p>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            {overdueChecks.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <CheckCircle className="mr-2 h-5 w-5 text-success" />
                All checks up to date
              </div>
            ) : (
              <div className="space-y-3">
                {overdueChecks.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-sm font-medium text-destructive">
                        {item.employee.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium">{item.employee}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.type} • Expired: {item.expiredDate}
                        </p>
                      </div>
                    </div>
                    <span className="badge-danger">{item.daysOverdue} days overdue</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickNavCard({
  icon: Icon,
  title,
  subtitle,
  count,
}: {
  icon: any;
  title: string;
  subtitle: string;
  count: string;
}) {
  return (
    <div className="module-card group cursor-pointer border-l-4 border-l-module-hse transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-module-hse/10 p-2">
          <Icon className="h-5 w-5 text-module-hse" />
        </div>
      </div>
      <div className="mt-3">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <p className="mt-2 text-xs font-medium text-module-hse">{count}</p>
      </div>
    </div>
  );
}
