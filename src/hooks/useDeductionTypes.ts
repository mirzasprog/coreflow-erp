import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type DeductionType = Tables<"deduction_types">;

export function useDeductionTypes() {
  return useQuery({
    queryKey: ["deduction_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deduction_types")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as DeductionType[];
    },
  });
}

export function useCreateDeductionType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deduction: TablesInsert<"deduction_types">) => {
      const { data, error } = await supabase
        .from("deduction_types")
        .insert(deduction)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deduction_types"] });
    },
  });
}

export function useUpdateDeductionType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...deduction }: TablesUpdate<"deduction_types"> & { id: string }) => {
      const { data, error } = await supabase
        .from("deduction_types")
        .update(deduction)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deduction_types"] });
    },
  });
}

export function useDeleteDeductionType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("deduction_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deduction_types"] });
    },
  });
}
