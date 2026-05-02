import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompanySettings {
  id?: string;
  location_id?: string | null;
  legal_name: string;
  tax_id: string;
  vat_number?: string | null;
  registration_number?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  iban?: string | null;
  swift?: string | null;
  bank_name?: string | null;
  default_currency?: string | null;
  einvoice_endpoint_id?: string | null;
  einvoice_scheme_id?: string | null;
  notes?: string | null;
}

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .order('legal_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCompanySettingsByLocation(locationId?: string | null) {
  return useQuery({
    queryKey: ['company-settings', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('location_id', locationId!)
        .maybeSingle();
      if (error) throw error;
      return data as CompanySettings | null;
    },
  });
}

export function useSaveCompanySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: CompanySettings) => {
      if (settings.id) {
        const { id, ...rest } = settings;
        const { data, error } = await supabase
          .from('company_settings')
          .update(rest as never)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('company_settings')
        .insert(settings as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Postavke kompanije spremljene');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCompanySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company_settings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Obrisano');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
