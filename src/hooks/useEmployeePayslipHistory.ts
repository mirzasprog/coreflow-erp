import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PayslipHistoryItem {
  id: string;
  period_month: string | null;
  period_status: string | null;
  gross_salary: number;
  net_salary: number;
  total_deductions: number;
  worked_days: number;
  working_days: number;
}

interface EmployeeInfo {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
}

interface Totals {
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
}

export function useEmployeePayslipHistory(employeeId: string | undefined) {
  const employeeQuery = useQuery({
    queryKey: ["employee-payslip-history-employee", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      
      const { data, error } = await supabase
        .from("employees")
        .select("id, employee_code, first_name, last_name")
        .eq("id", employeeId)
        .maybeSingle();
      
      if (error) throw error;
      return data as EmployeeInfo | null;
    },
    enabled: !!employeeId,
  });

  const payslipsQuery = useQuery({
    queryKey: ["employee-payslip-history", employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      
      const { data, error } = await supabase
        .from("payslips")
        .select(`
          id,
          gross_salary,
          net_salary,
          total_deductions,
          worked_days,
          working_days,
          payroll_period:payroll_periods(period_month, status)
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((p) => {
        const period = p.payroll_period as { period_month: string; status: string } | null;
        return {
          id: p.id,
          period_month: period?.period_month || null,
          period_status: period?.status || null,
          gross_salary: p.gross_salary || 0,
          net_salary: p.net_salary || 0,
          total_deductions: p.total_deductions || 0,
          worked_days: p.worked_days || 0,
          working_days: p.working_days || 0,
        };
      }) as PayslipHistoryItem[];
    },
    enabled: !!employeeId,
  });

  const payslips = payslipsQuery.data || [];
  
  const totals: Totals = payslips.reduce(
    (acc, p) => ({
      totalGross: acc.totalGross + p.gross_salary,
      totalNet: acc.totalNet + p.net_salary,
      totalDeductions: acc.totalDeductions + p.total_deductions,
    }),
    { totalGross: 0, totalNet: 0, totalDeductions: 0 }
  );

  return {
    employee: employeeQuery.data,
    payslips,
    totals,
    isLoading: employeeQuery.isLoading || payslipsQuery.isLoading,
  };
}
