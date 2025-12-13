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

// Absence types that don't reduce salary (paid leave)
const PAID_ABSENCE_TYPES = [
  "annual_leave", 
  "sick_leave", 
  "maternity_leave", 
  "paternity_leave", 
  "parental_leave", 
  "bereavement_leave", 
  "study_leave", 
  "military_leave", 
  "religious_holiday", 
  "jury_duty", 
  "blood_donation", 
  "marriage_leave"
];

// Calculate working days in a month (excluding weekends)
function getWorkingDaysInMonth(year: number, month: number): number {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  let workingDays = 0;
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  return workingDays;
}

// Calculate absence days within a specific month
function getAbsenceDaysInMonth(startDate: string, endDate: string, year: number, month: number): number {
  const absenceStart = new Date(startDate);
  const absenceEnd = new Date(endDate);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  // Find overlap between absence period and the month
  const overlapStart = new Date(Math.max(absenceStart.getTime(), monthStart.getTime()));
  const overlapEnd = new Date(Math.min(absenceEnd.getTime(), monthEnd.getTime()));
  
  if (overlapStart > overlapEnd) return 0;
  
  let absenceDays = 0;
  for (let d = new Date(overlapStart); d <= overlapEnd; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      absenceDays++;
    }
  }
  return absenceDays;
}

export interface AbsenceDeduction {
  type: string;
  days: number;
  amount: number;
}

export function useGeneratePayslips() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      // Get payroll period to know the month
      const { data: periodData, error: periodError } = await supabase
        .from("payroll_periods")
        .select("period_month")
        .eq("id", periodId)
        .single();
      if (periodError) throw periodError;
      
      const periodDate = new Date(periodData.period_month);
      const year = periodDate.getFullYear();
      const month = periodDate.getMonth();
      const workingDaysInMonth = getWorkingDaysInMonth(year, month);

      // Check for existing payslips to avoid duplicates
      const { data: existingPayslips, error: existingError } = await supabase
        .from("payslips")
        .select("employee_id")
        .eq("payroll_period_id", periodId);
      if (existingError) throw existingError;

      const existingEmployeeIds = new Set(existingPayslips?.map(p => p.employee_id) || []);

      // Get all active employees with contracts
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select(`
          id,
          first_name,
          last_name,
          contracts(id, salary, start_date, end_date)
        `)
        .eq("active", true);
      if (empError) throw empError;

      // Filter out employees who already have payslips
      const eligibleEmployees = (employees || []).filter(emp => !existingEmployeeIds.has(emp.id));

      if (eligibleEmployees.length === 0) {
        throw new Error("Nema novih zaposlenika za generisanje platnih lista");
      }

      // Get all approved absences for the period month
      const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;
      
      const { data: allAbsences, error: absError } = await supabase
        .from("absences")
        .select("*")
        .eq("approved", true)
        .lte("start_date", monthEndStr)
        .gte("end_date", monthStartStr);
      if (absError) throw absError;

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
      let generatedCount = 0;
      let skippedCount = 0;

      for (const emp of eligibleEmployees) {
        const contracts = emp.contracts as Array<{ id: string; salary: number; start_date: string; end_date: string | null }>;
        const activeContract = contracts?.find(c => !c.end_date || new Date(c.end_date) > new Date());
        
        if (!activeContract || !activeContract.salary) {
          skippedCount++;
          continue;
        }

        // Get employee's absences for this month
        const employeeAbsences = (allAbsences || []).filter(a => a.employee_id === emp.id);
        
        // Calculate paid and unpaid absence days
        let paidAbsenceDays = 0;
        let unpaidAbsenceDays = 0;
        const absenceDetails: AbsenceDeduction[] = [];
        
        for (const absence of employeeAbsences) {
          const absenceDays = getAbsenceDaysInMonth(absence.start_date, absence.end_date, year, month);
          if (absenceDays > 0) {
            const isPaid = PAID_ABSENCE_TYPES.includes(absence.type);
            if (isPaid) {
              paidAbsenceDays += absenceDays;
            } else {
              unpaidAbsenceDays += absenceDays;
            }
            absenceDetails.push({
              type: absence.type,
              days: absenceDays,
              amount: 0 // Will be calculated below
            });
          }
        }

        // Calculate worked days (excluding unpaid absences only - paid absences are still paid)
        const workedDays = workingDaysInMonth - unpaidAbsenceDays;
        const dailyRate = activeContract.salary / workingDaysInMonth;
        
        // Gross salary is reduced by unpaid absence days
        const grossSalary = dailyRate * workedDays;
        let deductionsTotal = 0;

        // Calculate mandatory deductions based on actual gross
        const deductions: Array<{ deduction_type_id: string; amount: number; description?: string }> = [];
        for (const dt of deductionTypes || []) {
          const amount = dt.percentage 
            ? (grossSalary * dt.percentage) / 100 
            : (dt.fixed_amount || 0);
          deductions.push({ deduction_type_id: dt.id, amount });
          deductionsTotal += amount;
        }

        // Add unpaid absence deductions as separate line items (for display purposes)
        // Note: These are already reflected in reduced gross, but we show them for clarity
        const unpaidDeductionAmount = dailyRate * unpaidAbsenceDays;

        const netSalary = grossSalary - deductionsTotal;

        // Build notes with absence summary
        let notes = "";
        if (absenceDetails.length > 0) {
          const absenceTypeLabels: Record<string, string> = {
            annual_leave: "Godišnji odmor",
            sick_leave: "Bolovanje",
            unpaid_leave: "Neplaćeno odsustvo",
            maternity_leave: "Porodiljsko",
            paternity_leave: "Očinsko",
            parental_leave: "Roditeljsko",
            bereavement_leave: "Žalost",
            study_leave: "Obrazovanje",
            military_leave: "Vojna obaveza",
            religious_holiday: "Vjerski praznik",
            jury_duty: "Sudska dužnost",
            blood_donation: "Davanje krvi",
            marriage_leave: "Vjenčanje",
            other: "Ostalo"
          };
          
          const absenceSummary = absenceDetails.map(a => 
            `${absenceTypeLabels[a.type] || a.type}: ${a.days} dana`
          ).join(", ");
          notes = `Odsustva: ${absenceSummary}`;
          if (unpaidAbsenceDays > 0) {
            notes += ` | Odbitak za neplaćeno: ${unpaidAbsenceDays} dana`;
          }
        }

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
            working_days: workingDaysInMonth,
            worked_days: workedDays,
            notes: notes || null,
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
        generatedCount++;
      }

      // Get current period totals and add new amounts
      const { data: currentPeriod } = await supabase
        .from("payroll_periods")
        .select("total_gross, total_deductions, total_net")
        .eq("id", periodId)
        .single();

      const newTotalGross = (currentPeriod?.total_gross || 0) + totalGross;
      const newTotalDeductions = (currentPeriod?.total_deductions || 0) + totalDeductions;
      const newTotalNet = (currentPeriod?.total_net || 0) + totalNet;

      // Update period totals
      const { error: updateError } = await supabase
        .from("payroll_periods")
        .update({
          total_gross: newTotalGross,
          total_deductions: newTotalDeductions,
          total_net: newTotalNet,
        })
        .eq("id", periodId);
      if (updateError) throw updateError;

      return { generatedCount, skippedCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-period"] });
      
      let message = `Generisano ${result.generatedCount} platnih lista`;
      if (result.skippedCount > 0) {
        message += ` (${result.skippedCount} preskočeno - bez ugovora)`;
      }
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
