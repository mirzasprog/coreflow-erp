import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInBusinessDays, parseISO, startOfYear, endOfYear } from "date-fns";

export interface LeaveBalance {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  entitledDays: number;
  usedDays: number;
  remainingDays: number;
  pendingDays: number;
}

export function useLeaveBalances(year: number = new Date().getFullYear()) {
  return useQuery({
    queryKey: ["leave-balances", year],
    queryFn: async () => {
      const yearStart = startOfYear(new Date(year, 0, 1)).toISOString().split('T')[0];
      const yearEnd = endOfYear(new Date(year, 0, 1)).toISOString().split('T')[0];

      // Fetch employees with their active contracts
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select(`
          id,
          first_name,
          last_name,
          employee_code,
          department:departments(name),
          contracts(id, annual_leave_days, start_date, end_date)
        `)
        .eq("active", true);

      if (empError) throw empError;

      // Fetch all approved annual leave absences for the year
      const { data: absences, error: absError } = await supabase
        .from("absences")
        .select("employee_id, start_date, end_date, approved")
        .eq("type", "annual_leave")
        .gte("start_date", yearStart)
        .lte("end_date", yearEnd);

      if (absError) throw absError;

      // Fetch pending annual leave absences
      const { data: pendingAbsences, error: pendingError } = await supabase
        .from("absences")
        .select("employee_id, start_date, end_date")
        .eq("type", "annual_leave")
        .eq("approved", false)
        .gte("start_date", yearStart)
        .lte("end_date", yearEnd);

      if (pendingError) throw pendingError;

      // Calculate leave balance for each employee
      const balances: LeaveBalance[] = (employees || []).map((emp) => {
        // Get active contract (latest one without end_date or end_date in future)
        const activeContract = emp.contracts?.find(
          (c: any) => !c.end_date || new Date(c.end_date) >= new Date()
        );
        
        const entitledDays = activeContract?.annual_leave_days || 20;

        // Calculate used days from approved absences
        const employeeAbsences = (absences || []).filter(
          (a) => a.employee_id === emp.id && a.approved === true
        );
        
        let usedDays = 0;
        employeeAbsences.forEach((absence) => {
          const start = parseISO(absence.start_date);
          const end = parseISO(absence.end_date);
          usedDays += differenceInBusinessDays(end, start) + 1;
        });

        // Calculate pending days
        const employeePending = (pendingAbsences || []).filter(
          (a) => a.employee_id === emp.id
        );
        
        let pendingDays = 0;
        employeePending.forEach((absence) => {
          const start = parseISO(absence.start_date);
          const end = parseISO(absence.end_date);
          pendingDays += differenceInBusinessDays(end, start) + 1;
        });

        return {
          employeeId: emp.id,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          employeeCode: emp.employee_code,
          department: (emp.department as any)?.name || null,
          entitledDays,
          usedDays,
          remainingDays: entitledDays - usedDays,
          pendingDays,
        };
      });

      return balances;
    },
  });
}

export function useEmployeeLeaveBalance(employeeId: string | undefined, year: number = new Date().getFullYear()) {
  return useQuery({
    queryKey: ["employee-leave-balance", employeeId, year],
    enabled: !!employeeId,
    queryFn: async () => {
      if (!employeeId) return null;

      const yearStart = startOfYear(new Date(year, 0, 1)).toISOString().split('T')[0];
      const yearEnd = endOfYear(new Date(year, 0, 1)).toISOString().split('T')[0];

      // Get employee's active contract
      const { data: contracts, error: contractError } = await supabase
        .from("contracts")
        .select("annual_leave_days, start_date, end_date")
        .eq("employee_id", employeeId)
        .order("start_date", { ascending: false });

      if (contractError) throw contractError;

      const activeContract = contracts?.find(
        (c) => !c.end_date || new Date(c.end_date) >= new Date()
      );
      
      const entitledDays = activeContract?.annual_leave_days || 20;

      // Get approved annual leave absences
      const { data: absences, error: absError } = await supabase
        .from("absences")
        .select("start_date, end_date")
        .eq("employee_id", employeeId)
        .eq("type", "annual_leave")
        .eq("approved", true)
        .gte("start_date", yearStart)
        .lte("end_date", yearEnd);

      if (absError) throw absError;

      let usedDays = 0;
      (absences || []).forEach((absence) => {
        const start = parseISO(absence.start_date);
        const end = parseISO(absence.end_date);
        usedDays += differenceInBusinessDays(end, start) + 1;
      });

      // Get pending absences
      const { data: pending, error: pendingError } = await supabase
        .from("absences")
        .select("start_date, end_date")
        .eq("employee_id", employeeId)
        .eq("type", "annual_leave")
        .eq("approved", false)
        .gte("start_date", yearStart)
        .lte("end_date", yearEnd);

      if (pendingError) throw pendingError;

      let pendingDays = 0;
      (pending || []).forEach((absence) => {
        const start = parseISO(absence.start_date);
        const end = parseISO(absence.end_date);
        pendingDays += differenceInBusinessDays(end, start) + 1;
      });

      return {
        entitledDays,
        usedDays,
        remainingDays: entitledDays - usedDays,
        pendingDays,
      };
    },
  });
}
