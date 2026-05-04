import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EcommerceOrderLine {
  id?: string;
  order_id?: string;
  item_id: string | null;
  description?: string | null;
  quantity: number;
  unit_price: number;
  vat_rate_id?: string | null;
  vat_amount?: number;
  total: number;
  items?: { code: string; name: string } | null;
}

export interface EcommerceOrder {
  id: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  shipping_method: string | null;
  shipping_cost: number;
  payment_method: string | null;
  payment_status: string;
  status: string;
  subtotal: number;
  vat_amount: number;
  discount_code: string | null;
  discount_amount: number;
  total: number;
  tracking_number: string | null;
  notes: string | null;
  partner_id: string | null;
  location_id: string | null;
  lines?: EcommerceOrderLine[];
}

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EC-${year}-`;
  const { data } = await supabase
    .from('ecommerce_orders')
    .select('order_number')
    .like('order_number', `${prefix}%`)
    .order('order_number', { ascending: false })
    .limit(1);
  let next = 1;
  if (data && data.length > 0) {
    const last = parseInt(data[0].order_number.replace(prefix, ''), 10);
    if (!isNaN(last)) next = last + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export function useEcommerceOrders() {
  return useQuery({
    queryKey: ['ecommerce-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EcommerceOrder[];
    },
  });
}

export function useEcommerceOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['ecommerce-order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: lines } = await supabase
        .from('ecommerce_order_items')
        .select('*, items(code, name)')
        .eq('order_id', id!);
      return { ...data, lines: (lines || []) as unknown as EcommerceOrderLine[] } as EcommerceOrder;
    },
  });
}

export function useCreateEcommerceOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { header: Partial<EcommerceOrder>; lines: EcommerceOrderLine[] }) => {
      const number = await generateOrderNumber();
      const subtotal = input.lines.reduce((s, l) => s + (l.unit_price * l.quantity), 0);
      const vat = input.lines.reduce((s, l) => s + (l.vat_amount || 0), 0);
      const total = subtotal + vat + (input.header.shipping_cost || 0) - (input.header.discount_amount || 0);
      const { data: order, error } = await supabase
        .from('ecommerce_orders')
        .insert({
          order_number: number,
          order_date: input.header.order_date || new Date().toISOString(),
          customer_name: input.header.customer_name || 'Web kupac',
          customer_email: input.header.customer_email,
          customer_phone: input.header.customer_phone,
          shipping_address: input.header.shipping_address,
          shipping_city: input.header.shipping_city,
          shipping_postal_code: input.header.shipping_postal_code,
          shipping_country: input.header.shipping_country,
          shipping_method: input.header.shipping_method,
          shipping_cost: input.header.shipping_cost || 0,
          payment_method: input.header.payment_method,
          payment_status: input.header.payment_status || 'pending',
          status: input.header.status || 'new',
          subtotal,
          vat_amount: vat,
          discount_code: input.header.discount_code,
          discount_amount: input.header.discount_amount || 0,
          total,
          notes: input.header.notes,
          partner_id: input.header.partner_id,
          location_id: input.header.location_id,
        })
        .select()
        .single();
      if (error) throw error;
      if (input.lines.length) {
        const ls = input.lines.map(l => ({
          order_id: order.id,
          item_id: l.item_id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          vat_rate_id: l.vat_rate_id,
          vat_amount: l.vat_amount || 0,
          total: l.total,
        }));
        const { error: lerr } = await supabase.from('ecommerce_order_items').insert(ls);
        if (lerr) throw lerr;
      }
      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecommerce-orders'] });
      toast({ title: 'Narudžba kreirana' });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status, payment_status, tracking_number }: { id: string; status?: string; payment_status?: string; tracking_number?: string }) => {
      const patch: any = {};
      if (status) patch.status = status;
      if (payment_status) patch.payment_status = payment_status;
      if (tracking_number !== undefined) patch.tracking_number = tracking_number;
      const { error } = await supabase.from('ecommerce_orders').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecommerce-orders'] });
      qc.invalidateQueries({ queryKey: ['ecommerce-order'] });
      toast({ title: 'Status ažuriran' });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

export function useConvertOrderToShipment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data: order, error } = await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      const { data: lines } = await supabase
        .from('ecommerce_order_items')
        .select('*')
        .eq('order_id', orderId);

      const year = new Date().getFullYear();
      const prefix = `GI-${year}-`;
      const { data: last } = await supabase
        .from('warehouse_documents')
        .select('document_number')
        .like('document_number', `${prefix}%`)
        .order('document_number', { ascending: false })
        .limit(1);
      let n = 1;
      if (last && last.length > 0) {
        const ln = parseInt(last[0].document_number.replace(prefix, ''), 10);
        if (!isNaN(ln)) n = ln + 1;
      }
      const docNumber = `${prefix}${String(n).padStart(5, '0')}`;

      const { data: doc, error: derr } = await supabase
        .from('warehouse_documents')
        .insert({
          document_number: docNumber,
          document_type: 'goods_issue',
          document_date: new Date().toISOString().split('T')[0],
          location_id: order.location_id,
          partner_id: order.partner_id,
          status: 'draft',
          total_value: order.total,
          notes: `Iz online narudžbe ${order.order_number}`,
        })
        .select()
        .single();
      if (derr) throw derr;

      if (lines && lines.length) {
        const dl = (lines as any[]).map((l) => ({
          document_id: doc.id,
          item_id: l.item_id,
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          total_price: Number(l.total) || 0,
        }));
        const { error: dlerr } = await supabase.from('warehouse_document_lines').insert(dl);
        if (dlerr) throw dlerr;
      }

      await supabase.from('ecommerce_orders').update({ status: 'processing' }).eq('id', orderId);
      return doc;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['ecommerce-orders'] });
      qc.invalidateQueries({ queryKey: ['warehouse-documents'] });
      toast({ title: 'Otpremnica kreirana', description: (doc as any).document_number });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);
  let n = 1;
  if (data && data.length > 0) {
    const last = parseInt(data[0].invoice_number.replace(prefix, ''), 10);
    if (!isNaN(last)) n = last + 1;
  }
  return `${prefix}${String(n).padStart(5, '0')}`;
}

export function useCreateInvoiceFromOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data: order, error } = await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      const { data: lines } = await supabase
        .from('ecommerce_order_items')
        .select('*')
        .eq('order_id', orderId);

      const number = await generateInvoiceNumber();
      const due = new Date();
      due.setDate(due.getDate() + 15);

      const { data: inv, error: ierr } = await supabase
        .from('invoices')
        .insert({
          invoice_type: 'outgoing',
          invoice_number: number,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: due.toISOString().split('T')[0],
          partner_id: order.partner_id,
          status: 'draft',
          subtotal: order.subtotal,
          vat_amount: order.vat_amount,
          total: order.total,
          notes: `Iz online narudžbe ${order.order_number}`,
        })
        .select()
        .single();
      if (ierr) throw ierr;

      if (lines && lines.length) {
        const il = (lines as any[]).map((l) => ({
          invoice_id: inv.id,
          item_id: l.item_id,
          description: l.description,
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          vat_rate_id: l.vat_rate_id || null,
          vat_amount: Number(l.vat_amount) || 0,
          total: Number(l.total) || 0,
        }));
        const { error: lerr } = await supabase.from('invoice_lines').insert(il);
        if (lerr) throw lerr;
      }
      return inv;
    },
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['ecommerce-orders'] });
      toast({ title: 'Faktura kreirana', description: (inv as any).invoice_number });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

export function useWebShopSettings() {
  return useQuery({
    queryKey: ['module-settings', 'webshop'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_settings')
        .select('*')
        .eq('module_name', 'webshop')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveWebShopSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { enabled: boolean; settings: Record<string, any> }) => {
      const { data: existing } = await supabase
        .from('module_settings')
        .select('id')
        .eq('module_name', 'webshop')
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('module_settings')
          .update({ enabled: input.enabled, settings: input.settings })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('module_settings')
          .insert({ module_name: 'webshop', enabled: input.enabled, settings: input.settings });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['module-settings', 'webshop'] });
      toast({ title: 'Postavke spremljene' });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}
