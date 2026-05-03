import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PurchaseRequestLine {
  id?: string;
  request_id?: string;
  item_id: string | null;
  description?: string | null;
  quantity: number;
  estimated_unit_price: number;
  estimated_total: number;
  notes?: string | null;
  items?: { code: string; name: string } | null;
}

export interface PurchaseRequest {
  id: string;
  request_number: string;
  request_date: string;
  requester_id: string | null;
  partner_id: string | null;
  location_id: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'converted';
  priority: string | null;
  needed_by_date: string | null;
  notes: string | null;
  total_estimated_value: number;
  converted_po_id: string | null;
  partners?: { name: string; code: string } | null;
  locations?: { name: string; code: string } | null;
  lines?: PurchaseRequestLine[];
}

async function generatePRNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PR-${year}-`;
  const { data } = await supabase
    .from('purchase_requests' as any)
    .select('request_number')
    .like('request_number', `${prefix}%`)
    .order('request_number', { ascending: false })
    .limit(1);
  let next = 1;
  if (data && data.length > 0) {
    const last = parseInt((data[0] as any).request_number.replace(prefix, ''), 10);
    if (!isNaN(last)) next = last + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export function usePurchaseRequests() {
  return useQuery({
    queryKey: ['purchase-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requests' as any)
        .select('*, partners(name, code), locations(name, code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PurchaseRequest[];
    },
  });
}

export function usePurchaseRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['purchase-request', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requests' as any)
        .select('*, partners(name, code), locations(name, code)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: lines } = await supabase
        .from('purchase_request_lines' as any)
        .select('*, items(code, name)')
        .eq('request_id', id!);
      return { ...(data as any), lines: (lines || []) as unknown as PurchaseRequestLine[] } as PurchaseRequest;
    },
  });
}

export function useCreatePurchaseRequest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { header: Partial<PurchaseRequest>; lines: PurchaseRequestLine[] }) => {
      const number = await generatePRNumber();
      const total = input.lines.reduce((s, l) => s + (l.estimated_total || 0), 0);
      const { data: pr, error } = await supabase
        .from('purchase_requests' as any)
        .insert({
          request_number: number,
          request_date: input.header.request_date || new Date().toISOString().split('T')[0],
          partner_id: input.header.partner_id || null,
          location_id: input.header.location_id || null,
          needed_by_date: input.header.needed_by_date || null,
          priority: input.header.priority || 'normal',
          status: input.header.status || 'draft',
          notes: input.header.notes || null,
          total_estimated_value: total,
        })
        .select()
        .single();
      if (error) throw error;
      if (input.lines.length) {
        const ls = input.lines.map(l => ({
          request_id: (pr as any).id,
          item_id: l.item_id,
          description: l.description || null,
          quantity: l.quantity,
          estimated_unit_price: l.estimated_unit_price,
          estimated_total: l.estimated_total,
          notes: l.notes || null,
        }));
        const { error: lerr } = await supabase.from('purchase_request_lines' as any).insert(ls);
        if (lerr) throw lerr;
      }
      return pr as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast({ title: 'Zahtjev kreiran' });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdatePRStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PurchaseRequest['status'] }) => {
      const patch: any = { status };
      if (status === 'approved') patch.approved_at = new Date().toISOString();
      const { error } = await supabase.from('purchase_requests' as any).update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-requests'] });
      qc.invalidateQueries({ queryKey: ['purchase-request'] });
      toast({ title: 'Status ažuriran' });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

export function useConvertPRToPO() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data: pr, error } = await supabase
        .from('purchase_requests' as any)
        .select('*')
        .eq('id', requestId)
        .single();
      if (error) throw error;
      if ((pr as any).status !== 'approved') throw new Error('Zahtjev mora biti odobren');
      const { data: lines, error: lerr } = await supabase
        .from('purchase_request_lines' as any)
        .select('*')
        .eq('request_id', requestId);
      if (lerr) throw lerr;

      const year = new Date().getFullYear();
      const prefix = `PO-${year}-`;
      const { data: last } = await supabase
        .from('purchase_orders')
        .select('order_number')
        .like('order_number', `${prefix}%`)
        .order('order_number', { ascending: false })
        .limit(1);
      let n = 1;
      if (last && last.length > 0) {
        const ln = parseInt(last[0].order_number.replace(prefix, ''), 10);
        if (!isNaN(ln)) n = ln + 1;
      }
      const orderNumber = `${prefix}${String(n).padStart(5, '0')}`;
      const total = (lines || []).reduce((s: number, l: any) => s + (Number(l.estimated_total) || 0), 0);

      const { data: po, error: poerr } = await supabase
        .from('purchase_orders')
        .insert({
          order_number: orderNumber,
          partner_id: (pr as any).partner_id,
          location_id: (pr as any).location_id,
          order_date: new Date().toISOString().split('T')[0],
          expected_date: (pr as any).needed_by_date,
          status: 'draft',
          total_value: total,
          notes: `Iz zahtjeva ${(pr as any).request_number}`,
        })
        .select()
        .single();
      if (poerr) throw poerr;

      if (lines && lines.length) {
        const pol = (lines as any[]).map((l) => ({
          order_id: (po as any).id,
          item_id: l.item_id,
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.estimated_unit_price) || 0,
          total_price: Number(l.estimated_total) || 0,
          notes: l.notes,
        }));
        const { error: polerr } = await supabase.from('purchase_order_lines').insert(pol);
        if (polerr) throw polerr;
      }

      await supabase
        .from('purchase_requests' as any)
        .update({ status: 'converted', converted_po_id: (po as any).id })
        .eq('id', requestId);

      return po as any;
    },
    onSuccess: (po) => {
      qc.invalidateQueries({ queryKey: ['purchase-requests'] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'PO kreiran', description: (po as any).order_number });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

export function useSupplierAnalytics() {
  return useQuery({
    queryKey: ['supplier-analytics'],
    queryFn: async () => {
      const { data: partners } = await supabase
        .from('partners')
        .select('id, name, code, email, phone')
        .eq('active', true)
        .or('type.eq.supplier,type.eq.both');
      const { data: orders } = await supabase
        .from('purchase_orders')
        .select('partner_id, total_value, status, order_date');
      const map = new Map<string, { count: number; totalValue: number; received: number }>();
      (orders || []).forEach((o) => {
        if (!o.partner_id) return;
        const e = map.get(o.partner_id) || { count: 0, totalValue: 0, received: 0 };
        e.count++;
        e.totalValue += Number(o.total_value) || 0;
        if (o.status === 'received') e.received++;
        map.set(o.partner_id, e);
      });
      return (partners || []).map((p) => ({
        ...p,
        ...(map.get(p.id) || { count: 0, totalValue: 0, received: 0 }),
      }));
    },
  });
}
