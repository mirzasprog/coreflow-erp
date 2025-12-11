import { Header } from "@/components/layout/Header";
import {
  Building,
  Users,
  Shield,
  Database,
  Globe,
  Bell,
  Palette,
  Key,
} from "lucide-react";

const settingsSections = [
  {
    title: "Organization",
    items: [
      { icon: Building, label: "Company Settings", description: "Manage company information and locations" },
      { icon: Users, label: "User Management", description: "Add and manage user accounts" },
      { icon: Shield, label: "Roles & Permissions", description: "Configure access control" },
    ],
  },
  {
    title: "System",
    items: [
      { icon: Database, label: "Data Management", description: "Backup, restore, and import data" },
      { icon: Globe, label: "Localization", description: "Language and regional settings" },
      { icon: Bell, label: "Notifications", description: "Configure alerts and reminders" },
    ],
  },
  {
    title: "Customization",
    items: [
      { icon: Palette, label: "Appearance", description: "Theme and display settings" },
      { icon: Key, label: "API Keys", description: "Manage integrations and API access" },
    ],
  },
];

export default function SettingsIndex() {
  return (
    <div>
      <Header title="Settings" subtitle="System Configuration & Administration" />

      <div className="p-6">
        <div className="space-y-8">
          {settingsSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-lg font-semibold">{section.title}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    className="module-card flex items-start gap-4 text-left transition-all hover:shadow-md"
                  >
                    <div className="rounded-lg bg-primary/10 p-3">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* System Info */}
        <div className="mt-8 rounded-lg border bg-muted/30 p-4">
          <h4 className="font-medium">System Information</h4>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <span className="text-muted-foreground">Version:</span>{" "}
              <span className="font-medium">1.0.0</span>
            </div>
            <div>
              <span className="text-muted-foreground">Database:</span>{" "}
              <span className="font-medium">PostgreSQL</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Backup:</span>{" "}
              <span className="font-medium">2024-01-15 03:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
