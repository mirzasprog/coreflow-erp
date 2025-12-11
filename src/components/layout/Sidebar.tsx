import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Warehouse,
  DollarSign,
  HardDrive,
  ShoppingCart,
  Users,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Warehouse, label: "Warehouse", labelAlt: "Skladište", href: "/warehouse", color: "text-module-warehouse" },
  { icon: DollarSign, label: "Finance", labelAlt: "Financije", href: "/finance", color: "text-module-finance" },
  { icon: HardDrive, label: "Fixed Assets", labelAlt: "Osnovna sredstva", href: "/assets", color: "text-module-assets" },
  { icon: ShoppingCart, label: "POS", labelAlt: "Blagajna", href: "/pos", color: "text-module-pos" },
  { icon: Users, label: "HR", labelAlt: "Ljudski resursi", href: "/hr", color: "text-module-hr" },
  { icon: Shield, label: "HSE", labelAlt: "Zaštita na radu", href: "/hse", color: "text-module-hse" },
];

const bottomItems = [
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-lg font-bold text-sidebar-foreground">ERP System</span>
          </div>
        )}
        {collapsed && <Building2 className="mx-auto h-8 w-8 text-primary" />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
              >
                <item.icon className={cn("h-5 w-5 shrink-0", item.color)} />
                {!collapsed && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.labelAlt && (
                      <span className="text-xs text-sidebar-muted">{item.labelAlt}</span>
                    )}
                  </div>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom items */}
      <div className="border-t border-sidebar-border px-2 py-4">
        <ul className="space-y-1">
          {bottomItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      {/* Toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-muted"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </aside>
  );
}
