import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type SafetyDevice = Tables<"safety_devices"> & {
  locations?: Tables<"locations"> | null;
  fixed_assets?: Tables<"fixed_assets"> | null;
};

export type SafetyInspection = Tables<"safety_inspections"> & {
  safety_devices?: SafetyDevice | null;
};

export type MedicalCheck = Tables<"medical_checks"> & {
  employees?: Tables<"employees"> | null;
};

export function useSafetyDevices() {
  return useQuery({
    queryKey: ["safety_devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_devices")
        .select(`
          *,
          locations(*),
          fixed_assets:asset_id(*)
        `)
        .order("device_code");

      if (error) throw error;
      return data as SafetyDevice[];
    },
  });
}

export function useSafetyDeviceByAsset(assetId?: string) {
  return useQuery({
    queryKey: ["safety_devices", "asset", assetId],
    queryFn: async () => {
      if (!assetId) return null;
      const { data, error } = await supabase
        .from("safety_devices")
        .select(`
          *,
          locations(*),
          fixed_assets:asset_id(*)
        `)
        .eq("asset_id", assetId)
        .maybeSingle();

      if (error) throw error;
      return data as SafetyDevice | null;
    },
    enabled: !!assetId,
  });
}

export function useUpsertSafetyDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TablesInsert<"safety_devices"> | TablesUpdate<"safety_devices">) => {
      const { data, error } = await supabase
        .from("safety_devices")
        .upsert(payload, { onConflict: "asset_id" })
        .select()
        .single();

      if (error) throw error;
      return data as SafetyDevice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["safety_devices"] });
      queryClient.invalidateQueries({ queryKey: ["safety_devices", "asset", data.asset_id] });
    },
  });
}

export function useDeleteSafetyDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from("safety_devices")
        .delete()
        .eq("asset_id", assetId);

      if (error) throw error;
      return assetId;
    },
    onSuccess: (assetId) => {
      queryClient.invalidateQueries({ queryKey: ["safety_devices"] });
      queryClient.invalidateQueries({ queryKey: ["safety_devices", "asset", assetId] });
    },
  });
}

export function useSafetyInspections() {
  return useQuery({
    queryKey: ["safety_inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_inspections")
        .select(`
          *,
          safety_devices(*, locations(*))
        `)
        .order("inspection_date", { ascending: false });

      if (error) throw error;
      return data as SafetyInspection[];
    },
  });
}

export function useCreateSafetyInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TablesInsert<"safety_inspections">) => {
      const { data, error } = await supabase
        .from("safety_inspections")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as SafetyInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety_inspections"] });
      queryClient.invalidateQueries({ queryKey: ["safety_devices"] });
    },
  });
}

export function useMedicalChecks() {
  return useQuery({
    queryKey: ["medical_checks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_checks")
        .select(`
          *,
          employees:employee_id(*)
        `)
        .order("valid_until", { ascending: true });

      if (error) throw error;
      return data as MedicalCheck[];
    },
  });
}

export function useMedicalCheckStats() {
  const { data, isLoading } = useMedicalChecks();

  const stats = useMemo(() => {
    if (!data) return { total: 0, overdue: 0, expiringSoon: 0, complianceRate: 100 };

    const now = new Date();
    const expiringThreshold = new Date();
    expiringThreshold.setDate(expiringThreshold.getDate() + 30);

    let overdue = 0;
    let expiringSoon = 0;

    data.forEach((check) => {
      if (!check.valid_until) return;
      const validUntil = new Date(check.valid_until);
      if (validUntil < now) overdue += 1;
      else if (validUntil <= expiringThreshold) expiringSoon += 1;
    });

    const compliant = data.length - overdue;
    const complianceRate = data.length ? Math.round((compliant / data.length) * 100) : 100;

    return {
      total: data.length,
      overdue,
      expiringSoon,
      complianceRate,
    };
  }, [data]);

  return { data, stats, isLoading };
}
