import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export interface Activity {
  id: string;
  action: string;
  module: string;
  user: string;
  time: string;
  timestamp: Date;
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: async () => {
      const activities: Activity[] = [];

      // Fetch recent warehouse documents (goods receipts, issues, transfers)
      const { data: warehouseDocs } = await supabase
        .from("warehouse_documents")
        .select("id, document_number, document_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      warehouseDocs?.forEach((doc) => {
        const typeLabels: Record<string, string> = {
          goods_receipt: "Goods receipt",
          goods_issue: "Goods issue",
          transfer: "Transfer",
          inventory: "Inventory",
        };
        const action = `${typeLabels[doc.document_type] || doc.document_type} ${doc.document_number} ${doc.status === "posted" ? "posted" : "created"}`;
        activities.push({
          id: doc.id,
          action,
          module: "Warehouse",
          user: "System",
          time: formatDistanceToNow(new Date(doc.created_at), { addSuffix: true }),
          timestamp: new Date(doc.created_at),
        });
      });

      // Fetch recent invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      invoices?.forEach((inv) => {
        const typeLabel = inv.invoice_type === "outgoing" ? "Invoice" : "Incoming invoice";
        const action = `${typeLabel} ${inv.invoice_number} ${inv.status === "posted" ? "posted" : "created"}`;
        activities.push({
          id: inv.id,
          action,
          module: "Finance",
          user: "System",
          time: formatDistanceToNow(new Date(inv.created_at), { addSuffix: true }),
          timestamp: new Date(inv.created_at),
        });
      });

      // Fetch recent POS shifts
      const { data: shifts } = await supabase
        .from("pos_shifts")
        .select("id, status, end_time, created_at, pos_terminals(terminal_code)")
        .order("created_at", { ascending: false })
        .limit(3);

      shifts?.forEach((shift: any) => {
        const terminalCode = shift.pos_terminals?.terminal_code || "Unknown";
        const action = shift.status === "closed" 
          ? `POS shift closed - Terminal ${terminalCode}`
          : `POS shift opened - Terminal ${terminalCode}`;
        activities.push({
          id: shift.id,
          action,
          module: "POS",
          user: "System",
          time: formatDistanceToNow(new Date(shift.end_time || shift.created_at), { addSuffix: true }),
          timestamp: new Date(shift.end_time || shift.created_at),
        });
      });

      // Fetch recent employees
      const { data: employees } = await supabase
        .from("employees")
        .select("id, first_name, last_name, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      employees?.forEach((emp) => {
        activities.push({
          id: emp.id,
          action: `New employee added: ${emp.first_name} ${emp.last_name}`,
          module: "HR",
          user: "HR Admin",
          time: formatDistanceToNow(new Date(emp.created_at), { addSuffix: true }),
          timestamp: new Date(emp.created_at),
        });
      });

      // Sort by timestamp descending and return top 10
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10);
    },
    staleTime: 30000,
  });
}
