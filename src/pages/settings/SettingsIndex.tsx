import { useNavigate } from "react-router-dom";
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
  Truck,
  FileText,
} from "lucide-react";

const settingsSections = [
  {
    title: "Master Data",
    items: [
      { icon: Truck, label: "Business Partners", description: "Manage suppliers and customers", href: "/settings/partners" },
      { icon: FileText, label: "Pravilnici i Procedure", description: "Interni dokumenti za AI asistenta", href: "/settings/documents" },
      { icon: Building, label: "Company Settings", description: "Manage company information and locations", href: null },
    ],
  },
  {
    title: "Organization",
    items: [
      { icon: Users, label: "User Management", description: "Add and manage user accounts", href: null },
      { icon: Shield, label: "Roles & Permissions", description: "Configure access control", href: null },
    ],
  },
  {
    title: "System",
    items: [
      { icon: Database, label: "Data Management", description: "Backup, restore, and import data", href: null },
      { icon: Globe, label: "Localization", description: "Language and regional settings", href: null },
      { icon: Bell, label: "Notifications", description: "Configure alerts and reminders", href: null },
    ],
  },
  {
    title: "Customization",
    items: [
      { icon: Palette, label: "Appearance", description: "Theme and display settings", href: null },
      { icon: Key, label: "API Keys", description: "Manage integrations and API access", href: null },
    ],
  },
];

export default function SettingsIndex() {
  const navigate = useNavigate();
  
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
                    onClick={() => item.href && navigate(item.href)}
                    className={`module-card flex items-start gap-4 text-left transition-all hover:shadow-md ${!item.href ? 'opacity-60 cursor-not-allowed' : ''}`}
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
