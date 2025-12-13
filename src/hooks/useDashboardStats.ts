import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from 'date-fns';

export interface DashboardStats {
  totalStockValue: number;
  openInvoicesValue: number;
  openInvoicesCount: number;
  todaySales: number;
  activeEmployees: number;
  employeesOnLeave: number;
  hseAlerts: number;
  hseUrgent: number;
  monthlyRevenue: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const today = new Date();
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);

      // Fetch all data in parallel
      const [
        stockResult,
        invoicesResult,
        todaySalesResult,
        employeesResult,
        absencesResult,
        safetyDevicesResult,
        revenueResult,
      ] = await Promise.all([
        // Total stock value
        supabase
          .from('stock')
          .select('quantity, items(purchase_price)')
          .gt('quantity', 0),
        
        // Open invoices (draft status, outgoing)
        supabase
          .from('invoices')
          .select('total, status')
          .eq('invoice_type', 'outgoing')
          .eq('status', 'draft'),
        
        // Today's POS sales
        supabase
          .from('pos_receipts')
          .select('total')
          .gte('receipt_date', dayStart.toISOString())
          .lte('receipt_date', dayEnd.toISOString())
          .eq('is_return', false),
        
        // Active employees
        supabase
          .from('employees')
          .select('id')
          .eq('active', true),
        
        // Employees on leave today
        supabase
          .from('absences')
          .select('id')
          .lte('start_date', format(today, 'yyyy-MM-dd'))
          .gte('end_date', format(today, 'yyyy-MM-dd'))
          .eq('approved', true),
        
        // Safety devices needing inspection (overdue or due soon)
        supabase
          .from('safety_devices')
          .select('id, next_inspection_date, status')
          .eq('status', 'active'),
        
        // Monthly revenue from posted outgoing invoices
        supabase
          .from('invoices')
          .select('total')
          .eq('invoice_type', 'outgoing')
          .eq('status', 'posted')
          .gte('invoice_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('invoice_date', format(monthEnd, 'yyyy-MM-dd')),
      ]);

      // Calculate total stock value
      let totalStockValue = 0;
      if (stockResult.data) {
        for (const stock of stockResult.data) {
          const qty = stock.quantity || 0;
          const price = (stock.items as any)?.purchase_price || 0;
          totalStockValue += qty * price;
        }
      }

      // Calculate open invoices
      const openInvoicesValue = invoicesResult.data?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const openInvoicesCount = invoicesResult.data?.length || 0;

      // Calculate today's sales
      const todaySales = todaySalesResult.data?.reduce((sum, r) => sum + (r.total || 0), 0) || 0;

      // Count active employees
      const activeEmployees = employeesResult.data?.length || 0;

      // Count employees on leave
      const employeesOnLeave = absencesResult.data?.length || 0;

      // Calculate HSE alerts (devices with overdue or upcoming inspections)
      let hseAlerts = 0;
      let hseUrgent = 0;
      const todayStr = format(today, 'yyyy-MM-dd');
      if (safetyDevicesResult.data) {
        for (const device of safetyDevicesResult.data) {
          if (device.next_inspection_date) {
            if (device.next_inspection_date < todayStr) {
              // Overdue
              hseAlerts++;
              hseUrgent++;
            } else {
              // Check if due within 30 days
              const dueDate = new Date(device.next_inspection_date);
              const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays <= 30) {
                hseAlerts++;
              }
            }
          }
        }
      }

      // Calculate monthly revenue
      const monthlyRevenue = revenueResult.data?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      return {
        totalStockValue,
        openInvoicesValue,
        openInvoicesCount,
        todaySales,
        activeEmployees,
        employeesOnLeave,
        hseAlerts,
        hseUrgent,
        monthlyRevenue,
      };
    },
    staleTime: 30000, // 30 seconds
  });
}
