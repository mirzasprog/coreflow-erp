import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export interface Alert {
  id: string;
  type: "warning" | "danger" | "info" | "success";
  message: string;
  module: string;
}

export function useDashboardAlerts() {
  return useQuery({
    queryKey: ["dashboard", "alerts"],
    queryFn: async () => {
      const alerts: Alert[] = [];
      const today = new Date();

      // HSE: Check for overdue safety device inspections
      const { data: devices } = await supabase
        .from("safety_devices")
        .select("id, next_inspection_date")
        .lt("next_inspection_date", today.toISOString().split("T")[0]);

      if (devices && devices.length > 0) {
        alerts.push({
          id: "hse-overdue-devices",
          type: "danger",
          message: `${devices.length} safety device${devices.length > 1 ? "s" : ""} overdue for inspection`,
          module: "HSE",
        });
      }

      // HSE: Check for expiring medical checks
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: expiringChecks } = await supabase
        .from("medical_checks")
        .select("id, valid_until")
        .gte("valid_until", today.toISOString().split("T")[0])
        .lte("valid_until", thirtyDaysFromNow.toISOString().split("T")[0]);

      if (expiringChecks && expiringChecks.length > 0) {
        alerts.push({
          id: "hse-expiring-checks",
          type: "warning",
          message: `${expiringChecks.length} employee check${expiringChecks.length > 1 ? "s" : ""} expiring within 30 days`,
          module: "HSE",
        });
      }

      // Warehouse: Check for low stock items
      const { data: items } = await supabase
        .from("items")
        .select("id, code, min_stock")
        .not("min_stock", "is", null);

      if (items && items.length > 0) {
        // Get stock levels
        const { data: stockLevels } = await supabase
          .from("stock_lots")
          .select("item_id, quantity");

        const itemStock: Record<string, number> = {};
        stockLevels?.forEach((lot) => {
          itemStock[lot.item_id] = (itemStock[lot.item_id] || 0) + (lot.quantity || 0);
        });

        const lowStockItems = items.filter((item) => {
          const currentStock = itemStock[item.id] || 0;
          return item.min_stock && currentStock < item.min_stock;
        });

        if (lowStockItems.length > 0) {
          alerts.push({
            id: "warehouse-low-stock",
            type: "warning",
            message: `Low stock alert: ${lowStockItems.length} item${lowStockItems.length > 1 ? "s" : ""} below minimum`,
            module: "Warehouse",
          });
        }
      }

      // Warehouse: Check for expiring stock lots
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
      
      const { data: expiringLots } = await supabase
        .from("stock_lots")
        .select("id, expiry_date")
        .gt("quantity", 0)
        .not("expiry_date", "is", null)
        .lte("expiry_date", ninetyDaysFromNow.toISOString().split("T")[0]);

      const expiredLots = expiringLots?.filter((lot) => 
        lot.expiry_date && new Date(lot.expiry_date) < today
      ) || [];

      if (expiredLots.length > 0) {
        alerts.push({
          id: "warehouse-expired-lots",
          type: "danger",
          message: `${expiredLots.length} stock lot${expiredLots.length > 1 ? "s" : ""} have expired`,
          module: "Warehouse",
        });
      }

      // Finance: Check for pending invoices
      const { data: pendingInvoices } = await supabase
        .from("invoices")
        .select("id, status")
        .eq("status", "draft");

      if (pendingInvoices && pendingInvoices.length > 0) {
        alerts.push({
          id: "finance-pending-invoices",
          type: "info",
          message: `${pendingInvoices.length} invoice${pendingInvoices.length > 1 ? "s" : ""} pending approval`,
          module: "Finance",
        });
      }

      // Finance: Check for overdue invoices
      const { data: overdueInvoices } = await supabase
        .from("invoices")
        .select("id, due_date, total, paid_amount")
        .eq("status", "posted")
        .eq("invoice_type", "outgoing")
        .lt("due_date", today.toISOString().split("T")[0]);

      const unpaidOverdue = overdueInvoices?.filter((inv) => {
        const paid = inv.paid_amount || 0;
        const total = inv.total || 0;
        return paid < total;
      }) || [];

      if (unpaidOverdue.length > 0) {
        alerts.push({
          id: "finance-overdue-invoices",
          type: "danger",
          message: `${unpaidOverdue.length} invoice${unpaidOverdue.length > 1 ? "s" : ""} overdue for payment`,
          module: "Finance",
        });
      }

      // HR: Check for pending absence approvals
      const { data: pendingAbsences } = await supabase
        .from("absences")
        .select("id")
        .eq("approved", false);

      if (pendingAbsences && pendingAbsences.length > 0) {
        alerts.push({
          id: "hr-pending-absences",
          type: "info",
          message: `${pendingAbsences.length} absence request${pendingAbsences.length > 1 ? "s" : ""} awaiting approval`,
          module: "HR",
        });
      }

      // HR: Check for expiring contracts
      const { data: expiringContracts } = await supabase
        .from("contracts")
        .select("id, end_date")
        .not("end_date", "is", null)
        .gte("end_date", today.toISOString().split("T")[0])
        .lte("end_date", thirtyDaysFromNow.toISOString().split("T")[0]);

      if (expiringContracts && expiringContracts.length > 0) {
        alerts.push({
          id: "hr-expiring-contracts",
          type: "warning",
          message: `${expiringContracts.length} contract${expiringContracts.length > 1 ? "s" : ""} expiring within 30 days`,
          module: "HR",
        });
      }

      // If no alerts, show success message
      if (alerts.length === 0) {
        alerts.push({
          id: "all-clear",
          type: "success",
          message: "All systems operating normally",
          module: "System",
        });
      }

      return alerts;
    },
    staleTime: 60000,
  });
}
