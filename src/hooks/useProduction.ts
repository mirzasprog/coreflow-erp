import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BOM {
  id: string;
  code: string;
  name: string;
  product_item_id: string;
  output_quantity: number;
  description: string | null;
  active: boolean;
  items?: { code: string; name: string } | null;
  bom_items?: BOMItem[];
}

export interface BOMItem {
  id?: string;
  bom_id?: string;
  component_item_id: string;
  quantity: number;
  notes?: string | null;
  items?: { code: string; name: string } | null;
}

export interface WorkOrder {
  id: string;
  work_order_number: string;
  bom_id: string | null;
  product_item_id: string;
  location_id: string | null;
  planned_quantity: number;
  produced_quantity: number;
  status: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  notes: string | null;
  items?: { code: string; name: string } | null;
  locations?: { name: string } | null;
  materials?: WOMaterial[];
}

export interface WOMaterial {
  id?: string;
  work_order_id?: string;
  item_id: string;
  planned_quantity: number;
  consumed_quantity: number;
  notes?: string | null;
  items?: { code: string; name: string } | null;
}

export function useBOMs() {
  return useQuery({
    queryKey: ['boms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_boms')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BOM[];
    },
  });
}

export function useBOM(id: string | undefined) {
  return useQuery({
    queryKey: ['bom', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_boms')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: bi } = await supabase
        .from('production_bom_items')
        .select('*')
        .eq('bom_id', id!);
      return { ...data, bom_items: (bi || []) as unknown as BOMItem[] } as BOM;
    },
  });
}

export function useCreateBOM() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { header: Partial<BOM>; items: BOMItem[] }) => {
      const { data: bom, error } = await supabase
        .from('production_boms')
        .insert({
          code: input.header.code!,
          name: input.header.name!,
          product_item_id: input.header.product_item_id!,
          output_quantity: input.header.output_quantity || 1,
          description: input.header.description,
        })
        .select()
        .single();
      if (error) throw error;
      if (input.items.length) {
        const ls = input.items.map(i => ({
          bom_id: bom.id,
          component_item_id: i.component_item_id,
          quantity: i.quantity,
          notes: i.notes,
        }));
        const { error: lerr } = await supabase.from('production_bom_items').insert(ls);
        if (lerr) throw lerr;
      }
      return bom;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boms'] });
      toast({ title: 'Sastavnica kreirana' });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

export function useWorkOrders() {
  return useQuery({
    queryKey: ['work-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_work_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WorkOrder[];
    },
  });
}

export function useWorkOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['work-order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_work_orders')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: mats } = await supabase
        .from('production_work_order_materials')
        .select('*')
        .eq('work_order_id', id!);
      return { ...data, materials: (mats || []) as unknown as WOMaterial[] } as WorkOrder;
    },
  });
}

async function generateWONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;
  const { data } = await supabase
    .from('production_work_orders')
    .select('work_order_number')
    .like('work_order_number', `${prefix}%`)
    .order('work_order_number', { ascending: false })
    .limit(1);
  let next = 1;
  if (data && data.length > 0) {
    const last = parseInt(data[0].work_order_number.replace(prefix, ''), 10);
    if (!isNaN(last)) next = last + 1;
  }
  return `${prefix}${String(next).padStart(5, '0')}`;
}

