import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EcommerceCustomer {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  marketing_consent: boolean;
  status: string;
  created_at: string;
}

export function useEcommerceCustomers() {
  return useQuery({
    queryKey: ['ecommerce-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_customers' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EcommerceCustomer[];
    },
  });
}

export function useEcommerceCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['ecommerce-customer', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_customers' as any)
        .select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as unknown as EcommerceCustomer | null;
    },
  });
}

export function useCustomerOrders(customerId: string | undefined, email?: string | null) {
  return useQuery({
    queryKey: ['customer-orders', customerId, email],
    enabled: !!customerId,
    queryFn: async () => {
      let q = supabase.from('ecommerce_orders').select('*').order('created_at', { ascending: false });
      if (email) {
        q = q.or(`customer_id.eq.${customerId},customer_email.eq.${email}`);
      } else {
        q = q.eq('customer_id', customerId!);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<EcommerceCustomer> }) => {
      const { error } = await supabase.from('ecommerce_customers' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecommerce-customers'] });
      qc.invalidateQueries({ queryKey: ['ecommerce-customer'] });
      toast.success('Kupac ažuriran');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRegisterCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; first_name?: string; last_name?: string; phone?: string; marketing_consent?: boolean }) => {
      const { data: auth, error: aerr } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: { emailRedirectTo: `${window.location.origin}/shop` },
      });
      if (aerr) throw aerr;

      const { data, error } = await supabase
        .from('ecommerce_customers' as any)
        .insert({
          user_id: auth.user?.id || null,
          email: input.email,
          first_name: input.first_name || null,
          last_name: input.last_name || null,
          phone: input.phone || null,
          marketing_consent: input.marketing_consent || false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecommerce-customers'] });
      toast.success('Registracija uspješna');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
