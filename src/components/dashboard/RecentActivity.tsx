import { Clock } from "lucide-react";

interface Activity {
  id: string;
  action: string;
  module: string;
  user: string;
  time: string;
}

const activities: Activity[] = [
  { id: "1", action: "Goods receipt GR-2024-001 posted", module: "Warehouse", user: "John D.", time: "5 min ago" },
  { id: "2", action: "Invoice INV-2024-089 created", module: "Finance", user: "Sarah M.", time: "12 min ago" },
  { id: "3", action: "POS shift closed - Terminal 1", module: "POS", user: "Mike R.", time: "1 hour ago" },
  { id: "4", action: "Fire extinguisher inspection due", module: "HSE", user: "System", time: "2 hours ago" },
  { id: "5", action: "New employee added: Ana K.", module: "HR", user: "HR Admin", time: "3 hours ago" },
];

export function RecentActivity() {
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
