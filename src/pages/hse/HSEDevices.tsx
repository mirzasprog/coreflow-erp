import { useMemo, useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Flame, AlertTriangle, CalendarClock, Link2 } from "lucide-react";
import { useSafetyDevices } from "@/hooks/useHSE";
import { useNavigate } from "react-router-dom";

type DeviceStatus = "overdue" | "due_soon" | "scheduled" | "unscheduled";

export default function HSEDevices() {
  const { data: devices, isLoading } = useSafetyDevices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "all">("all");
  const navigate = useNavigate();

  const enrichedDevices = useMemo(() => {
    const today = new Date();
    return (
      devices?.map((device) => {
        const nextInspection = device.next_inspection_date ? new Date(device.next_inspection_date) : null;
        const daysUntil = nextInspection ? differenceInCalendarDays(nextInspection, today) : null;

        let status: DeviceStatus = "unscheduled";
        if (daysUntil === null) status = "unscheduled";
        else if (daysUntil < 0) status = "overdue";
        else if (daysUntil <= 30) status = "due_soon";
        else status = "scheduled";

        return { ...device, daysUntil, status };
      }) || []
    );
  }, [devices]);

  const filteredDevices = useMemo(() => {
    return enrichedDevices.filter((device) => {
      if (statusFilter !== "all" && device.status !== statusFilter) return false;
      if (!search) return true;
      const haystack = `${device.name || ""} ${device.device_code} ${device.device_type} ${device.locations?.name || ""}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [enrichedDevices, statusFilter, search]);

  const stats = useMemo(() => {
    const total = enrichedDevices.length;
    const overdue = enrichedDevices.filter((d) => d.status === "overdue").length;
    const dueSoon = enrichedDevices.filter((d) => d.status === "due_soon").length;
    const linkedAssets = enrichedDevices.filter((d) => d.asset_id).length;
    return { total, overdue, dueSoon, linkedAssets };
  }, [enrichedDevices]);

  const renderStatus = (status: DeviceStatus, daysUntil: number | null) => {
    if (status === "overdue") {
      return <Badge className="bg-destructive/20 text-destructive">Overdue</Badge>;
    }
    if (status === "due_soon") {
      return <Badge className="bg-warning/20 text-warning">Due in {daysUntil}d</Badge>;
    }
    if (status === "unscheduled") {
      return <Badge variant="outline">Not scheduled</Badge>;
    }
    return <Badge className="bg-success/20 text-success">Scheduled</Badge>;
  };

  return (
    <div>
      <Header title="Safety Devices" subtitle="Uređaji zaštite • Evidencija i rokovi pregleda" />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Devices"
            value={stats.total.toString()}
            change="Registrirani uređaji"
            icon={Flame}
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
            title="Due Soon"
            value={stats.dueSoon.toString()}
            change="30 dana"
            changeType={stats.dueSoon > 0 ? "warning" : "positive"}
            icon={CalendarClock}
            iconColor="bg-warning/10 text-warning"
          />
          <StatCard
            title="Linked Assets"
            value={stats.linkedAssets.toString()}
            change="Povezano sa osnovnim sredstvima"
            icon={Link2}
            iconColor="bg-success/10 text-success"
          />
        </div>

        <div className="module-card">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Evidencija uređaja</h3>
              <p className="text-sm text-muted-foreground">
                Pregledi i intervali iz Supabase baze
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex gap-2">
                {(["all", "overdue", "due_soon", "scheduled", "unscheduled"] as (DeviceStatus | "all")[]).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                  >
                    {status === "all" ? "Sve" : status.replace("_", " ")}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Pretraga uređaja..."
                className="w-full min-w-[220px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Učitavanje uređaja...</div>
          ) : filteredDevices.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nema uređaja za prikaz.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Uređaj</TableHead>
                    <TableHead>Vrsta</TableHead>
                    <TableHead>Lokacija</TableHead>
                    <TableHead>Sljedeći pregled</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Asset</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        {device.name || device.device_code}
                      </TableCell>
                      <TableCell>{device.device_type}</TableCell>
                      <TableCell>{device.locations?.name || "—"}</TableCell>
                      <TableCell>
                        {device.next_inspection_date
                          ? `${format(new Date(device.next_inspection_date), "dd.MM.yyyy")}${device.daysUntil !== null ? ` (${device.daysUntil}d)` : ""}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {device.inspection_interval_months
                          ? `${device.inspection_interval_months} mjeseci`
                          : "—"}
                      </TableCell>
                      <TableCell>{renderStatus(device.status, device.daysUntil)}</TableCell>
                      <TableCell>
                        {device.asset_id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-0 text-primary"
                            onClick={() => navigate(`/assets/${device.asset_id}`)}
                          >
                            {device.fixed_assets?.asset_code || "Asset details"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
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
