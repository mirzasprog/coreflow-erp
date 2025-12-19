import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type FixedAsset = Tables<"fixed_assets"> & {
  locations?: Tables<"locations"> | null;
  employees?: Tables<"employees"> | null;
};

export function useFixedAssets() {
  return useQuery({
    queryKey: ["fixed_assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .select(`
          *,
          locations(*),
          employees:custodian_id(*)
        `)
        .order("asset_code");

      if (error) throw error;
      return data as FixedAsset[];
    },
  });
}

export function useFixedAsset(id: string | undefined) {
  return useQuery({
    queryKey: ["fixed_assets", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("fixed_assets")
        .select(`
          *,
          locations(*),
          employees:custodian_id(*)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as FixedAsset | null;
    },
    enabled: !!id,
  });
}

export function useDepreciationRecords(assetId: string | undefined) {
  return useQuery({
    queryKey: ["depreciation_records", assetId],
    queryFn: async () => {
      if (!assetId) return [];
      const { data, error } = await supabase
        .from("depreciation_records")
        .select("*")
        .eq("asset_id", assetId)
        .order("period_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assetId,
  });
}

export function useCreateFixedAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: TablesInsert<"fixed_assets">) => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .insert(asset)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed_assets"] });
    },
  });
}

export function useUpdateFixedAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...asset }: TablesUpdate<"fixed_assets"> & { id: string }) => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .update(asset)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fixed_assets"] });
      queryClient.invalidateQueries({ queryKey: ["fixed_assets", variables.id] });
    },
  });
}

export function useCreateDepreciationRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: TablesInsert<"depreciation_records">) => {
      const { data, error } = await supabase
        .from("depreciation_records")
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["depreciation_records", variables.asset_id] });
      queryClient.invalidateQueries({ queryKey: ["fixed_assets"] });
    },
  });
}

export function useAssetStats() {
  return useQuery({
    queryKey: ["fixed_assets_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .select("status, purchase_value, current_value");

      if (error) throw error;

      const active = data.filter((a) => a.status === "active");
      const writtenOff = data.filter((a) => a.status === "written_off");

      return {
        totalAssets: data.length,
        activeAssets: active.length,
        writtenOffAssets: writtenOff.length,
        totalPurchaseValue: data.reduce((sum, a) => sum + Number(a.purchase_value || 0), 0),
        totalCurrentValue: data.reduce((sum, a) => sum + Number(a.current_value || 0), 0),
        totalDepreciation: data.reduce(
          (sum, a) => sum + (Number(a.purchase_value || 0) - Number(a.current_value || 0)),
          0
        ),
      };
    },
  });
}

export function useNextAssetCode() {
  return useQuery({
    queryKey: ["next_asset_code"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("fixed_assets")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      
      const nextNumber = (count || 0) + 1;
      return `FA-${nextNumber.toString().padStart(5, "0")}`;
    },
  });
}

export type AssetTransfer = {
  id: string;
  asset_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  from_custodian_id: string | null;
  to_custodian_id: string | null;
  transfer_date: string;
  reason: string | null;
  notes: string | null;
  created_at: string | null;
  from_location?: Tables<"locations"> | null;
  to_location?: Tables<"locations"> | null;
  from_custodian?: Tables<"employees"> | null;
  to_custodian?: Tables<"employees"> | null;
};

export function useAssetTransfers(assetId: string | undefined) {
  return useQuery({
    queryKey: ["asset_transfers", assetId],
    queryFn: async () => {
      if (!assetId) return [];
      const { data, error } = await supabase
        .from("asset_transfers")
        .select(`
          *,
          from_location:locations!asset_transfers_from_location_id_fkey(id, name),
          to_location:locations!asset_transfers_to_location_id_fkey(id, name),
          from_custodian:employees!asset_transfers_from_custodian_id_fkey(id, first_name, last_name),
          to_custodian:employees!asset_transfers_to_custodian_id_fkey(id, first_name, last_name)
        `)
        .eq("asset_id", assetId)
        .order("transfer_date", { ascending: false });

      if (error) throw error;
      return data as unknown as AssetTransfer[];
    },
    enabled: !!assetId,
  });
}

export function useCreateAssetTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transfer: {
      asset_id: string;
      from_location_id: string | null;
      to_location_id: string | null;
      from_custodian_id: string | null;
      to_custodian_id: string | null;
      transfer_date: string;
      reason?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("asset_transfers")
        .insert(transfer)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["asset_transfers", variables.asset_id] });
      queryClient.invalidateQueries({ queryKey: ["fixed_assets"] });
      queryClient.invalidateQueries({ queryKey: ["fixed_assets", variables.asset_id] });
    },
  });
}
