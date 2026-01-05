import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data: alerts, isLoading } = useDashboardAlerts();

  if (isLoading) {
    return (
      <div className="module-card">
        <h3 className="mb-4 text-lg font-semibold">Alerts & Notifications</h3>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="module-card">
      <h3 className="mb-4 text-lg font-semibold">Alerts & Notifications</h3>
      <div className="space-y-3">
        {alerts?.map((alert) => {
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
