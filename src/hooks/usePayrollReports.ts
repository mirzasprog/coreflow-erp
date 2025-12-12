import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfYear, endOfYear } from "date-fns";

interface PeriodSummary {
  id: string;
  period_month: string;
  status: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
}

interface DepartmentBreakdown {
  department_name: string | null;
  employee_count: number;
  total_gross: number;
  total_net: number;
}

interface DeductionBreakdown {
  deduction_name: string;
  deduction_code: string;
  total_amount: number;
}

interface YearlyTotals {
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  averageNet: number;
  employeeCount: number;
}

export function usePayrollReportData(year: number) {
  const startDate = startOfYear(new Date(year, 0, 1)).toISOString().split('T')[0];
  const endDate = endOfYear(new Date(year, 0, 1)).toISOString().split('T')[0];

  // Period summaries for the year
  const periodSummariesQuery = useQuery({
    queryKey: ["payroll-report-periods", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("id, period_month, status, total_gross, total_deductions, total_net")
        .gte("period_month", startDate)
        .lte("period_month", endDate)
        .order("period_month");
      if (error) throw error;
      return (data || []) as PeriodSummary[];
    },
  });

  // Department breakdown - we need to join payslips with employees and departments
  const departmentBreakdownQuery = useQuery({
    queryKey: ["payroll-report-departments", year],
    queryFn: async () => {
      // Get all payslips for the year with employee and department info
      const { data: payslips, error } = await supabase
        .from("payslips")
        .select(`
          id,
          gross_salary,
          net_salary,
          employee:employees(
            id,
            department:departments(id, name)
          ),
          payroll_period:payroll_periods!inner(period_month)
        `)
        .gte("payroll_period.period_month", startDate)
        .lte("payroll_period.period_month", endDate);
      
      if (error) throw error;

      // Aggregate by department
      const deptMap = new Map<string, { name: string | null; employees: Set<string>; gross: number; net: number }>();
      
      for (const slip of payslips || []) {
        const emp = slip.employee as { id: string; department: { id: string; name: string } | null } | null;
        const deptName = emp?.department?.name || null;
        const deptKey = deptName || "__none__";
        
        if (!deptMap.has(deptKey)) {
          deptMap.set(deptKey, { name: deptName, employees: new Set(), gross: 0, net: 0 });
        }
        
        const dept = deptMap.get(deptKey)!;
        if (emp?.id) dept.employees.add(emp.id);
        dept.gross += slip.gross_salary || 0;
        dept.net += slip.net_salary || 0;
      }

      const result: DepartmentBreakdown[] = Array.from(deptMap.values()).map(d => ({
        department_name: d.name,
        employee_count: d.employees.size,
        total_gross: d.gross,
        total_net: d.net,
      }));

      return result.sort((a, b) => b.total_net - a.total_net);
    },
  });

  // Deduction breakdown - aggregate all deductions by type
  const deductionBreakdownQuery = useQuery({
    queryKey: ["payroll-report-deductions", year],
    queryFn: async () => {
      // Get all payslip deductions for the year
      const { data: deductions, error } = await supabase
        .from("payslip_deductions")
        .select(`
          amount,
          deduction_type:deduction_types(id, code, name),
          payslip:payslips!inner(
            payroll_period:payroll_periods!inner(period_month)
          )
        `)
        .gte("payslip.payroll_period.period_month", startDate)
        .lte("payslip.payroll_period.period_month", endDate);
      
      if (error) throw error;

      // Aggregate by deduction type
      const dedMap = new Map<string, { name: string; code: string; total: number }>();
      
      for (const ded of deductions || []) {
        const dedType = ded.deduction_type as { id: string; code: string; name: string } | null;
        if (!dedType) continue;
        
        if (!dedMap.has(dedType.id)) {
          dedMap.set(dedType.id, { name: dedType.name, code: dedType.code, total: 0 });
        }
        
        dedMap.get(dedType.id)!.total += ded.amount || 0;
      }

      const result: DeductionBreakdown[] = Array.from(dedMap.values()).map(d => ({
        deduction_name: d.name,
        deduction_code: d.code,
        total_amount: d.total,
      }));

      return result.sort((a, b) => b.total_amount - a.total_amount);
    },
  });

  // Calculate yearly totals from period summaries
  const yearlyTotals: YearlyTotals = {
    totalGross: 0,
    totalNet: 0,
    totalDeductions: 0,
    averageNet: 0,
    employeeCount: 0,
  };

  if (periodSummariesQuery.data) {
    for (const p of periodSummariesQuery.data) {
      yearlyTotals.totalGross += p.total_gross || 0;
      yearlyTotals.totalNet += p.total_net || 0;
      yearlyTotals.totalDeductions += p.total_deductions || 0;
    }
  }

  if (departmentBreakdownQuery.data) {
    yearlyTotals.employeeCount = departmentBreakdownQuery.data.reduce((sum, d) => sum + d.employee_count, 0);
    if (yearlyTotals.employeeCount > 0) {
      yearlyTotals.averageNet = yearlyTotals.totalNet / yearlyTotals.employeeCount / (periodSummariesQuery.data?.length || 1);
    }
  }

  return {
    periodSummaries: periodSummariesQuery.data || [],
    departmentBreakdown: departmentBreakdownQuery.data || [],
    deductionBreakdown: deductionBreakdownQuery.data || [],
    yearlyTotals,
    isLoading: periodSummariesQuery.isLoading || departmentBreakdownQuery.isLoading || deductionBreakdownQuery.isLoading,
  };
}
