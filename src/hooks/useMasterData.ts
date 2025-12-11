import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });
}

export function usePartners(type?: 'supplier' | 'customer' | 'both') {
  return useQuery({
    queryKey: ['partners', type],
    queryFn: async () => {
      let query = supabase
        .from('partners')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (type && type !== 'both') {
        query = query.or(`type.eq.${type},type.eq.both`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          vat_rates(code, rate),
          units_of_measure(code, name)
        `)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });
}

export function useStock(locationId?: string) {
  return useQuery({
    queryKey: ['stock', locationId],
    queryFn: async () => {
      let query = supabase
        .from('stock')
        .select(`
          *,
          items(code, name, min_stock, max_stock, selling_price),
          locations(name)
        `);
      
      if (locationId) {
        query = query.eq('location_id', locationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

export function useVatRates() {
  return useQuery({
    queryKey: ['vat-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vat_rates')
        .select('*')
        .eq('active', true)
        .order('rate');
      
      if (error) throw error;
      return data;
    }
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments(name),
          locations(name)
        `)
        .eq('active', true)
        .order('last_name');
      
      if (error) throw error;
      return data;
    }
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('active', true)
        .order('code');
      
      if (error) throw error;
      return data;
    }
  });
}
