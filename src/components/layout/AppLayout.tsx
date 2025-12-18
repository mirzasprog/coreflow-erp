import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNavigate={() => setMobileOpen(false)}
      />

      <Button
        variant="secondary"
        size="icon"
        className="fixed left-4 top-4 z-50 h-10 w-10 rounded-full border bg-card shadow lg:hidden"
        onClick={() => setMobileOpen((prev) => !prev)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main
        className={cn(
          "min-h-screen transition-all duration-300",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64",
          "ml-0"
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
