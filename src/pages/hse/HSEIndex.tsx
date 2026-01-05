import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { differenceInCalendarDays, format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { NavLink } from "@/components/NavLink";
import { useMedicalCheckStats, useSafetyDevices } from "@/hooks/useHSE";
import type { LucideIcon } from "lucide-react";
import {
  Shield,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Flame,
  HeartPulse,
  FileCheck,
} from "lucide-react";

export default function HSEIndex() {
  const navigate = useNavigate();
  const [inspectionWindow, setInspectionWindow] = useState<"7" | "30" | "all">("30");
  const { data: devices } = useSafetyDevices();
  const { data: medicalChecks = [], stats: medicalStats } = useMedicalCheckStats();

  const inspectionsFromDevices = useMemo(() => {
    const today = new Date();
    return (
      devices?.map((device) => {
        const nextInspection = device.next_inspection_date ? new Date(device.next_inspection_date) : null;
        const daysUntil = nextInspection ? differenceInCalendarDays(nextInspection, today) : null;
        return {
          id: device.id,
          device: device.name || device.device_code,
          type: device.device_type,
          location: device.locations?.name || "—",
          dueDate: device.next_inspection_date,
          daysUntil,
        };
      }) || []
    );
  }, [devices]);

  const filteredInspections = useMemo(() => {
    const sorted = inspectionsFromDevices
      .filter((item) => item.daysUntil !== null)
      .sort((a, b) => (a.daysUntil || 0) - (b.daysUntil || 0));
    if (inspectionWindow === "all") return sorted;
    const limit = parseInt(inspectionWindow, 10);
    return sorted.filter((item) => (item.daysUntil || 0) <= limit);
  }, [inspectionWindow, inspectionsFromDevices]);

  const overdueMedical = useMemo(() => {
    const now = new Date();
    return medicalChecks
      .filter((check) => check.valid_until && new Date(check.valid_until) < now)
      .map((check) => ({
        id: check.id,
        employee: check.employees
          ? `${check.employees.first_name} ${check.employees.last_name}`
          : "—",
        type: check.check_type === "sanitary_booklet" ? "Sanitary Booklet" : check.check_type === "periodic_medical" ? "Medical Exam" : "Other",
        expiredDate: check.valid_until || "",
        daysOverdue: check.valid_until
          ? Math.abs(differenceInCalendarDays(new Date(check.valid_until), now))
          : 0,
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [medicalChecks]);

  const deviceStats = useMemo(() => {
    const overdue = inspectionsFromDevices.filter((item) => (item.daysUntil || 0) < 0).length;
    const dueSoon = inspectionsFromDevices.filter(
      (item) => item.daysUntil !== null && item.daysUntil >= 0 && item.daysUntil <= 30,
    ).length;

    return {
      total: inspectionsFromDevices.length,
      overdue,
      dueSoon,
    };
  }, [inspectionsFromDevices]);

  // Calculate compliance scores based on real data
  const complianceScores = useMemo(() => {
    const deviceCompliance = deviceStats.total > 0
      ? Math.round(((deviceStats.total - deviceStats.overdue) / deviceStats.total) * 100)
      : 100;
    
    const medicalCompliance = medicalStats.complianceRate;
    
    return [
      {
        id: "devices",
        label: "Device Inspections",
        score: deviceCompliance,
        status: deviceCompliance >= 90 ? "Good" : deviceCompliance >= 70 ? "Monitor" : "Critical",
        detail: `${deviceStats.overdue} overdue`,
      },
      {
        id: "medical",
        label: "Medical Checks",
        score: medicalCompliance,
        status: medicalCompliance >= 90 ? "Good" : medicalCompliance >= 70 ? "Monitor" : "Critical",
        detail: `${medicalStats.overdue} expired`,
      },
    ];
  }, [deviceStats, medicalStats]);

  return (
    <div>
      <Header title="Health, Safety & Environment" subtitle="Zaštita na radu • Occupational Safety" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Safety Devices"
            value={deviceStats.total.toString()}
            change={`${deviceStats.dueSoon} due soon`}
            icon={Shield}
            iconColor="bg-module-hse/10 text-module-hse"
          />
          <StatCard
            title="Overdue Inspections"
            value={deviceStats.overdue.toString()}
            change="Urgent attention required"
            changeType="negative"
            icon={AlertTriangle}
            iconColor="bg-destructive/10 text-destructive"
          />
          <StatCard
            title="Employee Checks"
            value={medicalStats.total.toString()}
            change={`${medicalStats.overdue} expired, ${medicalStats.expiringSoon} expiring soon`}
            changeType={medicalStats.overdue > 0 ? "negative" : "positive"}
            icon={HeartPulse}
            iconColor="bg-warning/10 text-warning"
          />
          <StatCard
            title="Compliance Rate"
            value={`${medicalStats.complianceRate}%`}
            change="Validni pregledi"
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
              count={`${deviceStats.total} devices`}
            />
          </NavLink>
          <NavLink to="/hse/inspections">
            <QuickNavCard
              icon={FileCheck}
              title="Inspections"
              subtitle="Pregledi uređaja"
              count={`${deviceStats.dueSoon} pending`}
            />
          </NavLink>
          <NavLink to="/hse/medical">
            <QuickNavCard
              icon={HeartPulse}
              title="Medical Checks"
              subtitle="Liječnički pregledi"
              count={`${medicalStats.expiringSoon} expiring`}
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
                        {item.location} • Due:{" "}
                        {item.dueDate ? format(new Date(item.dueDate), "dd.MM.yyyy") : "N/A"}
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
                          item.daysUntil !== null && item.daysUntil <= 7
                            ? "font-medium text-warning"
                            : "text-muted-foreground"
                        }
                      >
                        {item.daysUntil !== null ? `${item.daysUntil} days` : "No schedule"}
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

          {/* Compliance Snapshot - Real Data */}
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
              {complianceScores.map((item) => (
                <div key={item.id} className="rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.label}</p>
                    <span
                      className={
                        item.status === "Good"
                          ? "rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                          : item.status === "Monitor"
                            ? "rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"
                            : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                      }
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        item.score >= 90 ? "bg-success" : item.score >= 70 ? "bg-warning" : "bg-destructive"
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Score: {item.score}% • {item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Overdue Medical Checks */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="module-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Overdue Medical Checks</h3>
                <p className="text-sm text-muted-foreground">Istekli liječnički pregledi</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/hse/medical")}>View All</Button>
            </div>
            {overdueMedical.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <CheckCircle className="mr-2 h-5 w-5 text-success" />
                All checks up to date
              </div>
            ) : (
              <div className="space-y-3">
                {overdueMedical.slice(0, 5).map((item) => (
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
                          {item.type} • Expired: {item.expiredDate ? format(new Date(item.expiredDate), "dd.MM.yyyy") : "N/A"}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
                      {item.daysOverdue} days
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medical Coverage Summary */}
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
                  <p className="font-medium">Total Checks</p>
                  <p className="text-sm text-muted-foreground">All medical records</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{medicalStats.total}</p>
                  <p className="text-xs text-muted-foreground">records</p>
                </div>
              </div>
              {medicalStats.expiringSoon > 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <p className="font-medium">Expiring soon</p>
                  <p className="text-sm text-muted-foreground">{medicalStats.expiringSoon} employees within 30 days</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-warning">
                    <Clock className="h-3 w-3" /> Plan renewals
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                <p className="font-medium">Compliance Rate</p>
                <p className="text-sm text-muted-foreground">{medicalStats.complianceRate}% of checks are valid</p>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full bg-success" 
                    style={{ width: `${medicalStats.complianceRate}%` }} 
                  />
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
