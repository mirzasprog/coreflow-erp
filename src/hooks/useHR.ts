import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Employee = Tables<"employees"> & {
  departments?: Tables<"departments"> | null;
  locations?: Tables<"locations"> | null;
};

export type Contract = Tables<"contracts"> & {
  employees?: Tables<"employees"> | null;
};

export type Absence = Tables<"absences"> & {
  employees?: Tables<"employees"> | null;
};

export type Department = Tables<"departments">;

// Employees
export function useHREmployees() {
  return useQuery({
    queryKey: ["hr_employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(`*, departments(*), locations(*)`)
        .order("last_name");

      if (error) throw error;
      return data as Employee[];
    },
  });
}

export function useHREmployee(id: string | undefined) {
  return useQuery({
    queryKey: ["hr_employees", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select(`*, departments(*), locations(*)`)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Employee | null;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee: TablesInsert<"employees">) => {
      const { data, error } = await supabase
        .from("employees")
        .insert(employee)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr_employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...employee }: TablesUpdate<"employees"> & { id: string }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(employee)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hr_employees"] });
      queryClient.invalidateQueries({ queryKey: ["hr_employees", variables.id] });
    },
  });
}

// Departments
export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dept: TablesInsert<"departments">) => {
      const { data, error } = await supabase
        .from("departments")
        .insert(dept)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dept }: TablesUpdate<"departments"> & { id: string }) => {
      const { data, error } = await supabase
        .from("departments")
        .update(dept)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

// Contracts
export function useContracts(employeeId?: string) {
  return useQuery({
    queryKey: ["contracts", employeeId],
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select(`*, employees(*)`)
        .order("start_date", { ascending: false });

      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contract[];
    },
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contract: TablesInsert<"contracts">) => {
      const { data, error } = await supabase
        .from("contracts")
        .insert(contract)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...contract }: TablesUpdate<"contracts"> & { id: string }) => {
      const { data, error } = await supabase
        .from("contracts")
        .update(contract)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

// Absences
export function useAbsences(employeeId?: string) {
  return useQuery({
    queryKey: ["absences", employeeId],
    queryFn: async () => {
      let query = supabase
        .from("absences")
        .select(`*, employees(*)`)
        .order("start_date", { ascending: false });

      if (employeeId) {
        query = query.eq("employee_id", employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Absence[];
    },
  });
}

export function useCreateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (absence: TablesInsert<"absences">) => {
      const { data, error } = await supabase
        .from("absences")
        .insert(absence)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
    },
  });
}

export function useUpdateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...absence }: TablesUpdate<"absences"> & { id: string }) => {
      const { data, error } = await supabase
        .from("absences")
        .update(absence)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["absences"] });
    },
  });
}

// Stats
export function useHRStats() {
  return useQuery({
    queryKey: ["hr_stats"],
    queryFn: async () => {
      const [employeesRes, contractsRes, absencesRes, departmentsRes] = await Promise.all([
        supabase.from("employees").select("id, active"),
        supabase.from("contracts").select("id, end_date"),
        supabase.from("absences").select("id, start_date, end_date, approved"),
        supabase.from("departments").select("id").eq("active", true),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (contractsRes.error) throw contractsRes.error;
      if (absencesRes.error) throw absencesRes.error;
      if (departmentsRes.error) throw departmentsRes.error;

      const today = new Date().toISOString().split("T")[0];
      const activeEmployees = employeesRes.data.filter((e) => e.active);
      const currentAbsences = absencesRes.data.filter(
        (a) => a.start_date <= today && a.end_date >= today
      );
      const pendingAbsences = absencesRes.data.filter((a) => !a.approved);
      
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringContracts = contractsRes.data.filter(
        (c) => c.end_date && new Date(c.end_date) <= thirtyDaysFromNow && new Date(c.end_date) >= new Date()
      );

      return {
        totalEmployees: employeesRes.data.length,
        activeEmployees: activeEmployees.length,
        onLeave: currentAbsences.length,
        pendingAbsences: pendingAbsences.length,
        totalContracts: contractsRes.data.length,
        expiringContracts: expiringContracts.length,
        totalDepartments: departmentsRes.data.length,
      };
    },
  });
}
