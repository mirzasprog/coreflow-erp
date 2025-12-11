import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "warning" | "danger" | "info" | "success";
  message: string;
  module: string;
}

const alerts: Alert[] = [
  { id: "1", type: "danger", message: "3 fire extinguishers overdue for inspection", module: "HSE" },
  { id: "2", type: "warning", message: "Low stock alert: 5 items below minimum", module: "Warehouse" },
  { id: "3", type: "info", message: "2 invoices pending approval", module: "Finance" },
  { id: "4", type: "warning", message: "Employee sanitary check expiring in 7 days", module: "HSE" },
];

const icons = {
  warning: AlertTriangle,
  danger: XCircle,
  info: Clock,
  success: CheckCircle,
};

const colors = {
  warning: "text-warning bg-warning/10",
  danger: "text-destructive bg-destructive/10",
  info: "text-info bg-info/10",
  success: "text-success bg-success/10",
};

export function AlertsWidget() {
  return (
    <div className="module-card">
      <h3 className="mb-4 text-lg font-semibold">Alerts & Notifications</h3>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = icons[alert.type];
          return (
            <div
              key={alert.id}
              className={cn("flex items-start gap-3 rounded-lg p-3", colors[alert.type])}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">{alert.message}</p>
                <span className="text-xs opacity-75">{alert.module}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
