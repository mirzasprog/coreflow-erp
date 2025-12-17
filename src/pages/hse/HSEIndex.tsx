import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { NavLink } from "@/components/NavLink";
import type { LucideIcon } from "lucide-react";
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

type ActionStatus = "open" | "in_progress" | "completed";

interface ActionItem {
  id: string;
  title: string;
  owner: string;
  dueIn: string;
  severity: "low" | "medium" | "high";
  status: ActionStatus;
}

const trainingCoverage = [
  { id: "t1", name: "Fire Safety & Extinguishers", completion: 92, overdue: 1 },
  { id: "t2", name: "Evacuation & Drills", completion: 88, overdue: 2 },
  { id: "t3", name: "First Aid & PPE", completion: 76, overdue: 3 },
];

const readinessScores = [
  { id: "r1", label: "Fire Safety", status: "Stable", trend: "+4%", score: 86 },
  { id: "r2", label: "Machinery", status: "Monitor", trend: "-2%", score: 72 },
  { id: "r3", label: "Medical", status: "Improving", trend: "+3%", score: 81 },
];

const actionItemsSeed: ActionItem[] = [
  {
    id: "a1",
    title: "Zamijeni istekli aparat FE-007",
    owner: "Marko Horvat",
    dueIn: "3 dana",
    severity: "high",
    status: "open",
  },
  {
    id: "a2",
    title: "Planiraj godišnji pregled hidranta H-003",
    owner: "Tina Vuković",
    dueIn: "1 tjedan",
    severity: "medium",
    status: "in_progress",
  },
  {
    id: "a3",
    title: "Podsjeti na sanitarnu knjižicu za ugostiteljstvo",
    owner: "Sanja Petrović",
    dueIn: "Danas",
    severity: "high",
    status: "open",
  },
  {
    id: "a4",
    title: "Ažuriraj protokol za evakuaciju",
    owner: "Ivan Kovač",
    dueIn: "15 dana",
    severity: "low",
    status: "completed",
  },
];

export default function HSEIndex() {
  const [inspectionWindow, setInspectionWindow] = useState<"7" | "30" | "all">("30");
  const [actionItems, setActionItems] = useState<ActionItem[]>(actionItemsSeed);

  const filteredInspections = useMemo(() => {
    const sorted = [...upcomingInspections].sort((a, b) => a.daysUntil - b.daysUntil);
    if (inspectionWindow === "all") return sorted;
    const limit = parseInt(inspectionWindow, 10);
    return sorted.filter((item) => item.daysUntil <= limit);
  }, [inspectionWindow]);

  const actionCounts = useMemo(() => {
    return actionItems.reduce(
      (acc, item) => {
        acc[item.status as keyof typeof acc] += 1;
        return acc;
      },
      { open: 0, in_progress: 0, completed: 0 }
    );
  }, [actionItems]);

  const updateActionItem = (id: string, status: ActionStatus) => {
    setActionItems((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  return (
    <div>
      <Header title="Health, Safety & Environment" subtitle="Zaštita na radu • Occupational Safety" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Upcoming Inspections */}
          <div className="module-card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Upcoming Inspections</h3>
                <p className="text-sm text-muted-foreground">Predstojeći pregledi uređaja</p>
              </div>
              <div className="flex items-center gap-2">
                {["7", "30", "all"].map((value) => (
                  <Button
                    key={value}
                    variant={inspectionWindow === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInspectionWindow(value as typeof inspectionWindow)}
                  >
                    {value === "all" ? "Sve" : `Do ${value} dana`}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {filteredInspections.map((item) => (
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
                    <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium">
                      <FileCheck className="h-3 w-3 text-muted-foreground" />
                      {item.type}
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
                </div>
              ))}
              {filteredInspections.length === 0 && (
                <div className="flex h-24 items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
                  Nema pregleda u odabranom periodu
                </div>
              )}
            </div>
          </div>

          {/* Compliance Snapshot */}
          <div className="module-card">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Compliance Snapshot</h3>
                <p className="text-sm text-muted-foreground">Pokazatelji spremnosti</p>
              </div>
              <div className="rounded-full bg-module-hse/10 px-3 py-1 text-xs font-semibold text-module-hse">
                Live
              </div>
            </div>
            <div className="space-y-3">
              {readinessScores.map((item) => (
                <div key={item.id} className="rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.label}</p>
                    <span
                      className={
                        item.status === "Stable"
                          ? "badge-secondary"
                          : item.status === "Improving"
                            ? "badge-success"
                            : "badge-warning"
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-module-hse"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Score: {item.score}% • {item.trend}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action & Medical */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="module-card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Action Center</h3>
                <p className="text-sm text-muted-foreground">Operativni zadaci za HSE</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="badge-danger">{actionCounts.open} Open</span>
                <span className="badge-warning">{actionCounts.in_progress} In progress</span>
                <span className="badge-success">{actionCounts.completed} Completed</span>
              </div>
            </div>
            <div className="space-y-3">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={
                        "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold " +
                        (item.severity === "high"
                          ? "bg-destructive/10 text-destructive"
                          : item.severity === "medium"
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success")
                      }
                    >
                      {item.owner.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">Nositelj: {item.owner} • Rok: {item.dueIn}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-muted px-2 py-1 font-medium">Severity: {item.severity}</span>
                        <span
                          className={
                            item.status === "completed"
                              ? "badge-success"
                              : item.status === "in_progress"
                                ? "badge-warning"
                                : "badge-danger"
                          }
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateActionItem(item.id, "in_progress")}
                      disabled={item.status === "completed"}
                    >
                      Start
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateActionItem(item.id, "completed")}
                      disabled={item.status === "completed"}
                    >
                      Resolve
                    </Button>
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

        {/* Training & compliance */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="module-card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Training Coverage</h3>
                <p className="text-sm text-muted-foreground">Obuka i osposobljavanje zaposlenika</p>
              </div>
              <Button variant="outline" size="sm">Download plan</Button>
            </div>
            <div className="space-y-3">
              {trainingCoverage.map((training) => (
                <div key={training.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{training.name}</p>
                      <p className="text-sm text-muted-foreground">{training.overdue} sessions overdue</p>
                    </div>
                    <span className="text-sm font-semibold text-module-hse">{training.completion}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-module-hse"
                      style={{ width: `${training.completion}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="module-card">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Medical Coverage</h3>
                <p className="text-sm text-muted-foreground">Pregledi i sanitarne knjižice</p>
              </div>
              <div className="rounded-md bg-info/10 px-2 py-1 text-xs font-semibold text-info">Tracking</div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                <div>
                  <p className="font-medium">Aktivni pregledi</p>
                  <p className="text-sm text-muted-foreground">Planirani i u tijeku</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">18</p>
                  <p className="text-xs text-success">+3 this week</p>
                </div>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <p className="font-medium">Expiring soon</p>
                <p className="text-sm text-muted-foreground">5 zaposlenika unutar 10 dana</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-warning">
                  <Clock className="h-3 w-3" /> Hitno planirati
                </div>
              </div>
              <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                <p className="font-medium">Completed this month</p>
                <p className="text-sm text-muted-foreground">12 pregleda završeno</p>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-success" style={{ width: "68%" }} />
                </div>
              </div>
            </div>
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
  icon: LucideIcon;
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
