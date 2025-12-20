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

export type HSERelatedDocuments = {
  device: SafetyDevice | null;
  inspections: SafetyInspection[];
};

export type MedicalCheck = Tables<"medical_checks"> & {
  employees?: Tables<"employees"> | null;
};

type MedicalCheckUpdatePayload = TablesUpdate<"medical_checks"> & { id: string };
type SafetyInspectionUpdatePayload = TablesUpdate<"safety_inspections"> & { id: string };

export function useSafetyDevices() {
  return useQuery({
    queryKey: ["safety_devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_devices")
        .select(`
          *,
          locations(*),
          fixed_assets(*)
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
          fixed_assets(*)
        `)
        .eq("asset_id", assetId)
        .maybeSingle();

      if (error) throw error;
      return data as SafetyDevice | null;
    },
    enabled: !!assetId,
  });
}

export function useHSERelatedDocuments(assetId?: string) {
  return useQuery({
    queryKey: ["hse-related-documents", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      if (!assetId) return { device: null, inspections: [] };
      const { data: device, error: deviceError } = await supabase
        .from("safety_devices")
        .select(`
          *,
          locations(*),
          fixed_assets(*)
        `)
        .eq("asset_id", assetId)
        .maybeSingle();

      if (deviceError) throw deviceError;
      if (!device) return { device: null, inspections: [] };

      const { data: inspections, error: inspectionsError } = await supabase
        .from("safety_inspections")
        .select("*")
        .eq("device_id", device.id)
        .order("inspection_date", { ascending: false });

      if (inspectionsError) throw inspectionsError;

      return {
        device: device as SafetyDevice,
        inspections: (inspections || []) as SafetyInspection[],
      };
    },
  });
}

export function useUpsertSafetyDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TablesInsert<"safety_devices">) => {
      const { data, error } = await supabase
        .from("safety_devices")
        .upsert([payload], { onConflict: "asset_id" })
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

export function useCreateSafetyDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TablesInsert<"safety_devices">) => {
      const { data, error } = await supabase
        .from("safety_devices")
        .insert(payload)
        .select(`
          *,
          locations(*),
          fixed_assets(*)
        `)
        .single();

      if (error) throw error;
      return data as SafetyDevice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety_devices"] });
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
      // Insert the inspection
      const { data, error } = await supabase
        .from("safety_inspections")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Update the device's last and next inspection dates
      if (data && payload.device_id) {
        const device = await supabase
          .from("safety_devices")
          .select("inspection_interval_months")
          .eq("id", payload.device_id)
          .single();

        const intervalMonths = device.data?.inspection_interval_months || 12;
        const lastDate = new Date(payload.inspection_date);
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + intervalMonths);

        await supabase
          .from("safety_devices")
          .update({
            last_inspection_date: payload.inspection_date,
            next_inspection_date: nextDate.toISOString().split("T")[0],
          })
          .eq("id", payload.device_id);
      }

      return data as SafetyInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety_inspections"] });
      queryClient.invalidateQueries({ queryKey: ["safety_devices"] });
    },
  });
}

export function useUpdateSafetyInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: SafetyInspectionUpdatePayload) => {
      const { data, error } = await supabase
        .from("safety_inspections")
        .update(payload)
        .eq("id", id)
        .select(`
          *,
          safety_devices(*, locations(*))
        `)
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

export function useCreateMedicalCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TablesInsert<"medical_checks">) => {
      const { data, error } = await supabase
        .from("medical_checks")
        .insert(payload)
        .select(`
          *,
          employees:employee_id(*)
        `)
        .single();

      if (error) throw error;
      return data as MedicalCheck;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical_checks"] });
    },
  });
}

export function useUpdateMedicalCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: MedicalCheckUpdatePayload) => {
      const { data, error } = await supabase
        .from("medical_checks")
        .update(payload)
        .eq("id", id)
        .select(`
          *,
          employees:employee_id(*)
        `)
        .single();

      if (error) throw error;
      return data as MedicalCheck;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical_checks"] });
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
