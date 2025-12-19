import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSafetyDeviceTypes() {
  return useQuery({
    queryKey: ["safety_device_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_device_types")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}