// Recursively expand BOM tree to flat material list (multi-level)
async function expandBom(bomId: string, multiplier: number, accumulator: Map<string, { item_id: string; planned_quantity: number; notes: string | null }>, depth = 0) {
  if (depth > 10) throw new Error('BOM dubina prekoračena (>10 razina) — moguća kružna referenca');
  const { data: bom } = await supabase
    .from('production_boms')
    .select('id, output_quantity, product_item_id')
    .eq('id', bomId)
    .single();
  if (!bom) return;
  const factor = multiplier / Number(bom.output_quantity || 1);

  const { data: bi } = await supabase
    .from('production_bom_items')
    .select('component_item_id, quantity, notes')
    .eq('bom_id', bomId);
  if (!bi) return;

  for (const line of bi as any[]) {
    const requiredQty = Number(line.quantity) * factor;
    // Check if component itself has an active BOM (sub-assembly)
    const { data: subBom } = await supabase
      .from('production_boms')
      .select('id')
      .eq('product_item_id', line.component_item_id)
      .eq('active', true)
      .maybeSingle();
    if (subBom) {
      // Expand sub-BOM recursively (component is intermediate, not consumed as raw)
      await expandBom(subBom.id, requiredQty, accumulator, depth + 1);
    } else {
      // Leaf material — accumulate
      const existing = accumulator.get(line.component_item_id);
      if (existing) {
        existing.planned_quantity += requiredQty;
      } else {
        accumulator.set(line.component_item_id, {
          item_id: line.component_item_id,
          planned_quantity: requiredQty,
          notes: line.notes || null,
        });
      }
    }
  }
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { header: Partial<WorkOrder>; }) => {
      const number = await generateWONumber();
      const { data: wo, error } = await supabase
        .from('production_work_orders')
        .insert({
          work_order_number: number,
          bom_id: input.header.bom_id,
          product_item_id: input.header.product_item_id!,
          location_id: input.header.location_id,
          planned_quantity: input.header.planned_quantity || 1,
          produced_quantity: 0,
          status: 'draft',
          planned_start_date: input.header.planned_start_date,
          planned_end_date: input.header.planned_end_date,
          notes: input.header.notes,
        })
        .select()
        .single();
      if (error) throw error;

      if (input.header.bom_id) {
        const accumulator = new Map<string, { item_id: string; planned_quantity: number; notes: string | null }>();
        await expandBom(input.header.bom_id, input.header.planned_quantity || 1, accumulator);
        const mats = Array.from(accumulator.values()).map(m => ({
          work_order_id: wo.id,
          item_id: m.item_id,
          planned_quantity: m.planned_quantity,
          consumed_quantity: 0,
          notes: m.notes,
        }));
        if (mats.length) {
          await supabase.from('production_work_order_materials').insert(mats);
        }
      }
      return wo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Radni nalog kreiran', description: 'Materijali izračunati iz višerazinskog BOM-a' });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateWOStatus() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === 'in_progress') patch.actual_start_date = new Date().toISOString();
      if (status === 'completed') patch.actual_end_date = new Date().toISOString();
      const { error } = await supabase.from('production_work_orders').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      qc.invalidateQueries({ queryKey: ['work-order'] });
      toast({ title: 'Status ažuriran' });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

async function generateDocNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const full = `${prefix}-${year}-`;
  const { data } = await supabase
    .from('warehouse_documents')
    .select('document_number')
    .like('document_number', `${full}%`)
    .order('document_number', { ascending: false })
    .limit(1);
  let n = 1;
  if (data && data.length > 0) {
    const ln = parseInt(data[0].document_number.replace(full, ''), 10);
    if (!isNaN(ln)) n = ln + 1;
  }
  return `${full}${String(n).padStart(5, '0')}`;
}

export function useIssueMaterials() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (workOrderId: string) => {
      const { data: wo, error } = await supabase
        .from('production_work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();
      if (error) throw error;
      const { data: mats } = await supabase
        .from('production_work_order_materials')
        .select('*')
        .eq('work_order_id', workOrderId);
      if (!mats || !mats.length) throw new Error('Nema materijala za izdavanje');

      const docNumber = await generateDocNumber('GI');
      const { data: doc, error: derr } = await supabase
        .from('warehouse_documents')
        .insert({
          document_number: docNumber,
          document_type: 'goods_issue',
          document_date: new Date().toISOString().split('T')[0],
          location_id: wo.location_id,
          status: 'draft',
          notes: `Izdavanje materijala za RN ${wo.work_order_number}`,
        })
        .select()
        .single();
      if (derr) throw derr;

      const lines = (mats as any[]).map(m => ({
        document_id: doc.id,
        item_id: m.item_id,
        quantity: Number(m.planned_quantity) - Number(m.consumed_quantity || 0),
        unit_price: 0,
        total_price: 0,
      })).filter(l => l.quantity > 0);
      if (lines.length) await supabase.from('warehouse_document_lines').insert(lines);

      return doc;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['warehouse-documents'] });
      toast({ title: 'Otpremnica materijala kreirana', description: (doc as any).document_number });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}

export function useReceiveProduction() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ workOrderId, quantity }: { workOrderId: string; quantity: number }) => {
      const { data: wo, error } = await supabase
        .from('production_work_orders')
        .select('*')
        .eq('id', workOrderId)
        .single();
      if (error) throw error;

      const docNumber = await generateDocNumber('GR');
      const { data: doc, error: derr } = await supabase
        .from('warehouse_documents')
        .insert({
          document_number: docNumber,
          document_type: 'goods_receipt',
          document_date: new Date().toISOString().split('T')[0],
          location_id: wo.location_id,
          status: 'draft',
          notes: `Prijem iz proizvodnje RN ${wo.work_order_number}`,
        })
        .select()
        .single();
      if (derr) throw derr;

      await supabase.from('warehouse_document_lines').insert({
        document_id: doc.id,
        item_id: wo.product_item_id,
        quantity,
        unit_price: 0,
        total_price: 0,
      });

      await supabase
        .from('production_work_orders')
        .update({ produced_quantity: Number(wo.produced_quantity || 0) + quantity })
        .eq('id', workOrderId);

      return doc;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      qc.invalidateQueries({ queryKey: ['work-order'] });
      qc.invalidateQueries({ queryKey: ['warehouse-documents'] });
      toast({ title: 'Prijem gotovog proizvoda', description: (doc as any).document_number });
    },
    onError: (e: Error) => toast({ title: 'Greška', description: e.message, variant: 'destructive' }),
  });
}
