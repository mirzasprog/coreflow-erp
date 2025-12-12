import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DeductionType {
  id: string;
  code: string;
  name: string;
  percentage: number | null;
  fixed_amount: number | null;
  is_mandatory: boolean;
  active: boolean;
}

export interface PayrollPeriod {
  id: string;
  period_month: string;
  status: "draft" | "processed" | "paid";
  total_gross: number;
  total_deductions: number;
  total_net: number;
  created_at: string;
  processed_at: string | null;
  paid_at: string | null;
}

export interface Payslip {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  contract_id: string | null;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  working_days: number;
  worked_days: number;
  notes: string | null;
  created_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
  };
  contract?: {
    id: string;
    salary: number;
  };
}

export interface PayslipDeduction {
  id: string;
  payslip_id: string;
  deduction_type_id: string;
  amount: number;
  description: string | null;
  deduction_type?: DeductionType;
}

// Deduction Types
export function useDeductionTypes() {
  return useQuery({
    queryKey: ["deduction-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deduction_types")
        .select("*")
        .eq("active", true)
        .order("code");
      if (error) throw error;
      return data as DeductionType[];
    },
  });
}

// Payroll Periods
export function usePayrollPeriods() {
  return useQuery({
    queryKey: ["payroll-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .order("period_month", { ascending: false });
      if (error) throw error;
      return data as PayrollPeriod[];
    },
  });
}

export function usePayrollPeriod(id: string | undefined) {
  return useQuery({
    queryKey: ["payroll-period", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as PayrollPeriod | null;
    },
    enabled: !!id,
  });
}

export function useCreatePayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (periodMonth: string) => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .insert({ period_month: periodMonth })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
      toast.success("Payroll period created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePayrollPeriodStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "processed" | "paid" }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "processed") updates.processed_at = new Date().toISOString();
      if (status === "paid") updates.paid_at = new Date().toISOString();
      
      const { error } = await supabase
        .from("payroll_periods")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-period"] });
      toast.success("Status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Payslips
export function usePayslips(periodId: string | undefined) {
  return useQuery({
    queryKey: ["payslips", periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const { data, error } = await supabase
        .from("payslips")
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_code),
          contract:contracts(id, salary)
        `)
        .eq("payroll_period_id", periodId)
        .order("created_at");
      if (error) throw error;
      return data as Payslip[];
    },
    enabled: !!periodId,
  });
}

export function usePayslip(id: string | undefined) {
  return useQuery({
    queryKey: ["payslip", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("payslips")
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_code),
          contract:contracts(id, salary)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Payslip | null;
    },
    enabled: !!id,
  });
}

export function usePayslipDeductions(payslipId: string | undefined) {
  return useQuery({
    queryKey: ["payslip-deductions", payslipId],
    queryFn: async () => {
      if (!payslipId) return [];
      const { data, error } = await supabase
        .from("payslip_deductions")
        .select(`
          *,
          deduction_type:deduction_types(*)
        `)
        .eq("payslip_id", payslipId);
      if (error) throw error;
      return data as PayslipDeduction[];
    },
    enabled: !!payslipId,
  });
}

export function useGeneratePayslips() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      // Get all active employees with contracts
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select(`
          id,
          contracts(id, salary, start_date, end_date)
        `)
        .eq("active", true);
      if (empError) throw empError;

      // Get mandatory deduction types
      const { data: deductionTypes, error: dedError } = await supabase
        .from("deduction_types")
        .select("*")
        .eq("active", true)
        .eq("is_mandatory", true);
      if (dedError) throw dedError;

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      for (const emp of employees || []) {
        const contracts = emp.contracts as Array<{ id: string; salary: number; start_date: string; end_date: string | null }>;
        const activeContract = contracts?.find(c => !c.end_date || new Date(c.end_date) > new Date());
        if (!activeContract || !activeContract.salary) continue;

        const grossSalary = activeContract.salary;
        let deductionsTotal = 0;

        // Calculate deductions
        const deductions: Array<{ deduction_type_id: string; amount: number }> = [];
        for (const dt of deductionTypes || []) {
          const amount = dt.percentage 
            ? (grossSalary * dt.percentage) / 100 
            : (dt.fixed_amount || 0);
          deductions.push({ deduction_type_id: dt.id, amount });
          deductionsTotal += amount;
        }

        const netSalary = grossSalary - deductionsTotal;

        // Create payslip
        const { data: payslip, error: payslipError } = await supabase
          .from("payslips")
          .insert({
            payroll_period_id: periodId,
            employee_id: emp.id,
            contract_id: activeContract.id,
            gross_salary: grossSalary,
            total_deductions: deductionsTotal,
            net_salary: netSalary,
          })
          .select()
          .single();
        if (payslipError) throw payslipError;

        // Create deduction entries
        if (deductions.length > 0) {
          const { error: dedInsertError } = await supabase
            .from("payslip_deductions")
            .insert(deductions.map(d => ({ ...d, payslip_id: payslip.id })));
          if (dedInsertError) throw dedInsertError;
        }

        totalGross += grossSalary;
        totalDeductions += deductionsTotal;
        totalNet += netSalary;
      }

      // Update period totals
      const { error: updateError } = await supabase
        .from("payroll_periods")
        .update({
          total_gross: totalGross,
          total_deductions: totalDeductions,
          total_net: totalNet,
        })
        .eq("id", periodId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-period"] });
      toast.success("Payslips generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
