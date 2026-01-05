import { Clock } from "lucide-react";
import { useDashboardActivity } from "@/hooks/useDashboardActivity";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentActivity() {
  const { data: activities, isLoading } = useDashboardActivity();

  if (isLoading) {
    return (
      <div className="module-card">
        <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="module-card">
        <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          No recent activity
        </div>
      </div>
    );
  }

  return (
    <div className="module-card">
      <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-muted p-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm">{activity.action}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5">{activity.module}</span>
                <span>•</span>
                <span>{activity.user}</span>
                <span>•</span>
                <span>{activity.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
