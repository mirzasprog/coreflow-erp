import React from "react";
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
  PanelsTopLeft,
  LineChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

type SidebarSection = {
  title: string;
  hint?: string;
  items: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    labelAlt?: string;
    href: string;
    color?: string;
  }[];
};

const sections: SidebarSection[] = [
  {
    title: "Overview",
    hint: "Pregled i KPI trendovi",
    items: [{ icon: LayoutDashboard, label: "Dashboard", href: "/" }],
  },
  {
    title: "Operations",
    hint: "Operativni moduli",
    items: [
      { icon: Warehouse, label: "Warehouse", labelAlt: "Skladište", href: "/warehouse", color: "text-module-warehouse" },
      { icon: ShoppingCart, label: "POS", labelAlt: "Prodaja", href: "/pos", color: "text-module-pos" },
    ],
  },
  {
    title: "Back Office",
    hint: "Financije i imovina",
    items: [
      { icon: DollarSign, label: "Finance", labelAlt: "Financije", href: "/finance", color: "text-module-finance" },
      { icon: HardDrive, label: "Fixed Assets", labelAlt: "Osnovna sredstva", href: "/assets", color: "text-module-assets" },
    ],
  },
  {
    title: "People & Safety",
    hint: "HR i zaštita na radu",
    items: [
      { icon: Users, label: "HR", labelAlt: "Ljudski resursi", href: "/hr", color: "text-module-hr" },
      { icon: Shield, label: "HSE", labelAlt: "Sigurnost", href: "/hse", color: "text-module-hse" },
    ],
  },
];

const bottomItems = [
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar({ collapsed, onToggle, mobileOpen, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar transition-all duration-300 shadow-lg",
        collapsed ? "lg:w-16" : "lg:w-64",
        "w-72",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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
        <div className="space-y-4 px-3">
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <div className="mb-2 flex items-center justify-between px-1 text-xs uppercase tracking-wide text-sidebar-muted">
                  <span>{section.title}</span>
                  <span className="text-[10px] text-sidebar-accent-foreground/80">{section.hint}</span>
                </div>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-2"
                      )}
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground shadow-md shadow-sidebar-accent/30"
                    >
                      <span className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-sidebar-foreground transition-colors group-hover:bg-white/10",
                        item.color && `${item.color}/90`
                      )}>
                        <item.icon className="h-5 w-5 shrink-0" />
                      </span>
                      {!collapsed && (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium leading-tight">{item.label}</span>
                          {item.labelAlt && (
                            <span className="text-xs text-sidebar-muted">{item.labelAlt}</span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <Separator className="mt-3 bg-sidebar-border last:hidden" />
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom items */}
      <div className="border-t border-sidebar-border px-2 py-4">
        <ul className="space-y-1">
          {bottomItems.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                onClick={onNavigate}
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
      <div className="absolute -right-3 top-20 hidden lg:block">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-6 w-6 rounded-full border bg-background shadow-md hover:bg-muted"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!collapsed && (
        <div className="mb-4 px-4">
          <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sidebar-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <PanelsTopLeft className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Modularni pregled</p>
              <p className="text-xs text-sidebar-muted">Brže biranje modula i mobilna navigacija</p>
            </div>
            <LineChart className="h-4 w-4 text-sidebar-muted" />
          </div>
        </div>
      )}
    </aside>
  );
}
