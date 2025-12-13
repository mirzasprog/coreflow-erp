import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PayrollPeriodData {
  id: string;
  period_month: string;
  status: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
}

interface EmployeeComparison {
  employee_id: string;
  employee_name: string;
  period1_gross: number;
  period1_net: number;
  period2_gross: number;
  period2_net: number;
  gross_change: number;
  net_change: number;
  gross_change_percent: number;
  net_change_percent: number;
}

export function usePayrollPeriodsList() {
  return useQuery({
    queryKey: ["payroll-periods-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("id, period_month, status, total_gross, total_deductions, total_net")
        .order("period_month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePayrollComparison(period1Id: string | null, period2Id: string | null) {
  // Fetch period 1 data
  const period1Query = useQuery({
    queryKey: ["payroll-comparison-period", period1Id],
    queryFn: async () => {
      if (!period1Id) return null;
      
      const { data: period, error: periodError } = await supabase
        .from("payroll_periods")
        .select("id, period_month, status, total_gross, total_deductions, total_net")
        .eq("id", period1Id)
        .single();
      
      if (periodError) throw periodError;

      // Get payslip count for employee count
      const { count } = await supabase
        .from("payslips")
        .select("*", { count: "exact", head: true })
        .eq("payroll_period_id", period1Id);

      return { ...period, employee_count: count || 0 } as PayrollPeriodData;
    },
    enabled: !!period1Id,
  });

  // Fetch period 2 data
  const period2Query = useQuery({
    queryKey: ["payroll-comparison-period", period2Id],
    queryFn: async () => {
      if (!period2Id) return null;
      
      const { data: period, error: periodError } = await supabase
        .from("payroll_periods")
        .select("id, period_month, status, total_gross, total_deductions, total_net")
        .eq("id", period2Id)
        .single();
      
      if (periodError) throw periodError;

      const { count } = await supabase
        .from("payslips")
        .select("*", { count: "exact", head: true })
        .eq("payroll_period_id", period2Id);

      return { ...period, employee_count: count || 0 } as PayrollPeriodData;
    },
    enabled: !!period2Id,
  });

  // Fetch employee-level comparison
  const employeeComparisonQuery = useQuery({
    queryKey: ["payroll-comparison-employees", period1Id, period2Id],
    queryFn: async () => {
      if (!period1Id || !period2Id) return [];

      // Get payslips from both periods
      const { data: payslips1, error: error1 } = await supabase
        .from("payslips")
        .select(`
          employee_id,
          gross_salary,
          net_salary,
          employee:employees(first_name, last_name)
        `)
        .eq("payroll_period_id", period1Id);

      if (error1) throw error1;

      const { data: payslips2, error: error2 } = await supabase
        .from("payslips")
        .select(`
          employee_id,
          gross_salary,
          net_salary,
          employee:employees(first_name, last_name)
        `)
        .eq("payroll_period_id", period2Id);

      if (error2) throw error2;

      // Create maps for quick lookup
      const period1Map = new Map<string, { gross: number; net: number; name: string }>();
      const period2Map = new Map<string, { gross: number; net: number; name: string }>();

      for (const p of payslips1 || []) {
        const emp = p.employee as { first_name: string; last_name: string } | null;
        period1Map.set(p.employee_id, {
          gross: p.gross_salary || 0,
          net: p.net_salary || 0,
          name: emp ? `${emp.first_name} ${emp.last_name}` : "Nepoznato",
        });
      }

      for (const p of payslips2 || []) {
        const emp = p.employee as { first_name: string; last_name: string } | null;
        period2Map.set(p.employee_id, {
          gross: p.gross_salary || 0,
          net: p.net_salary || 0,
          name: emp ? `${emp.first_name} ${emp.last_name}` : "Nepoznato",
        });
      }

      // Combine all employee IDs
      const allEmployeeIds = new Set([...period1Map.keys(), ...period2Map.keys()]);
      
      const comparisons: EmployeeComparison[] = [];
      
      for (const empId of allEmployeeIds) {
        const p1 = period1Map.get(empId);
        const p2 = period2Map.get(empId);
        
        const period1Gross = p1?.gross || 0;
        const period1Net = p1?.net || 0;
        const period2Gross = p2?.gross || 0;
        const period2Net = p2?.net || 0;
        
        const grossChange = period2Gross - period1Gross;
        const netChange = period2Net - period1Net;
        
        comparisons.push({
          employee_id: empId,
          employee_name: p1?.name || p2?.name || "Nepoznato",
          period1_gross: period1Gross,
          period1_net: period1Net,
          period2_gross: period2Gross,
          period2_net: period2Net,
          gross_change: grossChange,
          net_change: netChange,
          gross_change_percent: period1Gross > 0 ? (grossChange / period1Gross) * 100 : 0,
          net_change_percent: period1Net > 0 ? (netChange / period1Net) * 100 : 0,
        });
      }

      return comparisons.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
    },
    enabled: !!period1Id && !!period2Id,
  });

  return {
    period1: period1Query.data,
    period2: period2Query.data,
    employeeComparison: employeeComparisonQuery.data || [],
    isLoading: period1Query.isLoading || period2Query.isLoading || employeeComparisonQuery.isLoading,
  };
}
